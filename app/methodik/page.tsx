import { INDICATORS, CLUSTERS, type Cluster } from "@/types/indicators";
import { CLUSTER_WEIGHTS, AMPEL_THRESHOLDS, TIER_DISCOUNT } from "@/config/weights";
import { getDataVintage } from "@/lib/data";
import { CLUSTER_LABEL } from "@/components/ClusterBreakdown";

export const metadata = { title: "Methodik & Quellen" };

const PHASE_LABEL: Record<string, string> = {
  mvp: "MVP",
  phase2: "Phase 2",
  phase3: "Phase 3",
};

export default function MethodikPage() {
  const vintage = getDataVintage();
  const vintageByKey = new Map(vintage.map((v) => [v.key, v]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-extrabold text-navy">Methodik &amp; Quellen</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-stone-600">
        Immoampel ist transparent: jeder Indikator, jede Gewichtung, jede Quelle
        ist offengelegt. Alle Daten stammen aus öffentlichen Primärquellen (CC&nbsp;BY&nbsp;4.0).
      </p>

      {/* Berechnung */}
      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-xl font-bold text-navy">So entsteht der Score</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
          <li>Indikatoren werden <strong>je Bundesland-Kohorte</strong> min-max auf 0–100 normalisiert (Wien als eigene Kohorte).</li>
          <li>„Niedriger&nbsp;=&nbsp;besser"-Indikatoren (z.&nbsp;B. Kaufpreis, Alterung) werden invertiert; Ausreißer bei ±2&nbsp;Standardabweichungen winsorisiert.</li>
          <li>Datenqualitäts-Discount: Tier&nbsp;3&nbsp;×&nbsp;{TIER_DISCOUNT[3]}, Tier&nbsp;4&nbsp;×&nbsp;{TIER_DISCOUNT[4]}.</li>
          <li>Cluster-Score = gewichtetes Mittel der <em>vorhandenen</em> Indikatoren; Gesamt = gewichtetes Mittel der vorhandenen Cluster.</li>
          <li>
            Ampel: <span className="font-semibold text-[#15803d]">grün ≥ {AMPEL_THRESHOLDS.gruen}</span>,{" "}
            <span className="font-semibold text-[#b45309]">gelb {AMPEL_THRESHOLDS.rot}–{AMPEL_THRESHOLDS.gruen - 1}</span>,{" "}
            <span className="font-semibold text-[#b91c1c]">rot &lt; {AMPEL_THRESHOLDS.rot}</span>.
          </li>
        </ol>
      </section>

      {/* Cluster-Gewichte */}
      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-xl font-bold text-navy">Cluster-Gewichte</h2>
        <div className="mt-3 flex flex-wrap gap-4">
          {CLUSTERS.map((c) => (
            <div key={c} className="rounded-xl bg-stone-50 px-5 py-3">
              <div className="font-serif text-2xl font-extrabold text-navy">
                {(CLUSTER_WEIGHTS[c] * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-stone-500">{CLUSTER_LABEL[c]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Indikatoren je Cluster */}
      {CLUSTERS.map((cluster) => (
        <section key={cluster} className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="font-serif text-xl font-bold text-navy">
            {CLUSTER_LABEL[cluster as Cluster]}
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
                  <th className="py-2 pr-3">Indikator</th>
                  <th className="px-3 py-2">Richtung</th>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">Phase</th>
                  <th className="px-3 py-2">Quelle / Datenstand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {INDICATORS.filter((i) => i.cluster === cluster).map((i) => {
                  const v = vintageByKey.get(i.key);
                  return (
                    <tr key={i.key} className={v?.hasData ? "" : "text-stone-400"}>
                      <td className="py-2.5 pr-3 font-medium text-stone-800">
                        {i.label}
                        {!v?.hasData && <span className="ml-1 text-xs">(geplant)</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {i.direction === "lower_better" ? "niedriger = besser" : "höher = besser"}
                      </td>
                      <td className="px-3 py-2.5">{i.tier}</td>
                      <td className="px-3 py-2.5">{PHASE_LABEL[i.phase]}</td>
                      <td className="px-3 py-2.5 text-xs text-stone-500">
                        {i.source}
                        {v?.latestDatenstand && ` · Stand ${v.latestDatenstand}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="mt-6 text-xs leading-relaxed text-stone-400">
        Hinweis: Der Pendlersaldo ist im MVP approximiert (Einpendler-Proxy). Keine
        Gewähr für Richtigkeit; keine Anlageberatung. powered by Immoampel.
      </p>
    </div>
  );
}
