/**
 * Immoampel Scoring-Engine.
 *
 * Adaptiert die Scoring-Logik des Austria Longevity Index (methodology.json)
 * auf das Immoampel-Schema. Übernommen wird NUR die Methodik:
 *   1. Directional Alignment  – "lower_better"-Indikatoren werden invertiert.
 *   2. Winsorisierung ±2 SD    – Ausreißer werden vor der Normalisierung gekappt.
 *   3. Min-Max-Normalisierung  – auf 0–100, ABER je Bundesland-Kohorte
 *                                (Wien bildet automatisch eine eigene Kohorte,
 *                                 da bundesland === "Wien").
 *   4. Datenqualitäts-Discount – adjusted = normalized × TIER_DISCOUNT[tier]
 *                                (1:1 aus der Longevity-Methodik).
 *   5. Cluster-Aggregation     – gewichtetes Mittel der VORHANDENEN Indikatoren
 *                                (fehlende werden ausgelassen, Gewichte renormiert).
 *   6. Gesamt-Score            – gewichtetes Mittel der vorhandenen Cluster
 *                                (fehlende Cluster ausgelassen, renormiert).
 *   7. Ampel                   – grün ≥66, gelb 33–<66, rot <33 (config/weights.ts).
 *
 * Die Engine ist eine reine Funktion (kein I/O), damit unit-testbar.
 */
import {
  CLUSTERS,
  indicatorsByCluster,
  INDICATORS,
  type Cluster,
  type IndicatorKey,
} from "@/types/indicators";
import {
  AMPEL_THRESHOLDS,
  CLUSTER_WEIGHTS,
  INDICATOR_WEIGHT_OVERRIDES,
  TIER_DISCOUNT,
} from "@/config/weights";

export type Ampel = "gruen" | "gelb" | "rot";

/** Bezirks-Stammdaten. `bundesland` ist der Kohorten-Schlüssel. */
export interface DistrictMeta {
  gkz3: string;
  name: string;
  bundesland: string;
  wien_flag?: boolean;
}

/** Ein Roh-Indikatorwert für einen Bezirk. */
export interface IndicatorValue {
  gkz3: string;
  indicator: IndicatorKey;
  value: number;
  jahr?: number;
}

export interface IndicatorScore {
  indicator: IndicatorKey;
  raw: number;
  /** 0–100 nach Winsorisierung + Min-Max + Invertierung (vor Tier-Discount). */
  normalized: number;
  /** normalized × TIER_DISCOUNT[tier]. */
  adjusted: number;
  /** true, wenn der Rohwert auf die ±2-SD-Grenze gekappt wurde. */
  winsorised: boolean;
  /** true, wenn die Kohorte entartet ist (n<2 oder max==min) → neutral 50. */
  neutralFallback: boolean;
}

export interface ClusterScore {
  cluster: Cluster;
  /** null = keine Daten in diesem Cluster. */
  score: number | null;
  present: IndicatorKey[];
  missing: IndicatorKey[];
  /** Anteil vorhandener Indikatoren (0–1). */
  coverage: number;
  /** true, wenn >20 % der Indikatoren fehlen (CLAUDE.md Missing-Data-Policy). */
  insufficient: boolean;
}

export interface DistrictScore {
  gkz3: string;
  name: string;
  cohort: string;
  indicatorScores: Partial<Record<IndicatorKey, IndicatorScore>>;
  clusters: Record<Cluster, ClusterScore>;
  /** Gesamt-Score 0–100, oder null wenn gar keine Daten. */
  overall: number | null;
  ampel: Ampel | null;
}

const INDICATOR_BY_KEY = new Map(INDICATORS.map((i) => [i.key as IndicatorKey, i]));

/** Kohorten-Schlüssel: das Bundesland. Wien ist dadurch automatisch separat. */
export function cohortKey(d: DistrictMeta): string {
  return d.bundesland;
}

/** Ampel-Einstufung eines normalisierten Scores. */
export function ampelFor(score: number | null): Ampel | null {
  if (score === null) return null;
  if (score >= AMPEL_THRESHOLDS.gruen) return "gruen";
  if (score < AMPEL_THRESHOLDS.rot) return "rot";
  return "gelb";
}

/**
 * Basis-Indikatorgewichte innerhalb eines Clusters.
 * Overrides aus config/weights.ts werden respektiert; der Rest teilt sich den
 * verbleibenden Anteil gleichmäßig (Default: alle gleich).
 */
function baseIndicatorWeights(cluster: Cluster): Map<IndicatorKey, number> {
  const keys = indicatorsByCluster(cluster).map((i) => i.key as IndicatorKey);
  const overrideSum = keys.reduce(
    (a, k) => a + (INDICATOR_WEIGHT_OVERRIDES[k] ?? 0),
    0
  );
  const nonOverride = keys.filter((k) => INDICATOR_WEIGHT_OVERRIDES[k] == null);
  const each =
    nonOverride.length > 0 ? Math.max(0, 1 - overrideSum) / nonOverride.length : 0;

  const m = new Map<IndicatorKey, number>();
  for (const k of keys) m.set(k, INDICATOR_WEIGHT_OVERRIDES[k] ?? each);
  return m;
}

