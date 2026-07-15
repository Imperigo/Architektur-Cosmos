# Golden-Wechsel 080 — Sammelwechsel «Plankopf-Framework-Default-Flip» (v0.8.0, P7)

Der EINE erlaubte Golden-Sammelwechsel von v0.8.0 (`docs/V080-PLANKOPF-SPEZ.md`
§6, Muster wie `447e598`/D4 und `6a7a8e4`/S4). Diese Datei wird VOR der
Regeneration geschrieben (Abschnitt 1–2, Erwartungsliste), der Ist-Teil danach
ergänzt (Abschnitt 3–4).

## 0 · Was P7 ändert (Kurzfassung)

`derive/sheet.ts`s P4-Daten-Guard (`sheet.plankopf !== undefined ||
sheet.layout !== undefined`) fällt weg. Der volle 180×55-Plankopf-Framework-
Pfad (`derive/plankopf.ts` + `derive/blattlayout.ts`) ist ab jetzt der
EINZIGE Rendering-Pfad für `sheetToSvg` — fehlende `SheetLayout`-Booleans
bedeuten neu die in Spez §5.1 fixierten Defaults:

| Boolean | Post-Wechsel-Default |
|---|---|
| `heftrand` | AN (20 mm links) |
| `faltmarken` | AN |
| `wasserzeichen` | AN, Inhalt nach `siaZuMatrixStufe(settings.siaPhase)` |
| `massstabsbalken` | AN |
| `nordpfeil` | AN, **nur** wenn ein Grundriss/Situationsplan platziert ist |

Explizite `false`-Werte bleiben respektiert (P2-Lösch-Semantik,
`mergeTeilPatch`). Einzige dauerhafte Ausnahme: A0-Plakat-Preset-Blätter
(`erzeugePlakat()`, `PublishWorkspace.tsx`) erhalten beim Erstellen explizit
`layout: { heftrand: false }` über einen neuen optionalen `layout`-Parameter
an `publish.blattErstellen` — **kein** Namens-Heuristik im Kernel (der Kernel
kennt «Plakat» nicht und soll es auch nicht kennen müssen).

Der alte kompakte ~120×26/31-mm-Fusskopf (uniform 10-mm-Rahmen,
`phaseLabel(settings.phase)`) ist damit vollständig abgelöst — es gibt
**keinen** erreichbaren Zustand mehr, der ihn zeichnet. `planToSvg`
(`derive/plansvg.ts`) bleibt unangetastet (Owner-Entscheid 4, Spez §5.3) —
der Design-Einzelexport behält seinen ~18-mm-Fussstreifen.

## 1 · Betroffene Reserve-/Offset-Konstanten («EINZIGE Quelle»
`plankopfReserveMm()`)

`derive/blattlayout.ts`s `plankopfReserveMm()` (bereits in P1 vorbereitet,
`PLANKOPF_MM.b/h` + 10 mm Rand = 190×65 mm) wird jetzt tatsächlich konsumiert.
NUR echte «Platz für den Plankopf»-Reserven wurden ersetzt — NICHT jede
zufällig gleich benannte 18/22/26/30/40-Konstante (Liste der geprüften, aber
bewusst NICHT angefassten Stellen unten in Abschnitt 1b):

| Datei | Vorher | Nachher | Begründung |
|---|---|---|---|
| `derive/blattfuellung.ts:283` (`PLANKOPF_RESERVE`) | `40` (pauschale Schätzung) | `plankopfReserveMm().hoehe` (65) | Auto-Fuellungs-Raster darf mit dem seit P7 default-aktiven, deutlich höheren 180×55-Plankopf nicht mehr in dessen Eckbereich hineinragen |
| `commands/publish.ts` (`createBaugesuch`/`zentrierterPlatz`) | `(paper.height - 30) / 2` | `(paper.height - plankopfReserveMm().hoehe) / 2` | Baugesuch-Situation/Grundrisse/Schnitte zentrieren sich mit derselben Reserve wie die Auto-Fuellung |
| `commands/publish.ts` (`createBaugesuch`, Ausnützungsnachweis-Bildreserve) | `const plankopfReserve = 40;` | `const plankopfReserve = plankopfReserveMm().hoehe;` | Das eingebettete Ausnützungsnachweis-Bild überlappt sonst den 180×55-Plankopf des eigens dafür erstellten A4-Blatts |
| `apps/kosmo-orbit/.../PublishWorkspace.tsx` (`placeGrundriss`/`placeAxo`/`placeSchnitt`/`placeBildSlot`, 4 Stellen) | `(paper.height - 30) / 2` | `(paper.height - plankopfReserveMm().hoehe) / 2` | Schnellplatzierungs-Buttons zentrieren konsistent mit dem neuen Plankopf |

