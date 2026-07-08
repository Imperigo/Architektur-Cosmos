# Interop-Konzept — Block G: Synchro & fliessender Software-Übergang

> Stand 08.07.2026. Owner-Auftrag (V1.6, Block G in `docs/V16-AUFTRAG-PLAN.md`,
> Owner-Zusatz 07.07.): «Synchro und Anbindung mit ArchiCAD ausbauen …
> Referenz Apple-Ökosystem … fliessender Software-Übergang statt hartem Cut»
> — «dito Rhino, Grasshopper, AutoCAD, Vectorworks, Blender, Cinema4D,
> Photoshop/InDesign/Illustrator». Dieses Dokument ist das G-0-Konzept, das
> `V16-AUFTRAG-PLAN.md` bereits ankündigt und in Grundzügen skizziert
> (Formel «BIM-Vollaustausch IFC / 2D-Planaustausch DXF-DWG / Geometrie-Mesh
> GLB-OBJ / Grasshopper als Live-Draht-Idee / Adobe über SVG-PDF / Apple-
> Ökosystem als Referenz-Vorbild») — hier wird diese Skizze am realen
> Code-Ist-Stand geprüft, mit Belegen versehen und zu einem Batch-Plan
> verdichtet. Reine Doku, kein Produktivcode. Quellenlage: der Interop-Code
> selbst (`dxf/`, `ifc/`, `derive/gltf.ts`, `modules/asset/glb-zu-mesh.ts`,
> `derive/plansvg.ts`, `modules/design/export-plan.ts`,
> `modules/publish/export-sheets.ts`, `derive/publikation.ts`,
> `derive/katalog.ts`, `modules/design/splat-import.ts`/`video-splat.ts`),
> `ROADMAP.md` (zitierte Nummern 7/8/83/85/90/98/104/105/113–118/124/148/
> 204–212), `docs/RE-ARCHICAD.md`, `docs/SUBMISSION-KONZEPT.md`. Kein
> Internet verwendet — reiner Ist-Stand-Abgleich, kein Produktrecherche-
> Dossier wie RE-ARCHICAD.

---

## 1. Leitbild «fliessender Übergang»

Der Owner nennt das Apple-Ökosystem als Vorbild: ein Projekt, das auf dem
iPad beginnt und am Mac weiterlebt, ohne dass man je über ein Dateiformat
nachdenkt. Für ein Architekturbüro mit ArchiCAD als Referenzwerkzeug
(`docs/RE-ARCHICAD.md`, Owner-Mandat Q9) heisst das übersetzt: **KosmoOrbit
darf nie ein Alles-oder-Nichts-Umstieg sein.** Drei Prinzipien, jedes am
Code geprüft:

1. **Kontinuität — dieselbe Datei läuft in beiden Welten weiter.** Kein
   Export ist eine Einbahnstrasse. Belege: der DXF-Roundtrip
   `planGraphicToDxf → parseDxf` ist geometrisch identisch bis auf 1/1000 mm
   (Abnahmekern von ROADMAP 206, C-E1 in `SUBMISSION-KONZEPT.md`); der
   IFC-Import baut nicht nur einen Referenz-Layer, sondern bietet über
   `derive/bestand.ts` (`erkenneWand`/`erkenneDecke`) eine **editierbare
   Übernahme** an — ein aus ArchiCAD importiertes Bauteil kann in KosmoOrbit
   weiterleben, nicht nur daneben stehen (Knopf `bestand-uebernehmen`,
   `apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx:627`).
2. **Handoff = definierte Übergabepunkte je SIA-Phase.** Welches Format
   sinnvoll ist, hängt von der Phase ab, nicht von Beliebigkeit:
   Vorprojekt/Bauprojekt tauschen über **IFC** (Volumen, Fachplaner-
   Koordination, Bauteilsemantik), Werkplan/Submission über **DXF**
   (Ausschreibungs- und Ausführungspläne, `docs/SUBMISSION-KONZEPT.md`
   Abschnitt 1.2: «Werkplan-Niveau 1:50 als Kern des Ausschreibungs-
   Plansatzes»). Der Submissions-Kreislauf (Abschnitt 2c) ist der Beweis,
   dass diese Phasenlogik im Code lebt, nicht nur im Konzept.
