# v0.8.0 «KosmoPublish Plankopf-Framework» — Plankopf-Spezifikation (verbindlich)

*P0 · Paket W0 des v0.8.0-Wellenplans. Dieses Dokument ist die verbindliche Grundlage für P1–P11 —
jede Zahl, jeder Entscheid und jede Vertagung hier ist der Massstab, gegen den P9 (Matrix-Abnahme)
am Ende prüft. Änderungen an dieser Spez nach W0 sind Owner-Sache, nicht Bauagenten-Ermessen.*

## 0 · Kopf

**Quelle:** Owner-Handoff `KosmoPublish_PlankopfFramework.zip` (15.07.2026) — zwei React-DC-
Prototypen, extrahiert nach `scratchpad/v080-extrakt/{vorlage,prototyp}/seite.html` und
digest-verdichtet in `scratchpad/v080-digest-vorlage.json` / `v080-digest-prototyp.json` (alle
Zeilenverweise unten stammen aus diesen zwei Digests, sofern nicht anders vermerkt). **Vorlage**
= das Blattlayout-/Plankopf-Regelwerk, das dieses Dokument produktiv festschreibt. **Prototyp**
= die «KosmoPublish-Station» (3-Screen-Werkbank Layout/Publizieren/KosmoPackage); daraus fliesst
in v0.8.0 nur ein kleiner, ehrlich tragfähiger Ausschnitt (Export-Hub real, Plankopf als fixe,
nicht verschiebbare Blatt-Chrome) — s. Abschnitt 8 und die Vollständigkeits-Matrix in Abschnitt 9.
Die Analyse lief als vierstufiger Ultracode-Workflow (Digests → `scratchpad/v080-design.md` →
adversariale Gegenprüfung `scratchpad/v080-kritik.md` → diese Spez), alle drei Zwischendokumente
sind im Scratchpad nachvollziehbar.

**Geltung:** v0.8.0 «KosmoPublish Plankopf-Framework + Default-Oberflächen». Diese Spez bindet die
Pakete P0–P11 sowie PD1–PD2 (Werkstrom Default-Oberflächen). Jede Abweichung von einer hier
fixierten Zahl oder einem hier dokumentierten Entscheid während der Umsetzung ist ein
Spec-Bruch und muss vor dem betroffenen Paket-Gate zurück an die Spez (nicht stillschweigend im
Code entschieden werden).

**Verhältnis zu bestehenden Leitdokumenten:**

- **`docs/GESTALTUNGSKONZEPT.md`** («Werkplan»-Stil, Schwarz/Weiss-Standard, Korn-Textur, «Zwei
  Stimmen»-Typografie) bleibt unverändert die Grundlage für das UI-Erscheinungsbild von
  PublishWorkspace/PlankopfPanel. Diese Spez fügt dem nichts hinzu und widerspricht ihm nicht —
  sie regelt ausschliesslich die **Papier-Geometrie und Plankopf-Semantik der gedruckten/
  exportierten Blätter**, die seit je einer eigenen, theme-invarianten Konvention folgen (s.
  `V073-GESTALTUNG-SPEZ.md` Grundsatz 1 «Papier ist Papier»).
- **`docs/OWNER-MANDAT.md`** bleibt der übergeordnete Produktrahmen (V1-Bauplan, Owner-
  Entscheidtabelle). Diese Spez erweitert ihn NICHT um neue Grundsatzfragen, sondern setzt vier
  am 15.07.2026 getroffene Owner-Entscheide (Abschnitt 0.1) sowie die Einarbeitung einer
  adversarialen Gegenprüfung (Abschnitt 0.2) in ein bau-taugliches Regelwerk um.
- **`derive/stilblatt.ts`** (seit v0.7.3, «Ein Stilblatt, zwei Renderer») bleibt die einzige Quelle
  für Zeichnungs-Typografie/-Stifte; diese Spez erweitert sie NUR additiv (`PLANKOPF_TYPO_MM`,
  `PHASEN_AKZENTE`), reisst keinen bestehenden Report-Golden an (s. Abschnitt 6).
- **`docs/V075-STAMMDATEN.md`** (Projekt-Stammdaten `ProjektInfo`, Golden-Guard-Muster
  `plankopfStammdatenZeile`) ist der unmittelbare Vorläufer: v0.8.0 baut das dort begonnene,
  geguardete Plankopf-Feld zum vollen 180×55-mm-Framework aus, nach demselben Guard-Prinzip
  («fehlende Daten → Alt-Verhalten, byte-identisch»).

### 0.1 · Owner-Entscheide (15.07.2026, verbindlich)

1. **Phasen-Quelle = SIA-Teilphase** (`settings.siaPhase`, 8→6-Abbildung `siaZuMatrixStufe()`,
   Abschnitt 2.2). Der Plan-Darstellungsgrad (`settings.phase`, `BauPhase`) bleibt **entkoppelt**
   (Beschluss 03.07.2026 bleibt intakt — der Plankopf zeigt den PROJEKTSTAND, der Zeichenstil
   bleibt eigenständig wählbar).
2. **Bestand: alle Blätter automatisch umstellen** beim Golden-Sammelwechsel 080; A0-Plakat-
   Preset-Blätter (Toolkit 5, `erzeugePlakat()`) mit dokumentierter Ausnahme (kein Heftrand);
   `publish.blattFuellen` räumt Kollisionen der Bestands-Platzierungen auf; das Wechsel-Doc
   (`docs/GOLDEN-WECHSEL-080.md`) benennt diese Umstellung ehrlich (Abschnitt 5).
3. **Default-Oberflächen** (neue Owner-Anforderung, unabhängig vom Plankopf-Strom): je Station
   benannte Layout-Presets **Fokus** · **Arbeiten** · **Prüfen** (Abschnitt 7).
4. **Fable-Technikentscheid** (Antwort auf Gegenprüfungs-Frage 3, vom Owner mitgetragen):
   `planToSvg` (Design-Einzelexport) behält in v0.8.0 seinen kompakten ~18-mm-Fussstreifen — der
   volle 180×55-Plankopf gilt ausschliesslich für PUBLISH-Blätter (`sheetToSvg`). Der volle
   Plankopf im Einzelexport ist ein dokumentierter v0.8.1-Kandidat (Abschnitt 5.3).

### 0.2 · Einarbeitung der Gegenprüfungs-Funde (`scratchpad/v080-kritik.md`, verbindlich)

Die adversariale Gegenprüfung fand fünf Codebasis-Risiken und drei ungeklärte Spec-Lücken. Alle
sind in dieser Spez aufgelöst; die Fundstelle ist hier zur Nachvollziehbarkeit referenziert:

| Gegenprüfungs-Fund | Auflösung in dieser Spez |
|---|---|
| Phasen-Quelle widersprüchlich (`settings.phase` vs. `settings.siaPhase`, 8 vs. 5 vs. 6 Werte) | Entscheid 1 + Abschnitt 2.2 (`siaZuMatrixStufe`, Unit-Tests für alle 8 `SiaPhase`-Werte) |
| `planToSvg`-Zentrierung (`plansvg.ts:679–685`) bricht das diff-verify-Kriterium der 15 Goldens | Entscheid 4 — `planToSvg` unangetastet, Zentrierungs-Konflikt entfällt (Abschnitt 5.3) |
| «Migrationsfrei» gilt nur fürs Schema, nicht fürs Rendering (Bestands-Placements) | Entscheid 2 + Abschnitt 5.1/5.2 (automatische Umstellung, Plakat-Ausnahme, `blattFuellen`-Aufräumung, ehrliches Wechsel-Doc) |
| Default-Semantik der `SheetLayout`-Booleans kippt beim Sammelwechsel, war nicht fixiert | Abschnitt 5.1 (Post-Sammelwechsel-Defaults FIXIERT) |
| Logo-Format: `bueroSetzen` trägt nur den PNG-IHDR-Weg, Nicht-PNG unspezifiziert | Abschnitt 4.3 + Abschnitt 8 (ehrliche Fehlermeldung, kein stiller Fehlschlag, SVG/JPG = v0.8.1-Kandidat) |
| Massstab-Chips: Verhalten undefiniert (setzen sie den Blattmassstab? welchen?) | Abschnitt 2.3 (Chips setzen den Massstab der SELEKTIERTEN Platzierung via `publish.ansichtAnpassen`; ohne Selektion nur Empfehlung-Anzeige) |
| Aussenbemassung + Toggle «Bemassung & Massstab»/«Schematische Zeichnung» ohne Zuordnung | Abschnitt 7 unten / Abschnitt 8 (Aussenbemassung + «Zonen»-Toggle: rein Preview-lokal in P6, kein Doc-Feld, nie im Export) |
| Phasen-Detailkarte (rechte Infokarte der Vorlage) ohne Zuordnung | Abschnitt 8 (P6: schmaler Info-Block im PlankopfPanel — Freigabe/WZ/Index/Massstäbe der aktiven Stufe) |
| W8: P10 ∥ P11 nicht parallelisierbar (P10 hängt vom P11-Ausgang ab) | Wellenplan-Korrektur: P11 (Dock-Stretch) läuft VOR P10 (Release-Finale), nicht parallel — s. Plan Abschnitt «Einarbeitung», Sequenz-Fix |