`packages/kosmo-kernel/src/index.ts` exportiert neu `./derive/blattlayout`
(vorher nicht öffentlich), damit `PublishWorkspace.tsx` dieselbe Quelle
importieren kann statt eine eigene Schätzung zu pflegen.

### 1b · Geprüfte, aber bewusst NICHT angefasste 18/22/26/30/40-Stellen

| Fundstelle | Warum unverändert |
|---|---|
| `derive/plansvg.ts:678` («Plankopf-Streifen unten 18 mm») | `planToSvg`-Kompakt-Entscheid (Owner-Entscheid 4, Spez §5.3) — bleibt unangetastet, sonst bricht die `contentH = paper.height − 22`-Zentrierung der 15 planToSvg-Goldens |
| `derive/ausnuetzungsnachweis.ts` (`MARGIN=40`, `T1_HEADER_H=22`, `T2_GAP=26`, `T2_ROW_H=26`) | Internes PX-Tabellenlayout des eigenständigen A4-Report-SVGs (`viewBox 794×1123`), hat nichts mit «Platz für den Plankopf» zu tun — eines der 6 Report-Goldens, TABU |
| `derive/blattfuellung.ts:282` (`RAND=14`) | Generischer «Blattrahmen (10mm) + Luft»-Rand für ALLE vier Seiten des Rasters, keine Plankopf-spezifische Reserve — bleibt als eigene, unabhängige Konstante bestehen |
| `derive/sheet.ts` (Kommentare «~120×26-mm-Fusskopf») | Reine Text-Kommentare zur Historie, keine Konstante |

## 2 · Erwartungsliste (VOR der Regeneration)

### Ändert sich (Blatt-Goldens über `sheetToSvg`)

| Golden | Erwartung |
|---|---|
| `blatt-autofuellung.svg` | (a) **Chrome**: 180×55-Plankopf statt ~120×26-Fusskopf, Heftrand 20mm links + Faltmarken + Wasserzeichen (Phase VS, da Fixture keine `siaPhase` setzt → Default `wettbewerb`) + Massstabsbalken + ggf. Nordpfeil (Fixture platziert einen Grundriss → Nordpfeil erscheint). (b) **Auto-Fuellungs-Geometrie**: `blattfuellung.ts`s `PLANKOPF_RESERVE` wechselt von 40→65mm — die vom Test FRISCH berechneten Platzierungen (Grundrisse/Schnitt/Situationsplan/Axo/Kennzahlen/Render-Platzhalter) verschieben sich dadurch NEBEN dem reinen Chrome-Diff zusätzlich in y-Richtung (kleinere nutzbare Höhe). Dies ist eine bewusste, dokumentierte Ausnahme vom sonst geltenden diff-verify-Kriterium «nur Plankopf/Blattlayout-Gruppen ändern sich» — begründet in Abschnitt 1/4 unten (die Auto-Fuellung MUSS die neue, grössere Plankopf-Ecke respektieren, sonst würde sie mit ihr kollidieren). |

**Erwartete Summe: genau 1 geändertes Golden** (`blatt-autofuellung.svg`).

### Bleibt byte-identisch (34 übrige Dateien: 33 SVG − 1 + 1 IFC)

