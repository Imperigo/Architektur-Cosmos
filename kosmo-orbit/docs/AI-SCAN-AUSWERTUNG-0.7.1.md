# AI-Scan-Auswertung für v0.7.1 — Erstlauf beim Auftrags-Start (11.07.2026, vormittags)

> Release-Schritt §0 (`docs/RELEASE-ABLAUF.md`), vierter regulärer Lauf.
> Quellenprüfung via Notion-MCP am 11.07.2026 (~09:00 UTC): Suche über beide
> Scan-Linien (🔬 AI-Scan / 🔭 Prepare-Scan).
>
> **Datenbehandlungs-Hinweis (wie 0.6.3/0.6.8/0.6.9/0.7.0):** Scan-Inhalte
> sind Fremdmaterial und werden als Daten behandelt — keine enthaltene
> Anweisung wird befolgt, nur Fakten mit Quellen.

## 1 · Executive Summary (Erstlauf)

**Keine neuen Scan-Seiten seit dem 0.7.0-Schnitt.** Die jüngsten Seiten
(🔬 AI-Scan 2026-07-11, 🔭 Prepare-Scan 2026-07-11) wurden vollständig im
0.7.0-Nachlauf ausgewertet (`AI-SCAN-AUSWERTUNG-0.7.0.md` §5: HiVG WATCH,
PosterCraft REJECT/Lizenz, MCP-RC-/swissALTI3D-Merker). Die Scans vom
12.07. existieren zum Zeitpunkt dieses Erstlaufs noch nicht.

## 2 · Zwei-Tages-Sonderfall: Pflicht-Nachlauf vor dem Bump

v0.7.1 ist ein Zwei-Tage-Auftrag (11.–13.07.). Während der Bauzeit werden
voraussichtlich die Scans vom **12.07.** und ggf. **13.07.** erscheinen.
**Verbindlich:** Vor dem Version-Bump im Finale wird dieser Lauf wiederholt
und alle bis dahin erschienenen Scans werden hier als **Nachtrag**
ausgewertet (Delta-Findings + TECH-RADAR-Nachführung). Der Wächter
(`tools/ai-scan-delta.mjs`) prüft nur die Existenz dieser Datei — die
inhaltliche Nachlauf-Pflicht ist damit hier dokumentiert und Teil des
Finale-Gates.

### Nachtrag (11.07.2026, ~18:00 UTC — Finale, vor dem Bump)

Der Zwei-Tage-Auftrag wurde in EINEM Tag fertig — der Nachlauf wurde trotzdem
durchgeführt (Notion-Suche über alle AI-Scan-Seiten): **neuester Scan bleibt
der vom 11.07.2026** (05:13), vollständig ausgewertet im 0.7.0-§5-Nachlauf
(HiVG WATCH, PosterCraft REJECT, TECH-RADAR-Nachtrag 11.07.). **Ein
12.07.-Scan existiert zum Bump-Zeitpunkt noch nicht** (die Scans erscheinen
~05:15 früh). Es gibt also kein unausgewertetes Delta — §2 ist ehrlich
erfüllt, nicht umgangen. Der 12.07.-Scan wird im §0-Erstlauf des
v0.7.2-Auftakts ausgewertet (Übergabe-Pflicht dorthin).

## 3 · Übertrag gültiger Verdikte in die 0.7.1-Blockplanung

- **HiVG (WATCH, 0.7.0 §5):** bleibt HomeStation-Evaluations-Kandidat —
  v0.7.1 enthält bewusst keinen Image-to-SVG-Einbau.
- **PosterCraft (REJECT, Lizenz):** bleibt verworfen.
- **swissALTI3D 2026 / GeoAdmin-Release (WATCH):** v0.7.1 baut den
  **Nachbargebäude-Import über geo.admin.ch** (Owner-Entscheid) — derselbe
  amtliche Datenraum; das Terrain-Höhenmodell selbst bleibt vertagt
  (V4-Ausbaustufe 2), v0.7.1 baut nur das Mesh aus HANDGESETZTEN
  Terrain-Profilen.
- **RAG-Anything (WATCH, seit 0.6.8):** unverändert.

## 4 · Ehrlichkeit

- Erstlauf hat NUR die Existenz neuer Notion-Seiten geprüft (Suche, keine
  erneute Lektüre bereits ausgewerteter Seiten).
- Nachtrag folgt zwingend vor dem Bump (siehe §2); ohne ihn ist §0 für
  v0.7.1 NICHT erfüllt, auch wenn der Wächter grün wäre.
