# Finch-Konzept — Grundrissgenerator-Gleichwertigkeit: Ist-Stand, Tiefenrecherche, Bau-Plan

> Owner-Auftrag (V0.6.2, wörtlich): «Wir nehmen die Funktionen von Finch
> auseinander: Finch ist ja eigentlich ein Grundrissgenerator. Was müssen wir
> recherchieren, um das Tool gleichwertig zu haben? Wie tiefgründig müssen wir
> graben und reverse engineeren? Grundkonzept finden, dann Konzept aufbauen,
> was und wie wir es machen.» Stand 08.07.2026. Dieses Dokument **baut auf**
> `docs/RE-FINCH.md` (Stand 03.07.2026) auf und wiederholt dessen Inhalt
> bewusst nicht — es prüft, was seither am Code passiert ist, schärft das
> Grundkonzept mit zusätzlichen Erstquellen und zieht die ehrliche Grenze
> zwischen «schon gebaut» und «wirklich noch offen».
>
> **Was «Reverse Engineering» hier bedeutet** (wie in RE-FINCH.md selbst
> festgehalten, hier nochmals verbindlich wiederholt, weil der Owner-Wortlaut
> den Begriff nennt): **kein** Zugriff auf Finchs Quellcode oder Binärdateien,
> **kein** Login-Bereich, **keine** Disassemblierung — ausschliesslich
> Funktions- und Konzept-Analyse aus öffentlichem Material (Herstellerseite,
> öffentliche GitBook-Doku, Fachpresse, Marketing-Zitate der Gründerinnen).
> Wo die Doku keine Algorithmus-Interna preisgibt, bleibt das explizit eine
> **Hypothese**, nie eine Tatsachenbehauptung.
>
> Quellenkürzel wie in RE-FINCH.md: **[W]** finch3d.com · **[D]**
> docs.finch3d.com (heute erneut per `curl` über den Session-Proxy als
> `.md` abgerufen, WebFetch lieferte weiterhin 403 auf `docs.finch3d.com`
> und `medium.com` — dieselbe Beobachtung wie im Vorgänger-Dossier) ·
> **[AEC]** AEC Magazine · **[G2P]/[HG]/[WP]** akademische Fachartikel
> (Abschnitt 3). Vollverzeichnis in Abschnitt 6.

---

## 1 · Was seit RE-FINCH.md bereits gebaut wurde

Der wichtigste Befund dieser Recherche: **der Bau-Blockplan aus
RE-FINCH.md Abschnitt 7 (F1–F10) ist bereits vollständig umgesetzt** —
grösstenteils noch am selben Tag (`ROADMAP.md` Einträge 49–66, alle
✅ 03.07.2026), ergänzt um einen Grundriss-Generator und die
Wände-aus-Zonen-Pipeline (Einträge 69, 72, 77) sowie die
Wettbewerbs-Grundlagenstudie D1–D6 (`docs/WETTBEWERB-KONZEPT.md`,
Einträge 213–219). Wer dieses Dokument als «was fehlt uns noch zu Finch»
liest, muss deshalb bei einem **deutlich höheren Ist-Stand** ansetzen, als
RE-FINCH.md Abschnitt 6 suggeriert:

| RE-FINCH-Block | Umsetzung | Beleg |
|---|---|---|
| F1 Raumgraph | `derive/raumgraph.ts` — `raumGraph()`: Knoten=Zonen, Kanten=Türen+offene Übergänge | ROADMAP 49 |
| F2 Egress-Check | `fluchtwege()`/`fluchtwegeGebaeude()` — Dijkstra über Portale, VKF-Richtwerte 28/35 m | ROADMAP 49, `raumgraph.ts:179–312` |
| F3 Regel-Sätze | `DocSettings.raumRegeln` + `model/regelpresets.ts` (`ch-wohnbau`/`wettbewerb`) + `design.regelnSetzen` | ROADMAP 52, `commands/design.ts:1843–1866` |
| F4 Varianten-Matrix | `derive/variantenmatrix.ts` — Parallel-Axis über Extremvolumen | ROADMAP 53 |
| F5 Segmentierer | `derive/segmentierer.ts` — Korridor-Bänder, Bedarfs-Greedy, Opfer-Fläche | ROADMAP 54 |
| F6 Slider-Dialog | Min-Breite/Wohnungsgrösse-Slider, sofortige Neuberechnung | ROADMAP 55 |
| F7 Adaptive Vorlagen | `DocSettings.vorlagen` + `design.vorlageSpeichern`/`vorlageSetzen` | ROADMAP 66 |
| F8 Möblierung/SIA 500 | `derive/moebel.ts` — `MOEBEL_KATALOG` (8 Typen) + `pruefeBewegungsflaechen` | ROADMAP 62 |
| F9 Custom-Kennzahlen | `DocSettings.kennzahlFormeln` + `kennzahlenAuswerten` | ROADMAP 58 |
| F10 Raumtyp-Copilot | `derive/raumtypcopilot.ts` — Heuristik mit Begründung | ROADMAP 59 |
| *(neu, nicht im RE-FINCH-Plan)* Grundriss-Generator | `derive/grundrissgenerator.ts` — CH-Rezept füllt Zimmer + Möblierung | ROADMAP 69 |
| *(neu)* Wände aus Zonen | `derive/zonenwaende.ts` — atomare Intervalle, Innen/Aussen/Trennwand | ROADMAP 77 |
| *(neu, Wettbewerb-Konzept D-Serie)* Zonenregel→Studie, Besonnung, Programm-Erfüllung, Kosmo-Tool, Bericht | `derive/besonnungsvergleich.ts`, `programmerfuellung.ts`, `studienbericht.ts`, `commands/grundlagen.ts` | ROADMAP 213–219 |

