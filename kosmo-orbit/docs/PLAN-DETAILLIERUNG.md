# Plan-Detaillierung nach SIA-Phase

> Owner-Auftrag 03.07.2026: «erfasse auch den detaillierungsgrad in den plänen
> je nach bauphase sia … nutze meine hochbauzeichnerlehrhefte».
>
> **Quellenlage (Stand 03.07.2026): Lehrheft-Abgleich erledigt.** Die 24
> Hochbauzeichner-Lehrhefte liegen als OCR-Volltexte im Repo
> (`wissen/vault/*.md`, je Heft eine Datei mit Seitenmarken `## S. n`),
> ebenso SIA 400:2000 «Planbearbeitung im Hochbau»
> (`wissen/vault/normen/SIA_400.md`) und SIA 102:2020
> (`wissen/vault/normen/102-2020.md`). Dieses Regelwerk wurde am 03.07.2026
> Regel für Regel gegen diese Originale abgeglichen; jede Aussage trägt ihre
> Quelle als Klammer-Fussnote. Seitenangaben beziehen sich auf die
> OCR-Seitenmarken der Vault-Dateien (bei SIA 400 deckungsgleich mit den
> PDF-Seiten; die gedruckte Normseite weicht z.T. ab und ist, wo lesbar,
> zusätzlich genannt). OCR-Fehler wurden sinngemäss gelesen; wo das OCR nicht
> eindeutig ist, steht das explizit dabei. Ergebnis des Abgleichs: siehe
> «Abgleich-Protokoll» am Ende.

Die Phase ist eine **Projekteinstellung** (`DocSettings.phase`, Command
`design.phaseSetzen` — auch für Kosmo per Sprache) und wirkt überall gleich:
App-Grundriss, Schnitt/Ansicht, Druck-SVG/PDF, Plankopf.

## Phasen und Massstäbe (belegt)

SIA 102:2020 nummeriert die Teilphasen: **31 Vorprojekt, 32 Bauprojekt,
33 Bewilligungsverfahren, 41 Ausschreibung, 51 Ausführungsprojekt,
52 Ausführung** [SIA 102:2020, Ziff. 4.31–4.52; Phasentabelle bei Ziff. 3].
Der «Werkplan» ist das zentrale Planprodukt der Teilphase 51 — die Lehrhefte
nennen diesen Schritt «Ausführungsplanung»: «Aufgrund des bewilligten
Bauprojektes werden die Werkpläne des Bauvorhabens vom Architekten
aufgezeichnet» [Lehrheft «Ein Haus entsteht», S. 9; Phasenfolge
Vorprojekt → Bauprojekt → Bewilligung → Ausführungsplanung ebd. S. 6 u. S. 8].

Massstabsleiter des Architekten nach SIA 400, Figur 4 [SIA 400, Ziff. B.1.4,
OCR-S. 16]:

| Massstab | Übliche Anwendung |
|---|---|
| 1:1000 / 1:500 | Situationspläne, Katasterpläne (Katasterplan 1:1000/1:500/1:200 auch [Lehrheft «Bauvorbereitung», S. 6]; AV-Auszug i.d.R. 1:500 [ebd. S. 17]) |
| 1:200 | Situationspläne in Städten, Wettbewerbspläne, **Vorprojektpläne** |
| 1:100 | **Bauprojekte** (für grosse Projekte/Wettbewerbe auch 1:200 [SIA 400, Ziff. C.2.1, OCR-S. 48]) |
| 1:50 | **Werkpläne** |
| 1:20 … 1:1 | Ausführungs-/Detailpläne (z.B. Fassadenschnitte 1:20, Fassadendetails 1:5 [SIA 400, Anhang A, OCR-S. 8]) |

**Korrektur gegenüber der Erstfassung:** 1:20 gehört nach SIA 400 zu den
**Detailplänen**, nicht zum Werkplan; der Werkplan ist 1:50. Die
Phasen-Spalten unten sind entsprechend angepasst (Werkplan · 1:50, Details
separat). 1:500 ist der Situations-, nicht der Vorprojekt-Massstab.

