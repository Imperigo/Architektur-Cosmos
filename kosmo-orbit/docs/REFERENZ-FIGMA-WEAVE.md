# Referenz Figma Weave — Vorlage/Reverse Engineering für KosmoVis (0.9.0 «Weave»)

**Datum:** 20.07.2026
**Auftrag:** Owner-Kompass 20.07.2026, wörtlich: «für KosmoVis gilt vorlage/referenz/reverse engineering von figma weave». Dieser Bericht ist die Pflicht-Vorstufe vor jeder weiteren Node-UI-Arbeit im 0.9.0-Strang «Weave».
**Autor:** Recherche-Agent (Web-Recherche ausdrücklich freigegeben); Vergleichsbasis KosmoVis aus dem Repo quergelesen (`NodeCanvas.tsx`, `vis-island-katalog.ts`, `vis-jobs.ts`, `vis-runtime.ts`, `packages/kosmo-kernel/src/commands/vis.ts`).

**Quellenlage (ehrlich):**

- **Direkt abrufbar (hohe Qualität):** figma.com-Blog (drei Artikel), help.figma.com (Weave-FAQ), News-Berichte zur Übernahme (SiliconANGLE, Globes).
- **Nur indirekt (mittlere Qualität):** Das offizielle Weave-Hilfezentrum **help.weavy.ai blockt automatisierte Zugriffe (HTTP 403, Bot-Schutz)** — dessen Inhalte (Shortcuts, Node-Doku, «Delights»-Changelogs, Credit-System) konnten nur über Suchmaschinen-Snippets zitiert werden. Artikel-URLs sind angegeben; die Zitate sind Snippet-Auszüge, nicht der volle Artikeltext.
- **Drittquellen (mittlere Qualität, detailreich):** ausführliche japanische Anleitung auf note.com (MOMOTARO), Reviews von banani.co, agentaya.com, houseofgai.com.
- **Nicht belegbar:** Touch-/iPad-Verhalten, Undo/History-Modell, konkrete Farbcodierung der Node-Kategorien, Queue-/Warteschlangen-UI — wird unten je Stelle ausgewiesen. Ein Hands-on-Test (Konto bei weave.figma.com) war aus dem Container nicht möglich; Screenshots konnten nicht ausgewertet werden.

---

## 1. Was ist Figma Weave (Herkunft, Zweck, Status, Preismodell)

**Herkunft.** Figma Weave ist der neue Name von **Weavy**, einem 2024 in Tel Aviv gegründeten Startup (rund 20 Personen, 4-Mio.-USD-Seed), das Figma am **30.10.2025** übernommen und als «Figma Weave» weitergeführt hat. Der Kaufpreis ist offiziell nicht bestätigt; Marktberichte (Calcalist) nennen **über 200 Mio. USD**.
Quellen: https://siliconangle.com/2025/10/30/figma-acquires-ai-design-startup-weavy-reported-200m/ · https://en.globes.co.il/en/article-figma-acquires-israeli-startup-weavy-for-200m-1001525172 · https://www.figma.com/blog/welcome-weavy-to-figma/

**Zweck.** «A creative platform for AI-native media generation and editing»: KI-Modelle für Bild, Video, Audio und 3D werden zusammen mit professionellen Editier-Werkzeugen auf **einem browserbasierten Node-Canvas** kombiniert. Kernsatz aus der Ankündigung: «Outputs can be branched, remixed, and refined, combining creative exploration with precision and craft» — der erste Prompt ist «the creative starting point rather than the final destination» (Dylan Field). Genannte Zielgruppen ausdrücklich inkl. **Architekten** (Staging/Visualisierung).
Quelle: https://www.figma.com/blog/welcome-weavy-to-figma/

