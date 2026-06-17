/**
 * Loader: Districts-Seed (idempotent UPSERT).
 *
 * Liest OGD_f0743_VZ_HIS_GEM_2_C-GRGEM17-0.csv und befüllt public.districts.
 * Wien als 1 Einheit (gkz3='900', wien_flag=true).
 * Validierung: Anzahl == 94.
 *
 * Datei wird aus .cache/ genutzt falls vorhanden (kein Re-Download nötig).
 */
import "dotenv/config";
import { downloadFile } from "@/lib/ingest/download-helper";
import { readCsv } from "@/lib/ingest/csv-parser";
import { registerNameMapping, BUNDESLAND_MAP } from "@/lib/ingest/gkz3-mapper";
import { getAdminClient } from "@/lib/ingest/supabase-admin";
import { setKnownGkz3 } from "@/lib/ingest/validator";

const REGIONS_URL =
  "https://data.statistik.gv.at/data/OGD_f0743_VZ_HIS_GEM_2_C-GRGEM17-0.csv";

interface DistrictRow {
  gkz3: string;
  name: string;
  bundesland: string;
  wien_flag: boolean;
}

export async function loadDistricts(dryRun = false): Promise<string[]> {
  const { localPath } = await downloadFile(
    REGIONS_URL,
    "OGD_f0743_REGIONS.csv"
  );

  const rows = readCsv(localPath);
  const districts: DistrictRow[] = [];

  for (const row of rows) {
    const code = row["code"]?.trim();
    if (!code?.startsWith("GRBEZ17-")) continue;

    const rawGkz3 = code.replace("GRBEZ17-", "");
    // Exclude "Nicht klassifizierbar" (gkz3=0)
    if (rawGkz3 === "0") continue;

    const fk = row["FK"]?.trim() ?? "";
    const blNr = fk.replace("GRBDL-", "");
    const bundesland = BUNDESLAND_MAP[blNr];
    if (!bundesland) {
      console.warn(`[districts] Unbekanntes Bundesland FK="${fk}" für gkz3=${rawGkz3}`);
      continue;
    }

    // Name: Klammer-Zusatz <101> entfernen, Rest behalten
    const name = (row["name"] ?? "").replace(/<[^>]+>/g, "").trim();

    districts.push({
      gkz3: rawGkz3,
      name,
      bundesland,
      wien_flag: rawGkz3 === "900",
    });

    // Name-Mapping für spätere Loader registrieren
    registerNameMapping(name, rawGkz3);
  }

  if (districts.length !== 94) {
    throw new Error(
      `Bezirksanzahl ${districts.length} != 94 erwartet (loader-districts)`
    );
  }

  console.log(`[districts] ${districts.length} Bezirke gelesen`);

  // Bekannte GKZ3 für Validator registrieren
  const gkz3List = districts.map((d) => d.gkz3);
  setKnownGkz3(gkz3List);

  if (dryRun) {
    console.log("[districts] DRY-RUN – kein DB-Write");
    console.log("[districts] Erste 5:", districts.slice(0, 5));
    return gkz3List;
  }

  const sb = getAdminClient();

  // Staging: TRUNCATE + INSERT (staging_geometrie nutzt auch Bezirksnamen)
  await sb.from("staging_geometrie").delete().neq("gkz_raw", "###never###");

  const { error } = await sb.from("districts").upsert(
    districts.map((d) => ({
      gkz3: d.gkz3,
      name: d.name,
      bundesland: d.bundesland,
      urban_rural: null,
      wien_flag: d.wien_flag,
    })),
    { onConflict: "gkz3" }
  );

  if (error) throw new Error(`[districts] Supabase-Fehler: ${error.message}`);
  console.log(`[districts] ${districts.length} Bezirke upserted`);

  return gkz3List;
}

// Direktaufruf
if (process.argv[1]?.endsWith("loader-districts.ts")) {
  loadDistricts(false).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
