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

## Teil 1b — Erwartungsliste P-K27 (Fable, 23.07.2026, VOR dem Zug)

**Methode (doppelt, deckungsgleich):** (1) exakter dims-Gruppen-Fingerprint
`<g stroke="#111" fill="#111">` (die EINZIGE Stelle, die diese Gruppe
schreibt, ist der `deriveDimensions`-Block `plansvg.ts:445-492`;
GRAU.geschnitten = '#111', stilblatt.ts:68); (2) `transform="rotate(-90 `
der vertikalen Masstexte. Beide Signale liefern IDENTISCH dieselben
Dateien — gegenseitige Bestätigung, kein Über-/Untergriff.

**Genau diese 20 Bestands-SVGs DÜRFEN sich bewegen** (jede trägt 2–3
dims-Gruppen = x-/y-Aussenketten, Werkpläne zusätzlich Innenketten):

- `blatt-autofuellung.svg`
- `blatt-framework.svg`
- `gelaender-rampe-plan.svg`
- `grundriss-fenster-zweifluegel.svg`
- `grundriss-fensterband.svg`
- `grundriss-kipp.svg`
- `grundriss-kontext-baueingabe.svg`
- `grundriss-kontext-werkplan.svg`
- `grundriss-kontext-wettbewerb.svg`
- `grundriss-satteldach-eg-darunter.svg`
- `grundriss-satteldach-first.svg`
- `grundriss-testhaus-baueingabe.svg`
- `grundriss-testhaus-wettbewerb.svg`
- `grundriss-testhaus.svg`
- `grundriss-walmdach-flach.svg`
- `masskette-plan.svg`
- `plan-schloss.svg`
- `plankopf-stammdaten.svg`
- `werkplan-beschlag-s2.svg`
- `werkplan-beschlag.svg`

**Die übrigen 20 Bestandsdateien bleiben byte-still** (Ansichten,
Schwarzplan, Blattverzeichnis(+Legende), Dossier, KV/Kosten, Abnahme,
Ausnützung, Bauablauf(blatt), Baugesuch, IFC — keine trägt die
dims-Gruppe). Jede Bewegung ausserhalb der 20 = Hard-Stop (Sanktion 1);
jede der 20, die sich NICHT bewegt, ist ebenso erklärungspflichtig
(entweder trifft kein Grammatik-Baustein ihre Ketten — zu belegen — oder
der Zug ist unvollständig).

**Referenz-Aggregat vorher** (Zeilenlisten-Methode, kommandoidentisch für
den Nachher-Vergleich — Lehre v0.9.1 §1): sha256-Zeilenliste aller 41
Dateien gesichert (Scratchpad `k27-aggregat-vorher-roh.txt`); die 21
still-erwarteten Zeilen (20 SVG + 1 IFC) müssen nachher identisch sein.

## Teil 2 — Ist-Nachweis

_(offen — Ist-Zahlen, Aggregat vorher/nachher je Datei, PNG-Sichtung.)_
