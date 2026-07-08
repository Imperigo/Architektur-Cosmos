# Submission-Konzept — Block C: Submissionsphase-Simulation + Unternehmerplan-Import

> Owner-Auftrag (V1.6, Block C in `docs/V16-AUFTRAG-PLAN.md`): Ein Projektstand
> muss für die Submission überarbeitet werden — Unternehmer schicken Offerten
> auf Basis der Submissionspläne. Danach kommt der Plansatz der Unternehmer
> zurück, und Kosmo soll ihn «analysieren, verstehen was geändert/ergänzt
> wurde, und in die Architektenpläne übernehmen». Leitprinzip des Owners:
> **UNGENAU/OFFEN/UNDEFINIERT = Zusatzkosten** — je präziser der Architekt
> vorgibt, desto sauberer die Offerte.
>
> Dieses Dokument ist das C-0-Konzept (im V1.6-Plan als
> `SIM-SUBMISSION-KONZEPT.md` angekündigt; per Owner-Wortlaut heisst die Datei
> `SUBMISSION-KONZEPT.md`). Reine Doku, kein Produktivcode. Quellenlage: der
> lokale Wissens-Korpus (`wissen/vault/…`, OCR-Volltexte der SIA-Normen,
> eBKP, Lehrhefte, Vorlesungen) — jede fachliche Aussage trägt ihre Datei als
> Klammer-Fussnote. Kein Internet verwendet.

---

## 1. Was gehört in Schweizer Submissionspläne (SIA-Phase 41)?

### 1.1 Die Phase im Normgefüge

SIA 102:2020 definiert die Teilphase **4.41 «Ausschreibung, Offertvergleich,
Vergabeantrag»**: Grundlage sind «Bauprojekt und Detailstudien», Ziel ist
«Vergabereife erreicht». Grundleistungen des Architekten sind u.a.
[`wissen/vault/normen/102-2020.md`, Ziff. 4.41, OCR-S. 25–26]:

- **Ausschreibungspläne**: «Ausarbeiten von Werk- und Detailplänen in
  geeignetem Massstab, soweit sie für die Ausschreibungen notwendig sind»,
  abgestimmt «mit den Ausschreibungsplänen und -unterlagen der weiteren
  Planer».
- «Überprüfen der Materialwahl und Konstruktionen, auch mit Fachplanern,
  Unternehmern und Lieferanten» und «Erstellen eines detaillierten
  Beschriebes von Materialien und Konstruktionen, soweit er für die
  Ausschreibungen notwendig ist» (Baubeschrieb/Devis-Grundlage).
- «Aufstellen der Pflichtenhefte mit den Preiseingabeformularen …,
  Gliederung der Ausschreibungsunterlagen gemäss dem Kostenvoranschlag».
- Danach: materielle und rechnerische Kontrolle der Angebote, Vergleich nach
  «Qualitäten und Quantitäten, Einheitspreisen und Rabatten», Bereinigung,
  Vergabeantrag, revidierte Kostenermittlung.

Die Lehrmittel-Sicht deckt sich: «Aufgrund der Werkpläne erfolgt die
Devisierung und Ausschreibung, um von verschiedenen Unternehmungen Offerten
[einzuholen] … Die einzelnen Angebote werden analysiert und in einem
Offertvergleich zusammengestellt» [`wissen/vault/Ein-Haus-entsteht.md`,
Abschnitt «Devisierung und Ausschreibung»].

### 1.2 Planinhalte und Detaillierungsgrad

Die Planfolge nach SIA 400 ordnet der Ausschreibung die Stufe
**«Detailstudienpläne»** zu: «Unterlagen für die Arbeitsausschreibungen und
die technische Koordination» — zwischen Bauprojektplänen (Kostenvoranschlag)
und den provisorischen/definitiven Ausführungsplänen
[`wissen/vault/normen/400-Planbearbeitung-im-Hochbau.md`, Planfolge-Tabelle].
Massstäbe und Inhalte (Massstabsleiter, Werkplan-Bemassung, Sinnbilder) sind
im Repo bereits Regel für Regel gegen SIA 400/SIA 102 abgeglichen —
`docs/PLAN-DETAILLIERUNG.md` ist die verbindliche Referenz; hier nur die
submissionsrelevante Essenz:

1. **Werkplan-Niveau 1:50** als Kern des Ausschreibungs-Plansatzes
   (Grundrisse, Schnitte, Ansichten), ergänzt um **konstruktive Detailpläne
   1:20 … 1:5** «für die Darstellung von Bauteilen und Konstruktionen im
   einzelnen … vorwiegend Vertikalschnitte» und **Detailpläne für Ausbau und
   Einrichtung** (Sanitärräume, Küchen) [`…/400-Planbearbeitung-im-Hochbau.md`,
   Ziff. C.4.1.2/C.4.1.3].
2. **Materialisierung eindeutig**: im Werkplan «werden die Materialien durch
   die entsprechenden Sinnbilder gekennzeichnet»; Bauteilaufbauten
   (Schichten, Dicken) müssen benannt sein — die Poché-/Sinnbild-Stufen je
   Phase sind in `docs/PLAN-DETAILLIERUNG.md` belegt.
3. **Masse und Koten**: bis zu vier Aussen-Masslinien in fester Ordnung,
   Innenmasse, Mauerdicken; Höhenkoten im Werkplan **roh und fertig**
   getrennt [ebd., SIA 400 Ziff. C.3.2.1]. Die Pläne des Bauingenieurs
   enthalten «Rohmasse und -koten der Tragkonstruktion» [ebd., Ziff. C.5.2].
4. **Toleranzen**: SIA 414/1 kennt «normale» und «erhöhte
   Genauigkeitsstufe»; SIA 414/2 liefert die Toleranzwerte der normalen
   Stufe — «Wird eine ‹erhöhte Genauigkeitsstufe› verlangt, … ist diese in
   den Ausschreibungsunterlagen bzw. in den Verträgen zu definieren»
   [`wissen/vault/normen/414-2-2016-Masstoleranzen-im-Hochbau.md`, Einleitung;
   Begriffe in `…/414-1-2016-Masstoleranzen-im-Bauwesen.md`]. Heisst für die
   Submission: wo der Architekt schweigt, gilt «normal» — erhöhte
   Anforderungen (Sichtbeton, Ebenheit für Beläge) MÜSSEN in die Unterlagen.

### 1.3 Devisierung: eBKP, NPK, Leistungsverzeichnis

- **eBKP-H (SN 506 511)** gliedert die Baukosten elementweise (A Grundstück,
  B Vorbereitung, C Konstruktion, D Technik, E Äussere Wandbekleidung,
  F Bedachung, G Ausbau, H Nutzungsspezifische Anlage, I Umgebung,
  J Ausstattung, V Planungskosten, W Nebenkosten)
  [`wissen/vault/normen/eBKP-H.md`, Übersicht 1./2. Ebene;
  Norm-Volltext `wissen/vault/normen/eBKP-SN506-511-Baukostenplan-Hochbau_2009.md`].
  Elementarten- und Objektkarten verknüpfen Element ↔ NPK-Positionstexte,
  z.B. Element G 1.4 Innentür mit vollem NPK-Beschrieb («Bauschalldämmass
  R'w+C ca. dB 35 … Eingiesszarge aus korrosionsgeschütztem Stahlblech …
  DMBxDMH mm 900x2'000») [`wissen/vault/vorlesungen/05_Kosten.md`,
  eBKP-H-Beispielkarten] — genau der Präzisionsgrad, den eine saubere
  Offerte braucht.
- **Leistungsverzeichnis nach SIA 118**: «Ein Leistungsverzeichnis ist
  vorzusehen für Einheitspreisverträge. Es führt die Leistungen auf …» und
  «Im Leistungsverzeichnis ist die zu jeder Leistung gehörende Menge
  aufgeführt, wie sie der Bauherr [ermittelt]» — die Mengenverantwortung
  (Vorausmass) liegt beim Ausschreibenden. Separate Positionen für
  Baustelleneinrichtung sind vorzusehen; der Unternehmer nimmt im LV «weder
  Ergänzungen noch Änderungen vor»
  [`wissen/vault/normen/118_2013-Allgemeine-Bedingungen-fuer-Bauarbeiten.md`,
  Art. 8, 9, Ausmassregeln].