3. **Kein Lock-in während der Einführungsphase.** Ein Büro kann in ArchiCAD
   weiterzeichnen und nur Teilmodelle spiegeln, bis der Umstieg reif ist —
   niemand zwingt zum Rundumumstieg an einem Stichtag.

**Ehrlich:** Das Apple-Bild wird nicht wörtlich erfüllt — es gibt kein
automatisches Format-Erraten wie AirDrop. Der reale Hebel, den KosmoOrbit
stattdessen baut, ist die **Ehrlichkeit über den Verlust**: jeder
Import-Pfad trägt heute schon einen eigenen Bericht (`DxfImportBericht` mit
`layerUnklassiert`/`bloeckeNichtAufgeloest`/`unbekannteEntities`, die
IFC-Kontext-Meldung im UI), aber es gibt **noch keinen vereinheitlichten
Format-Umschalter**, der automatisch das beste verfügbare Format probiert
und einen einzigen Bericht «verlustfrei/gemappt/geschätzt» zeigt — das ist
der in `V16-AUFTRAG-PLAN.md` skizzierte «Übergabe»-Modus (G-5) und bleibt
GEPLANT (Abschnitt 5).

---

## 2. ArchiCAD-Rundreisen, heute real belegbar

### (a) KosmoOrbit → ArchiCAD

**IFC4-Export** (`packages/kosmo-kernel/src/ifc/export.ts`, ROADMAP 7/83/85,
CLAUDE.md: «ifcopenshell-verifiziert»):

- Schrittfolge: `exportIfcFile()` (`apps/kosmo-orbit/src/modules/design/export-plan.ts:77`)
  → eigener SPF-Writer (`SpfWriter`, keine Fremdbibliothek) → `.ifc`-Datei →
  ArchiCAD-Import über den IFC-Translator.
- Format: IFC4, Millimeter, Projektbaum Project→Site→Building→Storeys.
- **Verlustfrei**: Wände als `IFCWALL` (SweptSolid + echte
  `IFCOPENINGELEMENT`-Voids für Fenster/Türen), Decken (`IFCSLAB`), Stützen/
  Unterzüge (`IFCCOLUMN`/`IFCBEAM`, A3-Bauteile), Zonen als `IFCSPACE` (mit
  SIA-Klasse im Namen), Möbel als `IFCFURNISHINGELEMENT`, FreeMesh als
  wasserdichter `IFCFACETEDBREP` (jedes Dreieck eine `IFCFACE`), Umbau-Status
  (Bestand/Neu/Abbruch) als `Pset_KosmoUmbau`.
- **Verloren**: der IFC-Export bildet je Wand nur **ein** Material ab (die
  tragende Kernschicht, `IFCRELASSOCIATESMATERIAL` auf `core =
  assembly.layers.find(l => l.function === 'tragend')`, Zeile 186–192 in
  `ifc/export.ts`) — die volle Mehrschicht-Aufbau-Struktur (Dämmung,
  Bekleidung, Dichtung mit je eigenem Material/Dicke) geht **nicht** als
  `IFCMATERIALLAYERSET` mit. Es existiert genau ein Pset im ganzen Export
  (`Pset_KosmoUmbau`) — keine eBKP-Klassifikation, keine U-Wert-/Rw-Psets.
  ArchiCAD sieht also die richtige Geometrie und den richtigen Bauteiltyp,
  aber nicht den vollen Schichtaufbau als strukturierte Eigenschaft (nur
  optisch über die Wanddicke).

**DXF-R12-Export** (`packages/kosmo-kernel/src/dxf/export.ts`, ROADMAP 204):

- Schrittfolge: `exportPlanDxf()` (`export-plan.ts:62`) → `planToDxf(doc,
  storeyId)` → dieselbe `derivePlan`-Geometrie wie SVG/PDF → `.dxf` → in
  ArchiCAD/AutoCAD/Vectorworks öffnen.
- Format: AutoCAD R12 (AC1009) ASCII, mm (`$INSUNITS=4`), **ezdxf-Audit: 0
  Fehler** (der Selbsttest fand vorher einen echten R2000-LWPOLYLINE-Bug und
  wechselte deshalb bewusst auf R12 als robustesten Nenner).