---

## 1 · Blattlayout-Regelwerk

Grundsatz (Vorlage, Z.1562–1563): Das **Blattformat bestimmt NUR die Zeichenfläche**. Plankopf,
Ränder, Heftrand, Faltung und Lochung sind über alle Formate **konstant** (in mm, nicht relativ).
Neue reine Funktionsdatei `packages/kosmo-kernel/src/derive/blattlayout.ts` wird zur EINZIGEN
Quelle dieser Zahlen und löst die bisher verstreuten 18/22/26/30/40-mm-Konstanten ab
(`blattfuellung.ts:283`, `commands/publish.ts:739`, PublishWorkspace-Offsets, `plansvg.ts` 18/22).

### 1.1 · Formate & Zeichenflächen

`SheetFormat` bleibt `'A0' | 'A1' | 'A2' | 'A3' | 'A4'` (Kernel-Bestand, `entities.ts:376`) —
**«Rolle» (1600×594 mm, variable Länge) ist NICHT Teil des v0.8.0-Datenmodells** (vertagt,
Abschnitt 8: Länge im Prototyp selbst ungeklärt). Zeichenfläche = (Breite−30)×(Höhe−20) mm
(Heftrand 20 mm auf einer Seite + 10 mm gegenüberliegend = 30 mm Breitenabzug; 10+10 mm = 20 mm
Höhenabzug), Ausrichtung `quer`/`hoch` tauscht Breite/Höhe vor der Rechnung:

| Format | Blattmass quer (mm) | Zeichenfläche quer (mm) |
|---|---|---|
| A0 | 1189 × 841 | 1159 × 821 |
| A1 | 841 × 594 | 811 × 574 |
| A2 | 594 × 420 | 564 × 400 |
| A3 | 420 × 297 | 390 × 277 |
| A4 | 297 × 210 | 267 × 190 |
| *Rolle (vertagt)* | *1600 × 594\** | *1570 × 574* |

\* Rolle: Länge laut Prototyp «variabel», aber überall hart mit 1600 mm gerechnet — offene Frage
des Prototyps selbst, kein v0.8.0-Scope (Abschnitt 8).

Rahmen: 1 px/mm-Volllinie in Tintenfarbe (`BLATT.tinte`, bestehender Stilblatt-Token) entlang
aller vier Ränder — Fortführung des heutigen `sheet.ts`-Rahmens (aktuell einheitlich 10 mm,
`sheet.ts` Zeile *«Blattrahmen (10 mm Rand, SIA-üblich)»*), NICHT mehr einheitlich, sondern mit
dem in 1.2 differenzierten Heftrand.

### 1.2 · Ränder & Heftrand

- Heftrand: **20 mm links** (Buchbinderrand).
- Übrige drei Ränder: **10 mm**.
- **Fixierter Entscheid (P0):** Der Heftrand liegt **immer links**, unabhängig von `orientation`
  (`quer`/`hoch`) — dies war eine offene Frage der Gegenprüfung («ist der linke 20-mm-Rand auf
  der kurzen Seite im Hochformat gewollt, DIN 824 faltet i. d. R. querformatige Blätter?»). Die
  Spez legt fest: **ja, links bleibt links**, unabhängig vom Format-Seitenverhältnis. Grund:
  Konsistenz der Ablageposition (jedes Blatt liegt im Ordner mit demselben Heftrand-Rand),
  wichtiger als eine physikalisch «optimale» Faltrichtung im Hochformat-Einzelfall.

### 1.3 · Faltung (DIN 824)

Endpaket immer A4, Schriftfeld liegt nach der Faltung **zuoberst**. Faltmarken-Logik:

- **Vertikale Marken** (Strich oben+unten): von rechts beginnend bei **210 mm**, danach alle
  **190 mm** weiter, bis der Heftrand (20 mm links) erreicht ist.
- **Horizontale Marke** (links+rechts): bei **Höhe−297 mm**, NUR falls Höhe > 300 mm.
- A4 bleibt ungefaltet (kein Faltmarken-Rendering nötig).
- Rolle würde als Leporello gefaltet — **vertagt** (Abschnitt 8), da die Faltlogik für variable
  Länge ungeklärt ist.

### 1.4 · Lochung (ISO 838 — bewusste Korrektur ggü. Prototyp)

Der Prototyp positioniert die Lochung in **Pixeln** (`H/2 ± ~40px` der Vorschau) — auf kleinen
Formaten (A4-Vorschau) nicht normgerecht skaliert. Diese Spez korrigiert das bewusst: Lochung wird
**in mm** definiert, nach **ISO 838**: **2 Löcher**, **80 mm Achsabstand**, mittig im Heftrand bei
Blatthöhe/2 ± 40 mm. `derive/blattlayout.ts` liefert `lochungMm(hoehe)` als reine Funktion.

### 1.5 · Plankopf-Geometrie

- Fixe Grösse **180 × 55 mm**, identisch auf **jedem** Format — Ecke **unten rechts**, innerhalb
  des Rahmens.
- **3 Spalten**: `colL` 48 mm · `colM` 70 mm · `colR` Rest (180 − 48 − 70 = **62 mm**).
- **Akzentbalken**: 1.3 mm dicker Balken an der Oberkante, in der Phasen-Akzentfarbe (Abschnitt 2).
- Spalteninhalt (Vorlage `plankopfHtml`):
  - `colL` (48 mm): Logo-Platzhalterbox, **15 mm hoch**, gestrichelter Rand, Initialen-Fallback
    (mono bold) + Label «BÜRO-LOGO», darunter Büroname (bold) + Adresse.
  - `colM` (70 mm): Bauherrschaft-Zeile, Projekt-Zeile, Standort (Adresse · Parzelle), Planinhalt
    (flex-grow — nimmt den verbleibenden vertikalen Raum der Spalte ein).
  - `colR` (62 mm): Halbzellen-Paare Massstab|Format, Phase (Code · SIA)|Datum,
    Gezeichnet|Geprüft, darunter Plan-Nr. (mono bold), darunter Index/Revisions-Zeile
    (Rev-Buchstabe in Phasenfarbe + Datum + Revisionstext + Zeichner-Kürzel).
  - Feldlabels: mono, VERSAL, Tracking 0.1em.

**mm-Typoleiter** (Bereich 1.3–5.6 mm, Zielwerte aus der Vorlage, gegen svg-qa-Containment zu
verifizieren — s. Abschnitt 6 Risiko 3):

| Feld | Grösse (mm) |
|---|---|
| Feldlabel (mono, VERSAL, Tracking .1em) | 1.3 |
| Logo-Label («BÜRO-LOGO») | 1.3 |
| Token-Annotation (nur Muster-Editor-Ansicht) | 1.4 |
| Rev-Zeile (Datum + Revisionstext + Kürzel) | 1.7 |
| Büroadresse | 1.8 |
| Standort (Adresse · Parzelle) | 1.85 |
| Bauherrschaft | 2.0 |
| Halbzellen-Paare (Massstab\|Format, Phase\|Datum, Gezeichnet\|Geprüft) | 2.0 |
| Büroname (bold) | 2.1 |
| Rev-Buchstabe (in Phasenfarbe) | 2.2 |
| Projekt | 2.4 |
| Planinhalt | 2.9 |
| Plan-Nr. (mono bold) | 3.0 |
| Logo-Initialen (mono bold, Phasenfarbe) | 5.6 |

Diese Tabelle wird additiv in `derive/stilblatt.ts` als `PLANKOPF_TYPO_MM` geführt (P3) — **NICHT**
in `blattlayout.ts` (das bleibt reine Geometrie ohne Typografie).

### 1.6 · Massstabsbalken- und Nordpfeil-Regeln