- **NPK als Positionssprache**: Leistungsverzeichnisse sind nach den
  «Positionen des Normpositionen-Katalogs (NPK) der Schweizer Bauwirtschaft»
  aufzubauen; Angebotsformulare, Losaufteilung, Regiepositionen und
  eco-devis-Kennzeichnung regelt die Submissions-Wegleitung
  [`wissen/vault/normen/Wegleitung-ber-das-Submissions-und-Zahlungswesen-mit-Musterbeispielen.md`].
  Öffentliche Vergaben unterliegen zusätzlich der Submissionsverordnung
  [`wissen/vault/normen/Submissionsverordnung.md`; IVöB-Beitritt ZH in
  `wissen/vault/normen/Gesetz-ber-den-Beitritt-des-ZH-zur-IVoeB.md`].
  Für die Devis-Qualitätskontrolle existiert eine eigene Checkliste
  [`wissen/vault/normen/3.14.C-Checkliste-Deviskontrolle.md`, ökologische
  Submissionsbedingungen in `…/3.11.R-Allg-bauoekol-Submissionsbed.md`].

### 1.4 Der Owner-Grundsatz, normativ unterlegt

Der Satz «jedes undefinierte Element = spätere Nachtragskosten» ist keine
Meinung, sondern SIA-118-Mechanik: «Erfordert die Bestellungsänderung eine
Leistung, für die das Leistungsverzeichnis **keinen Einheitspreis mit
zutreffender Beschreibung** enthält, … so wird … ein **Nachtragspreis** dem
Leistungsverzeichnis angefügt» [`…/118_2013-…md`, Art. 86–89; Mehr-/
Mindermengen Art. 86]. Jede Lücke im Plan oder LV wird nach Vergabe zum
Nachtragspreis — zu Konditionen, die der Architekt dann nicht mehr im
Wettbewerb hat. Daraus folgt die operative Definition von
**Submissionsreife je Bauteil**:

| Kriterium | Quelle |
|---|---|
| Material/Aufbau (Schichten + Dicken) benannt | SIA 400 C.3.1.1, `docs/PLAN-DETAILLIERUNG.md` |
| Masse + Koten roh/fertig vollständig | SIA 400 C.3.2.1 |
| Toleranz-/Genauigkeitsstufe festgelegt (erhöht → explizit) | SIA 414/2, Einleitung |
| eBKP-Element zugeordnet | eBKP-H |
| Menge/Vorausmass vorhanden (NPK-Ausmassregeln) | SIA 118 Art. 8; `derive/ausmass.ts` |
| Anschlüsse/Details gezeichnet (1:20/1:5), wo unüblich | SIA 400 C.4.1.2 |

Diese Tabelle ist die Spezifikation für Kosmos «Lückenliste» (C1, unten).

---

## 2. Was liefern Unternehmer und Fachplaner zurück?

1. **Werkstatt-/Montagepläne der Unternehmer**: «Die Werkstattpläne von
   vorgefertigten Bauteilen werden in der Regel durch den ausführenden
   Unternehmer gezeichnet» — auf Grundlage der Werk- und Detailpläne des
   Architekten; Schalungspläne des Ingenieurs «werden vor der Freigabe für
   die Ausführung durch den Architekten auf Massrichtigkeit geprüft»
   [`…/400-Planbearbeitung-im-Hochbau.md`, Ziff. C.5]. Typisch: Fenster-/
   Metallbau-, Holzbau-, Treppen-, Küchen-Werkpläne aus den eigenen
   Planungsabteilungen der Unternehmer. Formate heute: 2D-DWG/DXF, sehr oft
   nur PDF.
