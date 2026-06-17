/**
 * Baut tests/fixtures/mvp_slice.json aus den ECHTEN MVP-Daten (.cache/).
 *
 * Nutzt die realen Loader (loader-immo, loader-pendler) im dry-run-Modus
 * (kein DB-Write) und die Bezirks-Stammdaten aus der OGD-Regionen-CSV.
 * Ergebnis ist eine deterministische Fixture aus echten Werten, gegen die
 * die Scoring-Tests laufen (kein Netzwerk im Test).
 *
 * Verfügbare MVP-Indikatoren mit echten Daten:
 *   kaufpreis, preisentwicklung (immo)  +  alterung, pendlersaldo (AEST)
 */
import * as fs from "fs";
import * as path from "path";
import { readCsv } from "@/lib/ingest/csv-parser";
import {
  registerNameMapping,
  BUNDESLAND_MAP,
} from "@/lib/ingest/gkz3-mapper";
import { setKnownGkz3 } from "@/lib/ingest/validator";
import { loadImmo } from "@/scripts/ingest/loader-immo";
import { loadPendler } from "@/scripts/ingest/loader-pendler";
import type { DistrictMeta } from "@/lib/scoring";
import type { IndicatorKey } from "@/types/indicators";

/** Slice-Wert mit Herkunft/Datenstand (Superset von scoring.IndicatorValue). */
interface SliceValue {
  gkz3: string;
  indicator: IndicatorKey;
  value: number;
  jahr: number;
  quelle: string;
  datenstand: string | null;
}

const REGIONS_CSV = path.resolve(".cache/OGD_f0743_REGIONS.csv");

function buildDistrictMeta(): DistrictMeta[] {
  const rows = readCsv(REGIONS_CSV);
  const out: DistrictMeta[] = [];
  for (const row of rows) {
    const code = row["code"]?.trim();
    if (!code?.startsWith("GRBEZ17-")) continue;
    const gkz3 = code.replace("GRBEZ17-", "");
    if (gkz3 === "0") continue;
    const blNr = (row["FK"]?.trim() ?? "").replace("GRBDL-", "");
    const bundesland = BUNDESLAND_MAP[blNr];
    if (!bundesland) continue;
    const name = (row["name"] ?? "").replace(/<[^>]+>/g, "").trim();
    registerNameMapping(name, gkz3); // für loader-immo Name→GKZ3
    out.push({ gkz3, name, bundesland, wien_flag: gkz3 === "900" });
  }
  return out;
}

async function main() {
  const districts = buildDistrictMeta();
  setKnownGkz3(districts.map((d) => d.gkz3));
  console.log(`[slice] ${districts.length} Bezirke Stammdaten`);

  // Echte Loader im dry-run → IndicatorRow[]
  const rows = [...(await loadImmo(true)), ...(await loadPendler(true))];

  // Auf gültige MVP-Indikatoren + Nicht-Null filtern, in IndicatorValue mappen
  const values: SliceValue[] = rows
    .filter((r) => r.value !== null && !Number.isNaN(r.value))
    .map((r) => ({
      gkz3: r.gkz3,
      indicator: r.indicator as IndicatorKey,
      value: r.value as number,
      jahr: r.jahr,
      quelle: r.quelle,
      datenstand: r.datenstand,
    }));

  const fixture = {
    _comment:
      "ECHTE MVP-Daten (Statistik Austria, CC BY 4.0) – generiert via scripts/build-slice.ts aus .cache/. Nicht manuell editieren.",
    generatedAt: process.env.SLICE_DATE ?? "2026-06-16",
    districts,
    values,
  };

  const outDir = path.resolve("data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "mvp_slice.json");
  fs.writeFileSync(outPath, JSON.stringify(fixture, null, 2), "utf-8");

  // Kurze Zusammenfassung
  const byInd = new Map<string, number>();
  for (const v of values) byInd.set(v.indicator, (byInd.get(v.indicator) ?? 0) + 1);
  console.log(`[slice] ${values.length} Werte geschrieben → ${outPath}`);
  console.log("[slice] Werte je Indikator:", Object.fromEntries(byInd));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