- **Verlustfrei**: Liniengeometrie, geschlossene Polylinien (Poché), Bögen,
  Texte, Rasterachsen — jeweils auf einem **semantischen Layer**
  (`LAYER_REGELN`: TRAGEND/DAEMMUNG/FENSTER/TUEREN/TREPPE/BRUCHLINIE/
  ACHSEN/TEXT/…, ACI-Farben deklariert).
- **Verloren**: DXF ist reine 2D-Geometrie — keine Bauteil-Identität, keine
  Eigenschaften, keine ArchiCAD-Sinnbildbibliothek (ein ArchiCAD-Sinnbild für
  «Backstein» entsteht dort neu aus der Layerzuordnung, nicht aus einem
  mitgelieferten Symbol). Für Bauteile mit Eigenschaften bleibt IFC der Weg
  (so auch im Kopfkommentar von `dxf/export.ts` festgehalten).

### (b) ArchiCAD → KosmoOrbit

**IFC-Import** (`apps/kosmo-orbit/src/modules/design/ifc-import.ts` +
`packages/kosmo-kernel/src/derive/bestand.ts`):

- Schrittfolge: ArchiCAD exportiert IFC4/IFC2x3 → `importIfc(data)` (web-ifc,
  MPL-2.0) tessellliert alle Elemente zu Kontext-Meshes (grau, nicht wählbar,
  nicht synchronisiert — Referenz-Layer im Viewport) **und** sammelt parallel
  Wand-/Deckenkandidaten (`IFCWALL`/`IFCWALLSTANDARDCASE`/`IFCSLAB`) →
  `erkenneWand`/`erkenneDecke` rechnen ein minimales umschliessendes Rechteck
  (rotating calipers über die konvexe Hülle) und liefern eine
  Wand-/Deckenspezifikation **oder ehrlich `null`**, wenn die Form nicht
  quaderartig ist (Füllgrad < 0.55, L-/T-Footprint) → Knopf «Bestand
  übernehmen» (`bestand-uebernehmen`) wandelt die Erkennung in echte,
  editierbare `Wall`-/`Slab`-Entities.
- **Verlustfrei/gewonnen**: die reine Geometrie kommt immer verlustfrei als
  Kontext-Layer mit; erkannte Wände/Decken werden zu vollwertigen,
  editierbaren KosmoOrbit-Bauteilen — origineller als ArchiCADs 1:1-Import
  (der jede Rohgeometrie unverändert übernimmt, auch was hier bewusst
  abgelehnt wird, RE-ARCHICAD 2.9).
- **Verloren**: alles, was nicht quaderartig ist (Rundungen, Vorsprünge,
  komplexe Profile), bleibt reiner Kontext — keine automatische
  Bauteilwerdung; IFC-Eigenschaften/Psets aus ArchiCAD werden beim Erkennen
  nicht übernommen (nur Geometrie zählt).

**DXF-Import als Referenz-Overlay + Diff-Karten**
(`packages/kosmo-kernel/src/dxf/import.ts`, ROADMAP 205–212):

- Schrittfolge: ArchiCAD/AutoCAD exportiert DXF → `parseDxf()`
  (Gruppencode-Tokenizer, liest `LINE`/`POLYLINE`+`VERTEX`+`SEQEND`/`ARC`/
  `TEXT`, tolerant `LWPOLYLINE`/`MTEXT`; `INSERT`/Blöcke werden **gezählt,
  nicht aufgelöst**, unbekannte Entities landen namentlich im Bericht) →
  `DxfGraphic` (struktureller `PlanGraphic`-Spiegel: `regions`/`lines`/
  `arcs`/`texte` mit `layer` statt `classes`) → `semantikFuerLayer` ordnet
  eigene Export-Layer sowie verbreitete Fremdkonventionen (AIA `A-WALL`,
  deutsche Praxis `MAUERWERK`/`STÜTZE`) einer Kosmo-Klasse zu, unklassierte
  Layer bleiben ehrlich `null` und stehen im Bericht.
