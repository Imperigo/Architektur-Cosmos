# Vorform-Konzept — Grundkonzept destilliert + Gleichstand-Fahrplan

> Stand 08.07.2026. Owner-Auftrag (Wortlaut v0.6.2): «Wir nehmen die
> Funktionen von Vorform auseinander: Vorform ist ja eigentlich ein
> intuitives Modellierprogramm, das 2D und 3D generieren cool macht und
> auch AI-Imaging eingebaut hat. Was müssen wir recherchieren, um das Tool
> gleichwertig zu haben? Wie tiefgründig graben/reverse engineeren?
> Grundkonzept finden, dann Konzept aufbauen, was und wie wir es machen.»
> Dieses Dokument vertieft `docs/RE-VORFORM.md` (03.07.2026, das
> Feature-Reverse-Engineering) nicht neu, sondern (a) prüft am Code-Ist-Stand,
> was von dessen Batch-Plan bereits gebaut wurde, (b) destilliert das
> **Grundkonzept** hinter Vorform anhand einer öffentlichen Vergleichsgruppe
> ähnlicher «Massing + Instant-AI-Imaging»-Tools und (c) baut daraus einen
> neuen, geschärften Batch-Plan V-M1…V-M5. **Kein Binary-/Code-Reverse-
> Engineering** — reine Funktions-/Konzeptanalyse aus öffentlichem Material
> (Websites, Produktseiten, Reviews); jede Web-Aussage trägt eine URL, jede
> Code-Aussage einen Dateipfad.

---

## 0 · Wie tiefgründig graben? (Owner-Frage direkt beantwortet)

Der Auftrag fragt explizit: «Wie tiefgründig graben/reverse engineeren?»
Die Antwort, am `RE-VORFORM.md`-Präzedenzfall gemessen und hier fortgeführt:

1. **Öffentliche Quellen reichen für das Grundkonzept** — Vorform ist
   invite-only (kein Hands-on möglich, kein Login versucht) und ein
   Solo-Produkt ohne Doku/Blog/Preisseite. Was zählt, ist nicht der exakte
   Algorithmus (den liefert kein öffentliches Material), sondern das
   **Erlebnisversprechen**: Positionierungstext, Screenshots/Reels,
   Vergleichsgruppe. Das reicht, um ein Grundkonzept zu destillieren und zu
   prüfen — nicht, um Vorform pixelgenau zu klonen (das wäre auch nicht das
   Ziel: KosmoOrbit soll **gleichwertig**, nicht **identisch** sein).
2. **Kein Binary-/Code-Reverse-Engineering** — anders als `RE-VORFORM.md`
   (das öffentlich ausgelieferte JS-Bundle-Strings auswertete) verzichtet
   dieses Dokument bewusst auch darauf: die Feature-Ebene ist mit jenem
   Dossier bereits vollständig erfasst (411 Zeilen, 24 Features, 9
   Algorithmus-Hypothesen). Ein zweiter Durchgang am selben Bundle liefert
   keinen neuen Erkenntnisgewinn — tiefer graben hiesse hier **in die
   Konzept-Ebene**, nicht **noch mehr Strings extrahieren**.
3. **Die Vergleichsgruppe ersetzt das fehlende Hands-on** — sechs
   öffentlich dokumentierte, teils testbare Tools mit demselben
   Grundversprechen (Abschnitt 3) zeigen, welche Kombinationen aus
   Modellieren/Rendern am Markt bereits probiert wurden und woran sie
   scheitern oder reüssieren. Das ist belastbarer als eine einzelne
   Hypothese aus Vorforms eigenem Marketingtext.
4. **Grenze ehrlich benannt**: Ohne Zugang zur Beta bleiben alle Aussagen
   über die tatsächliche *Qualität* der Vorform-Ableitung (wie gut sieht
   das generierte 3D wirklich aus? Wie stabil ist die KI-Stilkonsistenz
   über mehrere Renders?) Hypothese — wie bereits in `RE-VORFORM.md`
   Abschnitt 8 festgehalten. Dieses Dokument wiederholt diese Grenze,
   verkleinert sie aber nicht künstlich.