SIA 400 stützt zudem das Kernel-Prinzip direkt: «Im allgemeinen wird im
Massstab 1:1 konstruiert und erst bei der Erstellung des Plans werden über
den Massstab die entsprechenden Schriftgrössen, Linienarten und der
Detaillierungsgrad für die Darstellung definiert» [SIA 400, Ziff. B.11.2,
OCR-S. 43] — genau die massstab-/phasenabhängige Derivation, die
`derive/plan.ts` und `derive/plansvg.ts` implementieren.

## Regelwerk (implementiert, abgeglichen)

| Element | Vorprojekt (SIA 31) · 1:200 | Bauprojekt (SIA 32/33) · 1:100 | Werkplan (SIA 51) · 1:50 |
|---|---|---|---|
| **Wände im Grundriss** | EIN Poché über die Gesamtdicke, keine Schichten — **bestätigt**: «Bei Darstellungen im Massstab 1:100 und kleiner werden geschnittene Flächen häufig schwarz oder mit einem anderen gleichbleibenden Sinnbild für alle Baustoffe versehen» [SIA 400, Ziff. B.8.3.1, OCR-S. 26] | Schichten getrennt: Tragschicht dunkel, Dämmung hell — **zulässige Präzisierung**: die Norm erlaubt bei 1:100 auch das einheitliche Poché (s. links); die Schichttrennung ist als farbige Darstellung zur Lesbarkeit gedeckt [SIA 400, Ziff. B.8.1, OCR-S. 25] und in der Baueingabe-Praxis üblich | wie Bauprojekt, plus Material-Sinnbilder: «Die Materialien werden durch die entsprechenden Sinnbilder gekennzeichnet» [SIA 400, Ziff. C.3.1.1, OCR-S. 54] |
| **Fenster** | Aussparung + EINE Glaslinie — **plausibel bestätigt**: SIA 400 zeigt die Fensterdarstellung explizit massstabsgestuft (Fig. 36 «Fenster im Massstab 1:100» stark vereinfacht gegenüber Fig. 37 «1:50» und Fig. 38 «1:20») [SIA 400, Ziff. B.9.1.1, OCR-S. 36] | Leibungen + zwei Glaslinien — Darstellung «nach denselben Regeln, unabhängig davon ob es sich um Holz-, Holz-Metall-, Metall- oder Kunststoff-Fenster handelt» [ebd.] | wie Bauprojekt; im 1:50 kommen Anschlag/Leibungsdetail und Höhenmasse dazu (s. Bemassung) [SIA 400, Fig. 37/39, OCR-S. 36–37; Lehrheft «Fenster», S. 10] |
| **Türen** | Aussparung ohne Symbol — bei 1:200 unstrittig; ab 1:100 zeigt die Norm Türöffnungen bereits mit Flügel/Anschlag (Fig. 41 «Türen im Massstab 1:100») [SIA 400, Ziff. B.9.2.1, OCR-S. 38] | Flügel + 90°-Schwenkbogen — **bestätigt** [SIA 400, Fig. 41, OCR-S. 38] | wie Bauprojekt, plus Zargendarstellung: im Werkplan sind «Türzargen und die Richtung der Türbewegung» einzuzeichnen [SIA 400, Ziff. C.3.1.1, OCR-S. 54]; Anschlagarten-Sinnbilder für Ausführungspläne [SIA 400, Ziff. B.9.2.2, OCR-S. 39] |
| **Schnitt-Poché** | einheitlich grau, ein Face je Bauteil — **bestätigt** («1:100 und kleiner … gleichbleibendes Sinnbild») [SIA 400, Ziff. B.8.3.1, OCR-S. 26] | Material-Tönung je Schicht (Bänder), ohne Strichschraffur — **bestätigt als Zwischenstufe**: Sinnbilder sind nur nötig, «wenn ohne Sinnbild eine Unklarheit bezüglich des Materials besteht»; Farbe dient «lediglich … die Lesbarkeit zu verbessern» [SIA 400, Ziff. B.8.1, OCR-S. 25] | volle SIA-Materialsinnbilder (Beton-Diagonale, Dämmwellen, Holz-Kreuz …) — **bestätigt** [SIA 400, Ziff. B.8.3.1/C.3.1.1]; Sinnbild-Details siehe Abschnitt «Schraffur-Konventionen» |
| **Bemassung** (Kopplung im Phase-Select; via «Masse» übersteuerbar) | nur Gesamtmasse — **bestätigt** (Wettbewerbs-/Vorprojektniveau) | ~~Öffnungs- + Gesamtketten~~ → **korrigiert: Gesamt-/Hauptmasse, ohne Öffnungsketten.** Das Bauprojekt bemasst «äussere Gebäudeabmessungen mit Vor- und Rücksprüngen, Grenzabstände, … Treppenbreiten, … Mauerdicken, … Geschosshöhen, Koten der Geschosse» [SIA 400, Ziff. C.2.2, OCR-S. 48] — die rohen Fenster-/Türöffnungen bemasst erst die dritte Masslinie des **Werkplans** [SIA 400, Ziff. C.3.2.1, OCR-S. 55] | eine bis **vier** Aussen-Masslinien in fester Ordnung: 1. (äusserste) Rohmass Gesamtlänge, 2. Vor-/Rücksprünge bzw. Achsmasse der Tragkonstruktion, 3. rohe Fenster- und Türöffnungen, 4. Bezug zur Rohkonstruktion bei Aussenwärmedämmung; Innenmasse in den Räumen, Mauerdicken neben den geschnittenen Wandflächen, nach Möglichkeit durchgehende Masslinien [SIA 400, Ziff. C.3.2.1, OCR-S. 55] |
| **Höhenkoten** | an | an — Bauprojekt: Koten der Geschosse, absolut fürs EG (z.B. +0.00 = 423.82 m ü.M.), relativ für die übrigen [SIA 400, Ziff. C.2.2, OCR-S. 48] | an — Werkplan zusätzlich **roh und fertig** getrennt (Räume, Brüstungen, Stürze) [SIA 400, Ziff. C.3.1.1/C.3.2.1, OCR-S. 54–55] |
| **Plankopf** | «Vorprojekt (SIA 31)» | «Bauprojekt (SIA 32/33)» | «Werkplan (SIA 51)» — Titelfeld unten rechts, enthält u.a. Planpaket, Plantitel, **Massstab/Massstäbe** und Änderungsindex [SIA 400, Ziff. B.1.3, OCR-S. 15]; die **Masseinheit ist auf dem Plan anzugeben** («Masse in m») [SIA 400, Ziff. B.5.2, OCR-S. 20]; Nordrichtung auf jedem Grundriss [SIA 400, Ziff. C.2.1/C.3.1.1] |