**Konsequenz für dieses Dokument:** Die eigentliche Owner-Frage — «wie
tiefgründig müssen wir graben?» — beantwortet sich damit zur Hälfte von
selbst: **das Finch-Dossier selbst ist praktisch ausgeschöpft.** Ein
zweiter Durchgang durch `docs.finch3d.com` (Abschnitt 3 unten) bestätigt
RE-FINCH.md fast wörtlich, ohne neue Fakten seit 03.07. Die verbleibende
Recherche-Tiefe liegt **nicht** in noch mehr Finch-Lektüre, sondern darin,
wie weit unser bereits gebauter Kern von Finchs tatsächlichem
**Produkterlebnis** entfernt ist — das ist eine Frage an unseren eigenen
Code, nicht an Finchs Webseite (Abschnitt 4).

---

## 2 · Grundkonzept — geschärft mit Erstquellen

RE-FINCH.md Abschnitt 3.1 formuliert bereits die These: Finch ist ein
**parametrisch-regelbasierter Echtzeit-Generator mit adaptiven
Grundriss-Vorlagen, die auf Geometrieänderung reagieren, plus
Regel-Feedback**. Drei frisch abgerufene Erstquellen — die RE-FINCH.md
noch nicht wörtlich zitiert — schärfen das zu vier Säulen:

**Säule 1 — Der Graph ist immer da, nie vom Nutzer gebaut.** Bestätigt
durch einen neuen Fund: Pamela Nunez Wallgrens eigener Blogpost
*„Introducing Finch Graph Rules"* [Medium, finch3d-Publikation] beschreibt
Regeln als reinen Nutzer-Input («down to the user»), während «the
optimization algorithms take graph rules into account to generate detailed
floor plans with high precision» — der Graph selbst bleibt Infrastruktur,
nicht Bedienoberfläche. Deckt sich exakt mit dem AEC-Zitat aus RE-FINCH.md
§3.1.

**Säule 2 — Harte Non-negotiables vor weicher, gewichteter Bewertung.**
Finchs eigene Erklärseite `docs.finch3d.com/docs/projects-and-variants/
story-editor/algorithm-theory` [D] (heute erneut abgerufen, Wortlaut
identisch zum RE-FINCH-Zitat) liefert das Rechenbeispiel wörtlich: bei
Gewichtung «Unit Size ×3» schlägt Score 19 (4×3 + 4 + 3) den
gleichgewichteten Score 13 (3+6+4) — «moving all weights to the highest
priority is the same as having them all at the lowest». Das bestätigt die
RE-FINCH-Hypothese einer klassischen additiv-gewichteten
Metaheuristik-Suche, **nicht** eines trainierten Modells, für die
Kernalgorithmen (Custom-Core, Blank-Slate-Buckets).

**Säule 3 — Die Adaptive Plan Library trägt ihre eigene Verformungsregel,
und «gleichwertig» heisst hier zwei getrennte Ergebnis-Ränge.** Neu
abgerufen: `docs.finch3d.com/docs/projects-and-variants/unit-editor/
enterprise-generate-unit-plan` [D] beschreibt exakt zwei Resultat-Sätze
nebeneinander — **„Your Firm's Plans"** (Bibliotheks-Pläne, per Algorithmus
in die neue Wohnungsform gestreckt) und **„Finch Generated Plans"** («AI
generates unique plans based on your adaptive plan library's design style
and rules» — nur wenn kein Bibliotheksplan passt). Das ist eine explizite
Zweiteilung: **deterministisches Stretch-Matching zuerst, lernendes Modell
als Lückenfüller danach.** `docs.finch3d.com/docs/projects-and-variants/
unit-editor/adaptive-plan-library` [D] bestätigt zusätzlich zwei bisher in
RE-FINCH.md nicht wörtlich belegte Bediendetails: `stretch preview
(shift+s)` und `constraints (shift+c)` als eigene Tastaturkürzel — Stretch
und Constraint-Editing sind zwei getrennte, gleichrangige Modi, keine
Nebenfunktion.

