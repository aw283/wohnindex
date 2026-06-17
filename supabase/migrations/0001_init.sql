-- Immoampel: Initiale Schema-Migration
-- Politischer Bezirk (GKZ3) als Primärschlüssel; 94 Bezirke österreichweit.

-- ===== DISTRICTS =====
CREATE TABLE IF NOT EXISTS public.districts (
  gkz3        text PRIMARY KEY,
  name        text NOT NULL,
  bundesland  text NOT NULL CHECK (bundesland IN (
    'Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich',
    'Salzburg', 'Steiermark', 'Tirol', 'Vorarlberg', 'Wien'
  )),
  urban_rural text NULL,
  wien_flag   boolean NOT NULL DEFAULT false
);

-- ===== INDICATORS =====
CREATE TABLE IF NOT EXISTS public.indicators (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gkz3       text NOT NULL REFERENCES public.districts (gkz3) ON DELETE CASCADE,
  indicator  text NOT NULL CHECK (indicator IN (
    'kaufpreis', 'preisentwicklung', 'mietrendite', 'leerstand',
    'bevoelkerungsprognose', 'pendlersaldo',
    'aerztedichte', 'schulen_kinderbetreuung', 'oev_takt',
    'breitband', 'naherholung', 'laerm_luft',
    'hochwasserrisiko', 'hitze', 'energieeffizienz',
    'alterung', 'kommunale_finanzkraft'
  )),
  value      numeric,
  jahr       int,
  quelle     text,
  datenstand date,
  UNIQUE (gkz3, indicator, jahr)
);

CREATE INDEX IF NOT EXISTS idx_indicators_indicator ON public.indicators (indicator);
CREATE INDEX IF NOT EXISTS idx_indicators_gkz3      ON public.indicators (gkz3);

-- ===== RLS =====
ALTER TABLE public.districts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;

-- Öffentliche Lese-Policy (kein Auth erforderlich für MVP)
CREATE POLICY "public read districts"
  ON public.districts FOR SELECT USING (true);

CREATE POLICY "public read indicators"
  ON public.indicators FOR SELECT USING (true);

-- ===== STAGING-TABELLEN (TRUNCATE + RELOAD je Run) =====

-- Staging: Immobilienpreise (Statistik Austria .ods)
CREATE TABLE IF NOT EXISTS public.staging_immo (
  lfd_nr      text,
  bezirk_raw  text,
  haus_preis  numeric,
  wohn_preis  numeric,
  baugrund    numeric,
  anz_kaeufe  integer,
  quelle_datei text,
  jahr        int,
  loaded_at   timestamptz NOT NULL DEFAULT now()
);

-- Staging: Bevölkerungshistorie (OGD CSV)
CREATE TABLE IF NOT EXISTS public.staging_bevoelkerung (
  gkz_raw     text,
  region_name text,
  zaehl_jahr  int,
  wert        numeric,
  merkmal_raw text,
  loaded_at   timestamptz NOT NULL DEFAULT now()
);

-- Staging: Pendler (Statistik Austria .ods)
CREATE TABLE IF NOT EXISTS public.staging_pendler (
  gkz_raw      text,
  region_name  text,
  einpendler   numeric,
  auspendler   numeric,
  saldo        numeric,
  jahr         int,
  quelle_datei text,
  loaded_at    timestamptz NOT NULL DEFAULT now()
);

-- Staging: Geometrie-Attribute (WFS SHAPE-ZIP)
CREATE TABLE IF NOT EXISTS public.staging_geometrie (
  gkz_raw  text,
  name_raw text,
  geojson  text,   -- optional; nur wenn unkompliziert verfügbar
  loaded_at timestamptz NOT NULL DEFAULT now()
);