2. **Fachplaner-Pläne (HLKSE)**: die Gebäudetechnik-Planfolge läuft parallel
   — Ausschreibungspläne als «Grundlage für den Architekten für die
   Ausführungsplanung / Koordination der Materialien, Apparate und
   technischen Systeme», dann definitive Ausführungspläne, «welche … die
   Aussparungen und die Montage» darstellen; Beteiligte ausdrücklich inkl.
   Unternehmer [ebd., Planfolge Gebäudetechnik]. SIA 400 gilt dabei nur für
   Pläne «die zwischen verschiedenen Beteiligten ausgetauscht werden» —
   «firmeninterne Pläne (z.B. … Fabrikationspläne des Unternehmers) werden
   davon nicht betroffen» [ebd., Ziff. 1.3] — d.h. Layerdisziplin und
   Darstellung der zurückkommenden Pläne sind NICHT garantiert.
3. **Was davon zurück in die Architektenpläne muss** (Prüf- und
   Nachführpflicht des Architekten, nie automatische Übernahme):
   - **Aussparungen/Durchbrüche** aus HLKSE-Koordination (im Modell:
     `design.aussparungSetzen` existiert),
   - **geänderte Abmessungen/Achsen** vorgefertigter Teile (Elementstösse,
     Auflager, Einbauteile),
   - **präzisierte Anschlussdetails** (Fenster-Leibungen, Abdichtungshöhen
     — vgl. SIA 271/118-271 [`wissen/vault/normen/118_271_-2021_…md`]),
   - **Produkt-/Typenfestlegungen**, die Listen (Türen/Fenster) und
     Beschrieb betreffen.
   - NICHT zurück muss: unternehmerinterne Fertigungslogik (Stücklisten,
     Bewehrungsführung) — die bleibt Werkstattplan-Welt.

**Ehrlich:** Der Rücklauf ist heterogen — saubere DXF-Layerwelten sind die
Ausnahme, PDF der Normalfall. Ein Konzept, das nur den sauberen Fall kann,
wäre Politur; Abschnitt 3 trennt deshalb hart zwischen exaktem Pfad (DXF)
und Assistenz-Pfad (PDF).

---

## 3. Kosmo-Automatisierung: die technische Kette

Zielbild (Owner): Plansatz des Unternehmers in KosmoOrbit ziehen → Kosmo
analysiert, versteht die Änderungen, pflegt sie in den Projektstand ein.
Architektur-Realität: alles läuft über die existierenden Wege — `derivePlan`
(`packages/kosmo-kernel/src/derive/plan.ts`, `PlanGraphic` = Regionen/Linien/
Bögen/Achsen/Texte in Welt-mm), DXF-Export R12
(`packages/kosmo-kernel/src/dxf/export.ts`), IFC-Import mit
Bauteil-Erkennung (`apps/kosmo-orbit/src/modules/design/ifc-import.ts` +
`packages/kosmo-kernel/src/derive/bestand.ts`), und Kosmo-Vorschläge als
Diff-Karten durch `runCommand` (Dry-Run «nur validieren + Patches berechnen»
existiert in `packages/kosmo-kernel/src/commands/core.ts`).

### Entscheide

- **C-E1 — DXF-Import als reiner Kernel-Parser** (`packages/kosmo-kernel/src/dxf/import.ts`):
  Gegenstück zum Export, gleiche Datei-Nachbarschaft. Ein
  Gruppencode-Tokenizer (Code/Wert-Zeilenpaare) liest das R12-Subset,
  das der eigene Export schreibt, plus die üblichen CAD-Erweiterungen
  tolerant: `LINE`, `POLYLINE/VERTEX/SEQEND`, `ARC`, `TEXT`, zusätzlich
  `LWPOLYLINE` (R2000-Praxis) und `INSERT` nur als ehrlich gemeldetes
  «Block nicht aufgelöst»-Vorkommnis (kein stilles Verwerfen). Ergebnis ist
  ein `DxfGraphic`, strukturell ein `PlanGraphic`-Spiegel: `regions` (aus
  geschlossenen Polylinien), `lines`, `arcs`, `texte` — je mit `layer`
  statt `classes`, Welt-mm, y zurückgespiegelt (`weltY = -dxfY`, exakte
  Umkehr des Exports). Reine Funktion, kein DOM, kein Doc-Zugriff.
  **Abnahmekern: Roundtrip-Test** `planGraphicToDxf → parseDxf` ist
  geometrisch identisch (Toleranz 1/1000 mm = Export-Rundung).
