# Golden-Wechsel D4 — Sammelwechsel «Zwei Stimmen» (v0.7.3, Stream S3)

Der ZWEITE und letzte erlaubte Sammelwechsel der Welle (Golden-Regime,
Grundsatz 4 der `V073-GESTALTUNG-SPEZ.md`): Blatt-Typografie «Zwei Stimmen»
(§D4, Soll `docs/soll-073/5b-d4-zwei-stimmen.png`) — Titel-Stimme (Lato Heavy,
versal, +0.04em Tracking) und Messbar-Stimme (IBM Plex Mono, Tabellenziffern)
lösen die bisherige gemischte Blatt-Typografie ab. Diese Datei wurde VOR der
Regeneration geschrieben (Abschnitt 1–2, Erwartungsliste), der Ist-Teil danach
ergänzt (Abschnitt 3).

## 0 · Besitz-Grenze (wichtig für die Erwartungsliste)

Mein Revier für D4 ist explizit: `derive/stilblatt.ts` (nur Schrift-Zeilen),
`sheet.ts`, `dimensions.ts` (nur font-family), `blattfuellung.ts`, die 5
Blatt-Module (`bauablaufblatt.ts` · `abnahmeprotokoll.ts` ·
`ausnuetzungsnachweis.ts` · `studienbericht.ts` · `kvblatt.ts`),
`export-plan.ts`/`export-sheets.ts`, `public/fonts/pdf/`. **`plansvg.ts`,
`section.ts`, `schwarzplan.ts` sind NICHT mein Besitz** (Merge-Gesetz Welle 2:
S4-Revier, bereits auf d160283 gemergt).

Maschinelle Prüfung (Explore-Agent, vor der Regeneration): **alle**
Grundriss-/Ansicht-/Schnitt-/Schwarzplan-Goldens entstehen über `planToSvg`
bzw. `sectionInnerSvg` (beide `plansvg.ts`) oder `schwarzplanSvg`
(`schwarzplan.ts`) — keines davon ist meine Datei. `dimensions.ts` selbst
enthält **kein einziges** `font-family`/`font-size` (nur `DimensionChain`-
Berechnung + `dimensionLabel()`, die SIA-Hochzahl-Funktion) — die
Bemassungs-TEXTE werden in `plansvg.ts` gezeichnet (ohne eigene
`font-family`, sie erben vom umgebenden `<svg font-family="…">`-Wurzelelement
bzw. tragen ein hartcodiertes `"monospace"`). Ergebnis: **`dimensions.ts`
bleibt unverändert** (0 Zeilen Diff) — die Datei ist bereits «nur
font-family»-sauber, weil sie schlicht keine Font-Zeile besitzt.

Nur EIN Golden läuft über eine Geometrie-Einbettung, die ich kontrolliere:
`blatt-autofuellung.svg` (`sheetToSvg`, mein Revier) bettet
`planInnerSvg`/`sectionInnerSvg`/`axoInnerSvg`-Fragmente OHNE eigenen
`<svg>`-Wurzel ein — sie erben die Font-Family der Sheet-Wurzel. Ich habe die
Sheet-Wurzel bewusst NICHT auf die Messbar-Stimme umgestellt (das würde auch
den unbeteiligten Freitext-Prosa-Pfad mono-isieren) — nur einzelne Elemente,
die ich selbst zeichne (Plankopf, Platzierungs-/Bild-Titel, Legenden,
Revisionen), tragen jetzt explizite `font-family`-Attribute. Die
eingebetteten Bemassungs-/Achs-Texte aus `plansvg.ts` (kein eigenes
`font-family`, erben die Wurzel `"Helvetica, Arial, sans-serif"`) bleiben
darum **unverändert** — dies ist eine bewusste, dokumentierte Grenze:

> **Offener Punkt an den Koordinator:** Die Spezifikation nennt
> «dimensions.ts → auch Grundriss/Schnitt/Ansicht» als betroffen. Nach
> Code-Analyse liegt die tatsächliche Text-Rendering-Stelle für Bemassung/
> Achsköpfe/Etiketten in `plansvg.ts` (Stream S1/S4-Revier, nicht meins).
> Die 22 Grundriss-/Schnitt-/Ansicht-/Schwarzplan-/`werkplan-beschlag`-Goldens
> bleiben in diesem D4-Sammelwechsel darum **byte-identisch** — sie sind kein
> stiller Bruch, sondern eine Besitz-Grenze, die ich nicht überschreite
> (Merge-Gesetz). Eine vollständige Durchsetzung von D4 auf Bemassungstext
> bräuchte einen minimalen `font-family`-Touch in `plansvg.ts` — das liegt
> ausserhalb meines Mandats in diesem Sammelwechsel und wird hier ehrlich statt
> stillschweigend gemeldet.

## 1 · Stilblatt-Zusätze (`derive/stilblatt.ts`, nur Schrift-Zeilen, neu)

| Token | Wert | Zweck |
| --- | --- | --- |
| `SCHRIFT_TITEL` | `'Lato', Helvetica, Arial, sans-serif` | Titel-Stimme (Plankopf-Titel, Legenden-Titel) |
| `SCHRIFT_MESSBAR` | `'IBM Plex Mono', ui-monospace, monospace` | Messbar-Stimme (Masse, Koten, Etiketten, Plankopf-Meta, Achskreise) |
| `TITEL_TRACKING_EM` | `0.04` | Tracking der Titel-Stimme (fix) |
| `BLATT_TYPO_MM` | `{titel:4.2, untertitel:3.2, meta:2.8, etikett:2.5, trennlinie:0.35}` | mm-Skala D4 (Papier-mm) |
| `versal(s)` | `s.toLocaleUpperCase('de-CH')` | Versalsetzung der Titel-Stimme |
| `titelAttr(size)` / `TITEL_STIL` | SVG-Attributstring | Titel-Stimme mit/ohne fixe Grösse |
| `messbarAttr(size)` | SVG-Attributstring inkl. `font-feature-settings="'tnum'"` | Messbar-Stimme |

Geometrie/Stift/Grau (`STIFT`, `GRAU`, `GRAU_SONDER`, `DASH`, `BLATT.tinte`,
`BLATT.rahmenStift`, `BLATT.kastenStift`, `BLATT.trennStift`,
`BLATT.textSekundaer`, `SCHWARZPLAN_FARBEN`, `abVorprojekt`, `UMBAU_*`) bleiben
byte-identisch — TABU, s. Schutzliste. Neu ist ausschliesslich der D4-Block.

## 2 · Erwartungsliste (VOR der Regeneration geschrieben)

### Betroffen (font-family/Grösse/Versalisierung ändert sich)

| Golden | Erwartung |
| --- | --- |
| `blatt-autofuellung.svg` | Plankopf-Titel (Projektname) versal + Lato-Kette + 0.04em, Grösse 4 → 4.2; Sheet-Name-Untertitel neu explizit 3.2 (war implizit 3); Meta-Zeilen (Datum/Phase, Massstab, Blatt-Format) → Mono-Kette + `font-feature-settings`, Grösse 3 → 2.8; Plankopf-Trennlinie `stroke-width` 0.18 → 0.35; Platzierungs-Titel (falls in der Fixtur `title` gesetzt) versal + Lato, Grösse 3.6 → 2.5, Massstab-`tspan` → Mono + 2.5. Geometrie (Grundriss/Schnitt/Axo/Situationsplan-Fragmente aus `plansvg.ts`/`schwarzplan.ts`) UNVERÄNDERT (fremdes Revier). |
| `abnahmeprotokoll.svg` | Titel versal + Lato-Kette + 0.04em (Grösse bleibt 22 px, Report-Modul rechnet in Px, s. §0-Anmerkung unten); Meta-Zeile (Phase/Datum/Zusammenfassung) → Mono + tnum; Status-/Frist-Werte in der Mängeltabelle → Mono + tnum. Ehrlichkeits-Text, Tabellenköpfe, Gewerk-Namen, Ort/Beschreibung UNVERÄNDERT (Prosa/Label, keine der zwei Stimmen). |
| `ausnuetzungsnachweis.svg` | Titel versal + Lato; Meta-Zeile → Mono; Badge «ZUSAMMENSTELLUNG — KEINE BEWILLIGUNG» → Mono (behält `letter-spacing="1"`); Tabelle-1-Zahlenwerte (HNF-Soll/aGF-Ziel/Ausgezogen/Differenz) → Mono; Tabelle-2 Ist/Erlaubt-Werte → Mono. Tabellenköpfe, Zeilen-Labels, Status-Wort, Fusszeile UNVERÄNDERT. |
| `bauablaufblatt.svg` | Titel versal + Lato; Meta-Zeile → Mono; Wochenraster-Zifferbeschriftung (0,1,2,…) → Mono. Gewerk-Zeilenbeschriftung, Ehrlichkeits-Text, Fusszeile UNVERÄNDERT. |
| `kvblatt.svg` | Titel versal + Lato; Meta-Zeile → Mono; Badge «RICHTWERT — KEIN DEVIS» → Mono; BKP-Code + CHF-Beträge (Zeilen + Total) → Mono. Bezeichnung-Spalte, Tabellenköpfe, Fusszeile UNVERÄNDERT. |
| `studienbericht.svg` | Titel versal + Lato (Grösse 26); Meta-/Ziel-Zeile → Mono; Badge «EMPFEHLUNG» → Mono; Varianten-Namen (Situationskarte + Vergleichstabellen-Kopf) versal + Lato (Legenden-Titel-Lesart); Freifläche/Geschosse/Höhe-Zeile + Tabellenwerte → Mono. Empfehlungssätze, Zeilen-Labels, Beurteilungssätze, Fusszeile UNVERÄNDERT. |