---

## 1 · Ausgangslage: Was RE-VORFORM.md fand — und was seither gebaut wurde

`docs/RE-VORFORM.md` identifizierte Vorform (vorform.com, Solo-Gründer Dan
Carlberg, Zürich, invite-only Beta) und destillierte bereits ein
Kern-Paradigma: **«Zeichnung + Semantik = Modell»** — 2D-Form + Bedeutung
(Wand/Programmfläche/Erschliessung/Öffnung) → automatisch abgeleitetes 3D,
plus Cloud-KI-Render direkt aus dem Viewport (Gemini). Es priorisierte acht
Bau-Blöcke **V1–V8**.

**Ehrlicher erster Befund dieses Dokuments**: alle acht Blöcke sind
**bereits gebaut**, am selben Tag wie das Dossier selbst (ROADMAP 50/51/61/64
u. a., Marker «03.07., aus RE-VORFORM.md»):

| Block | Inhalt | Status | Beleg |
|---|---|---|---|
| V1 | Zonenregel-Katalog CH (AZ, max. Höhe/Geschosse, Grenzabstände) | ✅ | ROADMAP 51, `DocSettings.zonenRegel`, `design.zonenRegelSetzen` |
| V2 | Grenzabstands-/Höhen-Checks live | ✅ | ROADMAP 50/153, `checks.ts` Punkt-Kante-Distanz + Mehrhöhenzuschlag |
| V3 | Varianten-Matrix | ✅ | ROADMAP-Kette Berechnungsliste (25/27) |
| V5 | Raum-Ebene + Soll-Import | ✅ | Berechnungsliste-Kette |
| V6 | **Direktzeichnen-Handgefühl** (live m²/GF beim Ziehen) | ✅ | ROADMAP 64, `apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx:1813-1818` (`data-testid="live-flaeche"`, `m2.toFixed(0)} m²{tool === 'volumen' ? \` · GF ~...\` : ''}`) |
| V7 | Fassaden-Modul-Studien | ✅ | `packages/kosmo-kernel/src/derive/fassadenmodule.ts`, `apps/kosmo-orbit/src/modules/design/ModulEditor.tsx` («vorform-Kern» im Kopfkommentar) |
| V8 | Render-Prompt-Transparenz | ✅ | ROADMAP 61/74, `packages/kosmo-kernel/src/derive/renderprompt.ts` |
| V4 | CH-Standort-Kontext (swissBUILDINGS3D/-ALTI3D) | ○ Backlog | ROADMAP 64: «braucht Netz/HomeStation → Backlog» |

**Konsequenz für diesen Auftrag**: Die Frage ist nicht mehr «holt KosmoOrbit
Vorforms Einzelfunktionen nach» — das ist mit V1–V8 grösstenteils erledigt
und übertrifft Vorform an mehreren Stellen (Zonenrecht, CH-Kennzahlen,
Volumenstudien-Generator existieren dort laut RE-VORFORM.md 3.3/3.9
überhaupt nicht). Die Frage ist die **tiefere**, vom Owner explizit gestellte:
Ist das **Grundkonzept** — reibungsarmes Massen-Modellieren **mit**
sofortigem, stilkonstantem AI-Imaging als EIN zusammenhängender
Denk-Fluss — bei uns gleichwertig **erlebbar**, nicht nur einzeln
vorhanden? Das prüft Abschnitt 3–5.

---

## 2 · KosmoOrbit heute — Inventar der geforderten Kernfähigkeiten

Reifegrad wie in `INTEROP-KONZEPT.md`: **●** voll · **◐** teilweise ·
**○** geplant/fehlt.

