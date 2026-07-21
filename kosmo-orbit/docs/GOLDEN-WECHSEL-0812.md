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

### Teil B — Schraffur-Orientierung (offen)
_(beim Teil-B-Commit auszufüllen)_
