# Wettbewerb-Konzept — Block D: Wettbewerbsphase-Simulation + automatisierte Grundlagenstudie

> Owner-Auftrag (V1.6, Block D in `docs/V16-AUFTRAG-PLAN.md`): Simulation der
> Wettbewerbsphase — (a) Sammeln von Infos (Beispiel: Wettbewerb in Zug),
> Verstehen des Auftrags, Umgebung, Gesetzgebung; (b) die von Kosmo
> automatisierte **Extremvarianten-Studie** als erste vollautomatische
> Grundlagenstudie: der Architekt bekommt eine Übersicht von Extremvolumen,
> Raumprogrammen, Klimastudien, möglichen Baustilen, möglichen Tragwerken.
> Ziel: **möglichst viel aufnehmen, vorbereiten, darstellen.**
>
> Im V1.6-Plan ist die Datei als `SIM-WETTBEWERB-KONZEPT.md` angekündigt; der
> Owner-Wortlaut dieses Auftrags nennt sie `WETTBEWERB-KONZEPT.md` — wie schon
> bei Block C (`SUBMISSION-KONZEPT.md` statt `SIM-SUBMISSION-KONZEPT.md`) gilt
> der spätere, direkte Wortlaut. Reine Doku, kein Produktivcode. Quellenlage:
> der lokale Wissens-Korpus (`wissen/vault/…`, ausserhalb dieses Repos unter
> `/home/user/Architektur-Cosmos/wissen/vault/`) plus der KosmoOrbit-Code
> selbst (`packages/kosmo-kernel/src/derive/`, `commands/design.ts`,
> `apps/kosmo-orbit/src/`) — jede fachliche Aussage trägt ihre Datei als
> Klammer-Fussnote. Kein Internet verwendet.

---

## 1. Was gehört in eine Wettbewerbs-Grundlagenanalyse (CH)?

### 1.1 Die Phase im Normgefüge: SIA 102, «Auswahlverfahren»

SIA 102:2020 ordnet Wettbewerbe und Studienaufträge in die Teilphase
**4.22 «Auswahlverfahren»** innerhalb der Vorstudien ein — VOR dem
eigentlichen Projektierungsauftrag: «Grundlage: Projektdefinition,
Projektpflichtenheft, Machbarkeitsstudie. Ziele: Anbieter bzw. Projekt
ausgewählt, welche den Anforderungen am besten entsprechen»
[`wissen/vault/normen/102-2020.md`, Ziff. 4.22, OCR-S. 19]. Die dort
gelisteten Grundleistungen sind fast wörtlich die Checkliste, die der Owner
mit «Sammeln von Infos» meint — sie fallen aber je nach Rolle (Auslobende
Seite vs. teilnehmendes Büro) unterschiedlich an:

- «Mitarbeit bei der Vorbereitung und Durchführung von Wettbewerben und
  Studienaufträgen», «Analysieren der Problemstellung», «Sammeln der
  notwendigen Daten und Arbeitsunterlagen», «Vorschlagen des bestgeeigneten
  Auswahlverfahrens».
- «Erstellen des Programms für das Auswahlverfahren in Zusammenarbeit mit
  dem Auftraggeber und dem Beurteilungsgremium»; «Bereitstellen der
  notwendigen Unterlagen wie **Pläne, Beschriebe, Raumprogramm,
  Modellunterlagen**» [ebd.] — das ist exakt die Materialliste, die ein
  teilnehmendes Büro beim Programm-Download vorfindet: Situationsplan/
  Vermessung, Text-Beschrieb (Auftrag/Ziele), Raumprogramm-Tabelle,
  Bestandsmodell/Terrain.
- «Mithilfe bei der Auswahl kompetenter Fachleute als Preisrichter, Experten
  und Wettbewerbsteilnehmer», «Ausschreiben des Auswahlverfahrens»,
  «Durchführen der Vorprüfung und Erstellen eines entsprechenden Berichtes»
  [ebd.] — Auslober-/Preisgerichtsseite, für KosmoOrbit (Büro-Werkzeug)
  nicht der relevante Teil.

**Ehrlich, Lücke im Korpus:** Die inhaltlich einschlägige Norm für
Wettbewerbsverfahren selbst ist **SIA 142** (Ordnung für Architektur- und
Ingenieurwettbewerbe) bzw. **SIA 143** (Studienaufträge) — beide liegen im
Bestand nur als **Rohscan-PDF ohne OCR-Volltext** vor
(`wissen/normen/NOR_Normen/SIA Normen/sia05/CD_v9_04/142_d.pdf` — deutsch,
französisch, italienisch je als PDF, kein `.md` im durchsuchbaren
`wissen/vault/normen/`). Verbindliche Aussagen zu Fristen, Anonymität,
Abgabeformat, Preisgerichtszusammensetzung lassen sich aus dem aktuellen
Korpus **nicht zitieren** — das ist eine echte Lücke, kein Auslassen. Was
OCR-erschlossen vorliegt, ist die **Wegleitung der SIA-Kommission für
Architektur- und Ingenieurwettbewerbe «Befangenheit und Ausstandsgründe»**
(März 2008): sie bestätigt immerhin die Verfahrensbegriffe — «Mitgliedern
des Preisgerichts oder Beurteilungsgremiums sowie Teilnehmenden von
Planungs-, Gesamtleistungswettbewerben oder Studienaufträgen»
[`wissen/vault/normen/wettbewerb_befangenheit_d.md`, Titelblatt] — mehr an
Verfahrensdetail gibt dieses Dokument nicht her.

### 1.2 Detaillierungsgrad: Wettbewerbspläne sind 1:200

