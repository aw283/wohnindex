import type { Cluster } from "@/types/indicators";
import type { IndicatorKey } from "@/types/indicators";

// Cluster-Gewichte gem. CLAUDE.md; Summe muss 1.0 ergeben
export const CLUSTER_WEIGHTS: Record<Cluster, number> = {
  investment: 0.40,
  lebensqualitaet: 0.35,
  zukunftsfestigkeit: 0.25,
};

// Indikator-Overrides: leer = Gleichgewicht innerhalb des Clusters
export const INDICATOR_WEIGHT_OVERRIDES: Partial<Record<IndicatorKey, number>> = {};

// Ampel-Schwellenwerte (normalisierter Gesamt-Score 0–100)
export const AMPEL_THRESHOLDS = {
  gruen: 66,
  rot: 33,
} as const;

// Datenqualitaets-Tier-Discount gem. CLAUDE.md
export const TIER_DISCOUNT: Record<1 | 2 | 3 | 4, number> = {
  1: 1.0,
  2: 1.0,
  3: 0.9,
  4: 0.85,
};

// Self-Check: Summe der Cluster-Gewichte muss exakt 1.0 sein
const weightSum = Object.values(CLUSTER_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(weightSum - 1.0) > 1e-9) {
  throw new Error(
    `CLUSTER_WEIGHTS summieren sich zu ${weightSum}, erwartet 1.0`
  );
}