- Overlay: `unternehmerplan.ts` (`apps/kosmo-orbit/src/modules/design/`)
  legt das `DxfGraphic` als Laufzeit-Layer (nie im Doc) halbtransparent über
  den Architektenplan (Akzentblau, `pointerEvents:none`) — reines
  Durchpausen, C-E5.
- Diff-Karten: `derive/planabgleich.ts` vergleicht `derivePlan` (eigene
  Seite) gegen `DxfGraphic` (Unternehmerseite), klassiert je Segment
  `unveraendert`/`verschoben`/`neu`/`entfernt`/`text-geaendert`. **Stufe 1**
  (sicher zuordenbar, z.B. eine parallel verschobene tragende Wand mit
  Konfidenz ≥ 0.8) wird zum `runCommand`-Vorschlag (`design.verschieben`) —
  Anwenden läuft durch **denselben** Command-Weg wie ein Klick (atomare
  Undo-Gruppe, Yjs-Sync, Journal). **Stufe 2** (alles Unsichere) bleibt reine
  Markierungs-Karte am Overlay, der Architekt zeichnet selbst.
- **Verlustfrei**: Geometrie, Layerbezeichnung, Textinhalt.
- **Verloren**: Bauteil-Identität (der Diff ist geometrisch, nicht
  semantisch — SUBMISSION-KONZEPT C-E3); Blöcke/`INSERT` werden nicht
  aufgelöst; Rotation eines fremden Nullpunkts wird nie automatisch
  geschätzt (nur Translation, ab 50 % Fehlquote, C-E3).

### (c) Der Submissions-Kreislauf als Paradebeispiel

Der volle Bogen aus `docs/SUBMISSION-KONZEPT.md`, in der Kette ROADMAP
205–212 gebaut und in `e2e/sim-submission.spec.ts` (ROADMAP 212)
durchgespielt:

```
1  Projekt in Werkplan-Phase, Bauteile mit Aufbauten
2  submissionsreifePruefen (derive/submissionsreife.ts, C1/ROADMAP 207)
   → Lückenliste «undefiniert = Nachtragsrisiko» (SIA 118 Art. 86–89)
3  Lücken schliessen → 0 Lücken → Submissionsreife erreicht
4  DXF-Plansatz-Export als Ausschreibungsunterlage (exportPlanDxf)
5  Unternehmer bearbeitet in ArchiCAD/AutoCAD/Vectorworks, schickt DXF zurück
6  unternehmerplanImportieren(dxf) → Overlay + Diff-Bericht
7  Stufe-1-Karte bestätigen → runCommand → Wand-Achse beweisbar verschoben
   → Undo macht es exakt rückgängig
8  Ehrlichkeits-Assert: Match-Quote im Bericht («n von m als Vorschlag,
   Rest markiert»), keine unklassierten Layer
```

Das ist der «fliessende Übergang» in Reinform: dieselbe Geometrie überquert
die Formatgrenze zweimal (raus als Ausschreibung, rein als Unternehmer-
Rücklauf), und **jeder** Schritt trägt einen Ehrlichkeitsbericht statt
stillen Vertrauens.

**Ehrlich:** PDF-Rückläufe — laut `SUBMISSION-KONZEPT.md` §2 der
**Normalfall**, nicht die Ausnahme («saubere DXF-Layerwelten sind die
Ausnahme, PDF der Normalfall») — sind ein reiner KI-Assistenzpfad (C-E6/C5),
der im Code als Konzept beschrieben, aber **noch nicht gebaut** ist
(SUBMISSION-KONZEPT Batch-Plan, C5 offen). DWG bleibt bewusst draussen
(C-E7): das UI weist `.dwg` vor jedem Leseversuch ab («bitte als DXF
exportieren», ROADMAP 210).

---

## 3. Verlust-Matrix ArchiCAD

Was IFC/DXF **nicht** transportieren, ehrlich benannt, mit der jeweiligen
Milderungsstrategie und ihrer eigenen Grenze:

| # | Was verloren geht | Warum (Code-Beleg) | Milderungsstrategie | Grenze der Milderung |
|---|---|---|---|---|
| 1 | **Aufbauten-Details** (Mehrschicht-Composite mit Funktion/Priorität) | IFC-Export bildet nur die tragende Kernschicht als `IFCRELASSOCIATESMATERIAL`-Material ab (`ifc/export.ts:186–192`) — kein `IFCMATERIALLAYERSET` | Katalog-Transfer `.json` (`derive/katalog.ts`, A8/ROADMAP 115) trägt die volle `AssemblyLayer`-Struktur mit Funktion je Schicht | Nur **Kosmo-intern** (Projekt→Projekt) — der Katalog fliesst nicht nach ArchiCAD zurück; Format-Bruch bleibt zu ArchiCAD hin bestehen |
| 2 | **2D-Symbolik-Feinheiten** (ArchiCAD-GDL-Sinnbilder, Stiftsatz-Feinheiten) | DXF trägt nur eigene Geometrie/Text, keine ArchiCAD-Blockdefinitionen (`dxf/export.ts` schreibt `LINE`/`POLYLINE`/`TEXT`, keine `BLOCK`-Records) | Layer-Namenskonvention hält Semantik fest (`LAYER_REGELN` beim Export, `semantikFuerLayer` beim Import) — ArchiCAD kann eigene Darstellungsregeln je Layer setzen | Die konkrete Sinnbild-**Form** entscheidet weiterhin ArchiCAD selbst neu, nichts wird mitgeliefert |
| 3 | **Blattlayouts/Plankopf** | `Sheet`-Entity ist Kosmo-intern; weder IFC noch DXF noch GLB kennen ein Blatt-Konzept | Publikations-Set-Namenskonvention (`derive/publikation.ts`, `setDateiname`, Default `P-{nr}_{blatt}_{massstab}`, ROADMAP 114) hält wenigstens stabile Dateinamen; der fertige Plankopf geht als PDF/SVG raus (`exportSheetSetPdf`/`exportSetSvgs`) | Kein editierbares Layout — ArchiCAD bekommt ein fertiges Blatt-Bild, kein Master-Layout-Objekt |
| 4 | **GDL-Objekte** (parametrische Bauteile, Herstellerbibliotheken) | Bewusst nie nachgebaut — GDL ist Graphisoft-proprietär, ein Nachbau wäre Lock-in ohne das Ökosystem (RE-ARCHICAD 2.7/4.2) | Eigener TypeScript-Katalog (`@kosmo/data`) + GLB-Referenzteile, Austausch über IFC/GLB-Geometrie statt Objektskript | Kein Zugriff auf Herstellerbibliotheken; jedes Objekt ist entweder Kosmo-Katalog oder rohe Mesh-Geometrie |
| 5 | **Referenz-Unterlagen (Trace & Reference)** | ArchiCADs generisches «beliebige-Datei-unterlegen» (DWG-Unterlage) ist bewusst nie gebaut | Eigenes Trace (Geschoss-Unterlegung, A8/ROADMAP 115) + DXF-Referenz-Overlay für den Unternehmerplan-Fall (C4b/ROADMAP 210) | Funktional nur für die zwei konkret gebauten Fälle (eigenes Geschoss, DXF-Import) — kein generischer Unterlage-Import beliebiger Formate |
| 6 | **eBKP-Klassifikation + weitere Psets** (U-Wert, Rw, Kosten) | Kein Feld im Datenmodell trägt eBKP heute (`ifc/export.ts` kennt nur `Pset_KosmoUmbau`); RE-ARCHICAD 2.13 nennt das ausdrücklich einen offenen Owner-Entscheid | Keine im Code — echter GEPLANT-Punkt | Siehe Batch G1 (Abschnitt 5) |

**Ehrlich:** Diese Matrix ist bewusst nicht «wird irgendwann alles
geschlossen» — Zeile 4 (GDL) und ein Teil von Zeile 3 (natives Layout-
Format) bleiben **architektonische Entscheide**, keine Rückstände (RE-ARCHICAD
Abschnitt 4: «Lokal-first statt BIMcloud», «Ein Doc statt Attribut-Zoo»).
Zeile 1 und 6 sind dagegen reale, schliessbare Lücken — sie stehen im
Batch-Plan.

---

## 4. Per-Tool-Matrix

Status-Legende wie in `docs/RE-ARCHICAD.md`: **●** heute voll · **◐**
teilweise · **○** geplant, nicht gebaut · **—** bewusst nie (mit Begründung).
Jede Zeile trägt ihren Beleg (Pfad oder ROADMAP-Nummer).