SIA 400 ordnet den «Wettbewerbsplänen» ausdrücklich eine eigene Stufe
zwischen Situationsplänen und Bauprojektplänen zu — Massstab **1:200**,
zusammen mit «Situationsplänen in Städten» und (dort in derselben
Tabellenzeile mitlaufend) den Vorprojektplänen; Bauprojekte folgen bei 1:100
[`wissen/vault/normen/400-Planbearbeitung-im-Hochbau.md`, Figur 4 «Übliche
Massstäbe für Pläne des Architekten», OCR um Z. 2311–2346]. Für grosse
Projekte/Wettbewerbe wird ergänzend auch am Bauprojekt-Massstab 1:200
gearbeitet [ebd., OCR-S. 48]. **Das ist im Repo bereits verbindlich
festgehalten**, nicht neu zu recherchieren: `docs/PLAN-DETAILLIERUNG.md`
listet «1:200 | Situationspläne in Städten, Wettbewerbspläne,
**Vorprojektpläne**» und «1:100 | **Bauprojekte** (für grosse
Projekte/Wettbewerbe auch 1:200 [SIA 400, Ziff. C.2.1, OCR-S. 48])» als
bereits gegen SIA 400 abgeglichene Zeile — Konsequenz fürs Block-D-Konzept:
die Extremvarianten-Studie bewegt sich **auf Wettbewerbs-/Vorprojektniveau**
(Gesamtmasse, keine Öffnungsketten, siehe `docs/PLAN-DETAILLIERUNG.md`
Zeile 66) — kein Werkplan-Detail, das wäre der falsche Massstab für diese
Phase.

### 1.3 Zonenordnung/BZO — real vorhandenes Beispiel, aber nicht Zug

Der Korpus enthält eine vollständige, real gültige **Bau- und Zonenordnung**
als OCR-Volltext: «Bauordnung der Stadt Zürich, Bau- und Zonenordnung,
Gemeinderatsbeschluss vom 23. Oktober 1991, mit Änderungen bis 21. Dezember
2005» [`wissen/vault/normen/700.100Bau-undZonenordnungV2.md`, S. 1]. Sie
listet je Zone (W2b, W2, W3, W4, W5, Z5–Z7, I, IHD, Oe, Quartiererhaltung …)
Tabellenwerte für **Vollgeschosse max.**, **Grundgrenzabstand min. (m)** und
**Ausnützungsziffer max. (%)** — strukturell exakt das Schema, das
`packages/kosmo-kernel/src/model/zonenregeln.ts` (`ZonenRegel`) als
Datenform abbildet (`az`, `maxHoehe`, `maxVollgeschosse`,
`grenzabstandKlein`, `grenzabstandGross`).

**Ehrlich:** Das ist Zürich, nicht Zug — der Owner nennt «Wettbewerb Zug»
als Beispiel (auch in `derive/volumenstudie.ts`, Docstring: «Owner-Regeln
(Wettbewerb Zug)»), aber eine Zuger/Luzerner BZO als OCR-Volltext liegt im
Korpus **nicht** vor. Der bestehende `ZONENREGEL_KATALOG`
(`model/zonenregeln.ts`) trägt seine ZG/LU-Werte deshalb selbst schon
ehrlich als **«Richtwert»** ohne Quellenbeleg im Dateikommentar («BEWUSST
Richtwerte: die verbindlichen Werte stehen im kommunalen Baureglement») —
dieses Konzept bestätigt diese Selbsteinschätzung, statt sie zu
verschärfen: für ein konkretes Wettbewerbsprogramm bleibt das Einlesen der
tatsächlichen Gemeinde-BZO (PDF/Text) Aufgabe des Architekten oder eines
künftigen Kosmo-Lesepfads (vgl. `design.zonenRegelSetzen`, das jede Regel
frei überschreibbar hält).

### 1.4 Ortsanalyse, Klima, Kontext

Für «Klima als Entwurfsfaktor» liegt eine einschlägige Quelle vor: «Die
Untersuchung des Klimas als Voraussetzung für einen ortsspezifischen
Entwurf ist … kaum Thema in Ausbildung und Praxis» — das Buch macht daraus
ausdrücklich ein methodisches Programm, «welches aus den lokalen,
gesellschaftlichen und klimatischen Bedingungen entwickelt wird»
[`wissen/vault/buecher/Hoenger_Das_Klima_als_Entwurfsfaktor.md`,
Z. 167–169, 323]. Ergänzend `wissen/vault/buecher/Christen_Klima_und_Architektur.md`
(gleiches Themenfeld, ungeprüft im Detail für dieses Konzept). Für
Baugrund/Terrain als Standortfaktor: `wissen/vault/Baugrund-und-Baugrube.md`
(Lehrheft, Bauvorbereitung). Eine eigene «Ortsanalyse»-Methodik (Kontext,
Städtebau, Referenzen) im engeren Sinn — vergleichbar einer
Analyse-Checkliste — findet sich im Korpus **nicht** als eigenständiges
Dokument; das bleibt, ehrlich benannt, primär Entwurfshandwerk des
Architekten, das Kosmo mit den Klima-/Baugrund-Quellen sowie der
`quellen_suchen`-Wissenssuche (Abschnitt 3) unterstützen, aber nicht
ersetzen kann.

### 1.5 Zusammenfassung der Grundlagen-Checkliste

| Baustein | Quelle | Im Korpus? |
|---|---|---|
| Wettbewerbsverfahren (Fristen, Anonymität, Preisgericht) | SIA 142/143 | **Nein** — nur Rohscan-PDF, kein OCR |
| Programm/Verfahrensbegriffe, Preisgericht-Befangenheit | SIA-Wegleitung Befangenheit | Ja [`wettbewerb_befangenheit_d.md`] |
| Programmunterlagen-Liste (Pläne/Beschrieb/Raumprogramm/Modell) | SIA 102 Ziff. 4.22 | Ja [`102-2020.md`] |
| Planmassstab Wettbewerbsphase (1:200) | SIA 400 | Ja [`400-Planbearbeitung-im-Hochbau.md`; bereits verarbeitet in `docs/PLAN-DETAILLIERUNG.md`] |
| Zonenordnung/BZO-Struktur (AZ, Vollgeschosse, Grenzabstand) | Bauordnung Stadt Zürich (Beispiel, NICHT Zug) | Ja [`700.100Bau-undZonenordnungV2.md`] |
| Klima als Entwurfsfaktor | Fachbuch | Ja [`Hoenger_Das_Klima_als_Entwurfsfaktor.md`] |
| Ortsanalyse-Methodik im engeren Sinn | — | **Nein**, kein eigenes Dokument gefunden |