**Erwartete Summe: 6 geänderte Goldens.**

### NICHT betroffen (byte-identisch erwartet)

Alle 22 übrigen Goldens — Begründung je Gruppe:

- `grundriss-*.svg` (9), `ansicht-*.svg` (4), `schnitt-*.svg` (3),
  `werkplan-beschlag.svg` (1) — erzeugt über `plansvg.ts`s `planToSvg`/
  `sectionInnerSvg` (fremdes Revier, §0). Ihre Wurzel-`font-family` bleibt
  hartcodiert `"Helvetica, Arial, sans-serif"`, Achs-/Etiketten-Texte bleiben
  hartcodiert `"monospace"` — ich rühre `plansvg.ts` nicht an.
- `schwarzplan.svg`, `schwarzplan-nachbarn.svg` (2) — `schwarzplan.ts`,
  fremdes Revier, trägt ausserdem gar keine Bemassungstexte.
- `interop-referenz-normalisiert.ifc` (1) — kein SVG, kein Font-Bezug.

Macht 9+4+3+1+2+1 = **22 unverändert**, macht in Summe **28 Goldens total**
(6 geändert + 22 unverändert) — deckt sich mit der vollständigen
Golden-Verzeichnisliste.

## 3 · Ist-Vergleich nach Regeneration (12.07.2026)

**Erwartung vs. Ist: exakt getroffen — genau 6 geänderte Goldens, 22
unverändert** (`git status --porcelain -- packages/kosmo-kernel/test/golden/`
zeigt exakt `abnahmeprotokoll.svg`, `ausnuetzungsnachweis.svg`,
`bauablaufblatt.svg`, `blatt-autofuellung.svg`, `kvblatt.svg`,
`studienbericht.svg` — kein einziges der 22 unter §2 vorhergesagten
unveränderten Goldens tauchte im Diff auf).

**Maschineller Beweis (`docs/rundgang/d4-golden-diff-verify.py`):** je
geändertem Golden alt (git `HEAD`) gegen neu (Arbeitskopie) normalisiert —
alle fünf D4-Attribute (`font-family`, `font-weight`, `font-size`,
`letter-spacing`, `font-feature-settings`) entfernt, jeder Text-Knoten versal
gemacht (Ziffern/Satzzeichen bleiben unberührt) — danach **byte-identisch**
für 5 der 6 Dateien; die sechste (`blatt-autofuellung.svg`) trägt zusätzlich
GENAU die eine geplante Stift-Änderung (`stroke-width` der Plankopf-
Trennlinie 0.18→0.35, `BLATT_TYPO_MM.trennlinie`) — nach Normalisierung auch
dieser einen Zeile ebenfalls byte-identisch. Ergebnis für alle 6 Dateien:
**0 unerklärte Zeilen, 0 Geometrie-/Koordinaten-/Farb-/Stift-Diff ausserhalb
der einen dokumentierten Trennlinie**.

