# Golden-Wechsel 081 — Sammelwechsel «D1/D4-Nachschärfung + planToSvg-Vollplankopf» (v0.8.1, W5/P6)

Der EINE erlaubte Golden-Sammelwechsel von v0.8.1 (`docs/V081-SPEZ.md` §5,
Muster wie `447e598`/D4, `6a7a8e4`/S4, `080`/P7). Diese Datei wurde VOR der
Regeneration geschrieben (Abschnitt 1–3, Erwartungsliste, Scope-Entscheid),
der Ist-Teil danach ergänzt (Abschnitt 4–6).

## 0 · Referenzpunkt

Letzter bekannter Golden-Stand vor diesem Wechsel: `447e598`/v0.8.0-Golden-
Wechsel-080 (P7, Plankopf-Framework-Default-Flip für `sheetToSvg`). Dieser
Wechsel (081) ist der einzige geplante Golden-Churn von v0.8.1 (`V081-SPEZ.md`
§8 Sanktionsliste, §0.3: «die 33 Goldens bleiben unangetastet ausser dem in §5
deklarierten Sammelwechsel 081»).

## 1 · Scope-Entscheid (VOR der Regeneration begründet)

**Auftrag laut Spez:** D1 (Strich-Matrix-Nachschärfung, Stift×Grau×Linientyp)
+ D4 (Zwei-Stimmen-mm-Skala-Nachschärfung) **plus** `planToSvg`-Vollplankopf
im Design-Einzelexport (Owner-Entscheid 4 der v0.8.0), «Geometrie-Shift in
bis zu 15 der 33 Goldens».

**Recherche vor dem Codieren (massgeblich für den Scope-Entscheid unten):**
`docs/GOLDEN-WECHSEL-D1.md` §5 (offene Abweichungen) und
`docs/GOLDEN-WECHSEL-D4.md` §0/§7 (offene 0.7.4-Zeilen) wurden gegen den
tatsächlichen Code-Stand geprüft. Ergebnis: **die weiten D1/D4-Nachschärfungs-
Punkte aus dem 0.7.3-Paket sind bereits in v0.7.4 geschlossen** —
`docs/GOLDEN-WECHSEL-074.md` (P4/P5a/P5b, Commit-Historie vor diesem Paket):

- D1 §5 Punkt 1 (Sichtkanten-Stift 0.35→0.25): geschlossen in v0.7.3 selbst
  (Kritik-1-Auflage A1, `GOLDEN-WECHSEL-D1.md` §7).
- D1 §5 Punkt 3 (Grundriss-Projektions-Tontrennung, `GRAU.projiziert` statt
  `#111`): geschlossen in v0.7.4/P5a (`plansvg.ts` `isProjection`-Zweig,
  Kommentar «D1-Nachtrag (v0.7.4 P5a…)»).
- D1 §5 Punkt 2 (Kadenz-Normalisierung): **teilweise** geschlossen in
  v0.7.4/P5b — NUR die Abbruch-Kadenz (`LINIENTYP_SOLL.strich`), die
  restlichen Bestandskadenzen (`strichpunktBestand`, `volumen`, `ueberSchnitt`
  u. a.) blieben **bewusst** unangetastet (074 §1: «koppelt mehrere
  Renderer-Stellen … wäre ein Mehrfach-Bruch über mind. 4 Stellen» —
  `zone-parzelle`-Regionen, Baugrenze-Linien, Haupt-Rasterachsen ×2 in
  `plansvg.ts`, PLUS `schwarzplan.ts` und `sheet.ts`s
  `situationsplanInnerSvg`).
- D4 §7 «Offene 0.7.4-Zeile» (Nordpfeil-«N»/Untertitel `font-family`):
  geschlossen in v0.7.4/P4.

