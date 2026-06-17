/**
 * Loader: Bezirksgrenzen (WFS SHAPE-ZIP, Statistik Austria, CC BY 4.0)
 *
 * Quelle:
 *   https://www.statistik.gv.at/gs-open/GEODATA/ows?service=WFS&version=1.0.0&request=GetFeature
 *   &typeName=GEODATA:STATISTIK_AUSTRIA_POLBEZ_20260101&outputFormat=SHAPE-ZIP
 *   &format_options=CHARSET:UTF-8
 *   -> Redirect auf www.statistik.at -> 200; mit HTTP-Redirect-Follow.
 *
 * Format: ZIP enthält .shp/.dbf/.prj/.shx (EPSG:31287 = MGI Austria Lambert)
 * Attribute (aus WFS-Beschreibung): ID=gkz3, NAME=Bezirksname
 *
 * Strategie (gem. Aufgabenstellung):
 *   - Entpacken mit adm-zip
 *   - .shp/.dbf via shpjs lesen
 *   - Geometrie als GeoJSON in staging_geometrie ablegen (optional)
 *   - Attribute ID (gkz3) + NAME verwenden; Geometrie-Spalte in districts nur wenn unkompliziert
 *   -> Im MVP: Nur Attribut-Matching (ID->gkz3, NAME->districts.name-Validierung)
 *      GeoJSON-Geometry wird in staging_geometrie.geojson gespeichert (als String, unkomprimiert)
 *      für spätere Phase-2-Spatial-Joins.
 *
 * Annahme: ID-Attribut im Shapefile ist die 3-stellige GKZ (politischer Bezirk).
 *   Falls ID 4+ Stellen hat: auf 3 truncieren.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import shpjs from "shpjs";
import { downloadFile } from "@/lib/ingest/download-helper";
import { getAdminClient } from "@/lib/ingest/supabase-admin";

const WFS_URL =
  "https://www.statistik.gv.at/gs-open/GEODATA/ows?service=WFS&version=1.0.0&request=GetFeature" +
  "&typeName=GEODATA:STATISTIK_AUSTRIA_POLBEZ_20260101&outputFormat=SHAPE-ZIP" +
  "&format_options=CHARSET:UTF-8";

const CACHE_DIR = path.resolve(process.cwd(), ".cache");
const ZIP_ALIAS = "POLBEZ_20260101.zip";
const EXTRACT_DIR = path.join(CACHE_DIR, "polbez_shp");

export async function loadGeometrie(dryRun = false): Promise<void> {
  console.log("\n[geometrie] Starte Geometrie-Loader (WFS SHAPE-ZIP)");

  // 1. ZIP herunterladen
  const { localPath: zipPath } = await downloadFile(WFS_URL, ZIP_ALIAS);

  // 2. Entpacken
  if (!fs.existsSync(EXTRACT_DIR)) {
    fs.mkdirSync(EXTRACT_DIR, { recursive: true });
  }
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(EXTRACT_DIR, true);
  const entries = fs.readdirSync(EXTRACT_DIR);
  console.log(`[geometrie] Entpackt: ${entries.join(", ")}`);

  // 3. SHP-Datei finden
  const shpFile = entries.find((e) => e.endsWith(".shp"));
  if (!shpFile) {
    throw new Error("[geometrie] Keine .shp-Datei im ZIP gefunden");
  }
  const shpPath = path.join(EXTRACT_DIR, shpFile);

  // 4. Shapefile lesen (shpjs erwartet Buffer)
  const shpBuffer = fs.readFileSync(shpPath);
  const dbfPath = shpPath.replace(".shp", ".dbf");
  const dbfBuffer = fs.existsSync(dbfPath) ? fs.readFileSync(dbfPath) : undefined;

  // shpjs.combine liest .shp + .dbf zusammen
  const geojson = await (shpjs as unknown as {
    combine: (parts: [unknown, unknown]) => { type: string; features: unknown[] };
    parseShp: (buf: Buffer) => unknown;
    parseDbf: (buf: Buffer) => unknown;
  }).combine([
    (shpjs as unknown as { parseShp: (b: Buffer) => unknown }).parseShp(shpBuffer),
    dbfBuffer
      ? (shpjs as unknown as { parseDbf: (b: Buffer) => unknown }).parseDbf(dbfBuffer)
      : [],
  ]);

  const features = geojson.features ?? [];
  console.log(`[geometrie] ${features.length} Features gelesen`);

  // 5. Attribute extrahieren
  interface Feature {
    properties: Record<string, unknown>;
    geometry: unknown;
  }

  const stagingRows: {
    gkz_raw: string;
    name_raw: string;
    geojson: string | null;
  }[] = [];

  for (const feat of features as Feature[]) {
    const props = feat.properties ?? {};
    // Attributname-Varianten: ID, id, PB, BKZ etc.
    const rawId =
      props["ID"] ?? props["id"] ?? props["PB"] ?? props["BKZ"] ?? props["GKZ"] ?? "";
    const rawName = String(props["NAME"] ?? props["name"] ?? props["BEZ"] ?? "").trim();

    let gkz3 = String(rawId).trim().replace(/^0+/, "");
    if (gkz3.length > 3) gkz3 = gkz3.slice(0, 3);
    if (!gkz3) continue;

    stagingRows.push({
      gkz_raw: gkz3,
      name_raw: rawName,
      geojson: feat.geometry ? JSON.stringify(feat.geometry) : null,
    });
  }

  console.log(`[geometrie] ${stagingRows.length} Bezirke extrahiert`);
  console.log("[geometrie] Erste 3:", stagingRows.slice(0, 3).map(r => `${r.gkz_raw} ${r.name_raw}`));

  if (dryRun) {
    console.log("[geometrie] DRY-RUN – kein DB-Write");
    return;
  }

  const sb = getAdminClient();

  // Staging TRUNCATE + INSERT
  await sb.from("staging_geometrie").delete().neq("gkz_raw", "###never###");
  for (let i = 0; i < stagingRows.length; i += 100) {
    await sb.from("staging_geometrie").insert(stagingRows.slice(i, i + 100));
  }

  console.log(`[geometrie] ${stagingRows.length} Zeilen in staging_geometrie`);
  console.log("[geometrie] Hinweis: GeoJSON-Geometrien in staging_geometrie.geojson gespeichert.");
  console.log("[geometrie] Für Phase 2 Spatial Joins: SRID 31287 -> WGS84 reprojizieren.");
}

if (process.argv[1]?.endsWith("loader-geometrie.ts")) {
  loadGeometrie(false).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
