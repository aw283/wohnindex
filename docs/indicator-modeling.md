# Indikator-Modellierung — offene Indikatoren (Phase 2/3)

Pro Indikator: Quelle (✓ = diese Session per HTTP geprüft), Granularität→GKZ3,
**Modellierung** (wie aus der Quelle ein Bezirkswert entsteht), Richtung, Tier, Aufwand, Caveats.
Pipeline-Struktur wie MVP (staging → indicators, idempotent, quelle+datenstand je Zeile).
Architektur ist additiv: sobald Werte in `data/mvp_slice.json` landen, erscheinen sie in Karte/Detail/Methodik.

## INVESTMENT (3 offen)

### bevoelkerungsprognose · higher_better · Tier 1 · Aufwand: leicht
- **Quelle:** ÖROK-Regionalprognose 2021–2050, CC BY 4.0. 121 Prognoseregionen = politische Bezirke + 23 Wiener Bezirke (1:1 unsere Einheit). Exakte .xlsx-URL noch zu bestätigen (oerok.gv.at JS-gerendert).
- **Modellierung:** prognostizierte Bev.-Veränderung in % (z. B. 2024→2040) je Prognoseregion → direkt Bezirk. Kein GIS.

### leerstand · lower_better · Tier 2 · Aufwand: mittel
- **Quelle ✓:** GWR-Bestandsdaten `https://www.statistik.at/fileadmin/pages/490/GWRPakete2025DE.zip` (CC BY, bis Gemeinde-Ebene, Stand 1.1.2025).
- **Modellierung:** Anteil Wohnungen ohne Hauptwohnsitz-Meldung an allen Wohnungen je Gemeinde → bevölkerungs-/bestandsgewichtet auf Bezirk.
- **Caveat:** „keine Meldung" ≠ exakt Leerstand (Neben-/Ferienwohnungen enthalten) → als Proxy kennzeichnen.

### mietrendite · higher_better · Tier 3 · Aufwand: schwer
- **Quelle:** Miete = Statistik Austria Mikrozensus-Wohnungserhebung (Ø-Mieten €/m², regional) bzw. WKO/ÖVI-Mietspiegel; Kaufpreis = bereits im Immo-Loader vorhanden.
- **Modellierung:** Brutto-Mietrendite ≈ (Ø-Nettomiete €/m² × 12) ÷ Kaufpreis €/m².
- **Caveat:** Mieten oft nur Bundesland/Bezirksgruppe → gröber als Kaufpreis; Tier 3.

## LEBENSQUALITÄT (6 offen)

### aerztedichte · higher_better · Tier 2/3 · Aufwand: schwer (offiziell) / mittel (Proxy)
- **Quelle:** Kein sauberes OGD je Bezirk. Offiziell: Dachverband SV „Vertragsärzte"-Analyse, ÖGK-Vertragsarztverzeichnisse (PDF je Bundesland), Ärztekammer-Statistik, GÖG/RSG. Proxy: OpenStreetMap `amenity=doctors`/`healthcare`.
- **Modellierung:** Ideal = §2-Kassen(Allgemein)ärzte je 1.000 EW je Bezirk → Vertragsarztverzeichnisse geocoden → Bezirk. Pragmatisch: OSM-Arzt-POIs je 1.000 EW je Bezirk (Tier 3, klar als Proxy).

### schulen_kinderbetreuung · higher_better · Tier 1 · Aufwand: mittel
- **Quelle:** Kinderbetreuung = Statistik Austria Kindertagesheimstatistik (Betreuungsquote; nationale Tabellen + Länder-OGD). Schulen = BMBWF Schul-Adressverzeichnis (data.gv.at) bzw. OSM `amenity=school`.
- **Modellierung:** Index aus (i) Betreuungsquote 0–2 / 3–5 J. je Bezirk (Gemeinde→Bezirk) + (ii) Schulstandort-Dichte je 1.000 EW (Adressen geocoden → Bezirk). Beide 0–100 normieren, mitteln.

### oev_takt · higher_better · Tier 2 · Aufwand: mittel–schwer
- **Quelle:** Nationales GTFS „Soll-Fahrplan" (Mobilitätsverbünde Österreich, data.gv.at, CC BY); alt. ÖROK ÖV-Güteklassen (Raster).
- **Modellierung:** aus GTFS `stops`+`stop_times`: Abfahrten/Werktag je Haltestelle → Haltestellen per Punkt-in-Polygon dem Bezirk zuordnen → Bezirkswert = Abfahrten/Tag, EW-gewichtet. Alt.: mittlere ÖV-Güteklasse, bevölkerungsgewichtet.

