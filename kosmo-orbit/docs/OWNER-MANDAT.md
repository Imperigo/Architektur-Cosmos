# KosmoOrbit V1 — Finaler Bauplan (ArchitekturKosmos)

## Context

Der Owner (Architekt, Innerschweiz) beauftragt Fable, das ArchitekturKosmos-Ökosystem als **V1-Produkt** zusammenzubauen: KosmoOrbit (Shell) + KosmoDesign (CAD/BIM) + KosmoDraw (BIM-Semantik) + Kosmo (lokale KI, Speak-to-Kosmo) + KosmoData (Reference/Asset) + KosmoVis/Publish/Prepare-Integration. Desktop (Mac/Win/Linux) + iPad, synchron, elegantes Architekten-Design. Produkt FÜR den Architekten, nicht als Ersatz.

Grundlagen vollständig gelesen: Vision-Paper (docx), KosmoVis-ETH-Bericht (12 S.), Notion AI (2) inkl. Fable-Auftrag + Innovations-Verdicts + Owner-Workflow-Wissen (aGF=1.28×HNF, Geschosshöhen, Stützenraster 10.50–10.90 m), Kosmo-Tagesbericht 01.07., gesamtes Repo.

## Harte Constraints (ehrlich dokumentiert)

1. **Kein Zugriff auf HomeStation/4TB-SSD/OneDrive** aus dieser Cloud-Session. Nur: dieses Repo, Notion (read), Uploads. Die lokalen Opus-Lane-Codes sind unlesbar — aber alle Contracts sind bekannt (render-scene.json/v1, render-result.json/v2, kosmo.project.json, SIA-Plansätze).
2. **Owner-Direktive Speicherung**: NICHTS nur lokal — alles laufend committen + auf Branch `claude/kosmo-orbit-v1-build-pzxkbj` pushen (git = einziger persistenter Speicher; OneDrive-Connector existiert hier nicht).
3. Kein macOS/Xcode im Container → Mac/Win/Linux-Installer via GitHub-Actions-CI (tauri-action); iPad = installierbare PWA (Pencil via PointerEvents) sofort, Tauri-iOS als CI-Experiment.
4. Kein GPU/Blender/ComfyUI hier → KosmoVis als Job-Client + mitgelieferte HomeStation-Bridge (Python/FastAPI), echtes Rendern bleibt auf der 5090.

## Entscheidungen (32 Owner-Fragen, beantwortet 02.07.2026)