| Tool | Zweck im Büro | Format(e) | Richtung | Status |
|---|---|---|---|---|
| **Rhino** | Freiform-Geometrie, Fassadenstudien | kein natives `.3dm` (kein `rhino3dm`/`.3dm`-Code im Repo — Grep negativ); DXF, IFC, GLB | beidseitig (DXF/IFC), GLB beidseitig | ◐ HEUTE über DXF (`dxf/export.ts`+`dxf/import.ts`) für 2D-Kurven, IFC (`ifc/export.ts`) für Bauteil-Geometrie, GLB für Mesh (`derive/gltf.ts` raus, `glb-zu-mesh.ts` als FreeMesh-Übernahme rein). ○ GEPLANT: Rhino.Inside als Live-Bridge-Idee — reine Zukunftsnotiz, kein Code, kein Batch |
| **Grasshopper** | Parametrische Studien | kein eigenes Dateiformat (Node-Graph-Werkzeug) | — | — bewusst anders: GH tauscht heute wie jedes andere Programm über DXF-/IFC-Geometrie, aber es gibt **keinen** KosmoOrbit-Endpunkt, den ein GH-Skript live füttert/liest (Grep über das Repo negativ; RE-ARCHICAD 2.13 bestätigt den bewussten Verzicht: «Kosmo-Commands sind die parametrische Schnittstelle, nicht ein Node-Graph zu Rhino»). Ein GH-Endpunkt bleibt **Forschungsposten** (V16-AUFTRAG-PLAN nennt nur «Konzept für einen Endpunkt»), kein G-Batch |
| **AutoCAD** | 2D-Werkpläne, Unternehmer-Rücklauf | DXF R12 | beidseitig | ● HEUTE: Export `packages/kosmo-kernel/src/dxf/export.ts` (ROADMAP 204, ezdxf-Audit 0 Fehler), Import `packages/kosmo-kernel/src/dxf/import.ts` (ROADMAP 206, Roundtrip-bewiesen ±0.001 mm) |
| **Vectorworks** | 2D-Werkpläne, BIM-Koordination | DXF + IFC | beidseitig | ● HEUTE: dieselben Export-/Importpfade wie AutoCAD/ArchiCAD — Vectorworks liest DXF R12 und IFC4 nativ, kein Sondercode nötig |
| **Blender** | Renderings, Studien, Bridge-Worker | GLB | beidseitig + Bridge-Worker | ● HEUTE: Export `packages/kosmo-kernel/src/derive/gltf.ts` (lesbare Objektnamen «Wand AW Beton 40 · EG» + deutsche Material-Slots, ROADMAP 124), Import `apps/kosmo-orbit/src/modules/asset/glb-zu-mesh.ts` («Als FreeMesh übernehmen», Budget-Wächter 4096 Vertices/8192 Faces). Getrennt davon: Blender als **Sim-Worker** für Wind/Sonnenstunden/Energie (`blender-sim.ts`-Contract, ROADMAP 177/179/181) — reine Physik, kein Geometrieaustausch; ehrlich `kein-blender-worker` ohne echten Worker (Physik wird nie gefakt) |
| **Cinema4D** | Renderings, Präsentation | GLB | raus (+ generisch rein über denselben Pfad) | ● HEUTE: derselbe GLB-Exportpfad wie Blender — C4D liest glTF/GLB nativ, kein Sondercode nötig |
| **Photoshop** | Renderbilder, Plakat-Bildmaterial | PNG/JPEG/WEBP (über Sheet-Umweg) | raus | ◐ HEUTE MÖGLICH, aber ein Umweg: ein Render landet über `bildAufsBlatt` (`apps/kosmo-orbit/src/modules/vis/NodeCanvas.tsx:806`) als `ImageAsset` auf einem `Sheet`, danach eingebettet in `exportSheetSetPdf`/`exportSetSvgs` (`apps/kosmo-orbit/src/modules/publish/export-sheets.ts`). **Kein direkter «Render als PNG speichern»-Knopf am Renderjob selbst** (Code-Suche negativ). `.psd` ehrlich **—** bewusst nie: kein Layered-Export, passt nicht zum «Derive statt Ebenen»-Architekturentscheid (RE-ARCHICAD Abschnitt 4.3) |
| **InDesign** | Plansatz-Layout, Publikationen | PDF | raus | ● HEUTE: `exportSheetSetPdf` (mehrseitig, Publikations-Sets ROADMAP 114, `derive/publikation.ts`). `.idml` ehrlich **○** GEPLANT als Batch-Idee (PDF/X-Profil, Abschnitt 5 G3) — kein natives InDesign-Format vorgesehen |
| **Illustrator** | Plangrafik, Weiterbearbeitung | SVG | **nur raus** | ◐ HEUTE: `planToSvg`/`exportPlanSvg` (`packages/kosmo-kernel/src/derive/plansvg.ts`, `apps/kosmo-orbit/src/modules/design/export-plan.ts`), `exportSetSvgs` (Publikations-Sets). **Kein SVG-Import** — Grep über das gesamte Repo (`packages/`, `apps/`) findet keinen SVG-Parser/Import-Pfad. Ehrlich als reiner Ausgabe-Weg benannt, nicht als «beidseitig» beschönigt |