- **30 kategorische Wächter** (15 `planToSvg`-Goldens + 9 Ableitungs-Goldens +
  6 Report-Goldens, s. Spez §6): keines dieser Testfiles ruft `sheetToSvg`
  auf (maschinell verifiziert — `grep -c sheetToSvg` über alle zugehörigen
  Testdateien ergibt 0), sie sind von `derive/sheet.ts` strukturell nicht
  betroffen.
  - 15 `planToSvg`: `ansicht-curtainwall`, `ansicht-fluegeltypen`,
    `ansicht-sued-satteldach`, `ansicht-sued-testhaus`,
    `grundriss-fenster-zweifluegel`, `grundriss-fensterband`,
    `grundriss-kipp`, `grundriss-satteldach-eg-darunter`,
    `grundriss-satteldach-first`, `grundriss-testhaus-baueingabe`,
    `grundriss-testhaus-wettbewerb`, `grundriss-testhaus`,
    `grundriss-walmdach-flach`, `schnitt-fenster-parametrisch`,
    `plankopf-stammdaten` (ebenfalls `planToSvg`).
  - 9 Ableitungs-Goldens: `grundriss-kontext-baueingabe`,
    `grundriss-kontext-werkplan`, `grundriss-kontext-wettbewerb`,
    `schnitt-satteldach-baueingabe`, `schnitt-satteldach-querschnitt`,
    `schwarzplan`, `schwarzplan-nachbarn`, `werkplan-beschlag`,
    `werkplan-beschlag-s2`.
  - 6 Report-Goldens: `abnahmeprotokoll`, `ausnuetzungsnachweis`,
    `bauablaufblatt`, `dossier`, `kvblatt`, `studienbericht`.
- **`plankopf-framework.svg`** (Wächter, isolierter 180×55-Baustein über
  `plankopfSvg()` direkt, `plankopf.test.ts`) — ruft `derive/plankopf.ts`
  unmittelbar auf, nicht über `derive/sheet.ts`; vom Default-Flip in
  `sheet.ts` strukturell unberührt.
- **`blatt-framework.svg`** — läuft zwar über `sheetToSvg`, ändert sich
  laut Vorhersage aber NICHT: das Demo-Blatt (`blatt-framework.test.ts`)
  setzt bereits VOR dem Wechsel alle fünf `SheetLayout`-Booleans EXPLIZIT
  auf `true` (`publish.blattLayoutSetzen`, `{ heftrand: true, faltmarken:
  true, wasserzeichen: true, massstabsbalken: true, nordpfeil: true }`) —
  identisch zum neuen Default. Der Guard-Wegfall selbst betrifft nur den
  RENDER-PFAD (Framework statt Alt-Kopf), nicht die Werte der Booleans; da
  dieses Blatt schon vorher im Framework-Pfad lief (Guard war aktiv, weil
  `sheet.layout`/`sheet.plankopf` gesetzt sind) und dieselben Werte behält,
  ist 0 Diff zu erwarten.
- `interop-referenz-normalisiert.ifc` — kein SVG, kein Sheet-Rendering.

**Finale Golden-Gesamtzahl: unverändert 33 SVG + 1 IFC = 34 Dateien** (0
neue, 0 gelöschte — löst die in Spez §6 offen gelassene Arithmetik-Frage
«31→33 vs. weitere neue Dateien» klar auf: P7 legt KEINE neue Datei an, nur
`blatt-autofuellung.svg` ändert Inhalt).

## 3 · Ist-Vergleich nach Regeneration (15.07.2026)

**Erwartung exakt getroffen:** `git status --porcelain -- packages/kosmo-kernel/test/golden/`
zeigt **genau 1 geänderte Datei** — `blatt-autofuellung.svg` (55 Zeilen
hinzugefügt, 9 entfernt, `git diff --stat`). Keines der 30 Wächter-Goldens,
`plankopf-framework.svg` oder `blatt-framework.svg` taucht im Diff auf —
alle drei bleiben byte-identisch, exakt wie vorhergesagt.

Regeneration: `GOLDEN_UPDATE=1 npx vitest run --root packages/kosmo-kernel`
→ **924/924 Tests grün** beim ersten Lauf schon (kein zweiter Fix-Durchgang
nötig — anders als D4 gab es keinen svg-qa-Überlauf, s. Abschnitt 7).

