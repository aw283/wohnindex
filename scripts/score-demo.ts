/**
 * Demo: Score-Breakdown für 3 Beispiel-Bezirke (urban / ländlich / Wien)
 * auf Basis der echten MVP-Fixture (tests/fixtures/mvp_slice.json).
 *
 *   tsx scripts/score-demo.ts   (bzw. npm run demo)
 */
import * as fs from "fs";
import * as path from "path";
import { INDICATORS, type IndicatorKey } from "@/types/indicators";
import {
  scoreDistricts,
  type DistrictMeta,
  type IndicatorValue,
  type DistrictScore,
} from "@/lib/scoring";

const fixture = JSON.parse(
  fs.readFileSync(path.resolve("data/mvp_slice.json"), "utf-8")
) as { districts: DistrictMeta[]; values: IndicatorValue[] };

const scores = scoreDistricts(fixture.districts, fixture.values);
const LABEL = new Map(INDICATORS.map((i) => [i.key as IndicatorKey, i.label]));
const AMPEL_ICON = { gruen: "🟢", gelb: "🟡", rot: "🔴" } as const;

function bar(score: number | null): string {
  if (score === null) return "—".repeat(20) + " n/a";
  const n = Math.round((score / 100) * 20);
  return "█".repeat(n) + "░".repeat(20 - n) + ` ${score.toFixed(1)}`;
}

function printDistrict(s: DistrictScore) {
  const ampel = s.ampel ? `${AMPEL_ICON[s.ampel]} ${s.ampel.toUpperCase()}` : "n/a";
  console.log("\n" + "═".repeat(64));
  console.log(`  ${s.name}  (GKZ3 ${s.gkz3} · Kohorte: ${s.cohort})`);
  console.log("═".repeat(64));
  console.log(
    `  GESAMT: ${s.overall === null ? "—" : s.overall.toFixed(1)}   ${ampel}`
  );

  for (const cluster of ["investment", "lebensqualitaet", "zukunftsfestigkeit"] as const) {
    const c = s.clusters[cluster];
    const cov = `${c.present.length}/${c.present.length + c.missing.length}`;
    const flag = c.insufficient && c.score !== null ? "  ⚠ Daten unzureichend" : "";
    console.log(
      `\n  ▸ ${cluster.toUpperCase().padEnd(18)} ${bar(c.score)}   [${cov}]${flag}`
    );
    for (const key of c.present) {
      const i = s.indicatorScores[key]!;
      const tags = [
        i.winsorised ? "winsor." : "",
        i.neutralFallback ? "neutral(Kohorte=1)" : "",
      ]
        .filter(Boolean)
        .join(" ");
      console.log(
        `      ${(LABEL.get(key) ?? key).padEnd(26)} roh=${String(i.raw).padStart(9)}  →  norm=${i.normalized
          .toFixed(1)
          .padStart(5)}  ×tier=${i.adjusted.toFixed(1).padStart(5)}  ${tags}`
      );
    }
    if (c.missing.length > 0) {
      console.log(`      (fehlend: ${c.missing.join(", ")})`);
    }
  }
}

console.log("\nIMMOAMPEL – Score-Breakdown (echte MVP-Daten)");
console.log("Normalisierung: Min-Max je Bundesland-Kohorte · Ampel grün≥66 / gelb / rot<33");

for (const gkz3 of ["701", "707", "900"]) {
  const s = scores.get(gkz3);
  if (s) printDistrict(s);
}
console.log("\n" + "═".repeat(64));
console.log("powered by Immoampel");
