import { getAllScores } from "@/lib/data";
import { CompareView, type CompareItem } from "@/components/CompareView";
import { CLUSTERS } from "@/types/indicators";

export const metadata = { title: "Bezirksvergleich" };

export default function VergleichPage() {
  const items: CompareItem[] = getAllScores()
    .map((s) => ({
      gkz3: s.gkz3,
      name: s.name,
      bundesland: s.cohort,
      overall: s.overall,
      ampel: s.ampel,
      clusters: Object.fromEntries(
        CLUSTERS.map((c) => [c, s.clusters[c].score])
      ) as CompareItem["clusters"],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-extrabold text-navy">Bezirke vergleichen</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600">
        Wähle zwei oder drei Bezirke und vergleiche Gesamt-Ampel und Cluster
        direkt. Hinweis: Bezirke werden je Bundesland-Kohorte normalisiert –
        Werte über Bundesländer hinweg sind nur eingeschränkt vergleichbar.
      </p>
      <div className="mt-8">
        <CompareView items={items} />
      </div>
    </div>
  );
}