- **C-E2 — Layer→Semantik-Mapping als Daten, nicht Code:** die eigene
  `LAYER_REGELN`-Tabelle des Exports wird invertiert (TRAGEND→tragend,
  FENSTER→fenster …); fremde Layernamen laufen über eine erweiterbare
  Heuristik-Tabelle (z.B. `A-WALL`, `MAUERWERK`, `200_…`) mit ehrlichem
  Rest: Unbekannte Layer bleiben «unklassiert» und werden im Import-Bericht
  gelistet — nie geraten und verschwiegen.
- **C-E3 — Diff-Engine als pure Ableitung** (`derive/planabgleich.ts`):
  Eingabe sind zwei Geometriemengen — Architektenseite `derivePlan(doc,
  storeyId)`, Unternehmerseite `DxfGraphic` — normalisiert auf
  Segment-/Bogen-Mengen je Klasse. Matching geometrisch mit Toleranzband
  (Segment-Distanz/Überdeckung; Rotations-/Offset-Ausrichtung über die
  Achsen bzw. best-fit, wenn der Unternehmer einen anderen Nullpunkt hat).
  Befundklassen: `unveraendert` · `verschoben` (Segment mit kleiner
  Translation) · `neu` (nur im Unternehmerplan) · `entfernt` (nur im
  Architektenplan) · `text-geaendert` (gleicher Ort, anderer Inhalt). Jeder
  Befund trägt Konfidenz + Herkunft (Layer, Segmentliste).
- **C-E4 — Vom Befund zur Diff-Karte, zweistufig ehrlich:**
  - **Stufe 1 (automatisch erkennbar → Command-Vorschlag):** nur Befunde,
    die sich sicher auf ein Modell-Bauteil abbilden lassen, werden zu
    Commands: parallele Linienpaare → Wand (2D-Analogon zu `erkenneWand`
    aus `derive/bestand.ts`) → `design.wandZeichnen`/`design.verschieben`;
    Rechteck-Ausschnitt in Wand/Decke → `design.aussparungSetzen`;
    Öffnungssymbole → `design.oeffnungSetzen`. Jeder Vorschlag läuft als
    Diff-Karte durch den bestehenden Dry-Run von `runCommand`
    (Patch-Vorschau) und beim Bestätigen durch **denselben** `runCommand`
    — atomare Undo-Gruppe, Yjs-sync, Journal. **NIE stilles Überschreiben;
    das Modell ändert sich ausschliesslich über bestätigte Karten.**
  - **Stufe 2 (erkennbar, aber nicht sicher abbildbar → Markierungs-Karte):**
    alles andere (freie Geometrie, unklare Layer, Detailgewirr) wird NICHT
    in Commands gepresst, sondern als **Abweichungs-Marker** auf einem
    Overlay gezeigt («hier weicht der Unternehmerplan ab»), mit Zoom auf
    die Stelle. Der Architekt entscheidet und zeichnet selbst — Kosmo hat
    die Stelle gefunden, nicht die Antwort erfunden.
- **C-E5 — Unternehmerplan als Referenz-Overlay im Plan:** analog zum
  IFC-Kontext-Layer im 3D (grau, nicht wählbar) bekommt die Planansicht
  einen 2D-Referenz-Layer, der das `DxfGraphic` halbtransparent unter/über
  den Architektenplan legt (Laufzeit-Store, NICHT im Doc — Regel
  «Laufzeit ≠ Modell», wie `vis-runtime.ts`). Damit ist auch der
  Nicht-Automatik-Fall sofort nützlich: durchpausen statt blind glauben.
