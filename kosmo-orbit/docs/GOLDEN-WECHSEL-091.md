# GOLDEN-WECHSEL-091 — der EINE Zug von v0.9.1 «Trittsicher»

## Teil 1 — Prognose (VOR jeder Landung, Fable, 22.07.2026)

Der eine deklarierte Golden-Zug dieser Version ist **P-B3**: Geländer- und
Rampen-Darstellung im Druckweg (derive/plan.ts + plansvg.ts), beides hinter
Daten-Guards («nur wenn Entität im Geschoss existiert», Muster Masskette
plan.ts:1085-1099).

**Prognose:**
- **0 bewegte Bestands-Goldens** (40 Dateien: 39 SVG + 1 IFC bleiben
  byte-identisch — kein bestehendes Fixture enthält ein Geländer- oder
  Rampen-Entity, die Guards greifen überall).
- **+1 NEUER Golden: `gelaender-rampe-plan.svg`** (EIN kombiniertes Fixture
  mit einem Geländer-Polylinienzug UND einer Rampe — ein Zug, eine Datei).
- svg-qa: 39 → **40** SVG-Goldens, 0 harte Fehler.
- Aggregat-Rezept (vom Repo-Root, Referenz vor dem Zug):
  `cd kosmo-orbit/packages/kosmo-kernel/test/golden && sha256sum *.svg *.ifc | sha256sum`
  — die 40 Bestandswerte müssen nach dem Zug einzeln identisch sein.

Abweichung Ist ≠ Prognose bei P-B3 = **Hard-Stop** (Sanktion 1). Alle
anderen Pakete (P-A1/P-A2/P-T/P-B1/P-B2/P-C) sind golden-still — jeder
Gate-Lauf prüft `git status --short -- kosmo-orbit/packages/kosmo-kernel/
test/golden/` NUR vom Repo-Root (cwd-Falle!).

## Teil 2 — Ist-Nachweis

_(offen — wird beim P-B3-Gate ausgefüllt: Ist-Zahlen, Aggregat vorher/nachher,
PNG-Sichtung durch Fable.)_