**Scope-Entscheid für P6 (dieser Wechsel):** die verbleibende, ECHT offene
D1/D4-Lücke ist NICHT eine weitere Kadenz-Normalisierung über
`zone-parzelle`/Baugrenze/Rasterachse/Schwarzplan (das würde `schwarzplan.svg`,
`schwarzplan-nachbarn.svg` und `blatt-autofuellung.svg` berühren — genau die
Dateien, die laut Spez-Kontingent-Schätzung **unverändert** bleiben sollen,
und würde die dokumentierte «Mehrfach-Bruch»-Begründung aus 074 kassieren,
ohne dass die Spez das explizit verlangt). Die tatsächlich noch bestehende
Lücke ist die **Divergenz zwischen `planToSvg` und dem kanonischen
`derive/plankopf.ts`/`derive/stilblatt.ts`-Tokensystem**: `planToSvg` zeichnete
Plankopf und Nordpfeil bisher mit einer eigenen, zweiten Handschrift (Ad-hoc-
Grössen 3.2/4/3.6mm statt `PLANKOPF_TYPO_MM`, `BLATT.tinte`/`SCHRIFT_TITEL`
direkt statt der kanonischen Renderer). Das ist zugleich **exakt der Owner-
Entscheid-4-Auftrag** (Vollplankopf im Design-Einzelexport) — beide
Teilaufträge (D1/D4-Nachschärfung + Vollplankopf) laufen für `planToSvg` auf
**dieselbe EINE Änderung** hinaus: `planToSvg` auf `plankopfSvg()`/
`nordpfeilSvg()` (bereits produktiv für `sheetToSvg` seit P7) umzustellen,
statt einer zweiten, unabhängigen Kadenz-Aktion. Das ist der Grund, warum die
Spez beide Teilaufträge «in EINEM Ritual» zusammenfasst (§5: «vermeidet
doppelte Geometrie-Verschiebung derselben Dateien in zwei Wellen») — nach
Code-Prüfung sind es für `planToSvg` gar keine zwei unabhängigen Änderungen,
sondern eine.

Diese Entscheidung hält exakt an das Kontingent («bis zu 15 Goldens») — eine
weitere Kadenz-Normalisierung hätte das Kontingent gesprengt und zusätzliche,
nicht vorgesehene Dateien (Schwarzplan, Blatt-Autofüllung) berührt.

## 2 · Feature-Diffkern

### 2.1 · `planToSvg`-Vollplankopf (`packages/kosmo-kernel/src/derive/plansvg.ts`)

`planToSvg` (Design-Einzelexport eines Storey-Plans, `apps/kosmo-orbit/src/
modules/design/export-plan.ts`s `exportPlanPdf`/`exportPlanSvg` — App-Datei
NICHT angefasst, der ganze Umbau lebt im Kernel) rendert neu denselben
180×55-mm-Plankopf-Framework-Baustein wie `sheetToSvg` (`derive/sheet.ts`,
seit v0.8.0/P7):

- **Plankopf**: `plankopfSvg(paper.width, paper.height, matrixStufe, daten)`
  (`derive/plankopf.ts`) ersetzt den alten ~18mm-Fussstreifen (Rahmenlinie +
  5 Ad-hoc-`<text>`-Zeilen). `PlankopfDaten` wird aus `doc.settings`
  aufgelöst — `buero` (inkl. Logo-Asset), `projekt.bauherr/adresse/
  parzelleNr`, `opts.projectName/planTitle/date`, `scale`, ein neu aus dem
  Papierformat rückwärts aufgelöstes `format` (`formatLabelFuerPapier()`,
  gegen `BLATT_FORMATE`), sowie ein `plancode()` aus den verfügbaren Teilen
  (fehlende Teile — Disziplin/Geschoss/Nr., da `planToSvg` kein
  `SheetPlankopf`-Entity kennt — zeigen den dokumentierten `—`-Platzhalter,
  `plancode()`-Vertrag).
