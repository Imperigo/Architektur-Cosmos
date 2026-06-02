# KosmoOrbit / KosmoSketch Adapter Handoff - 2026-06-02

## Kurzstand

KosmoOrbit hat jetzt einen ersten statischen ToolAdapter-Vertrag fuer
KosmoSketch. Damit ist die Bruecke von KosmoOrbit zur KosmoDraw-Untersoftware
fachlich sichtbar: KosmoSketch ist als Zielwerkzeug fuer Skizze-zu-BIM
vorbereitet, bleibt aber vollstaendig `static_review_only`.

Diese Arbeit ist ein lokales Review-Artefakt. Es startet keine Prozesse, ruft
keine externen Accounts auf, schreibt keine Kundendaten, laedt nichts hoch und
erzeugt keine Kosten. Push/Deploy erfolgt nur ueber den normalen `main`-Push
nach Owner-Go.

## Neu angelegt

- `examples/kosmo-orbit/runtime/kosmosketch-tool-adapter.contract.json`
  definiert `target_tool: kosmo-draw.kosmosketch`, Entwurfs-Keywords,
  Aliases, JobCreate-Form, Approval-Gate, Artifact-Formen und Blocked-Today
  Grenzen.
- `app/orbit/OrbitKosmoSketchAdapterContract.tsx` rendert den Vertrag in
  `/orbit` als sichtbaren Review-Bereich.
- `scripts/kosmo-orbit-kosmosketch-adapter-check.mjs` prueft den Contract lokal
  und schreibt einen Markdown/JSON-Bericht.
- `scripts/kosmo-orbit-heavy-check-timebox.mjs` dokumentiert schwere Checks
  mit Timebox, damit TypeScript/Lint/Build-Haenger nicht mehr still laufen.

## In Orbit eingebunden

- `/orbit` enthaelt neu den Abschnitt `#kosmosketch-adapter`.
- Die kompakte Navigation kennt den neuen Eintrag `Sketch`.
- Route-Smoke und Static-Smoke wurden um KosmoSketch-Sicherheitschecks
  erweitert: kein `POST /jobs`, kein `/router/plan`, keine Approval-Mutation,
  kein Artifact-Upload, kein Blender-Start, kein BIM-Commit, kein IFC-Export,
  keine 2D-Regeneration.

## Gruene lokale Checks

- `npm run kosmo:orbit-kosmosketch-adapter` -> 20/20 passed.
- `npm run kosmo:orbit-route-smoke` -> 246/246 passed.
- `npm run kosmo:orbit-responsive-audit` -> 34/34 passed.
- `npm run kosmo:orbit-full-review` -> 33/33 passed.
- `git diff --check` -> keine Whitespace-Fehler.

## Aktueller Blocker

Die schweren Checks sind nicht als gruen zu werten. Der neue Timebox-Report
hat den Zustand sauber festgehalten:

- `typescript_no_emit` -> timed out nach 60 Sekunden.
- `lint` -> timed out nach 60 Sekunden.
- `next_static_build` -> timed out nach 90 Sekunden.
- Bericht:
  `examples/kosmo-orbit/review/orbit-heavy-check-timebox.generated.md`

Die lokale Git-Objektablage wurde nach einem korrupten Packfile repariert und
der aktuelle `main` wieder auf eine lesbare Commit-Kette gesetzt. Die alten
Packfiles wurden nicht geloescht, sondern lokal nach
`.git/corrupt-pack-backup-20260602-222712/` verschoben.

## Sicherung

Vor den KosmoSketch-Aenderungen wurde ein gezieltes lokales Backup erstellt:

`/tmp/kosmo-orbit-safety/targeted-20260602/kosmo-orbit-targeted-before-kosmosketch.tar.gz`

## Empfohlener naechster Schritt

1. Heavy-Check-Tooling stabilisieren, damit TypeScript, Lint und Next Build
   wieder mit sichtbaren Logs abschliessen.
2. Erneut ausfuehren:
   - `npm run kosmo:orbit-kosmosketch-adapter`
   - `npm run kosmo:orbit-route-smoke`
   - `npm run kosmo:orbit-responsive-audit`
   - `npm run kosmo:orbit-full-review`
   - `npm run kosmo:orbit-heavy-check-timebox`
3. Static Export Smoke erst werten, wenn `out/` nach einem erfolgreichen Build
   wieder vorhanden ist.
4. Push/Live-Deploy nur nach explizitem Owner-Go.