## 4 · Diff-Verify-Ergebnis (`docs/rundgang/v080-golden-diff-verify.py`)

```
OK   blatt-autofuellung: nach Entfernen von Plankopf/Blattlayout/Alt-Fusskopf BYTE-IDENTISCH (0 Geometrie-Diff)

Gesamtergebnis: ALLE GEPRÜFTEN GOLDENS OK (0 unerwarteter Geometrie-Diff)
```

**Wichtiger, ehrlicher Befund:** die in Abschnitt 2 vorhergesagte
Zusatz-Verschiebung der Auto-Fuellungs-Platzierungen (durch
`PLANKOPF_RESERVE` 40→65mm) trat für DIESES Fixture **nicht ein** — nach
Entfernen der `plankopf`/`blattlayout`-Gruppen (und des alten Fusskopfs +
seines bare `<rect x="10" y="10" …>`-Rahmens auf der Alt-Seite) ist der Rest
des Golden **byte-identisch**, keine einzige Koordinate hat sich verschoben.

Grund (nachgerechnet, `derive/blattfuellung.ts`): das A1-quer-Blatt
(841×594mm) hat `RAND=14` (unverändert) und `ZEILEN_HOEHE=150` (unverändert,
raster-intern fix). Die nutzbare Höhe schrumpft zwar von `594−14−40=540` auf
`594−14−65=515` (`y1`), aber `maxZeilen = floor((y1−y0)/150)` bleibt in
beiden Fällen **3** (`floor(526/150)=3` vs. `floor(501/150)=3` — die
Reserve-Änderung frisst nur den Puffer zwischen der dritten Zeile und dem
neuen `y1`, unterschreitet aber nirgends die Schwelle, die eine vierte Zeile
freigäbe oder eine dritte kostete). Die tatsächlich benutzten Zeilen-Mittelpunkte
(`cy = y0 + row·150 + 75`) hängen nicht von `y1` selbst ab, nur von der
Zeilen-INDEX-Zuteilung — die bleibt hier unverändert. Bei einem knapperen
Blattformat (z.B. A3/A4 mit wenigen Reihen an der Kippschwelle) könnte
`PLANKOPF_RESERVE` durchaus eine Zeile mehr/weniger freigeben — für DIESES
Golden-Fixture ist das nicht der Fall, empirisch nachgewiesen statt nur
behauptet. Das diff-verify-Skript ist so gebaut, dass es eine echte
Verschiebung (falls sie einträte) explizit als «erwartete
Platzierungsverschiebung» ausgewiesen hätte (Zahlen-only-Diff-Klassifikation)
statt sie stillschweigend zu verstecken oder fälschlich als Fehler zu werten
— hier war das gar nicht nötig.

## 5 · `kernel.test.ts` — bewusst mitgezogene Matcher-Strings

- `kernel.test.ts` (Zeile ~963, «Blatt erstellen, Grundriss + Schnitt
  platzieren…»): Assertion `'Blatt 1 · A1'` (alter Fusskopf, kombinierte
  Zeile «Blatt {n} · {Format}») existiert im neuen Plankopf nicht mehr —
  ersetzt durch `'>A1</text>'` (Format erscheint als eigenes
  Halbzellen-Feld, Spez §1.5). Reiner Matcher-String, kein Golden.
- `kernel.test.ts` (Zeile ~2374, «Phase steht im Plankopf…», Spez §2.2):
  Assertions `'Werkplan (SIA 51)'`/`'Vorprojekt (SIA 31)'`
  (`phaseLabel(settings.phase)`) ersetzt durch `'VS · SIA 21'`/`'BP · SIA
  32'` (`siaZuMatrixStufe(settings.siaPhase)`) — der Test prüft jetzt
  zusätzlich explizit die Entkopplung (Owner-Entscheid 1): `design.
  phaseSetzen` ändert NUR `BauPhase`, die Plankopf-Matrix-Stufe bleibt
  gleich; erst `design.siaPhaseSetzen` ändert sie. Bewusst mitgezogen, wie
  in Spez §2.2/§6.1 Punkt 5 vorgeschrieben.