- **C-E6 — PDF-Pläne sind ein Assistenz-Pfad, kein Import:** Ein PDF (auch
  ein Vektor-PDF) trägt weder Bauteil-Identität noch verlässliche Skala.
  Der Pfad: Kosmo-Vision (Cloud-Opus oder HomeStation-Modell, je
  Betriebsart) liest die Planseite(n) und liefert **strukturierte
  Änderungshypothesen** («Durchbruch ca. 400×400 bei Achse B/2,
  UK +2.43»), jede als Diff-Karte der Stufe 2 mit dem Bildausschnitt als
  Beleg. **Ehrlich, im UI benannt:** das ist eine LLM-Lesung — Vorschlag
  mit Fehlermöglichkeit, kein exakter Geometrie-Import; Masse aus PDF sind
  vom Architekten nachzuprüfen. Ohne erreichbaren Provider zeigt der Pfad
  den ehrlichen Hinweis statt einer Attrappe (Betriebsarten-Regel).
- **C-E7 — DWG bleibt draussen (v1.6):** binäres DWG ist proprietär; ohne
  Fremdbibliothek/Konverter (ODA) nicht seriös lesbar. Das UI sagt beim
  DWG-Drop ehrlich: «Bitte als DXF exportieren (jedes CAD kann das) —
  DWG-Direktimport steht auf der Interop-Liste (Block G)». Kein
  Halbparser.
- **C-E8 — Submissionsreife-Check als pure Ableitung**
  (`derive/submissionsreife.ts`): wendet die Kriterien-Tabelle aus 1.4 auf
  das Doc an (Aufbau vorhanden? Material je Schicht? eBKP-Zuordnung?
  Toleranzangabe? Menge ableitbar?) und liefert die **Lückenliste je
  Bauteil** mit Schwere — gleiche Machart wie `derive/checks.ts`
  («Richtwerte, kein Normersatz»). Mengen-Grundlage sind `derive/mengen.ts`
  und das NPK-nahe `derive/ausmass.ts` (Öffnungsabzug erst > 0.5 m²,
  Leibungen als Position — dort bereits implementiert und ehrlich als
  «NPK-nah, kein CRB-Devis» markiert).

### E2E-Simulation «Submissions-Testlauf» (Playwright-Skizze)

Neues Spec `e2e/sim-submission.spec.ts` auf dem Serie-H-Harness. Aus
`e2e/sim/bausteine.ts` sind direkt wiederverwendbar: `projektStarten`,
`parzelleSetzen`, `waendeZeichnen`, `dachSetzen`, `geschosseStapeln`,
`phaseSchalten` (auf `werkplan` — `design.phaseSetzen` existiert),
`checksLesen`, `berechnungslistePruefen`, `kosmoFragen`,
`blattPublizieren`, `exportPruefen('export-dxf', …)`. Neu (append-only,
Bausteine-API ist ab H2 eingefroren — nur ANHÄNGEN):
`submissionsreifePruefen` (Lückenliste lesen + Erwartung),
`unternehmerplanImportieren` (DXF-Fixture per Drop/Command laden),
`diffKartenPruefen`/`diffKarteAnwenden` (Karte bestätigen → Doc-Assert über
`__kosmo.state()` mit `expect.poll`, Regel R3).

Ablauf-Skizze:

```
1  projektStarten + waendeZeichnen + dachSetzen        (Bestand aufbauen)
2  phaseSchalten('werkplan')                            (Submissionsniveau)
3  submissionsreifePruefen → erwartete Lücken           (undef. Aufbau = Befund)
4  Lücken schliessen (design.aufbauErstellen, …)        → Liste wird leer
5  exportPruefen('export-dxf') → DXF-Datei sichern      (Submissions-Plansatz)
6  Fixture: dieses DXF programmatisch mutieren          (Wand +50 mm verschoben,
   (reiner String-Edit im Test, deterministisch)         neue Aussparung 400×400)
7  unternehmerplanImportieren(fixture)                  → Overlay sichtbar
8  diffKartenPruefen: 1× verschoben, 1× neu,            (Stufe 1) + 0 falsche
9  diffKarteAnwenden(aussparung) → Doc enthält          Aussparung; Undo macht
   sie atomar rückgängig
10 Bericht: unklassierte Layer/INSERT-Meldungen leer    (Ehrlichkeits-Assert)
```

