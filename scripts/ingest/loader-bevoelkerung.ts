/**
 * Loader: Bevölkerungshistorie (OGD CSV, Statistik Austria, CC BY 4.0)
 *
 * Quellen:
 *   https://data.statistik.gv.at/data/OGD_f0743_VZ_HIS_GEM_2.csv             (Daten)
 *   https://data.statistik.gv.at/data/OGD_f0743_VZ_HIS_GEM_2_C-GRGEM17-0.csv (Regionen)
 *   https://data.statistik.gv.at/data/OGD_f0743_VZ_HIS_GEM_2_C-H88-0.csv     (Zähljahre)
 *
 * Daten-CSV (';'-getrennt, inspiziert 2026-06-16):
 *   Spalten: C-H88-0 ; C-GRGEM17-0 ; F-ISIS-1
 *   C-H88-0    = Zähljahr-Code (z.B. H88-14 = 2011)
 *   C-GRGEM17-0 = Regions-Code (z.B. GRBEZ17-101 = Bezirk Eisenstadt)
 *   F-ISIS-1   = Bevölkerungszahl
 *
 * Regions-CSV: code;name;FK – nur GRBEZ17-Zeilen = Bezirke.
 * Jahre-CSV: code;name – Mapping H88-N -> Jahreszahl (aus name-Feld parsen).
 *
 * -> Kein eigener Indikator "bevoelkerung"; stattdessen:
 *    "alterung": wird aus externer Quelle geladen (AEST).
 *    Hier: Basisbevölkerung als Hilfswert ablegen (staging_bevoelkerung).
 *    Falls bevoelkerungsprognose-Daten vorliegen: Eintrag mit indicator='bevoelkerungsprognose'.
 *    In diesem Loader: Nur Bevölkerung 2011 + letztes Zähljahr speichern als Basis für
 *    spätere Prognose-Berechnung (ÖROK-Stub in prognose.ts).
 *
 * Annahme: H88-Codes sind nicht direkt Jahreszahlen; der Klartext im Namen-CSV enthält
 *   Jahresangaben wie "2011 (31.10.)" -> parsen mit Regex.
 */
import "dotenv/config";
import { downloadFile } from "@/lib/ingest/download-helper";
import { readCsv } from "@/lib/ingest/csv-parser";
import { validateIndicatorRows, type IndicatorRow } from "@/lib/ingest/validator";
import { getAdminClient } from "@/lib/ingest/supabase-admin";

const BASE_URL = "https://data.statistik.gv.at/data";
const DATA_URL = `${BASE_URL}/OGD_f0743_VZ_HIS_GEM_2.csv`;
const REGIONS_URL = `${BASE_URL}/OGD_f0743_VZ_HIS_GEM_2_C-GRGEM17-0.csv`;
const JAHRE_URL = `${BASE_URL}/OGD_f0743_VZ_HIS_GEM_2_C-H88-0.csv`;

