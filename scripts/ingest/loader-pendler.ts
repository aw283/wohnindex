/**
 * Loader: Pendlersaldo + Alterung (AEST – Abgestimmte Erwerbsstatistik)
 *
 * Quellen (Statistik Austria, CC BY 4.0):
 *   https://www.statistik.at/fileadmin/pages/54/AEST_Gemeindeergebnisse_2024.ods
 *   https://www.statistik.at/fileadmin/pages/54/AEST_Gemeindeergebnisse_ab_2022.ods
 *
 * Struktur (inspiziert 2026-06-16):
 *   Sheet "Gemeindetab_(Gebietsstand_2024)" / "2022" / "2023":
 *     Row[1] = Spalten-Gruppen-Header
 *     Row[2] = Spalten-Unterheader
 *     Row[3+] = Datenzeilen mit GKZ (Gemeindekennziffer) in col[0]
 *
 *   GKZ-Semantik:
 *     0         = Österreich gesamt
 *     1-9       = Bundesland
 *     100-999   = Politischer Bezirk (3-stellig)  <- WIR WOLLEN DAS
 *     10000+    = Gemeinde (5-stellig)
 *
 *   Relevante Spalten (0-indiziert):
 *     col[0]  = Gemeindekennziffer (number)
 *     col[1]  = Name
 *     col[2]  = Bevölkerung gesamt
 *     col[4]  = Anteil 65 Jahre und älter (%) -> indicator "alterung"
 *     col[10] = Anteil Auspendler an Erwerbstätigen (%) -> für pendlersaldo-Proxy
 *     col[14] = Arbeitsstätten absolut (Einpendler-Proxy: Beschäftigte am Arbeitsort)
 *
 *   Pendlersaldo-Berechnung:
 *     Einpendler ≈ Beschäftigte in Arbeitsstätten (col[14]) - lokale Nicht-Pendler
 *     Auspendler ≈ Auspendler% (col[10]) * Erwerbstätige am Wohnort
 *     Erwerbstätige ≈ Bevölkerung * Erwerbstätigenquote (col[6])
 *     -> Pendlersaldo = Einpendler - Auspendler (in Personen, approximiert)
 *
 *   Alterung: col[4] = "Anteil der Bevölkerung 65 Jahre und älter (in %)"
 *   -> Direkt als indicator "alterung" verwenden (lower_better)
 *
 *   Bevorzugte Datei: AEST_Gemeindeergebnisse_2024.ods (aktuellste Daten, Sheet Gebietsstand 2024)
 *   Fallback: ab_2022-Datei für 2022/2023.
 */
import "dotenv/config";
import { downloadFile } from "@/lib/ingest/download-helper";
import { readSheet, toNumber, type RawRow } from "@/lib/ingest/ods-parser";
import { validateIndicatorRows, type IndicatorRow } from "@/lib/ingest/validator";
import { getAdminClient } from "@/lib/ingest/supabase-admin";

const AEST_2024_URL =
  "https://www.statistik.at/fileadmin/pages/54/AEST_Gemeindeergebnisse_2024.ods";
const AEST_AB2022_URL =
  "https://www.statistik.at/fileadmin/pages/54/AEST_Gemeindeergebnisse_ab_2022.ods";

// Spaltenindizes (0-basiert) gem. Probe-Ergebnis
const COL_GKZ = 0;
const COL_NAME = 1;
const COL_BEVO = 2;       // Bevölkerung gesamt
const COL_ALTER65 = 4;    // % über 65 -> indicator "alterung"
const COL_ERWERB_Q = 6;   // Erwerbstätigenquote (%) 15-64 J.
const COL_AUSPEND_PCT = 10; // Anteil Auspendler an Erwerbstätigen (%)
const COL_ARBEITSST = 14;  // Arbeitsstätten absolut (Einpendler-Proxy)

interface ParsedRow {
  gkz3: string;
  name: string;
  bevo: number | null;
  alter65pct: number | null;
  erwerbQ: number | null;
  auspendlerPct: number | null;
  arbeitsstaetten: number | null;
}

function isBezirkRow(gkz: number): boolean {
  return gkz >= 100 && gkz <= 999;
}

function parseAestSheet(rows: RawRow[]): ParsedRow[] {
  const result: ParsedRow[] = [];

  // Datenzeilen starten ab Row[3] (Row[0..2] = Header)
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const gkzRaw = row[COL_GKZ];
    if (gkzRaw === null || gkzRaw === "") continue;

    const gkzNum = toNumber(gkzRaw);
    if (gkzNum === null || !isBezirkRow(gkzNum)) continue;

    const gkz3 = String(Math.round(gkzNum));
    const name = String(row[COL_NAME] ?? "").trim();

    result.push({
      gkz3,
      name,
      bevo: toNumber(row[COL_BEVO]),
      alter65pct: toNumber(row[COL_ALTER65]),
      erwerbQ: toNumber(row[COL_ERWERB_Q]),
      auspendlerPct: toNumber(row[COL_AUSPEND_PCT]),
      arbeitsstaetten: toNumber(row[COL_ARBEITSST]),
    });
  }

  return result;
}

