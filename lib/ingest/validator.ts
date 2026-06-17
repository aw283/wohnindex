/**
 * Validierungsmodul für Ingest-Ergebnisse.
 * Loggt: nicht-gematchte GKZ3, Werte außerhalb ±2 SD, Null-Werte, Bezirksanzahl.
 */

import { INDICATORS } from "@/types/indicators";

export interface IndicatorRow {
  gkz3: string;
  indicator: string;
  value: number | null;
  jahr: number;
  quelle: string;
  datenstand: string | null;
}

interface ValidationReport {
  indicator: string;
  totalRows: number;
  matchedGkz3: string[];
  missingGkz3: string[];
  nullValues: number;
  outliers: { gkz3: string; value: number }[];
  warnings: string[];
}

const EXPECTED_BEZIRKE = 94;

/** Alle bekannten GKZ3 (94 Bezirke ohne Wien-Teilbezirke). Wird nach Seed befüllt. */
let knownGkz3Set = new Set<string>();

export function setKnownGkz3(gkz3s: string[]): void {
  knownGkz3Set = new Set(gkz3s);
}

/**
 * Validiert eine Liste von Indikator-Zeilen und gibt einen Bericht aus.
 * Prüft:
 *  - Bezirksanzahl == 94
 *  - Fehlende GKZ3
 *  - Null/Leerwerte
 *  - Werte außerhalb ±2 SD (Ausreißer)
 */
export function validateIndicatorRows(
  rows: IndicatorRow[],
  label: string
): void {
  console.log(`\n[validate] === ${label} ===`);

  // Gruppierung nach Indikator
  const byIndicator = new Map<string, IndicatorRow[]>();
  for (const row of rows) {
    const list = byIndicator.get(row.indicator) ?? [];
    list.push(row);
    byIndicator.set(row.indicator, list);
  }

  for (const [indicator, iRows] of byIndicator) {
    const report = buildReport(indicator, iRows);
    printReport(report);
  }
}

function buildReport(
  indicator: string,
  rows: IndicatorRow[]
): ValidationReport {
  const report: ValidationReport = {
    indicator,
    totalRows: rows.length,
    matchedGkz3: [],
    missingGkz3: [],
    nullValues: 0,
    outliers: [],
    warnings: [],
  };

  const matchedGkz3s = new Set(rows.map((r) => r.gkz3));
  report.matchedGkz3 = [...matchedGkz3s];

  // Fehlende GKZ3 (nur wenn knownGkz3Set befüllt ist)
  if (knownGkz3Set.size > 0) {
    for (const gkz3 of knownGkz3Set) {
      if (!matchedGkz3s.has(gkz3)) {
        report.missingGkz3.push(gkz3);
      }
    }
  }

  // Null-Werte
  const nullCount = rows.filter((r) => r.value === null).length;
  report.nullValues = nullCount;

  // Ausreißer: ±2 SD
  const values = rows
    .map((r) => r.value)
    .filter((v): v is number => v !== null);

  if (values.length >= 3) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sd = Math.sqrt(
      values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
    );
    const lo = mean - 2 * sd;
    const hi = mean + 2 * sd;

    for (const row of rows) {
      if (row.value !== null && (row.value < lo || row.value > hi)) {
        report.outliers.push({ gkz3: row.gkz3, value: row.value });
      }
    }
  }

  // Bezirksanzahl
  if (matchedGkz3s.size !== EXPECTED_BEZIRKE) {
    report.warnings.push(
      `Bezirksanzahl ${matchedGkz3s.size} != ${EXPECTED_BEZIRKE} erwartet`
    );
  }

  return report;
}

function printReport(r: ValidationReport): void {
  const prefix = `[validate:${r.indicator}]`;
  console.log(`${prefix} Zeilen=${r.totalRows} Bezirke=${r.matchedGkz3.length} Null=${r.nullValues} Ausreisser=${r.outliers.length}`);

  if (r.missingGkz3.length > 0) {
    console.warn(`${prefix} FEHLENDE GKZ3 (${r.missingGkz3.length}): ${r.missingGkz3.slice(0, 10).join(", ")}${r.missingGkz3.length > 10 ? "..." : ""}`);
  }

  if (r.nullValues > 0) {
    console.warn(`${prefix} NULL-Werte: ${r.nullValues}`);
  }

  if (r.outliers.length > 0) {
    console.warn(
      `${prefix} Ausreisser (±2 SD): ${r.outliers
        .slice(0, 5)
        .map((o) => `${o.gkz3}=${o.value.toFixed(2)}`)
        .join(", ")}`
    );
  }

  for (const w of r.warnings) {
    console.warn(`${prefix} WARNUNG: ${w}`);
  }
}

/** Prüft ob ein Indikator-Key in INDICATORS definiert ist. */
export function isKnownIndicator(key: string): boolean {
  return INDICATORS.some((i) => i.key === key);
}
