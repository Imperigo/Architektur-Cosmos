# KosmoOrbit — Arbeitsanleitung für Kosmo/Claude

> **⚠️ ZUERST: Stand prüfen.** Aktuelle Version = **v0.8.8** (Stand 19.07.2026);
> alles davor ist **Archiv**. Der Web-Container wird gelegentlich auf einen
> älteren Commit zurückgerollt — **immer vom echten Remote-Kopf ausgehen**
> (`git fetch origin claude/kosmo-orbit-v1-build-pzxkbj` +, falls lokal
> dahinter, `git reset --hard origin/…`). Details und die verbindliche Regel:
> **[`../STAND.md`](../STAND.md)**. Der SessionStart-Hook
> (`.claude/hooks/session-start.sh`) erzwingt das automatisch.
>
> **Versions-Hinweis:** Owner-Anzeigeversion und `package.json`/`Cargo.toml`/
> `tauri.conf.json`/`vite.config.ts` (`APP_VERSION`, fünfter Bump-Träger —
> beim v0.8.2-Release vergessen, P10-Fund ROADMAP 447) sind deckungsgleich
> **0.8.8**. Details in `../STAND.md`.

Dies ist die Architektur-Designzentrale des Baubüros Andrin (ArchitekturKosmos):
ein **lokal-first Monorepo** für Architektur — BIM-Kern, 2D-Pläne, Visualisierung,
Wissen und eine steuernde Büro-KI («Kosmo»). V1 ist fertig (04.07.2026,
ROADMAP 123). Diese Datei bringt einen neuen Worker in Minuten auf Betrieb.

## Was du zuerst liest

1. `ROADMAP.md` — 519 nummerierte Einträge (Stand v0.8.8), jeder ein
   abgeschlossenes Feature mit Belegen. Der jüngste Stand steht **unten** vor
   dem Marker «Phase 3 abgeschlossen».
2. `docs/V2-AUFTAKT.md` — der fertige Erst-Prompt und die V2-Prioritäten.
3. `docs/GESTALTUNGSKONZEPT.md` + `docs/OWNER-MANDAT.md` — Ästhetik und Owner-Regeln.
4. `docs/HOMESTATION-AUFTRAG.md` — was auf die RTX-5090-Heimstation wartet.
5. `wissen/training/claude/lehren/` — die letzten 2–3 Versionsdateien lesen,
   bevor du mit einem neuen Paket beginnst (Betriebskonzept:
   `docs/CLAUDE-LERNSCHLEIFE.md`).
6. `.claude/skills/` — sechs kuratierte Skills für den Claude-Code-Betrieb an
   diesem Repo (`orchestrierung`, `tiefplanung`, `gegenpruefung`,
   `parallel-pakete`, `lehren-gedaechtnis`, `claude-md-disziplin`; Attribution
   in `.claude/skills/QUELLEN.md`). Greifen situativ — vor Paket-Vergabe,
   grosser Planung, Abschluss-Gates, parallelen Paketen und
   `CLAUDE.md`-Änderungen.

## Setup

```bash
cd kosmo-orbit
npm install                 # Root-Workspace (npm workspaces)
npm run build               # baut alle Pakete + die App
npm test                    # 1111 Kernel + 1696 App + 322 KI + 41 Contracts + 44 Data + 8 Lizenz + 111 UI = 3333 (Stand v0.8.8)
npm run typecheck           # 8 Workspaces, exactOptionalPropertyTypes ist AN
npm run svg-qa              # 36 Goldens, 0 harte Fehler (4 weiche Text-Overlap-Warnungen, bewusst lange Musterwerte)
```

E2E (Playwright) braucht die Helferserver und den Preview-Build:

```bash
npm run build -w @kosmo/orbit-app
# Helfer (jeweils eigener Prozess, im Container mit setsid starten):
python3 tools/homestation-bridge/kosmo_bridge/main.py --fake --port 8600 &   # Fake-Render/STT/TTS
node    tools/sync-server/src/server.mjs &                                    # Yjs :8700
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test        # 81+ Tests
```

## Architektur in einem Absatz

Alles ist ein **Command** (`packages/kosmo-kernel/src/commands/`): `registerCommand({id, params: zodSchema, summarize, run})`. Jedes zod-Schema wird
über `commandTools()` automatisch ein **Kosmo-LLM-Tool** — was Kosmo kann, ist
genau die Menge der Commands. Ein Command gibt `AnyPatch[]` zurück (Patch oder
SettingsPatch); daraus fliessen Undo (Patch-Inverse), Yjs-Sync und die
`.kosmo`-Pakete. Schreibende Kosmo-Vorschläge werden Diff-Karten und laufen beim
«Anwenden» durch **denselben** `runCommand`-Weg — atomare Undo-Gruppen.
Ableitungen (`derive/`) sind pure Funktionen: Plan/Schnitt/Axo/Mengen/Szene/
Render-Graph entstehen aus dem Doc, nie umgekehrt.