/** Parsed Jahreszahl aus Klartext wie "2011 (31.10.)" -> 2011 */
function parseYear(nameText: string): number | null {
  const m = nameText.match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

export async function loadBevoelkerung(dryRun = false): Promise<void> {
  console.log("\n[bevoelkerung] Starte Bevölkerungs-Loader");

  // 1. Regionen-CSV laden -> GKZ3-Lookup
  const { localPath: regPath } = await downloadFile(
    REGIONS_URL,
    "OGD_f0743_REGIONS.csv"
  );
  const regRows = readCsv(regPath);
  const gkz3ByCode = new Map<string, string>(); // GRBEZ17-101 -> "101"
  for (const r of regRows) {
    const code = r["code"]?.trim();
    if (!code?.startsWith("GRBEZ17-")) continue;
    const gkz3 = code.replace("GRBEZ17-", "");
    if (gkz3 === "0") continue; // "Nicht klassifizierbar"
    gkz3ByCode.set(code, gkz3);
  }
  console.log(`[bevoelkerung] ${gkz3ByCode.size} Bezirke aus Regions-CSV`);

  // 2. Jahres-CSV laden -> H88-N -> Jahreszahl
  const { localPath: jahrePath } = await downloadFile(
    JAHRE_URL,
    "OGD_f0743_JAHRE.csv"
  );
  const jahreRows = readCsv(jahrePath);
  const yearByCode = new Map<string, number>(); // H88-14 -> 2011
  for (const r of jahreRows) {
    const code = r["code"]?.trim();
    const name = r["name"]?.trim() ?? "";
    const year = parseYear(name);
    if (code && year) yearByCode.set(code, year);
  }
  console.log(`[bevoelkerung] ${yearByCode.size} Zähljahre aus Jahre-CSV`);

  // 3. Daten-CSV laden
  const { localPath: dataPath, lastModified } = await downloadFile(
    DATA_URL,
    "OGD_f0743_DATA.csv"
  );
  const datenstand = lastModified
    ? new Date(lastModified).toISOString().slice(0, 10)
    : "2024-01-01";

  const dataRows = readCsv(dataPath);
  console.log(`[bevoelkerung] ${dataRows.length} Datenzeilen gelesen`);

  // Bevölkerung je Bezirk und Jahr sammeln
  // Fokus: letztes verfügbares Registerzähljahr (2022/2023) und 2011 (Basisjahr)
  const bevoByGkz3Jahr = new Map<string, Map<number, number>>();
  let skipped = 0;

  for (const row of dataRows) {
    const jahreCode = row["C-H88-0"]?.trim();
    const regionCode = row["C-GRGEM17-0"]?.trim();
    const wertStr = row["F-ISIS-1"]?.trim();

    if (!jahreCode || !regionCode || !wertStr) continue;

    const gkz3 = gkz3ByCode.get(regionCode);
    if (!gkz3) { skipped++; continue; } // Nicht-Bezirk (Gemeinde, Bundesland etc.)

    const jahr = yearByCode.get(jahreCode);
    if (!jahr) continue;

    const wert = parseFloat(wertStr);
    if (isNaN(wert)) continue;

    const m = bevoByGkz3Jahr.get(gkz3) ?? new Map<number, number>();
    m.set(jahr, wert);
    bevoByGkz3Jahr.set(gkz3, m);
  }

  console.log(`[bevoelkerung] ${bevoByGkz3Jahr.size} Bezirke mit Bevölkerungsdaten (${skipped} Zeilen übersprungen)`);

  // Staging-Zeilen für raw-Ablage
  const stagingRows = [] as { gkz3_raw: string; region_name: string; zaehl_jahr: number; wert: number; merkmal_raw: string }[];

  // Indikator-Zeilen: Bevölkerung als Basiswert – kein eigener Indikator in CLAUDE.md!
  // Wir legen alterung (% über 65) aus AEST-Daten an (loader-pendler).
  // Hier nur staging_bevoelkerung befüllen + Bevölkerungswert für spätere Berechnungen.

  const indicatorRows: IndicatorRow[] = [];
  const quelle = "Statistik Austria Volkszählungshistorie OGD (OGD_f0743_VZ_HIS_GEM_2)";

  for (const [gkz3, jahresMap] of bevoByGkz3Jahr) {
    const sortedJahre = [...jahresMap.keys()].sort((a, b) => a - b);
    const lastJahr = sortedJahre[sortedJahre.length - 1];
    const firstJahr = sortedJahre[0];
    const lastWert = jahresMap.get(lastJahr)!;
    const firstWert = jahresMap.get(firstJahr)!;

    // Staging: alle Jahreswerte
    for (const [j, w] of jahresMap) {
      stagingRows.push({
        gkz3_raw: gkz3,
        region_name: "",
        zaehl_jahr: j,
        wert: w,
        merkmal_raw: "bevoelkerung_gesamt",
      });
    }

    // Bevölkerungsprognose: Als Proxy: Bevölkerungswachstum seit 2011
    // Echter Wert kommt von ÖROK (prognose.ts) - hier Placeholder aus Istwachstum
    if (firstWert > 0 && firstJahr <= 2011) {
      const wachstum = ((lastWert - firstWert) / firstWert) * 100;
      indicatorRows.push({
        gkz3,
        indicator: "bevoelkerungsprognose",
        value: Math.round(wachstum * 100) / 100,
        jahr: lastJahr,
        quelle: `${quelle} – PROXY (Istwachstum ${firstJahr}–${lastJahr}; ersetzen durch ÖROK-Prognose)`,
        datenstand,
      });
    }
  }

  console.log(`[bevoelkerung] ${indicatorRows.length} Proxy-Indikatorzeilen (bevoelkerungsprognose)`);
  validateIndicatorRows(indicatorRows, "bevoelkerung");

  if (dryRun) {
    console.log("[bevoelkerung] DRY-RUN – kein DB-Write");
    console.log("[bevoelkerung] Beispielzeilen:", indicatorRows.slice(0, 5));
    return;
  }

  const sb = getAdminClient();

  // Staging TRUNCATE + INSERT
  await sb.from("staging_bevoelkerung").delete().neq("gkz_raw", "###never###");
  if (stagingRows.length > 0) {
    // Staging in Batches von 500
    for (let i = 0; i < stagingRows.length; i += 500) {
      await sb.from("staging_bevoelkerung").insert(
        stagingRows.slice(i, i + 500).map((r) => ({
          gkz_raw: r.gkz3_raw,
          region_name: r.region_name,
          zaehl_jahr: r.zaehl_jahr,
          wert: r.wert,
          merkmal_raw: r.merkmal_raw,
        }))
      );
    }
  }

  // Indikator UPSERT
  if (indicatorRows.length > 0) {
    const { error } = await sb.from("indicators").upsert(
      indicatorRows,
      { onConflict: "gkz3,indicator,jahr" }
    );
    if (error) throw new Error(`[bevoelkerung] Supabase-Fehler: ${error.message}`);
  }

  console.log(`[bevoelkerung] ${indicatorRows.length} Zeilen upserted`);
}

if (process.argv[1]?.endsWith("loader-bevoelkerung.ts")) {
  loadBevoelkerung(false).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