---

## 2. Ist-Stand-Inventar in KosmoOrbit

Block D baut fast ausschliesslich auf **bestehenden** Kernel-Bausteinen —
die Owner-Kommentare in `derive/volumenstudie.ts` («Owner-Regeln
(Wettbewerb Zug)») zeigen, dass dieser Wettbewerb bereits Pate für die
heutige Volumenstudie stand. Was fehlt, ist nicht der Rechenkern, sondern
die **Verdrahtung zur Kette** und der **Kosmo-Zugriff** darauf.

### 2.1 `derive/volumenstudie.ts` — Extremvolumen-Generator

**Kann heute:** `generiereVolumenstudien(parzelle, opts)` erzeugt bis zu
sechs Typologien — Teppich, Riegel, Turm, Zeilen, Winkel, Blockrand — als
reine Funktion (kein Doc-Zugriff): Parzelle minus Grenzabstand → Fussabdruck
→ Geschosszahl aus GF-Ziel/maxHöhe → `passt`-Flag, Spänner-Tiefen-Check
(14–18 m), 3h-Besonnungs-Näherung (`SCHATTEN_FAKTOR_3H = 1.43`, Kommentar
nennt ausdrücklich «Innerschweiz ≈ 47° N»). Ergebnis: `StudienVariante[]`
mit `koerper`, `gf`, `geschosse`, `hoehe`, `passt`, `tiefeOk`, `besonnung`,
`hinweise`.

**Fehlt für die Grundlagenstudie:**
- `StudienOptionen` (`zielGf`, `maxHoehe`, `grenzabstand`) werden **manuell**
  aus UI-State befüllt, NICHT aus der aktiven `ZonenRegel`: im Studien-Panel
  ist `maxHoeheM` ein `useState(25)` mit Zug-Owner-Defaultwert, unabhängig
  von `doc.settings.zonenRegel.maxHoehe`; `grenzabstand` wird beim Aufruf
  gar nicht übergeben (Default 4000 mm greift immer)
  [`apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx`, Z. 200, 1786].
  Die **Ausnützungsziffer `az`** der Zonenregel fliesst überhaupt nicht in
  `generiereVolumenstudien` ein — GF-Ziel kommt einzig vom Raumprogramm/vom
  manuell eingetippten Wert.
- `StudienKoerper.program` ist immer der feste String `'studie'`
  [`volumenstudie.ts` Z. 147] — keine Typ-Aufschlüsselung nach
  Wohnungstypen (marktgerecht/preisguenstig/…), also keine direkte
  Anschlussfähigkeit an `deriveBerechnungsliste` (die nach `program`-Key
  filtert).

### 2.2 Varianten-Matrix (`derive/variantenmatrix.ts`)

**Kann heute:** `variantenMatrix(varianten, zielGf)` normiert GF, Δ-Ziel,
Geschosse, Höhe, Fussabdruck, Besonnungsreserve auf eine Parallel-Axis-Achse
je Variante — reine Ableitung, das Studien-Panel zeichnet daraus das SVG
[ROADMAP 53].

**Fehlt:** eine Achse für **Programm-Erfüllung %** je Variante (siehe 2.5)
und für **Tragwerks-/Baustil-Bewertung** (die es als Zahl noch nicht gibt,
Abschnitt 3).

### 2.3 CH-Standort/Parzellen-Import (`derive/standort.ts` + `commands/design.ts`)

**Kann heute:** `parzelleZuOutline(rings)` wandelt geo.admin.ch-`identify`-
Polygone in eine `ParzellenImport` (Outline in Modell-mm, LV95-Zentrum,
Fläche) — reine Funktion, wählt den kleinsten Ring (Punkt trifft sonst die
Gemeinde) und lehnt Flächen > 100 000 m² ab. Der Command
`design.standortSetzen` speichert `label/lat/lon/e/n/hoeheM` im Doc
(WGS84 für die Sonne, LV95 fürs Vermessen); die Adresssuche + der
`identify`-Aufruf selbst laufen als **UI-only `fetch`** in
`StandortSuche()` [`DesignWorkspace.tsx`, Z. 2133–2188] gegen
`api3.geo.admin.ch`, landen aber über den echten Command `design.zoneErstellen`
im Doc. Die **Schattenstudie ist real**: `Viewport3D.tsx` nutzt `SunCalc`
mit `doc.settings.standort.lat/lon` für die 3D-Sonnenposition
[`Viewport3D.tsx`, Z. 6, 337–354], Paket `suncalc@^2.0.0`
[`apps/kosmo-orbit/package.json`, Z. 34].

**Fehlt:** (a) der geo.admin.ch-Weg ist **kein Kosmo-Command** — Kosmo
selbst kann heute keine Parzelle nachschlagen, nur der Mensch per Klick;
(b) `SunCalc` läuft **live im 3D-Viewport für genau einen Zeitpunkt/das
eine im Doc lebende Modell** — es gibt keine Funktion, die SunCalc auf
mehrere `StudienKoerper[]`-Sätze parallel anwendet, um Varianten zu
vergleichen (heute nur die grobe 1.43×Höhe-Näherung aus 2.1).

### 2.4 Zonenregel-Katalog (`model/zonenregeln.ts`) + `design.zonenRegelSetzen`

**Kann heute:** sechs Richtwert-Zonen ZG/LU als `ZONENREGEL_KATALOG`; der
Command `design.zonenRegelSetzen` speist **bereits automatisch**
`maxAgf = az × parzellenFlaeche` in die Berechnungsliste
[`commands/design.ts`, Z. 1806–1839] — ein bestehender, funktionierender
Extremwert-Mechanismus, nur bisher nicht mit dem Volumenstudien-Generator
verknüpft (siehe 2.1).

**Fehlt:** genau diese Verknüpfung — `az`/`maxHoehe`/`grenzabstandKlein`
der aktiven `ZonenRegel` als direkte, automatische Eingabe für
`generiereVolumenstudien`.

