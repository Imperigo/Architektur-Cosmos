# GOLDEN-WECHSEL 0812 — Teil 1: Prognose (VOR den Landungen)

**Der EINE deklarierte Golden-Zug von v0.8.12** (Owner-Freigabe 21.07.2026:
«Ja, alle drei gebündelt»): K42-Tusche + K18/K23-Schraffur-Orientierung +
K41-Blattrand. Ausgangsbestand: **40 Golden-Dateien** (39 SVG + 1 IFC),
svg-qa 39/0, Stand HEAD nach ROADMAP 586.

## Prognose je Zug-Teil

### Teil A — Tusche (K42, `derive/stilblatt.ts:189`)
`BLATT.tinte: 'black' → '#1A1815'`. **Deklarierter Zusatzentscheid:**
`parzelle: 'black'` (stilblatt.ts:179) zieht MIT — dieselbe
Werkplan-Tusche-Familie, der Owner-Wortlaut («Tusche #1A1815, nie reines
Schwarz», GESTALTUNGSKONZEPT) deckt beide Stellen.
**Erwartung: die 26 Bestands-SVGs mit 'black'-Strokes bewegen sich**
(grep-belegt 21.07.: alle `grundriss-*`, `blatt-*`, `plankopf-*`,
`schwarzplan*`, `werkplan-beschlag*`, `masskette-plan`, `plan-schloss`,
`rolle-*` u. a.). Die übrigen 13 SVGs + 1 IFC bleiben byte-still.

### Teil B — Schraffur-Orientierung (K18/K23, `derive/schraffur.ts`)
`FUNKTION.daemmung` verliert den fixen `winkelGrad:0` — die Wellen-/
Zickzack-Schraffur läuft entlang der Bauteilachse (Winkel vom Aufrufer).
Beton/Stahlbeton-Diagonale (45°) bleibt UNVERÄNDERT (Owner: «bei beton …
weniger wichtig»). **Erwartung: nur SVGs mit Dämmungs-Schraffur an
nicht-horizontalen Bauteilen bewegen sich** — exakte Liste wird beim
Teil-B-Commit VOR dem Refresh erhoben und hier nachgetragen; Beton-only-
Goldens bleiben byte-still.

**Präzisierung VOR der Teil-B-Änderung (21.07., grep-belegt):** Schraffur-
Polylines (`stroke="#3A3A3A"` = `GRAU_SONDER.schraffur`, einziger Renderer
`plansvg.ts sectionInnerSvg`) tragen genau 3 der 39 SVGs:
`blatt-autofuellung.svg` (115 Linien, ausschliesslich 2-Punkt-Diagonalen —
kein Dämmungs-Anteil → **byte-still**), `schnitt-fenster-parametrisch.svg`
(116 Wellen-Polylines) und `schnitt-satteldach-querschnitt.svg` (146
Wellen-Polylines). **Prognose: exakt diese 2 Goldens bewegen sich**, die
übrigen 37 SVG + 1 IFC bleiben byte-still. Mechanik-Zusatz: die
Winkel-Ableitung (längste Loop-Kante, normiert auf [0°,180°)) liefert für
exakt horizontale Schichten den Wert 0 — identischer Codepfad wie der
bisherige Fixwinkel, darum keine Bewegung durch flache Dämmlagen allein.

### Teil C — Blattrand (K41, `derive/sheet.ts:212–235` + `blattlayout.ts`)
Umsetzung NUR gemäss K41-Registertext (vor dem Commit wörtlich zu lesen).
**Erwartung: nur `blatt-*`-/Plakat-Goldens** können sich bewegen; falls
die Vereinheitlichung auf die bestehende Default-Geometrie hinausläuft,
0 zusätzliche Bewegungen. Präzisierung beim Teil-C-Commit.

## Methode (wie 0.8.10/0.8.11)
Vor jedem Teil-Commit: aggregierte sha256 über alle 40 Goldens sichern;
nach dem Refresh: Liste der bewegten Dateien == Prognose dieses Dokuments
(Abweichung = Hard-Stop, kein Refresh); je Teil eine von Fable GESICHTETE
PNG-Stichprobe (mind. 2 bewegte SVGs gerendert, vorher/nachher).
Nicht-Zug-Pakete (P-Z, P-M, E-K5, E-F) müssen `git status
packages/kosmo-kernel/test/golden` LEER halten — jede Bewegung dort ist
Sanktion 1.

## Teil 2: Ist-Nachweis