**Säule 4 — Regel-Feedback lebt IM Plan, nicht daneben.** Der
`new-features`-Änderungsverlauf [D, `readme/new-features.md`] listet
„Control daylight admission in facade" (Toggle direkt auf der
Fassadenlinie, sonnensymbol-gestützt) und „Updated Scoring […] Gain
insights into daylight performance metrics, compliance with key
regulations" als Enterprise-Feature — beides bestätigt: Kennzahl und Regel
erscheinen am Bauteil selbst, nie nur in einer separaten Tabelle.

**Ehrliche Einordnung ins akademische Feld (neu, war in RE-FINCH.md nicht
Thema).** Finch selbst publiziert **keine** Paper — die
Metaheuristik-Hypothese aus Säule 2 bleibt unsere Rekonstruktion. Die
akademische Graph-basierte Grundriss-Generierung ist aber ein aktives,
gut dokumentiertes Forschungsfeld, das denselben Grundgedanken (Graph als
latente Struktur, iterative Verfeinerung) verfolgt und drei
unterschiedliche Repräsentationsebenen zeigt:

- **[G2P] Graph2Plan** (Hu et al., ACM ToG 2020, `arxiv.org/abs/2004.13204`):
  Layout-Graph (Räume als Knoten, Adjazenz als Kanten) + Grundstücksumriss
  → GNN + CNN erzeugt Raum-Boxen; interaktiv nachbearbeitbar (Knoten
  verschieben/löschen), trainiert auf RPLAN (80 000 Grundrisse).
- **[HG] House-GAN / House-GAN++** (Nauata et al., ECCV 2020 /
  `arxiv.org/abs/2103.02574`): relationales GAN, das denselben
  Graph-Constraint (Raumtypen + Adjazenz) direkt in Boxen übersetzt;
  House-GAN++ verfeinert iterativ (vorheriges Layout wird neuer
  Input-Constraint).
- **[WP] WallPlan** (Sun et al., ACM ToG 2022,
  `wutomwu.github.io/publications/2022-WallPlan/paper.pdf`): generiert
  **direkt einen Wandgraphen** (Wandknoten = Ecken, Kanten = Wandsegmente)
  statt Raum-Boxen — methodisch näher an unserer eigenen Pipeline
  (Zonen → `zonenwaende.ts` → echte `Wall`-Entities) als an Finchs
  Box-zentriertem Modell.

**Einordnung, keine Übernahme:** Diese drei Arbeiten beweisen NICHT, wie
Finch intern rechnet (Finch nennt kein Paper, keine Modellarchitektur) —
sie zeigen aber, dass «Graph zuerst, Geometrie danach» ein etabliertes,
öffentlich nachvollziehbares Prinzip ist, das wir für **eigene**,
transparent dokumentierte Verfahren als Ideenquelle nutzen dürfen, ohne
Finch nachzubauen. Für die Frage «reicht Heuristik oder brauchen wir
ML» ist WallPlans Wandgraph-Fokus der nützlichste Fingerzeig: unsere
Kette Segmentierer → Grundriss-Generator → Zonenwände ist strukturell
bereits ein Wandgraph-Verfahren, nur heuristisch statt gelernt.

---

## 3 · Zweite Recherchewelle: was frisches Nachfragen bei Finch bringt (und was nicht)

Um die Owner-Frage «wie tiefgründig müssen wir graben» ehrlich zu
beantworten, wurden fünf zentrale `docs.finch3d.com`-Seiten aus
RE-FINCH.md **erneut** abgerufen (`algorithm-theory`, `new-features`,
`enterprise-generate-unit-plan`, `adaptive-plan-library`, `sitemap`) sowie
gezielt nach neueren Fundstellen gesucht (Firmen-Blog, Nachrichten Juli
2026, Graph-Studio-Vertiefung):

- **Kein Wortlaut hat sich seit 03.07.2026 verändert.** Der
  `new-features`-Changelog endet weiterhin mit dem August/September-2024-
  Archiv (Graph Studio, Adaptable Constraints, Floor Plate 2.0); keine
  neuen datierten Einträge für 2026. Eine gezielte Suche nach Finch-News
  Juli 2026 fand nur Wiederholungen bekannter Fakten (Team ~16 Personen,
  Series-A-Finanzierung April 2025) — keine neue Produktankündigung.