### 2.5 Raumprogramm-CSV-Import + Berechnungsliste (`derive/segmentierer.ts`, `derive/berechnungsliste.ts`)

**Kann heute:** `parseRaumprogrammCsv` liest Wettbewerbs-Raumprogramme
tolerant ein (Trennzeichen, CH-Zahlenformat, deutsche Typ-Aliase, meldet statt
verschluckt) → `design.raumprogrammSetzen`. `deriveBerechnungsliste(doc)`
vergleicht `ausgezogen` (gezeichnete Flächen nach `program`-Key) gegen
`agfZiel = hnfSoll × programmFaktor` je Typ, plus Δ-Max gegen `maxAgf`.
`sollMix(doc)` (Segmentierer) leitet aus dem Raumprogramm eine
Wohnungsanzahl je Typ ab (`WOHNUNGS_GROESSEN`).

**Fehlt:** `deriveBerechnungsliste` arbeitet **ausschliesslich auf dem
Doc** (`doc.byKind<Zone/MassBody>`) — es gibt keine Variante, die auf lose,
nie ins Doc geschriebene `StudienKoerper[]` (Abschnitt 2.1) rechnet. Für
sechs parallele, nicht committete Extremvolumen bräuchte es entweder (a)
eine doc-freie Zwillingsfunktion, oder (b) jede Variante testweise ins Doc
zu schreiben und wieder zu verwerfen (teuer, unelegant). Ausserdem trägt
jede `StudienVariante` nur EIN Gesamt-GF (`gf`), keine Typ-Aufschlüsselung
(siehe 2.1) — eine ehrliche Programm-Erfüllung je Wohnungstyp *pro
Extremvariante* ist heute nicht ableitbar, nur eine Gesamt-GF-Erfüllung.

### 2.6 `pruefeGrundriss` (`derive/checks.ts`) — Grenzabstand/Baugrenze

**Kann heute:** prüft Wände/Volumenkörper/Dächer eines **im Doc
existierenden** Geschosses gegen `Boundary` (Baugrenze) und `ZonenRegel`
(Grenzabstand, Höhe, Vollgeschosse) — inkl. Mehrhöhenzuschlag, gestaffelt.
Läuft nach **jedem** Command automatisch mit (Diff-Karten-Vorschau).

**Fehlt für Block D:** nichts Grundsätzliches — sobald eine Extremvariante
via `design.volumenErstellen` ins Doc übernommen wird (bestehender
Mechanismus, siehe 2.7), greift `pruefeGrundriss` sofort und unverändert.
Der Nutzen für die *nicht* übernommenen fünf Varianten ist aber null, weil
sie nie im Doc stehen — auch hier bräuchte die Vorschau-Rechnung eine
Doc-freie Zwillingsfunktion (die Grenzabstands-Geometrie in `checks.ts` ist
allerdings eng an `Wall`/`MassBody`/`Boundary`-Entities gebunden, keine
reine Punktwolken-Funktion — ein Refactor auf «Punkte + Boundary-Polygon»
wäre ein eigener, sauber abgrenzbarer Zuschnitt).

### 2.7 Übernahme-Pfad (bereits sauber, wiederverwendbar)

**Kann heute:** Das Studien-Panel übernimmt eine gewählte Variante über den
**echten** Command-Weg: `history.beginGroup()` → je Körper
`runCommand('design.volumenErstellen', {...})` → `history.endGroup()`
[`DesignWorkspace.tsx`, Z. 1792–1808] — atomare Undo-Gruppe, kein
Sonderpfad. Dieser Mechanismus ist die Blaupause dafür, wie D-1 eine
gewählte Extremvariante ins Modell holt; er muss nicht neu gebaut werden.

### 2.8 Tragwerk (`derive/stuetzenraster.ts` + `Column`/`Beam`)

**Kann heute:** `generiereStuetzenraster(opts)` ist ein deterministisches
Rechenwerk (VSS-40-291-Parkraster → Wohnraster, Achsmass, Holzbau-Warnung ab
12 m Primärachse) — vollständig unabhängig von einer konkreten
Gebäudegeometrie. Real ins Modell integriert: `design.rasterSetzen` erzeugt
`GridAxis`-Entities, `design.stuetzenAusRaster` setzt echte `Column`-
Bauteile auf jede Rasterkreuzung, `design.unterzugZeichnen` für `Beam` —
inkl. 3D/Plan/Mengen/IFC-Export [ROADMAP 112].

**Fehlt:** eine Verbindung zwischen «welche Extremvariante» und «welches
Stützenraster passt dazu» — heute zwei getrennte Werkzeuge (Studien-Panel,
Raster-Assistent), kein gemeinsamer Datenfluss.

### 2.9 Baustil — kein Generator vorhanden

**Kann heute:** `derive/renderprompt.ts` leitet Render-Prompt-Phrasen aus
**bereits gewählten** Wandaufbau-Materialien ab (Sichtbeton, Putz, Holz,
Klinker …) [`renderprompt.ts`, Z. 11–18] — setzt also eine
Materialentscheidung voraus, die es in der Wettbewerbsphase noch nicht
gibt. `VIS_STIMMUNGEN` in `derive/visgraph.ts` sind Licht-/Renderstimmungen
(Morgen/Abend/Weissmodell), keine Baustil-Kategorien.

**Fehlt vollständig:** jeder deterministische «Baustil»-Vorschlag — das ist
laut Selbstbeschrieb des Codes und laut Abschnitt 3 dieses Konzepts
bewusst LLM-Terrain, kein Kernel-Baustein.

### 2.10 Kosmo-Zugriff auf all das

