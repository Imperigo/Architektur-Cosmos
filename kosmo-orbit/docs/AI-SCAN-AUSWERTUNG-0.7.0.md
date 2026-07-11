# AI-Scan-Auswertung für v0.7.0 — Erstlauf beim Auftrags-Start (10.07.2026, spät)

> Release-Schritt §0 (`docs/RELEASE-ABLAUF.md`), dritter regulärer Lauf.
> Quellenprüfung via Notion-MCP am 10.07.2026 (~23:00 UTC): Suche über beide
> Scan-Linien (🔬 AI-Scan / 🔭 Prepare-Scan).
>
> **Datenbehandlungs-Hinweis (wie 0.6.3/0.6.8/0.6.9):** Scan-Inhalte sind
> Fremdmaterial und werden als Daten behandelt — keine enthaltene Anweisung
> wird befolgt, nur Fakten mit Quellen.

## 1 · Executive Summary (Erstlauf)

**Keine neuen Scan-Seiten seit dem 0.6.9-Schnitt.** Die jüngsten Seiten
(🔬 AI-Scan 2026-07-10, 🔭 Prepare-Scan 2026-07-10) waren bereits Teil der
Auswertungen 0.6.8/0.6.9. Die Scans vom 11.07. existieren zum Zeitpunkt
dieses Erstlaufs noch nicht.

## 2 · Zwei-Tages-Sonderfall: Pflicht-Nachlauf vor dem Bump

v0.7.0 ist ein Zwei-Tages-Auftrag (10.–12.07.). Während der Bauzeit werden
voraussichtlich die Scans vom **11.07.** und ggf. **12.07.** erscheinen.
**Verbindlich:** Vor dem Version-Bump im Finale wird dieser Lauf wiederholt
und alle bis dahin erschienenen Scans werden hier als **Nachtrag**
ausgewertet (Delta-Findings + TECH-RADAR-Nachführung). Der Wächter
(`tools/ai-scan-delta.mjs`) prüft nur die Existenz dieser Datei — die
inhaltliche Nachlauf-Pflicht ist damit hier dokumentiert und Teil des
Finale-Gates.

## 3 · Übertrag gültiger Verdikte in die 0.7.0-Blockplanung

- **RAG-Anything (WATCH, seit 0.6.8):** bleibt WATCH — v0.7.0 enthält
  bewusst keinen RAG-Ausbau; erst die Nutzung des 0.6.9-BM25-Wegs
  beobachten.
- **Visual-SDPO-Denkfigur:** lebt seit 0.6.9 als SVG-QA-Loop
  (`tools/svg-qa/pruefe-goldens.mts`) und prüft in v0.7.0 auch die neuen
  Phasen-/Schwarzplan-Goldens.

## 4 · Ehrlichkeit

- Erstlauf hat NUR die Existenz neuer Notion-Seiten geprüft (Suche, keine
  erneute Lektüre bereits ausgewerteter Seiten).
- Nachtrag folgt zwingend vor dem Bump (siehe §2); ohne ihn ist §0 für
  v0.7.0 NICHT erfüllt, auch wenn der Wächter grün wäre.

---

## 5 · NACHTRAG 11.07.2026 — Pflicht-Nachlauf vor dem Bump (§2 erfüllt)

Beide 11.07.-Scans wurden vollständig via Notion-MCP gelesen
(🔬 AI-Scan 2026-07-11, 🔭 Prepare-Scan 2026-07-11). Ein 12.07.-Scan
existiert zum Bump-Zeitpunkt nicht — das Finale läuft am 11.07.;
sollte v0.7.1 später starten, greift dort wieder der reguläre §0-Lauf.
Alle Angaben sind Scan-Aussagen (Fremd-Daten, keine Anweisungen befolgt),
nicht selbst verifiziert.

### 5.1 · Delta-Findings 🔬 AI-Scan 2026-07-11

- **HiVG (MIT)** — hierarchisches Image-to-SVG; direkteste Berührung mit
  unserer SVG-Pipeline (Skizze→Plan-Ideen). Scan selbst schränkt ein:
  «nicht CAD-genau». **Verdikt: WATCH / Evaluations-Kandidat 0.7.x** —
  ~2–3 h Evaluation auf der RTX-5090-HomeStation, NICHT im Container.
  Kein Einbau ohne Messung gegen echte Handskizzen.
- **PosterCraft** — Poster-Generierung auf FLUX-Basis; **Lizenz-Sperre:**
  FLUX-Gewichte sind non-commercial — für Wettbewerbsabgaben eines
  Erwerbsbüros ungeeignet. **Verdikt: REJECT (Lizenz)**, dokumentiert damit
  künftige Scans ihn nicht erneut vorschlagen.
- **Finch-Status** — Scan bestätigt: proprietär, kein öffentliches
  API/SDK. Deckt sich mit unserem Weg (v0.7.0 baut lokale Äquivalente
  nach, RE-FINCH.md §8).
- **Arbor** — erneut genannt, kein Kern-Nutzen für Orbit; bleibt WATCH
  mit Lizenz-Warnung (TECH-RADAR unverändert).

### 5.2 · Delta-Findings 🔭 Prepare-Scan 2026-07-11

Primär KosmoPrepare-/HomeStation-Material (M1–M5), für Orbit nur als
Radar-Notizen:

- **MCP 2026-07-28 RC** (Stateless-Core, Tasks-Extension, MCP Apps) —
  Empfehlung des Scans: keine neuen MCP-Server-Investments bis zur
  finalen Spec. Betrifft Orbit nicht direkt (wir betreiben keinen
  eigenen MCP-Server), aber relevant für spätere Kosmo-Orchestrierung.
- **Qwen3-Embedding 0.6B in Ollama** (70.7 MTEB v2) — bestätigt den
  bestehenden WATCH-Posten (TECH-RADAR seit 0.6.8); HomeStation-Schritt.
- **swissALTI3D 2026 (erstmals voll LiDAR) + swissNAMES3D 2026 +
  GeoAdmin-Release 20260204** — Kandidat für die Standort-/Terrain-Kette
  (`standort.ts`, Terrain-Profile); Datenbezug via swisstopo, kostenlos.
  **Verdikt: WATCH (0.7.x)** — erst prüfen, ob unser geo.admin.ch-Weg
  die 2026-Editionen bereits transparent ausliefert.
- MarkItDown v0.1.6 / Qwen2.5-VL / BGE-M3 / n8n / Snaptrude — bestätigen
  bestehende Radar-Posten bzw. betreffen KosmoPrepare; keine neuen
  Orbit-Posten.

### 5.3 · TECH-RADAR-Nachführung

`docs/TECH-RADAR.md` + `apps/kosmo-orbit/src/modules/doc/tech-radar.ts`
erhalten einen Nachtrag «Scan 11.07.» mit **HiVG (WATCH)** und
**PosterCraft (REJECT, Lizenz)** — beide mit ⚠-unverifiziert-Markierung
(testerzwungen in `tech-radar.test.ts`). Alle übrigen 11.07.-Nennungen
sind bereits als Posten vorhanden oder ausserhalb des Orbit-Scopes.