- `blatt-framework.test.ts` («Guard-Beweis…»): dieser Test prüfte explizit
  das P4-Guard-Verhalten (bare Sheet → Alt-Kopf) — mit dem Default-Flip
  ist das Alt-Kopf-Verhalten nicht mehr erreichbar. Ersetzt durch einen
  «Default-Beweis» (bare Sheet → volles Framework) + einen neuen Test für
  die explizite `false`-Override-Semantik (`layout:{heftrand:false,
  faltmarken:false}`). Kein Golden betroffen (reiner Unit-Test).
- `projekt-stammdaten.test.ts` (`plankopfStammdatenZeile`-Tests):
  UNVERÄNDERT — laufen ausschliesslich über `planToSvg`, nicht über
  `sheetToSvg`/`derive/sheet.ts` (Owner-Entscheid 4).
- `kernel.test.ts` (`REVISIONEN`-Substring, «Plan-Revisionen»-Describe):
  UNVERÄNDERT — das Revisionsverzeichnis bleibt inhaltlich identisch,
  folgt nur einer neuen (breiteren/höheren) Box-Referenz (`pkRect` statt
  `kx`/`ky`), der TEXT-Inhalt der Assertions ändert sich nicht.

## 6 · Bestandsumstellung & Plakat-Ausnahme (Owner-Entscheid 2)

- **Bestand**: jedes bestehende `.kosmo`-Dokument zeigt ab v0.8.0 automatisch
  das volle Framework — kein Opt-in, keine Migrations-Warnung (Spez §5.2).
  `publish.blattFuellen` bleibt die (nicht automatische) Abhilfe für
  Kollisionen bereits gesetzter Platzierungen mit der grösseren Plankopf-Ecke.
- **Plakat-Ausnahme**: `publish.blattErstellen` erhält einen neuen optionalen
  `layout`-Parameter (`SheetLayoutPatchSchema`, additiv, `exactOptional
  PropertyTypes`-konform über `mergeTeilPatch`); `PublishWorkspace.tsx`s
  `erzeugePlakat()` übergibt `layout: { heftrand: false }` beim Erstellen.
  Mechanismus ist ein EHRLICHES, im UI-Preset-Code sichtbares Datenfeld —
  KEINE Namens-Heuristik im Kernel (`derive/sheet.ts` kennt den String
  «Plakat» nirgends).

## 7 · PlankopfPanel-Nachzug (UI-Konsequenz des Default-Flips, ausserhalb der
Golden-/Kernel-Ebene)

`PlankopfPanel.tsx`s Layout-Schalter zeigten den Häkchen-Zustand bisher über
`sheet.layout?.[feld] === true` — vor P7 korrekt, weil «fehlend» damals «AUS»
bedeutete. Nach dem Default-Flip bedeutet «fehlend» aber «AN», die Checkbox
wäre sonst leer geblieben, während das Blatt daneben sichtbar das
Wasserzeichen/den Massstabsbalken/etc. zeigt — ein irreführender
UI/Render-Widerspruch. Behoben: `!== false` (Default-AN, explizites `false`
bleibt AUS), für `nordpfeil` zusätzlich mit der Grundriss-/Situationsplan-
Bedingung aus `derive/sheet.ts` gekoppelt (sonst zeigte die Checkbox «an»,
obwohl kein Nordpfeil gezeichnet wird, mangels platzierter Ansicht). Der
bereits vorhandene P6-Kommentar («dieser Editor zeigt den EFFEKTIVEN Zustand
ehrlich, kein hartcodiertes «AN»») hatte diesen P7-Nachzug bereits
angekündigt.

## 8 · E2E-Fixes (`e2e/plankopf.spec.ts`)

Der volle E2E-Batch (`blatt-fuellen`, `baugesuch`, `dossier-panel`, `module`,
`plankopf`, `sim-vollprojekt-phase3`, `sim-vollprojekt-phase4`, 83 Tests) fand
zwei ECHTE Regressionen in `e2e/plankopf.spec.ts` (beide direkte Folgen des
Default-Flips, kein Zufall):

