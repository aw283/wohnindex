"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Ampel } from "@/lib/scoring";
import { ampelHex } from "@/lib/ampel";

export interface DistrictListItem {
  gkz3: string;
  name: string;
  bundesland: string;
  overall: number | null;
  ampel: Ampel | null;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

export function DistrictSearch({ districts }: { districts: DistrictListItem[] }) {
  const [q, setQ] = useState("");
  const nq = norm(q.trim());
  const results = useMemo(() => {
    if (!nq) return [];
    return districts
      .filter((d) => norm(d.name).includes(nq) || norm(d.bundesland).includes(nq))
      .slice(0, 8);
  }, [nq, districts]);

  return (
    <div className="relative">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Bezirk suchen … (z. B. Innsbruck, Tirol)"
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        aria-label="Bezirk suchen"
      />
      {nq && (
      <ul className="absolute z-10 mt-2 w-full divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
        {results.map((d) => (
          <li key={d.gkz3}>
            <Link
              href={`/bezirk/${d.gkz3}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-stone-50"
            >
              <span className="flex items-center gap-2.5">
                <span className="ampel-dot" style={{ background: ampelHex(d.ampel) }} />
                <span className="font-medium text-stone-800">{d.name}</span>
                <span className="text-xs text-stone-400">{d.bundesland}</span>
              </span>
              <span className="tabular-nums text-sm font-bold text-stone-500">
                {d.overall === null ? "—" : d.overall.toFixed(0)}
              </span>
            </Link>
          </li>
        ))}
        {results.length === 0 && (
          <li className="px-4 py-3 text-sm text-stone-400">Kein Bezirk gefunden.</li>
        )}
      </ul>
      )}
    </div>
  );
}