interface CohortStat {
  min: number;
  max: number;
  capLo: number;
  capHi: number;
  n: number;
  degenerate: boolean;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Winsorisierte Min/Max-Statistik einer Kohorte für einen Indikator. */
function computeCohortStat(values: number[]): CohortStat {
  const n = values.length;
  if (n === 0) {
    return { min: 0, max: 0, capLo: 0, capHi: 0, n, degenerate: true };
  }
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  const capLo = mean - 2 * sd;
  const capHi = mean + 2 * sd;

  const capped = values.map((v) => clamp(v, capLo, capHi));
  const min = Math.min(...capped);
  const max = Math.max(...capped);

  return { min, max, capLo, capHi, n, degenerate: n < 2 || max === min };
}

/** Reduziert mehrere Werte je (gkz3, indicator) auf den jüngsten Jahrgang. */
function latestValues(
  values: IndicatorValue[]
): Map<string, Map<IndicatorKey, number>> {
  const latestJahr = new Map<string, number>();
  const out = new Map<string, Map<IndicatorKey, number>>();

  for (const v of values) {
    const key = `${v.gkz3}|${v.indicator}`;
    const j = v.jahr ?? 0;
    if (!latestJahr.has(key) || j >= (latestJahr.get(key) as number)) {
      latestJahr.set(key, j);
      const m = out.get(v.gkz3) ?? new Map<IndicatorKey, number>();
      m.set(v.indicator, v.value);
      out.set(v.gkz3, m);
    }
  }
  return out;
}

/**
 * Bewertet alle Bezirke. Reine Funktion: gleiche Eingabe → gleiche Ausgabe.
 *
 * @param districts Bezirks-Stammdaten (Kohorte via bundesland)
 * @param values    Roh-Indikatorwerte (mehrere Jahre erlaubt → jüngster gewinnt)
 */
export function scoreDistricts(
  districts: DistrictMeta[],
  values: IndicatorValue[]
): Map<string, DistrictScore> {
  const valByDistrict = latestValues(values);
  const metaByGkz3 = new Map(districts.map((d) => [d.gkz3, d]));

  // 1) Kohorten-Statistik je (Kohorte, Indikator) aus allen Bezirken bilden.
  const cohortValues = new Map<string, number[]>(); // "cohort|indicator" -> values
  for (const d of districts) {
    const cohort = cohortKey(d);
    const vals = valByDistrict.get(d.gkz3);
    if (!vals) continue;
    for (const [ind, v] of vals) {
      const k = `${cohort}|${ind}`;
      const arr = cohortValues.get(k) ?? [];
      arr.push(v);
      cohortValues.set(k, arr);
    }
  }
  const cohortStats = new Map<string, CohortStat>();
  for (const [k, arr] of cohortValues) {
    cohortStats.set(k, computeCohortStat(arr));
  }

  // 2) Pro Bezirk normalisieren, aggregieren, Ampel.
  const result = new Map<string, DistrictScore>();

  for (const d of districts) {
    const cohort = cohortKey(d);
    const vals = valByDistrict.get(d.gkz3) ?? new Map<IndicatorKey, number>();
    const indicatorScores: Partial<Record<IndicatorKey, IndicatorScore>> = {};

    for (const [ind, raw] of vals) {
      const def = INDICATOR_BY_KEY.get(ind);
      if (!def) continue;
      const stat = cohortStats.get(`${cohort}|${ind}`);
      if (!stat) continue;

      const capped = clamp(raw, stat.capLo, stat.capHi);
      const winsorised = capped !== raw;

      let normalized: number;
      let neutralFallback = false;
      if (stat.degenerate) {
        normalized = 50; // Kohorte entartet (z.B. Wien als Einzel-Einheit)
        neutralFallback = true;
      } else {
        let frac = (capped - stat.min) / (stat.max - stat.min);
        if (def.direction === "lower_better") frac = 1 - frac;
        normalized = frac * 100;
      }
      const adjusted = normalized * TIER_DISCOUNT[def.tier];

      indicatorScores[ind] = {
        indicator: ind,
        raw,
        normalized: round2(normalized),
        adjusted: round2(adjusted),
        winsorised,
        neutralFallback,
      };
    }

    // Cluster-Aggregation
    const clusters = {} as Record<Cluster, ClusterScore>;
    for (const cluster of CLUSTERS) {
      const allKeys = indicatorsByCluster(cluster).map(
        (i) => i.key as IndicatorKey
      );
      const present = allKeys.filter((k) => indicatorScores[k] !== undefined);
      const missing = allKeys.filter((k) => indicatorScores[k] === undefined);

      let score: number | null = null;
      if (present.length > 0) {
        const base = baseIndicatorWeights(cluster);
        const wSum = present.reduce((a, k) => a + (base.get(k) ?? 0), 0);
        // Gewichte über die vorhandenen Indikatoren renormieren.
        score =
          wSum > 0
            ? present.reduce(
                (a, k) =>
                  a +
                  (indicatorScores[k] as IndicatorScore).adjusted *
                    ((base.get(k) ?? 0) / wSum),
                0
              )
            : 0;
      }

      clusters[cluster] = {
        cluster,
        score: score === null ? null : round2(score),
        present,
        missing,
        coverage: round2(present.length / allKeys.length),
        insufficient: present.length / allKeys.length < 0.8,
      };
    }

    // Gesamt-Score: gewichtetes Mittel der vorhandenen Cluster (renormiert).
    const presentClusters = CLUSTERS.filter((c) => clusters[c].score !== null);
    let overall: number | null = null;
    if (presentClusters.length > 0) {
      const wSum = presentClusters.reduce((a, c) => a + CLUSTER_WEIGHTS[c], 0);
      overall = presentClusters.reduce(
        (a, c) =>
          a + (clusters[c].score as number) * (CLUSTER_WEIGHTS[c] / wSum),
        0
      );
      overall = round2(overall);
    }

    result.set(d.gkz3, {
      gkz3: d.gkz3,
      name: metaByGkz3.get(d.gkz3)?.name ?? d.name,
      cohort,
      indicatorScores,
      clusters,
      overall,
      ampel: ampelFor(overall),
    });
  }

  return result;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
