# Phase-2 Indikatoren — verifizierte Endpoints

Alle URLs am 2026-06-16 per HTTP 200 geprüft. **Keine erfundenen Endpoints.**
Pipeline-Struktur wie MVP: `scripts/ingest/loader-<x>.ts` → staging → `indicators`-Rows
(idempotent, `quelle` + `datenstand` je Zeile), Aggregation auf GKZ3.

## Hochwasserrisiko — Umweltbundesamt / INSPIRE (CC BY 4.0)
FeatureType `nz-core:HazardArea`. Verarbeitung: Fläche je Bezirk in HQ100/HQ300-Zone
→ `% Bezirksfläche`. Verschneidung mit Bezirksgrenzen (`data/bezirke.json`, EPSG:31287).

- HQ100 WFS GetCapabilities:
  `https://haleconnect.com/ows/services/org.709.f3598452-2d2d-412c-8e4e-2b7b7eb71e66_wfs?SERVICE=WFS&REQUEST=GetCapabilities&VERSION=2.0.0`
- HQ300 WFS GetCapabilities:
  `https://haleconnect.com/ows/services/org.709.8ec8a6b8-7d22-4829-8d22-96d1388388de_wfs?SERVICE=WFS&REQUEST=GetCapabilities&VERSION=2.0.0`
- Direkt-Download (je ~230 MB ZIP, empfohlen für AT-weite Verschneidung):
  - `https://inspire.lfrz.gv.at/000801/ds/HWRL_UEFF_HQ100.zip`
  - `https://inspire.lfrz.gv.at/000801/ds/HWRL_UEFF_HQ300.zip`

**Vor dem Loader:** DescribeFeatureType/GetFeature-Sample prüfen → Attribut für
Wahrscheinlichkeitsklasse (HQ100/HQ300) + CRS bestätigen. Flächen-Intersection braucht
eine Polygon-Clipping-Lib (z. B. `polygon-clipping`/`@turf/turf`); CRS einheitlich 31287.

## Hitze — GeoSphere Austria Data Hub (CC BY 4.0)
Dataset `klima-v2-1d` (Tageswerte, 1097 Stationen). Param **`tlmax`** (°C) bestätigt.
Hitzetag = Tag mit `tlmax ≥ 30`. Verarbeitung: Hitzetage/Jahr je Station → Station per
Punkt-in-Polygon dem Bezirk zuordnen → über Stationen mitteln; Bezirke ohne Station →
nächstgelegene Station (geflaggt).

- Stations-Metadaten (inkl. lat/lon, EPSG:4326):
  `https://dataset.api.hub.geosphere.at/v1/station/historical/klima-v2-1d/metadata`
- Tageswerte:
  `https://dataset.api.hub.geosphere.at/v1/station/historical/klima-v2-1d?parameters=tlmax&station_ids=<IDs>&start=<YYYY-MM-DD>&end=<YYYY-MM-DD>&output_format=csv`

**Vor dem Loader:** Stationskoordinaten (4326) → 31287 reprojizieren (proj4) für
Punkt-in-Polygon gegen `data/bezirke.json`.

> Architektur-Hinweis: Die Engine/UI sind additiv — sobald `hochwasserrisiko`/`hitze`
> in `data/mvp_slice.json` landen, werden sie automatisch bewertet, in Karte/Detail/
> Methodik angezeigt. Kein UI-Code nötig.