- **`docs.finch3d.com/docs/projects-and-variants/story-editor/
  generate-cores` existiert nicht** (404 mit Vorschlagsliste) — die in
  RE-FINCH.md unter dem Namen „Generate Cores" gruppierte Fähigkeit trägt
  in Finchs eigener Navigation tatsächlich den Titel **„Generate Unit Mix
  & Stairwells"** (bestätigt über `sitemap.md`); RE-FINCH.md Abschnitt 2.3
  bleibt in der Sache korrekt, nur der Eigenname war eine Verkürzung —
  hier präzisiert.
- **Die zwei Doku-Bedienkürzel `shift+s` (Stretch Preview) und `shift+c`
  (Constraints)** aus Abschnitt 2 dieses Dokuments waren in RE-FINCH.md
  noch nicht wörtlich zitiert; inhaltlich ändert das nichts an der dortigen
  Einschätzung.

**Schlussfolgerung, die die Recherchetiefe beantwortet:** Weiteres Graben
in Finchs öffentlichem Material hat **abnehmenden Grenznutzen erreicht** —
zwei unabhängige Durchgänge (RE-FINCH.md 03.07., dieses Dokument 08.07.)
liefern praktisch deckungsgleiche Fakten. Die lohnende weitere Tiefe liegt
in drei anderen Richtungen, keine davon ist „noch mehr Finch lesen":

1. **Akademisches Graph-Floorplan-Feld** (Abschnitt 2) für
   Algorithmus-**Ideen**, nicht für Finch-Fakten — dort gibt es tatsächlich
   noch Tiefe (Trainingsverfahren, Verlustfunktionen), die für eine
   allfällige eigene LoRA relevant würde.
2. **Eigene Normtiefe** (SIA 500 Bewegungsflächen, VKF-Fluchtweg-Richtwerte,
   SIA-416-Raumtypen) — hier sind wir bereits eigenständig unterwegs
   (`derive/moebel.ts`, `derive/raumgraph.ts`) und sollten das CH-spezifisch
   vertiefen statt Finchs generische Werte zu kopieren.
3. **Eigene Projektdaten** als Trainingsgrundlage für die künftige
   Grundriss-LoRA (`docs/LORA-KONZEPT.md`, entsteht parallel — hier nur
   referenziert, nicht ausgearbeitet) — das ist keine Finch-Recherche
   mehr, sondern eigene Datensammlung.

---

## 4 · Die Lücken-Matrix, die tatsächlich noch offen ist

Reifegrad wie in RE-FINCH.md: **✅** vorhanden (mit Beleg) · **◐** teilweise
· **❌** fehlt. Diese Matrix ersetzt RE-FINCH.md Abschnitt 6 (die dortige
Liste ist durch Abschnitt 1 dieses Dokuments grösstenteils erledigt) und
konzentriert sich auf das, was nach dem 03.07.-Bauschub **wirklich** noch
zwischen uns und Finchs Produkterlebnis steht.

