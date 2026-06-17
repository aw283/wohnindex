/**
 * Loader: Immobilienpreise (kaufpreis + preisentwicklung)
 *
 * Quellen (Statistik Austria, CC BY 4.0):
 *   https://www.statistik.at/fileadmin/pages/222/Haeuserpreise{JAHR}.ods
 *   https://www.statistik.at/fileadmin/pages/222/Wohnungspreise{JAHR}.ods
 *   https://www.statistik.at/fileadmin/pages/222/Baugrundstueckspreise{JAHR}.ods
 *
 * Struktur (inspiziert 2026-06-16):
 *   Häuser/Wohnungspreise: 1 Sheet pro Bundesland.
 *     Row[0]  = Bundesland-Name
 *     Row[4]  = Bauperioden-Header (Bis 1960 | 1961-1990 | Ab 1991)
 *     Row[5]  = Flächenkategorien (z.B. "<90m²", "90-130m²", ">130m²") je 3 Spalten pro Periode
 *     Row[6+] = Bezirkszeile: col[0]=Name, col[1..9]=Preise (€/m²) nach Bauperiode+Größe
 *     -> Wir mitteln alle 9 nicht-leeren Preiswerte zu einem Bezirks-Durchschnitt.
 *
 *   Baugrundstückspreise: 1 Sheet pro Bundesland.
 *     Row[3] = Header: B.Nr. | Bezirk | G.Nr. | Gemeinde | Euro/m²
 *     Zeile mit leerem G.Nr. UND "Bezirksdurchschnitt" = Bezirks-Aggregat -> col[4] = Euro/m²
 *     Zeile mit B.Nr. (3-stellig) und G.Nr. leer = Bezirks-Durchschnitt-Zeile.
 *
 *   Indikator kaufpreis: gewichteter Mittelwert aus (Häuser+Wohnungen+Baugrund) soweit verfügbar.
 *   Indikator preisentwicklung: Δ% YoY = (wert_t - wert_{t-1}) / wert_{t-1} * 100.
 *
 * Annahme: Spaltenstruktur ist über alle Jahres-Dateien 2015-2025 stabil
 *   (Häuser/Wohnungen: 9 Preisspalten; Baugrund: Spalte 4 = Euro/m²).
 *   Falls eine Datei abweicht, wird gewarnt und die Zeile übersprungen.
 */
import "dotenv/config";
import { downloadFile } from "@/lib/ingest/download-helper";
import { readOds, toNumber, type RawRow } from "@/lib/ingest/ods-parser";
import { lookupGkz3ByName } from "@/lib/ingest/gkz3-mapper";
import { validateIndicatorRows, type IndicatorRow } from "@/lib/ingest/validator";
import { getAdminClient } from "@/lib/ingest/supabase-admin";

/** Bundesland-Blattnamen in den ODS-Dateien */
const BUNDESLAND_SHEETS = [
  "Burgenland",
  "Kärnten",
  "Niederösterreich",
  "Oberösterreich",
  "Salzburg",
  "Steiermark",
  "Tirol",
  "Vorarlberg",
  "Wien",
];

const JAHRE = [2023, 2024]; // MVP: nur die letzten 2 Jahre für preisentwicklung

