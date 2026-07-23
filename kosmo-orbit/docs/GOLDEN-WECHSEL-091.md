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

## Teil 2 — Ist-Nachweis (P-B3-Gate, Fable, 23.07.2026)

**Ist == Prognose, punktgenau:**
- **0 bewegte Bestands-Goldens.** Beweis doppelt: (1) `git status --short --
  kosmo-orbit/packages/kosmo-kernel/test/golden/` zeigt AUSSCHLIESSLICH
  `?? gelaender-rampe-plan.svg`; (2) Aggregat der 40 Bestandsdateien
  (sha256sum-Zeilenliste, neue Datei herausgefiltert) vor dem Zug
  `c11f6d448327…` == nach dem Zug `c11f6d448327…` — byte-identisch.
  (Methoden-Notiz: ein erster Vergleich wich ab, weil die Nachher-Rechnung
  über `$(ls …)`-Argumente statt über die identische Zeilenlisten-Methode
  lief — Artefakt der Aufrufform, per identischer Methode widerlegt.)
- **+1 NEUER Golden `gelaender-rampe-plan.svg`** (kombiniertes Fixture
  `testhausGelaenderRampe`: L-Geländer 3000+2500 mm → 7 Pfosten-Ticks
  [4 + 3, Knick einmal], Rampe 3 m/300 mm = «10.0 %» im ehrlichen
  6–15-%-Durchlauf-Bereich). Golden-Bestand 40 → **41 Dateien**
  (40 SVG + 1 IFC).
- **svg-qa: 40/0** — 40 SVG-Goldens geprüft, 0 harte Fehler (die bekannten
  4 weichen Text-Overlap-Warnungen der Bestands-Musterwerte, unverändert).
- Kernel-Suite 1218 → **1221** (Guard-Beweis über Bestands-Fixtures +
  Struktur-Beweis der Zerlegungs-Wahrheit + Byte-Golden), Typecheck Exit 0.
- **PNG-Sichtung durch Fable:** L-Zug mit Ticks an beiden Schenkeln und am
  Knick, Rampen-Kontur mit Lauflinie, bergauf-Pfeilkopf am Kopfende und
  «10.0 %»-Text — Hochbau-Konvention erfüllt, keine Kollisionen.