Das Fixture entsteht aus dem eigenen Export (Schritt 5/6) — kein externes
Binärmaterial, byte-deterministisch, läuft im Container ohne Bridge. Der
PDF-Assistenz-Pfad wird im E2E nur als UI-Ehrlichkeit getestet (Hinweis
sichtbar, kein Fake-Ergebnis), die echte Vision-Lesung ist
Cloud-/HomeStation-Abnahme.

**Ehrlich (Grenzen der Kette):**
- DXF transportiert Geometrie, keine Bauteil-Identität — der Diff ist
  geometrisch, nicht semantisch. Was Stufe 1 sicher erkennt (verschobene
  Wandpaare, rechteckige Aussparungen, Öffnungen auf bekannten Layern), ist
  ein kleiner, dafür verlässlicher Teil; der Rest ist Stufe-2-Markierung.
  Diese Quote steht im Import-Bericht («n von m Abweichungen als Vorschlag,
  Rest markiert»), nicht im Marketing.
- Ein Unternehmerplan mit eigenem Nullpunkt/Rotation braucht die
  Ausrichtungs-Schätzung; scheitert sie, sagt der Bericht das und bietet
  manuelles Einpassen (2 Referenzpunkte) an.
- «Vollautomatisch einpflegen» heisst in v1.6: vollautomatisch **analysieren
  und vorschlagen** — einpflegen tut der Architekt per Karte (SIA-Rollen:
  Prüf-/Freigabepflicht liegt beim Planer, s. Abschnitt 2). Das ist kein
  Rückzieher, sondern Bauverantwortung.

---

## 4. Batch-Plan C1…C6

Modellgebrauch nach `docs/KI-MODELL-GUIDELINE.md`: Opus orchestriert zentral
und integriert; Sonnet baut abgegrenzte, rein testbare Pakete im Worktree.
Golden-Tests (`packages/kosmo-kernel/test/golden/*.svg`) bleiben
byte-stabil: alle neuen Pfade sind additiv und daten-geguardet — ohne
Unternehmerplan im Laufzeit-Store und ohne neue Bauteil-Eigenschaften ändert
sich KEINE bestehende Ableitung.

