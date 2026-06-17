"use client";

import { useState } from "react";
import Link from "next/link";
import type { Ampel } from "@/lib/scoring";
import { ampelFor } from "@/lib/scoring";
import type { Cluster } from "@/types/indicators";
import { ampelHex } from "@/lib/ampel";

export interface CompareItem {
  gkz3: string;
  name: string;
  bundesland: string;
  overall: number | null;
  ampel: Ampel | null;
  clusters: Record<Cluster, number | null>;
}

const CLUSTER_ROWS: { key: Cluster; label: string }[] = [
  { key: "investment", label: "Investment" },
  { key: "lebensqualitaet", label: "Lebensqualität" },
  { key: "zukunftsfestigkeit", label: "Zukunftsfestigkeit" },
];

function Cell({ score }: { score: number | null }) {
  const a = ampelFor(score);
  return (
    <div className="flex items-center gap-2">
      <span className="ampel-dot shrink-0" style={{ background: ampelHex(a) }} />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full rounded-full" style={{ width: `${score ?? 0}%`, background: ampelHex(a) }} />
      </div>
      <span className="w-8 text-right text-sm font-bold tabular-nums text-stone-700">
        {score === null ? "—" : score.toFixed(0)}
      </span>
    </div>
  );
}

export function CompareView({ items }: { items: CompareItem[] }) {
  const withData = items.filter((i) => i.overall !== null);
  const [picks, setPicks] = useState<string[]>([
    withData[0]?.gkz3 ?? items[0]?.gkz3,
    withData[1]?.gkz3 ?? items[1]?.gkz3,
    "",
  ]);

  const byGkz3 = new Map(items.map((i) => [i.gkz3, i]));
  const selected = picks.map((g) => (g ? byGkz3.get(g) : undefined)).filter(Boolean) as CompareItem[];

  function setPick(idx: number, gkz3: string) {
    setPicks((p) => p.map((v, i) => (i === idx ? gkz3 : v)));
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((idx) => (
          <select
            key={idx}
            value={picks[idx] ?? ""}
            onChange={(e) => setPick(idx, e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
            aria-label={`Bezirk ${idx + 1}`}
          >
            <option value="">{idx < 2 ? "Bezirk wählen …" : "+ dritter Bezirk (optional)"}</option>
            {items.map((i) => (
              <option key={i.gkz3} value={i.gkz3}>
                {i.name} ({i.bundesland})
              </option>
            ))}
          </select>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left">
                <th className="p-4 text-xs font-bold uppercase tracking-wide text-stone-500">Bezirk</th>
                {selected.map((s) => (
                  <th key={s.gkz3} className="p-4">
                    <Link href={`/bezirk/${s.gkz3}`} className="font-serif text-base font-bold text-navy hover:text-brand">
                      {s.name}
                    </Link>
                    <div className="text-xs font-normal text-stone-400">{s.bundesland}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr>
                <td className="p-4 font-bold text-navy">Gesamt</td>
                {selected.map((s) => (
                  <td key={s.gkz3} className="p-4"><Cell score={s.overall} /></td>
                ))}
              </tr>
              {CLUSTER_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="p-4 text-sm font-medium text-stone-700">{row.label}</td>
                  {selected.map((s) => (
                    <td key={s.gkz3} className="p-4"><Cell score={s.clusters[row.key]} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
