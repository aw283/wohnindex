import { describe, it, expect } from "vitest";
import {
  scoreDistricts,
  ampelFor,
  type DistrictMeta,
  type IndicatorValue,
} from "@/lib/scoring";
import type { IndicatorKey } from "@/types/indicators";
import fixture from "@/data/mvp_slice.json";

// ---------------------------------------------------------------------------
// Helfer für synthetische Kohorten
// ---------------------------------------------------------------------------
function tirol(n: number): DistrictMeta {
  return { gkz3: `70${n}`, name: `Tirol-${n}`, bundesland: "Tirol" };
}
function val(gkz3: string, indicator: IndicatorKey, value: number, jahr = 2024): IndicatorValue {
  return { gkz3, indicator, value, jahr };
}

describe("ampelFor – Schwellenwerte", () => {
  it("grün ab 66, gelb 33–<66, rot <33", () => {
    expect(ampelFor(66)).toBe("gruen");
    expect(ampelFor(80)).toBe("gruen");
    expect(ampelFor(65.99)).toBe("gelb");
    expect(ampelFor(33)).toBe("gelb");
    expect(ampelFor(32.99)).toBe("rot");
    expect(ampelFor(null)).toBeNull();
  });
});

describe("Min-Max-Normalisierung je Kohorte", () => {
  it("higher_better: min→0, mitte→50, max→100", () => {
    const ds = [tirol(1), tirol(2), tirol(3)];
    const vs = [
      val("701", "preisentwicklung", -10),
      val("702", "preisentwicklung", 0),
      val("703", "preisentwicklung", 10),
    ];
    const r = scoreDistricts(ds, vs);
    expect(r.get("701")!.indicatorScores.preisentwicklung!.normalized).toBe(0);
    expect(r.get("702")!.indicatorScores.preisentwicklung!.normalized).toBe(50);
    expect(r.get("703")!.indicatorScores.preisentwicklung!.normalized).toBe(100);
  });

  it("lower_better (kaufpreis): teuerster Bezirk → 0, günstigster → 100", () => {
    const ds = [tirol(1), tirol(2), tirol(3)];
    const vs = [
      val("701", "kaufpreis", 1000),
      val("702", "kaufpreis", 2000),
      val("703", "kaufpreis", 3000),
    ];
    const r = scoreDistricts(ds, vs);
    expect(r.get("701")!.indicatorScores.kaufpreis!.normalized).toBe(100); // billig = gut
    expect(r.get("702")!.indicatorScores.kaufpreis!.normalized).toBe(50);
    expect(r.get("703")!.indicatorScores.kaufpreis!.normalized).toBe(0); // teuer = schlecht
  });
});

describe("Kohorten-Isolation", () => {
  it("gleicher Rohwert ergibt je nach Bundesland-Kohorte andere Scores", () => {
    const ds: DistrictMeta[] = [
      { gkz3: "701", name: "T1", bundesland: "Tirol" },
      { gkz3: "702", name: "T2", bundesland: "Tirol" },
      { gkz3: "201", name: "K1", bundesland: "Kärnten" },
      { gkz3: "202", name: "K2", bundesland: "Kärnten" },
    ];
    const vs = [
      val("701", "preisentwicklung", 0),
      val("702", "preisentwicklung", 10),
      val("201", "preisentwicklung", 0),
      val("202", "preisentwicklung", 100),
    ];
    const r = scoreDistricts(ds, vs);
    // Wert 0 ist in Tirol das Minimum (→0) und in Kärnten ebenfalls Minimum (→0),
    // aber Wert 10 ist in Tirol das Max (→100), in Kärnten nur 10 % der Spanne.
    expect(r.get("702")!.indicatorScores.preisentwicklung!.normalized).toBe(100);
    expect(r.get("202")!.indicatorScores.preisentwicklung!.normalized).toBe(100);
    expect(r.get("701")!.indicatorScores.preisentwicklung!.normalized).toBe(0);
    expect(r.get("201")!.indicatorScores.preisentwicklung!.normalized).toBe(0);
  });
});

describe("Wien als eigene Kohorte (Kohorte von 1)", () => {
  it("entartete Kohorte → neutral 50 mit neutralFallback-Flag", () => {
    const ds: DistrictMeta[] = [
      { gkz3: "900", name: "Wien", bundesland: "Wien", wien_flag: true },
    ];
    const vs = [val("900", "kaufpreis", 5000), val("900", "alterung", 18)];
    const r = scoreDistricts(ds, vs);
    const wien = r.get("900")!;
    expect(wien.indicatorScores.kaufpreis!.neutralFallback).toBe(true);
    expect(wien.indicatorScores.kaufpreis!.normalized).toBe(50);
    expect(wien.cohort).toBe("Wien");
    // Beide Cluster aus neutralen 50 → Gesamt 50 → gelb
    expect(wien.overall).toBe(50);
    expect(wien.ampel).toBe("gelb");
  });
});