**Ehrlich:** `.pln` (ArchiCAD-Nativformat), `.psd`, `.idml`, `.3dm` bleiben
bewusst nie native Formate — jeder Versuch, sie 1:1 nachzubilden, wäre
Lock-in in ein proprietäres Format ohne das dazugehörige Ökosystem
(RE-ARCHICAD Abschnitt 4). DWG jenseits von DXF bleibt SUBMISSION-KONZEPT
C-E7 (kein ODA-Konverter im Repo).

---

## 5. Batch-Plan G1…G5

Aufbauend auf der Skizze in `docs/V16-AUFTRAG-PLAN.md` («G-1 IFC-Roundtrip
härten → G-2 DXF/DWG-Import editierbar → G-3 Präsentations-Export → G-4
Mesh-Roundtrip → G-5 Übergabe-Modus»), hier scharf mit Scope/Modell/Abnahme:

| Batch | Scope | Modell/Nutzen | Abnahme | Ehrliche Grenze |
|---|---|---|---|---|
| **G1** | IFC-Composite-Export: `IFCMATERIALLAYERSET` für die volle `AssemblyLayer`-Schichtfolge statt nur der Kernschicht; zusätzliche Psets nur wo das Datenmodell sie wirklich hergibt (kein erfundener Normersatz, gleiche Regel wie `derive/checks.ts`) | Schliesst Verlust-Matrix-Zeile 1 (Aufbauten-Details) — grösste reale Lücke des IFC-Exports | ifcopenshell-Audit zeigt alle Schichten je Wand mit Funktion/Dicke/Material; Roundtrip-Test (eigener IFC-Export → eigener IFC-Import) liest die Schichtfolge zurück oder markiert ehrlich «nicht rekonstruierbar» bei Fremd-IFC ohne Layer | Keine eBKP-Klassifikation in diesem Batch (kein Feld im Modell — eigener Owner-Entscheid nötig, RE-ARCHICAD 2.13) |
| **G2** | DXF-Layer-Mapping-Editor: `semantikFuerLayer` von fester Code-Tabelle zu einer im Projekt speicherbaren, UI-editierbaren Regel (Layer-Name → Kosmo-Klasse), Aufnahme ins Katalog-Transfer-JSON (`derive/katalog.ts`) | Fremd-CAD-Büros mit eigenen Layer-Konventionen (nicht AIA/deutsch) werden ohne Code-Änderung anschlussfähig | Unit-Test: benutzerdefinierte Regel persistiert, Re-Import klassiert vorher unklassierte Layer korrekt; Katalog-Export/-Import trägt die Regel verlustfrei | Bleibt eine Daten-Tabelle, kein Ratealgorithmus (C-E2-Prinzip bleibt) |
| **G3** | Blattlayout-Export als PDF/X mit benannten PDF-Ebenen (Regionen/Bemassung/Text getrennt statt geflachtem SVG) für InDesign/Illustrator-Weiterverarbeitung | Mildert Verlust-Matrix-Zeile 3 so weit wie ohne natives Layout-Format möglich; direkter Nutzen für Photoshop/InDesign/Illustrator-Zeile der Tool-Matrix | Erzeugtes PDF öffnet in Acrobat/Illustrator mit den benannten Ebenen; Namensregel bleibt `P-{nr}_{blatt}_{massstab}` | Kein editierbares Blatt-Objekt — ArchiCAD/InDesign bekommen ein fertiges, ebenengruppiertes Bild, kein Master-Layout |
| **G4** | Mesh-Roundtrip härten: bei GLB-Budget-Überschreitung (>4096 Vertices/8192 Faces) einen benannten Teilbericht statt Alles-oder-Nichts-Ablehnung; optionale Teilauswahl (nur markierte Objekte als FreeMesh übernehmen) | Macht den Rhino-/Blender-/C4D-Rückweg für grössere Szenen alltagstauglich | Test mit absichtlich zu grossem GLB liefert benannten Teilbericht (welche Objekte NICHT übernommen wurden, mit Zahl) statt der heutigen Ablehnung ohne Differenzierung | Das harte Budget selbst bleibt (Buildplan §5 — kein CSG/Sculpting/NURBS, Owner-Entscheid) |
| **G5** | «Übergabe»-Modus + vereinheitlichter Interop-Bericht: ein Format-Umschalter beim Import probiert automatisch IFC vor DXF vor GLB und zeigt EINEN Bericht «verlustfrei/gemappt/geschätzt» statt der heute pro Weg unterschiedlichen Meldungen (`DxfImportBericht`, IFC-Kontext-Meldung) | Löst das Leitbild aus Abschnitt 1 vollständig ein — der grösste, integrierende Batch | Ein Import (gleiche Datei, egal welches Format) zeigt denselben Berichtsaufbau; Regressionstest: bestehende Einzelberichte (DXF/IFC) bleiben inhaltlich unverändert, nur die Präsentation vereinheitlicht sich | Baut auf G1–G4 auf, kein eigenständiger Erstbatch |

