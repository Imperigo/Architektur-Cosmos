# KosmoOrbit — die Architektur-Designzentrale

Eigenständiger Workspace im ArchitekturKosmos-Repo (die Website im Root bleibt
unberührt). Desktop (Tauri: macOS/Windows/Linux) + iPad (PWA), lokale KI über
die HomeStation. Proprietär — siehe `docs/OWNER-MANDAT.md` (Q29).

## Schnellstart

```bash
cd kosmo-orbit
npm ci
npm run dev -w @kosmo/orbit-app     # Browser, http://localhost:5173
npm test                            # alle Unit-Suiten
npx playwright test                 # E2E (baut dist und startet Preview selbst)
```

Desktop-Installer und iOS-Projekt baut die CI:
`.desktop-build-request` bzw. `.ios-build-request` ändern und pushen →
Artefakte am Workflow-Lauf. Abnahme: `docs/ABNAHME-DREHBUCH.md`.

## Aufbau

| Pfad | Was |
|---|---|
| `packages/kosmo-kernel` | BIM-Kern, pure TS ohne DOM/three: Entities (int-mm), Commands (zod = KI-Tool-Schema, invertierbare Patches = Undo/Yjs/Journal), Ableitungen (3D-Szene, symbolischer Grundriss, Schnitt/Ansicht mit Hidden-Line, Blätter, SVG/DXF/IFC/GLB, SIA-416, Checks, Volumenstudien, Schatten) |
| `packages/kosmo-ui` | Aura-Designsystem: Tokens (Papier/Tinte, Kupfer), Komponenten, Logo |
| `packages/kosmo-ai` | LLM-Provider (Ollama/Demo), Tool-Registry aus Commands, Personas, Journal |
| `packages/kosmo-contracts` | zod-Contracts: render-scene/result, kosmo.project.json, Bridge-API, .kosmo |
| `apps/kosmo-orbit` | Die App: Shell + Module Design/Data/Vis/Publish/Prepare, Kosmo-Panel, ⌘K-Palette, Projekt-Tresor (Autosave), PWA + `src-tauri` |
| `tools/homestation-bridge` | Python/FastAPI für den Büro-PC: /jobs, /stt (Whisper), /tts (Piper/Chatterbox), /embed (bge-m3), Ollama-Proxy; `--fake-worker` für Tests ohne GPU |
| `tools/sync-server` | Yjs-Live-Sync (Hocuspocus + SQLite) |
| `e2e/` | Playwright-Abnahmetests + `tools/` (Galerie- und Golden-Skripte) |

## Arbeitsregeln (Kurzfassung)

- **`ROADMAP.md` ist der Fortsetzungsanker** — jede Session liest sie und führt
  sie nach. Owner-Entscheide: `docs/OWNER-MANDAT.md`. Tech-Wahl: `docs/TECH-RADAR.md`.
- Commands sind die einzigen Schreiber am Modell (Maus, Skizze, Sprache, Chat
  und Kosmo laufen alle über denselben Weg; KI-Vorschläge immer gated).
- Golden-Dateien (`packages/kosmo-kernel/test/golden/`) nur nach bewusster
  Plan-Änderung neu erzeugen (`e2e/tools/golden-ansicht.mts`) und im Diff begutachten.
- Lizenzen: MIT/Apache/BSD/ISC/MPL bündelbar; GPL/AGPL nur als separater
  HomeStation-Prozess.
