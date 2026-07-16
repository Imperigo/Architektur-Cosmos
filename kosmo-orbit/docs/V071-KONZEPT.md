# V0.7.1 «Echt statt Attrappe» — Konzept & Kernentscheide (11.07.2026)

Owner-Auftrag: Zwei-Tage-Grossauftrag nach Fable-Empfehlung; Schwerpunkt
**«Echt statt Attrappe»** — die Stellen, wo die App heute ehrlich «noch
nicht» sagt, werden echt. Owner-Entscheide: Nachbargebäude aus
**geo.admin.ch** (amtlich, kein OSM); Umfang zwei Tage.

Dieses Dokument ist die verbindliche Spec für die Bau-Wellen. Es ergänzt
den genehmigten Plan (Fable-Ultraplan) um die Ist-Stand-Präzisierungen aus
dem Vertrags-Audit.

## Ist-Stand-Audit (gegen den ECHTEN 0.7.0-Stand, cb6093a)

1. **Kosmo-Blick:** Der Anthropic-Bild-Block-Weg EXISTIERT seit 0.6.8
   vollständig (`anthropic.ts` `InhaltsBlock` inkl. `image`,
   `zuAnthropicNachrichten` hängt `images` als base64-Blöcke an;
   Contract-Tests in `test/blick-bilder.test.ts` inkl. Blockstruktur).
   **Der ehrliche Rest** (im Test-Header selbst dokumentiert): kein echter
   Bildcall bewiesen, kein Downscale (Capture ist ungebremstes PNG in
   Naturgrösse), kein bildspezifischer Fehlerpfad, kein Kosten-Hinweis.
   → E1 ist HÄRTUNG + BEWEIS, nicht Neubau.
2. **Nachbarn:** Nur Parzellen-identify existiert
   (`ch.kantone.cadastralwebmap-farbe`, DesignWorkspace); `standort.ts`
   verankert am Parzellen-Zentrum; `schwarzplan.ts` kennt eigene
   Footprints + Parzelle, keine Nachbarn. `zonenArt:'parzelle'` (0.7.0)
   ist das additive Muster für `'nachbar'`.
3. **DXF:** Zwei Exporter — `dxf/export.ts` (R12-Writer, y-Spiegelung,
   semantische Layer, Import-Kopplung, Determinismus-Tests,
   LAYER_BEMASSUNG deklariert aber leer) ist der Anker;
   `derive/dxf.ts` (Library, KEINE y-Spiegelung, befüllt Bemassung aus
   `deriveDimensions`) hängt nur noch an PublishWorkspace.
4. **Ref-3D:** Lokaler Blob→glb-guard→setGlbContext-Pfad bewiesen
   (e2e/ref3d-laden.spec, echtes Mesh-Fixture seit 0.7.0); `r2_key` in
   `RefEntryModelAsset` ist ein GEPLANTER CDN-Schlüssel ohne Resolver.
   Leak-Gates (privatspur/referenz-seed) sind harte Verträge.
5. **Terrain:** Terrain-Entities fliessen in Schnitt/Plan, NICHT in
   `derive/scene.ts` — kein 3D-Geländemesh (A4-Rest).
6. **Fenster:** Parametrische Fenster (0.6.9) haben 3D-Rahmenprofile;
   nicht-parametrische Öffnungen sind reine Löcher; nirgends Glas.
   Plan hat Flügelbögen (+ `fensterBoegen`-Schalter, 0.7.0); Ansicht hat
   KEINE Öffnungssymbolik; `swing` existiert am Opening, `fluegelTyp`
   nicht.

## Kernentscheide (verbindlich)

**E1 — Blick-Cloud echt.**
- **1A (kosmo-ai):** (i) bildspezifischer Fehlerpfad im AnthropicProvider —
  HTTP-Fehler mit Bild im Request → deutsche, konkrete Meldung
  («Bild zu gross …» bei Payload-Fehlern statt generischem Fehler);
  (ii) `bildBudget()`-Vorabprüfung (base64-Länge → ehrliche Meldung VOR
  dem Netz-Roundtrip, Limit dokumentiert ~5 MB je Bild API-seitig, wir
  kappen konservativ); (iii) zusätzliche Contract-Tests (Bild+Tool-Mix
  über mehrere Turns, Reihenfolge Bild-vor-Text bleibt);
  (iv) ScriptedProvider lernt ein Bildecho («[Bild empfangen: NxM]») für
  E2E-Beweise. KEINE DOM-APIs in kosmo-ai.
