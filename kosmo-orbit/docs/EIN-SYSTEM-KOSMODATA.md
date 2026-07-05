# Ein System — KosmoData ⊃ KosmoReference + KosmoAsset

**Owner-Entscheid (05.07.2026).** Übernahme der Codex-Aufgabe. Zielbild und
Richtung sind hier verbindlich festgehalten; gebaut wird nach dem
Modellgebrauch aus `KI-MODELL-GUIDELINE.md` (Opus orchestriert, Sonnet baut).

## Architektur (Owner-Korrektur — wichtig)

- **KosmoOrbit (Desktop) ist der Hauptort** — ein *volles* Tool. Hier lebt der
  **Master-Datenbestand**: der öffentliche Teil **und** später viel mehr
  **lokale, bürospezifische Daten, die NICHT veröffentlicht werden**.
- **Website (`architekturkosmos.ch`) läuft parallel** weiter, ist aber nur der
  **veröffentlichte, öffentliche Ausschnitt** (Rechte-Gate greift dort).
- Wir **holen alle Infos + Code von der Website nach KosmoOrbit** und bauen sie
  dort als volle Stationen — im KosmoOrbit-Idiom (`@kosmo/ui`, `--k-*`,
  `data-testid`, Design-System-only), nicht als Copy-Paste des Next.js-Codes.
- **Ein System:** **KosmoData = Überbegriff**, darin **KosmoReference**
  (Architekturprojekte) + **KosmoAsset** (Assets). Assets hängen via
  `kosmodata_refs` an Referenzprojekten.

## KosmoData = Wissensarchiv · Gedächtnis · Trainingsbasis (Owner-Erweiterung 05.07.)

**Wichtig:** KosmoData ist **nicht nur Projekte + Assets**, sondern das
**ganze Wissens-, Gedächtnis- und Trainingsarchiv** von KosmoOrbit. Am HomePC
ist das faktisch **alles, was auf der HDD liegt** — die eine Architektur-
Datenbank plus die gesamte Ausbildung von Kosmo. KosmoData ist das **Dach**;
KosmoPrepare (Aufnahme/RAG) und KosmoTrain (Training/LoRA) sind **Werkzeuge/
Ansichten** darauf, keine getrennten Silos.

Typisierte Sammlungen unter dem Dach KosmoData:

1. **Referenzen** — Architekturprojekte (Batch 1–2 ✅).
2. **Assets** — Bauteile/Objekte/Materialien (Batch 3–5 ✅).
3. **Wissen** — die Architektur-Wissensbasis: SIA/bfu/eBKP-Normen, Bücher,
   HSLU/ETH-Vorlesungen, Theorie (heute `wissen/` + KosmoPrepare-RAG).
4. **Training** — Trainingsdaten für Kosmo, **zwei Achsen**:
   (a) über **Architektur** (Fachwissen, Bürostil/Golden Rules),
   (b) über die **Software selbst** (KosmoOrbit-Doku, Commands, ROADMAP,
   Nutzung) — damit Kosmo die Software bedienen, erklären und verbessern kann.
5. **Gedächtnis** — Kosmos Erinnerung: Lernjournal, Memory (heute
   `@kosmo/ai` journal + KosmoTrain-JSONL für die LoRA).

Alles davon ist **lokal/privat am HomePC** (Master). Die Website veröffentlicht
nur die freigegebene Teilmenge — und **nur** aus Referenzen/Assets; Wissen,
Training und Gedächtnis bleiben privat.

## Datenrichtung

- **Master = KosmoOrbit** (Superset: privat + öffentlich).
- **Website = publizierte Teilmenge** (nur rechte-freigegeben).
- Gemeinsamer Vertrag in `schema/`: `kosmo-reference.schema.json` (neu, Superset
  mit Sichtbarkeits-/Publish-Flag) + `kosmo-asset-library.schema.json` (da).
- Heute konsumiert der Desktop die Website-API read-only. Neue Richtung: der
  Desktop hält den vollen Bestand; **Publizieren Desktop → Website** (gegateter
  Export) ist ein späterer Schritt, kein V1-Blocker.

## Ist-Stand (Bestandsaufnahme 05.07., 4 Explore-Agenten)