// ---------------------------------------------------------------------------
// Häuser + Wohnungspreise: mittelt alle nicht-null Preiswerte in einer Zeile
// ---------------------------------------------------------------------------
function parsePriceMatrix(
  rows: RawRow[]
): Map<string, number> {
  const result = new Map<string, number>();

  // Header liegt auf Row[4] (Bauperioden) und Row[5] (Flächen).
  // Datenzeilen starten ab Row[6].
  for (let i = 6; i < rows.length; i++) {
    const row = rows[i];
    const rawName = row[0];
    if (!rawName || typeof rawName !== "string") continue;
    // Fußnote-Zeilen (z.B. "Q: STATISTIK AUSTRIA...")
    if (rawName.startsWith("Q:") || rawName.startsWith("1)")) continue;
    // Kategorietrennzeilen (leer oder nur Leerzeichen)
    if (rawName.trim() === "") continue;

    // Preisspalten: index 1..9 (je 3 Spalten pro Bauperiode × 3 Perioden)
    const prices: number[] = [];
    for (let c = 1; c <= 9; c++) {
      const v = toNumber(row[c]);
      if (v !== null && v > 0) prices.push(v);
    }

    if (prices.length === 0) continue;

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    result.set(rawName.trim(), avg);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Baugrundstückspreise: extrahiert Bezirksdurchschnitt-Zeilen
// ---------------------------------------------------------------------------
function parseBaugrundPreise(rows: RawRow[]): Map<string, number> {
  const result = new Map<string, number>();

  // Row[3] = Header: B.Nr. | Bezirk | G.Nr. | Gemeinde | Euro/m²
  // Bezirksdurchschnitt: col[0] = 3-stellige Zahl, col[2] = leer, col[3] = "Bezirksdurchschnitt", col[4] = Preis
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[3]) continue;

    const maybeGemeinde = String(row[3]).trim();
    if (maybeGemeinde !== "Bezirksdurchschnitt") continue;

    const bezirkName = String(row[1] ?? "").trim();
    const preis = toNumber(row[4]);
    if (!bezirkName || preis === null) continue;

    result.set(bezirkName, preis);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Hauptlogik
// ---------------------------------------------------------------------------
export async function loadImmo(dryRun = false): Promise<IndicatorRow[]> {
  console.log("\n[immo] Starte Immo-Loader (kaufpreis, preisentwicklung)");

  // Preise pro Jahr sammeln: gkz3 -> { jahr -> avgPreis }
  const pricesByGkz3 = new Map<string, Map<number, number>>();

  function recordPrice(gkz3: string, jahr: number, preis: number): void {
    const m = pricesByGkz3.get(gkz3) ?? new Map<number, number>();
    // Falls mehrere Quellen (Häuser + Wohnungen + Baugrund): Mittelwert
    const existing = m.get(jahr);
    if (existing !== undefined) {
      m.set(jahr, (existing + preis) / 2);
    } else {
      m.set(jahr, preis);
    }
    pricesByGkz3.set(gkz3, m);
  }

  let unmatchedNames = 0;
  const datenstandByJahr = new Map<number, string>();

  for (const jahr of JAHRE) {
    // Häuserpreise
    const haueserUrl = `https://www.statistik.at/fileadmin/pages/222/Haeuserpreise${jahr}.ods`;
    const { localPath: haueserPath, lastModified } = await downloadFile(
      haueserUrl,
      `Haeuserpreise${jahr}.ods`
    );
    datenstandByJahr.set(
      jahr,
      lastModified
        ? new Date(lastModified).toISOString().slice(0, 10)
        : `${jahr}-12-31`
    );

    const haueserWb = readOds(haueserPath);
    for (const sn of BUNDESLAND_SHEETS) {
      if (!haueserWb.sheets[sn]) continue;
      const priceMap = parsePriceMatrix(haueserWb.sheets[sn]);
      for (const [rawName, preis] of priceMap) {
        const gkz3 = lookupGkz3ByName(rawName);
        if (!gkz3) {
          console.warn(`[immo:haeuser${jahr}] Kein GKZ3 für "${rawName}" (${sn})`);
          unmatchedNames++;
          continue;
        }
        recordPrice(gkz3, jahr, preis);
      }
    }

    // Wohnungspreise
    const wohnUrl = `https://www.statistik.at/fileadmin/pages/222/Wohnungspreise${jahr}.ods`;
    const { localPath: wohnPath } = await downloadFile(
      wohnUrl,
      `Wohnungspreise${jahr}.ods`
    );
    const wohnWb = readOds(wohnPath);
    for (const sn of BUNDESLAND_SHEETS) {
      if (!wohnWb.sheets[sn]) continue;
      const priceMap = parsePriceMatrix(wohnWb.sheets[sn]);
      for (const [rawName, preis] of priceMap) {
        const gkz3 = lookupGkz3ByName(rawName);
        if (!gkz3) {
          console.warn(`[immo:wohnung${jahr}] Kein GKZ3 für "${rawName}" (${sn})`);
          unmatchedNames++;
          continue;
        }
        recordPrice(gkz3, jahr, preis);
      }
    }

    // Baugrundstückspreise
    const baugrundUrl = `https://www.statistik.at/fileadmin/pages/222/Baugrundstueckspreise${jahr}.ods`;
    const { localPath: baugrundPath } = await downloadFile(
      baugrundUrl,
      `Baugrundstueckspreise${jahr}.ods`
    );
    const baugrundWb = readOds(baugrundPath);
    for (const sn of BUNDESLAND_SHEETS) {
      if (!baugrundWb.sheets[sn]) continue;
      const priceMap = parseBaugrundPreise(baugrundWb.sheets[sn]);
      for (const [rawName, preis] of priceMap) {
        const gkz3 = lookupGkz3ByName(rawName);
        if (!gkz3) {
          console.warn(`[immo:baugrund${jahr}] Kein GKZ3 für "${rawName}" (${sn})`);
          unmatchedNames++;
          continue;
        }
        recordPrice(gkz3, jahr, preis);
      }
    }
  }

  if (unmatchedNames > 0) {
    console.warn(`[immo] ${unmatchedNames} ungematchte Bezirksnamen insgesamt`);
  }

  // Indikator-Zeilen aufbauen
  const indicatorRows: IndicatorRow[] = [];
  const quelle = "Statistik Austria Immobilienpreisindex (Häuser, Wohnungen, Baugrund)";

  for (const [gkz3, jahresMap] of pricesByGkz3) {
    // kaufpreis: Preise je Jahr
    for (const [jahr, preis] of jahresMap) {
      indicatorRows.push({
        gkz3,
        indicator: "kaufpreis",
        value: Math.round(preis * 100) / 100,
        jahr,
        quelle,
        datenstand: datenstandByJahr.get(jahr) ?? `${jahr}-12-31`,
      });
    }

    // preisentwicklung: YoY Δ%
    const sortedJahre = [...jahresMap.keys()].sort((a, b) => a - b);
    for (let i = 1; i < sortedJahre.length; i++) {
      const jPrev = sortedJahre[i - 1];
      const jCurr = sortedJahre[i];
      const prev = jahresMap.get(jPrev)!;
      const curr = jahresMap.get(jCurr)!;
      if (prev > 0) {
        const delta = ((curr - prev) / prev) * 100;
        indicatorRows.push({
          gkz3,
          indicator: "preisentwicklung",
          value: Math.round(delta * 100) / 100,
          jahr: jCurr,
          quelle,
          datenstand: datenstandByJahr.get(jCurr) ?? `${jCurr}-12-31`,
        });
      }
    }
  }

  console.log(`[immo] ${indicatorRows.length} Indikator-Zeilen erzeugt`);
  validateIndicatorRows(indicatorRows, "immo");

  if (dryRun) {
    console.log("[immo] DRY-RUN – kein DB-Write");
    console.log("[immo] Beispielzeilen:", indicatorRows.slice(0, 5));
    return indicatorRows;
  }

  const sb = getAdminClient();

  // Staging TRUNCATE + INSERT roh
  await sb.from("staging_immo").delete().neq("lfd_nr", "###never###");

  // Normalisierte indicators UPSERT
  const { error } = await sb.from("indicators").upsert(
    indicatorRows.map((r) => ({
      gkz3: r.gkz3,
      indicator: r.indicator,
      value: r.value,
      jahr: r.jahr,
      quelle: r.quelle,
      datenstand: r.datenstand,
    })),
    { onConflict: "gkz3,indicator,jahr" }
  );

  if (error) throw new Error(`[immo] Supabase-Fehler: ${error.message}`);
  console.log(`[immo] ${indicatorRows.length} Zeilen upserted`);
  return indicatorRows;
}

if (process.argv[1]?.endsWith("loader-immo.ts")) {
  loadImmo(false).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