| # | Fähigkeit | Status | Beleg |
|---|---|---|---|
| 1 | **FreeMesh Stufe 3** (freies Editieren, Vertex-Drag, Extrude, IFC-Brep) | ● | `packages/kosmo-kernel/src/derive/mesh-topo.ts` (373 Zeilen, reine Topologie: `gleichePositionen`, `flaechenNormale`, `planareRegion`, `extrudiereRegion`, `meshVolumen`); `apps/kosmo-orbit/src/modules/design/mesh-edit.ts` (Viewport-Handles); ROADMAP 192–198 (Buildplan `docs/V2-TECHNIK-BLOCK3-BUILDPLAN.md`, Budget 4096 Vertices/8192 Faces, IfcFacetedBrep-Beweis mit ifcopenshell) |
| 2 | **Volumenstudien-Generator** (Extremvarianten, Owner-Regeln) | ● | `packages/kosmo-kernel/src/derive/volumenstudie.ts` (287 Zeilen, Kopfkommentar «Vorform-Essenz» wörtlich: Teppich/Riegel/Turm/Zeilen/Winkel/Blockrand, Spänner-Tiefen 14–18 m, Hof ≥ 13 m, 3h-Sonnenkriterium) — **existiert bei Vorform laut RE-VORFORM 3.9 gar nicht** |
| 3 | **Direktzeichnen mit Live-Kennzahlen** | ● | `DesignWorkspace.tsx:1813-1818` (m²/GF-Live-Label beim Ziehen); ROADMAP 64 «die Vorform-Essenz» |
| 4 | **Skizzieren 2D** (Freihand → Wandachsen) | ● | `apps/kosmo-orbit/src/modules/design/sketch.ts` (Ramer-Douglas-Peucker, Winkel-Snap 0/45/90°, Vorschläge bleiben gated) |
| 5 | **Skizzieren 3D** (Raycast auf Fläche → Wand/Öffnung) | ● | `apps/kosmo-orbit/src/modules/design/sketch-3d.ts`, ROADMAP 155 (A4 «Beides/Raycast»): trifft der Strich eine Wand → Öffnung, sonst Wand-Zug auf dem echten Trefferpunkt |
| 6 | **Render-Kette** (Modell → Bild) | ◐ | `packages/kosmo-kernel/src/derive/renderprompt.ts` (Material→Prompt-Phrasen + Fassadenmodul-Raster, Prompt sichtbar/überschreibbar — V8); `apps/kosmo-orbit/src/modules/vis/vis-jobs.ts`, `VisWorkspace.tsx` (Node-Graph, Bridge-Job `render-scene/v1`, Doppel-QA-Verdikt, Stimmungs-Serien) — **aber**: eigener Workspace mit Job-Warteschlange, kein Ein-Klick-Render direkt im 3D-Viewport (s. Abschnitt 4/5) |
| 7 | **Bridge/Betriebsarten** | ● | `docs/BETRIEBSARTEN.md`: drei Modi (Standard/Remote/Cloud, `packages/kosmo-ai/src/betrieb.ts`), Cloud-Fallback bei nicht erreichbarer HomeStation, Setup-Assistent für Werkzeuge |
| 8 | **Fassadenmodule** | ● | `packages/kosmo-kernel/src/derive/fassadenmodule.ts` (Modulraster über Volumenkörper-Kanten, Passstück-Ausweisung, Wiederholungsgrad), `ModulEditor.tsx` |
| 9 | **Adaptive Oberfläche (Serie J/J2)** | ● | `apps/kosmo-orbit/src/state/oberflaeche-adaption-kern.ts` (stationsneutraler Adaptions-Kern, `docs/SERIE-J2-IMMERSIVE-OBERFLAECHE.md`: Referenz-Recherche Blender/Procreate/Apple-HIG, live via WebSearch verifiziert), `docs/SERIE-J-BUILDPLAN.md` (Touch/Maus-Differenzierung im Viewport) |

**Zwischenbefund**: Die Einzelfähigkeiten sind alle da, mehrere (2, 3) sind
Vorform überlegen. Die Lücke liegt nicht in einer fehlenden Funktion,
sondern — wie Abschnitt 4/5 zeigt — in der **Kopplung** von Modellieren und
Rendern zu einem einzigen, reibungslosen Denk-Fluss.

---