| Finch-Kernfähigkeit | KosmoOrbit heute | Reife | Beleg |
|---|---|---|---|
| Raumgraph + Egress | `raumGraph()`, `fluchtwege()`, `fluchtwegeGebaeude()` — Dijkstra über Portale, Ampel-Färbung in `checks.ts` | ✅ | `derive/raumgraph.ts:92–312`, ROADMAP 49 |
| Korridor+Kern **selbst finden** (Finchs „Generate Unit Mix & Stairwells"/„…& Corridors", blank slate) | `segmentiere()` verlangt eine **vorgezeichnete** Korridor-Zone als Pflicht-Input (`korridor: Pt[]`); kein Algorithmus, der Zahl/Lage von Treppenhäusern/Korridor-Skelett selbst aus dem Footprint ableitet | ❌ | `derive/segmentierer.ts:208–219` (Parameter `korridor` ist Pflicht, keine Ableitung) |
| Wohnungs-Zuschnitt nach Soll-Mix | `schneideBand()` — Bedarfs-Greedy im 25-cm-Raster, Opfer-Fläche ehrlich ausgewiesen | ✅ | `derive/segmentierer.ts:131–202` |
| Zimmer-Füllung (Rezept) | `generiereGrundriss()` — CH-Zweiband-Rezept (Eingangsband/Wohnband), inkl. Möblierung | ✅ nur EIN Rezept | `derive/grundrissgenerator.ts:219–340` |
| Nicht-rechteckige Wohnungsformen | `zerlegeRektilinear()` erkennt Rechteck + genau **eine** L-Innenecke; U/T-Formen und Schrägen werden ehrlich abgelehnt («von Hand teilen») | ◐ | `derive/grundrissgenerator.ts:66–149` |
| Wände aus Zonen | `zonenZuWaenden()` — atomare Intervalle, Innen/Aussen/Trennwand-Erkennung | ✅ | `derive/zonenwaende.ts:85–143` |
| Regel-Sätze je Raumtyp | `RaumRegel[]` (minFläche/minBreite/Tageslicht) über 2 Presets **oder** freie Werte via `design.regelnSetzen`; kein Editor-Raster wie Finchs Graph Studio, keine Egress-/Accessibility-Regel als konfigurierbarer Satz (Egress bleibt feste Formel in `raumgraph.ts`) | ◐ | `model/regelpresets.ts`, `commands/design.ts:1843–1866` |
| Gewichte + Anytime-Loop | Zwei Slider (Min-Breite, Wohnungsgrösse), **sofortige** Neuberechnung — bewusst kein Iterations-Loop, kein Pause/Weiterlaufen, keine Score-Aufschlüsselung je Wohnung | ◐ (bewusst vereinfacht, s. ROADMAP 55) | `derive/segmentierer.ts` `SegmentierOptionen`, ROADMAP 55 |
| Adaptive Vorlagen (Stretch) | `design.vorlageSpeichern`/`vorlageSetzen` — **ein** globaler Skalierungsfaktor je Achse für ALLE Zonen einer Vorlage; kein `locked`/`extendable` je Wand, keine Adaptivity-Score, keine automatische Rotations-/Spiegel-Suche (nur manuelles `spiegeln`-Flag) | ◐ | `commands/design.ts:1700–1755` (`sx`/`sy` als einzige Freiheitsgrade) |
| Plan Groups (verknüpfte Instanzen) | `vorlageSetzen` erzeugt **unabhängige** Kopien (neue IDs); eine Änderung an einer platzierten Vorlage wirkt nie auf die anderen | ❌ | `commands/design.ts:1723–1738` (`newId('zone')` je Instanz, keine Rückreferenz) |
| Firmweite Plan-Library (Tags/Region/Filter/Score) | `derive/katalog.ts` transportiert `vorlagen` projektübergreifend als JSON-Export/Import; kein Tag-/Region-/Score-Feld, kein Such-/Sortier-UI | ◐ | `derive/katalog.ts:15,29`, ROADMAP 115 |
| Parallel-Axis-Vergleich | `variantenMatrix()` **nur** auf Extremvolumen-Ebene (3–6 Linien, `derive/volumenstudie.ts`); kein Pendant auf Wohnungs-/Plan-Ebene mit Filter (Zimmer/Bad) oder Sortierung (Score/Tageslicht/CO₂) wie Finchs Unit-Editor | ◐ | `derive/variantenmatrix.ts:31–52` |
| Möblierung + SIA-500-Bewegungsflächen | `MOEBEL_KATALOG` (8 Typen), `pruefeBewegungsflaechen()` als Kollisions-Check | ✅ (kleinerer Katalog als Finchs Objekt-Library) | `derive/moebel.ts:26–114` |
| Raumtyp-Vorschlag | `raumTypVorschlag()` — Heuristik (Fläche/Form/Treppen-Nähe) **nach** Zonen-Zeichnen; Finchs Copilot arbeitet **während** des Wand-Zeichnens live mit | ◐ (Zeitpunkt-Unterschied) | `derive/raumtypcopilot.ts:16–51` |
| Custom-Kennzahlen | `kennzahlFormeln` (Wert × GF/aGF/HNF/NGF) | ✅ | ROADMAP 58 |
| Regel-Feedback live im Plan | Rote/gelbe Zonen-Tönung bei Regelverstoss (Bildschirm) | ✅ | ROADMAP 52 |
| Daylight-Fassaden-Toggle als Generierungs-Eingabe | kein Äquivalent — Tageslicht ist nur **Prüf**-Regel (`tageslicht: boolean` je Raumtyp), nicht eine Wand-für-Wand-Umschaltung, die den Generator/Segmentierer beeinflusst | ❌ | `model/regelpresets.ts` (nur boolesches Pflichtfeld je Raumtyp, kein Fassaden-Toggle) |
| Enterprise «KI generiert Pläne im Stil der Library» (trainiertes Modell) | kein Äquivalent — bewusst nicht heuristisch nachstellbar | ❌ (V2/LoRA-Terrain, s. Abschnitt 5) | — |

