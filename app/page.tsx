import Link from "next/link";
import { getAllScores } from "@/lib/data";
import type { DistrictScore } from "@/lib/scoring";
import { AustriaMap } from "@/components/AustriaMap";
import { DistrictSearch, type DistrictListItem } from "@/components/DistrictSearch";
import { AmpelBadge } from "@/components/AmpelBadge";

export default function HomePage() {
  const scored = getAllScores();
  const items: DistrictListItem[] = scored.map((s) => ({
    gkz3: s.gkz3,
    name: s.name,
    bundesland: s.cohort,
    overall: s.overall,
    ampel: s.ampel,
  }));
  const withData = scored.filter((s) => s.overall !== null);
  const top = withData.slice(0, 5);
  const bottom = withData.slice(-5).reverse();

  return (
    <div>
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">
            94 Bezirke · 3 Cluster · Ampel-Logik
          </div>
          <h1 className="max-w-3xl font-serif text-4xl font-extrabold leading-tight sm:text-5xl">
            Wie gut ist ein Standort wirklich?
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/70">
            Immoampel bewertet jeden politischen Bezirk Österreichs nach
            Investment, Lebensqualität und Zukunftsfestigkeit – normalisiert je
            Bundesland, transparent aus öffentlichen Primärquellen.
          </p>
          <div className="mt-8 max-w-xl">
            <DistrictSearch districts={items} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="mb-2 font-serif text-2xl font-bold text-navy">Ampel-Karte Österreich</h2>
        <p className="mb-6 max-w-2xl text-sm text-stone-500">
          <strong className="text-stone-700">Je höher der Score (0–100), desto attraktiver der Standort gesamt</strong> –
          gewichtet aus Investment, Lebensqualität und Zukunftsfestigkeit.
          <span className="text-[#15803d]"> Grün = stark</span>,
          <span className="text-[#b45309]"> gelb = mittel</span>,
          <span className="text-[#b91c1c]"> rot = schwach</span>.
          Klicke einen Bezirk für den Detail-Breakdown; graue Flächen haben im MVP noch keine Daten.
        </p>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
          <AustriaMap />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <RankCard title="Stärkste Standorte" list={top} />
          <RankCard title="Schwächste Standorte" list={bottom} />
        </div>
        <p className="mt-4 text-xs text-stone-400">
          Hinweis: Im MVP basiert der Score auf den verfügbaren Indikatoren
          (Kaufpreis, Preisentwicklung, Pendlersaldo, Alterung). Weitere folgen in Phase&nbsp;2.
        </p>
      </section>
    </div>
  );
}

function RankCard({ title, list }: { title: string; list: DistrictScore[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <h3 className="mb-4 font-serif text-lg font-bold text-navy">{title}</h3>
      <ul className="space-y-2">
        {list.map((s) => (
          <li key={s.gkz3}>
            <Link
              href={`/bezirk/${s.gkz3}`}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-stone-50"
            >
              <span>
                <span className="font-medium text-stone-800">{s.name}</span>
                <span className="ml-2 text-xs text-stone-400">{s.cohort}</span>
              </span>
              <AmpelBadge ampel={s.ampel} score={s.overall} size="sm" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