describe("Winsorisierung ±2 SD", () => {
  it("Ausreißer wird auf die Grenze gekappt (winsorised-Flag)", () => {
    const ds = [tirol(1), tirol(2), tirol(3), tirol(4), tirol(5), tirol(6)];
    const vs = [
      val("701", "kaufpreis", 1000),
      val("702", "kaufpreis", 1000),
      val("703", "kaufpreis", 1000),
      val("704", "kaufpreis", 1000),
      val("705", "kaufpreis", 1000),
      val("706", "kaufpreis", 4000), // Ausreißer (>mean+2SD ≈ 3736)
    ];
    const r = scoreDistricts(ds, vs);
    expect(r.get("706")!.indicatorScores.kaufpreis!.winsorised).toBe(true);
    // gekappter Ausreißer bleibt teuerster → lower_better → normalized 0
    expect(r.get("706")!.indicatorScores.kaufpreis!.normalized).toBe(0);
    expect(r.get("701")!.indicatorScores.kaufpreis!.winsorised).toBe(false);
  });
});

describe("Fehlende Indikatoren", () => {
  it("Cluster-Score nur aus vorhandenen Indikatoren; fehlende Cluster → null", () => {
    const ds = [tirol(1), tirol(2)];
    const vs = [
      // nur kaufpreis (1 von 6 Investment-Indikatoren), nichts in LQ/ZF
      val("701", "kaufpreis", 1000),
      val("702", "kaufpreis", 2000),
    ];
    const r = scoreDistricts(ds, vs);
    const t1 = r.get("701")!;
    expect(t1.clusters.investment.present).toEqual(["kaufpreis"]);
    expect(t1.clusters.investment.coverage).toBe(0.17); // round2(1/6)
    expect(t1.clusters.investment.insufficient).toBe(true);
    expect(t1.clusters.lebensqualitaet.score).toBeNull();
    expect(t1.clusters.zukunftsfestigkeit.score).toBeNull();
    // Investment-Score = adjusted des einzigen Indikators (kaufpreis tier2 → ×1.0)
    expect(t1.clusters.investment.score).toBe(
      t1.indicatorScores.kaufpreis!.adjusted
    );
    // Gesamt = nur Investment → Cluster-Gewichte renormieren auf 1
    expect(t1.overall).toBe(t1.clusters.investment.score);
  });
});

describe("Determinismus", () => {
  it("gleiche Eingabe → gleiche Ausgabe", () => {
    const ds = [tirol(1), tirol(2), tirol(3)];
    const vs = [
      val("701", "kaufpreis", 1500),
      val("702", "kaufpreis", 2500),
      val("703", "kaufpreis", 3500),
    ];
    const a = scoreDistricts(ds, vs).get("702")!.overall;
    const b = scoreDistricts(ds, vs).get("702")!.overall;
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// ECHTE MVP-Daten (tests/fixtures/mvp_slice.json)
// ---------------------------------------------------------------------------
describe("Echte MVP-Daten", () => {
  const districts = fixture.districts as DistrictMeta[];
  const values = fixture.values.map((v) => ({
    gkz3: v.gkz3,
    indicator: v.indicator as IndicatorKey,
    value: v.value,
    jahr: v.jahr,
  })) as IndicatorValue[];
  const scores = scoreDistricts(districts, values);

  it("alle 94 Bezirke werden bewertet", () => {
    expect(districts.length).toBe(94);
    expect(scores.size).toBe(94);
  });

  it("Innsbruck-Stadt (701) & Lienz (707): Investment + Zukunft vorhanden, LQ fehlt", () => {
    const inns = scores.get("701")!;
    const lienz = scores.get("707")!;
    expect(inns.clusters.investment.score).not.toBeNull();
    expect(inns.clusters.zukunftsfestigkeit.score).not.toBeNull();
    expect(inns.clusters.lebensqualitaet.score).toBeNull();
    expect(lienz.overall).toBeGreaterThanOrEqual(0);
    expect(lienz.overall).toBeLessThanOrEqual(100);
  });

  it("günstigeres Lienz hat höheren Kaufpreis-Score als teures Innsbruck (lower_better)", () => {
    const inns = scores.get("701")!.indicatorScores.kaufpreis!;
    const lienz = scores.get("707")!.indicatorScores.kaufpreis!;
    expect(lienz.normalized).toBeGreaterThan(inns.normalized);
  });

  it("Wien (900) hat keine MVP-Daten → overall null, Ampel n/a", () => {
    const wien = scores.get("900")!;
    expect(wien.overall).toBeNull();
    expect(wien.ampel).toBeNull();
  });

  it("alle Nicht-Null-Gesamtscores liegen in [0,100]", () => {
    for (const s of scores.values()) {
      if (s.overall !== null) {
        expect(s.overall).toBeGreaterThanOrEqual(0);
        expect(s.overall).toBeLessThanOrEqual(100);
      }
    }
  });
});
