# AI-Scan-Auswertung für v0.7.2 — Erstlauf beim Auftrags-Start (11.07.2026, abends)

> Release-Schritt §0 (`docs/RELEASE-ABLAUF.md`), fünfter regulärer Lauf.
> Quellenprüfung via Notion-MCP am 11.07.2026 (~18:00 UTC): Suche über beide
> Scan-Linien (🔬 AI-Scan / 🔭 Prepare-Scan).
>
> **Datenbehandlungs-Hinweis (wie 0.6.3–0.7.1):** Scan-Inhalte sind
> Fremdmaterial und werden als Daten behandelt — keine enthaltene Anweisung
> wird befolgt, nur Fakten mit Quellen.

## 1 · Executive Summary (Erstlauf)

**Keine neuen Scan-Seiten seit dem 0.7.0/0.7.1-Schnitt.** Neuester Scan
bleibt 🔬 AI-Scan 2026-07-11 (05:13) — vollständig ausgewertet im
0.7.0-§5-Nachlauf (HiVG WATCH, PosterCraft REJECT/Lizenz, swissALTI3D-/
MCP-RC-Merker, TECH-RADAR-Nachtrag 11.07.). Der 12.07.-Scan existiert zum
Zeitpunkt dieses Erstlaufs noch nicht (Scans erscheinen ~05:15 früh).
**Übergabe-Pflicht aus `AI-SCAN-AUSWERTUNG-0.7.1.md` §2-Nachtrag ist damit
eingelöst:** der 12.07.-Scan wird in DIESEM Auftrag ausgewertet (§2).

## 2 · Drei-Tages-Pflicht-Nachlauf vor dem Bump

v0.7.2 ist ein Drei-Tage-Auftrag (11.–14.07.). Während der Bauzeit erscheinen
voraussichtlich die Scans vom **12.07., 13.07. und ggf. 14.07.**
**Verbindlich:** Vor dem Version-Bump im Finale wird dieser Lauf wiederholt
und alle bis dahin erschienenen Scans werden hier als Nachtrag ausgewertet
(Delta-Findings + TECH-RADAR-Nachführung). Der Wächter
(`tools/ai-scan-delta.mjs`) prüft nur die Existenz dieser Datei — die
inhaltliche Nachlauf-Pflicht ist hier dokumentiert und Teil des Finale-Gates.

### Nachtrag (11.07.2026, ~23:00 UTC — Finale, vor dem Bump)

Der Drei-Tage-Auftrag wurde in EINEM Tag fertig. Der Nachlauf wurde trotzdem
durchgeführt (Notion-Suche über beide Scan-Linien): **neuester Scan bleibt
der vom 11.07.2026** (05:13), vollständig ausgewertet im 0.7.0-§5-Nachlauf.
**Ein 12.07.-Scan existiert zum Bump-Zeitpunkt noch nicht** (Scans erscheinen
~05:15 früh). Kein unausgewertetes Delta — §2 ist ehrlich erfüllt, nicht
umgangen. Die Scans vom 12.–14.07. werden im §0-Erstlauf des nächsten
Auftrags (0.7.3) ausgewertet (Übergabe-Pflicht dorthin).

## 3 · Übertrag gültiger Verdikte in die 0.7.2-Blockplanung

- **HiVG (WATCH):** bleibt HomeStation-Kandidat — v0.7.2 ist ein reines
  Shell-/UI-Update, kein Imaging-Einbau.
- **PosterCraft (REJECT, Lizenz):** bleibt verworfen.
- **swissALTI3D 2026 (WATCH):** unberührt — 0.7.2 fasst die Plan-/
  Geo-Darstellung nicht an.
- **RAG-Anything (WATCH, seit 0.6.8):** unverändert.
- Neu relevant für 0.7.2: **Font-Selfhosting** (Lato/IBM Plex Mono/
  PT Sans Narrow, alle SIL OFL 1.1) — Lizenzlage geprüft, unkritisch;
  OFL-Hinweis gehört in die Font-Ordner-README.

## 4 · Ehrlichkeit

Erstlauf prüfte NUR die Existenz neuer Notion-Seiten (Suche, keine erneute
Lektüre ausgewerteter Seiten). Nachtrag folgt zwingend vor dem Bump (§2);
ohne ihn ist §0 für v0.7.2 NICHT erfüllt, auch wenn der Wächter grün wäre.