```
OK   abnahmeprotokoll: nach Entfernen der D4-Font-Attribute + Versal-Normalisierung BYTE-IDENTISCH (0 Geometrie-/Text-Diff)
OK   ausnuetzungsnachweis: nach Entfernen der D4-Font-Attribute + Versal-Normalisierung BYTE-IDENTISCH (0 Geometrie-/Text-Diff)
OK   bauablaufblatt: nach Entfernen der D4-Font-Attribute + Versal-Normalisierung BYTE-IDENTISCH (0 Geometrie-/Text-Diff)
OK   blatt-autofuellung: nach Entfernen der D4-Font-Attribute + Versal-Normalisierung BYTE-IDENTISCH (0 Geometrie-/Text-Diff)
OK   kvblatt: nach Entfernen der D4-Font-Attribute + Versal-Normalisierung BYTE-IDENTISCH (0 Geometrie-/Text-Diff)
OK   studienbericht: nach Entfernen der D4-Font-Attribute + Versal-Normalisierung BYTE-IDENTISCH (0 Geometrie-/Text-Diff)

Gesamtergebnis: ALLE 6 GOLDENS NUR FONT+VERSAL, 0 GEOMETRIE-DIFF
```

Stichprobe `kvblatt.svg` (Ist): Titel `KOSTENVORANSCHLAG-GROBSCHÄTZUNG — …`
(Lato-Kette, `letter-spacing="0.04em"`, bold, 22 px unverändert — Report-
Module rechnen in Px, s. §0); Meta-Zeile + Badge «RICHTWERT — KEIN DEVIS» +
BKP-Codes + alle CHF-Beträge (Zeilen + Total) → Mono-Kette +
`font-feature-settings="'tnum'"`; Bezeichnung-Spalte, Tabellenköpfe,
Fusszeilen-Sätze byte-identisch zur alten Fassung (ausser Attribut-Diff aus
den beiden Änderungen oben — keine).

## 4 · 700 vs. 900 — Lato «Heavy» (empirischer Render-Vergleich)

`@fontsource/lato` kennt **kein Gewicht 800** («Heavy») — nur 700 (Bold) und
900 (Black). Vorgehen (empirisch, kein Vortäuschen von «Heavy 800»):

1. Beide Gewichte als latin-subsettete TTF aus `@fontsource/lato`
   (`npm pack`, registry.npmjs.org direkt erreichbar) via `fontTools`
   entflaviort + `pyftsubset`-subsettet.
2. Titel «BAUEINGABE SÜD» (Soll-Wortlaut aus `docs/soll-073/5b-d4-zwei-
   stimmen.png`) mit BEIDEN Gewichten in echtem Chromium
   (`playwright-core`, derselbe Rasterizer wie `tools/svg-qa`) gerendert,
   `letter-spacing:0.04em`, `text-transform:uppercase`, 24 px.
3. Skalierter Seit-an-Seit-Vergleich gegen den Soll-Titel-Ausschnitt.

**Renderings:** `docs/rundgang/d4-lato-700-vs-900.png` (beide Gewichte
einzeln), `docs/rundgang/d4-lato-700-vs-900-vs-soll.png` (Soll oben, 700
Mitte, 900 unten, alle auf dieselbe Textbreite skaliert),
`docs/rundgang/d4-soll-titel-crop.png` (Referenz-Ausschnitt).

**Befund:** Die Strichstärke des Soll-Titels ist deutlich kräftiger als Lato
700 (Bold) — die Balken/Bögen der Soll-Buchstaben («B», «G», «S») wirken
blockiger, die Innenräume kleiner, als beim 700er-Rendering. Lato 900
(Black) trifft diese Strichstärke sichtbar näher. **Entscheid: Lato 900
(Black)** als Annäherung an «Heavy» — dokumentiert, nicht als «800»
ausgegeben. Die font-family-Kette in den Kernel-Goldens bleibt so oder so
neutral `'Lato', …` (das Gewicht steckt in der PDF-eingebetteten TTF-Datei,
nicht im Golden-String) — der Entscheid wirkt sich NUR auf die Wahl von
`apps/kosmo-orbit/public/fonts/pdf/lato-900-latin-pdf.ttf` (statt 700) fürs
`addFont`-Mapping in `export-plan.ts`/`export-sheets.ts` aus.

