# Übergabe an die neue Claude-Code-Sitzung — Auftrag: v0.7.7-Handbuch

**Datum:** 2026-07-13 · **Branch:** `claude/kosmo-orbit-v1-build-pzxkbj` · **Basis:** v0.7.7

## 0) ZUERST — Stand sichern (Rollback-Riegel)
Dieser Web-Container wurde in vorherigen Sitzungen wiederholt auf einen alten
0.6.6-Snapshot (Commit `20b9247`) zurückgerollt. **Bevor du irgendetwas tust:**
```bash
cd /home/user/Architektur-Cosmos    # bzw. Repo-Wurzel
git fetch origin claude/kosmo-orbit-v1-build-pzxkbj
git rev-parse HEAD                                  # NICHT 20b9247 erwarten
git rev-parse origin/claude/kosmo-orbit-v1-build-pzxkbj
# Wenn lokal dahinter/auf 0.6.6:
git reset --hard origin/claude/kosmo-orbit-v1-build-pzxkbj
```
Kontrolle, dass du auf v0.7.7 bist: `STAND.md` existiert **und**
`grep 0.7.7 kosmo-orbit/apps/kosmo-orbit/src/shell/neuigkeiten.ts` liefert Treffer.
Der SessionStart-Hook `.claude/hooks/session-start.sh` macht das automatisch —
aber prüfe es trotzdem von Hand. **`origin` ist die Wahrheit, nicht der Container.**

## 1) Auftrag (Owner-Wunsch, wörtlich sinngemäss)
Ein **vollumfängliches v0.7.7-Software-Handbuch als PDF**, das die *ganze*
Software zeigt: **jede Station, jede Funktion, jedes Werkzeug — was es kann, wie
man es bedient — UND wie die Software aufgebaut ist** (Architektur/Technik).

**Owner-Entscheide (bereits geklärt):**
- **Format:** PDF-Handbuch (HTML→PDF via Playwright), schön gestaltet.
- **Screenshots:** echte Screenshots jeder Station eingebettet.
- **Tiefe:** VOLL — jede Funktion *und* kompletter Architektur-/Command-Teil.
- **Sprache:** Deutsch (die App und alle Docs sind deutsch).

## 2) Bauplan
**Generator:** neues Tool `kosmo-orbit/e2e/tools/handbuch-077.mts` nach dem
Vorbild von `kosmo-orbit/e2e/tools/handbuch.mts` (V1-Finish P6) und
`rundgang-pdf.mts` (HTML→PDF, Notiz-/Kapitel-Layout, Bilder als data-URI).

**Screenshots:** `kosmo-orbit/e2e/tools/rundgang.mts` auf v0.7.7 laufen lassen →
`kosmo-orbit/docs/rundgang/bilder/` neu erzeugen, dann ins PDF einbetten.
(Helfer nötig: Bridge `--fake` :86xx, Preview-Build, `setsid`, siehe CLAUDE.md.)

**Kapitel je Station** — Zweck · jedes Panel/Werkzeug/Knopf · Schritt-für-Schritt-
Bedienung · Screenshot. Stationen mindestens:
Zentrale/Orbit-Start · Design/BIM (3D-Viewport + Werkzeuge) · 2D-Pläne (Grundriss/
Schnitt/Axo) · KosmoVis (Node-Graph) · KosmoData (Daten-Dach) · KosmoReference ·
KosmoAsset · KosmoPrepare · Kosmo-KI (Chat/Diff-Karten) · KosmoSketch (Draw) ·
KosmoSpeak · KosmoPublish (Plakat/Blatt) · Dev-Auftragsbuch · Doc/Tech-Radar ·
Studien. Plus die 0.7.x-Neuerungen (Arbeitsmodi/Modus-Chip, Motion, Kosmo-UI-
Brücke, Betriebsarten Standard/Remote/Cloud, adaptive Werkzeugleiste, Gesten).

**Architektur-Teil (voll):**
- Datenfluss **Command → Patch → (Undo / Yjs-Sync / .kosmo-Pakete)**; `derive/`
  ist rein (Plan/Schnitt/Axo/SIA-416-Mengen/Szene/Render-Graph aus dem Doc).
- **Vollständige Command-Liste** aus `packages/kosmo-kernel/src/commands/`
  (jedes `registerCommand` = ein Kosmo-LLM-Tool; nach Domäne gruppieren).
- Entities · `packages/kosmo-ai` (Provider Ollama/LM-Studio/Anthropic/Mock,
  ChatSession, `commandTools()`, Personas, Lernjournal/Memory) ·
  `packages/kosmo-contracts` (HomeStation render-scene/v1, blender-sim,
  video-splat; Betriebsarten) · Pakete-Landkarte (ui/data/sync).

**Inhaltsquellen zum Wiederverwenden (wörtlich zitieren, nicht neu erfinden):**
- `kosmo-orbit/apps/kosmo-orbit/src/shell/neuigkeiten.ts` — 0.7.0–0.7.7-Bullets.
- `kosmo-orbit/ROADMAP.md` — Einträge ~300–348 (0.7.x-Featureset, mit Daten).
- `kosmo-orbit/INSTALL.md`, vorhandene `kosmo-orbit/docs/`.

## 3) Abschluss (WICHTIG: sofort pushen — sonst frisst ein Rollback es)
- PDF nach `kosmo-orbit/abgabe/HANDBUCH-KosmoOrbit-0.7.7.pdf`.
- `SendUserFile` an den Owner.
- ROADMAP-Eintrag (vor dem «Phase 3 abgeschlossen»-Marker) + deutscher Commit mit
  Trailern → **push auf `claude/kosmo-orbit-v1-build-pzxkbj`** → `local == origin`
  verifizieren. Zwischenstände ebenfalls zügig committen+pushen.

## 4) Verifikation
- Build lief auf bestätigtem v0.7.7 (HEAD == echter origin-HEAD nach fetch).
- PDF öffnet, enthält ALLE Stationen mit Screenshots + den Architektur-Teil.
- Vollsuite/Gates grün, falls Code angefasst wurde (nur der Generator ist neu;
  `rundgang.mts`-Screenshots berühren keinen Produktivcode).

## 5) Umgebungs-Hinweis für den Owner
Falls auch neue Sitzungen auf 0.6.6 hochkommen, ist die **Environment-Quelle**
selbst auf den 0.6.6-Stand gepinnt und muss im Web-UI aktualisiert werden
(https://code.claude.com/docs/en/claude-code-on-the-web). Dann dem Owner melden.