Default eines neuen Projekts: **Werkplan** (volle Detaillierung = bisheriges
Verhalten; nichts wird still reduziert).

## Strichstärken-Hierarchie (neu, belegt)

Nach SIA 400, Ziff. B.3.1 [OCR-S. 17]:

- **Höchstens drei Liniendicken pro Zeichnung**, deutlich abgestuft — nicht
  0.25/0.35/0.50, sondern **0.25/0.50/1.00 mm oder 0.18/0.35/0.70 mm**.
- Liniendicken werden auf Planformat, Massstab und Verkleinerungsfaktor
  abgestimmt; dünner als 0.25 mm nur bei geeigneter Druck-/Kopiertechnik.
- Anwendung (Tabelle 4, Ziff. B.3.3 [OCR-S. 17]):

| Linienart | dünn | mittel | dick |
|---|---|---|---|
| Vollinie | Masslinien, Schraffuren, Hilfslinien, Koordinatennetze | Schnittkanten, Sichtkanten, Sinnbilder | **Schnittkanten der Hauptbauteile**, geschnittenes neues Terrain |
| Strichlinie | — | unsichtbare Kanten unter/hinter der Schnittebene | gewachsenes Terrain |
| Strichpunkt | Achsen, Niveaulinien, Baulinien | wichtige Kanten über/vor der Schnittebene | **Angabe der Schnittlage** |