**Status (Stand 20.07.2026).**
- Eigenständiges Produkt unter **weave.figma.com** (separates Konto, separate Abrechnung; Credits sind NICHT mit Figma-AI-Credits kompatibel). Quelle: https://help.figma.com/hc/en-us/articles/35965787376919-Figma-Weave-FAQ
- Seit **24.06.2026**: «Weave tools in Figma» — 20+ vereinfachte KI-Bild-Tasks direkt in Figma Design, **Open Beta** (während der Beta gratis, danach Figma-AI-Credits). Quelle: https://www.figma.com/blog/connecting-figma-and-weave/
- **Weave-Workflows auf Figma Community** sind live (Vorlagen teilen/duplizieren); ein **«Figma node in Weave»** (Live-Sync von Figma-Frames in Weave-Workflows) ist «later this summer» angekündigt. Quelle: https://www.figma.com/blog/connecting-figma-and-weave/

**Preismodell (Credit-basiert, proprietäres SaaS).**
- Free: 150 Credits/Monat, max. 5 Workflows. Starter: 24 USD/Mt. (19 jährlich), 1500 Credits. Professional: 45 USD/Mt. (36 jährlich), 4000 Credits. Team: 60 USD/Mt. (48 jährlich pro Nutzer), 4500 Credits. Enterprise: custom (API-Keys, Indemnity, Support).
- Top-ups: 10 USD je 1000 Credits (Starter) bzw. je 1200 (Pro/Team); Credit-Rollover nur Pro/Team (bis 3 Monate). Verschiedene Modelle kosten unterschiedlich viele Credits pro Generat.
Quellen: https://weave.figma.com/pricing · https://help.weavy.ai/en/articles/12267070-figma-weave-s-subscription-plans (indirekt) · https://note.com/momotaro_ai/n/nadf8304c32a1 · https://www.scopeful.org/tools/figma-weave

**Einordnung für uns:** Weave ist ein Cloud-Credit-Produkt; KosmoVis ist lokal-first mit eigener HomeStation-GPU. Übernehmbar ist die **UX**, nicht das Geschäftsmodell.

---

## 2. UX-Anatomie des Node-/Canvas-Editors

**Canvas-Modell.** Freier 2D-Canvas mit **gerichtetem Datenfluss** über «Wires» (Kanten). Grundprinzip: «each text prompt, visual reference, output, and edit is a node» — auch Ergebnisse und Bearbeitungsschritte sind Nodes, nicht nur Operatoren. Drei-Zonen-Layout: linkes Menü (Toolbox/Modelle), zentraler Canvas, **rechtes Panel «Detailed Settings»** für modellspezifische Parameter.
Quellen: https://www.banani.co/blog/figma-weave-review · https://note.com/momotaro_ai/n/nadf8304c32a1

**Node-Typen** (Auswahl, aus Doku/Drittanleitung):
- **Prompt** (Text-Startpunkt), **Prompt Enhancer**, **Prompt Concatenator**, **Any LLM** (GPT/Claude/Gemini/Llama als Node im Graph).
- **Modell-Nodes** je Task: Bild (Nano Banana, Imagen, Seedream, Flux, Ideogram, SD, Recraft …), Video (Veo, Sora, Seedance, Kling, Runway, Luma …), 3D (Rodin, Hunyuan 3D, Trellis, Meshy …).
- **Editier-Nodes:** Painter (Maske/Zeichnen), Compositor (Ebenen aus Bild/Text/3D/Video), Levels, Crop, Upscaler (Topaz), Background Removal.
- **Analyse:** Image/Video **Describer** («turns them into prompts»).
- **Fluss-Helfer:** **Iterator** (Text/Bild/Video, Batch-Varianten «execute all variations simultaneously in bulk»), Array, List Selector, **Router** (ein Input auf mehrere Zweige), **Compare** (Slider/Toggle-Vergleich), **Preview**, **Export**, **Output** (erzeugt eine vereinfachte App-Oberfläche, s. unten).
Quellen: https://note.com/momotaro_ai/n/nadf8304c32a1 · https://help.weavy.ai/en/articles/12292386-understanding-nodes (indirekt) · https://help.weavy.ai/en/articles/12343281-iterators (indirekt) · https://help.weavy.ai/en/articles/12268300-helpers-overview (indirekt)