| # | Frage | Owner-Entscheid |
|---|---|---|
| 1 | Build-Ort | **In diesem Repo**: `apps/kosmo-orbit` + `packages/*` + `tools/*` (Workspaces). Website bleibt unberührt. |
| 2 | Desktop-Stack | **Tauri 2** + React 19 + TypeScript + Vite + three.js. |
| 3 | iPad | **PWA sofort + Tauri-iOS parallel** (CI-Target, Owner signiert). |
| 4 | 3D-Kern | **Eigener TS-BIM-Kern + Blender-Bridge** (kein Fork; Blender headless bleibt HomeStation-Backend via KosmoVis-Naht). |
| 5 | LLM | **Ollama, konfigurierbare URL** + Bridge-Proxy fürs iPad. Provider-abstrahiert (LM Studio/Anthropic optional nachrüstbar). |
| 6 | STT | **Whisper large-v3 auf HomeStation-Bridge** (`POST /stt`, Schweizerdeutsch→Hochdeutsch) + Normalisierungs-Pass; Browser-Fallback. |
| 7 | TTS | **Ja, via Bridge** (Piper/Kokoro, deutsche Stimme, an/aus-Schalter). |
| 8 | Lernprogramm | **Journal + RAG-Memory + LoRA-Trainings-Rezepte** für HomeStation. |
| 9 | Werkzeug-Prio | **ArchiCAD-Kern zuerst**, dann MassBody/Vorform, dann FreeMesh. |
| 10 | IFC | **Import + Export IFC4** (web-ifc rein, eigener SPF-Writer raus, HomeStation validiert). |
| 11 | 2D-Pläne | **Voll: live + assoziative Bemassung**, SIA-Stifte, 4er-Splitscreen synchron. |
| 12 | Entwurfs-Intelligenz | **ALLE vier**: Live-Kennzahlen (GF/aGF/HNF, Faktoren einstellbar), Volumenstudien-Generator (Extremvarianten in Boundaries), Schattenstudie (3h-Kriterium), Finch-Grundriss-Checks (Zimmerbreiten, Fluchtwege, Stützenraster/VSS). |
| 13 | KosmoData | **Lokale SQLite (D1-Port) + Sync von architekturkosmos.ch `/api/*`**. |
| 14 | KosmoAsset | **ALLE vier**: PBR-Materialien/Texturen (mit SIA-Schraffur-Zuordnung), GLB-Objekte, CH-Bauteilkatalog (Aufbauten), Referenz-3D aus KosmoData ins Modell laden. |
| 15 | Demo-Projekt | **TKB Bibliothek Hönggerberg** (7 Geschosse, Σ2814 m²). |
| 16 | Sync | **Live-Sync via HomeStation** (Yjs-CRDT, sync-server mitgeliefert) + `.kosmo`-Zip. |
| 17 | Akzentfarbe | **Fable entscheidet** — ich entwerfe die Palette frei, zeige sie früh als visuellen Test. (Arbeitsthese: warmes Terracotta/Kupfer auf Papier/Tinte.) |
| 18 | Themes | **Beide, Hell primär** (Papier); Tinte-Dunkel aus docs/design-system.md. |
| 19 | Branding | **Neues Orbital-Logo-System** (Dachmarke + abgeleitete Modul-Zeichen, präzises Linien-Icon-Set, animierter Start). |
| 20 | Animation | **Zurückhaltend-präzise** (edel, nie verspielt). |
| 21 | Lane-Zugriff | **Nein — frei bauen** (reines Fable-Produkt aus Contracts + Berichten). |
| 22 | Vis-Anbindung | **Bridge-Server** (FastAPI: /jobs→Job-Store, /stt, /tts, Ollama-Proxy, /validate-ifc; Token-geschützt, Büronetz). |
| 23 | Personas | **Kosmo vorne, Rest im Hintergrund** (Statusanzeige + @mention). |
| 24 | KosmoDoc | **Selbstdiagnose-Monitor + Hilfe-Chatmodus** + Playwright-Visualtests als KosmoDoc-Berichte. |
| 25 | Rhythmus | **Max-Session + /loop jetzt**; ROADMAP.md im Repo als Fortsetzungsanker für Folge-Sessions. |
| 26 | V1-Abnahme | **Voller Entwurfs-Loop**: öffnen → modellieren (Maus/Skizze/Sprache/Chat) → SIA-Pläne live → Flächenreport → IFC-Export → Render-Job → QA-Verdikt zurück → iPad synchron. |
| 27 | Git-Prozess | **Ein PR am Ende** (wenn V1-Snapshot steht); bis dahin nur Branch-Pushes. main deployt live — nie direkt anfassen. |
| 28 | Bauwissen | **Eingebautes CH-Bauwissen + Ingestion-Slot + OneDrive-Anbindung in der App** (Microsoft-Graph-Login in KosmoPrepare, damit Kosmo die Hochbauzeichner-Bibliothek direkt lesen kann). |
| 29 | Lizenz | **Proprietär/privat**; alle Dependencies kommerziell sauber (Apache/MIT, kein GPL-Link). |
| 30 | KosmoPublish | **Plansätze + PDF/SVG/DXF** (SIA-Blattlayouts A0–A4, Massstäbe, Plankopf). |
| 31 | Kosmo-Start | **Begrüssung in KosmoOrbit** (Text+Stimme, Projektstand, Tagesfokus); OS-Übernahme = V2. |
| 32 | Prioritäts-Herz | **«Alles gleich heilig»** — ausgewogene Tiefe über alle Säulen, der Abnahme-Loop (Q26) ist der Massstab. |

## Architektur (Kurzform — Details vom Plan-Agent validiert)