Konsequenzen fürs Rendering: Schnittflächen werden «in der Regel mit breiten
Linien umrandet» [SIA 400, Ziff. B.8.3.1, OCR-S. 26]; hinter der Schnittebene
liegende Teile im Schnitt «als Ansicht mit mittleren Liniendicken» [SIA 400,
Ziff. C.3.1.2, OCR-S. 54] — das entspricht den zwei Kanälen cut/projection in
`derive/plan.ts`. Rasterachsen strichpunktiert dünn (implementiert:
`PlanAxis`), Schnittlage strichpunktiert dick.

## Schraffur-Konventionen (neu, belegt)

- Sinnbilder «wenn immer möglich schwarz-weiss»; Farbe ist zulässig, trägt
  aber keine Zusatzinformation [SIA 400, Ziff. B.8.1, OCR-S. 25].
- Sinnbilder nur, wenn sonst Materialverwechslung droht [ebd.].
- «Die Dichte der Sinnbilder ist dem Massstab der Zeichnung anzupassen»
  [SIA 400, Ziff. B.8.3.1, OCR-S. 26] — der `scale`-Parameter in
  `derive/schraffur.ts` (Abstand in Papier-mm) setzt genau das um.
- Farbzuordnung der Baustoffe (Fig. 34 [OCR-S. 26]): Backstein zinnober,
  Kalksandstein grau, Zementstein oliv, Beton/Sichtbeton grün, Mörtel/Gips/
  Verputz violett, Holz gelb bis braun, Metall hellblau, Stahl im Schnitt
  schwarz, **Dämmstoffe rosa**, Dichtungsmasse gelb, Glas dunkelgrün,
  Kunststoffe grau, Naturstein blau.
- Stahlprofile 1:50 bis 1:10 im Schnitt **schwarz ausgefüllt**, erst in
  grösseren Massstäben schraffiert [SIA 400, Ziff. B.8.4.1, OCR-S. 27].
- Die genaue Strichgeometrie einzelner Sinnbilder (v.a. Kalksandstein,
  Beton) ist im OCR nicht zuverlässig lesbar — der Katalog in `schraffur.ts`
  (Kalksandstein = Kreuz, Beton = Diagonale) bleibt darum als Konvention
  markiert und ist bei Gelegenheit am Original-PDF (Fig. 34) nachzuprüfen.
- Umbau: beizubehaltende Bauteile **schwarz**, neue **rot**, abzubrechende
  **gelb** (Projektpläne für Baugesuche und Ausführungspläne für Umbauten)
  [SIA 400, Ziff. B.8.11, OCR-S. 35] — heute nicht im Modell (kein
  Bestand/Neu-Status), als Lücke notiert.

## Bemassungs-Regeln (neu, belegt)

- **Einheiten:** km/m/cm/mm; die gewählte Einheit ist auf dem Plan
  anzugeben. Usanz: bei Grundeinheit Meter dürfen Bauteile < 1 m in cm
  angegeben werden; **Millimeter werden in Verbindung mit cm-Masszahlen
  hochgestellt** eingetragen (52 = 0,52 m; 2⁵ = 2,5 cm) [SIA 400,
  Ziff. B.5.2, OCR-S. 20].
- **Masslinien** mit der dünnsten verwendeten Linie; **Massbegrenzungslinien
  (Massstriche) doppelt so dick** wie die Masslinien; Masszahlen im halben
  Zahlenabstand über der Masslinie, lesbar von unten oder rechts [SIA 400,
  Ziff. B.5.3, OCR-S. 20].
- **Masszahlen unterhalb der Masslinie sind Höhenmasse**: gemessen ab OK
  Schwelle bzw. OK fertiger Boden bis UK roher Sturz/UK rohe Decke; bei
  Fenstern ab OK fertige Brüstung bis UK roher Sturz [ebd.].