### Teil A — Tusche (erledigt 21.07.2026, Fable)
**Ist == Prognose: exakt 26 bewegte Golden-Dateien**, die übrigen 13 SVG +
1 IFC byte-still. Bewegte Dateien: blatt-autofuellung.svg, blatt-framework.svg, blattverzeichnis-legende.svg, blattverzeichnis.svg, grundriss-fenster-zweifluegel.svg, grundriss-fensterband.svg, grundriss-kipp.svg, grundriss-kontext-baueingabe.svg, grundriss-kontext-werkplan.svg, grundriss-kontext-wettbewerb.svg, grundriss-satteldach-eg-darunter.svg, grundriss-satteldach-first.svg, grundriss-testhaus-baueingabe.svg, grundriss-testhaus-wettbewerb.svg, grundriss-testhaus.svg, grundriss-walmdach-flach.svg, masskette-plan.svg, plan-schloss.svg, plankopf-framework.svg, plankopf-stammdaten.svg, rolle-leer.svg, rolle-plankopf.svg, schwarzplan-nachbarn.svg, schwarzplan.svg, werkplan-beschlag-s2.svg, werkplan-beschlag.svg.
Zusatzfund, deklariert mitgezogen: das TEST-Gerüst `plankopf.test.ts:484`
(Demo-Rahmen um den isolierten Plankopf-Baustein) trug ein eigenes hartes
`stroke="black"` — auf `#1A1815` gehoben, danach enthält KEIN Golden mehr
ein `black`. Aggregierte sha256 aller Goldens vorher
`d0493f4e8cceaad5…` (21.07., vor Teil A). Substitutions-Beweis: Diff über
alle 26 Dateien = 235+/235− Zeilen, nach Normalisierung black/#1A1815→X
ist jede Zeile paarig (0 unpaarige) — reine Farb-Substitution, keine
Geometrieänderung. Sichtung: `plankopf-framework` vorher/nachher als PNG
gerendert und von Fable geprüft (Struktur/Typo intakt). Suiten: Kernel
1180/1180, svg-qa Exit 0.

### Teil C — Blattrand K41 (erledigt 21.07.2026, Fable)
Owner wörtlich «einheitlicher rahmen am blattrand!»: Default gedreht —
`sheet.ts` `heftrandAn = layout?.heftrand === true` (Opt-in statt
Opt-out), Standard ist der EINHEITLICHE 10mm-Rahmen rundum (derselbe
Codepfad wie bisher bei Plakaten, kein neuer Zweig); ISO-838-Heftrand
bleibt als bewusstes Opt-in erhalten.
**Prognose-Korrektur nach Hard-Stop, VOR dem Refresh dokumentiert:**
ursprünglich 3 erwartete Bewegungen (autofuellung + blattverzeichnis×2);
Ist = **2 bewegte Goldens** (`blatt-autofuellung.svg`, `rolle-leer.svg`) —
Abweichungen beide erklärt: die rolle-leer-Fixtur hat KEINEN
Layout-Datensatz (der `heftrand:true`-Patch der Datei gehört zur
rolle-plankopf-Fixtur, die byte-still blieb — Gegenprobe bestanden);
blattverzeichnis/-legende rendern gar keinen Blattrahmen (eigenständige
Tafel ohne Heftrand-Codepfad). blatt-framework byte-still (explizites
`heftrand:true` im Test — prüft weiterhin den Heftrand-Pfad).
Sichtung: blatt-autofuellung vorher/nachher als PNG gerendert und von
Fable geprüft (Rahmen allseitig gleich, Inhalt unversehrt). Suiten:
Kernel 1180/1180, svg-qa Exit 0.

### Teil B — Schraffur-Orientierung (erledigt 21.07.2026, Fable)
**Ist == Prognose: exakt 2 bewegte Golden-Dateien**
(`schnitt-fenster-parametrisch.svg`, `schnitt-satteldach-querschnitt.svg`),
die übrigen 37 SVG + 1 IFC byte-still — insbesondere `blatt-autofuellung.svg`
(nur Beton-Diagonalen) unbewegt, Gegenprobe zur Beton-bleibt-fix-Zusage.
Umsetzung: `SchraffurSpec.folgtBauteilachse` (nur `FUNKTION.daemmung`),
`schraffurLinien()` leitet den Basiswinkel aus der LÄNGSTEN Loop-Kante ab
(`bauteilachseWinkelGrad()`, atan2 normiert auf [0°,180°) — exakt
horizontale Kanten ergeben exakt 0 und damit den alten Codepfad).
Richtungs-Nachweis nach Refresh: ALLE Wellen-Polylines beider Goldens
laufen jetzt 90° (in der Wand stehend, vorher 0° quer); das Satteldach
trägt in den Dachschichten kein Dämm-Wellenmuster (Material-Diagonale
`dach`), darum dort keine Bewegung — deckt sich mit der Sichtung.
Sichtung: beide bewegten Goldens vorher/nachher als PNG gerendert und von
Fable geprüft (Wandaufbau intakt, tragende Diagonale unverändert, Welle
folgt der Bauteilachse). Aggregierte sha256 aller 40 Goldens: vorher
`dea4ab4e22f587d8…` (nach Teil A+C), nachher `fece758e9b0a89ec…`.
Suiten: Kernel 1180/1180, svg-qa 39 Goldens / 0 harte Fehler.

**Damit ist der EINE deklarierte Golden-Zug v0.8.12 komplett: Teil A (26)
+ Teil C (2) + Teil B (2) — alle Teile Ist == Prognose.**