**Ist-Stand:** Laut `CLAUDE.md` wird «jedes zod-Schema … automatisch ein
Kosmo-LLM-Tool» — Kosmos Werkzeugkasten ist exakt die Menge der
registrierten **Commands**. Reine Ableitungen wie `generiereVolumenstudien`,
`variantenMatrix`, `deriveBerechnungsliste`, `pruefeGrundriss` sind **keine**
Kosmo-Tools (bestätigt: kein Treffer in `packages/kosmo-ai/src`, auch nicht
im System-Prompt-Kontext von `KosmoPanel.tsx`) — Kosmo kann sie heute nicht
aufrufen und sieht ihre Ergebnisse nicht automatisch. Für Wissensfragen
existiert der separate Pfad `quellen_suchen`
(`apps/kosmo-orbit/src/modules/prepare/knowledge.ts`, `state/quellen.ts`) —
PDF/Text-Ingestion → Chunks → (optional) bge-m3-Embedding über die Bridge —
das ist der Kanal, über den ein Programmtext oder eine BZO-PDF überhaupt in
Kosmos Reichweite kommt.

**Nächstliegender Baustein für den «Bericht»:** `state/variant-archive.ts`
(«Varianten-Archiv», ROADMAP 72) friert bereits heute einen Doc-Snapshot mit
Kennzahlen (NGF/HNF/aGF-Ziel/%-Erfüllung je Typ/Δ-Max) und einem
Plan-Thumbnail-SVG ein, unveränderlich, für den Seite-an-Seite-Vergleich
[`variant-archive.ts`, Z. 10–61]. Das ist strukturell nah an dem, was eine
Extremvarianten-Übersicht braucht — friert aber heute nur EINEN im Doc
lebenden Stand ein, keine sechs parallelen, nie committeten
Studienkörper.

---

## 3. Die automatisierte Grundlagenstudie als Kosmo-Kette

Ziel: aus **Parzelle + Zonenregel + Raumprogramm-CSV + Programm-Text**
automatisch erzeugen: Extremvolumen je Typologie, Besonnungsvergleich,
Programm-Erfüllungsgrad, plus (klar getrennt) Baustil-/Tragwerks-Vorschläge
und ein Bericht. Die Entscheide unten benennen für jeden Teil, ob er
**deterministisch aus Geometrie/Zahlen** folgt, **LLM-Interpretation mit
Quellenpflicht** ist, oder **HomeStation-Terrain** (Renderings) bleibt —
das ist die zentrale Ehrlichkeitslinie dieses Konzepts.

### Entscheide

- **D-E1 — Wettbewerbs-Input ist ein Bündel bestehender Doc-Settings, kein
  neues Format:** Parzelle (`design.zoneErstellen`/geo.admin.ch-Import,
  besteht), Zonenregel (`design.zonenRegelSetzen`, besteht), Standort
  (`design.standortSetzen`, besteht), Raumprogramm
  (`parseRaumprogrammCsv` → `design.raumprogrammSetzen`, besteht). Neu ist
  nur der **Programmtext** (freier Wettbewerbsbeschrieb) — der läuft über
  den bestehenden Wissens-Ingestion-Pfad (`knowledge.ts`), NICHT über ein
  neues Datei-Format. D-1 verdrahtet, was da ist — erfindet keine fünfte
  Import-Pipeline.
- **D-E2 — Extremvolumen: Zonenregel automatisch in `volumenstudie.ts`
  einspeisen (die grösste konkrete Lücke aus 2.1/2.4):** eine neue reine
  Funktion `studienOptionenAusZonenregel(regel, parzellenFlaeche,
  raumprogramm, programmFaktor)` leitet `StudienOptionen` (`zielGf` = Σ
  `hnfSoll × programmFaktor` aus dem Raumprogramm, `maxHoehe` =
  `regel.maxHoehe`, `grenzabstand` = `regel.grenzabstandKlein`) automatisch
  ab, statt der heutigen manuellen UI-Eingabe. `generiereVolumenstudien`
  selbst bleibt unverändert (reine, gut getestete Funktion) — nur der
  Aufrufer wechselt von «Mensch tippt Zahlen» zu «Kosmo liest Doc-Settings».
  **Deterministisch, keine LLM-Beteiligung.**
- **D-E3 — Drei bis sechs Typologien, kein neuer Generator:** der Owner
  verlangt «3–5 Bebauungs-Typologien» — `generiereVolumenstudien` liefert
  bereits bis zu sechs (Teppich/Riegel/Turm/Zeilen/Winkel/Blockrand), von
  denen je nach Parzellenform 2–6 tatsächlich passen (die Guards für Zeilen/
  Winkel/Blockrand verwerfen sich selbst auf zu schmalen Parzellen — bereits
  Code-Verhalten, Z. 196, 218, 234 in `volumenstudie.ts`). Der Bericht
  (D-E8) macht diese Quote explizit: **«n von 6 Typologien auf dieser
  Parzelle möglich»** — analog zur Ehrlichkeits-Formel aus
  `docs/SUBMISSION-KONZEPT.md` («n von m Abweichungen als Vorschlag»). Kein
  neuer Typologie-Code nötig, nur die Meldung, welche verworfen wurden und
  warum.
- **D-E4 — Besonnungsvergleich: die bestehende Näherung bleibt der
  Vergleichsmassstab, ergänzt um eine echte SunCalc-Auswertung auf
  Studienkörpern:** die 1.43×Höhe-Näherung aus `volumenstudie.ts` bleibt die
  schnelle, immer verfügbare Vergleichszahl für die Matrix (Abschnitt 2.1/2.2)
  — sie ist bereits Owner-kalibriert («21. März, Innerschweiz ≈ 47° N»).
  Zusätzlich: eine neue reine Funktion (`derive/studienbesonnung.ts` o.ä.)
  wendet `SunCalc.getPosition` (bereits Abhängigkeit,
  `apps/kosmo-orbit/package.json` Z. 34 — für den Kernel wäre eine eigene,
  leichte Abhängigkeit oder ein Re-Export nötig, da `suncalc` heute nur in
  der App, nicht im Kernel-`package.json` liegt) direkt auf die
  `StudienKoerper[]`-Polygone an, **ohne** die Varianten ins Doc zu
  schreiben — reine Geometrie + Sonnenwinkel, kein LLM. Ergebnis: eine
  grobe Schattenwurf-Vergleichsfläche je Variante zu 2–3 Referenzterminen
  (21.3./21.6./21.12., analog zur 3h-Kriterium-Konvention). **Ehrlich, wie
  in `volumenstudie.ts` selbst dokumentiert: Näherung, kein Ersatz für die
  echte 3D-Schattenstudie im Viewport**, die weiterhin nur für die *eine*
  ins Doc übernommene Variante voll (mit Terrain/Nachbarbauten) läuft.