**Bekannte Grenze (ebenfalls empirisch entdeckt):** Weder Lato noch IBM Plex
Mono enthalten Glyphen für hochgestellte Ziffern 4–9 (U+2074–U+2079) — auch
nicht über ein OpenType-`sups`-Feature. Die SIA-Bemassung (`dimensionLabel`)
zeigt den hochgestellten mm-Rest nur für 1–9 (Rest 0 kommt nie vor) — im
PDF-Pfad mit eingebettetem Font fehlt für Rest 4–9 die Glyphe, Rest 1–3
(Latin-1 `¹²³`) funktioniert. Empirisch bestätigt per `docs/rundgang/
d4-pdffonts-stichprobe.mjs` + `pdftoppm`-Rendering
(`d4-pdffonts-stichprobe-1.png`): «361⁵» wird lautlos zu «361» — kein
sichtbares Tofu-Kästchen, sondern ein stiller Verlust des mm-Rests. Details +
Empfehlung für 0.7.4: `apps/kosmo-orbit/public/fonts/pdf/README.md`.

## 4b · Entdeckte Nebenwirkung: Titel-Overflow (svg-qa, VOR dem Commit gefixt)

Die erste svg-qa-Runde (vor diesem Fix) zeigte **2 harte Text-Containment-
Fehler**: `kvblatt.svg` (Titel 230 px ausserhalb der 794-px-viewBox) und
`ausnuetzungsnachweis.svg` (32 px ausserhalb). Ursache: die zusammengesetzten
Titel-Strings der Report-Module («Kostenvoranschlag-Grobschätzung —
Ersatzneubau Zürich-Altstetten») werden mit versal + `letter-spacing:0.04em`
bei unverändertem `font-size="22"` (Px-Massstab dieser Module, s. §0) rund
30–34 % breiter als die vormals gemischtschreibige, trackinglose Fassung —
bei `kvblatt.svg` reicht das, um die feste 794-px-Blattbreite zu sprengen.
`abnahmeprotokoll.svg`/`bauablaufblatt.svg`/`studienbericht.svg` blieben mit
denselben Fixturen knapp innerhalb der Toleranz (kürzere Modul-/Projekt-
namen bzw. deutlich breitere viewBox bei `bauablaufblatt`/`studienbericht`).

**Fix:** Titel-Grösse in den drei betroffenen A4-hoch-Modulen
(`abnahmeprotokoll.ts`, `ausnuetzungsnachweis.ts`, `kvblatt.ts`) von 22 px auf
**17 px** reduziert (`HEADER_TITLE_SIZE`-Konstante, mit Herleitung im
Kommentar) — hält mit Marge auch für längere Projektnamen als die
Golden-Fixtur. `bauablaufblatt.ts` (viel breitere 1123-px-viewBox, quer) und
`studienbericht.ts` (1587-px-viewBox, A3 quer) bleiben unverändert (22/26 px)
— sie waren nie am Limit (Marge 390–1250 px), eine Grössenreduktion dort wäre
unbegründete Zusatz-Politur ohne funktionalen Anlass.

Dies ist eine ECHTE, im ersten svg-qa-Lauf entdeckte Nebenwirkung der
Titel-Stimme (Versalisierung verbreitert Text spürbar mehr als reines
Tracking) — kein Geometrie-Bug, sondern eine notwendige Konsequenz aus
„Titel: versal“ auf zusammengesetzten, nutzergesteuerten Titel-Strings ohne
Zeilenumbruch-Logik in diesen Report-SVGs. Zweite (finale) Golden-
Regeneration nach diesem Fix — weiterhin **genau 6 geänderte Goldens**,
`docs/rundgang/d4-golden-diff-verify.py` bestätigt danach erneut 0 unerklärten
Diff (die Font-Size-Werte selbst werden vom Skript bewusst herausgefiltert,
s. `ATTR_RE`, da sie Teil der geplanten D4-Änderung sind — das Skript prüft
NUR, dass sonst nichts an Geometrie/Koordinaten/Farben/Text abweicht).

