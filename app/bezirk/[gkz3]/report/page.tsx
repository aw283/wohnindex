import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDistricts, getScore, getMeta, getDatum, getGeneratedAt } from "@/lib/data";
import { INDICATORS, type IndicatorKey } from "@/types/indicators";
import { ClusterBreakdown } from "@/components/ClusterBreakdown";
import { AmpelBadge } from "@/components/AmpelBadge";
import { AmpelLogo } from "@/components/AmpelLogo";
import { PrintButton } from "@/components/PrintButton";

export function generateStaticParams() {
  return getDistricts().map((d) => ({ gkz3: d.gkz3 }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gkz3: string }>;
}): Promise<Metadata> {
  const { gkz3 } = await params;
  const meta = getMeta(gkz3);
  return { title: meta ? `Report ${meta.name}` : "Report" };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ gkz3: string }>;
}) {
  const { gkz3 } = await params;
  const meta = getMeta(gkz3);
  const score = getScore(gkz3);
  if (!meta || !score) notFound();

  // Genutzte Quellen (nur Indikatoren mit Daten für diesen Bezirk)
  const usedSources = new Map<string, string>();
  for (const def of INDICATORS) {
    const d = getDatum(gkz3, def.key as IndicatorKey);
    if (d) usedSources.set(d.quelle, d.datenstand ?? "—");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <AmpelLogo />
        <PrintButton />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Standort-Report · {meta.bundesland} · GKZ3 {meta.gkz3}
            </p>
            <h1 className="font-serif text-3xl font-extrabold text-navy">{meta.name}</h1>
          </div>
          <AmpelBadge ampel={score.ampel} score={score.overall} size="lg" />
        </header>

        <p className="mt-5 text-sm leading-relaxed text-stone-600">
          Der Immoampel-Score ist ein gewichtetes Mittel der vorhandenen Cluster
          (Investment&nbsp;40&nbsp;%, Lebensqualität&nbsp;35&nbsp;%, Zukunftsfestigkeit&nbsp;25&nbsp;%).
          Jeder Indikator ist 0–100 min-max gegen die übrigen Bezirke des
          Bundeslandes {meta.bundesland} normalisiert; Ampel: grün ≥ 66, gelb 33–65, rot &lt; 33.
        </p>

        <div className="mt-6">
          <ClusterBreakdown score={score} />
        </div>

        <section className="print-break mt-8 border-t border-stone-200 pt-5">
          <h2 className="mb-3 font-serif text-lg font-bold text-navy">Quellen &amp; Datenstand</h2>
          <ul className="space-y-1 text-xs text-stone-500">
            {[...usedSources.entries()].map(([q, d]) => (
              <li key={q}>• {q} — Datenstand {d}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-stone-400">
            Alle Quellen CC&nbsp;BY&nbsp;4.0. Report-Build: {getGeneratedAt()}.
          </p>
        </section>

        <footer className="mt-8 flex items-center justify-between border-t border-stone-200 pt-5">
          <span className="text-sm font-bold text-navy">powered by Immoampel</span>
          <span className="text-xs text-stone-400">immoampel.at</span>
        </footer>
      </div>
    </div>
  );
}