- **Massstabsbalken**: unten links in der Zeichenfläche, nahe der Plankopf-Oberkante. Meter-
  Segmente abwechselnd Tinte/Papier gefüllt; Segmentanzahl = `clamp(2, 6, round(45 / (1000 /
  Massstabszahl)))`; Beschriftung von «0» bis «n m» (mono) + «M 1:xx».
- **Nordpfeil**: oben rechts in der Zeichenfläche; Pfeil (Linie + Spitze) + Label «N» (mono bold).
- Beide Elemente sind **mm-basiert** in der Produktion (SVG-Papier-mm, keine Pixel) — die
  Vorlage dokumentiert Positions-/Grössenwerte teils als Vorschau-Pixel (z. B. «8 px vom Rahmen»,
  «max(20px, 8 mm·ppm)»), weil ihre Preview mit einem `ppm`-Faktor (px pro mm) skaliert. **Diese
  Pixelwerte sind NICHT normativ** für den Produktions-Renderer — P3 (`derive/plankopf.ts`,
  `massstabsbalkenSvg()`/`nordpfeilSvg()`) migriert die bestehende, bereits mm-echte
  Nordpfeil-Implementierung aus `plansvg.ts` (Kreis r≈4 mm, Pfeilspitze, Label-Grösse 3 mm) als
  Ausgangspunkt und übersetzt die Vorlagen-Proportionen (Abstand vom Rahmen, Grösse relativ zur
  Zeichenfläche) in mm — exakte Ziel-mm-Werte sind eine P3-Implementierungsentscheidung innerhalb
  der svg-qa-Containment-Grenzen, kein Fixwert dieser Spez.
- Nordpfeil erscheint **nur wenn** ein Grundriss oder eine Situationsplan-Ansicht auf dem Blatt
  platziert ist (Post-Sammelwechsel-Default, Abschnitt 5.1) — bei reinen Schnitt-/Ansichts-/
  Detailblättern bleibt er weg.

### 1.7 · Wasserzeichen & AF-Freigabestempel

- **Wasserzeichen**: diagonal **−26°** rotiert, Phasen-Akzentfarbe, Opazität **0.13**, zentriert
  über der Zeichenfläche (der Plankopf-Bereich bleibt ausgespart). Grössenformel der Vorlage:
  `max(15px, 0.048 · Rahmenbreite)` — auch hier gilt die Pixel/mm-Klarstellung aus 1.6: die
  **Verhältniszahl 0.048 (≈ 4.8 % der Rahmenbreite)** ist die normative Grösse, der «15px»-Boden-
  wert ist ein Vorschau-Artefakt; der finale mm-Bodenwert wird von P3 innerhalb der svg-qa-
  Text-Containment-Grenzen festgelegt (Ellipsen-Kürzung im Renderer statt Überlauf, s. Abschnitt
  6 Risiko 3).
- **AF-Freigabestempel** (ersetzt das Wasserzeichen in der Phase AF — es gibt in AF KEIN
  Wasserzeichen): −6° rotiert, 2-mm-äquivalenter Rahmen in Phasenfarbe, abgerundete Ecken, mono
  bold Text «FREIGEGEBEN FÜR AUSFÜHRUNG» + Datumszeile, positioniert im oberen Bereich der
  Zeichenfläche (Vorlage: ≈48 % der Rahmenbreite / nahe der Oberkante).
- Wasserzeichen-Text bzw. Stempel-Text je Phasen-Matrix-Stufe: Abschnitt 2.1.

---

## 2 · Phasen-Matrix

### 2.1 · Tabelle VS–AF

Die SIA-Bauphase steuert **ausschliesslich**: Akzentfarbe, empfohlene Massstäbe, Wasserzeichen-
bzw. Freigabestempel-Text, Freigabe-Empfänger-Label und Revisions-Index-Buchstabe. Sie steuert
NICHT den Plan-Darstellungsgrad (`settings.phase`/`BauPhase` bleibt eigenständig, Entscheid 1).

| Stufe | Name | SIA-Nr.\* | Akzent-Token | Farbe (hell) | Massstäbe (Empfehlung) | Wasserzeichen / Stempel | Freigabe-Empfänger | Index |
|---|---|---|---|---|---|---|---|---|
| VS | Vorstudien | SIA 21 | `database` | #94704F | 1:500–1:200 | «STUDIE — NICHT FÜR AUSFÜHRUNG» | Intern | – |
| VP | Vorprojekt | SIA 31 | `pn` | #4B7BB3 | 1:200–1:100 | «VORPROJEKT — NICHT FÜR AUSFÜHRUNG» | Bauherrschaft | a |
| BP | Bauprojekt | SIA 32 | `pna` | #A65E97 | 1:100–1:50 | «BAUPROJEKT — ZWISCHENSTAND» | Bauherrschaft | b |
| BW | Bewilligung | SIA 33 | `agent` | **#A8893F** | 1:100 | «BAUEINGABE — BEHÖRDENEXEMPLAR» | Behörde | c |
| AS | Ausschreibung | SIA 41 | `memory` | #B0703F | 1:50 | «AUSSCHREIBUNG — UNTERNEHMEREXEMPLAR» | Unternehmer | d |
| AF | Realisierung | SIA 51 | `system` | #2E8794 | 1:50 / 1:20 / 1:10 | KEIN Wasserzeichen — Stempel «FREIGEGEBEN FÜR AUSFÜHRUNG» | Freigegeben | e |

\* «SIA-Nr.» hier ist die klassische SIA-102-Leistungsphasennummer der Vorlage (21/31/32/33/41/51),
eine eigene, gröbere Nummerierung ausschliesslich für die Anzeige im Plankopf-Feld «Phase (Code ·
SIA)» — sie ist NICHT identisch mit den SIA-Zitaten in `siaPhaseLabel()` (`doc.ts`, z. B.
`'wettbewerb'` → «SIA 4.22», `'ausfuehrung'` → «SIA 51/52»), die an anderer Stelle im Produkt
(Tour, Phasenleiste-Tooltip) verwendet werden. Beide Nummerierungen bestehen bewusst nebeneinander
— keine Vereinheitlichung in v0.8.0.