**Wichtigste ehrliche Einordnung dieser Matrix:** Von den 17 Zeilen sind
**6 klar ✅**, **8 ◐** und **3 ❌** — gegenüber RE-FINCH.md Abschnitt 6 (dort
0 ✅, 10 fehlend) eine massive Verschiebung Richtung Gleichwertigkeit. Die
verbleibenden Lücken sind aber nicht zufällig übrig geblieben: es sind
durchweg die Stellen, an denen Finch entweder (a) einen echten
Suchalgorithmus über Geometrie laufen lässt (Kern-/Korridor-Autofindung),
oder (b) einen Datenmodell-Mechanismus für **Referenzen statt Kopien**
braucht (Plan Groups), oder (c) tatsächlich lernende Modelle einsetzt
(Enterprise-Generierung). Das sind genau die drei schwersten Brocken —
und das ist kein Zufall, sondern der erwartbare Rest, wenn man das
Leichte zuerst baut (was mit F1–F10 korrekt geschah).

---

## 5 · Batch-Plan FG1…FG9 — die verbliebenen Brocken

Aufwand wie in RE-FINCH.md: S = 1, M = 2–4, L = 5+. Spalte
„0.6.x-tauglich" markiert, was reine Kernel-/UI-Arbeit im Container ist;
„V2/HomeStation" markiert, was einen Worker, GPU oder die künftige
Grundriss-LoRA (`docs/LORA-KONZEPT.md`, wird parallel erarbeitet — hier
nur als Andockpunkt referenziert) voraussetzt.

| # | Batch | Ziel | Betroffene Dateien | Aufwand | Reihenfolge | 0.6.x oder V2? |
|---|---|---|---|---|---|---|
| FG1 | **Korridor-/Kern-Autofindung (Blank Slate)** | Aus Geschoss-Footprint + Ziel-Treppenhauszahl selbst ein Korridor-Skelett (Medialachse-Näherung) + Kernlagen ableiten, statt eine gezeichnete Korridor-Zone zu verlangen — schliesst die grösste ❌-Zeile | neu `derive/kernfindung.ts`, Konsument `derive/segmentierer.ts` (`korridor`-Parameter wird optional mit Fallback-Ableitung) | **L** | 1. (Fundament für FG4) | 0.6.x (reine Geometrie/Kernel) |
| FG2 | **Locked/Extendable je Wand in Zonen-Vorlagen** | `ZonenVorlage`-Zonen bekommen ein `constraint: 'locked' \| 'extendable' \| 'frei'`-Feld je Wandkante; `vorlageSetzen` löst einen achsweisen linearen Solver statt der heutigen einheitlichen `sx`/`sy`-Skalierung | `model/doc.ts` (`ZonenVorlage`), `commands/design.ts:1654–1755` | **M** | 2. | 0.6.x |
| FG3 | **Plan Groups (verknüpfte Instanzen)** | Neues Feld `vorlageInstanzId` an platzierten Zonen; ein Command `design.vorlageAktualisieren` schreibt Änderungen an ALLE Instanzen einer Gruppe zurück; „Make Unique" löst eine Instanz aus der Gruppe | `model/entities.ts` (Zone-Feld), neuer Command in `commands/design.ts` | **M** | 3. (baut lose auf FG2 auf) | 0.6.x |
| FG4 | **Weights-Panel + Score-Transparenz je Wohnung** | Segmentierer/Generator bekommen eine echte gewichtete Scoring-Funktion (Flächentreffer/Mix/Tageslicht-Proxy/Raster-Nähe je Kandidat) statt reinem Greedy; Panel zeigt Score-Aufschlüsselung je Wohnung; optional ein Worker-Loop für grosse Geschosse (kein Zwang zum «Anytime-Theater», wo Instant-Rechnen reicht) | `derive/segmentierer.ts` (`schneideBand`), neues UI-Panel | **L** (setzt FG1 voraus für sinnvolle Kernvarianten) | 4. | 0.6.x (Kern), Worker-Loop optional V2 |
| FG5 | **Unregelmässige Wohnungsformen** | `zerlegeRektilinear()` auf U/T-Formen und (grob) Schrägen erweitern — Guillotine-Rekursion statt Einzel-L-Fall | `derive/grundrissgenerator.ts:52–149` | **L** | parallel zu FG4 möglich | 0.6.x |
| FG6 | **Parallel-Axis auf Wohnungs-/Plan-Ebene** | `variantenMatrix()`-Pendant für generierte Wohnungen (Fläche-Δ, Regel-Score, Tageslicht-Proxy) mit Filter (Zimmerzahl) und Sortierung — das Unit-Editor-Äquivalent | neu `derive/wohnungsmatrix.ts`, UI-Panel | **M** | nach FG4 (braucht dessen Scores) | 0.6.x |
| FG7 | **Graph-Studio-artiger Regel-Editor** | UI-Raster statt Presets/Command-only: je Raumtyp minFläche/minBreite/Tageslicht **und** neu Egress-Richtwert/Accessibility-Pflicht als Regel-Zeile (heute feste Formel in `raumgraph.ts`/`moebel.ts`) | `apps/kosmo-orbit/…/RegelPanel.tsx` (neu), `model/regelpresets.ts` | **M** | unabhängig, jederzeit einschiebbar | 0.6.x |
| FG8 | **Firmweite Plan-Library-UI** | `derive/katalog.ts`-Transfer bekommt Tags/Region/Zimmer-Bad-Filter als Felder der `ZonenVorlage`; ein Bibliotheks-Panel (Suche/Sortierung) statt reinem Download/Upload-Knopf | `model/doc.ts` (`ZonenVorlage`-Erweiterung), neues Panel | **M** | nach FG2 (Felder gehören zusammen) | 0.6.x |
| FG9 | **KI-generierte Pläne im Stil der Library** | Kosmo schlägt bei fehlendem Bibliotheks-Treffer einen neuen, im Bürostil gehaltenen Grundriss vor — Finchs „Finch Generated Plans"-Rang | kein Kernel-Batch — Andockpunkt für die Grundriss-LoRA | **L** (ausserhalb dieses Dokuments) | zuletzt, nach FG1–FG8 | **V2/HomeStation** — braucht `docs/LORA-KONZEPT.md` (parallel, hier nur referenziert) |