- **D-E5 — Programm-Erfüllungsgrad je Variante: nur Gesamt-GF, ehrlich ohne
  Typenzuordnung:** `StudienKoerper.program` ist heute immer `'studie'`
  (Abschnitt 2.1) — es gibt keine Grundlage, einer Extremvariante
  automatisch eine Typenverteilung (marktgerecht/preisguenstig/…)
  zuzuordnen, ohne das dem Segmentierer vorzugreifen. D-1 zeigt deshalb je
  Variante **nur** `gf` gegen `zielGf` (bereits vorhanden als `passt`-Flag)
  — keine vorgetäuschte Typenaufschlüsselung. Die echte Typenverteilung
  bleibt Aufgabe des **Wohnungs-Segmentierers** (`derive/segmentierer.ts`,
  `sollMix`) auf der EINEN Variante, die der Architekt danach wählt und ins
  Doc übernimmt — alle sechs Extremvarianten zu segmentieren wäre teuer und
  sinnlos, solange keine gewählt ist.
- **D-E6 — Baustil-Vorschläge sind LLM-Antwort mit Quellen, nie berechnetes
  Faktum:** kein Kernel-Code entscheidet «das ist ein Vorschlag für
  Bauhaus-Sprache» — das ist Interpretation von Programmtext + Ortsanalyse
  + (falls hochgeladen) Referenzbildern. Kosmo liest den Programmtext über
  `quellen_suchen` (Abschnitt 2.10) und antwortet mit 2–3
  Referenzrichtungen, **jede mit Quellen-Chip** — exakt das Muster aus dem
  Submission-Konzept C-E6 («LLM-Lesung, Vorschlag mit Fehlermöglichkeit, im
  UI so benannt»). Ein Baustil-Vorschlag landet **niemals** als Zahl in der
  Varianten-Matrix oder Berechnungsliste — er ist ein separates,
  ausdrücklich als Meinung markiertes Antwortfeld.
- **D-E7 — Tragwerksvorschläge: deterministischer Kern (Raster) +
  LLM-Einordnung (Bauweise):** `derive/stuetzenraster.ts` liefert bereits
  eine geometrisch nachvollziehbare Raster-Bewertung (zu-eng/knapp/
  ausgewogen/grosszügig, Holzbau-Warnung ab 12 m) — **deterministisch**,
  aber an eine gewählte Gebäudegeometrie gebunden (`GridAxis` im Geschoss),
  nicht an sechs parallele Extremvarianten. D-1 nutzt diesen Assistenten
  unverändert, sobald eine Variante gewählt/übernommen ist (Vorschlag: der
  Studien-Bericht nennt je Variante nur die **rohe Spannweite**
  (Fussabdruck-Kurzseite) und markiert `> 12 m` als «Holzbau-kritisch»,
  ohne den vollen Raster-Assistenten sechsmal durchzurechnen). Der grobe
  Tragwerks-**Typ** (Massivbau/Skelettbau/Holzbau) je Extremvariante ist
  dagegen LLM-Interpretation: Kosmo bekommt Spannweite/Höhe/Nutzung als
  Fakten übergeben und antwortet mit einer Einordnung samt Quellen (z.B.
  `wissen/vault/vorlesungen/Formelsammlung-Tragwerk-*.md`), **nie** als
  errechnetes Ergebnis in der Matrix.
- **D-E8 — Grundlagenstudie-Bericht: additives Artefakt zuerst, kein neuer
  Blatt-Typ im ersten Schritt:** `derive/publikation.ts`/`PublishWorkspace.tsx`
  kennen heute Platzierungsarten `plan`/`section`/`axo`/`storey`
  (`e2e/sim/bausteine.ts`, Baustein 16) — kein «Studienvergleich»-Typ mit
  Parallel-Axis-Matrix + sechs Thumbnails nebeneinander. Statt das
  Blatt-System zu erweitern (grösserer, KosmoPublish-weiter Eingriff),
  liefert D-1 zunächst ein **eigenständiges Export-Artefakt** (SVG, analog
  zum bestehenden Thumbnail-Rendering in `state/variant-archive.ts`,
  `planInnerSvg`) mit: Matrix-SVG (bereits vorhanden), sechs
  Studienkörper-Grundrissen, Kennzahlentabelle (GF/Geschosse/Höhe/
  Besonnung/Programm-Δ je Variante), Typologie-Quote (D-E3) und den
  Baustil-/Tragwerks-Antworten (D-E6/D-E7) als Text mit Quellen. Ein
  natives KosmoPublish-Blatt «Studienvergleich» ist eine mögliche
  Ausbaustufe, kein D-1-Muss.
- **D-E9 — Kosmo braucht einen neuen Aufrufweg, das ist echte neue
  Architektur:** weil reine Ableitungen heute keine Kosmo-Tools sind
  (Abschnitt 2.10), braucht die «vollautomatische» Kette einen
  orchestrierenden Einstiegspunkt — entweder (a) einen neuen **Lese-Tool**
  (kein Patch, gibt nur strukturierte Zahlen/Text zurück, ähnlich wie der
  bestehende Dry-Run-Weg in `commands/core.ts` für Patch-Vorschauen, aber
  für reine Ableitungen) oder (b) einen Command, der die Kette anstösst und
  das Ergebnis als Kosmo-Antworttext zurückspiegelt. Das rührt an
  Kosmo-Tool-Registrierung und Provider-Kontext — **kein additiver
  Kernel-Zuschnitt**, sondern der einzige Teil dieses Konzepts, der die
  bestehende Kosmo-Architektur selbst erweitert. Entsprechend zentral
  (Opus), nicht in einen Worktree delegierbar.

### Ehrliche Dreiteilung (Zusammenfassung)