**Port-/Verbindungs-Semantik.** Verbinden per Drag von Output-Handle zu Input-Handle; die Doku betont **Typkompatibilität** («text to text, image to image»). Alternativ **Klick-Klick**: «You can also click Output and then click Input to connect them automatically.»
Quellen: https://help.weavy.ai/en/articles/12292386-understanding-nodes (indirekt) · https://note.com/momotaro_ai/n/nadf8304c32a1

**Parameter-Editing.** Parameter leben primär im **rechten Settings-Panel** des selektierten Nodes (Modellwahl, Auflösung, Seeds etc.); der Prompt-Text lebt im Prompt-Node auf dem Canvas. In Prompt-Nodes lassen sich per **`@`-Symbol Variablen** definieren und im Workflow wiederverwenden.
Quelle: https://note.com/momotaro_ai/n/nadf8304c32a1

**Vorschau-Verhalten.** Ergebnisse erscheinen **inline im Node selbst** («Generated image or video will be displayed within the node itself»). Ergebnis-Nodes von Iteratoren haben **Display-Modes** (Einzelergebnis / alle / bestimmter Batch) und ein **«Unpack»** (Drei-Punkte-Menü), das alle Ergebnisse als separate Nodes in eine Gruppe auspackt. Zusätzlich gibt es einen dedizierten Preview-Node («clean node» nur zur Ansicht).
Quellen: https://note.com/momotaro_ai/n/nadf8304c32a1 · https://help.weavy.ai/en/articles/14878372-new-figma-weave-delights-2 (indirekt) · https://help.weavy.ai/en/articles/12268300-helpers-overview (indirekt)

**Verzweigen/Iterieren.** Kernstärke: nicht-destruktives Branching — «you can branch into multiple directions, adjust one step without redoing everything»; ein Output kann in beliebig viele Folge-Nodes verdrahtet werden, Router verteilt aktiv, Iteratoren erzeugen Batches, Compare stellt Varianten gegenüber. Ein Prompt kann parallel an mehrere Modelle gehen (direkter Modellvergleich auf dem Canvas).
Quellen: https://www.houseofgai.com/blog/node-based-ai-tools-weavy-figma-weave · https://note.com/momotaro_ai/n/nadf8304c32a1 · https://www.figma.com/blog/five-figma-weave-workflows/