```
packages/
  kosmo-contracts/   # zod-Schemas: render-scene/v1, render-result/v2, kosmo.project.json, bridge-api, .kosmo-Manifest
  kosmo-kernel/      # BIM-Kern (pure TS, Web Worker): int-mm-Koordinaten, Entities (Storey/Grid/Wall+Schichtaufbau/
                     # Slab/Roof(Walm via Straight Skeleton)/Opening/Stair/Zone(SIA-416)/MassBody/FreeMesh),
                     # Command-System (zod-Params = KI-Tool-Schema, Undo via Patch-Inverse, Journal),
                     # Derive-Pipeline: 2D-Boolean vor Extrusion (kein 3D-CSG ausser Dach/FreeMesh),
                     # Grundriss SYMBOLISCH aus Parametrik, Schnitt/Ansicht via Mesh-Slice, SVG mit SIA-Stiften,
                     # IFC-Import (web-ifc) / Export (eigener Writer), sia416.ts (HNF→aGF-Faktoren einstellbar)
  kosmo-ai/          # Provider (Ollama/LMStudio/Anthropic, Streaming), Tool-Registry aus Commands (kontextuelle
                     # Subsets ≤15 Tools für lokale Modelle), Personas+Router, Memory/RAG (SQLite), STT/TTS
  kosmo-data/        # SQLite (D1-Schema-Port), Sync von architekturkosmos.ch API, Reference+Asset
  kosmo-sync/        # Yjs-Projekt-Doc (Commands = einzige Writer, Journal abgeleitet), y-websocket, .kosmo-zip
  kosmo-ui/          # Aura-Designsystem: Tokens, Icons, Logo, Komponenten, Motion
apps/kosmo-orbit/    # Shell (ModuleDock, CommandPalette, KosmoPanel-Chat, ProjectHome),
                     # Module: design (Viewport3D, 4er-ViewSplit, Tools, Inspector, SketchCanvas→BIM),
                     # data, vis (JobComposer/Monitor/QA-Verdikt), publish (SIA-Blätter/A0), prepare, settings
                     # + src-tauri (Desktop) + PWA-Manifest (iPad) + Playwright-E2E
tools/
  homestation-bridge/ # Python/FastAPI für Owner: /jobs (Job-Store-Naht zu KosmoVis), /stt (faster-whisper),
                      # /ollama/* Proxy (damit iPad die 5090 erreicht), /validate-ifc, WS /sync; --fake-worker für CI
  sync-server/        # y-websocket + .kosmo-Snapshots
.github/workflows/    # kosmo-orbit-ci (lint/unit/golden/playwright), kosmo-orbit-desktop (mac/win/linux), ios (manuell)
```

Wiederverwendung: `lib/types.ts` + `schema/architecture-cosmos-d1.sql` (verbatim portiert), `kosmo.project.json`-Contract, Worker-API als Datenquelle, EntryModelViewer/Atlas als Pattern, docs/design-system als Dunkel-Theme-Basis, 112 Einträge als Seed.

## Zeitplan (dynamisch, Owner-gewünscht: Monate→Wochen→Tage)

**Gesamtschätzung bis volles V1: ~16–19 Wochen** (Vollzeit-Äquivalent). Aufbruch:

- **M0 Gerüst** (Wo 1): Workspaces, App-Shell mit Aura-Design, Tauri+PWA, CI. *Exit: Shell läuft, Installer aus CI.*
- **M1 BIM-Kern + Viewport** (Wo 2–5): Entities, Commands+Undo, Geometrie-Libs, 3D-Derivation, Wand/Decke/Fenster-Tools, Snapping. *Exit: 2-geschossiges Modell interaktiv, Kernel-Tests ≥90%.*
- **M2 2D-Pläne + Splitscreen** (Wo 6–8): Walmdach, Treppe, Zonen+SIA-416, Grundriss/Schnitt/Ansicht-SVG, Bemassung, 4er-View synchron. *Exit: Pläne live beim Editieren, Golden-SVG-Tests grün.*
- **M3 Kosmo-Chat + Tool-Calling** (Wo 9–10): Provider, Tool-Registry, Diff-Karten-Gating, Personas, Memory. *Exit: „Erstelle 20cm-Wand A1→B3 im EG" via Chat.*
- **M4 KosmoData** (Wo 11–12): SQLite, API-Sync, Reference-Browser, Asset-Bibliothek→Typenkatalog. *Exit: 112 Einträge offline, Material aus KosmoAsset auf Wand.*
- **M5 Vis/Publish/IFC** (Wo 13–15): Render-Job-Client + Bridge, QA-Verdikt-Anzeige, SIA-Blätter/A0-Export, IFC-Roundtrip. *Exit: Bridge-Roundtrip (Stub) in CI, Plansatz-PDF, Bestand_Kontext.ifc importiert.*
- **M6 Sketch + Sprache** (Wo 16–17): KosmoSketch (Pencil→Wände/Massen, gated), KosmoSpeak (STT-Pipeline), KosmoPrepare v1 (PDF→Brief). *Exit: iPad-Skizze wird BIM; gesprochener Befehl läuft end-to-end.*
- **M7 Sync + Packaging + Politur** (Wo 18–19): Yjs-Live-Sync Desktop↔iPad, `.kosmo`-Zip, Installer-Politur, Onboarding, visuelle Testrunde. *Exit: gemeinsames Live-Editieren, volle E2E-Suite grün.*