**Akzentfarben-Entscheid (P0, verbindlich):** Die Gegenprüfung fand eine Diskrepanz — das
Prototyp-Script (`phaseHex()`, `'papier'`-Set) nutzt für `agent` den Hexwert `#9A7C34`, während
das produktive Light-Mode-Design-Token `--role-agent` `#A8893F` ist. **Entscheid: Token gewinnt.**
`PHASEN_AKZENTE` in `derive/stilblatt.ts` (P3) übernimmt durchgehend die bestehenden
Light-Mode-Rollenfarben (`manual` #3F9B79, `pn` #4B7BB3, `pna` #A65E97, `agent` #A8893F, `memory`
#B0703F, `database` #94704F, `system` #2E8794) — keine neuen, nur im Plankopf gültigen Hexwerte.

### 2.2 · Abbildung 8 → 6 (`siaZuMatrixStufe`)

Owner-Entscheid 1 (Abschnitt 0.1): Phasen-Quelle ist `doc.settings.siaPhase` (`SiaPhase`, 8 Werte,
`model/doc.ts`), NICHT `doc.settings.phase` (`BauPhase`, 5 Werte, entkoppelter Plan-
Darstellungsgrad). Neue reine Funktion `siaZuMatrixStufe(phase: SiaPhase): MatrixStufe` in
`derive/plankopf.ts`, mit Unit-Test für **alle 8** `SiaPhase`-Werte (P3-Gate):

| `SiaPhase` (Enum-Wert, `doc.ts`) | → Matrix-Stufe |
|---|---|
| `'strategie'` | VS |
| `'wettbewerb'` | VS |
| `'vorprojekt'` | VP |
| `'bauprojekt'` | BP |
| `'bewilligung'` | BW |
| `'ausschreibung'` | AS |
| `'ausfuehrung'` | AF |
| `'abnahme'` | AF |

*Terminologie-Hinweis (Klarstellung, kein inhaltlicher Widerspruch):* Der Owner-Handoff-Text in
der Plan-Datei nennt die Zuordnung umgangssprachlich «strategie→VS, **vorstudien**→VS, …,
**realisierung**→AF, abnahme→AF» — `'vorstudien'` und `'realisierung'` sind KEINE Werte des
`SiaPhase`-Enums (das kennt `'wettbewerb'` bzw. `'ausfuehrung'`). Diese Spez verwendet
durchgehend die acht verbindlichen Enum-Bezeichner aus `doc.ts`; die Zuordnungsabsicht (früheste
zwei Enum-Werte → VS, späteste zwei → AF) ist dabei eindeutig und unstrittig.

`kernel.test.ts:2368` (bisher: Assertion auf `phaseLabel(settings.phase)` im Plankopf) wird beim
Golden-Sammelwechsel 080 BEWUSST mitgezogen — der Plankopf zeigt neu die Matrix-Stufe aus
`siaZuMatrixStufe(settings.siaPhase)`, nicht mehr `phaseLabel(settings.phase)`.

`empfohlenePlanPhase(siaPhase): BauPhase` (`doc.ts`, bestehend seit v0.7.x) ist eine **verwandte,
aber eigenständige** Funktion — sie bildet `SiaPhase` auf den empfohlenen Zeichenstil (`BauPhase`)
ab, NICHT auf eine Plankopf-Matrix-Stufe, und bleibt unverändert. `siaZuMatrixStufe` ist neu und
ausschliesslich für die Plankopf-Matrix zuständig; beide Funktionen dürfen nicht verwechselt oder
zusammengelegt werden.

### 2.3 · Massstab-Chips (Auflösung Gegenprüfungs-Fund)

Im Produkt lebt der Massstab **am Placement** (`SheetPlacement.scale`), nicht am Blatt — anders
als im Prototyp, wo ein globaler Blatt-Massstab existiert. Deshalb: Massstab-Chips im
PlankopfPanel («empfohlen in {Phase}», Werte aus Abschnitt 2.1) setzen bei **vorhandener Selektion**
den Massstab der SELEKTIERTEN Platzierung über den bestehenden Command `publish.ansichtAnpassen`
(`commands/publish.ts:334`). **Ohne Selektion** zeigen die Chips nur die Empfehlung an (reine
Information, kein Schreibziel). **Keine harte Phasen-Sperre**: die Chips sind Empfehlung, kein
Zwang — eine harte Sperre würde z. B. den Baugesuch-Situationsplan 1:500 in Phase BW brechen
(`module.spec.ts:488` prüft genau diesen Fall).

---

## 3 · Plancode-Systematik & Token-Schema

### 3.1 · Plancode

Format: **`{büro}-{projekt}-{phase}-{disziplin}-{geschoss}-{nr}`**, Beispiel
`MAA-SEE-BP-A-EG-101` (Büro «MAA» · Projekt «SEE» · Phase «BP» · Disziplin «A» (Architektur) ·
Geschoss «EG» · laufende Nummer «101»). Abgeleitet über `plancode(doc, sheet)` in
`derive/plankopf.ts` — **nie gespeichert**, nur berechnet aus `DocSettings.buero.kuerzel`,
`ProjektInfo.projektCode`, `siaZuMatrixStufe(settings.siaPhase)`, `SheetPlankopf.disziplin`,
`SheetPlankopf.geschossCode`, `SheetPlankopf.planNummer`. Fehlt ein Teil, erscheint ein ehrlicher
`—`-Platzhalter an dessen Stelle (kein stiller Leerstring, kein erfundener Wert).

### 3.2 · Token-Schema → derive-Auflösung

Die Vorlage definiert ein Template-Token-Schema (`{{buero.name}}` usw.), das laut Handoff-Text
«der Core beim Publizieren automatisch füllt». **Klarstellung (verbindlich):** Dieses Token-Schema
ist eine **Benennungskonvention zur Nachvollziehbarkeit der Datenherkunft**, KEINE
Implementierungsvorgabe für Template-Strings im gerenderten SVG. `derive/plankopf.ts`
(`plankopfSvg(ctx)`) löst jedes Feld direkt aus typisierten Modellfeldern auf — es gibt keinen
Laufzeit-Textersatz-Mechanismus, keine `{{…}}`-Strings im Produktionscode oder im gerenderten
Dokument.

| Token (Vorlage) | Quelle (Kernel-Modell) |
|---|---|
| `{{buero.name}}` | `DocSettings.buero.name` |
| `{{buero.adresse}}` | `DocSettings.buero.adresse` |
| `{{buero.logo}}` | `DocSettings.buero.logoAssetId` (→ `ImageAsset`) |
| `{{bauherr.name}}` | `ProjektInfo.bauherr` |
| `{{projekt.name}}` | `DocSettings.projectName` |
| `{{projekt.adresse}}` | `ProjektInfo.adresse` |
| `{{projekt.parzelle}}` | `ProjektInfo.parzelleNr` |
| `{{plan.inhalt}}` | `SheetPlankopf.inhalt` |
| `{{plan.gezeichnet}}` | `SheetPlankopf.gezeichnet` |
| `{{plan.geprueft}}` | `SheetPlankopf.geprueft` |
| `{{plan.datum}}` | `SheetPlankopf.datum` |
| `{{plan.code}}` | `plancode(doc, sheet)` (abgeleitet, 3.1) |

Fehlt eine Quelle, bleibt das jeweilige Plankopf-Feld leer (kein Token-String, kein Platzhalter-
text ausser beim Plancode selbst, s. 3.1) — konsistent mit dem bestehenden Guard-Prinzip
(`plankopfStammdatenZeile`, `V075-STAMMDATEN.md`).

---

## 4 · Datenmodell-Delta & Commands

Alle neuen Felder additiv/optional, `exactOptionalPropertyTypes`-konform, migrationsfrei für
`.kosmo`/Yjs-Bestandsdokumente (fehlend = kein Framework-Feld gesetzt).

### 4.1 · `packages/kosmo-kernel/src/model/entities.ts`

```ts
interface SheetPlankopf {
  inhalt?: string;
  planNummer?: string;
  disziplin?: string;
  geschossCode?: string;
  gezeichnet?: string;
  geprueft?: string;
  datum?: string;
}
interface SheetLayout {
  heftrand?: boolean;
  faltmarken?: boolean;
  wasserzeichen?: boolean;
  massstabsbalken?: boolean;
  nordpfeil?: boolean;
}
```
Additiv an `Sheet` (`entities.ts:457`): `plankopf?: SheetPlankopf`, `layout?: SheetLayout`.

### 4.2 · `packages/kosmo-kernel/src/model/doc.ts`

```ts
interface BueroInfo {
  name?: string;
  adresse?: string;
  kuerzel?: string;
  logoAssetId?: string;
}
```
Additiv an `DocSettings`: `buero?: BueroInfo`. Additiv an `ProjektInfo` (`doc.ts:282`, bestehend
seit v0.7.5 A2): `projektCode?: string`.

### 4.3 · Commands (`packages/kosmo-kernel/src/commands/publish.ts`, `commands/design.ts`)

| Command | Wirkung | Persistenz-Klasse |
|---|---|---|
| `publish.plankopfSetzen { sheetId, patch }` | Entity-Patch am `Sheet.plankopf` | Entity-Patch → **Undo + Yjs-Live-Sync gratis** |
| `publish.blattLayoutSetzen { sheetId, patch }` | Entity-Patch am `Sheet.layout` | dito |
| `publish.bueroSetzen { name?, adresse?, kuerzel?, logoDataUrl? }` | Settings-Patch, Merge-Semantik wie `design.projektInfoSetzen` | **SettingsPatch** — s. Sync-Erbschaft unten |
| `design.projektInfoSetzen` (erweitert) | Schema additiv um `projektCode` | SettingsPatch (bestehend) |

Logo-Handhabung: `bueroSetzen` mit `logoDataUrl` nutzt den bestehenden, erprobten PNG-IHDR-Weg
(`publish.ts:392–407`, `assetAusDataUrl`/`pngGroesse`) — Logo wird als `ImageAsset` gespeichert,
Garbage-Collection über `assetNochReferenziert`, erweitert um `settings.buero.logoAssetId` als
zusätzliche Referenzquelle. **Nicht-PNG-Logo (SVG/JPG): ehrliche Fehlermeldung** («PNG
erforderlich — SVG/JPG folgt»), **kein stiller Fehlschlag** — SVG-/JPG-Unterstützung ist
dokumentierter v0.8.1-Kandidat (Abschnitt 8).

**Sync-Erbschaft (ehrlich benannt):** `SyncClient` synct heute nur `entities` live, **keine**
SettingsPatches (`doc.ts:277–281`, bestehende, dokumentierte Einschränkung seit v0.7.5). Das
bedeutet: `publish.plankopfSetzen`/`blattLayoutSetzen` (Entity-Patches am `Sheet`) sind
live-kollaborativ UND undo-fähig; `publish.bueroSetzen`/`design.projektInfoSetzen`
(SettingsPatches) sind persistent (Vault/IndexedDB/`.kosmo`-Export/Undo), aber **NICHT**
live-kollaborativ zwischen offenen Sitzungen. Dies ist der GRUND, warum Plan-Metadaten
(Plankopf-Felder, Layout-Toggles) bewusst am `Sheet` liegen und nicht in `DocSettings` — nur die
Büro-Identität (bürospezifisch, selten geändert) und `ProjektInfo` bleiben in Settings, mit
dieser Einschränkung geerbt, nicht neu eingeführt.

### 4.4 · Plancode-Export & Transmittal

`derive/publikation.ts`: Plancode-basierte Dateinamensregel, wenn `SheetPlankopf.planNummer`
gesetzt ist (sonst bestehendes `P-{nr}_…`-Schema unverändert); Transmittal-CSV erhält eine
zusätzliche Plancode-Spalte.

---

## 5 · Post-Sammelwechsel-Defaults, Bestandsumstellung, planToSvg-Entscheid

### 5.1 · Defaults der `SheetLayout`-Booleans (FIXIERT — verbindlich ab dem Golden-Sammelwechsel 080)

Vor dem Sammelwechsel gilt: `Sheet.layout` fehlend = heutiges Rendering (10 mm-Einheitsrahmen,
kompakter Plankopf) unverändert — Guard-Phase (P1–P6). **Nach** dem Sammelwechsel (P7) ist
«fehlend» nicht mehr «heutiges Verhalten», sondern die folgenden fixierten Defaults:

| Boolean | Post-Wechsel-Default | Begründung |
|---|---|---|
| `heftrand` | **AN** | Norm-Heftrand 20 mm links (1.2) |
| `faltmarken` | **AN** | DIN 824 (1.3) |
| `wasserzeichen` | **AN**, Inhalt nach `siaZuMatrixStufe` | AF zeigt statt Wasserzeichen den Freigabestempel (2.1/1.7) |
| `massstabsbalken` | **AN** | 1.6 |
| `nordpfeil` | **AN, nur** wenn ein Grundriss/Situationsplan platziert ist | 1.6 — kein Nordpfeil auf reinen Schnitt-/Detailblättern |

**Ausnahme:** A0-Plakat-Preset-Blätter (`erzeugePlakat()`, Toolkit 5) erhalten **`heftrand: AN`
NICHT** — dokumentierte, dauerhafte Ausnahme (Poster-Konvention randlos/vollflächig), kein
Migrations-Lücke.

### 5.2 · Bestandsumstellung (Owner-Entscheid 2)

**Alle** bestehenden `Sheet`-Entities (jedes bereits existierende `.kosmo`-Dokument) werden beim
Öffnen unter v0.8.0+ automatisch auf die Defaults aus 5.1 umgestellt — es gibt **kein** Opt-in-
Flag, keine Migrations-Warnung, kein Verbleib im alten Layout ausser der Plakat-Ausnahme. Das
bedeutet konkret: Heftrand wächst von 10 mm auf 20 mm links, der Plankopf wächst vom
heutigen ~120×26-mm-Feld auf 180×55 mm.

**Ehrliche Konsequenz (in `docs/GOLDEN-WECHSEL-080.md` zu benennen):** bereits gesetzte
`SheetPlacement`/`SheetImage`-Positionen (absolute Papier-mm) wurden unter der Annahme kleinerer
Reserven berechnet (Konstanten 18/22/26/30/40 mm, s. Abschnitt 1 Einleitung) und können nach der
Umstellung visuell mit dem neuen, grösseren Eckenbereich kollidieren. Der bestehende Command
`publish.blattFuellen` («Blatt füllen») räumt solche Kollisionen auf — er läuft **nicht
automatisch** beim Öffnen, sondern ist die dokumentierte, vom Nutzer/Kosmo auslösbare Abhilfe.
Dies ist explizit **kein** stillschweigend gelöstes Problem, sondern eine benannte
Nacharbeits-Empfehlung nach dem Sammelwechsel.

### 5.3 · `planToSvg`-Kompakt-Entscheid (Owner-Entscheid 4)

`planToSvg` (`derive/plansvg.ts`, Design-Einzelexport eines einzelnen Storey-Plans) behält in
v0.8.0 unverändert seinen kompakten ~18-mm-Fussstreifen-Plankopf. Der volle 180×55-mm-Plankopf
gilt **ausschliesslich** für Publish-Blätter (`derive/sheet.ts`, `sheetToSvg`). Konsequenzen:

- Die **15 planToSvg-Goldens bleiben byte-stabil** (Teil der 30 Wächter, Abschnitt 6) — kein
  Geometrie-Shift der Zeichnung (der volle Plankopf hätte auf A4 quer ≈29 % der Zeichenhöhe
  gefressen und die bestehende `contentH = paper.height − 22`-Zentrierung, `plansvg.ts:679–685`,
  gebrochen — genau der von der Gegenprüfung gefundene Konflikt entfällt dadurch ersatzlos).
- Der Golden-Sammelwechsel schrumpft auf `sheetToSvg`-basierte Blatt-Goldens (Abschnitt 6).
- **Dokumentierter v0.8.1-Kandidat:** ein voller 180×55-Plankopf-Modus für den Einzelplanexport
  (oder eine Formatanhebung des Design-Exports) bleibt offen, ist aber NICHT Teil von v0.8.0.

---

## 6 · Golden-Kontingent

**Grundsatz (unverhandelbar, wie D1/D4/447e598/6a7a8e4-Präzedenz):** **Genau EIN** Golden-
Sammelwechsel in v0.8.0, Kennung «080», ein Commit. Ausserhalb dieses einen Commits bleibt jeder
bestehende Golden byte-identisch (Framework nur hinter Daten-Guard, P1–P6).

**Bestand heute** (verifiziert, `packages/kosmo-kernel/test/golden/`): **31 SVG-Goldens** + **1
IFC-Golden** (`interop-referenz-normalisiert.ifc`, ausserhalb der svg-qa-Zählung, von diesem
Sammelwechsel nicht betroffen — kein Sheet-Rendering).

Von den 31 SVG-Goldens sind laut Plan **30 als kategorische Wächter deklariert** (15
`planToSvg`-Goldens + 9 Ableitungs-Goldens + 6 Report-Goldens = 30) — diese bleiben **byte-
identisch**, jede Abweichung dort ist Regressionssignal, keine gewollte Änderung. Die
verbleibende **1 bekannte** Blatt-Golden (`blatt-autofuellung.svg`, `sheetToSvg`-basiert) **wird
sich ändern** (Post-Wechsel-Defaults, 5.1). Das Kontingent erlaubt **2–4 Blatt-Goldens** total
(`blatt-autofuellung` + «baugesuchnahe Blattgoldens nach Befund» — ob P7 während der Umsetzung
weitere `sheetToSvg`-basierte Goldens findet oder neu anlegen muss, die dieselbe Default-Umstellung
zeigen, ist zum Zeitpunkt dieser Spez noch offen).

**+2 additive, neue Goldens** (unabhängig vom obigen Kontingent, entstehen bereits in P3/P4 hinter
dem Daten-Guard, also VOR dem Sammelwechsel): `plankopf-framework.svg` (isolierter 180×55-
Baustein, alle 6 Phasen) und `blatt-framework.svg` (A1 quer, Heftrand+Faltmarken+Wasserzeichen
BP+Plankopf). svg-qa-Zählung: **31 → 33**.

**Offene Arithmetik-Anmerkung (ehrlich, nicht geglättet):** Die Rechnung «31 → 33» geht davon aus,
dass die «2–4 Blatt-Goldens nach Befund» ausschliesslich **Änderungen an der bereits
existierenden Datei** `blatt-autofuellung.svg` sind, keine zusätzlichen NEUEN Dateien. Sollte P7
feststellen, dass zusätzliche `sheetToSvg`-Goldens (z. B. für Baugesuch-Blätter) als **neue**
Dateien angelegt werden müssen, liegt der finale svg-qa-Stand über 33 — das widerspräche der im
Plan festgehaltenen «31→33»-Formel. Diese Spez hält beide möglichen Lesarten fest und verlangt von
P7: **Erwartungsliste vor der Regeneration** legt die exakte Endzahl fest, keine stille
Diskrepanz.

### 6.1 · Verfahren (P7, ein Commit, Muster wie 447e598/6a7a8e4)

1. **Erwartungsliste VOR der Regeneration** in `docs/GOLDEN-WECHSEL-080.md`: je betroffenem
   Golden — was ändert sich (Plankopf-Block, Heftrand-Rahmen, Faltmarken), was NICHT
   (Zeichnungsgeometrie); explizite Nennung der finalen Golden-Gesamtzahl (s. Arithmetik-Anmerkung
   oben).
2. `GOLDEN_UPDATE=1 npx vitest run` in `packages/kosmo-kernel` (schreibt alle Goldens neu,
   inklusive Kontrolle, dass `interop-referenz-normalisiert.ifc` dabei NICHT diffed).
3. **Maschinelle Verifikation** `docs/rundgang/v080-golden-diff-verify.py` — Kriterium: «Diff
   modulo `<g data-teil="plankopf|blattlayout">` = 0» für jeden erwarteten Blatt-Golden (beweist,
   dass sich NUR der Plankopf-/Blattlayout-Teil ändert, nicht die Zeichnungsgeometrie).
4. `npm run svg-qa` — Text-Containment ist die härteste Nebenbedingung bei der mm-Typoleiter
   (1.3–2.9 mm, Versalien + Tracking, D4-Präzedenz «Titel-Overflow»); Ellipsen-Kürzung im
   Renderer statt Überlauf; die additiven Goldens (`plankopf-framework.svg`,
   `blatt-framework.svg`) nutzen bewusst lange Musterwerte, um Overflow früh zu zeigen.
5. Harte Substring-Tests bewusst mitgezogen und kommentiert: `projekt-stammdaten.test.ts:131–191`,
   `kernel.test.ts:2368` (Phase im Plankopf, jetzt Matrix-Stufe statt `phaseLabel`), `:5371`
   («REVISIONEN» — das Revisionsverzeichnis bleibt als Tabelle ÜBER dem Plankopf, unverändert).
6. Baseline-Zahlen nachführen: `ROADMAP.md`, `CLAUDE.md`, svg-qa-Formel — auf den in Schritt 1
   festgelegten Endstand.
7. Commit-Titel wörtlich **«Golden-Sammelwechsel 080»**.

---

## 7 · Default-Oberflächen (Owner-Anforderung 3)

Grund (Owner-Kritik): die v0.7.9-Screens gelten als «zu unaufgeräumt». Lösung: je Station benannte
Layout-Presets, umschaltbar wie der bestehende A/B-Dock-Wähler (`Einstellungen.tsx`, Sektion
«Darstellung», `dockModus` `'A'|'B'`).

**Betroffene Stationen:** `DockStation` = `'design' | 'plan' | 'vis'` (`dock-stationen.ts:85`).
**Wichtige Einschränkung, ehrlich benannt:** `'plan'` führt bewusst ein LEERES Panel-Array
(`stationsPanels('plan')`) — seine vier PlanView-Toggle-Panels laufen bereits im Dock der Station
`'design'` mit. Ein eigenständiges `'plan'`-Preset entfiele damit strukturell; Presets betreffen
in der Praxis **`'design'`** und **`'vis'`**, `'plan'` erbt (wie heute) die `'design'`-Einstellung.

### 7.1 · Preset-Semantik (drei benannte Varianten je Station)

- **Fokus**: nur Viewport + minimal nötige Werkzeuge sichtbar. Design: alle Panels zu, ausser
  Kennzahlen als eingeklappter Tab. Vis: nur Canvas + Palette-Tab.
- **Arbeiten**: kuratierter Standard — 1–2 sinnvoll ausgewählte Panels offen, HUDs an.
- **Prüfen**: Checks/Kennzahlen gross und gepinnt, reine Werkzeug-Panels zu.

Ein Preset ist ein **benannter Satz** {offene Panel-Booleans, Overrides, `leftW`/`rightW`} — er
wirkt ausschliesslich über die BESTEHENDEN Mechanismen (`ui-zustand.ts`-Booleans,
`dock-zustand.ts`-Overrides), keine neue Rendering-Schicht. **Offen gelassen von dieser Spez
(PD1-Implementierungsdetail, nicht hier fixiert):** die exakte Panel-Boolean-Zuordnung je Preset
für `'vis'` über «Fokus» hinaus (Arbeiten/Prüfen für `'vis'` folgen erkennbar demselben Muster wie
`'design'`, sind aber im Owner-Handoff nicht wörtlich für `'vis'` ausbuchstabiert) — PD1/PD2
legen die konkrete Zuordnung fest, innerhalb der oben fixierten Semantik.

### 7.2 · Verhalten

- **Erststart = Fokus**, aber NUR wenn kein gespeichertes `kosmo.dock.v1`/`kosmo.ui.v1`-Layout
  existiert (`localStorage`-Schlüssel, `dock-zustand.ts:77`/`ui-zustand.ts:158`) — Bestandsnutzer
  mit gespeichertem Layout bleiben unangetastet.
- «Layout zurücksetzen» springt neu auf das **AKTIVE** Preset (nicht mehr auf einen einzigen
  hartkodierten Werkszustand).
- Preset-Wähler: neben dem A/B-Dock-Wähler (Einstellungen → Darstellung) + Schnellzugriff in der
  Kontextzeile (`testid` `dock-preset-*`).
- Neuer Command `ui.dockPresetSetzen` — Kosmo kann per Sprachbefehl aufräumen («räum die
  Oberfläche auf» → Fokus).
- **Screenshot-Politik:** Rundgang-/Handbuch-Screenshots ab v0.8.0 nutzen die Presets — adressiert
  die Owner-Kritik an den 0.7.9-Bildern direkt (P10-Release-Finale, Rundgang-PDF).
- E2E `dock-presets.spec.ts`: je Preset/Station BBox-Disjunktion + «aufgeräumt»-Kriterium (Fokus:
  ≤N sichtbare Panels), Erststart-Fokus-Nachweis, Bestands-Schutz-Nachweis, Kosmo-Befehl mit
  Quittung.

---

## 8 · Vertagungsliste (mit Gründen)

| Punkt | Grund der Vertagung |
|---|---|
| **.kxp Hyper-Modell + Viewer + Trust-Layer-Freigabe-Workflow** | Braucht Viewer-Runtime, Signatur-Infrastruktur, Konten/Empfänger (HomeStation) — nicht in dieser Runde erreichbar |
| **27-Formate-Export-Hub** | DWG/Blatt-IFC/glTF-aus-Publish existieren nicht — werden nicht vorgetäuscht; Export-Hub bleibt auf reale Formate reduziert (Abschnitt 9) |
| **Auto-Pack-Layout-Editor** (first-fit, Spring-Reflow, Ghost, Stagger, Phasen-Sets, Raster-Stepper) | Eigenes v0.8.1-Thema «Intelligentes Planlayout»; heutiges `blattFuellen` + Drag-Overlays bleiben bestehen |
| **Rolle 1600×594 / Leporello** | Variable Länge im Prototyp selbst ungeklärt (offene Frage der Vorlage) |
| **`sheetTone` «blaupause»** | Reine Prototyp-Darstellungsvariante ohne Exportnutzen |
| **Header-Attrappen** (Vorschau-/Freigabe-/Paket-exportieren-Buttons, pulsierende Pipeline-Anzeige) | Reine Kulisse im Prototyp, keine Funktion dahinter — nicht nachgebaut |
| **Schnittmarken** | Existieren in BEIDEN Prototypen nicht (nur Rahmen, Faltmarken, Lochung) — bewusst kein Scope, hier festgehalten |
| **`planToSvg`-Vollplankopf** | Owner-Entscheid 4 (Abschnitt 0.1/5.3) — dokumentierter v0.8.1-Kandidat |
| **Büro-Logo SVG/JPG** | `bueroSetzen` bleibt auf den PNG-IHDR-Weg beschränkt; Nicht-PNG erhält eine ehrliche Fehlermeldung, kein stiller Fehlschlag (Abschnitt 4.3) |
| **Dock-Integration der Publish-Panels (P11, «Stretch»)** | Eigenes, ausdrücklich VOR dem Release-Finale (P10) einzuordnendes Paket; fällt es, gilt die Vertagung auf v0.8.1 als deklariert — nicht parallel zu P10 (Sequenz-Fix, Abschnitt 0.2) |
| **KosmoPackage-Screen, Quellen-Auswahl (Label-only), Trust-Layer-ApprovalCard, Optionen-Switches ohne State, «Kompaktieren» (No-op im Prototyp selbst)** | Prototyp-Attrappen ohne eigene Handlungslogik — im Detail s. Vollständigkeits-Matrix, Abschnitt 9 |

---

## 9 · Vollständigkeits-Matrix (Abnahme-Grundlage P9)

Jede `kernpunkte`- und `interaktionen`-Zeile beider Digests ist unten einzeln abgehakt, mit
Paket-Zuordnung (P1–P11, PD1–PD2) oder Vertagungs-Verweis. Dies ist die Grundlage, gegen die P9
(Matrix-Abnahme, read-only, adversarial) am Ende prüft — jede Zeile ohne Beleg dort ist ein
Muss-Punkt für P9b.

### 9.1 · Digest «Vorlage» — `kernpunkte`

- [x] **V-K1 Blattgeometrie** (Formate, Ränder, Zeichenfläche, Rahmen, Zeichenflächen-Tabelle) → **P1** (+ P4/P7 Rendering im Blatt)
- [x] **V-K2 Faltung** (DIN 824, Faltmarken-Logik, Lochung) → **P1** (Lochung korrigiert auf mm statt px) + P4/P7
- [x] **V-K3 Plankopf/Schriftfeld** (180×55, 3-Spalten-Aufbau, Feldinhalte, Akzentbalken, Skalierung k=px/180) → **P3** (+ P4/P7 Integration, P6 Editor)
- [x] **V-K4 Plancode-Systematik** (`MAA-SEE-BP-A-EG-101`) → **P3** (`plancode()`) + **P5** (Dateinamen/Transmittal)
- [x] **V-K5 Phasen-Matrix** (Akzent, Massstäbe, WZ/Stempel, Freigabe, Index) → **P3** (`PHASEN_MATRIX`); Massstäbe als Empfehlung (2.3, dokumentierte Abweichung); Index aus `sheet.revisionen`
- [x] **V-K6 Wasserzeichen & Stempel** (Winkel, Opazität, Grössenformel, AF-Stempel) → **P3** + P4/P7 (1.7)
- [x] **V-K7 Massstabsbalken + Nordpfeil** (Segmentlogik, Positionierung) → **P3** + P4/P7 (Nordpfeil-Migration aus `plansvg.ts`, 1.6)
- [x] **V-K8 Layout-Logik/Berechnung** (Vorschau-`ppm`, Zonen-Tönung Heftrand, Aussenbemassung) → **P6**: Vorschau ppm-Skalierung + Zonen-Label als reiner Preview-Toggle; **Aussenbemassung**: rein Preview-lokal in `PublishWorkspace`, KEIN Doc-Feld, KEIN Export (0.2-Auflösung) — bewusst kein 1:1-Nachbau der Prototyp-px-Konstanten
- [x] **V-K9 Seitenaufbau** (Header, Werkbank-Spalten, Muster-Plankopf-Sektion, Regelwerk-Karten, Phasen-Detailkarte) → Regelwerk-Karten/-Tabellen/Leitmotive: **P0** (diese Spez, kein Produkt-UI); Muster-Plankopf-Editor: **P6** (`PlankopfPanel`); **Phasen-Detailkarte**: **P6**, schmaler Info-Block im `PlankopfPanel` (0.2-Auflösung) — kein 1:1-Nachbau der 376px-Spalte
- [x] **V-K10 `sheetTone`-Varianten** (papier/blaupause, Farbwerte) → papier-Farbwerte = bestehende Light-Mode-Tokens (**P3**); **blaupause: Vertagt** (Abschnitt 8, kein Exportnutzen)
- [x] **V-K11 Skeleton vs. Final** (Regelwerk final, Musterwerte/Logo/Zeichnung/Header-Buttons Skeleton) → Regelwerk: **P1–P5**; Musterwerte bewusst durch echte Felder ersetzt: **P2/P6**; Logo-Platzhalter: **P2** (`logoAssetId`) + **P3** (gestrichelter Fallback); Header-Buttons: **Vertagt** (Attrappen)
- [x] **V-K12 Token-Schema** ({{buero.\*}}/{{projekt.\*}}/{{plan.\*}}) → **P2** (Felder) + **P3** (Auflösung, Abschnitt 3.2 — derive statt Template-Strings)
- [x] **V-K13 Design-System-Anbindung** (Pill/Button/Card/Switch/Input-Komponenten) → kein eigenes Paket — PublishWorkspace/PlankopfPanel nutzen die bestehende `@kosmo/ui`-Bibliothek (**P6**), keine neue Komponentenschicht

### 9.2 · Digest «Vorlage» — `interaktionen`

- [x] **V-I1 Blattformat-Liste** (6 Zeilen, Klick setzt Format + Massstab-Reset) → **P6** (Formatliste existiert bereits in `PublishWorkspace`, Massstab-Reset-Verhalten dort zu prüfen/ergänzen)
- [x] **V-I2 Ausrichtung Quer/Hoch** (Segmentcontrol, tauscht w/h) → Bereits vorhanden (`Sheet.orientation`, `sheetPaperSize`) — kein Umbau nötig
- [x] **V-I3 Massstab-Chips** («zul. in {Phase}») → **P6**, Verhalten fixiert in Abschnitt 2.3 (setzt Massstab der selektierten Platzierung via `publish.ansichtAnpassen`, sonst nur Anzeige)
- [x] **V-I4 SIA-Phasenliste** (Klick setzt Phase, steuert Akzente/WZ/Plancode) → **Vertagt in dieser Form** — Phase kommt weiterhin über die bestehende `PhasenLeiste`/`design.siaPhaseSetzen` (nicht über eine neue Publish-eigene Phasenliste); Matrix-Wirkung selbst ist **P3**
- [x] **V-I5 Ansicht-Toggles** (Zonen, Faltmarken, Bemassung&Massstab, Schematische Zeichnung) → Faltmarken/Wasserzeichen/Massstabsbalken/Nordpfeil-Toggles: **P6** (`publish.blattLayoutSetzen`); **Zonen**: reiner Preview-Toggle, lokaler State, kein Doc-Schreiber (0.2); **Bemassung & Massstab** (Aussenbemassung): s. V-K8; **Schematische Zeichnung**: **kein Scope** — dekoratives Platzhalter-SVG des Prototyps, kein Produktbedarf
- [x] **V-I6 10 Plankopf-Input-Felder** (Live-Editing) → **P6** (`PlankopfPanel`, schreibt via `publish.plankopfSetzen`/`bueroSetzen`/`design.projektInfoSetzen`)
- [x] **V-I7 Editor-Props** (`sheetTone`, `startFormat`, `startPhase`, `pulse`) → Prototyp-Werkzeug-Metadaten, kein Produktscope (die entsprechenden Produkt-Analoga — Format/Phase-Auswahl — existieren bereits als eigene UI-Interaktionen, s. V-I1/V-I4)
- [x] **V-I8 Statisch/ohne Handler** (Header-Buttons, Pipeline-Pulse) → **Vertagt** (Abschnitt 8, Attrappen)

### 9.3 · Digest «Prototyp» — `kernpunkte`

- [x] **P-K1 Aufbau/Rahmen** (Header, Wordmark, Breadcrumb, Pill, Hilfe-Button) → **kein Scope** — PublishWorkspace behält seinen bestehenden Rahmen (`@kosmo/ui`-Komponenten), kein 1:1-Nachbau des Prototyp-Headers
- [x] **P-K2 Navigation** (3 Tabs Layout/Publizieren/KosmoPackage) → **Teil-Vertagt**: Publish bleibt EIN Workspace (kein 3-Tab-Umbau); Export-Gruppe real in **P8**; KosmoPackage-Screen **vertagt** (Abschnitt 8)
- [x] **P-K3 Layout-Screen linke Aside** (Bauphasen-Liste, Set-Inhalt·Auto, Element-Palette) → Bauphase weiterhin über bestehende `PhasenLeiste`; **Set-Inhalt/Element-Palette/Phasen-Sets: Vertagt** v0.8.1 «Intelligentes Planlayout» (heute: `blattFuellen` + Werkzeugleiste)
- [x] **P-K4 Layout-Screen Mitte** (Toolbar, Raster-Stepper, «Kompaktieren», Blatt-Canvas) → **Vertagt** v0.8.1 (Auto-Pack-Editor gesamt; «Kompaktieren» ist im Prototyp selbst ein No-op)
- [x] **P-K5 Blatt-Kacheln** (SVG-Miniaturen, Resize-Griff, Z-Index-Regeln) → **Vertagt** v0.8.1 (Teil des Auto-Pack-Editors)
- [x] **P-K6 Layout-Screen rechte Aside** (Element-Eigenschaften, Infokarte «Intelligentes Layout») → Element-Eigenschaften (Position/Grösse/Entfernen) **existieren bereits** in `PublishWorkspace` (Auswahl-Werkzeuge) — kein Umbau; Infokarte-Text: **kein Scope** (beschreibt den vertagten Auto-Pack-Editor)
- [x] **P-K7 Plankopf** (fixer Elementtyp, immer angehängt, in Palette ausgeblendet, aber technisch verschieb-/löschbar) → **P4/P6**: Plankopf ist derive-Chrome (kein editierbares Layout-Element), strukturell selektierbar aber **nicht verschiebbar** — korrigiert bewusst den im Prototyp offen zugegebenen Bug («keine Sperre implementiert»)
- [x] **P-K8 Publish-Screen** (6 Quellen, Formatkarte 27 Formate/6 Kategorien, KosmoPackage-Hero, Export-Queue, Options-Switches, Trust-Layer-ApprovalCard) → Formatkarte: **P8**, reduziert auf reale Formate (Blatt-SVG, Set-SVG, Set-PDF, DXF je Geschoss, Transmittal-CSV); Quellen-Auswahl (6 Optionen): **Vertagt** (im Prototyp reine Label-Kosmetik ohne Filterwirkung); KosmoPackage-Hero/Trust-Layer/Options-Switches: **Vertagt** (Abschnitt 8)
- [x] **P-K9 Publish-Screen rechte Aside** (Export-Auftrag-Queue, Optionen-Switches, ApprovalCard) → Export-Auftrag-Queue: **P8** (reduziert, reale Exporte + Plancode-Namen); Rest: **Vertagt**
- [x] **P-K10 Package-Screen** (.kxp-Viewer-Mock, Struktur/Ansichten/Hotspots, Feature-Cards) → **Vertagt** v0.9.x (Abschnitt 8)
- [x] **P-K11 Datenmodell** (`items[]`, `pack()`-Positionslogik, `SETS` je Phase, `TYPES`) → **Vertagt** — gehört vollständig zum Auto-Pack-Editor v0.8.1; das produktive Datenmodell für v0.8.0 ist Abschnitt 4 dieser Spez (unabhängig vom Prototyp-Modell)
- [x] **P-K12 Motion/Animation** (Spring-Reflow, Ghost, Stagger, `animations`-Prop) → **Vertagt** — Teil des Auto-Pack-Editors; die Frage nach einem neuen Motion-Token (`--ease-spring`) wandert mit ins v0.8.1-Thema, kein v0.8.0-Scope
- [x] **P-K13 Skeleton vs. Final** (funktional ausgearbeiteter Editor-Kern vs. Mock-Elemente) → analysiert, keine eigene Zuordnung nötig (jede Einzelaussage ist bereits in P-K1–P-K12 verortet)

### 9.4 · Digest «Prototyp» — `interaktionen`

- [x] **P-I1 Screen-Wechsel** (Tab setzt `state.screen`) → **kein Scope** (kein 3-Screen-Umbau, s. P-K2)
- [x] **P-I2 Blatt anlegen/wechseln über Bauphase** (`loadPhase`, «Set neu laden») → **Vertagt** v0.8.1 — Phase bleibt über bestehende `PhasenLeiste` gesteuert, Phasen-Blattsets als Presets sind ein Planlayout-Editor-Feature
- [x] **P-I3 Element platzieren** (`addEl`, Einfügung vor dem Plankopf) → **Vertagt** v0.8.1 (Teil des Auto-Pack-Editors)
- [x] **P-I4 Drag/Umsortieren** (Live-Reflow, Ghost-Slot, Einfügeindex aus Cursor-Zelle) → **Vertagt** v0.8.1
- [x] **P-I5 Resize** (Eck-Griff + Stepper) → **Vertagt** v0.8.1 (bestehende Design-Auswahl-Werkzeuge decken das produktive Bedürfnis bereits ab, s. P-K6)
- [x] **P-I6 Raster ändern / «Kompaktieren»** → **Vertagt** v0.8.1 («Kompaktieren» im Prototyp selbst funktionslos)
- [x] **P-I7 Plankopf editieren** (im Prototyp NICHT vorgesehen, keine Felder, keine Sperre) → **P2** beantwortet das fehlende Datenmodell (`SheetPlankopf`); **P4/P6** liefert die im Prototyp fehlende Sperre (nicht verschiebbar)
- [x] **P-I8 Export** (Quelle wählen, Format-Chips, Queue, Approval-Gate, Button ohne Handler) → **P8**: Format-Chips auf reale Formate reduziert, Export-Button bekommt echten Handler; Quelle-Wahl/Approval-Gate: **Vertagt** (Abschnitt 8)
- [x] **P-I9 Sets** (feste Phaseninhalte je Bauphase, Anzeige «Set-Inhalt·Auto») → **Vertagt** v0.8.1
- [x] **P-I10 Index/Revision** (im Prototyp nicht abgebildet) → **bereits im Kernel** (`publish.revisionErfassen`, `sheet.revisionen`) — **P3** rendert die Index-Zeile im neuen Plankopf, das Revisionsverzeichnis bleibt als bestehende Tabelle über dem Plankopf unverändert
- [x] **P-I11 KosmoPackage-Viewer-Interaktion** (Tab-Wechsel 3D/2D/Visu/Info, Rest statisch) → **Vertagt** v0.9.x (Abschnitt 8)
- [x] **P-I12 Editor-Props als Design-Tool-Interaktion** (`animations`, `startScreen`, `startPhase`) → Prototyp-Werkzeug-Metadaten, kein Produktscope

### 9.5 · Offene Fragen beider Digests → Klärung (ergänzend, nicht Teil der Kern-/Interaktions-Zählung)

- [x] Farb-Diskrepanz `agent` #9A7C34 (Prototyp-Script) vs. Token #A8893F → **P0-Entscheid: Token gewinnt** (Abschnitt 2.1); **P3** setzt um
- [x] Font-Substitution IBM Plex Mono statt DejaVu Sans Mono → **bleibt** (PDF-Einbettung bereits vorhanden, kein Fallback-Risiko identifiziert) — finaler Entscheid, hier festgeschrieben
- [x] Lochung px statt mm → **P1 behebt** (ISO 838, mm, Abschnitt 1.4)
- [x] Heftrand im Hochformat links (kurze Seite) → **P0-Entscheid: bleibt links**, unabhängig von der Ausrichtung (Abschnitt 1.2)
- [x] Rolle-Format «variabel», aber hart 1600 mm gerechnet, keine Leporello-Länge geklärt → **Vertagt** (Abschnitt 8)
- [x] Extraktions-Abbruch `seite.html` Z.1656 (Vorlage) → **kein Repo-Scope** — Prototyp-Artefakt, Rekonstruktion (`props.json`/`dc-script.txt`) liegt im Scratchpad vor, betrifft die Umsetzung nicht
- [x] Mapping 724px-Raster (Prototyp-Editor) ↔ Papierformat → **beantwortet**: das Produkt rechnet durchgehend in Papier-mm (`sheetPaperSize`), kein px-Raster; die Frage stellt sich für v0.8.0 nicht, da der Auto-Pack-Editor vertagt ist
- [x] `pkpulse`-Keyframes definiert, aber ungenutzt (Prototyp) → **kein Produktscope**, `prefers-reduced-motion`-Disziplin gilt ohnehin unverändert
- [ ] **Offen, nicht in dieser Spez abschliessend geklärt:** Massstabsbalken-/Nordpfeil-/Wasserzeichen-Grössen sind im Handoff teils als Vorschau-Pixelformeln dokumentiert (Abschnitt 1.6/1.7) — die exakten finalen mm-Werte sind eine P3-Implementierungsentscheidung innerhalb der svg-qa-Containment-Grenzen, nicht hier fixiert. P9 muss prüfen, ob P3s gewählte Werte den in Abschnitt 1.6/1.7 beschriebenen PROPORTIONEN (nicht Pixelwerten) treu bleiben.
- [ ] **Offen:** Golden-Endzahl «31→33» vs. die im Plan selbst eingeräumte Bandbreite «2–4 Blatt-Goldens nach Befund» (Abschnitt 6, Arithmetik-Anmerkung) — P7 muss die exakte Endzahl in der Erwartungsliste VOR der Regeneration fixieren, diese Spez kann sie nicht vorwegnehmen.
- [ ] **Offen:** Preset-Inhalt für Station `'vis'` jenseits von «Fokus» sowie für etwaige künftige `'plan'`-Eigenständigkeit (Abschnitt 7.1) — PD1/PD2-Implementierungsdetail.

---

*Ende der Spezifikation. Diese Datei wird NICHT während der Umsetzung (P1–P11) verändert — findet
ein Paket einen Widerspruch zu dieser Spez, ist das ein Fall für ein kurzes Owner-Review, kein
stiller Re-Interpretationsspielraum im Code.*