- **Rohmasse im Massivbau:** Im Werkplan 1:50 werden die Rohmasse
  eingetragen; Niveaudifferenzen bei Schwellen sind einzutragen; lichte
  Durchgangshöhe = OK fertig Schwelle bis UK Türrahmen [Lehrheft «Türen»,
  S. 9, mit explizitem Verweis auf SIA 400]. Rohe Wandöffnung von Zargentüren
  = Rahmenlichtmass + 3.5–5 cm je Seite, Blendrahmentüren + 1–2 cm je Seite;
  Schreibweise im Grundriss z.B. «88» über und «2.04» unter der Masslinie
  [ebd.]. Fenster: Begriffsleiter Rohlichtmass/Fertiglichtmass/
  Rahmenlichtmass/Glaslichtmass; **bei Aussenwärmedämmung wird das
  Rohlichtmass um die Dämmdicke vergrössert** [Lehrheft «Fenster», S. 10] —
  deckt sich mit der vierten Masslinie (Bezug Rohkonstruktion) des Werkplans
  [SIA 400, Ziff. C.3.2.1, OCR-S. 55].
- **Massvorrang:** Massangaben haben Vorrang vor der Zeichnungsgenauigkeit;
  nicht massstabsgetreue Masse werden überstrichen — «Dies gilt auch für
  Zeichnungen, die mit CAD erstellt werden» [SIA 400, Ziff. B.5.1, OCR-S. 20].
  Für KosmoOrbit gegenstandslos, solange Masse assoziativ abgeleitet werden
  (`derive/dimensions.ts` — nie von Hand überschrieben).
- **Schnitt 1:50:** vertikale Masse und Höhenlage (Stockwerkshöhen roh und
  fertig, Raumhöhen, Deckendicken); horizontale Masse nur, wenn im Grundriss
  nicht eindeutig [SIA 400, Ziff. C.3.2.2, OCR-S. 55].

## Koten-Darstellung (neu, belegt)

Nach SIA 400, Ziff. B.5.4 [OCR-S. 21]:

- Koten **immer in Meter**.
- Ausgangspunkt Kote ±0.00 = in der Regel **OK fertiger Boden Erdgeschoss**;
  Absolutbezug im Plantitel bzw. auf dem Plan (Beispiel der Norm:
  «+0.00 = 423.82 m ü.M.») [ebd.; ebenso Werkplan-Beispiel OCR-S. 56].
- Unterschieden werden **OK/UK fertige Höhe** und **OK/UK rohe Höhe** mit je
  eigenem Kotensymbol (Fig. 18: +3.25 OK fertig, +3.00 UK fertig, +1.25 OK
  roh, +1.10 UK roh) [ebd.].
- Gilt eine Höhenkote für den ganzen Grundriss, darf sie einmalig im
  Titelfeld stehen [ebd.].
- Werkplan-Raumanschrift: Zweckbestimmung, «Höhenkote — roh und fertig —
  sowie Angaben über die Fertigbeläge von Böden, Wänden und Decken»
  [SIA 400, Ziff. C.3.1.1, OCR-S. 54].
- Gefälle (Pfeil abwärts) in %/‰ für Entwässerung, Steigung (Pfeil aufwärts)
  für begehbare Flächen [SIA 400, Ziff. B.5.2, OCR-S. 20].

## Treppen (neu, belegt)

Nach SIA 400, Ziff. B.9.3 [OCR-S. 40]:

- Treppen werden im Grundriss auf einem Teil ihrer Höhe **geschnitten**
  (OCR-Zeichen unleserlich, konventionell ca. ein Drittel bzw. auf
  Schnitthöhe); bei mehrgeschossigen Treppen wird «der obere Teil des
  unteren und der untere Teil des oberen Laufs dargestellt».
- Führt die Treppe nur über ein Geschoss, wird sie **über der Schnittstelle
  strichpunktiert** gezeichnet.
- Die **durchgehende Lauflinie mit Pfeil zeigt in Richtung der Steigung**
  (implementiert in `derive/plan.ts`: Lauflinie Antritt → Austritt mit
  Pfeilspitze — Richtung stimmt; das Kappen an der Schnitthöhe fehlt noch).
- Massstabsreferenz des Lehrmittels: Schemaschnitt und -grundriss der
  Treppenbegriffe im **Massstab 1:50** [Lehrheft «Treppen und Aufzüge», S. 7].
