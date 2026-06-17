/**
 * Zentrale Datenschicht (statisch, kein Supabase).
 *
 * Liest die zur Build-Zeit generierte ECHTE Datendatei (data/mvp_slice.json,
 * Statistik Austria CC BY 4.0) + Bezirksgeometrie (data/bezirke.json) und
 * stellt bereits bewertete Bezirke bereit. Reine Funktionen → für Static Export
 * laufen sie zur Build-Zeit, das Ergebnis wird in die HTML gebacken.
 *
 * Supabase-Adapter wäre hier steckbar: gleiche Rückgabetypen, andere Quelle.
 */
import sliceJson from "@/data/mvp_slice.json";
import {
  scoreDistricts,
  type DistrictMeta,
  type DistrictScore,
  type IndicatorValue,
} from "@/lib/scoring";
import { INDICATORS, type IndicatorKey } from "@/types/indicators";

interface SliceValue {
  gkz3: string;
  indicator: IndicatorKey;
  value: number;
  jahr: number;
  quelle: string;
  datenstand: string | null;
}
interface Slice {
  generatedAt: string;
  districts: DistrictMeta[];
  values: SliceValue[];
}

const slice = sliceJson as unknown as Slice;

const SCORED = scoreDistricts(slice.districts, slice.values);
const META_BY_GKZ3 = new Map(slice.districts.map((d) => [d.gkz3, d]));

/** Pro (gkz3, indicator) der jüngste Roh-Wert inkl. Herkunft/Datenstand. */
export interface IndicatorDatum {
  value: number;
  jahr: number;
  quelle: string;
  datenstand: string | null;
}
const DATUM = new Map<string, IndicatorDatum>();
for (const v of slice.values) {
  const key = `${v.gkz3}|${v.indicator}`;
  const prev = DATUM.get(key);
  if (!prev || v.jahr >= prev.jahr) {
    DATUM.set(key, {
      value: v.value,
      jahr: v.jahr,
      quelle: v.quelle,
      datenstand: v.datenstand,
    });
  }
}

export function getGeneratedAt(): string {
  return slice.generatedAt;
}

/** Alle Bezirke (Stammdaten), alphabetisch. */
export function getDistricts(): DistrictMeta[] {
  return [...slice.districts].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Bewerteter Bezirk oder undefined. */
export function getScore(gkz3: string): DistrictScore | undefined {
  return SCORED.get(gkz3);
}

/** Alle bewerteten Bezirke, standardmäßig nach Gesamtscore absteigend (null ans Ende). */
export function getAllScores(): DistrictScore[] {
  return [...SCORED.values()].sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));
}

/** Roh-Wert + Datenstand für einen Indikator eines Bezirks. */
export function getDatum(gkz3: string, key: IndicatorKey): IndicatorDatum | undefined {
  return DATUM.get(`${gkz3}|${key}`);
}

export function getMeta(gkz3: string): DistrictMeta | undefined {
  return META_BY_GKZ3.get(gkz3);
}

/** Pro Indikator: Quelle (aus types/indicators) + jüngster Datenstand (aus Daten). */
export function getDataVintage(): {
  key: IndicatorKey;
  label: string;
  source: string;
  hasData: boolean;
  latestDatenstand: string | null;
}[] {
  return INDICATORS.map((def) => {
    let latest: string | null = null;
    let hasData = false;
    for (const [k, d] of DATUM) {
      if (k.endsWith(`|${def.key}`)) {
        hasData = true;
        if (d.datenstand && (!latest || d.datenstand > latest)) latest = d.datenstand;
      }
    }
    return {
      key: def.key as IndicatorKey,
      label: def.label,
      source: def.source,
      hasData,
      latestDatenstand: latest,
    };
  });
}