- **Nordpfeil**: `nordpfeilSvg(zfRect)` (`derive/plankopf.ts`) ersetzt die
  eigene Ad-hoc-Kreis/Pfeil/Text-Zeichnung. `zfRect` ist der bisherige
  symmetrische 10mm-Rand (`BLATT_RAENDER.oben` auf allen vier Seiten) —
  `planToSvg` kennt keinen Heftrand-Begriff (kein `Sheet`-Entity). Geometrie
  bleibt dabei **exakt gleich** (`cx=paper.width−16`/`cy=16`,
  `NORDPFEIL_RANDABSTAND_MM=6` auf dem 10mm-Rand ergibt denselben Wert wie
  der alte Hardcode) — nur das «N»-Label wechselt von der Titel- auf die
  Messbar-Stimme (IBM Plex Mono, `tnum`, bold) UND trägt neu `data-teil=
  "nordpfeil"`, weil `nordpfeilSvg()` das «N» als Mess-/Kartografie-Feld
  behandelt (identisch zu `sheetToSvg` seit P4/v0.8.0).
- **Zentrierungs-Reserve**: `contentH = paper.height − plankopfReserveMm()
  .hoehe` (65mm) ersetzt die alte pauschale Schätzung `paper.height − 22`
  — dieselbe Quelle wie die P7-Auto-Füllung (`blattfuellung.ts`), keine
  zweite Zahl.
- **Phase**: `siaZuMatrixStufe(doc.settings.siaPhase)` (Matrix-Stufe · SIA-Nr.,
  z. B. «VS · SIA 21») ersetzt `phaseLabel(doc.settings.phase)` — dieselbe
  Owner-Entscheid-1-Entkopplung (Plan-Detaillierung ≠ Plankopf-Matrix-Stufe)
  wie bei `sheetToSvg` seit P7.
- **Stammdaten**: die kombinierte «Bauherr: X · Verfasser: Y»-Zeile
  (`plankopfStammdatenZeile()`) entfällt zugunsten des dedizierten
  `PlankopfDaten.bauherr`-Felds (colM «Bauherrschaft», roher Wert ohne
  Label) — identisch zum bereits produktiven `sheetToSvg`-Verhalten (das
  ebenfalls kein `verfasser`-Feld kennt, da die Vorlage §1.5 keins vorsieht).
  `adresse`/`parzelleNr` fliessen NEU in die «Standort»-Zeile.
- **Ohne `opts.date`** bleibt das Datumsfeld leer statt des alten
  `new Date().toLocaleDateString()`-Fallbacks (Guard-Prinzip, kein
  erfundenes «heute» — alle golden-tragenden Fixtures übergeben ohnehin
  immer ein explizites `date`, s. Abschnitt 5).

### 2.2 · Zyklus-Auflösung `escapeXml` (`derive/stilblatt.ts`)

`derive/plankopf.ts` importierte `escapeXml` bisher aus `derive/plansvg.ts`.
Da `planToSvg` (in `plansvg.ts`) jetzt umgekehrt `plankopfSvg()`/
`nordpfeilSvg()` aus `plankopf.ts` importiert, wäre ein Modul-Zyklus
`plansvg → plankopf → plansvg` entstanden. Auflösung: `escapeXml` in die
zyklusfreie gemeinsame Quelle `stilblatt.ts` verschoben; `plansvg.ts`
re-exportiert die Funktion weiterhin unter demselben Namen (`export * from
'./stilblatt'`, unverändert seit je) — alle 8 bestehenden
`import { escapeXml } from './plansvg'`-Aufrufer (`studienbericht.ts`,
`ausnuetzungsnachweis.ts`, `sheet.ts`, `abnahmeprotokoll.ts`,
`bauablaufblatt.ts`, `dossier.ts`, `kvblatt.ts`, `plankopf.ts` selbst)
brauchten dafür keine Änderung.

## 3 · Erwartungsliste (VOR der Regeneration ermittelt)