- Ein Schnitt wird «in der Regel durch die Haupttreppe eines Gebäudes
  gelegt» [SIA 400, Ziff. C.3.1.2, OCR-S. 54].

## Offen (nach Lehrheft-Abgleich, aktualisiert)

- ~~Möblierung/Sanitärsymbolik je Phase~~ → **geklärt, aber nicht
  modelliert:** Sanitär- und Küchenapparate sowie feste Einbauten gehören
  bereits ins **Bauprojekt 1:100** [SIA 400, Ziff. C.2.1, OCR-S. 48]; der
  Werkplan ergänzt Radiatoren, fest eingebaute Möbel und Türzargen [SIA 400,
  Ziff. C.3.1.1, OCR-S. 54]. Sobald Sanitär/Einbauten Entitäten sind: ab
  Bauprojekt zeigen, nicht erst im Werkplan.
- Leibungs-/Anschlagdetail der Fenster im Werkplan (Anschlagtiefe zeichnen)
  — gestützt durch Fig. 37/39 (1:50 mit Anschlag) [SIA 400, OCR-S. 36–37]
  und die Anschlagbreiten-Begriffe [Lehrheft «Fenster», S. 10].
- Massstabs-Automatik: Phase-Wechsel könnte den Blatt-Massstab vorschlagen
  (1:200/1:100/1:50 gemäss Fig. 4 [SIA 400, Ziff. B.1.4, OCR-S. 16]) —
  bewusst noch Handarbeit.
- Bodenaufbau-/Deckenränder im Schnitt (Werkplan zeigt Beläge getrennt;
  Raumanschrift nennt Fertigbeläge B/W/D [SIA 400, Ziff. C.3.1.1]).
- Terrain in Schnitt/Ansicht: **gewachsenes Terrain gestrichelt, neues
  ausgezogen** [SIA 400, Ziff. C.2.1, OCR-S. 48; Tabelle 4, OCR-S. 17] —
  Terrain ist noch nicht im Modell.
- Aussparungen (Durchbrüche/Schlitze) sind «im Werkplan Grundriss 1:50
  einzuzeichnen» [Lehrheft «Deckenkonstruktionen», S. 22; Bezeichnungs- und
  Kotenschema auch Lehrheft «Sanitäranlagen», S. 25; SIA 400, Ziff. B.10,
  OCR-S. 41] — kein Aussparungs-Entity vorhanden.
- Umbau-Farbcode schwarz/rot/gelb [SIA 400, Ziff. B.8.11, OCR-S. 35] —
  braucht einen Bestand/Neu/Abbruch-Status am Bauteil.

## Abgleich-Protokoll (03.07.2026)

Abgeglichen gegen: SIA 400:2000 (OCR, 72 S.), SIA 102:2020 (OCR) und die
Lehrhefte «Ein Haus entsteht», «Bauvorbereitung», «Fenster», «Türen»,
«Wandkonstruktionen», «Deckenkonstruktionen», «Treppen und Aufzüge»,
«Liegenschaftsentwässerung», «Sanitäranlagen» (alle 24 Hefte nach
Massstab-/Darstellungsbegriffen durchsucht; die übrigen enthalten keine
Plandarstellungs-Regeln).

**Bestätigt (9 Regeln):** Vorprojekt-Poché einheitlich (B.8.3.1);
Fenster-/Türdarstellung massstabsgestuft (B.9.1/B.9.2); Tür-Schwenkbogen ab
1:100 (Fig. 41); Werkplan mit Material-Sinnbildern (C.3.1.1); Vorprojekt nur
Gesamtmasse; Höhenkoten in allen Phasen; Plankopf-Phasenlabel (B.1.3);
Massstab-Zuordnung 1:200/1:100/1:50 (Fig. 4); Lauflinien-Pfeil in
Steigungsrichtung (B.9.3). Dazu bestätigt die Norm das Derivations-Prinzip
selbst (B.11.2: 1:1 konstruieren, Darstellung je Massstab ableiten).

