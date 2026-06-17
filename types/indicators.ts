// Verbindliche Indikatoren-Definitionen gem. CLAUDE.md
// 3 Cluster, 18 Indikatoren, Phasen MVP/phase2/phase3

export const CLUSTERS = ["investment", "lebensqualitaet", "zukunftsfestigkeit"] as const;
export type Cluster = (typeof CLUSTERS)[number];

export type Direction = "higher_better" | "lower_better";
export type Phase = "mvp" | "phase2" | "phase3";

export interface IndicatorDef {
  key: string;
  label: string;
  cluster: Cluster;
  /** higher_better = hoehere Werte = besser; lower_better = niedrigere Werte = besser */
  direction: Direction;
  unit: string;
  /** Datenqualitaets-Tier 1-4; Discount: Tier3 x0.90, Tier4 x0.85 */
  tier: 1 | 2 | 3 | 4;
  source: string;
  phase: Phase;
}

// lower_better-Indikatoren gemaess CLAUDE.md:
// kaufpreis, leerstand, laerm_luft, hochwasserrisiko, hitze, alterung
export const INDICATORS = [
  // --- INVESTMENT ---
  {
    key: "kaufpreis",
    label: "Kaufpreis (€/m²)",
    cluster: "investment",
    direction: "lower_better",
    unit: "€/m²",
    tier: 2,
    source: "Statistik Austria Immobilienpreisindex",
    phase: "mvp",
  },
  {
    key: "preisentwicklung",
    label: "Preisentwicklung (Δ % YoY)",
    cluster: "investment",
    direction: "higher_better",
    unit: "%",
    tier: 2,
    source: "Statistik Austria Immobilienpreisindex",
    phase: "mvp",
  },
  {
    key: "mietrendite",
    label: "Mietrendite",
    cluster: "investment",
    direction: "higher_better",
    unit: "%",
    tier: 3,
    source: "abgeleitet: Jahresnettomiete ÷ Kaufpreis",
    phase: "phase3",
  },
  {
    key: "leerstand",
    label: "Leerstand",
    cluster: "investment",
    direction: "lower_better",
    unit: "%",
    tier: 2,
    source: "Statistik Austria Gebäude-/Wohnungsregister",
    phase: "phase2",
  },
  {
    key: "bevoelkerungsprognose",
    label: "Bevölkerungsprognose",
    cluster: "investment",
    direction: "higher_better",
    unit: "%",
    tier: 1,
    source: "ÖROK Regionalprognose 2021–2050",
    phase: "mvp",
  },
  {
    key: "pendlersaldo",
    label: "Pendlersaldo",
    cluster: "investment",
    direction: "higher_better",
    unit: "Personen",
    tier: 1,
    source: "Statistik Austria Pendlerstatistik",
    phase: "mvp",
  },

  // --- LEBENSQUALITAET ---
  {
    key: "aerztedichte",
    label: "Ärztedichte",
    cluster: "lebensqualitaet",
    direction: "higher_better",
    unit: "Ärzte/10.000 EW",
    tier: 2,
    source: "ÖGK Vertragsärzte",
    phase: "mvp",
  },
  {
    key: "schulen_kinderbetreuung",
    label: "Schulen/Kinderbetreuung",
    cluster: "lebensqualitaet",
    direction: "higher_better",
    unit: "Einrichtungen/10.000 EW",
    tier: 1,
    source: "BMBWF Schulliste + Statistik Austria Kindertagesheimstatistik",
    phase: "mvp",
  },
  {
    key: "oev_takt",
    label: "ÖV-Takt",
    cluster: "lebensqualitaet",
    direction: "higher_better",
    unit: "Abfahrten/Tag",
    tier: 2,
    source: "GTFS Österreich / ÖROK ÖV-Güteklassen",
    phase: "phase2",
  },
  {
    key: "breitband",
    label: "Breitband",
    cluster: "lebensqualitaet",
    direction: "higher_better",
    unit: "% Haushalte ≥30 Mbit/s",
    tier: 2,
    source: "RTR Breitbandatlas",
    phase: "phase2",
  },
  {
    key: "naherholung",
    label: "Naherholung",
    cluster: "lebensqualitaet",
    direction: "higher_better",
    unit: "% Grünflächenanteil",
    tier: 2,
    source: "CORINE Land Cover (Copernicus)",
    phase: "phase2",
  },
  {
    key: "laerm_luft",
    label: "Lärm/Luft",
    cluster: "lebensqualitaet",
    direction: "lower_better",
    unit: "Index",
    tier: 3,
    source: "Umweltbundesamt Lärmkarten + EEA Luftmessnetz",
    phase: "phase3",
  },

  // --- ZUKUNFTSFESTIGKEIT ---
  {
    key: "hochwasserrisiko",
    label: "Hochwasserrisiko",
    cluster: "zukunftsfestigkeit",
    direction: "lower_better",
    unit: "% Fläche HQ100",
    tier: 2,
    source: "HORA (BML) / eHYD",
    phase: "phase2",
  },
  {
    key: "hitze",
    label: "Hitze",
    cluster: "zukunftsfestigkeit",
    direction: "lower_better",
    unit: "Hitzetage Tmax≥30°C/Jahr",
    tier: 2,
    source: "GeoSphere Austria (SPARTACUS)",
    phase: "phase2",
  },
  {
    key: "energieeffizienz",
    label: "Energieeffizienz",
    cluster: "zukunftsfestigkeit",
    direction: "higher_better",
    unit: "Index",
    tier: 3,
    source: "Statistik Austria Gebäude nach Bauperiode/Heizung",
    phase: "phase3",
  },
  {
    key: "alterung",
    label: "Alterung",
    cluster: "zukunftsfestigkeit",
    direction: "lower_better",
    unit: "% über 65",
    tier: 1,
    source: "Statistik Austria Bevölkerung nach Alter",
    phase: "mvp",
  },
  {
    key: "kommunale_finanzkraft",
    label: "Kommunale Finanzkraft",
    cluster: "zukunftsfestigkeit",
    direction: "higher_better",
    unit: "€/EW",
    tier: 1,
    source: "Statistik Austria Gemeindefinanzstatistik",
    phase: "mvp",
  },
] as const satisfies readonly IndicatorDef[];

export type IndicatorKey = (typeof INDICATORS)[number]["key"];

/** Liefert alle Indikatoren eines Clusters. */
export function indicatorsByCluster(c: Cluster): readonly IndicatorDef[] {
  return INDICATORS.filter((i) => i.cluster === c);
}