### breitband · higher_better · Tier 2 · Aufwand: mittel (Login?) — offen
- **Quelle:** RTR Breitbandatlas, 100m-Raster (Statistik Austria, je Gemeinde) als Geopackage/CSV — aber **ZIB-Portal-Login**. Offene REST-API: `https://data.rtr.at/TKAGG` (Aggregate prüfen).
- **Modellierung:** Anteil Adressen/Haushalte mit ≥100 (oder ≥30) Mbit/s je Bezirk, aus 100m-Raster (Gemeinde→Bezirk gemittelt).
- **Caveat:** klären, ob TKAGG-API Gemeinde-Aggregate ohne Login liefert; sonst Datenantrag/Login nötig.

### naherholung · higher_better · Tier 2 · Aufwand: mittel (GIS)
- **Quelle ✓ (Anbieter):** Copernicus CORINE Land Cover 2018 (EEA), Raster 100m / Vektor, offen — `https://land.copernicus.eu/en/products/corine-land-cover/clc2018`.
- **Modellierung:** Zonal Statistics je Bezirk → Anteil „grüner" CLC-Klassen (Wälder 311–313, naturnah 321–324, Gewässer) an Bezirksfläche. Verschneidung CORINE × Bezirksgrenzen.

### laerm_luft · lower_better · Tier 3 · Aufwand: schwer
- **Quelle:** Lärm = Umweltbundesamt Lärmkarten (EU-Umgebungslärm, WFS). Luft = UBA Messnetz (SensorThings-API api4inspire, stündlich) + EEA validierte Jahresmittel NO₂/PM10.
- **Modellierung:** Index aus (a) % Bezirksfläche/Bevölkerung über Lärmschwelle (z. B. L_den>55 dB) via Verschneidung + (b) NO₂/PM10-Jahresmittel der nächstgelegenen Station je Bezirk.
- **Caveat:** Luft-Stationen dünn → grobe Zuordnung; Tier 3.

## ZUKUNFTSFESTIGKEIT (4 offen)

### hochwasserrisiko · lower_better · Tier 2 · Aufwand: mittel (GIS) — Endpoints ✓
- **Quelle ✓:** Umweltbundesamt INSPIRE, FeatureType `nz-core:HazardArea`, WFS + ZIP (siehe [phase2-endpoints.md](phase2-endpoints.md)).
- **Modellierung:** % Bezirksfläche in HQ100- bzw. HQ300-Zone via Verschneidung mit Bezirksgrenzen.

### hitze · lower_better · Tier 2 · Aufwand: mittel — Endpoints ✓
- **Quelle ✓:** GeoSphere `klima-v2-1d`, Param `tlmax` (siehe phase2-endpoints.md).
- **Modellierung:** Hitzetage/Jahr (tlmax ≥ 30 °C) je Station, Mittel über Normalperiode (z. B. 1991–2020) → Station per Punkt-in-Polygon/nächste Station je Bezirk.

### energieeffizienz · higher_better · Tier 3 · Aufwand: mittel — Quelle ✓
- **Quelle ✓:** GWR-Bestandsdaten (gleiche ZIP wie Leerstand: `.../GWRPakete2025DE.zip`). Merkmale Bauperiode + Heizungsart.
- **Modellierung:** Proxy-Index je Bezirk aus Anteil Gebäude mit Baujahr ≥ 2000 (Annäherung an thermische Qualität) + Anteil emissionsarmer Heizung (Fernwärme/Wärmepumpe).
- **Caveat:** Proxy — echtes Energieausweis-Register (ZEUS) ist nicht offen; Tier 3.

### kommunale_finanzkraft · higher_better · Tier 1 · Aufwand: mittel
- **Quelle:** KDZ „Offener Haushalt" (offenerhaushalt.at, Gemeindebudgets) / Statistik Austria Gemeindefinanzstatistik / data.gv.at `tags=Gemeindefinanzen`. Exakten Datensatz noch pinnen.
- **Modellierung:** Finanzkraft-Kopfquote (eigene Abgaben + Ertragsanteile je EW) je Gemeinde → bevölkerungsgewichtet auf Bezirk.

## Empfohlene Bau-Reihenfolge
1. **Quick Wins (Quelle/Endpoint ✓):** hitze, hochwasserrisiko, leerstand + energieeffizienz (eine GWR-Quelle, 2 Indikatoren).
2. **Direkt, Quelle pinnen:** bevoelkerungsprognose (ÖROK-xlsx), kommunale_finanzkraft.
3. **GIS-mittel:** naherholung (CORINE), oev_takt (GTFS).
4. **Schwer/Proxy/Klärung:** aerztedichte (OSM-Proxy), breitband (Login?), laerm_luft, mietrendite.