- **KosmoReference Website:** voller Explorer (Suche/Filter/Raster-Index/
  Pagination), Detail via `/atlas/[slug]`, 2 Piloten (Villa Savoye, Ingenbohl).
  Reiches `Entry`-Modell in `lib/types.ts`, 112 Einträge in
  `data/mock-entries.json`, Rechte-Gate in `lib/public-kosmo.ts`.
- **KosmoData Desktop (Gold-Standard):** Suche, Facetten, Sammlung, Detail-Aside,
  Live-Sync-Statusband, „3D ins Modell" — aber schlankes `RefEntry` + schlanker
  Seed `kosmodata-seed.json` (nur Teilfelder).
- **KosmoAsset:** grösstes Delta — Desktop `GlbObjekt` ist nur GLB-Blob ohne
  Metadaten; reiches `kosmo-asset-library.schema.json` existiert, aber nur in
  CLI-Scripts; Website zeigt flache Projektion.

## Bau-Fahrplan (Batches — Sonnet baut, Opus prüft)

1. **Referenz-Kanon in KosmoOrbit:** `schema/kosmo-reference.schema.json`
   (Superset aus `lib/types.ts`), reicher `RefEntry`-Typ in `@kosmo/data`,
   reicher Seed für KosmoOrbit aus `data/mock-entries.json` (volle Felder:
   media, analysis_layers, geo, model_assets, rights, database_profile),
   Vitest Seed↔Schema. Alles grün, Goldens stabil.
2. **KosmoReference-Station ausbauen:** reiche Felder sichtbar (Medien-Galerie,
   Analyse-Ebenen, Geo/Karte, Rechte), Detailansicht wie das Atlas-Dossier, aber
   nativ. Sammlung/Facetten bleiben.
3. **KosmoAsset-Datenmodell:** Desktop-Asset von „nur GLB" → Manifest-Eintrag
   nach `kosmo-asset-library.schema.json` (Titel/Typ/Kategorie/Tags/Formate/
   Rechte/`kosmodata_refs`) + IndexedDB-Migration (v3→v4, Blobs erhalten).
4. **KosmoAsset-Station wie KosmoData:** Suche, Facetten, Sammlung, Detail-Aside,
   Swatch/Wireframe-Vorschau.
5. **Ref↔Asset-Verknüpfung:** „Assets dieses Projekts" / „gehört zu Projekt X".
6. **Website parallel halten + Aufräumen + Gates + Tests + Doku:** Website baut
   weiter (nichts kaputt), Wissen-Duplikat klären, relevante `public:*`-Gates
   grün, Vitest/E2E, ROADMAP.

## Nächste Serie — KosmoData als Wissens-/Gedächtnis-/Trainings-Dach (Serie D)

Nach Batch 6 (Codex-Übernahme abgeschlossen) folgt die Erweiterung aus dem
Owner-Auftrag oben. Grober Zuschnitt (Detailplan bei Start):

- **D1 — KosmoData-Dach-Modell:** ein gemeinsames Datenmodell/Index über die
  fünf Sammlungen (Referenzen · Assets · Wissen · Training · Gedächtnis) mit
  Herkunft, Rechte/`visibility`, Tags. KosmoData wird die Startseite/Übersicht
  über den gesamten Bestand.
- **D2 — Wissen unter das Dach:** `wissen/`-Korpora + KosmoPrepare-RAG als
  KosmoData-Sammlung sichtbar/durchsuchbar (nicht mehr nur RAG-intern).
- **D3 — Training sichtbar & pflegbar:** Trainingsdaten (Architektur **und**
  Software-Selbstwissen) als Sammlung — Kuration, Export-JSONL für die LoRA
  (KosmoTrain), inkl. Aufnahme von KosmoOrbit-Doku/Commands als Software-Korpus.
- **D4 — Gedächtnis:** Lernjournal/Memory als KosmoData-Sammlung, verknüpft mit
  Projekten/Wissen.
- **D5 — HomePC-Archiv:** Ablage-/Import-Weg für „alles auf der HDD" (grosse
  lokale Bestände) — bewusst lokal/privat, nie in die Website.

## Grenzen (ehrlich)

Die ~400 `kosmo:*`/`public:*`-Governance-Scripts der Website sind
Planungs-/Prüfgerüst — wir bauen das **Produkt** (Stationen + Daten + Verknüpfung)
auf KosmoData-Niveau, nicht jedes Governance-Script „fertig".