**Reihenfolge-Empfehlung:** **G1 zuerst** — reiner Kernel-Batch nach dem
Muster der ArchiCAD-Lücken A1/A3 (RE-ARCHICAD), schliesst die grösste reale
Verlust-Zeile und ist unabhängig von UI-Arbeit. Danach **G2** (klein, direkter
Nutzen für Fremd-CAD-Büros). **G3/G4** sind dateidisjunkt (Sheet-Export vs.
GLB-Import) und können parallel laufen. **G5** erst als integrierender
Abschlussbatch, wenn G1–G4 stehen. Der **Grasshopper-Endpunkt bleibt bewusst
ausserhalb dieser Liste** — kein G-Batch, sondern ein offener
Forschungsposten, der einen eigenen Owner-Entscheid braucht (lohnt sich der
Aufwand gegen den bestehenden Kosmo-Command-Weg als parametrische
Schnittstelle?).

---

## 6. Ehrlichkeits-Zusammenfassung

1. **Jede «HEUTE»-Zeile dieses Dokuments trägt einen Code- oder
   ROADMAP-Beleg** — keine Behauptung ohne Pfad/Nummer.
2. **DXF ist scharf, DWG bleibt bewusst vertagt, PDF ist Assistenz** — exakt
   dieselbe Dreiteilung wie in `SUBMISSION-KONZEPT.md` C-E1/C-E6/C-E7, hier
   auf den vollen Tool-Kranz übertragen.
3. **SVG ist heute ein reiner Ausgabeweg** — kein Import existiert; das ist
   der auffälligste Einzelbefund dieser Recherche und wird in der
   Tool-Matrix nicht beschönigt.
4. **IFC transportiert Bauteile, nicht die volle Aufbau-Tiefe** — die
   grösste reale Lücke (Verlust-Matrix Zeile 1) ist zugleich der empfohlene
   erste Batch (G1).
5. **Kein proprietäres Format wird nachgebaut** — `.pln`/`.psd`/`.idml`/
   `.3dm` bleiben aus Lock-in-Gründen aussen vor; der fliessende Übergang
   läuft über offene, geprüfte Formate (IFC4, DXF R12, GLB, SVG/PDF), nie
   über einen Fremdformat-Klon.