- **2A (App):** (i) Downscale im Capture (`kosmo-blick.ts`): Canvas auf
  ≤ ~1.15 MP skalieren + JPEG-Re-Encode (q≈0.8) — Laufzeit-Store, nie
  ins Doc; (ii) Kosten-/Grössen-Hinweiszeile am Blick-Chip (nur in
  Betriebsart cloud); (iii) `e2e/kosmo-blick-cloud.spec.ts`:
  page.route auf `api.anthropic.com/v1/messages` → Assert: Request-Body
  trägt `type:'image'`-Block; gefakte SSE-Antwort fliesst in den Chat;
  Zustand ohne Schlüssel bleibt ehrlich; (iv)
  `e2e/oauth-roundtrip.spec.ts`: Login-Flow gegen Fake, Token-Persistenz,
  Abmelden. Echter Call mit Owner-Schlüssel bleibt Owner-Abnahme —
  Drehbuch in BETRIEBSARTEN (5B).

**E2 — Nachbarn amtlich.**
- **1B (Kernel):** `zonenArt` um `'nachbar'` erweitern (Muster
  'parzelle': von NGF/SIA-416/pruefeGrundriss ausgenommen);
  `standort.ts`: Anker-Refactor (`ringsZuOutline(rings, anker{e,n})` —
  `parzelleZuOutline` delegiert, Verhalten byte-gleich) +
  `nachbarnZuOutlines(rings[], anker)`; `schwarzplan.ts`: Nachbar-Zonen
  als graue Footprints (`#8a8a8a`, eigene bleiben schwarz, Parzelle
  strichpunktiert — Situationsplan-Usanz «eigenes Objekt hervorgehoben»);
  Command `design.nachbarnUebernehmen({storeyId, outlines: Pt[][]})` —
  legt Nachbar-Zonen an, EIN Undo-Schritt, ersetzt vorhandene
  Nachbar-Zonen desselben Geschosses (Re-Import idempotent). Golden
  `schwarzplan-nachbarn.svg` hinter Daten-Guard; Alt-Goldens
  byte-identisch.
- **2B (App):** zweiter identify-Aufruf neben dem Parzellen-identify.
  **Layer-Verdikt (Fable, live verifiziert 11.07. gegen
  api3.geo.admin.ch):** `ch.swisstopo.vec25-gebaeude` ist der einzige
  identify-fähige Layer, der Gebäude-POLYGONE (rings, LV95) liefert —
  `ch.bfs.gebaeude_wohnungs_register` und das Adressverzeichnis liefern
  nur Punkte, `swissbuildings3d_2_0`/`swisstlm3d-gebaeude` sind keine
  GeoTables, `ch.swisstopo-vd.amtliche-vermessung` liefert Liegenschaften
  (Parzellen), keine Gebäude. **Ehrlichkeits-Fussnote (UI + Doku):**
  VECTOR25 hat Datenstand ~2008 — amtlich, aber nicht tagesaktuell;
  neuere Gebäude können fehlen. Für die Situationsplan-Körnung
  akzeptabel, im Import-Dialog offen benannt.
  Import-Knopf «Nachbarn übernehmen» im Standort-Panel (nur nach
  Parzellen-Import aktiv; identify mit Box-Geometrie ~120 m um das
  Parzellen-Zentrum via `geometryType=esriGeometryEnvelope`, Features
  dedupliziert per featureId; Polygone, die das eigene Parzellen-Zentrum
  enthalten, werden NICHT importiert); e2e/nachbarn-import.spec.ts mit
  gemocktem fetch.

**E3 — DXF-Konsolidierung.** Bemassungs-Emission (Ketten aus
`deriveDimensions`: Linie + Ticks + Label) in `dxf/export.ts`
LAYER_BEMASSUNG — y-gespiegelt (`y=-v`), Text durch `dxfText()`
(ASCII-Vertrag), stabile Sortierung (Determinismus-Test).
PublishWorkspace → `planToDxf`. `derive/dxf.ts` + Re-Export entfernen;
`@tarikjabiri/dxf` aus dependencies wenn ungenutzt. **Bewusster
Verhaltenswechsel:** Publish-DXF ist künftig y-gespiegelt (konsistent
mit Design-Export/Import) und trägt semantische Layer — in neuigkeiten
+ INTEROP.md ehrlich benannt. Roundtrip-Test + Import: LAYER_BEMASSUNG
wird beim Import bewusst NICHT zu Entities (Bemassung ist Ableitung) —
Import ignoriert den Layer dokumentiert.