Betroffen sind ausschliesslich Goldens, deren generierender Test tatsächlich
`planToSvg()` aufruft (maschinell verifiziert per Grep über alle
`pruefeGolden`-Aufrufer und deren unmittelbar vorausgehende SVG-Erzeugung —
NICHT alle «Grundriss-artigen» Goldens: `ansicht-*`/`schnitt-*` laufen über
den Plankopf-losen `ansichtSvg()`/`sectionInnerSvg()`-Pfad und sind von
diesem Wechsel strukturell unberührt, ebenso `schwarzplan*` (`schwarzplan.ts`)
und `blatt-autofuellung.svg`/`blatt-framework.svg` (`sheetToSvg`, bereits
seit P7 auf dem Framework, unverändert).

### Ändert sich (15 Goldens, `planToSvg`-Pfad)

| Golden | Erzeugende Testdatei | Erwartung |
|---|---|---|
| `grundriss-testhaus.svg` | `kernel.test.ts` | Fussstreifen→Vollplankopf, Transform-ty −21.5mm, Nordpfeil kanonisch |
| `grundriss-testhaus-wettbewerb.svg` | `kernel.test.ts` | wie oben |
| `grundriss-testhaus-baueingabe.svg` | `kernel.test.ts` | wie oben |
| `grundriss-walmdach-flach.svg` | `kernel.test.ts` | wie oben |
| `grundriss-satteldach-first.svg` | `kernel.test.ts` | wie oben |
| `grundriss-satteldach-eg-darunter.svg` | `kernel.test.ts` | wie oben |
| `grundriss-fenster-zweifluegel.svg` | `fenster.test.ts` + `fluegeltyp.test.ts` (dieselbe Datei, zwei Aufrufer) | wie oben |
| `grundriss-fensterband.svg` | `fenster.test.ts` | wie oben |
| `grundriss-kipp.svg` | `fluegeltyp.test.ts` | wie oben |
| `grundriss-kontext-wettbewerb.svg` | `grundriss-kontext.test.ts` | wie oben |
| `grundriss-kontext-baueingabe.svg` | `grundriss-kontext.test.ts` | wie oben |
| `grundriss-kontext-werkplan.svg` | `grundriss-kontext.test.ts` | wie oben |
| `werkplan-beschlag.svg` | `werkplan-beschlag.test.ts` | wie oben |
| `werkplan-beschlag-s2.svg` | `beschlag-s2.test.ts` | wie oben |
| `plankopf-stammdaten.svg` | `projekt-stammdaten.test.ts` | wie oben, PLUS: Bauherr erscheint neu roh («Baugenossenschaft Ahorn», ohne «Bauherr:»-Label), Verfasser erscheint gar nicht mehr (kein Vollplankopf-Feld) |

Die Transform-ty-Verschiebung ist bei allen 15 identisch (**−21.5mm**), weil
alle 15 golden-tragenden Fixtures `paper: A3_QUER` (420×297mm) verwenden:
alte Reserve 22mm (contentH 275, halbiert 137.5) → neue Reserve
`plankopfReserveMm().hoehe` = 65mm (contentH 232, halbiert 116) →
Differenz 21.5mm. `tx` bleibt unverändert (nur die Höhen-Reserve wuchs).

**Erwartete Summe: genau 15 geänderte Goldens** (14 Dateien + 1 Datei mit
zwei Aufrufern = 16 betroffene Testfälle).

### Bleibt byte-identisch (18 SVG + 1 IFC = 19 Dateien)

- **4 `ansicht-*`** (`ansichtSvg()`-Wrapper, Plankopf-los).
- **3 `schnitt-*`** (`sectionInnerSvg()` direkt, Plankopf-los).
- **2 `schwarzplan*`** (`schwarzplan.ts`, eigener Renderer, nicht angefasst).
- **6 Report-Goldens** (`abnahmeprotokoll`/`ausnuetzungsnachweis`/
  `bauablaufblatt`/`dossier`/`kvblatt`/`studienbericht`, eigene Report-Module,
  kein `planToSvg`-Bezug).
- **`plankopf-framework.svg`** (`plankopfSvg()` isoliert, `plankopf.test.ts`
  — ruft dieselbe Funktion wie mein Wechsel, aber über einen unveränderten
  Aufrufer/dieselben Argumente wie zuvor).
- **`blatt-framework.svg`**, **`blatt-autofuellung.svg`** (`sheetToSvg`,
  unangetastet — bereits seit P7 auf dem Framework).
- `interop-referenz-normalisiert.ifc` (kein SVG, kein Sheet-/Plan-Rendering).

**Finale Golden-Gesamtzahl: unverändert 33 SVG + 1 IFC = 34 Dateien** (0 neue,
0 gelöschte — reiner Inhalts-Churn an 15 Bestandsdateien).

## 4 · Ist-Vergleich nach Regeneration (16.07.2026)

**Erwartung exakt getroffen:** `git status --porcelain -- packages/kosmo-
kernel/test/golden/` zeigt **genau 15 geänderte Dateien** — wörtlich die 15
aus Abschnitt 3, kein einziges der 18 SVG+1 IFC aus dem «bleibt
byte-identisch»-Abschnitt taucht im Diff auf (SHA-256-Hash-Vergleich aller 34
Dateien vor/nach der Regeneration, s. Abschnitt 6).

Regeneration: `GOLDEN_UPDATE=1 npx vitest run --root packages/kosmo-kernel`
→ **924/924 Tests grün** beim ersten Lauf (kein zweiter Fix-Durchgang nötig
— die zwei vorab als literale Matcher-String-Updates erkannten Tests in
`projekt-stammdaten.test.ts` wurden VOR der Regeneration bereits auf das neue
Verhalten umgeschrieben, s. Abschnitt 5).

## 5 · Diff-Verify-Ergebnis (`docs/rundgang/v081-golden-diff-verify.py`)

```
OK   grundriss-fenster-zweifluegel: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   grundriss-fensterband: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   grundriss-kipp: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   grundriss-kontext-baueingabe: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   grundriss-kontext-werkplan: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   grundriss-kontext-wettbewerb: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   grundriss-satteldach-eg-darunter: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   grundriss-satteldach-first: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   grundriss-testhaus-baueingabe: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   grundriss-testhaus-wettbewerb: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   grundriss-testhaus: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   grundriss-walmdach-flach: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   plankopf-stammdaten: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   werkplan-beschlag-s2: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch
OK   werkplan-beschlag: nur Transform-ty (-21.5mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch

Gesamtergebnis: ALLE 15 GOLDENS OK
```

Das Skript beweist je Datei: (a) die ERSTE Abweichung gegenüber `HEAD` ist
die `<g transform="translate(tx, ty) …">`-Zeile, `tx` unverändert, `ty`-Delta
exakt 21.5mm; (b) ALLES davor (Wände, Poché, Bemassung, Türsymbole, Achsen,
Themenfüllung, Beschlag-Piktogramme — die reine Zeichnungsgeometrie) bleibt
byte-identisch; (c) die Divergenz danach beginnt exakt beim alten
Nordpfeil-Block und endet mit dem neuen `data-teil="plankopf"`+`data-teil=
"nordpfeil"`-Chrome. Keine einzige Koordinate der Zeichnung selbst hat sich
verschoben — der gesamte Diff ist Chrome (Nordpfeil/Plankopf) plus die eine
dokumentierte Zentrierungs-Konstante.

## 6 · Hash-Beweis der unveränderten Goldens

SHA-256 über alle 34 Golden-Dateien vor (`git show HEAD:…`) und nach der
Regeneration verglichen: **exakt 15 Hashes geändert** (die 15 aus Abschnitt
3/5), **19 Hashes identisch** (18 SVG + 1 IFC aus Abschnitt 3 «bleibt
byte-identisch»). `git diff --stat -- packages/kosmo-kernel/test/golden/`
bestätigt: `15 files changed, 407 insertions(+), 166 deletions(-)` — keine
16. Datei taucht auf.

## 7 · Bewusst mitgezogene Matcher-Strings (`test/projekt-stammdaten.test.ts`)

Kein Golden, reine Vertrags-Assertions auf das jetzt geänderte
`planToSvg`-Verhalten (Abschnitt 2.1, Stammdaten-Absatz):

- «mit `projekt.bauherr` erscheint die Bauherr-Zeile…»: Assertion
  `toContain('Bauherr: Baugenossenschaft Ahorn')` → `toContain('>Baugenossenschaft
  Ahorn<')` (roher Wert, kein Label mehr) + neue Gegenprobe
  `not.toContain('Bauherr:')`.
- «mit `projekt.bauherr` UND `.verfasser` erscheinen beide…»: umbenannt zu
  «…erscheint NUR Bauherr — Verfasser hat kein Vollplankopf-Feld»; Assertion
  von der kombinierten `" · "`-Zeile auf `toContain(bauherr) +
  not.toContain(verfasser)` umgestellt — ehrliche Dokumentation der neuen
  Grenze (kein Verfasser-Feld in der Vorlage, Spez §1.5), keine stille
  Testabschwächung.
- «mit `projekt.adresse`/`.parzelleNr` … bleibt der Plankopf unverändert»:
  umbenannt zu «…erscheinen beide, ` · `-getrennt, in der Standort-Zeile» —
  diese Felder fliessen jetzt (wie bei `sheetToSvg` schon immer) in den
  Plankopf; die alte Testaussage («fliessen noch nicht in den Plankopf») war
  mit dem Vollplankopf-Umbau schlicht überholt, Assertion entsprechend
  verschärft statt nur beibehalten.
- Golden-Test selbst («Grundriss mit gesetzten Stammdaten…»): Assertion von
  der kombinierten Zeile auf `toContain('>Baugenossenschaft Ahorn<')` +
  `not.toContain('Baubüro Andrin')` umgestellt.

Alle vier Änderungen sind Konsequenzen derselben, oben dokumentierten
Vollplankopf-Umstellung — keine Kompromisse an der Spez, keine
Test-Abschwächung ohne Begründung (im Gegenteil, zwei der vier Tests wurden
schärfer als vorher).

## 8 · Neue additive Tests (`test/plantosvg-vollplankopf.test.ts`)

6 neue, golden-freie Vertrags-Assertions (kein Byte-Golden, reine
Struktur-/Feld-Beweise, additiv zum bestehenden Bestand):

1. `data-teil="plankopf"` + `width="180" height="55"` + `data-teil=
   "nordpfeil"` vorhanden.
2. Phase erscheint als Matrix-Stufe (`BP · SIA 32` bei `siaPhase:
   'bauprojekt'`), NICHT `phaseLabel`-Text; `design.phaseSetzen`
   (Plan-Detaillierung) ändert die Matrix-Stufe NICHT (Owner-Entscheid 1).
3. `format`-Feld aus dem Papierformat abgeleitet (A3/A4 quer geprüft).
4. `massstab`-Feld zeigt `opts.scale`.
5. Ohne `opts.date` bleibt das Datumsfeld leer (kein automatisches «heute»
   mehr, Guard-Prinzip) — Regex-Gegenprobe auf JEDES Datumsformat.
6. Ohne Büro-/Projektdaten bleibt der Logo-Platzhalter ehrlich (gestrichelte
   Box + «BÜRO-LOGO»-Label, kein erfundener Name).

## 9 · Gates (Zusammenfassung)

- `npx vitest run --root packages/kosmo-kernel` → **43 Testdateien, 930/930
  Tests grün** (924 Bestand + 6 neue additive Vertrags-Tests,
  `plantosvg-vollplankopf.test.ts`; die 4 mitgezogenen Matcher-String-
  Assertions in `projekt-stammdaten.test.ts` zählen als bestehende,
  umgeschriebene Tests, keine neuen).
- `npx vitest run --root apps/kosmo-orbit` → **74 Testdateien, 1138/1138
  Tests grün**, unverändert (kein App-Test berührt `planToSvg`s
  Chrome-Interna direkt; `export-plan.ts` selbst wurde nicht angefasst).
- `npm run typecheck` → alle 8 Workspaces grün (`exactOptionalPropertyTypes`
  bleibt an; `formatLabelFuerPapier()`s `BlattFormat | undefined`-Rückgabe
  brauchte eine Zwischenvariable statt einer doppelten Funktionsauswertung
  im bedingten Objekt-Spread, sonst verliert TS die Narrowing-Information).
- `npm run svg-qa` → **33 Goldens geprüft, 0 harte Fehler, weiterhin genau 4
  Text-Overlap-Warnungen** (`abnahmeprotokoll.svg` 1, `blatt-autofuellung.svg`
  8, `blatt-framework.svg` 3, `plankopf-framework.svg` 24 — alle vier
  Warnungen sind vorbestehend und BETREFFEN keinen der 15 in diesem Wechsel
  geänderten Goldens; deren Warnungszahl ist unverändert 0. Kein neuer
  Text-Containment-Fehler trotz der jetzt überall vollen 180×55-Plankopf-
  Box auf A3-quer-Fixtures mit teils langen Fixture-Namen — die
  Ellipsen-Kürzung (`kuerzeMitEllipse`) hält die Zellen wie bei `sheetToSvg`
  seit P7 containment-sicher).
- **E2E:** `grep -rln "exportPlanPdf\|exportPlanSvg\|Plan-Export\|export-plan"
  e2e/*.spec.ts` → **kein Treffer** — der Design-Einzelexport
  (`exportPlanPdf`/`exportPlanSvg`) hat keinen dedizierten Playwright-Spec
  im Bestand (der einzige `export-svg`-Treffer, `e2e/dossier-panel.spec.ts:38`,
  prüft einen unabhängigen Dossier-Export-Button, keinen Bezug zu
  `planToSvg`). Der optionale E2E-Zusatzgate aus dem Arbeitsauftrag ist damit
  **nicht anwendbar** (kein qualifizierender Spec vorhanden) — ehrlich
  vermerkt statt stillschweigend übersprungen.

## 10 · Offene Punkte / ehrliche Grenzen

- Die breitere D1-Kadenz-Normalisierung (`DASH.strichpunktBestand` →
  `LINIENTYP_SOLL.strichpunkt`, über `zone-parzelle`/Baugrenze/
  Haupt-Rasterachse/`schwarzplan.ts`/`sheet.ts`s Situationsplan) bleibt
  weiterhin bewusst **vertagt** — s. Abschnitt 1 Scope-Entscheid. Sie würde
  `schwarzplan.svg`/`schwarzplan-nachbarn.svg`/`blatt-autofuellung.svg`
  berühren, die dieser Wechsel explizit unangetastet lässt, und bräuchte
  einen eigenen, separat deklarierten Sammelwechsel (analog zu 074s
  «EINE-Kadenz-Normalisierung»-Disziplin).
- `PLANKOPF_TYPO_MM`-Feldkürzung (`kuerzeMitEllipse`) gilt jetzt auch für
  `planToSvg`-Fixtures mit langen Projektnamen (z. B. «Golden-Satteldach-2G»)
  — kein Overflow beobachtet (svg-qa Text-Containment ✓ für alle 15), aber
  nicht mit einem extremen Stress-Fixture (sehr langer Name auf A4 statt A3)
  gegengeprüft; die bereits bestehenden Report-Titel-Overflow-Lehren aus D4
  (`docs/GOLDEN-WECHSEL-D4.md` §4b) gelten sinngemäss weiter.
- Der «Plancode»-Wert bei fehlenden Buero-/Projekt-/Sheet-Feldern
  (`—-—-<Phase>-—-—-—`) ist für den Design-Einzelexport in der Praxis fast
  immer voller `—`-Platzhalter (kein `SheetPlankopf`-Entity existiert für
  `planToSvg`) — funktional korrekt (Guard-Prinzip), optisch aber wenig
  aussagekräftig; das ist eine Eigenschaft der Owner-Entscheid-4-Vorgabe
  selbst (derselbe Baustein für einen Kontext ohne Sheet-Entity), keine neue
  Lücke dieses Wechsels.
