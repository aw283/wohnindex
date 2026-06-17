/**
 * CSV-Parser-Wrapper für OGD-Daten (Statistik Austria).
 * Spaltentrennzeichen: Semikolon (;) – OGD-Standard AT.
 */
import * as fs from "fs";

export interface CsvRow {
  [column: string]: string;
}

/**
 * Liest eine Semikolon-getrennte CSV-Datei.
 * Erste Zeile = Header. Gibt alle Zeilen als Key-Value-Objekte zurück.
 *
 * Annahme: Encoding UTF-8 (OGD AT Standard seit 2020).
 * Falls BOM vorhanden, wird er entfernt.
 */
export function readCsv(filePath: string): CsvRow[] {
  let content = fs.readFileSync(filePath, "utf-8");
  // BOM entfernen
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];

  const headers = lines[0].split(";");
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (cols[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return rows;
}