**E4 — Ref-3D-Remote + Terrain-Mesh.**
- Resolver `modellUrlAusR2Key(key)` in kosmo-data (Basis-Konstante
  `https://archiv.architekturkosmos.ch/` — dokumentiert als geplanter
  CDN-Host, R2 kann unbefüllt sein); DataWorkspace-Kaskade: lokales
  Asset → remote (fetch→Blob→glb-guard→setGlbContext, Fehler 404/Netz
  ehrlich gemeldet) → `ref3d-kein-lokal`-Hinweis erweitert um
  «Remote nicht erreichbar»; Leak-Gates unberührt (URL NUR aus r2_key).
  e2e/ref3d-remote.spec.ts: page.route liefert e2e/fixtures/dreieck.glb.
- Terrain: `derive/scene.ts` trianguliert das Terrain-Profil zu einem
  Gelände-Band-Artefakt (`kind:'terrain'`, hinter Daten-Guard — ohne
  Terrain-Entity ändert sich NICHTS an der Szene); Viewport3D rendert
  matt (kein Schatten-Empfang nötig), Raycast-Boden bevorzugt das
  Terrain-Mesh, Fallback Ebene. Bestehende Szene-/Mesh-Tests bleiben.

**E5 — Fenster echt.**
- **4A (3D):** Neue additive Szene-Artefakte je Fenster-Öffnung:
  Glas-Ebene (mittig in der Laibung) + Standardrahmen-Loop für
  NICHT-parametrische Fenster (parametrische behalten Profile, kriegen
  Glas). `extrudeWallWithOpenings` UNBERÜHRT. Weissmodell/Schwarzmodell:
  Glas behält Transparenz (0.7.0-Regel). Türen: KEIN Glas (nur Fenster).
- **4B (Plan/Ansicht):** `Opening.fluegelTyp?:
  'dreh'|'kipp'|'drehkipp'|'schiebe'|'fest'` additiv;
  `design.fensterParametrieren` + `eigenschaftSetzen` erweitert;
  **Ansicht** (`derive/`-Ansichtsweg): SIA-Öffnungssymbolik — Dreieck
  von den Bandpunkten zur Griffseite (Dreh), zur Unterkante (Kipp),
  beides (Drehkipp), Pfeil (Schiebe), nichts (fest); Linien dünn
  (0.18er-Klasse). **Grundriss:** Kipp ergänzt ein kurzes
  Doppelstrich-Symbol am Flügel; bestehende Bögen + fensterBoegen-
  Schalter unverändert. `fluegelTyp` undefined ⇒ heutiges Bild
  byte-identisch (Goldens!). Neue Goldens `ansicht-fluegeltypen.svg` +
  `grundriss-kipp.svg` mit Rubrik + svg-qa. Inspector: KSelect
  «Flügeltyp». IFC/DXF crash-frei (kein Beschlag-Detail — ehrlich).

## Vertrags-Audit
- `toBe(18)`-Werkzeugzähler (seit v0.8.1: 17, Splat-Fusion §8 Sanktion 1):
  lebt in `e2e/oberflaeche-minimal.spec.ts:132` — KEIN neues Leisten-
  Werkzeug in diesem Auftrag (Import-Knopf sitzt im Standort-Panel, nicht in
  der Werkzeugleiste).
- Goldens: alle neuen Derive-Ausgaben hinter Daten-/Typ-Guards
  (Nachbarn nur bei Nachbar-Zonen, Terrain nur bei Terrain-Entity,
  Flügel-Symbolik nur bei fluegelTyp, Glas-Artefakte ändern PLAN nicht).
  DXF-Bemassung ändert dxf-export/import-Fixtures BEWUSST (Tests werden
  im selben Stream nachgeführt, kein SVG-Golden betroffen).
- Leak-Gates kosmo-data: Remote-URL ausschliesslich aus `r2_key`.
- exactOptionalPropertyTypes: `fluegelTyp?`, `zonenArt`-Erweiterung,
  Resolver-Optionals — konditionale Spreads.
- Journeys EFH/MFH bleiben Regressionsanker; 5A erweitert additiv.

## Ehrlichkeits-Grenzen (im UI/Doku offen benannt)
- Echter Anthropic-Bildcall braucht Owner-Schlüssel → Abnahme-Drehbuch
  (BETRIEBSARTEN), E2E beweist den Request-Bau, nicht die Antwort der
  echten API.
- R2/CDN kann unbefüllt sein → Remote-Fehler wird gezeigt, nicht
  versteckt.
- geo.admin-Gebäude-Layer: liefert er keine Polygone, entfällt der
  Import-Knopf ehrlich (Fallback manuell erfasste Nachbar-Zonen).
- Terrain-Mesh basiert auf HANDGESETZTEN Profilen (kein swissALTI3D —
  vertagt, WATCH).