**Diese Session**: M0 vollständig + maximaler Vorstoss in M1–M3 (Kern zuerst — grösster Hebel), mit laufenden Pushes nach jedem kohärenten Stand. Danach /loop-Fortsetzung; Tagespläne werden als `apps/kosmo-orbit/ROADMAP.md` im Repo gepflegt und dynamisch angepasst (schneller/langsamer → Rest verschiebt sich).

## Risiken (Top 5)

R1 web-ifc-Export unreif → eigener SPF-Writer, HomeStation-Validator. R2 CSG-Performance → 2D-Boolean vor Extrusion, Worker, Hash-Cache, Budget-Test (500 Wände <2s). R3 Tauri-iOS unreif → PWA ist committeter iPad-Pfad. R4 Lokale-LLM-Tool-Zuverlässigkeit → kleine Toolsets, JSON-Repair, gated Apply. R5 Kernel = längster Pfad → MassBody/FreeMesh früh als Ausweich, Treppe/Ansichten „basic" in V1.

## Verifikation

- **Unit (Vitest)**: SIA-416-Fixtures (handgerechnet), Geometrie (Skeleton/Boolean/Junctions), Command-Invarianten (fast-check: apply∘invert=id), Serialisierungs-Roundtrips.
- **Golden-Files**: SVG-Pläne normalisiert gegen committete Referenzen; IFC-Roundtrip (Export→Reimport→Graph-Diff ≤1mm); Contract-Schemas beidseitig.
- **Playwright (Chromium vorinstalliert, SwiftShader-WebGL)**: visuelle Snapshots der Shell + 4er-Splitscreen nach Skript-Aufbau, Chat-Flow mit Mock-Provider, PWA-Offline-Smoke. = die vom Owner geforderten **visuellen Tests**.
- **CI**: bei jedem Push Linux-Suite; Desktop-Matrix (mac/win/linux) via tauri-action auf Tag/manuell.

## Speicher-Direktive (Owner 02.07.)

Alles laufend auf `claude/kosmo-orbit-v1-build-pzxkbj` committen + pushen (Retry mit Backoff). Ein PR erst am Ende (V1-Snapshot). Keine nur-lokalen Artefakte; Scratchpad nur für Wegwerf-Zwischenschritte. Kein OneDrive-Zugriff aus der Session — aber OneDrive-Graph-Anbindung wird als App-Feature gebaut (Q28).

## Ablauf nach Freigabe (diese Session)

1. **M0**: Workspaces einrichten, `packages/kosmo-ui` (Aura-Tokens, Palette als visueller Test), App-Shell, Tauri-Scaffold, PWA-Manifest, CI-Workflows → erster Push.
2. **M1-Kern**: `kosmo-kernel` (Entities, Commands+Undo, Geometrie, Derive-3D, Worker), Viewport + Wand/Decke/Fenster-Tools → Pushes nach jedem kohärenten Stand.
3. **M2/M3 soweit möglich**: 2D-Pläne + Splitscreen, dann Kosmo-Chat mit Tool-Calling (Mock + Ollama-Config).
4. `ROADMAP.md` + Tagesbericht im Repo pflegen; Playwright-Visualtests ab M0; /loop bis Session-Ende; Folge-Sessions setzen an der ROADMAP fort.