**Korrigiert (3 Regeln):** (1) Werkplan-Massstab ist 1:50 — 1:20 ist
Detailplan-Massstab (Fig. 4). (2) 1:500 ist Situations-, nicht
Vorprojekt-Massstab. (3) Öffnungsketten gehören nicht ins Bauprojekt —
Bauprojekt 1:100 bemasst Hauptmasse/Grenzabstände/Geschosskoten (C.2.2), die
rohen Öffnungen bemasst erst der Werkplan (3. Masslinie, C.3.2.1).

**Präzisiert (6 Punkte):** Werkplan-Aussenbemassung als 1–4 Masslinien in
fester Ordnung; Höhenmasse unter der Masslinie (Brüstung/Sturz);
mm hochgestellt bei cm-Masszahlen + Einheiten-Deklaration; Koten roh/fertig
getrennt mit Absolutbezug im EG; Strichstärken-Trias 0.18/0.35/0.70 bzw.
0.25/0.50/1.00; Treppe an Schnitthöhe kappen, darüber strichpunktiert.

**Offen bleibt (ehrlich):** exakte Strichgeometrie einzelner
SIA-Baustoff-Sinnbilder (Fig. 34 im OCR nicht lesbar — am Original-PDF
nachprüfen); die genaue Treppen-Schnitthöhe («ca. ⅓» im OCR verstümmelt);
Möblierungs-Symboltiefe je Phase über Sanitär/Einbauten hinaus (in den
Heften nicht geregelt); alles unter «Offen» Aufgeführte ohne Modell-Entität
(Terrain, Aussparungen, Umbau-Status).

### Konkrete Code-Anpassungen (priorisiert)

| Prio | Datei | Änderung | Beleg |
|---|---|---|---|
| S | `apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx` (Phase-Kopplung, Z. 577–579) | Bauprojekt-Preset von `aussenKetten: 'beide'` auf `'gesamt'` — Öffnungsketten erst ab Werkplan | SIA 400 C.2.2 vs. C.3.2.1 |
| S | `packages/kosmo-kernel/src/derive/dimensions.ts` (`dimensionLabel`) | mm bei cm-Masszahlen hochgestellt statt Dezimalpunkt («361⁵» statt «361.5»); Einheiten-Deklaration («Masse in cm») an den Plankopf durchreichen | SIA 400 B.5.2 |
| S | `packages/kosmo-kernel/src/derive/plansvg.ts` (Plankopf/Stiftsatz) | Massstab + Masseinheit ins Titelfeld, Nordrichtung im Grundriss; Massstriche doppelt so dick wie Masslinien; Stiftsatz auf Trias 0.18/0.35/0.70 prüfen | SIA 400 B.1.3/B.1.4, C.2.1, B.5.3, B.3.1 |
| M | `packages/kosmo-kernel/src/derive/dimensions.ts` | Werkplan-Masslinienordnung vervollständigen: 2. Kette (Vor-/Rücksprünge bzw. Achsmasse aus `GridAxis`) und 4. Kette (Rohkonstruktions-Bezug bei Aussendämmung); Öffnungs-Höhenmasse (Brüstung/Sturz) unter der Masslinie | SIA 400 C.3.2.1, B.5.3 |
| M | `packages/kosmo-kernel/src/derive/plan.ts` (Treppen) | Treppe an `storey.cutHeight` kappen; Teil über der Schnittstelle strichpunktiert (Klasse z.B. `ueber-schnitt`); mehrgeschossig oberer/unterer Lauf | SIA 400 B.9.3 |
| M | `packages/kosmo-kernel/src/derive/section.ts` + Koten-Rendering | Koten roh und fertig unterscheiden (zwei Symbolvarianten), Absolutbezug «+0.00 = x m ü.M.» im EG/Plankopf | SIA 400 B.5.4, C.3.1.1 |
| M | `packages/kosmo-kernel/src/derive/schraffur.ts` | Kalksandstein-/Beton-Sinnbild am Original (Fig. 34) verifizieren; Stahl im Schnitt 1:50 als Vollschwarz | SIA 400 B.8.3.1, B.8.4.1 |
