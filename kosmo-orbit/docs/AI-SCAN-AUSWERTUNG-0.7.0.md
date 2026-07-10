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
