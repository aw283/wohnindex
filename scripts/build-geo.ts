/**
 * Baut data/bezirke.geojson aus dem ECHTEN Statistik-Austria-Bezirks-Shapefile.
 *
 * Quelle (CC BY 4.0): STATISTIK_AUSTRIA_POLBEZ WFS SHAPE-ZIP (EPSG:31287, MGI Lambert).
 * Koordinaten bleiben in 31287 (projizierte Meter) — für einen nationalen
 * SVG-Choropleth ist das direkt verwendbar (kein Reprojektion nötig).
 *
 * Vereinfachung: Koordinaten auf 250 m runden + aufeinanderfolgende Duplikate
 * entfernen → kleine Dateigröße bei erhaltener nationaler Form.
 */
import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import { downloadFile } from "@/lib/ingest/download-helper";

// shpjs v6 referenziert beim Laden das Browser-Global `self` → in Node polyfillen.
(globalThis as unknown as { self?: unknown }).self ??= globalThis;

const WFS_URL =
  "https://www.statistik.gv.at/gs-open/GEODATA/ows?service=WFS&version=1.0.0&request=GetFeature" +
  "&typeName=GEODATA:STATISTIK_AUSTRIA_POLBEZ_20260101&outputFormat=SHAPE-ZIP" +
  "&format_options=CHARSET:UTF-8";

const CACHE_DIR = path.resolve(".cache");
const EXTRACT_DIR = path.join(CACHE_DIR, "polbez_shp");
const GRID = 500; // m Rundung (nationaler Überblick; klein genug fürs SVG)

type Pos = [number, number];
const round = (n: number) => Math.round(n / GRID) * GRID;

function simplifyRing(ring: Pos[]): Pos[] {
  const out: Pos[] = [];
  for (const [x, y] of ring) {
    const p: Pos = [round(x), round(y)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  // Ring schließen
  if (out.length >= 3) {
    const f = out[0];
    const l = out[out.length - 1];
    if (f[0] !== l[0] || f[1] !== l[1]) out.push([f[0], f[1]]);
  }
  return out;
}

function simplifyGeometry(geom: { type: string; coordinates: unknown }): {
  type: string;
  coordinates: unknown;
} | null {
  if (geom.type === "Polygon") {
    const rings = (geom.coordinates as Pos[][])
      .map(simplifyRing)
      .filter((r) => r.length >= 4);
    return rings.length ? { type: "Polygon", coordinates: rings } : null;
  }
  if (geom.type === "MultiPolygon") {
    const polys = (geom.coordinates as Pos[][][])
      .map((poly) => poly.map(simplifyRing).filter((r) => r.length >= 4))
      .filter((poly) => poly.length > 0);
    return polys.length ? { type: "MultiPolygon", coordinates: polys } : null;
  }
  return null;
}

async function main() {
  const { localPath: zipPath } = await downloadFile(WFS_URL, "POLBEZ_20260101.zip");
  if (!fs.existsSync(EXTRACT_DIR)) fs.mkdirSync(EXTRACT_DIR, { recursive: true });
  new AdmZip(zipPath).extractAllTo(EXTRACT_DIR, true);

  const shpFile = fs.readdirSync(EXTRACT_DIR).find((e) => e.endsWith(".shp"));
  if (!shpFile) throw new Error("Keine .shp im ZIP");
  const shpPath = path.join(EXTRACT_DIR, shpFile);

  interface GeoFeature {
    properties: Record<string, unknown>;
    geometry: { type: string; coordinates: unknown };
  }
  const s = (await import("shpjs")) as unknown as {
    combine: (p: [unknown, unknown]) => { features: GeoFeature[] };
    parseShp: (b: Buffer) => unknown;
    parseDbf: (b: Buffer) => unknown;
  };
  const geoms = await Promise.resolve(s.parseShp(fs.readFileSync(shpPath)));
  const attrs = await Promise.resolve(
    s.parseDbf(fs.readFileSync(shpPath.replace(".shp", ".dbf")))
  );
  const geo = s.combine([geoms, attrs]);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const features = [];
  for (const f of geo.features) {
    const props = f.properties ?? {};
    let gkz3 = String(props["g_id"] ?? props["ID"] ?? props["id"] ?? "")
      .trim()
      .replace(/^0+/, "");
    if (gkz3.length > 3) gkz3 = gkz3.slice(0, 3);
    if (!gkz3) continue;
    // Wien-Gemeindebezirke (901–923) zu einer Einheit "900" zusammenfassen.
    if (gkz3[0] === "9") gkz3 = "900";
    const name =
      gkz3 === "900"
        ? "Wien"
        : String(props["g_name"] ?? props["NAME"] ?? props["name"] ?? "").trim();
    const geom = simplifyGeometry(f.geometry);
    if (!geom) continue;

    // Bounds aktualisieren
    const visit = (c: Pos) => {
      if (c[0] < minX) minX = c[0];
      if (c[0] > maxX) maxX = c[0];
      if (c[1] < minY) minY = c[1];
      if (c[1] > maxY) maxY = c[1];
    };
    const walk = (a: unknown): void => {
      if (Array.isArray(a) && typeof a[0] === "number") visit(a as Pos);
      else if (Array.isArray(a)) a.forEach(walk);
    };
    walk(geom.coordinates);

    features.push({ type: "Feature", properties: { gkz3, name }, geometry: geom });
  }

  const out = {
    type: "FeatureCollection",
    crs: "EPSG:31287",
    bounds: { minX, minY, maxX, maxY },
    features,
  };
  const outPath = path.resolve("data/bezirke.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out), "utf-8");

  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`[geo] ${features.length} Bezirke → ${outPath} (${kb} KB)`);
  console.log(`[geo] bounds 31287: x[${minX}..${maxX}] y[${minY}..${maxY}]`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
