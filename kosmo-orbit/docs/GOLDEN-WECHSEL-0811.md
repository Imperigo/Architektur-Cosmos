# GOLDEN-WECHSEL 0811 — strengste Form (0 bewegt, +1 neu)

v0.8.11 «Inselgleich» hat genau EINEN sanktionierten Golden-Zug:
E5 (Schloss-Symbol im Plan-SVG, Fable-solo, hinter meta.locked-Daten-Guard).
Referenzbasis nach v0.8.10 (beleg-geprüft am Release-HEAD 0dff918):
**39 Dateien** (38 SVG + 1 IFC), svg-qa zählt dynamisch.

## Teil 1 — Erwartungsliste (Prognose, VOR allen Landungen)

| Paket | bewegte Bestands-Goldens | neue Goldens |
|---|---|---|
| P-A1 Publish-Insel-Parität | 0 (reine Insel-/e2e-Ebene) | 0 |
| P-A2 Line-Art Node-Param | 0 (App-Ebene; Kernel-Schema offen, KEINE Kernel-Änderung — beleg-geprüft vis.ts:78-82) | 0 |
| P-A3 Plan-Griffe Runde 2 | 0 (reine Interaktions-Ebene) | 0 |
| P-B1 Vis-Inseln Ansichten+Legende | 0 (neue Insel-Dateien) | 0 |
| P-B2 Flake-Härtung | 0 (nur Spec-Dateien) | 0 |
| **P-B3 Schloss-Symbol** | **0** (Daten-Guard: ohne meta.locked byte-still) | **+1** (`plan-schloss.svg`, locked-Fixture) |
| E7 Treppen-z-Griff (Kapazität) | 0 (Viewport3D) | 0 |

**Erwartung Teil 2:** 0 bewegte Bestands-Dateien, exakt +1 neue →
40 Dateien, svg-qa 39/0, aggregierte sha256 der 38 Bestands-SVG vor/nach
identisch. **Jede Abweichung = Hard-Stop**, Fable klassifiziert vor jeder
Freigabe. Die Prognose ist gegen die Daten-Guards geprüft (Lehre 545:
der Schloss-Zweig greift NUR bei meta.locked — kein Bestands-Golden hat
locked-Daten, grep-geprüft).

## Teil 2 — gemeinsamer Lauf (Tag C, NACH allen Landungen)

Noch offen — Ritual wie GOLDEN-WECHSEL-0810 Teil 2 (vierstufig, mit
sha-Beweis und svg-qa).
