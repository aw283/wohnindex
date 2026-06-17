import type { Ampel } from "@/lib/scoring";
import { ampelFor } from "@/lib/scoring";
import { ampelHex } from "@/lib/ampel";

/** Horizontaler Score-Balken 0–100, Farbe nach Ampel-Schwelle. */
export function ScoreBar({
  score,
  ampel,
  showValue = true,
}: {
  score: number | null;
  ampel?: Ampel | null;
  showValue?: boolean;
}) {
  const a = ampel ?? ampelFor(score);
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: ampelHex(a) }}
        />
      </div>
      {showValue && (
        <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-stone-700">
          {score === null ? "—" : score.toFixed(0)}
        </span>
      )}
    </div>
  );
}