| Teil | Herkunft | Charakter |
|---|---|---|
| Extremvolumen je Zonenregel (D-E2) | `volumenstudie.ts` + `ZonenRegel` | deterministisch |
| Typologie-Auswahl + Quote (D-E3) | `volumenstudie.ts` Guards | deterministisch |
| Besonnungsvergleich (D-E4) | SunCalc auf `StudienKoerper` | deterministisch (Näherung, ausgewiesen) |
| Programm-Erfüllung Gesamt-GF (D-E5) | `zielGf` vs. `gf` | deterministisch, bewusst ohne Typenzuordnung |
| Tragwerks-Raster/Spannweite (D-E7, Zahlenteil) | `stuetzenraster.ts` | deterministisch |
| Baustil-Vorschlag (D-E6) | Kosmo + `quellen_suchen` | LLM-Interpretation, Quellenpflicht |
| Tragwerks-Bauweise-Typ (D-E7, Einordnung) | Kosmo + Wissenskorpus | LLM-Interpretation, Quellenpflicht |
| Fotorealistische Darstellung je Variante | KosmoVis/Render-Pipeline | HomeStation-Abnahme, hier nicht behandelt |

---

## 4. Batch-Plan D1…D6

Modellgebrauch nach `docs/KI-MODELL-GUIDELINE.md`: Opus orchestriert
zentral (insbesondere D4, das den Kosmo-Tool-Zugriff selbst erweitert),
Sonnet baut abgegrenzte, rein testbare Kernel-Pakete im Worktree. Goldens
(`packages/kosmo-kernel/test/golden/*.svg`) bleiben byte-stabil: alle neuen
Pfade sind additiv, laufen ohne aktive Zonenregel/Studien-Aufruf ins Leere
(kein neues Pflichtfeld, keine bestehende Ableitung ändert Verhalten ohne
neue Daten).

| Batch | Scope | Wer | Abnahme | Ehrliche Grenze |
|---|---|---|---|---|
| **D1** | `studienOptionenAusZonenregel` (D-E2): reine Funktion, verdrahtet `ZonenRegel`+Raumprogramm → `StudienOptionen`; Studien-Panel nutzt sie als Default (Overrides bleiben möglich) | Sonnet Worktree | Unit-Tests je Zonenregel-Feld (az/maxHoehe/grenzabstand → korrekte Optionen); ohne aktive Zonenregel unverändertes Verhalten (heutige manuelle Werte bleiben Fallback); Goldens unverändert | Ausnützungsziffer bleibt Richtwert-Herkunft (Abschnitt 1.3); keine neue Zonenquelle |
| **D2** | Besonnungsvergleich auf Studienkörpern (D-E4): neue reine Funktion, SunCalc auf `StudienKoerper[]` zu 2–3 Referenzterminen, Vergleichszahl in `variantenMatrix` als neue Achse | Sonnet Worktree | Unit-Tests (bekannte Sonnenwinkel → erwartete Schattenlänge, Vergleich mit bestehender 1.43-Näherung als Plausibilisierung); keine Doc-Schreibung | Näherung, kein Ersatz für die 3D-Schattenstudie; Kernel-`package.json` braucht `suncalc` oder Re-Export-Grenze klären |
| **D3** | Programm-Erfüllung Gesamt-GF je Variante (D-E5) + Typologie-Quote (D-E3) als Matrix-Erweiterung/Bericht-Datenmodell | Sonnet Worktree | Unit-Tests (GF-Δ je Variante korrekt, Quote «n von 6» korrekt bei schmaler/breiter Parzelle); keine Typenzuordnung vorgetäuscht (expliziter Test: `program` bleibt `'studie'`) | Keine Wohnungstyp-Aufschlüsselung; das bleibt Segmentierer-Aufgabe nach Variantenwahl |
| **D4** | Kosmo-Kette (D-E9): neuer Lese-Tool-/Command-Weg, der D1–D3 orchestriert und ein strukturiertes Ergebnis in den Kosmo-Kontext zurückspiegelt; Baustil-/Tragwerks-LLM-Antwortpfad mit Quellen-Chips (D-E6/D-E7-Einordnung) | **Opus zentral** (Kosmo-Tool-Registrierung, Provider-Kontext, grösster Architektur-Eingriff analog C4) | E2E-Kern: Kosmo-Aufruf liefert alle sechs (oder weniger) Varianten mit Kennzahlen; Baustil-/Tragwerk-Antworten tragen Quellen-Chip, landen NICHT in der Zahlen-Matrix; kein Doc-Write ohne explizite Übernahme (bestehender Mechanismus 2.7) | LLM-Anteile sind Vorschlag, nie Fakt; ohne erreichbaren Provider ehrlicher Hinweis statt Attrappe (Betriebsarten-Regel) |
| **D5** | Grundlagenstudie-Bericht (D-E8): SVG-Export mit Matrix + 6 Grundrissen + Kennzahlentabelle + Typologie-Quote + Baustil-/Tragwerk-Text, baut auf `variant-archive.ts`-Thumbnail-Mechanik | Sonnet Worktree (Renderer), Opus-Gate (Anbindung an bestehende Publish-/Export-Infrastruktur) | Golden/Snapshot-Test des SVG-Berichts bei fixem Testprojekt; Export-Datei benannt/versioniert wie bestehende Exporte (`exportPruefen`-Muster) | Kein natives KosmoPublish-Blatt in D5 — das ist eine spätere Ausbaustufe, kein Rückzieher |
| **D6** | E2E `sim-wettbewerb.spec.ts` (Ablauf unten) + neue Bausteine (append-only, Bausteine-API ab H2 eingefroren) + ROADMAP-Eintrag + Handbuch-Abschnitt | Sonnet Worktree (Spec), Opus-Gate (volle Suiten) | Voller Sim-Lauf grün im Container (ohne Bridge); volle Kernel-/App-/E2E-Suiten grün; Goldens byte-identisch | Baustil-/Tragwerk-Antworten bleiben Mock-Provider-Pfad im Container (Regel R9), echte Modellqualität ist Cloud/HomeStation-Abnahme |

