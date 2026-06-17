import type { Ampel } from "@/lib/scoring";
import { AMPEL_CLASSES, AMPEL_HEX, AMPEL_LABEL } from "@/lib/ampel";

export function AmpelBadge({
  ampel,
  score,
  size = "md",
}: {
  ampel: Ampel | null;
  score: number | null;
  size?: "sm" | "md" | "lg";
}) {
  const pad = size === "lg" ? "px-4 py-2 text-base" : size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  if (!ampel || score === null) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-full bg-stone-100 font-bold text-stone-500 ${pad}`}>
        <span className="ampel-dot" style={{ background: "#a8a29e" }} />
        Keine Daten
      </span>
    );
  }
  const c = AMPEL_CLASSES[ampel];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full font-bold ${c.bg} ${c.text} ${pad}`}>
      <span className="ampel-dot" style={{ background: AMPEL_HEX[ampel] }} />
      {score.toFixed(0)} · {AMPEL_LABEL[ampel]}
    </span>
  );
}
