/**
 * run-all.ts: Führt alle Ingest-Loader in korrekter Reihenfolge aus.
 *
 * Reihenfolge:
 *   1. districts-Seed (Voraussetzung für FK-Constraints)
 *   2. immo (kaufpreis, preisentwicklung)
 *   3. bevoelkerung (bevoelkerungsprognose-Proxy)
 *   4. pendler (pendlersaldo, alterung)
 *   5. geometrie (staging_geometrie)
 *
 * Prognose (ÖROK) ist noch nicht implementiert (prognose.ts wirft TODO).
 *
 * Jeder Loader ist idempotent (TRUNCATE+INSERT staging, UPSERT indicators).
 */
import "dotenv/config";
import { loadDistricts } from "./loader-districts";
import { loadImmo } from "./loader-immo";
import { loadBevoelkerung } from "./loader-bevoelkerung";
import { loadPendler } from "./loader-pendler";
import { loadGeometrie } from "./loader-geometrie";

async function runAll(): Promise<void> {
  console.log("=== Immoampel Ingest Pipeline ===\n");
  const t0 = Date.now();

  // 1. Districts
  console.log("Schritt 1/5: Districts-Seed");
  await loadDistricts();

  // 2. Immo
  console.log("\nSchritt 2/5: Immobilienpreise");
  await loadImmo();

  // 3. Bevölkerung
  console.log("\nSchritt 3/5: Bevölkerungshistorie");
  await loadBevoelkerung();

  // 4. Pendler + Alterung
  console.log("\nSchritt 4/5: Pendler + Alterung");
  await loadPendler();

  // 5. Geometrie
  console.log("\nSchritt 5/5: Geometrie");
  await loadGeometrie();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n=== Ingest abgeschlossen in ${elapsed}s ===`);
  console.log("ÖROK-Prognose: noch ausstehend (prognose.ts TODO)");
}

runAll().catch((e) => {
  console.error("\n[run-all] FEHLER:", e.message);
  process.exit(1);
});