Reihenfolge D1 → D2 → D3 → D4 → D5 → D6. D1–D3 sind unabhängige,
additive Kernel-Bausteine (parallelisierbar, wenn zwei Worktrees verfügbar
sind); D4 kann erst NACH D1–D3 sauber orchestrieren, weil es genau deren
Ergebnisse zurückspiegelt; D5 baut auf D4s Ergebnisform; D6 versiegelt die
Kette als Testlauf, analog zu C6 im Submission-Konzept.

### E2E-Simulation «Wettbewerbs-Testlauf» (Playwright-Skizze)

Neues Spec `e2e/sim-wettbewerb.spec.ts` auf dem Serie-H-Harness. Direkt
wiederverwendbar aus `e2e/sim/bausteine.ts`: `projektStarten`,
`parzelleSetzen` (Baugrenze + Zonenregel — z.B. «W3 (Richtwert LU)» aus dem
Katalog), `checksLesen`, `berechnungslistePruefen`, `kosmoFragen`,
`tragwerkAusRaster`, `blattPublizieren`, `exportPruefen`. Neu (append-only):
`standortSetzen` (direkter `design.standortSetzen`-Aufruf mit fixen
Testkoordinaten, kein Netz), `studieGenerieren` (ruft den D4-Weg auf),
`studienMatrixPruefen` (erwartete Variantenzahl/`passt`-Flags/
Besonnungswerte gegen die Testparzelle), `grundlagenstudieBlattPruefen`
(D5-Export sichtbar/benannt).

```
1  projektStarten + standortSetzen                      (Innerschweiz-Testkoordinaten)
2  parzelleSetzen('W3 (Richtwert LU)')                   (Baugrenze + Zonenregel)
3  design.raumprogrammSetzen (CSV-Fixture)                (Wettbewerbs-Soll)
4  studieGenerieren()                                     → alle passenden Typologien
5  studienMatrixPruefen: erwartete GF/Höhe/Besonnung       je Variante, Quote «n von 6»
6  kosmoFragen('Welcher Baustil passt zum Kontext?',       Quellen-Chip (Mock-Provider,
   modus: quelle)                                          R9-Regel)
7  Variante wählen → Übernehmen (bestehender Mechanismus:   history.beginGroup/…/endGroup,
   design.volumenErstellen je Körper)                       design.volumenErstellen)
8  checksLesen + berechnungslistePruefen                   (übernommene Variante zeigt
                                                             jetzt reale %-Erfüllung)
9  tragwerkAusRaster (bestehender Baustein)                 auf der übernommenen Variante
10 blattPublizieren + grundlagenstudieBlattPruefen          (D5-Bericht sichtbar)
11 exportPruefen('export-svg'/'export-pdf', …)              (Grundlagenstudie-Datei)
```

**Ehrlich (Grenzen der Kette):**
- Die Extremvarianten-Studie ist eine **Vorentwurfsschleife**, kein
  Wettbewerbsbeitrag — sie zeigt Grenzwerte und Richtungen, nicht den
  fertigen Entwurf. Das entspricht dem Owner-Grenzsatz in
  `docs/V16-AUFTRAG-PLAN.md`: «Kosmo bereitet auf und stellt dar — die
  Entwurfsentscheidung bleibt beim Architekten (kein ‹Kosmo entwirft den
  Wettbewerb›)».
- Ohne OCR-Volltext von SIA 142/143 kann Kosmo **keine** verbindlichen
  Aussagen zu Wettbewerbsverfahrens-Regeln (Fristen, Anonymität) treffen —
  das ist im Bericht offen zu benennen, nicht stillschweigend zu umgehen.
  Ein OCR-Nachtrag dieser beiden Normen wäre die naheliegende Ergänzung,
  ist aber nicht Teil dieses Konzepts (kein Batch dafür vorgesehen).
- Baustil-/Tragwerks-Einordnung bleibt bis auf Weiteres **Mock-Provider**
  im Container-E2E (Serie-H-Regel); die inhaltliche Qualität der LLM-Antwort
  ist Cloud-/HomeStation-Abnahme, nicht Gegenstand der grünen Suiten.

---

## 5. Ehrlichkeits-Zusammenfassung

1. **SIA 142/143 sind eine echte Lücke:** Wettbewerbsverfahrens-Regeln im
   engeren Sinn (Fristen, Anonymität, Preisgericht-Zusammensetzung) sind im
   Korpus nicht OCR-erschlossen — nur die Befangenheits-Wegleitung liegt
   vor. Was zitiert wird (SIA 102 Ziff. 4.22, SIA 400 Massstabstabelle),
   trägt seine Quelle exakt; was fehlt, wird nicht ersetzt.
2. **«Wettbewerb Zug» ist ein Owner-Vorbild, kein Korpus-Dokument:** Die
   ZG/LU-Richtwerte im `ZONENREGEL_KATALOG` sind seit jeher als Richtwerte
   deklariert; dieses Konzept bestätigt, dass eine echte Zuger BZO nicht im
   Wissenskorpus liegt (nur die Zürcher BZO als Strukturbeispiel).
3. **Die grösste technische Lücke ist Verdrahtung, nicht Rechenkraft:**
   `volumenstudie.ts`, `variantenmatrix.ts`, `stuetzenraster.ts`,
   `zonenregeln.ts`, `standort.ts`, der CSV-Import und der
   Übernahme-Mechanismus (2.7) existieren bereits und sind gut getestet —
   sie sprechen heute nur nicht miteinander und sind Kosmo nicht als
   Werkzeug zugänglich (D-E9).
4. **Baustil und Tragwerks-Typ sind und bleiben LLM-Antworten mit
   Quellenpflicht**, nie Zahlen in der Matrix oder Berechnungsliste — die
   deterministische Zahlenwelt (Extremvolumen, Besonnung, Programm-Δ,
   Raster) bleibt strikt getrennt von der interpretierenden Antwortwelt.
5. **Kosmo entwirft nicht — Kosmo bereitet vor.** Die Extremvarianten-Studie
   ist eine automatisierte, aber unfertige Übersicht; die Auswahl und
   Weiterentwicklung einer Variante bleibt Architektenentscheidung, exakt
   wie im Owner-Auftrag als Grenze benannt.
