-- Immoampel: Seed-Daten für 94 politische Bezirke Österreichs
-- Primärquelle: OGD_f0743_VZ_HIS_GEM_2_C-GRGEM17-0.csv (Statistik Austria, CC BY 4.0)
-- Generiert via probe_regions.ts, Stand: 2026-06-16
-- Wien als 1 Einheit (gkz3='900', wien_flag=true); Gemeindebezirke 901-923 NICHT im MVP-Seed.
-- Zeilen: 94 (ohne "Nicht klassifizierbar" gkz3=0)

INSERT INTO public.districts (gkz3, name, bundesland, urban_rural, wien_flag) VALUES
-- Burgenland (9 Bezirke)
('101', 'Eisenstadt (Stadt)',           'Burgenland',        NULL, false),
('102', 'Rust (Stadt)',                 'Burgenland',        NULL, false),
('103', 'Eisenstadt Umgebung',          'Burgenland',        NULL, false),
('104', 'Güssing',                      'Burgenland',        NULL, false),
('105', 'Jennersdorf',                  'Burgenland',        NULL, false),
('106', 'Mattersburg',                  'Burgenland',        NULL, false),
('107', 'Neusiedl am See',              'Burgenland',        NULL, false),
('108', 'Oberpullendorf',               'Burgenland',        NULL, false),
('109', 'Oberwart',                     'Burgenland',        NULL, false),
-- Kärnten (10 Bezirke)
('201', 'Klagenfurt (Stadt)',           'Kärnten',           NULL, false),
('202', 'Villach (Stadt)',              'Kärnten',           NULL, false),
('203', 'Hermagor',                     'Kärnten',           NULL, false),
('204', 'Klagenfurt Land',              'Kärnten',           NULL, false),
('205', 'Sankt Veit an der Glan',       'Kärnten',           NULL, false),
('206', 'Spittal an der Drau',          'Kärnten',           NULL, false),
('207', 'Villach Land',                 'Kärnten',           NULL, false),
('208', 'Völkermarkt',                  'Kärnten',           NULL, false),
('209', 'Wolfsberg',                    'Kärnten',           NULL, false),
('210', 'Feldkirchen',                  'Kärnten',           NULL, false),
-- Niederösterreich (23 Bezirke, inkl. 4 Statutarstädte)
('301', 'Krems an der Donau (Stadt)',   'Niederösterreich',  NULL, false),
('302', 'Sankt Pölten (Stadt)',         'Niederösterreich',  NULL, false),
('303', 'Waidhofen an der Ybbs (Stadt)','Niederösterreich', NULL, false),
('304', 'Wiener Neustadt (Stadt)',      'Niederösterreich',  NULL, false),
('305', 'Amstetten',                    'Niederösterreich',  NULL, false),
('306', 'Baden',                        'Niederösterreich',  NULL, false),
('307', 'Bruck an der Leitha',          'Niederösterreich',  NULL, false),
('308', 'Gänserndorf',                  'Niederösterreich',  NULL, false),
('309', 'Gmünd',                        'Niederösterreich',  NULL, false),
('310', 'Hollabrunn',                   'Niederösterreich',  NULL, false),
('311', 'Horn',                         'Niederösterreich',  NULL, false),
('312', 'Korneuburg',                   'Niederösterreich',  NULL, false),
('313', 'Krems Land',                   'Niederösterreich',  NULL, false),
('314', 'Lilienfeld',                   'Niederösterreich',  NULL, false),
('315', 'Melk',                         'Niederösterreich',  NULL, false),
('316', 'Mistelbach',                   'Niederösterreich',  NULL, false),
('317', 'Mödling',                      'Niederösterreich',  NULL, false),
('318', 'Neunkirchen',                  'Niederösterreich',  NULL, false),
('319', 'Sankt Pölten Land',            'Niederösterreich',  NULL, false),
('320', 'Scheibbs',                     'Niederösterreich',  NULL, false),
('321', 'Tulln',                        'Niederösterreich',  NULL, false),
('322', 'Waidhofen an der Thaya',       'Niederösterreich',  NULL, false),
('323', 'Wiener Neustadt Land',         'Niederösterreich',  NULL, false),
('325', 'Zwettl',                       'Niederösterreich',  NULL, false),
-- Oberösterreich (15 Bezirke)
('401', 'Linz (Stadt)',                 'Oberösterreich',    NULL, false),
('402', 'Steyr (Stadt)',                'Oberösterreich',    NULL, false),
('403', 'Wels (Stadt)',                 'Oberösterreich',    NULL, false),
('404', 'Braunau am Inn',               'Oberösterreich',    NULL, false),
('405', 'Eferding',                     'Oberösterreich',    NULL, false),
('406', 'Freistadt',                    'Oberösterreich',    NULL, false),
('407', 'Gmunden',                      'Oberösterreich',    NULL, false),
('408', 'Grieskirchen',                 'Oberösterreich',    NULL, false),
('409', 'Kirchdorf an der Krems',       'Oberösterreich',    NULL, false),
('410', 'Linz Land',                    'Oberösterreich',    NULL, false),
('411', 'Perg',                         'Oberösterreich',    NULL, false),
('412', 'Ried im Innkreis',             'Oberösterreich',    NULL, false),
('413', 'Rohrbach',                     'Oberösterreich',    NULL, false),
('414', 'Schärding',                    'Oberösterreich',    NULL, false),
('415', 'Steyr Land',                   'Oberösterreich',    NULL, false),
('416', 'Urfahr Umgebung',              'Oberösterreich',    NULL, false),
('417', 'Vöcklabruck',                  'Oberösterreich',    NULL, false),
('418', 'Wels Land',                    'Oberösterreich',    NULL, false),
-- Salzburg (6 Bezirke)
('501', 'Salzburg (Stadt)',             'Salzburg',          NULL, false),
('502', 'Hallein',                      'Salzburg',          NULL, false),
('503', 'Salzburg Umgebung',            'Salzburg',          NULL, false),
('504', 'Sankt Johann im Pongau',       'Salzburg',          NULL, false),
('505', 'Tamsweg',                      'Salzburg',          NULL, false),
('506', 'Zell am See',                  'Salzburg',          NULL, false),
-- Steiermark (13 Bezirke)
('601', 'Graz (Stadt)',                 'Steiermark',        NULL, false),
('603', 'Deutschlandsberg',             'Steiermark',        NULL, false),
('606', 'Graz Umgebung',               'Steiermark',        NULL, false),
('610', 'Leibnitz',                     'Steiermark',        NULL, false),
('611', 'Leoben',                       'Steiermark',        NULL, false),
('612', 'Liezen',                       'Steiermark',        NULL, false),
('614', 'Murau',                        'Steiermark',        NULL, false),
('616', 'Voitsberg',                    'Steiermark',        NULL, false),
('617', 'Weiz',                         'Steiermark',        NULL, false),
('620', 'Murtal',                       'Steiermark',        NULL, false),
('621', 'Bruck-Mürzzuschlag',          'Steiermark',        NULL, false),
('622', 'Hartberg-Fürstenfeld',        'Steiermark',        NULL, false),
('623', 'Südoststeiermark',            'Steiermark',        NULL, false),
-- Tirol (9 Bezirke)
('701', 'Innsbruck (Stadt)',            'Tirol',             NULL, false),
('702', 'Imst',                         'Tirol',             NULL, false),
('703', 'Innsbruck Land',               'Tirol',             NULL, false),
('704', 'Kitzbühel',                    'Tirol',             NULL, false),
('705', 'Kufstein',                     'Tirol',             NULL, false),
('706', 'Landeck',                      'Tirol',             NULL, false),
('707', 'Lienz',                        'Tirol',             NULL, false),
('708', 'Reutte',                       'Tirol',             NULL, false),
('709', 'Schwaz',                       'Tirol',             NULL, false),
-- Vorarlberg (4 Bezirke)
('801', 'Bludenz',                      'Vorarlberg',        NULL, false),
('802', 'Bregenz',                      'Vorarlberg',        NULL, false),
('803', 'Dornbirn',                     'Vorarlberg',        NULL, false),
('804', 'Feldkirch',                    'Vorarlberg',        NULL, false),
-- Wien (1 Einheit; Gemeindebezirke 901-923 nicht im MVP-Seed)
('900', 'Wien',                         'Wien',              NULL, true)
ON CONFLICT (gkz3) DO UPDATE SET
  name       = EXCLUDED.name,
  bundesland = EXCLUDED.bundesland,
  wien_flag  = EXCLUDED.wien_flag;

-- Validierung: Anzahl muss 94 sein
DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.districts;
  IF cnt <> 94 THEN
    RAISE EXCEPTION 'Bezirksanzahl % != 94 erwartet', cnt;
  END IF;
  RAISE NOTICE 'districts seed OK: % Bezirke', cnt;
END $$;