| Batch | Scope | Wer | Abnahme | Ehrliche Grenze |
|---|---|---|---|---|
| **C1** | `derive/submissionsreife.ts` (Lückenliste je Bauteil nach Tabelle 1.4) + UI-Liste in KosmoDraw + Kosmo-Antwortpfad («was fehlt für die Submission?») | Sonnet Worktree (rein + UI-Liste), Opus-Gate | Unit-Tests je Kriterium; Projekt ohne Aufbauten → Befunde, vollständig definiert → leer; Goldens unverändert (`npm test` byte-gleich) | Richtwerte-Check, kein Normersatz; prüft Modell­daten, nicht Blatt-Vollständigkeit |
| **C2** | DXF-Import-Parser `dxf/import.ts` (C-E1) + Layer-Mapping (C-E2), reine Kernel-Funktionen | Sonnet Worktree | Roundtrip-Test Export→Import geometrisch identisch (±0.001 mm); Fremd-Fixtures (LWPOLYLINE, unbekannte Layer) → korrekte Berichte; kein App-Code berührt | R12/R2000-ASCII-Subset; INSERT/Blöcke nur gemeldet, nicht aufgelöst; DWG explizit nicht |
| **C3** | Diff-Engine `derive/planabgleich.ts` (C-E3) + Referenz-Overlay in der Planansicht (C-E5, Laufzeit-Store) | Sonnet Worktree | Unit: synthetische Paare (verschoben/neu/entfernt/Text) korrekt klassiert inkl. Nullpunkt-Offset; Overlay-Spec: Laden/Ausblenden, Doc bleibt unberührt (Undo-Stack leer) | rein geometrisch, Konfidenz ausgewiesen; Ausrichtung best-effort mit manuellem Fallback |
| **C4** | Befund→Diff-Karten (C-E4): Command-Mapping Stufe 1, Markierungs-Karten Stufe 2, Anwenden über `runCommand` (Dry-Run-Vorschau, atomare Undo-Gruppe), Import-Bericht | **Opus zentral** (berührt runCommand-Weg, Kosmo-Panel, State) | E2E-Kern: Karte anwenden → Doc-Delta exakt, Undo atomar; nie eine Doc-Änderung ohne Karte (Assert auf Journal); Bericht zählt Vorschlag vs. Markierung | Stufe-1-Abdeckung klein und verlässlich; alles Unsichere ist sichtbar Stufe 2 |
| **C5** | PDF-Assistenz-Pfad (C-E6): Drop-Ziel, Vision-Anfrage je Betriebsart, Hypothesen als Stufe-2-Karten mit Bildbeleg, ehrlicher Offline-Hinweis | **Opus zentral** (KI-/Betriebsarten-Pfad) | E2E ohne Provider: ehrlicher Hinweis statt Attrappe; mit Mock-Provider: Karte trägt Beleg-Ausschnitt + «LLM-Lesung»-Etikett | Vorschlag, kein Import; Masse ungeprüft = im UI so beschriftet; echte Qualität ist Cloud/HomeStation-Abnahme |
| **C6** | E2E `sim-submission.spec.ts` (Ablauf oben) + neue Bausteine (append-only) + ROADMAP-Eintrag + Handbuch-Abschnitt | Sonnet Worktree (Spec), Opus-Gate (volle Suiten) | Voller Sim-Lauf grün im Container (ohne Bridge); volle Kernel-/App-/E2E-Suiten grün; Goldens byte-identisch | Speak/Vision-Anteile bleiben simuliert markiert (Serie-H-Regel) |

Reihenfolge C1 → C2 → C3 → C4 → C6, C5 parallel zu C6 (unabhängiger Pfad).
C1 zuerst, weil es die Submissions-SIMULATION (C-1 im V1.6-Plan) sofort
trägt und ohne Import-Kette Wert liefert; C2–C4 sind das Herzstück
(Unternehmer-Rücklauf); C6 versiegelt beides als Testlauf. Jeder Batch:
Feature → Tests → ROADMAP-Eintrag → deutscher Commit → Push auf den
Entwicklungs-Branch (Owner-Mandat).

---

## 5. Ehrlichkeits-Zusammenfassung

1. **Kein CRB-Devis:** NPK-Positionstexte und ONLV-Austausch sind
   lizenzpflichtig (CRB). KosmoOrbit bleibt «NPK-nah» (`derive/ausmass.ts`
   sagt das heute schon wörtlich); ein echtes Devis-Modul ist ein
   Owner-Entscheid (Lizenz), kein Batch.
2. **DXF scharf, DWG ehrlich vertagt, PDF Assistenz:** die drei Pfade sind
   im UI unterschiedlich beschriftet — exakter Import / Konverter-Hinweis /
   LLM-Vorschlag mit Beleg.
3. **Nie stilles Einpflegen:** jede Modelländerung aus Unternehmermaterial
   ist eine bestätigte Diff-Karte über `runCommand` (Undo, Journal, Sync).
   Die Prüfpflicht des Architekten (SIA 400, Freigabe-Logik) ist Feature,
   nicht Bremsklotz.
4. **Goldens bleiben byte-stabil:** Overlay und Diff leben in
   Laufzeit-Stores; Ableitungen ändern sich nur, wo neue Daten im Doc sind.
5. **Die Simulation misst die Quote:** der Submissions-Testlauf weist aus,
   wie viel automatisch erkannt vs. markiert wurde — diese Zahl ist der
   ehrliche Fortschrittsmesser für die «vollautomatische» Vision des Owners.
