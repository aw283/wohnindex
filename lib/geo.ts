/**
 * Wandelt die Bezirksgeometrie (data/bezirke.json, EPSG:31287) in SVG-Pfade.
 * Lambert-Meter werden direkt als SVG-Koordinaten genutzt (Y gespiegelt) —
 * für einen nationalen Überblick exakt genug, ohne Reprojektion/Karten-Lib.
 */
import geoJson from "@/data/bezirke.json";

type Pos = [number, number];
interface Geometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: Pos[][] | Pos[][][];
}
interface Feature {
  properties: { gkz3: string; name: string };
  geometry: Geometry;
}
interface FC {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  features: Feature[];
}

const fc = geoJson as unknown as FC;
const { minX, minY, maxX, maxY } = fc.bounds;

export const VIEWBOX = {
  width: maxX - minX,
  height: maxY - minY,
  str: `0 0 ${maxX - minX} ${maxY - minY}`,
};

function ringToPath(ring: Pos[]): string {
  return (
    ring
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x - minX} ${maxY - y}`)
      .join("") + "Z"
  );
}

function geomToPath(g: Geometry): string {
  if (g.type === "Polygon") {
    return (g.coordinates as Pos[][]).map(ringToPath).join("");
  }
  return (g.coordinates as Pos[][][])
    .flatMap((poly) => poly.map(ringToPath))
    .join("");
}

export interface DistrictShape {
  gkz3: string;
  name: string;
  path: string;
}

/** Ein SVG-Pfad je Bezirk (mehrere Features desselben gkz3 werden zusammengefasst). */
export function getDistrictShapes(): DistrictShape[] {
  const byGkz3 = new Map<string, { name: string; path: string }>();
  for (const f of fc.features) {
    const { gkz3, name } = f.properties;
    const path = geomToPath(f.geometry);
    const prev = byGkz3.get(gkz3);
    if (prev) prev.path += path;
    else byGkz3.set(gkz3, { name, path });
  }
  return [...byGkz3.entries()].map(([gkz3, v]) => ({ gkz3, ...v }));
}
