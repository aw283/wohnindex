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
      <label htmlFor="bezirk-suche" className="mb-2 block text-sm font-semibold text-white/90">
        🔎 Bezirk suchen
      </label>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          id="bezirk-suche"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="z. B. Innsbruck, Graz oder Tirol …"
          className="w-full rounded-xl border-2 border-stone-300 bg-white py-3.5 pl-12 pr-4 text-base text-stone-900 shadow-lg outline-none placeholder:text-stone-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          aria-label="Bezirk suchen"
          autoComplete="off"
        />
      </div>
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