**Undo/History-Modell: nicht belegbar.** Kein zugänglicher Beleg zum Undo-Verhalten oder einer Versions-Historie des Weave-Canvas. (Eine Drittquelle behauptet pauschal «change history preserved», ohne Details — schwache Quelle: https://amplifilabs.com/post/inside-figma-weave-an-ai-canvas-for-collaborative-design-and-motion). Hier ist KosmoVis mit dem Command/Patch-Undo (`vis.*` → `AnyPatch[]`, Patch-Inverse) nachweislich präziser dokumentiert als das Vorbild.

---

## 3. Interaktions-Details

Belegte Interaktionen (help.weavy.ai indirekt via Such-Snippets, sofern nicht anders markiert):

| Geste/Taste | Wirkung | Quelle |
|---|---|---|
| **Tab** | Quick-Node-Suchmenü öffnen («opens the nodes menu») | https://help.weavy.ai/en/articles/14688389-keyboard-shortcuts (indirekt) |
| **Space + Drag** | Canvas pannen | dito |
| **Cmd/Ctrl + D** | Node duplizieren | dito |
| **Cmd/Ctrl + Shift + D** oder **Alt-Drag** | Selektion duplizieren **mit intakten Verbindungen** | https://help.weavy.ai/en/articles/15263628-new-figma-weave-delights-4 (indirekt) |
| **Cmd/Ctrl + C/V** | Copy/Paste | Keyboard-Shortcuts-Artikel (indirekt) |
| **Wire-Drag auf leeren Canvas** | Optionsmenü: passenden neuen Node erstellen und **automatisch verbinden** | https://help.weavy.ai/en/articles/14688276-connecting-edges-wires (indirekt) |
| **Wire-Drag + Alt/Option** | Node-**Vorschläge** beim Drop, Auswahl wird auto-verbunden | dito |
| **Shift + Kanten-Drag, über Ziele hovern** | Sofort-Verbinden mehrerer Ziel-Nodes | Delights (indirekt) |
| **Kante aus Mehrfachauswahl ziehen** | verbindet **alle selektierten Nodes gleichzeitig** mit dem Ziel | Delights #4 (indirekt) |
| **Doppelklick auf Text-Handle** | erstellt + verbindet sofort einen Prompt-Node | Delights (indirekt) |
| **Klick / Shift+Klick / Auswahlrahmen** | Einzel-/additive/Marquee-Selektion | Delights #3/#4 (indirekt) |
| **Cmd/Ctrl + G** | Gruppe mit Farbcodierung und Grösse | https://note.com/momotaro_ai/n/nadf8304c32a1 |
| **Rechtsklick auf Canvas** | Kontextmenü (Node erstellen; auf Ergebnis: «Set as cover»); Rechtsklick-Menü in den Präferenzen abschaltbar | https://www.banani.co/blog/figma-weave-review · note.com |
| **CSV auf Canvas fallen lassen** | erzeugt automatisch Iterator-Nodes je Spalte | Delights #3 (indirekt) |

**Zoom/Navigation:** Scrollrad-Zoom (in den Präferenzen umschaltbar), Space-Pan, Snap-to-Grid als Präferenz. Quelle: note.com (Präferenzenliste). Weitergehende Navigations-Details (Fit-to-View, Minimap): **nicht belegbar** — eine Minimap wird in keiner Quelle erwähnt.

**Touch/iPad: nicht belegbar.** Weave ist «browser-based» (https://www.figma.com/blog/welcome-weavy-to-figma/); keine Quelle dokumentiert Touch-Gesten, iPad-Optimierung oder eine Mobile-App — ein Review vermerkt ausdrücklich das Fehlen einer Mobile-Erwähnung (https://agentaya.com/ai-review/weave/). Für uns heisst das: **Touch-First ist unser Differenzierungsfeld, kein Weave-Kopierfeld** — die Klick-Klick-Verbindungsgeste und das Drop-Menü (beides fingerfreundlich) sind die einzigen direkt touch-tauglichen Weave-Muster.

---

## 4. Ästhetik / Visual Design

Hier ist die Beleglage am dünnsten (kein Bildzugriff aus dem Container):

- **Dichte/Aufgeräumtheit:** «notably cleaner and simpler than comparable platforms» (gemeint: ComfyUI-artige Node-Tools); geführtes Onboarding-Tutorial beim ersten Start. Quelle: https://agentaya.com/ai-review/weave/
- **Kanten-Rendering:** wählbar in den Präferenzen — **Bezier (Kurve), Elbow (orthogonal), Line (gerade)**. Quelle: https://note.com/momotaro_ai/n/nadf8304c32a1
- **Gruppen** tragen Farbcodierung (frei wählbar, nicht kategoriegebunden). Quelle: note.com
- **Grosse Inline-Ergebnisse:** der Canvas wirkt durch die im Node angezeigten Bilder/Videos wie ein verdrahtetes Moodboard — das dominiert die Ästhetik stärker als jedes Chrome. Quellen: note.com · https://www.figma.com/blog/five-figma-weave-workflows/
- **Farbcodierung der Node-Kategorien, Typografie, Leerraum-Masse, Dark-/Light-Theme: nicht belegbar.** Keine zugängliche Textquelle beschreibt Theme oder Kategorie-Farben; Marketing-Material konnte nicht visuell ausgewertet werden.

**Abgleich KosmoOrbit:** Unser «Werkplan»-Konzept (Papier, Tusche, Mono-Labels, 1px-Technik-Linien, dunkles «Tinte»-Theme; `docs/GESTALTUNGSKONZEPT.md`) ist eigenständig und bleibt es. Kompatibel mit Weave-Erkenntnissen: (a) grosse Inline-Vorschauen als dominantes Bildelement — passt zum Karteikarten-/Poster-Duktus; (b) wählbares Kanten-Rendering haben wir schon (Ortho/Kurve, Insel ANSICHT `routing`, `vis-island-katalog.ts:91`); (c) zurückhaltendes Chrome, Werkzeuge am Rand — unsere Inseln erfüllen das bereits. **Nicht** übernehmen: beliebige Gruppen-Farben (kollidiert mit «Farbe ist Ausnahme»; bei uns wäre eine Gruppen-Farbe an den Kategorie-Hue oder den Akzent zu binden).

---

## 5. Modell-/Job-Orchestrierung

**Modell-Mischung.** Modelle sind **austauschbare Nodes gleicher Form** — «Teams can select the right model for each task» (Seedance/Sora/Veo für Video, Flux/Ideogram für Realismus, Nano-Banana/Seedream für Präzision) und im selben Graph mischen; ein Prompt kann parallel an mehrere Bildmodelle gehen, die Ergebnisse stehen nebeneinander. LLMs (GPT/Claude/Gemini/Llama) sind über den «Any LLM»-Node Teil des Graphen (z. B. Prompt-Aufbereitung vor dem Bildmodell).
Quellen: https://www.figma.com/blog/welcome-weavy-to-figma/ · https://note.com/momotaro_ai/n/nadf8304c32a1 · https://www.figma.com/blog/five-figma-weave-workflows/

**Lange Jobs.** Belegt ist: (a) **Kostentransparenz vor dem Lauf** — «You can see the approximate credit cost before processing» (https://www.banani.co/blog/figma-weave-review); (b) **parallele Läufe** — «I can have seven flows running at the same time and come back when I'm ready to pick them up» (https://www.figma.com/blog/connecting-figma-and-weave/); (c) Läufe starten **nur auf «Run»** (pro Node oder für eine Selektion/den ganzen Workflow, note.com); (d) auch simple Workflows brauchen Minuten (https://agentaya.com/ai-review/weave/). **Queue-UI, Fortschrittsbalken, Abbruch-Semantik: nicht belegbar** — kein Review beschreibt ein Warteschlangen-Management.

**Vergleich zu unserem Bridge-Job-Modell.** KosmoVis hat hier ein *ehrlicheres* Modell als alles, was für Weave dokumentiert ist: expliziter Lebenszyklus `gesendet → wartetFreigabe → wartetGpu → rendert → fertig/fehler/abgebrochen/zeitueberschreitung` (`vis-runtime.ts:23-31`), EIN Status-Mapper von der Bridge (`vis-jobs.ts:83-103`), Worker + Phase + Prozent direkt am Node (`NodeCanvas.tsx:2161-2165`), Freigabe-Schritt (`NodeCanvas.tsx:2109`) und 10-Minuten-Timeout-Wächter (`vis-runtime.ts:58`). Was uns fehlt und Weave belegt vormacht: **Kosten-/Aufwandsvorschau vor dem Run** und die Selbstverständlichkeit **vieler paralleler Läufe** als beworbenes Arbeitsmuster (unser Poll/Runtime kann mehrere Läufe, die UI erzählt es aber nicht).

---

## 6. Reverse-Engineering-Ableitung für KosmoVis

Vorbemerkung zur Vergleichsbasis (heutiger Stand, belegt):
- Verbinden nur per Port-Drag; Drop auf leerer Fläche **verwirft** die angefangene Kante kommentarlos (`NodeCanvas.tsx:1140` `if (pending) setPending(null)`); Verbinden-Commit `NodeCanvas.tsx:1430-1438`.
- Node-Erzeugung nur über Palette (Insel GRAPH, `island/inhalte/graph.tsx:31 ff.`; Katalog `island/vis-island-katalog.ts:80-134`, 15 Werkzeuge/5 Inseln) — kein Kontextmenü, kein Tastatur-Quick-Add (kein `contextmenu`-Handler, kein Tab-Menü in `NodeCanvas.tsx`).
- Kein Duplizieren: der Kernel kennt nur `vis.graphErstellen/nodeSetzen/nodeParametrieren/nodeSchieben/verbinden/trennen/nodeLoeschen/nodeKollabieren/graphLoeschen/render` (`packages/kosmo-kernel/src/commands/vis.ts:29-245`).
- Mehrfachauswahl/Marquee/Escape vorhanden (`NodeCanvas.tsx:418-435`, `:563-571`, `:1056-1100`), Gruppen-Drag + Ausrichten vorhanden; Zoom per Wheel mit Klemme 0.25–2.5 (`NodeCanvas.tsx:69-70`, `:554-561`); Grid-Snap 24px (`:73-77`); Minimap (`:82-84`); Ortho/Kurven-Routing (Insel `routing`).
- Inline-Ergebnis im Node vorhanden (`BridgeBild`, `lauf.bild`), Varianten-Kuration über `KuratierFlaeche.tsx`/`varianten-diff.ts`, `vergleich`-Node (`NodeCanvas.tsx:155`).
- Params leben **im Node-Körper** (Formulare inline, committen bei blur, `NodeCanvas.tsx:47-51`) — anders als Weaves rechtes Settings-Panel.

**Direkt übernehmbar** (gleiches Interaktionsproblem, belegtes Weave-Muster) vs. **nur Inspiration** (Weave-Kontext Cloud/Credits/Media ist ein anderer) — siehe Tabelle.

---

## Empfehlungen 0.9.0 (priorisiert)

| # | Empfehlung | Weave-Vorbild (Beleg) | KosmoVis heute (Datei:Zeile) | Aufwand | Nutzen / Einordnung |
|---|---|---|---|---|---|
| 1 | **Kanten-Drop auf leere Fläche öffnet typkompatibles Node-Menü** und verbindet automatisch | «drag from an output and release it on the canvas, an options menu will appear» (help.weavy.ai/…/14688276-connecting-edges-wires, indirekt) | Drop verwirft die Kante: `NodeCanvas.tsx:1140`; Porttypen für die Filterung existieren (`VisPortTyp`, `:103-110`) | **M** | Grösster Flow-Gewinn beim Graphaufbau; touch-tauglich (Finger-Drag + Antippen). **Direkt übernehmbar** |
| 2 | **Klick-Klick-Verbinden** (Output antippen, dann Input antippen) als Alternative zum Drag | «You can also click Output and then click Input to connect them automatically» (note.com/momotaro_ai/n/nadf8304c32a1) | Nur Drag (`pending` startet bei pointerdown am Port, `NodeCanvas.tsx:1462`) | **S** | Erste Klasse für iPad/Touch (unser Pflichtziel, das Weave selbst nicht belegt abdeckt). **Direkt übernehmbar** |
| 3 | **Node-Duplizieren mit Verbindungen** (neues Command `vis.nodeDuplizieren` + Ctrl/Cmd+D, Alt-Drag) | Cmd/Ctrl+D bzw. Cmd/Ctrl+Shift+D / Alt-Drag «maintaining all of their connections intact» (help.weavy.ai/…/14688389 + Delights #4, indirekt) | Kein Duplizieren im Command-Satz (`commands/vis.ts:29-245`) | **S** | Varianten bauen heisst heute: neu setzen + neu verdrahten + neu parametrieren. **Direkt übernehmbar** |
| 4 | **Tab-/Suchmenü zum schnellen Node-Einfügen** (Quick-Add am Cursor, durchsucht `VIS_NODE_KATALOG`) | «Tab to open the quick node search» (help.weavy.ai/…/14688389, indirekt) | Nur Palette in Insel GRAPH (`island/inhalte/graph.tsx:31 ff.`) | **S/M** | Tastatur-Profis; ergänzt, ersetzt die Insel nicht. **Direkt übernehmbar** |
| 5 | **Canvas-Kontextmenü / Long-Press** (Node erstellen, Einfügen, Ansicht) | «Right-click anywhere on the canvas to create them» (banani.co/blog/figma-weave-review) | Kein `contextmenu`-Handler in `NodeCanvas.tsx` | **M** | Zweiter fingerfreundlicher Erzeugungsweg (Long-Press = Touch-Äquivalent). **Direkt übernehmbar** |
| 6 | **Batch-/Iterator-Muster verallgemeinern**: Ergebnis-Node mit Display-Modes (eins/alle/Batch) + «Auspacken» in Einzel-Nodes | Iterator-Nodes + Display-Modes + Unpack (Delights #2/#3, indirekt; note.com) | Punktuell: «Drei Stimmungen»-Baustein, `vergleich`-Node (`NodeCanvas.tsx:155`), Kuratier-Fläche (`KuratierFlaeche.tsx`) | **L** | Systematisches Varianten-Iterieren statt Einzelfälle; passt zur Kuratier-Fläche. **Inspiration** (Weave iteriert Cloud-Prompts, wir Render-Parameter/Kameras/Stimmungen) |
| 7 | **Aufwands-/Kostenvorschau am Render-Node vor «Ausführen»** (geschätzte Renderzeit/GPU-Last statt Credits) | «You can see the approximate credit cost before processing» (banani.co/blog/figma-weave-review) | Kein Vorab-Schätzwert; Status erst nach Absenden (`vis-jobs.ts:83-103`, `NodeCanvas.tsx:2161-2165`) | **M** (braucht Contract-Erweiterung Richtung Bridge) | Ehrlichkeit vor dem Klick — deckt sich mit dem Owner-Mandat «ehrlich benennen». **Inspiration** (Credits ≠ lokale GPU) |
| 8 | **Parallele Läufe sichtbar erzählen**: kleine Lauf-Übersicht (n Läufe offen, je Node-Sprungmarke) | «seven flows running at the same time and come back when I'm ready» (figma.com/blog/connecting-figma-and-weave/) | Runtime kann parallele `NodeLauf`e (`vis-runtime.ts:34-49`), UI zeigt sie nur je Node | **M** | Macht die vorhandene Stärke sichtbar; Anker: Insel AUSTAUSCH. **Direkt übernehmbar** (UI-only) |
| 9 | **Mehrfach-Verbinden aus Selektion** (Kante aus einer Auswahl ziehen verbindet alle) + Shift-Hover-Connect | Delights #4 (indirekt) | Auswahl existiert (`NodeCanvas.tsx:418-435`), Kanten immer 1:1 | **M** | Nische; erst nach #1–#3. **Direkt übernehmbar** |
| 10 | **@-Variablen im Prompt-Node** (benannte Bausteine, im Graph wiederverwendbar) | «type the '@' symbol» to extract reusable variables (note.com) | Prompt-Komposition fest verdrahtet (`renderPromptBausteine`, `kombiniertePrompt`, `vis-jobs.ts` Import `NodeCanvas.tsx:27`) | **L** | Mächtig, aber erst sinnvoll, wenn Prompt-Ketten länger werden. **Inspiration** |
| 11 | **Gruppen als Doc-Objekt** (benannter Rahmen, Farbe aus Kategorie-Hue/Akzent, kollabierbar) | Cmd+G-Gruppen mit Farbe (note.com) | Auswahl ist transienter Laufzeit-State (`NodeCanvas.tsx:418-421`); nur Einzel-Node-Kollaps (`vis.nodeKollabieren`) | **L** (Yjs/Undo-fähiges Modell nötig) | Ordnung in grossen Graphen; Farbdisziplin nach Werkplan-Konzept. **Inspiration** |
| 12 | **Gerade Kante als dritter Routing-Stil** (Bezier/Elbow/Line-Parität) | Wire-Styles Bezier/Elbow/Line (note.com) | Ortho/Kurve vorhanden (`vis-island-katalog.ts:91`) | **S** | Kosmetik, tiefste Priorität. **Direkt übernehmbar** |

**Bewusst NICHT übernehmen:** rechtes «Detailed Settings»-Panel (unsere Params-im-Node sind touch-näher und E2E-verdrahtet, `NodeCanvas.tsx:47-51`); Credit-System; App-/Output-Modus (Weaves «Output node → simple operation screen», note.com — unsere Insel-Bedienung IST bereits die vereinfachte Sicht über dem Graph, `vis-island-katalog.ts`); Auto-Run-Verhalten gibt es bei Weave ohnehin nicht — «Render nur auf Ausführen» bleibt (`NodeCanvas.tsx:51`).

---

## Offene Fragen an den Owner

1. **Hands-on-Konto:** Soll ein Free-Konto bei weave.figma.com angelegt werden (150 Credits), um Touch-Verhalten, Theme/Farbcodierung und das Undo-Modell am lebenden Objekt zu prüfen? Diese drei Punkte sind per Web-Text **nicht belegbar** und betreffen direkt unsere 0.9.0-Entscheide.
2. **Priorität Touch vs. Tastatur:** Empfehlung #2/#5 (Klick-Klick, Long-Press) zuerst — einverstanden, dass Tastatur-Parität (#4) dahinter zurücksteht, obwohl Weave tastaturlastig ist?
3. **Contract-Erweiterung für #7:** Darf `render-scene/v1` (kosmo-contracts) um eine Schätz-Antwort der Bridge erweitert werden (Renderzeit-Prognose), oder soll die Vorschau rein clientseitig (Heuristik aus Samples×Auflösung) bleiben?
4. **Gruppen im Doc-Modell (#11):** 0.9.0 oder später? Braucht ein neues Yjs-/Undo-fähiges `vis.*`-Command-Paar und ist der grösste Einzelbrocken der Liste.
5. **Gestaltungs-Kurs:** Bestätigung, dass KosmoVis beim Werkplan-/Tinte-Duktus bleibt und Weave nur interaktions-, nicht stilprägend ist (Abschnitt 4).

---

## Quellenverzeichnis (18 Quellen)

**Primär (Figma, direkt abrufbar):**
1. https://www.figma.com/blog/welcome-weavy-to-figma/ (Ankündigung Übernahme/Produkt)
2. https://www.figma.com/blog/connecting-figma-and-weave/ (24.06.2026, Integration/Beta)
3. https://www.figma.com/blog/five-figma-weave-workflows/ (Workflow-Anatomie)
4. https://help.figma.com/hc/en-us/articles/35965787376919-Figma-Weave-FAQ (Status/Abrechnung)
5. https://weave.figma.com/pricing (Preise; via Such-Snippet bestätigt)

**Offizielles Weave-Hilfezentrum (indirekt — HTTP 403 für Direktabruf, Inhalte via Such-Snippets):**
6. https://help.weavy.ai/en/articles/14688389-keyboard-shortcuts
7. https://help.weavy.ai/en/articles/14688276-connecting-edges-wires
8. https://help.weavy.ai/en/articles/12292386-understanding-nodes
9. https://help.weavy.ai/en/articles/12343281-iterators
10. https://help.weavy.ai/en/articles/12268300-helpers-overview
11. https://help.weavy.ai/en/articles/14878372-new-figma-weave-delights-2, …/15068263-…-3, …/15263628-…-4
12. https://help.weavy.ai/en/articles/12267070-figma-weave-s-subscription-plans

**Sekundär (Reviews/Anleitungen/News):**
13. https://note.com/momotaro_ai/n/nadf8304c32a1 (ausführlichste Drittanleitung: Nodes, Panels, Präferenzen, Preise)
14. https://www.banani.co/blog/figma-weave-review (Hands-on-Review: Rechtsklick, Run, Kostenvorschau)
15. https://agentaya.com/ai-review/weave/ (Review: Onboarding, Tempo, App-Modus)
16. https://www.houseofgai.com/blog/node-based-ai-tools-weavy-figma-weave (Branching/Positionierung)
17. https://siliconangle.com/2025/10/30/figma-acquires-ai-design-startup-weavy-reported-200m/ + https://en.globes.co.il/en/article-figma-acquires-israeli-startup-weavy-for-200m-1001525172 (Deal-Fakten)
18. https://www.scopeful.org/tools/figma-weave (Preis-Querprüfung)
