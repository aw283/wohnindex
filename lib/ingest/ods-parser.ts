/**
 * ODS/XLSX Parser-Wrapper (SheetJS).
 * Liest .ods-Dateien und liefert rohe Zeilen-Arrays pro Sheet.
 */
import * as XLSX from "xlsx";

export type RawRow = (string | number | boolean | null)[];
export type SheetData = RawRow[];

export interface WorkbookData {
  sheetNames: string[];
  sheets: Record<string, SheetData>;
}

/**
 * Liest eine ODS/XLSX-Datei und gibt alle Sheets als rohe Zeilen-Arrays zurück.
 */
export function readOds(filePath: string): WorkbookData {
  const wb = XLSX.readFile(filePath);
  const result: WorkbookData = { sheetNames: wb.SheetNames, sheets: {} };

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    result.sheets[name] = XLSX.utils.sheet_to_json<RawRow>(ws, {
      header: 1,
      defval: null,
    });
  }

  return result;
}

/**
 * Liest nur ein einzelnes Sheet einer ODS/XLSX-Datei.
 */
export function readSheet(filePath: string, sheetName: string): SheetData {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" nicht in ${filePath} gefunden`);
  return XLSX.utils.sheet_to_json<RawRow>(ws, { header: 1, defval: null });
}

/** Gibt alle Sheet-Namen einer ODS/XLSX-Datei zurück (ohne Workbook-Inhalt zu laden). */
export function getSheetNames(filePath: string): string[] {
  const wb = XLSX.readFile(filePath, { bookSheets: false });
  return wb.SheetNames;
}

/** Konvertiert einen Rohwert in eine Zahl (null bei leer/fehlend/kein Wert). */
export function toNumber(val: RawRow[number]): number | null {
  if (val === null || val === "" || val === undefined) return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    // Statistik Austria formatiert Zahlen manchmal mit Leerzeichen als Tausendertrennzeichen
    const cleaned = val.replace(/\s/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return null;
}
