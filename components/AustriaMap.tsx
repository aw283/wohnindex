import { getDistrictShapes, VIEWBOX } from "@/lib/geo";
import { getScore } from "@/lib/data";
import { ampelHex, AMPEL_NO_DATA_HEX } from "@/lib/ampel";

/**
 * Statischer SVG-Choropleth Österreichs (serverseitig gerendert, kein Client-JS).
 * Jeder Bezirk ist nach seiner Gesamt-Ampel eingefärbt und verlinkt auf die Detailseite.
 */
export function AustriaMap() {
  const shapes = getDistrictShapes();
  return (
    <div className="w-full">
      <svg
        viewBox={VIEWBOX.str}
        className="h-auto w-full"
        role="img"
        aria-label="Ampel-Karte der österreichischen Bezirke"
        style={{ maxHeight: "70vh" }}
      >
        <g className="[&_a:hover_path]:stroke-navy">
          {shapes.map((s) => {
            const score = getScore(s.gkz3);
            const fill = score ? ampelHex(score.ampel) : AMPEL_NO_DATA_HEX;
            const label =
              score?.overall != null
                ? `${s.name} – Score ${score.overall.toFixed(0)}`
                : `${s.name} – keine Daten`;
            return (
              <a key={s.gkz3} href={`/bezirk/${s.gkz3}`}>
                <title>{label}</title>
                <path
                  d={s.path}
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth={300}
                  className="cursor-pointer transition-[fill] hover:opacity-80"
                />
              </a>
            );
          })}
        </g>
      </svg>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-stone-500">
        <Legend hex={ampelHex("gruen")} label="Grün ≥ 66" />
        <Legend hex={ampelHex("gelb")} label="Gelb 33–65" />
        <Legend hex={ampelHex("rot")} label="Rot < 33" />
        <Legend hex={AMPEL_NO_DATA_HEX} label="Keine Daten" />
      </div>
    </div>
  );
}

function Legend({ hex, label }: { hex: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="ampel-dot" style={{ background: hex }} />
      {label}
    </span>
  );
}