## 3 · Web-Recherche: Vergleichsrahmen «Massing + Instant-AI-Imaging»

Reine Konzept-/Positionierungsanalyse aus öffentlichen Produktseiten und
Reviews (kein Hands-on, keine Logins) — sechs Tools, die dasselbe
Grund-Versprechen wie Vorform verfolgen: früh, schnell, mit KI vom Volumen
zum Bild.

| Tool | Kernversprechen | Modellier-Ansatz | KI-Imaging | Quelle |
|---|---|---|---|---|
| **Vorform** | «3D without modeling» | 2D-Zeichnung + Semantik → automatisches 3D, kein Modelling-Handwerk | Gemini-Bildmodell direkt aus dem Viewport, Prompt sichtbar/überschreibbar, Kredit-System | [vorform.com](https://www.vorform.com/) (s. RE-VORFORM.md für Tiefe) |
| **Hypar** | Parametrische Massenstudien für Developer-Feasibility | Regelbasierte Funktionen (Node-artig, aber code-nah), Tausende Varianten aus Parametern (Parkplätze, Dichte, Unit-Mix) | Kein direktes Bild-KI-Rendering im Kern — Fokus auf Zahlen/Pro-forma, Export nach Revit | [DataDrivenAEC: Hypar Review](https://datadrivenaec.com/tools/hypar), [ToolMage: Hypar](https://www.toolmage.com/en/tool/hypar/) |
| **TestFit** | Feasibility in Minuten statt Wochen | Parametrische Konfiguratoren + generatives Site-Planning (Site Solver/Urban Planner), Tausende Optionen automatisch erzeugt, manuell gefiltert | Kein KI-Bild-Rendering — der Output ist Zahlen/Grundriss/Kostenschätzung, keine Fotorealismus-Schicht | [testfit.io](https://www.testfit.io/), [illustrarch: TestFit Review](https://illustrarch.com/articles/design-softwares/74579-testfit-review.html) |
| **Spacio** | «Structured feasibility studies in hours, not weeks» | Web-basiertes parametrisches Modellieren (bewusste Antwort auf Grasshopper/Dynamo-Lernkurve), Volumen skizzieren mit sofortigem Feedback (Fläche, Tageslicht, Sonnenstunden, Lärm) | Kombiniert generative KI mit Echtzeit-Compliance-Prüfung, BIM-taugliche Exporte — Fokus auf Kennzahlen-KI, nicht auf Bild-KI | [spacio.ai](https://spacio.ai/), [FutureArchi: Spacio](https://www.futurearchi.academy/blog/en/ai-parametric-design-spacio) |
| **Veras (EvolveLab/Chaos)** | KI-Rendering **ohne die Modellierumgebung zu verlassen** | Kein eigenes Modellieren — Plugin in Revit/SketchUp/Rhino/Vectorworks/ArchiCAD, liest aktive 3D-Ansicht (Geometrie/Kamera/Material) | Sekundenschnelles KI-Bild aus dem aktiven View, Prompt/Stil-Presets, sogar Bild→Animation | [Chaos: Veras](https://www.chaos.com/veras), [Chaos-Blog: was ist Veras](https://blog.chaos.com/what-is-veras) |
| **LookX.ai** | Skizze/Text → sofortiges Rendering | Kein eigenes Modellieren — Plugin/Web, nimmt Sketch oder Text als Eingabe | RealTime-Modus (Text/Sketch → Bild), Style-Adapter, SketchUp/Rhino-Plugins | [LookX AI](https://eliteai.tools/tool/lookxai), [Parametric Architecture: LookX-Launch](https://parametric-architecture.com/lookx-launched-an-ai-generated-tool-that-can-transform-sketch-or-squashed-paper-into-a-model/) |
| **Maket.ai** | Text/Parameter → editierbarer Grundriss + Rendering | Generative Grundriss-Erzeugung aus Parametern/Beschreibung, dann 2D→3D-Studie | KI-Rendering für Innen-/Aussenansichten als Zusatzschritt, nicht Kern-Loop | [maket.ai](https://www.maket.ai/) |

**Kernmuster der Vergleichsgruppe**: Die Tools zerfallen in **zwei Lager**:
(a) *Massing/Feasibility-Tools* (Hypar, TestFit, Spacio) optimieren auf
**Zahlen und Varianten**, KI-Bildgebung ist Nebensache oder fehlt ganz;
(b) *Instant-Rendering-Tools* (Veras, LookX) optimieren **ausschliesslich**
auf sofortiges Bild, haben **kein eigenes Modellieren** — sie brauchen ein
fremdes CAD/BIM-Programm als Wirt. **Vorform ist der seltene Fall, der
beides in einem Werkzeug vereint** — eigenes leichtes Modellieren UND
sofortiges Bild, ohne Wirtsprogramm. Das bestätigt die im Auftrag genannte
These unabhängig: Vorforms Alleinstellungsmerkmal ist nicht «Modellieren»
oder «Rendern» einzeln (beides existiert reichlich am Markt), sondern die
**enge Kopplung beider im selben Fenster, ohne Formatwechsel, ohne
Plugin-Sprung**.

---

## 4 · Das Grundkonzept: destilliert und geprüft

**These** (aus dem Auftrag, hier geprüft statt behauptet): Vorforms Kern ist
ein **reibungsarmer Massen-Modellier-Loop mit sofortigem, stilkonstantem
AI-Imaging als integralem Bestandteil** — «modellieren wie skizzieren,
rendern wie denken».

Die Vergleichsgruppe (Abschnitt 3) stützt diese These, präzisiert sie aber:
Es sind **drei**, nicht zwei Eigenschaften, die zusammen wirken müssen —
keines der sechs Vergleichstools erreicht alle drei gleichzeitig:

1. **Reibungsarmes Modellieren** — 2D-Strich statt 3D-Handwerk (Vorform,
   Maket teilweise; Hypar/TestFit/Spacio sind parametrisch, nicht
   skizzenhaft).
2. **Sofortigkeit des Bildes** — Sekunden, nicht Minuten/Jobwarteschlange,
   **im selben Fenster** wie das Modell (Vorform, Veras, LookX; Hypar/
   TestFit/Spacio haben das gar nicht, Maket als Zusatzschritt).
3. **Stilkonstanz** — dasselbe Projekt liefert über viele Renders hinweg
   einen wiedererkennbaren, zum Büro passenden Look, nicht bei jedem Klick
   einen neuen Zufalls-Stil (bei Vorform nur indirekt über Material-Prompts
   erreicht, RE-VORFORM 3.7; explizite Stil-Konsistenz — z. B. via
   feinabgestimmtem Modell/LoRA — hat **keines** der sechs Vergleichstools
   öffentlich belegt, das bleibt eine offene Flanke am ganzen Markt, nicht
   nur bei Vorform).

**Ehrlicher Doppelbefund**: (a) KosmoOrbit hat Eigenschaft 1 (Direktzeichnen,
Sketch 2D/3D, FreeMesh) bereits **gleichwertig oder besser** als Vorform —
das zeigt Abschnitt 2. (b) Eigenschaft 2 (Sofortigkeit **im selben Fenster**)
ist die **tatsächliche Lücke**: KosmoVis ist ein eigener Workspace mit
Node-Graph und Job-Warteschlange (`vis-jobs.ts`, `VisWorkspace.tsx`) — mächtig
(Doppel-QA, Stimmungs-Serien, HS1–HS7-Job-Lebenszyklus laut ROADMAP 177–185),
aber ein bewusster Kontextwechsel weg vom Modellieren, nicht ein Klick im
3D-Viewport während des Zeichnens. (c) Eigenschaft 3 (Stilkonstanz) ist
**bei niemandem** am Markt gelöst — das ist keine Rückstands-Lücke, sondern
eine mögliche **Differenzierung**, wenn KosmoOrbit sie zuerst baut (Verweis
auf `docs/LORA-KONZEPT.md`, das dies parallel als eigenes Konzept ausarbeitet
— Stil-LoRA aus dem Lernjournal/Renderkorpus, hier nur referenziert, nicht
vorweggenommen).

---

## 5 · Lücken-Matrix: das Grundkonzept gegen KosmoOrbit

| # | Lücke | Warum (Code-/Konzept-Beleg) | Wer hat es (Vergleichsgruppe) |
|---|---|---|---|
| L1 | **Kein Ein-Klick-Render im 3D-Viewport während des Modellierens** | `VisWorkspace.tsx` ist ein eigener Sidebar-Tab mit Node-Canvas; der Weg Modell→Bild verlangt Tab-Wechsel + Node-Aufbau/-Wahl, kein Knopf direkt am `Viewport3D.tsx`-Canvas | Vorform (Render-Button im selben Fenster), Veras/LookX (Plugin im aktiven View) |
| L2 | **Renderpfad ist Job/Warteschlange, nicht «sofort»** | HomeStation-Bridge-Job-Zyklus (`docs/HOMESTATION-AUFTRAG.md` §1c: «es fehlt nur der echte GPU-Worker»; ROADMAP 392: Fake-Worker im Container) — architektonisch korrekt (GPU-Leerlauf-Scheduler ist ein Feature, kein Bug, für Warteschlangen-Fairness), aber das Erlebnis ist «Job abschicken, Fortschritt beobachten», nicht Vorforms «Klick → 3–8 s → Bild» | Vorform (Cloud-API, kein eigener GPU-Scheduler nötig) |
| L3 | **Kein Stil-konstantes Rendering über ein Projekt hinweg** | Aktuell: Material→Prompt-Phrasen (`renderprompt.ts`) + freier Stimmungstext — jeder Job ist ein neuer Prompt an ein generisches Bildmodell, keine Büro-/Projekt-Stilverankerung | Niemand am Markt (echte Marktlücke, kein Rückstand) — Ansatzpunkt `docs/LORA-KONZEPT.md` |
| L4 | **KI-Imaging ohne Heim-PC/Cloud-Schlüssel geht heute nicht** | `docs/BETRIEBSARTEN.md`: Standard/Remote brauchen die HomeStation-Bridge (🔒 Heim-PC/GPU), Cloud-Modus braucht einen hinterlegten Claude-Schlüssel — ohne beides bleibt KosmoVis ohne Bildquelle | Vorform (zentraler Cloud-Dienst mit Kredit-System, kein Heim-PC nötig) — Gegenkonzept in `docs/KOSMOVIS-OHNE-HOMEPC.md` (parallel in Arbeit, hier nur referenziert) |
| L5 | **CH-Standort-Kontext (swissBUILDINGS3D/-ALTI3D)** | ROADMAP 64: V4 «braucht Netz/HomeStation → Backlog» — bereits als Lücke bekannt, unverändert offen | Vorform (OSM, schwächer als swisstopo, aber vorhanden) |
| L6 | **Direktzeichnen kennt Live-m²/GF, aber keinen Live-Bild-Vorgeschmack** | Das Live-Label (`DesignWorkspace.tsx:1813-1818`) zeigt Zahlen, keine Skizze/kein Thumbnail des zu erwartenden Renders während des Ziehens — ein reiner Zahlen-, kein Bild-Feedback-Loop | Keines der sechs Vergleichstools hat das öffentlich belegt (auch keine Marktlücke — niedrige Priorität) |

---

## 6 · Batch-Plan V-M1…V-M5 (Grundkonzept-Fokus)

Aufwand wie in `INTEROP-KONZEPT.md`: S = 1, M = 2–4, L = 5+. 🔒 markiert,
was HomeStation-Hardware oder einen Cloud-Schlüssel voraussetzt und ohne
Owner-Zutun im Container nicht abschliessend testbar ist.

| # | Scope | Ziel/Dateien | Aufwand | HomeStation/Schlüssel? |
|---|---|---|---|---|
| **V-M1** | **Render-Knopf direkt am `Viewport3D.tsx`**: ein kontextueller Knopf («Bild rendern») im 3D-Viewport selbst, der den aktuellen Kamera-Ausschnitt + den bereits existierenden `finalerRenderPrompt`-Text (`renderprompt.ts`) an genau EINEN `VisWorkspace`-Job schickt — ohne Tab-Wechsel, Ergebnis als Overlay-Karte im Viewport statt nur im Vis-Tab | Schliesst L1: der grösste Erlebnis-Unterschied zu Vorform; reiner UI-Verdrahtungs-Batch, kein neuer Kernel-Code (nutzt bestehende `vis-jobs.ts`/`bridgeRoutes`) | M | Renders ja (bestehender Bridge-Weg), Feature-Bau nein |
| **V-M2** | **Sofort-Vorschau-Modus**: ein «Schnell»-Preset am neuen Knopf (1 Kandidat, kleinere Auflösung, kein Node-Graph-Aufbau nötig) für den Fall, dass die Bridge/HomeStation erreichbar ist — macht den Job so nah wie möglich an «Klick → Sekunden» heran, ohne den bestehenden Voll-Modus (Serien, QA, Node-Graph) zu verdrängen | Mildert L2, so weit ohne eigenen GPU-Worker möglich; baut auf V-M1 auf | S–M | 🔒 braucht echten Bridge-Worker für echte Sekunden-Antwort — im Container bleibt es der bekannte Fake-Worker |
| **V-M3** | **Stil-Anker je Projekt**: `DocSettings` bekommt ein optionales `stilAnker`-Feld (Freitext + ggf. Referenzbild-Verweis), das `finalerRenderPrompt` JEDEM Job voranstellt — ein einfacher, undo-fähiger erster Schritt zur Stilkonstanz (L3), **kein** LoRA-Training in diesem Batch | Erste, kernel-schlanke Antwort auf L3, solange `docs/LORA-KONZEPT.md` noch offen ist; spätere LoRA-Integration ersetzt/ergänzt nur den Prompt-Baustein, ohne diesen Batch zu verwerfen | S | nein |
| **V-M4** | **Cloud-Imaging-Pfad** | Schliesst L4 zusammen mit dem parallel entstehenden `docs/KOSMOVIS-OHNE-HOMEPC.md` — dieser Batch **referenziert** jenes Konzept, nimmt es nicht vorweg; Umfang hier: sobald jenes Dokument einen Cloud-Bildweg spezifiziert, verdrahtet dieser Batch den V-M1-Knopf zusätzlich an diesen Pfad, analog zum bestehenden Betriebsarten-Cloud-Fallback (`packages/kosmo-ai/src/betrieb.ts`) | L (abhängig von KOSMOVIS-OHNE-HOMEPC.md) | 🔒 Cloud-Schlüssel |
| **V-M5** | **CH-Standort-Kontext** (swissBUILDINGS3D/-ALTI3D/AV-Parzellen als Kontext-Layer) | Schliesst L5/V4-Backlog — unverändert gegenüber RE-VORFORM.md Bau-Block V4, hier nur neu nummeriert, weil V-M-Namensraum konsistent bleibt | L | nein (öffentliche geo.admin.ch-APIs; Bridge-Cache optional) |

**Reihenfolge-Empfehlung**: **V-M1 zuerst** — reiner UI-Batch, keine neue
Bridge-Abhängigkeit, schliesst den grössten und meistgenannten Erlebnis-
Unterschied («Render fühlt sich wie ein Ausflug an, nicht wie ein Klick»).
**V-M3 direkt danach** (klein, unabhängig, bereitet den späteren
LoRA-Anschluss vor). **V-M2** folgt, sobald ein echter Bridge-Worker näher
rückt (`docs/HOMESTATION-AUFTRAG.md` §1c). **V-M4** wartet bewusst auf
`docs/KOSMOVIS-OHNE-HOMEPC.md` als Grundlage — kein Vorgriff. **V-M5** bleibt
der grösste, unabhängige Wow-Batch und kann parallel zu allen anderen laufen.

---

## 7 · Bezug zu den parallel entstehenden Konzepten

Zwei Owner-Aufträge laufen zeitgleich zu diesem und berühren dieselbe
Lücke — dieses Dokument nimmt sie **nicht vorweg**, sondern zeigt nur, wo
sie andocken:

- **`docs/KOSMOVIS-OHNE-HOMEPC.md`** (entsteht parallel): beantwortet die
  Frage, wie KI-Imaging **ohne** laufenden Heim-PC funktionieren kann —
  genau die Lücke L4 dieses Dokuments. V-M4 hängt vollständig von dessen
  Ergebnis ab: sobald jenes Konzept einen Cloud-Bildweg (analog zum
  bestehenden `Cloud`-Betriebsmodus in `docs/BETRIEBSARTEN.md`, der für den
  Chat bereits existiert, für Bildgenerierung aber noch nicht) spezifiziert,
  verdrahtet V-M4 den in V-M1 gebauten Viewport-Knopf zusätzlich an diesen
  Pfad. Ohne dieses Konzept bleibt KosmoVis, was es heute ist: HomeStation-
  gebunden (`ROADMAP.md` Zeile 82: «HomeStation-gebunden bleibt nur: echte
  Renders (5090/ComfyUI), … LoRA-Zyklus»).
- **`docs/LORA-KONZEPT.md`** (entsteht parallel): beantwortet, wie ein
  projekt- oder büro-eigener Stil-LoRA aus dem Lernjournal/Renderkorpus
  trainiert werden kann — die vollwertige Antwort auf Lücke L3, von der
  V-M3 hier nur einen einfachen Zwischenschritt (Prompt-Anker ohne
  Training) baut. `docs/V16-AUFTRAG-PLAN.md` Zeile 261 nennt den
  JSONL-Export aus dem Lernjournal bereits als vorhandene Grundlage
  («P6-alt — LoRA-Training aus dem Lernjournal: JSONL-Export existiert»);
  das neue Konzept muss diese Grundlage auf Bild-Stil statt nur auf
  Text-Antworten erweitern.

Beide Dokumente bleiben hier reine Verweise (Dateiname genannt, Inhalt
nicht vorweggenommen) — dieses Dokument liefert die Konzept-Begründung,
**warum** L3/L4 überhaupt priorisiert gehören (weil sie den Grundkonzept-
Kern «sofortig + stilkonstant» treffen), nicht **wie** sie technisch gelöst
werden.

---

## 8 · Ehrlichkeits-Zusammenfassung

1. **Kein neues Reverse-Engineering nötig** — `RE-VORFORM.md` bleibt die
   vollständige Feature-Quelle; dieses Dokument prüft nur, was seither
   gebaut wurde (Abschnitt 1) und fügt die Konzept-Ebene hinzu (Abschnitt
   3–5), die das alte Dossier bewusst offenliess.
2. **Die V1–V8-Frage ist im Kern beantwortet**: sieben von acht Blöcken sind
   gebaut, mehrfach über Vorform hinaus (Zonenrecht, Volumenstudien-
   Generator). Nur V4 (Geodaten) bleibt offen — unverändert, kein neuer
   Befund.
3. **Die eigentliche verbleibende Lücke ist erlebnisbezogen, nicht
   funktional**: KosmoOrbit kann alles, was Vorform an Massen-Modellierung
   kann, und mehr — aber das Rendern lebt in einem eigenen Workspace statt
   im selben Fenster wie das Modellieren (L1/L2).
4. **Stilkonstantes AI-Imaging ist eine Marktlücke, keine Vorform-Stärke**
   — keines der sechs untersuchten Vergleichstools hat es öffentlich
   belegt gelöst; das macht `docs/LORA-KONZEPT.md` zu einer echten
   Differenzierungschance statt eines Nachbaus.
5. **Was HomeStation/Cloud-Schlüssel braucht, wird offen benannt** (🔒 in
   Abschnitt 6) statt im UI vorgetäuscht — dieselbe Doktrin wie in
   `CLAUDE.md` («Ehrlichkeit vor Politur») und `INTEROP-KONZEPT.md`.
