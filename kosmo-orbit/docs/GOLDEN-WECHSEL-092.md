# GOLDEN-WECHSEL-092 — der EINE Zug von v0.9.2 «Massgenau»

## Teil 1 — Rahmen-Prognose (VOR jeder Landung, Fable, 23.07.2026)

Der eine deklarierte Golden-Zug ist **P-K27 «Druckmass»**: die automatische
Aussenbemassung (`deriveDimensions`) erhält im Druckweg (`plansvg.ts`) die
volle Masslinien-Grammatik der Masskette (602-Muster: Hilfslinien,
Papier-Abstand, Überstand, feste Papier-Schrift, Verdichtung).

**Anders als 0.9.1 BEWEGT dieser Zug Bestands-Goldens** — viele Fixtures
tragen automatische Bemassung. Darum gilt das 089-«Golden-Beweger»-Regime:

- **Teil 1b (Pflicht VOR dem Zug, Tag A):** Fable erstellt die
  VOLLSTÄNDIGE Erwartungsliste — jede zu bewegende Datei mit Grund
  (welcher Grammatik-Baustein sie trifft). Referenz-Aggregat der 41
  Bestandsdateien wird VOR dem Zug mit der Zeilenlisten-Methode
  (Lehre v0.9.1 §1: kommandoidentisch!) festgehalten.
- **Alle übrigen Pakete (P-P1/P-P2/P-G/P-D/P-U) sind golden-still:**
  0 bewegte, 0 neue. Besonders beweispflichtig: P-G lässt
  `gelaender-rampe-plan.svg` byte-still (Podest-Guard), P-P1 lässt alle
  Fixtures ohne `profilId` unberührt.
- **Keine neuen Goldens in 0.9.2** (der Zug bewegt, er fügt nicht hinzu;
  Detail-Golden = 0.9.3).
- Golden-Check je Gate NUR vom Repo-Root:
  `git status --short -- kosmo-orbit/packages/kosmo-kernel/test/golden/`.

Abweichung Ist ≠ Erwartungsliste bei P-K27 = **Hard-Stop** (Sanktion 1).

## Teil 1b — Erwartungsliste P-K27

_(offen — wird an Tag A als Subspez erstellt, VOR dem Zug an Tag B.)_

## Teil 2 — Ist-Nachweis

_(offen — Ist-Zahlen, Aggregat vorher/nachher je Datei, PNG-Sichtung.)_