**Reihenfolge-Empfehlung:** FG1 zuerst — es ist die grösste verbliebene
❌-Zeile und das Fundament für FG4 (eine sinnvolle Gewichts-Suche braucht
mehrere Kern-/Korridor-Kandidaten, nicht nur eine vorgezeichnete Lage).
FG2/FG3 gehören zusammen (Constraint-Feld + Instanz-Verknüpfung sind
dasselbe Datenmodell-Thema) und sind von FG1 unabhängig — parallelisierbar,
wenn zwei Worktrees verfügbar sind. FG5/FG6/FG7/FG8 sind additive,
dateidisjunkte Ausbauten ohne harte Abhängigkeit untereinander. **FG9 ist
bewusst kein Batch dieses Dokuments** — es ist der einzige Punkt der ganzen
Lücken-Matrix, der wirklich gelernte Modelle statt Heuristik braucht, und
er wartet auf `docs/LORA-KONZEPT.md` als Voraussetzung, nicht auf mehr
Finch-Recherche.

---

## 6 · Quellenverzeichnis dieser Vertiefungsrunde

**Neu abgerufen (08.07.2026, alle via `curl` über den Session-Proxy als
`.md`, WebFetch lieferte 403 auf `docs.finch3d.com` und `medium.com` —
identisch zur RE-FINCH.md-Beobachtung):**

- [D] `https://docs.finch3d.com/docs/projects-and-variants/story-editor/algorithm-theory.md` — Custom-Core-/Blank-Slate-Algorithmus, Gewichts-Rechenbeispiel (Score 19 vs. 13)
- [D] `https://docs.finch3d.com/readme/new-features.md` — Changelog inkl. Archiv August/September 2024 (Graph Studio, Adaptable Constraints, Floor Plate 2.0), Daylight-Fassaden-Toggle, Scoring-Transparenz, Upload Walls
- [D] `https://docs.finch3d.com/docs/projects-and-variants/unit-editor/enterprise-generate-unit-plan.md` — «Your Firm's Plans» vs. «Finch Generated Plans», Parallel-Axis-Filter/Sortierung, Plan Groups (`ctrl+c`/`ctrl+v`, «Make Unique»)
- [D] `https://docs.finch3d.com/docs/projects-and-variants/unit-editor/adaptive-plan-library.md` — `stretch preview (shift+s)`, `constraints (shift+c)`, «Assign as-is»
- [D] `https://docs.finch3d.com/sitemap.md` — vollständige Seitenliste zur Namens-Präzisierung («Generate Unit Mix & Stairwells» statt «Generate Cores»)

**Neu, Erstquelle Finch-Gründerin:**
- Nunez Wallgren, P.: *„Introducing Finch Graph Rules: Revolutionizing the
  design process for architects"*, Medium/finch3d-Publikation,
  `https://medium.com/finch3d/introducing-finch-graph-rules-revolutionizing-the-design-process-for-architects-2082d7d127bb`
  (WebFetch 403, Inhalt über Such-Snippets rekonstruiert — als schwächere
  Belegstufe [S] markiert, wo wörtlich zitiert)