## Pakete

- `packages/kosmo-kernel` — Entities, Commands, Geometrie, alle `derive/`.
- `packages/kosmo-ai` — Provider (Ollama/LM-Studio/Anthropic/Mock), ChatSession,
  Personas, Lernjournal.
- `packages/kosmo-contracts` — zod-Schnittstellen zur HomeStation (render-scene/v1).
- `packages/kosmo-ui` — Design-System `aura.css` + Komponenten (KButton, Panel,
  Meldungen/Bestätigung, Fehlerzone, Motion-Klassen).
- `packages/kosmo-data`, `packages/kosmo-sync` — Referenzdaten, Yjs-Client.
- `apps/kosmo-orbit` — die React-App (Stationen unter `src/modules/`, Shell unter
  `src/shell/`, Zustand/State unter `src/state/`).
- `tools/` — homestation-bridge (Python, `--fake` im Container), sync-server (Node).

## Eigenheiten, die dich sonst stolpern lassen

- **exactOptionalPropertyTypes**: optionale Felder brauchen konditionale Spreads,
  `...(x !== undefined ? { x } : {})`, statt `x: x ?? undefined`.
- **Golden-Tests** (`packages/kosmo-kernel/test/golden/*.svg`): müssen byte-identisch
  bleiben, wo ein neues Feature ohne Daten inaktiv ist. Neue Features hinter
  «nur wenn Daten vorhanden»-Guards halten die Goldens stabil.
- **Laufzeit ≠ Modell**: was durch Yjs/Undo geht, lebt im Doc; Base64-Bilder,
  GLB-Binärdaten und Job-Status gehören in Laufzeit-Stores (siehe
  `modules/vis/vis-runtime.ts`, `state/asset-bibliothek.ts`).
- **Helferserver sterben im Container** zwischen E2E-Läufen — mit `setsid` in
  eigenen Prozessen neu starten, dann die server-abhängigen Specs isoliert.
- **CI-Builds**: Desktop/iOS-Installer entstehen, wenn man
  `.desktop-build-request` bzw. `.ios-build-request` mit neuem Zeitstempel
  anfasst und pusht (Workflows `.github/workflows/kosmo-orbit-desktop.yml` /
  `-ios.yml`). Keine Signing-Keys — Update = neuer Installer.

## Modellgebrauch (Owner-Guideline — verbindlich)

`docs/KI-MODELL-GUIDELINE.md` regelt, **welches Modell welche Arbeit macht** —
für dieses Repo, für Kosmos Claude-Nutzung und für Kosmos lokale LLMs:
**Fable = Urteil (härteste 10–15 %), Opus = Orchestrierung, Sonnet = Ausführung
(inkl. Design gegen Spec).** Opus orchestriert und **delegiert Ausführung an
Sonnet-Subagenten**; das Spitzenmodell ist nie der Orchestrator. Lokal spiegelt
Kosmo das als **Kosmo-Meister / Kosmo-Leiter / Kosmo-Zeichner**.

## Arbeitsmuster (Owner-Mandat)

Je Block: Feature → Tests (+ E2E) → **ROADMAP-Eintrag** (vor dem Phase-3-Marker)
→ deutscher Commit mit Trailern → Push auf den **Entwicklungs-Branch**. Volle
Suiten je Batch. Ehrlichkeit vor Politur: was die HomeStation/ein Konto/ein
Schlüssel braucht, wird im UI offen benannt, nicht vorgetäuscht.

**Release-Ritual (zusätzlich, nur beim letzten Paket einer Version):** vor dem
letzten Release-Commit schreibt der ausführende Agent
`wissen/training/claude/lehren/vX.md` für die soeben abgeschlossene Version
(Gate/Konvention/Fehler/Owner-Entscheid, je mit Beleg) — Details in
`docs/CLAUDE-LERNSCHLEIFE.md`, der volle Release-Ablauf in
`docs/RELEASE-ABLAUF.md`.

## Branch

Entwickelt wird auf einem Feature-Branch, nie direkt auf dem Default-Branch.
Der aktuelle Entwicklungs-Branch ist `claude/kosmo-orbit-v1-build-pzxkbj`.
**`origin/<branch>` ist die Wahrheit, nicht der lokale Container** — siehe
[`../STAND.md`](../STAND.md) (Rollback-Riegel).