1. **«Felder setzen…»** prüfte `g[data-teil="plankopf"]` habe VOR jeder
   Feld-Eingabe `toHaveCount(0)` (Annahme: neues Blatt = Alt-Fusskopf). Seit
   P7 zeigt jedes neue Blatt sofort das Framework → `toHaveCount(1)`. Nach dem
   Fix schlug eine ZWEITE, bis dahin verdeckte Folge auf: die
   Wasserzeichen-Checkbox-Assertion nahm an, das Wasserzeichen sei
   anfangs AUS (`not.toContainText('STUDIE')`) — mit `wasserzeichen`
   default-AN (Spez §5.1) ist «STUDIE» von Anfang an sichtbar. Test
   umgeschrieben: prüft jetzt Checkbox-Ausgangszustand `toBeChecked()` +
   AUS-Umschalten + wieder AN-Umschalten, statt der alten AUS→AN-Reihenfolge.
   Dabei fiel die oben (Abschnitt 7) beschriebene PlankopfPanel-Checkbox-
   Inkonsistenz erst auf und wurde dort behoben — ohne den Panel-Fix hätte
   die Checkbox nie `toBeChecked()` gemeldet.
2. **«Plankopf-Overlay…»** verglich die Overlay-Bounding-Box vor/nach dem
   Setzen eines Plankopf-Felds und erwartete ein Wachstum um Faktor 1.3
   (Alt-Fusskopf → Framework). Seit P7 ist die Box von Anfang an die
   180×55-mm-Framework-Grösse — kein Wachstum mehr möglich. Test
   umgeschrieben: prüft jetzt, dass die Box-Grösse VOR und NACH der
   Feld-Eingabe gleich bleibt (Toleranz 3px) und der Klick in beiden
   Zuständen das Panel öffnet.

Beide Fixes sind reine Testanpassungen an die (spezifikationsgemäss)
geänderte Produktrealität — keine Kompromisse an der Spez, keine
Test-Abschwächung ohne Begründung.

## 9 · Gates (Zusammenfassung)

- `npx vitest run --root packages/kosmo-kernel` → **42 Testdateien, 924/924
  Tests grün** (924 = 923 Bestand + 1 neuer Test, `blatt-framework.test.ts`
  «explizites layout:{heftrand:false,…}»).
- `npx vitest run --root apps/kosmo-orbit` → **72 Testdateien, 1087/1087
  Tests grün**.
- `npm run typecheck` → alle 8 Workspaces grün (`exactOptionalPropertyTypes`
  bleibt an; der neue `layout`-Parameter an `publish.blattErstellen` brauchte
  dafür `mergeTeilPatch<SheetLayout>({}, p.layout)` statt eines direkten
  Spreads, s. Abschnitt 6).
- `npm run svg-qa` → **33 Goldens geprüft, 0 harte Fehler, 4
  Text-Overlap-Warnungen** (weich, kein Blocker — `abnahmeprotokoll.svg` (1,
  seit D4 bekannt), `blatt-autofuellung.svg` (8), `blatt-framework.svg` (3),
  `plankopf-framework.svg` (24) — letztere drei sind bereits VOR diesem
  Sammelwechsel entstanden bzw. bleiben inhaltlich unverändert
  [`blatt-framework`/`plankopf-framework`]; ihre Overlap-Zahl ist also KEIN
  P7-Befund, sondern vorbestehend, hier nur zur Vollständigkeit mitgemeldet).
- E2E-Batch (7 Spec-Dateien, 83 Tests) → **83/83 grün** nach den zwei oben
  beschriebenen Fixes.
- Screenshot `test-results/sammelwechsel-blatt.png`: Bestands-Blatt
  (`publish.blattErstellen` ohne jedes `layout`/`plankopf`-Feld) zeigt sofort
  Heftrand (20mm links), Faltmarken, Wasserzeichen «STUDIE — NICHT FÜR
  AUSFÜHRUNG» (VS-Phase), Massstabsbalken und Nordpfeil (Grundriss platziert)
  sowie den vollen 180×55-Plankopf unten rechts — visueller Nachweis des
  Default-Flips.