## 5 · Gates

svg-qa (`npx tsx tools/svg-qa/pruefe-goldens.mts`) → s. Abschlussbericht;
Kernel-Suite `../../node_modules/.bin/vitest run` → 747/747 grün (6
Golden-Tests + 741 übrige, davon 6 bewusst mitgezogene Matcher-String-Tests
in `bauablauf.test.ts`, `baugesuch.test.ts`, `kostenschaetzung.test.ts`,
`mangel.test.ts`, `studienbericht.test.ts` (×2), `kernel.test.ts` (×3) — alle
prüften vormals gemischtschreibige Titel-Substrings, die jetzt versal sind;
reine Matcher-Strings, kein Golden, Kommentar mit Verweis auf diese Datei
an jeder Stelle ergänzt); Kernel-Typecheck grün.

## 6 · D4-Ergänzung: Messbare Plan-/Schnitt-Schrift auf IBM Plex Mono

Schliesst den in §0 dokumentierten «Offenen Punkt an den Koordinator»: Die
Messbar-Stimme (`SCHRIFT_MESSBAR`, §1) galt bisher nur für die Blatt-Module,
NICHT für `plansvg.ts` (Grundriss/Schnitt/Ansicht) — dort stand die
messbare Beschriftung noch auf hartcodiertem `font-family="monospace"` bzw.
erbte (Bemassungstext) stillschweigend die Root-SVG-Kette
`"Helvetica, Arial, sans-serif"`. Auf einem komponierten Blatt
(`blatt-autofuellung.svg` platziert Grundriss/Schnitt NEBEN die
Mono-Tabellen der Blatt-Module) stand darum Helvetica-Bemassung neben
IBM-Plex-Mono-Tabellenwerten — ein Bruch der «Zwei Stimmen» innerhalb
desselben Blatts. Dieser Nachtrag stellt das her, in engem Rahmen: **nur**
`plansvg.ts`, **nur** die messbaren Textklassen.

### Erwartungsliste (vor der zweiten Regeneration)

| Stelle (`plansvg.ts`) | Vorher | Nachher |
| --- | --- | --- |
| Z. 233 Achskreis-Label | `font-family="monospace"` | `font-family="${SCHRIFT_MESSBAR}"` |
| Z. 246 Plan-Etiketten (`plan.texte`: assoziative Wand-/Decken-/Stützen-/Unterzug-Etiketten, Aussparungs-Koten, Beschlag-Etiketten D6 — ausschliesslich technische Inhalte, KEINE Raumnamen/Zonen-Labels existieren in diesem Pfad) | `font-family="monospace"` | `font-family="${SCHRIFT_MESSBAR}"` |
| Z. 293/297 Bemassungstext + Zusatzzeile (h/BH), horizontale Ketten | keine explizite `font-family` (erbt Root-Helvetica) | explizit `font-family="${SCHRIFT_MESSBAR}"` |
| Z. 308/311 Bemassungstext + Zusatzzeile, vertikale Ketten | keine explizite `font-family` (erbt Root-Helvetica) | explizit `font-family="${SCHRIFT_MESSBAR}"` |
| Z. 508/515 Höhenkoten (OK fertig/roh, Ansicht+Schnitt) | `font-family="monospace"` | `font-family="${SCHRIFT_MESSBAR}"` |

`section.ts` bleibt **unverändert** — die Datei enthält kein einziges
`<text>`/`font-family` (reine Geometrie-Ableitung `SectionSpec`); sämtliche
SVG-Textausgabe für Schnitt UND Ansicht läuft über `plansvg.ts`s
`sectionInnerSvg`, dieselbe Funktion, die auch die Höhenkoten zeichnet.

**Bewusst unangetastet** (kein Messwert, Root-SVG-Fallback, Plankopf/
Nordpfeil ausserhalb dieses Nachtrags-Mandats): der Root-SVG-Fallback
`font-family="Helvetica, Arial, sans-serif"` (~Z. 562), der Nordpfeil-Text
«N» (~Z. 575) und der Plankopf-Titel/-Meta-Text (~Z. 584–587) — diese drei
Stellen tragen aktuell keine explizite Messbar-Kette, obwohl der
Stilblatt-Kommentar «Plankopf-Meta» begrifflich unter Messbar-Stimme fasst;
das ist ein dokumentierter Grenzfall (s. u.), keine übersehene Stelle.

