# GOLDEN-WECHSEL 0810 — Mini-Wechsel (Plancode zweite Zeile)

v0.8.10 «Inselrein» hat genau EINEN sanktionierten Golden-Beweger:
E5/Z2 (Plancode als zweite Zeile im Blattverzeichnis, Fable-solo,
Owner-Wahl 19.07.). Referenzbasis nach v0.8.9: **39 Dateien**
(38 SVG + 1 IFC), svg-qa 38.

## Teil 1 — Erwartungsliste (Prognose, VOR allen Landungen)

| Paket | bewegte Bestands-Goldens | neue Goldens |
|---|---|---|
| P-A Worker-Runner | 0 (reine Python-Werkzeugebene) | 0 |
| P-B1 vis-Spec-Migration | 0 (reine e2e-Ebene) | 0 |
| P-B2 Manuell-Rückbau | 0 (App/Seed/Doku) | 0 |
| Z1 Blatt-Umbenennen | 0 (nur Setzweg neu, kein Default ändert — Probelauf-Pflicht im Gate) | 0 |
| **Z2 Plancode zweite Zeile** | **2**: `blattverzeichnis.svg`, `blattverzeichnis-legende.svg` | 0 |
| Z5 Inspector-Ausbau | 0 (reine App-Ebene) | 0 |
| Z3/Z6 (nach Kapazität) | 0 | 0 |

**Erwartung Teil 2:** exakt 2 bewegte Dateien (beide aus Z2), die
übrigen 37 sha256-identisch, weiterhin 39 Dateien, svg-qa 38/0.
**Jede Abweichung = Hard-Stop**, Fable klassifiziert den Diff vor jeder
Freigabe.

### Ist-Korrektur nach der Z2-Landung (20.07., ROADMAP 545)

Der Z2-Mini-Wechsel bewegte **1** Datei statt der prognostizierten 2:
`blattverzeichnis.svg` (Golden 1, ohne Plankopf-Stammdaten) blieb
**byte-identisch**, weil die Daten-Guard-Logik unverändert griff — ohne
Plancode gab es schon vorher weder Spaltenkopf noch Sechst-Spalte, und
die neue Zweitzeile samt erhöhter Zeilenhöhe greift nur `mitPlancode`.
Die Prognose hatte den Guard übersehen (Abweichung nach unten =
stabiler als erwartet, kein Sanktions-1-Fall: bewegt wurde nur eine
DEKLARIERTE Datei). Beweis im Z2-Gate: sha256-Vorher/Nachher-Liste —
37 von 38 SVG identisch + `blattverzeichnis.svg` identisch, einzig
`blattverzeichnis-legende.svg` neu (`6e5a09ae…` → `b8c65038…`),
svg-qa 38/0. **Erwartung für Teil 2 damit: 0 neue Treffer** (der eine
bewegte Golden ist mit Z2 committet).

## Teil 2 — gemeinsamer Lauf (Tag C, NACH allen Landungen)

**Vollzogen 20.07.2026 (Fable, HEAD `3c71f10` — alle Pakete 538–549 im
Baum):** EIN gemeinsamer `GOLDEN_UPDATE=1 npx vitest run`-Lauf im Kernel
(59 Dateien/1170 Tests grün), vierstufige Verifikation:

1. `git status` nach dem Lauf: **0 Treffer** (der eine bewegte Golden
   war mit Z2/`75dad53` committet — Ist == korrigierte Prognose).
2. `git diff --stat`: leer.
3. Aggregierte sha256 ALLER 39 Golden-Dateien vor/nach dem Lauf
   byte-identisch: `d3c2586f0d9b7e6f2b118a8918d075174b6d455b8f7e4c56…`.
4. svg-qa: 38 Goldens geprüft, 0 harte Fehler (4 bekannte weiche
   Text-Overlap-Warnungen).

Damit ist der Mini-Wechsel dieser Version abgeschlossen: **1 bewegte
Datei über die ganze Version** (`blattverzeichnis-legende.svg`, Z2),
38 SVG + 1 IFC unangetastet, +0 neue.
