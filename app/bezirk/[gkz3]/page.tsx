import Link from "next/link";
import { notFound } from "next/navigation";
import { getDistricts, getScore, getMeta } from "@/lib/data";
import { ClusterBreakdown } from "@/components/ClusterBreakdown";
import { AmpelBadge } from "@/components/AmpelBadge";
import type { Metadata } from "next";

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
  return { title: meta ? `${meta.name} (${meta.bundesland})` : "Bezirk" };
}

export default async function BezirkPage({
  params,
}: {
  params: Promise<{ gkz3: string }>;
}) {
  const { gkz3 } = await params;
  const meta = getMeta(gkz3);
  const score = getScore(gkz3);
  if (!meta || !score) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-stone-500 hover:text-navy">← Zur Karte</Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            {meta.bundesland} · GKZ3 {meta.gkz3}
          </p>
          <h1 className="font-serif text-3xl font-extrabold text-navy sm:text-4xl">
            {meta.name}
          </h1>
        </div>
        <AmpelBadge ampel={score.ampel} score={score.overall} size="lg" />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href={`/bezirk/${gkz3}/report`}
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          PDF-Report
        </Link>
        <Link
          href="/vergleich"
          className="rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100"
        >
          Mit anderen vergleichen
        </Link>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-stone-600">
        Gesamt-Ampel = gewichtetes Mittel der vorhandenen Cluster (Investment 40 %,
        Lebensqualität 35 %, Zukunftsfestigkeit 25 %). Jeder Indikator ist min-max
        gegen die anderen Bezirke des Bundeslandes <strong>{meta.bundesland}</strong> normalisiert.
      </p>

      <div className="mt-6">
        <ClusterBreakdown score={score} />
      </div>
    </div>
  );
}
