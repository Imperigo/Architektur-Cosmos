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

## Teil 2 — gemeinsamer Lauf (Tag C, NACH allen Landungen)

Noch offen — Ritual wie GOLDEN-WECHSEL-089:

1. Alle Pakete im Baum, Suiten grün.
2. EIN gemeinsamer `GOLDEN_UPDATE=1 npx vitest run`-Lauf im Kernel.
3. Vierstufige Verifikation: `git status` (nur die 2 erwarteten
   Z2-Dateien, bereits mit Z2 committet → hier 0 neue Treffer) →
   `git diff --stat` → sha256-Liste der übrigen 37 vor/nach identisch →
   svg-qa 38/0.
4. Ist ≠ Prognose → Hard-Stop, Diff-Klassifikation durch Fable.
