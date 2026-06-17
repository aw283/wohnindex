/**
 * Loader: ÖROK-Regionalprognose 2021–2050 (Bevölkerungsprognose je Bezirk)
 *
 * TODO: Exakte Download-URL noch zu bestätigen.
 *
 * ÖROK = Österreichische Raumordnungskonferenz
 * URL-Kandidaten (oerok.gv.at, JS-gerenderte Seite, kein direkter Dateilink bekannt):
 *   - https://www.oerok.gv.at/raum-region/daten-und-grundlagen/bevoelkerungsprognose
 *   - Die .xlsx-Datei ist vermutlich hinter einem JS-rendered Download-Link versteckt.
 *   - Titel: "Regionalprognose 2021–2050" oder "ÖROK-Prognose 2021–2050"
 *   - Format: .xlsx, 121 Prognoseregionen (politische Bezirke + 23 Wiener Bezirke)
 *   - Lizenz: CC BY 4.0
 *   - Granularität: Bezirk (GKZ3) direkt → kein Spatial Join nötig
 *   - Enthält: Bevölkerungsprognose je Bezirk 2021, 2026, 2031, ..., 2050
 *
 * Umsetzungsplan (nach URL-Bestätigung):
 *   1. Datei herunterladen (ggf. mit Playwright wenn JS-rendered)
 *   2. xlsx via SheetJS lesen
 *   3. Spalten inspizieren (Zähljahre, Bevölkerungszahl)
 *   4. Δ% 2021→2050 je Bezirk berechnen → indicator "bevoelkerungsprognose"
 *   5. UPSERT in indicators (onConflict gkz3,indicator,jahr)
 *   6. Placeholder-Werte aus loader-bevoelkerung.ts überschreiben
 *
 * Derzeit wirft dieses Script einen dokumentierten TODO-Fehler.
 */

throw new Error(
  "[prognose] TODO: ÖROK-Regionalprognose 2021–2050 – exakte .xlsx-URL noch zu bestätigen.\n" +
    "  Bitte URL auf oerok.gv.at verifizieren (JS-rendered, kein direkter Link bekannt).\n" +
    "  Nach URL-Bestätigung: SheetJS-Parser implementieren, Δ% 2021→2050 berechnen,\n" +
    "  indicator 'bevoelkerungsprognose' mit echtem ÖROK-Wert upserten.\n" +
    "  Vorerst: loader-bevoelkerung.ts liefert Proxy-Wert (Istwachstum aus Volkszählung)."
);
