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

## Teil 2 — gemeinsamer Lauf (Tag C, 20.07.2026, NACH allen Landungen)

**Ist == Prognose, exakt. Kein Hard-Stop.** Alle 7 Pakete gelandet
(P-A1 553 · P-A2 554 · P-A3 557 · P-B1 558 · P-B3 559 · E7 560 ·
P-B2 561); Prüf-HEAD `1f40ea2` gegen die Release-Basis `0dff918`
(v0.8.10 «Inselrein»).

1. **git-Beweis (definitiv):** `git diff --name-status 0dff918..HEAD --
   kosmo-orbit/packages/kosmo-kernel/test/golden/` zeigt GENAU eine
   Zeile: `A …/plan-schloss.svg` — kein `M`, kein `D`. 0 bewegte
   Bestands-Goldens, +1 neuer, **40 Dateien** total (39 SVG + 1 IFC).
2. **sha-Beweis:** aggregierte sha256 der 38 Bestands-SVG
   (`ls *.svg | grep -v plan-schloss | sort | xargs sha256sum |
   sha256sum` im golden/-Verzeichnis) = `c8b634aceba1d2fc…` — auf
   `0dff918` und `1f40ea2` identisch (folgt aus 1., die Methode ist hier
   festgehalten, damit Teil 2 künftiger Versionen denselben Befehl
   nutzt; der in ROADMAP 559 notierte P-B3-Zwischenwert `67cee224…`
   entstand mit anderer Aggregation und ist NICHT vergleichbar).
3. **svg-qa:** `npm run svg-qa` → **39 Goldens geprüft, 0 harte Fehler**,
   4 bekannte Text-Overlap-Warnungen (Baseline-Bestand, bewusst lange
   Musterwerte) — 38→39 gezählte SVG, wie prognostiziert.
4. **Suiten-Rerun am Prüf-HEAD:** Kernel 1180/1180 (enthält alle
   40 Golden-Byte-Vergleiche inkl. plan-schloss.test.ts), App 1728/1728.
