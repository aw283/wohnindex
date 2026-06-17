/**
 * GKZ3-Mapper: Name → GKZ3-Lookup, Truncation 5→3, Präfix-Strip.
 *
 * Bundesland-Mapping via erste Stelle der GKZ3:
 *   1=Burgenland, 2=Kärnten, 3=Niederösterreich, 4=Oberösterreich,
 *   5=Salzburg, 6=Steiermark, 7=Tirol, 8=Vorarlberg, 9=Wien
 */

export const BUNDESLAND_MAP: Record<string, string> = {
  "1": "Burgenland",
  "2": "Kärnten",
  "3": "Niederösterreich",
  "4": "Oberösterreich",
  "5": "Salzburg",
  "6": "Steiermark",
  "7": "Tirol",
  "8": "Vorarlberg",
  "9": "Wien",
};

/** Leitet das Bundesland aus der ersten Stelle der GKZ3 ab. */
export function bundeslandFromGkz3(gkz3: string): string {
  const bl = BUNDESLAND_MAP[gkz3[0]];
  if (!bl) throw new Error(`Unbekannte GKZ3-Stelle: ${gkz3[0]} (gkz3=${gkz3})`);
  return bl;
}

/**
 * Trunciert eine 5-stellige Gemeinde-GKZ auf 3 Stellen (Bezirks-GKZ).
 * Gibt die Eingabe unverändert zurück wenn sie bereits 3 Stellen hat.
 * Wirft bei anderen Längen.
 */
export function truncateGkz(gkz: string | number): string {
  const s = String(gkz).trim().replace(/^0+/, ""); // führende Nullen weg
  if (s.length === 3) return s;
  if (s.length === 5) return s.slice(0, 3);
  // Numerisch 3 oder 5 Stellen (ohne führende Null)
  if (s.length === 1 || s.length === 2) {
    // Bundesland-Kennung oder Wien-Bezirk => nicht aggregieren
    return s;
  }
  throw new Error(`Unerwartete GKZ-Länge: "${gkz}" (${s.length} Stellen)`);
}

/**
 * Lookup-Tabelle: normalisierter Bezirksname → GKZ3.
 * Wird von loader-districts befüllt.
 */
const nameToGkz3Map = new Map<string, string>();

export function registerNameMapping(name: string, gkz3: string): void {
  nameToGkz3Map.set(normalizeDistrictName(name), gkz3);
}

/**
 * Sucht GKZ3 nach (normalisierten) Bezirksnamen.
 * Gibt null zurück wenn nicht gefunden.
 */
export function lookupGkz3ByName(rawName: string): string | null {
  return nameToGkz3Map.get(normalizeDistrictName(rawName)) ?? null;
}

/**
 * Normalisiert einen Bezirksnamen für fuzzy-Matching:
 * - Kleinschreibung
 * - Klammer-Zusätze entfernen (z.B. "<101>", "(Stadt)")
 * - Fußnoten-Suffixe entfernen ("2)", "3) 4)" etc.)
 * - Bekannte Abkürzungsvarianten angleichen
 * - Leerzeichen normalisieren
 * - Umlaute ersetzen
 */
export function normalizeDistrictName(name: string): string {
  return name
    .toLowerCase()
    .replace(/<[^>]+>/g, "")          // <101> entfernen
    .replace(/\([^)]*\)/g, "")        // (Stadt) entfernen
    // Fußnoten-Suffixe: " 2)", " 3) 4)" etc. am Zeilenende
    .replace(/(\s+\d+\))+\s*$/g, "")
    // "Klagenfurt Stadt" -> "Klagenfurt" (ohne Stadt) wird durch Klammer-Strip bereits abgedeckt
    // aber auch ohne Klammern vorkommend:
    .replace(/\bstadt\b/g, "")
    // Bindestrich-Varianten ("Krems(Land)" -> "Krems Land" nach Klammer-Strip)
    .replace(/[.,'\-\/]/g, " ")       // Satzzeichen → Leerzeichen
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    // Innsbruck-Stadt -> innsbruck  (und "Stadt Linz" -> "linz")
    .replace(/\binnsbruck\b/g, "innsbruck")
    .replace(/\s+/g, " ")
    .trim();
}

/** Liefert alle registrierten Name→GKZ3 Mappings (für Debugging). */
export function getAllMappings(): Map<string, string> {
  return new Map(nameToGkz3Map);
}