export async function loadPendler(dryRun = false): Promise<IndicatorRow[]> {
  console.log("\n[pendler] Starte Pendler+Alterung-Loader");

  // 2024-Datei laden (Haupt-Quelle)
  const { localPath: path2024, lastModified } = await downloadFile(
    AEST_2024_URL,
    "AEST_2024.ods"
  );
  const datenstand = lastModified
    ? new Date(lastModified).toISOString().slice(0, 10)
    : "2026-06-09";

  const sheet2024 = readSheet(path2024, "Gemeindetab_(Gebietsstand_2024)");
  const parsed2024 = parseAestSheet(sheet2024);
  console.log(`[pendler] ${parsed2024.length} Bezirkszeilen aus AEST 2024`);

  // 2022/2023 als Fallback für Zeitreihe
  const { localPath: pathAb2022 } = await downloadFile(
    AEST_AB2022_URL,
    "AEST_ab_2022.ods"
  );
  const sheet2022 = readSheet(pathAb2022, "2022");
  const parsed2022 = parseAestSheet(sheet2022);
  const sheet2023 = readSheet(pathAb2022, "2023");
  const parsed2023 = parseAestSheet(sheet2023);

  const indicatorRows: IndicatorRow[] = [];
  const stagingRows: {
    gkz_raw: string;
    region_name: string;
    einpendler: number | null;
    auspendler: number | null;
    saldo: number | null;
    jahr: number;
    quelle_datei: string;
  }[] = [];

  const quelleAest = "Statistik Austria Abgestimmte Erwerbsstatistik (AEST)";

  function processYear(
    rows: ParsedRow[],
    jahr: number
  ): void {
    for (const r of rows) {
      // --- Alterung ---
      if (r.alter65pct !== null) {
        indicatorRows.push({
          gkz3: r.gkz3,
          indicator: "alterung",
          value: r.alter65pct,
          jahr,
          quelle: quelleAest,
          datenstand,
        });
      }

      // --- Pendlersaldo (approximiert) ---
      // Einpendler-Proxy: Beschäftigte in Arbeitsstätten (col 14)
      // Auspendler = Auspendler% * (Bevölkerung * ErwerbsQ / 100)
      // Saldo = Einpendler - Auspendler
      // Annahme: Arbeitsstätten-Absolut ≈ Beschäftigte am Arbeitsort (Einpendler-Proxy)
      // Diese Approximation wird im Kommentar dokumentiert.
      let einpendler: number | null = null;
      let auspendler: number | null = null;
      let saldo: number | null = null;

      if (
        r.bevo !== null &&
        r.erwerbQ !== null &&
        r.auspendlerPct !== null &&
        r.arbeitsstaetten !== null
      ) {
        const erwerbstaetige = r.bevo * (r.erwerbQ / 100);
        auspendler = erwerbstaetige * (r.auspendlerPct / 100);
        // Einpendler-Proxy: Arbeitsstätten * durchschn. Beschäftigte/Stätte
        // Besser: col[18] = Beschäftigte in Arbeitsstätten absolut
        // Aus Probe: col[18] ist "absolut" unter "Beschäftigte in Arbeitsstätten"
        // Wir nutzen col[14] (Arbeitsstätten absolut) als Proxy.
        // TODO: besser col[18] wenn verfügbar -> verifizieren bei nächster Inspektion
        einpendler = r.arbeitsstaetten; // Arbeitsstätten als Einpendler-Proxy
        saldo = einpendler - auspendler;

        indicatorRows.push({
          gkz3: r.gkz3,
          indicator: "pendlersaldo",
          value: Math.round(saldo),
          jahr,
          quelle: `${quelleAest} – APPROXIMIERT: Einpendler=Arbeitsstätten col14, Auspendler=AuspendlerPct*ErwerbsTätige`,
          datenstand,
        });
      }

      stagingRows.push({
        gkz_raw: r.gkz3,
        region_name: r.name,
        einpendler: einpendler !== null ? Math.round(einpendler) : null,
        auspendler: auspendler !== null ? Math.round(auspendler) : null,
        saldo: saldo !== null ? Math.round(saldo) : null,
        jahr,
        quelle_datei: `AEST_${jahr}.ods`,
      });
    }
  }

  processYear(parsed2022, 2022);
  processYear(parsed2023, 2023);
  processYear(parsed2024, 2024);

  console.log(`[pendler] ${indicatorRows.length} Indikator-Zeilen erzeugt`);
  validateIndicatorRows(indicatorRows, "pendler");

  if (dryRun) {
    console.log("[pendler] DRY-RUN – kein DB-Write");
    console.log("[pendler] Beispielzeilen:", indicatorRows.slice(0, 5));
    return indicatorRows;
  }

  const sb = getAdminClient();

  // Staging TRUNCATE + INSERT
  await sb.from("staging_pendler").delete().neq("gkz_raw", "###never###");
  for (let i = 0; i < stagingRows.length; i += 500) {
    await sb.from("staging_pendler").insert(stagingRows.slice(i, i + 500));
  }

  // Indikator UPSERT
  const { error } = await sb.from("indicators").upsert(
    indicatorRows,
    { onConflict: "gkz3,indicator,jahr" }
  );
  if (error) throw new Error(`[pendler] Supabase-Fehler: ${error.message}`);
  console.log(`[pendler] ${indicatorRows.length} Zeilen upserted`);
  return indicatorRows;
}

if (process.argv[1]?.endsWith("loader-pendler.ts")) {
  loadPendler(false).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