### Ist-Abgleich nach Regeneration (12.07.2026)

21 Goldens geändert (`grundriss-*` ×12 inkl. `grundriss-kontext-*` ×3,
`ansicht-*` ×4, `schnitt-*` ×3, `blatt-autofuellung.svg`,
`werkplan-beschlag.svg`) — deckt sich mit der Erwartung
(alle Goldens, die über `planToSvg`/`sectionInnerSvg` messbaren Text
zeichnen). Maschineller Beweis (Diff-Skript, Zeilenpaar-Vergleich nach
Entfernen des `font-family="…"`-Attributs): **92 geänderte Zeilen über 21
Dateien, alle 92 nach Attribut-Entfernung byte-identisch** — 0
Geometrie-/Koordinaten-/Farb-/`font-size`-Diff ausserhalb der
`font-family`-Attribute. `abnahmeprotokoll.svg` etc. (die 6 Goldens aus §2)
bleiben unverändert (fremder Textpfad, keine Bemassung/Koten).

Gates: `npx tsx tools/svg-qa/pruefe-goldens.mts` → 28 Goldens geprüft, 0
harte Fehler, 1 bekannte `abnahmeprotokoll.svg`-Text-Overlap-Warnung
(unverändert seit §5); Kernel-Suite 33/33 Testdateien · 747/747 Tests grün;
Kernel-Typecheck grün.

### Begründung

Kohärenz «Zwei Stimmen» gilt pro Blatt, nicht pro Renderer: Sobald ein
Blatt (`blattfuellung.ts`) Grundriss/Schnitt/Ansicht NEBEN Blatt-Modul-
Tabellen komponiert, muss die Messbar-Stimme über die Renderer-Grenze
hinweg identisch sein — sonst wirkt die zweite Stimme wie ein Zufall der
Implementierung statt wie eine gestalterische Entscheidung. Der Touch bleibt
bewusst eng (nur `font-family`, nur messbare Klassen, keine Geometrie/
Grösse), damit er sich verlustfrei in den D4-Sammelwechsel einfaltet.

## 7 · Plankopf: Titel Lato Heavy versal, Meta Mono

Die letzte «Zwei Stimmen»-Lücke: der Plankopf von `planToSvg`
(`plansvg.ts` ~Z. 582–588) sass noch komplett auf dem Root-SVG-Fallback
`Helvetica, Arial, sans-serif`. Der Plankopf sitzt auf JEDEM gedruckten Plan
(alle `grundriss-*`-Goldens tragen ihn) — damit war der prominenteste
Titel-/Meta-Block der Serie noch stumm gegenüber den zwei Stimmen, während
die Blatt-Module (`sheet.ts` §1) sie längst tragen. Dieser Nachtrag zieht den
Plankopf exakt auf dasselbe Muster wie den Blatt-Plankopf (`sheet.ts`
Z. 313–317).

### Erwartungsliste (vor der Regeneration)

| Stelle (`plansvg.ts`) | Vorher | Nachher |
| --- | --- | --- |
| Z. 584 Plankopf-Titel (`opts.projectName`) | `font-weight="bold" font-size="4.2"`, Root-Helvetica geerbt, gemischtschreibig | `titelAttr(BLATT_TYPO_MM.titel)` = Lato-Kette + `letter-spacing="0.04em"` + `font-weight="bold"` + `font-size="4.2"` (unverändert), Text `versal(...)` — exakt das Muster der Blatt-Modul-Titel |
| Z. 586 Plankopf-Meta (Massstab · «Masse in cm/m») | keine `font-family` (Root-Helvetica geerbt), `font-size` 3.2 aus `<g>` geerbt | `font-family="${SCHRIFT_MESSBAR}" font-feature-settings="'tnum'"` ergänzt, `font-size` **bleibt** geerbt 3.2 |
| Z. 587 Plankopf-Meta (Datum · Phase) | wie Z. 586 | wie Z. 586 |