**Akademische Fachliteratur (neu, ordnet Finchs Grundkonzept ins
Forschungsfeld ein, KEIN Finch-Beleg):**
- [G2P] Hu, R. et al.: *Graph2Plan: Learning Floorplan Generation from
  Layout Graphs*, ACM ToG 39(4), 2020. `https://arxiv.org/abs/2004.13204`
- [HG] Nauata, N. et al.: *House-GAN: Relational Generative Adversarial
  Networks for Graph-constrained House Layout Generation*, ECCV 2020,
  `https://arxiv.org/abs/2003.06988`; Folgearbeit *House-GAN++*,
  `https://arxiv.org/abs/2103.02574`
- [WP] Sun, J. et al.: *WallPlan: Synthesizing Floorplans by Learning to
  Generate Wall Graphs*, ACM ToG 41(4), 2022,
  `https://wutomwu.github.io/publications/2022-WallPlan/paper.pdf`

**Wiederverwendet aus RE-FINCH.md (nicht erneut im Volltext zitiert,
Verzeichnis dort vollständig):** [W] finch3d.com, [AEC] AEC Magazine
30.01.2023, [AT] Architosh 18.09.2024, [DZ] Dezeen 27.06.2019, [IL]
illustrarch-Review 16.04.2026.

**Interner Quellen-Abgleich (Code/ROADMAP, kein Internet):**
`ROADMAP.md` Einträge 49–66, 69, 72, 77, 87, 91, 213–220;
`packages/kosmo-kernel/src/derive/{raumgraph,segmentierer,
grundrissgenerator,zonenwaende,volumenstudie,checks,moebel,
raumtypcopilot,programmerfuellung,besonnungsvergleich,variantenmatrix,
studienbericht,katalog}.ts`; `packages/kosmo-kernel/src/model/{doc,
regelpresets}.ts`; `packages/kosmo-kernel/src/commands/{design,
grundlagen}.ts`.

**Korrektur zum Auftragswortlaut:** Der Ausgangs-Wortlaut nennt
`model/entities.ts` als Fundort für `ZonenVorlage` — tatsächlich lebt der
Typ in `model/doc.ts` (`DocSettings.vorlagen: ZonenVorlage[]`, Zeile 76),
`entities.ts` kennt nur die platzierten `Zone`-Instanzen selbst. Hier
richtiggestellt statt stillschweigend übernommen.

---

## 7 · Ehrlichkeits-Zusammenfassung

1. **Der RE-FINCH-Bauplan (F1–F10) ist bereits vollständig gebaut** — diese
   Recherche musste ihn deshalb nicht wiederholen, sondern gegen den
   heutigen Code nachprüfen (Abschnitt 1) und dahinter weitersuchen.
2. **Zwei unabhängige Finch-Recherchedurchgänge (03.07./08.07.) liefern
   praktisch identische Fakten** — weiteres Graben in Finchs öffentlichem
   Material hat abnehmenden Grenznutzen; die Antwort auf «wie tief graben»
   lautet: **nicht tiefer in Finch, sondern breiter** in akademische
   Graph-Floorplan-Literatur (Ideen), eigene CH-Normtiefe und eigene
   Projektdaten (Abschnitt 3).
3. **Die verbliebene Lücken-Matrix ist klein, aber hart:** von 17 geprüften
   Fähigkeiten sind nur noch 3 echte ❌ — und alle drei sind die
   architektonisch schwierigsten (Autofindung von Kern/Korridor,
   Referenz-statt-Kopie-Datenmodell für Plan Groups, gelernte Modelle für
   Enterprise-Generierung).
4. **Kein Punkt dieser Matrix braucht heute ein trainiertes Modell ausser
   FG9** — Kern-/Korridor-Autofindung (FG1), Locked/Extendable-Constraints
   (FG2), Plan Groups (FG3) und Score-Transparenz (FG4) sind alle
   Geometrie/Datenmodell-Arbeit, container-machbar, keine HomeStation
   nötig.
5. **FG9 ist bewusst nicht Teil des Batch-Plans dieses Dokuments** — es ist
   der einzige Finch-Baustein, der wirklich gelernte Modelle statt
   Heuristik verlangt, und sein Andockpunkt ist `docs/LORA-KONZEPT.md`
   (entsteht parallel), nicht ein weiterer Finch-Rechercheschritt.
6. **`npm run typecheck` wurde als Beweis einmal vollständig laufen
   gelassen** (alle Workspaces, 0 Fehler) — dieses Dokument fasst keinen
   Code an, der Lauf bestätigt nur den unveränderten Ist-Stand.
