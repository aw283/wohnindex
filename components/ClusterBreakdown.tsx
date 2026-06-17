import { CLUSTERS, INDICATORS, type Cluster, type IndicatorKey } from "@/types/indicators";
import type { DistrictScore } from "@/lib/scoring";
import { getDatum } from "@/lib/data";
import { ScoreBar } from "@/components/ScoreBar";
import { AmpelBadge } from "@/components/AmpelBadge";
import { ampelFor } from "@/lib/scoring";

export const CLUSTER_LABEL: Record<Cluster, string> = {
  investment: "Investment",
  lebensqualitaet: "Lebensqualität",
  zukunftsfestigkeit: "Zukunftsfestigkeit",
};

const DEF = new Map(INDICATORS.map((i) => [i.key as IndicatorKey, i]));

function fmt(v: number, unit: string): string {
  const n = Math.abs(v) >= 1000 ? v.toLocaleString("de-AT") : String(v);
  return unit === "%" ? `${n} %` : `${n} ${unit}`;
}

export function ClusterBreakdown({ score }: { score: DistrictScore }) {
  return (
    <div className="space-y-4">
      {CLUSTERS.map((cluster) => {
        const c = score.clusters[cluster];
        return (
          <section
            key={cluster}
            className="print-break rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-serif text-xl font-bold text-navy">
                {CLUSTER_LABEL[cluster]}
              </h3>
              <AmpelBadge ampel={ampelFor(c.score)} score={c.score} size="sm" />
            </div>

            {c.score !== null ? (
              <div className="mb-4">
                <ScoreBar score={c.score} ampel={ampelFor(c.score)} />
                {c.insufficient && (
                  <p className="mt-1 text-xs text-amber-700">
                    ⚠ Daten unzureichend ({c.present.length}/
                    {c.present.length + c.missing.length} Indikatoren) – Score nur
                    aus vorhandenen Indikatoren.
                  </p>
                )}
              </div>
            ) : (
              <p className="mb-4 text-sm text-stone-500">
                Keine Daten in diesem Cluster (MVP).
              </p>
            )}

            <ul className="divide-y divide-stone-100">
              {c.present.map((key) => {
                const def = DEF.get(key)!;
                const ind = score.indicatorScores[key]!;
                const datum = getDatum(score.gkz3, key);
                return (
                  <li key={key} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                    <span className="min-w-[10rem] flex-1 font-medium text-stone-800">
                      {def.label}
                    </span>
                    <span className="tabular-nums text-stone-600">
                      {datum ? fmt(datum.value, def.unit) : "—"}
                    </span>
                    <span className="w-32">
                      <ScoreBar score={ind.normalized} ampel={ampelFor(ind.normalized)} showValue />
                    </span>
                    <span className="w-full text-xs text-stone-400 sm:w-auto">
                      Datenstand {datum?.datenstand ?? `${datum?.jahr ?? "?"}`}
                      {ind.winsorised && " · winsorisiert"}
                      {ind.neutralFallback && " · neutral (Kohorte=1)"}
                    </span>
                  </li>
                );
              })}
            </ul>

            {c.missing.length > 0 && (
              <p className="mt-3 text-xs text-stone-400">
                Noch ohne Daten: {c.missing.map((k) => DEF.get(k)?.label ?? k).join(", ")}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