**Bewusste Abweichung von `messbarAttr` bei den Meta-Zeilen:** `messbarAttr(size)`
setzt eine EXPLIZITE `font-size` (im Blatt-Kontext `BLATT_TYPO_MM.meta` = 2.8).
Der Plankopf-Meta erbt aber 3.2 vom umschliessenden `<g font-size="3.2">`;
`messbarAttr(2.8)` würde die sichtbare Grösse 3.2 → 2.8 verkleinern — das wäre
eine `font-size`-Änderung, die die harte D4-Grenze dieses Nachtrags verbietet.
Darum trägt der Meta hier NUR `font-family` + `font-feature-settings="'tnum'"`
(der `SCHRIFT_MESSBAR`-Weg ohne Grössenbindung), Grösse bleibt byte-gleich.

**Grenzfall Untertitel (Z. 585, `planTitle · storey`):** bewusst NEUTRAL auf
dem Root-Fallback belassen — kein Messwert, nicht der Haupttitel; Soll 5b zeigt
den Untertitel in schlichtem Regular. Keine stille Änderung.

**Legenden-Titel:** existiert im `plansvg.ts`-Pfad NICHT (Grep über
`derive/`: `Legende`/`legende` nur in `sheet.ts` + den fünf Blatt-Modulen,
nicht in `plansvg.ts`/`section.ts`). Nichts umzustellen.

### Ist-Abgleich nach Regeneration (12.07.2026)

13 Goldens geändert (`grundriss-*` ×12 + `werkplan-beschlag.svg` — der
einzige weitere Grundriss mit Plankopf; `blatt-autofuellung.svg` und die
`ansicht-*`/`schnitt-*`-Goldens tauchen NICHT auf: Schnitte/Ansichten laufen
über einen Plankopf-losen Wrapper, das Blatt bettet Plankopf-lose Fragmente
ein). Maschineller Beweis (Diff-Skript: Zeilenpaar-Vergleich nach Entfernen
von `font-family`/`letter-spacing`/`font-weight`/`font-feature-settings` UND
case-insensitivem Versal-Abgleich): **39 geänderte Zeilen über 13 Dateien (je
3: Titel + 2 Meta), alle nach Normalisierung byte-identisch** — 0
Geometrie-/Koordinaten-/`font-size`-Diff. Stichprobe `grundriss-testhaus.svg`:
Titel `GOLDEN-TESTHAUS` (Lato-Kette, `letter-spacing="0.04em"`, `font-size="4.2"`
unverändert, `x="10" y="285"` unverändert); beide Meta-Zeilen → Mono-Kette +
`tnum`, Koordinaten `x="410"` unverändert; Untertitel byte-identisch.

Gates: `npx tsx tools/svg-qa/pruefe-goldens.mts` → Exit 0, 28 Goldens, 0 harte
Fehler (insbesondere Text-Containment aller `grundriss-*` ✓ — der versal +
getrackte Titel sprengt die Plankopf-Breite NICHT, anders als die
zusammengesetzten Report-Titel in §4b), 1 bekannte
`abnahmeprotokoll.svg`-Overlap-Warnung; Kernel-Suite 33/33 · 747/747 grün;
Kernel-Typecheck grün.

### Begründung

Der Plankopf ist der einzige Text, den JEDER gedruckte Plan trägt — die
sichtbarste Stelle der zwei Stimmen überhaupt. Ihn auf dem generischen
Helvetica-Fallback zu lassen, während Bemassung/Koten (§6) und die
Blatt-Module (§1) bereits Lato/Mono sprechen, wäre die auffälligste
verbleibende Inkonsistenz gewesen. Mit diesem Nachtrag ist D4 «Zwei Stimmen»
über alle Renderer (Blatt-Module, Plan/Schnitt/Ansicht, Plankopf) durchgängig.

### Offene 0.7.4-Zeile (nicht in D4 aufgemacht)

Der Nordpfeil-Buchstabe «N» (`plansvg.ts` ~Z. 575) und der Untertitel bleiben
auf dem Root-Fallback. «N» ist eine Kartografie-Signatur, kein Titel/Messwert
— eine Zuordnung zu einer der zwei Stimmen ist Auslegungssache und wurde
bewusst NICHT in diesem letzten D4-Touch entschieden, sondern als 0.7.4-Frage
notiert (Konsistenz Nordpfeil-Signatur vs. Root-Neutralität).
