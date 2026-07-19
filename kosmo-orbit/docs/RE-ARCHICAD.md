# RE-ARCHICAD — Reverse-Engineering-Dossier zu ArchiCAD 27/28 (Graphisoft)

> Stand 04.07.2026. Drittes Dossier der Reihe (nach `RE-FINCH.md`, `RE-VORFORM.md`),
> schliesst den letzten offenen Nachtrag aus `docs/TECH-RADAR.md`. Zweck ist hier ein
> anderer als bei Finch/Vorform: ArchiCAD ist kein Konkurrent, den wir sezieren,
> sondern **das Referenzwerkzeug des Owners** (tägliche Arbeit) und laut Owner-Mandat
> Q9 die erste Stufe des Werkzeug-Fahrplans («**ArchiCAD-Kern zuerst**, dann
> MassBody/Vorform, dann FreeMesh»). Der BIM-Kern von KosmoOrbit wurde ArchiCAD-
> inspiriert gebaut, aber nie systematisch dagegen abgeglichen — genau das leistet
> dieses Dossier: **jede ArchiCAD-Kernfunktion gegen den KosmoOrbit-Ist-Stand**, mit
> Datei-/ROADMAP-Verweisen und ehrlichem Status.
>
> Erstellt aus öffentlichen Quellen (Graphisoft-Hilfe, Produktseiten, Fachpresse,
> Community-Forum) plus Produktkenntnis; kein Zugriff auf eine ArchiCAD-Installation
> in dieser Umgebung. Quellenkürzel: **[H]** help.graphisoft.com (Versionsseiten
> AC25–28) · **[GS]** graphisoft.com (What's-new, Update-Notes) · **[AT]** Architosh
> (AC27-Review 03/2024, Building-Together 10/2023) · **[AV]** archvista.com
> (AC27-Features) · **[CB]** contrabim.com (AC28 Top 10) · **[C]** Graphisoft
> Community · **[K]** Produktkenntnis (breit dokumentiertes Standardverhalten,
> in dieser Session nicht einzeln per Link verifiziert — der Owner kann jede
> [K]-Zeile in seiner Installation direkt prüfen). Vollverzeichnis in Abschnitt 5.

---

## 1 · Was ArchiCAD ist

**Firma/Produkt.** Graphisoft (Budapest), seit 2007 Teil der Nemetschek Group;
ArchiCAD ist seit den 1980ern das architektenzentrierte BIM-Werkzeug («Virtual
Building») und in der Deutschschweiz neben Revit/Vectorworks der verbreitetste
BIM-Autor — inklusive etablierter SIA-Vorlagen (Stiftsätze, Plankopf, Ebenen-
standards der Büros). [K]

**Versionslage.** ArchiCAD 27 (Herbst 2023): Design Options, überarbeitete
Attribut-Verwaltung mit Ordnern, Distance Guides, Teamwork-Markups via BIMcloud,
AI Visualizer (Stable-Diffusion-Aufsatz). [AT, AV] ArchiCAD 28 (2024): Keynotes
(datenbankgestützte Beschriftung mit XML/Excel-Roundtrip), integrierter MEP
Designer, hierarchische Attribute, Suchleiste, verbesserte Grasshopper-Anbindung.
[H-Keynotes, GS, CB, C-Q&A] Seit 2025/26 vermarktet Graphisoft ein Jahres-Lineup
(«Graphisoft 2026») statt grosser Einzelreleases. [GS]

**Positionierung fürs Dossier.** ArchiCAD deckt den GANZEN Bogen ab (Entwurf →
Werkplanung → Auswertung → Planversand) mit einem einzigen, sehr grossen
Werkzeugkasten und einem attributgetriebenen Darstellungssystem (Ebenen, Stifte,
Überschreibungen, Ausschnitte). Seine Stärke ist die **Dokumentations-Maschine**;
seine Schwächen sind Konfigurationslast (Attribut-Pflege, Translator-Pflege) und
die Cloud-/Lizenz-Bindung — genau die Flanken, auf denen KosmoOrbit anders baut
(Abschnitt 4). Preise/Abo-Modelle wurden nicht erhoben (nicht dossierrelevant,
der Owner kennt sie).

---

## 2 · Feature-Abgleich ArchiCAD ↔ KosmoOrbit

Status je Zeile: **●** KosmoOrbit hat es · **◐** teilweise (ein Satz, was fehlt) ·
**○** fehlt · **—** bewusst nie (mit Begründung). Repo-Kurzpfade: `kernel/` =
`packages/kosmo-kernel/src/`, `app/` = `apps/kosmo-orbit/src/`.

### 2.1 Werkzeugkasten

| Werkzeug (ArchiCAD) | ArchiCAD-Kern | KosmoOrbit-Ist | Status |
|---|---|---|---|
| **Wand** | Referenzlinie, mehrschichtige Composites, Verschneidung automatisch, komplexe Profile [K] | `design.wandZeichnen` (Wall-Entity, `WallAlignment` zentrum/kern-aussen/kern-innen), Gehrung + Mehrfachknoten mit affinem Rückzug (ROADMAP 35), Schichtbänder im Schnitt (ROADMAP 37) | ● (komplexe Profile — z.B. Brüstungswand mit Vorsprung — fehlen) |
| **Tür/Fenster** | GDL-Bibliotheken, Anschläge, parametrische Teilungen, Vermassungs-Rückgaben [H-CustomComponents, K] | `Opening` (Fenster/Tür, Brüstung, Blockanschlag ROADMAP 96, Höhenmass «h/BH» in der Öffnungskette ROADMAP 93), Türsymbol mit Flügel, `design.fensterAusModulen` stanzt aus Fassadenmodulen (ROADMAP 78) | ◐ — Geometrie/Plan ja; parametrische Fenster-Vielfalt (Sprossen, Stürze, Sonderformen) fehlt |
| **Decke** | Slab mit Composites, Kanten-Winkel [K] | `design.deckeZeichnen` + Aufbau (`assemblyId`, Bodenaufbau → Koten roh/fertig ROADMAP 94, Rohboden-Linie ROADMAP 96) | ● |
| **Dach** | Ein-/Mehrflächendächer, automatischer Walm, Verschneidung mit Wänden [K] | Walmdach über eigenen Straight Skeleton (`kernel/geometry/skeleton.ts`, TECH-RADAR-Entscheid), Gratkanten in Ansicht/Axo (ROADMAP 21) | ◐ — Walm/Sattel ja; freie Mehrflächendächer, Dachfenster, Wand-anheben-an-Dach fehlen |
| **Schale (Shell)** | Rotations-/Extrusions-/Regelflächen [H-Shell] | `FreeMesh`-Entity, dritte Werkzeugstufe (V2-Technik Block 3, ROADMAP 192–197): Quader/MassBody→Mesh als Start, `meshVertexSchieben`/`meshFlaecheExtrudieren` (planare Regionen), 2D-Schnittfigur (Tri-Slice in Grundriss ab `PLAN_SCHNITTHOEHE`=1000 mm über Geschoss-OK, im Schnitt automatisch), GLB-Export/-Import («Als FreeMesh übernehmen»), IFC als `IfcFacetedBrep` | ◐ — freie Flächenform ja, aber kein Rotations-/Regelflächen-Erzeuger; hartes Budget (4096 Vertices/8192 Faces), kein CSG, keine SIA-416-Flächenanrechnung |
| **Morph** | Freiform-Direktmodellierung [K] | dieselbe `FreeMesh`-Basis: eigener `meshEdit`-Viewport-Modus (Vertex-Handles, Flächen-Pick + Extrude, Drag committet als EIN Undo-Schritt, kein allgemeines Gizmo-Framework), MassBody→Mesh-Umwandlung («In Mesh umwandeln», ein Undo-Schritt löscht/stellt beide zusammen wieder her) | ◐ — das Push/Pull-Handgefühl ja; kein Subdivide/Smooth/Sculpting/Kanten-Beveln/NURBS, Meshes unter 1 m Schnitthöhe bleiben ohne Grundriss-Figur (nur 3D/Schnitt sichtbar) |
| **Treppe** | Solver-gestütztes Treppenwerkzeug (Regeln für Steigung/Auftritt, automatische Lösungsvorschläge), Unterkonstruktion, Geländer-Werkzeug [H-Stair, K] | `derive/treppe.ts`: gerade/Zwischenpodest/U-Lauf/L-Lauf, EINE Zerlegung für 3D+Plansymbol+Checks, Schrittmass-Check über den Gesamtlauf, Kappung an der Schnitthöhe (ROADMAP 43, 95) | ◐ — Formen + Regeln ja; gewendelte Läufe, Unterkonstruktions-Detail und ein **Geländer-Werkzeug** fehlen |
| **Stütze** | Column-Tool (Profile, Kern/Furnier, Raster-Bezug) [K] | nur Raster: `GridAxis`-Entity + Raster-Assistent (`derive/stuetzenraster.ts`, ROADMAP 26/39) — **keine Stützen-Entity** | ○ — Skelettbau nicht modellierbar; grösste Werkzeuglücke im Kern |
| **Unterzug** | Beam-Tool (Profile, Aussparungen im Träger) [K] | keine Beam-Entity | ○ |
| **Fassade (Curtain Wall)** | Systemwerkzeug: Schema aus Rastern, Pfosten/Riegel/Paneele als konstruktive Teilelemente [H-CustomComponents, K] | Fassaden-**Modul**-System: Modul-Editor (`app/modules/design/ModulEditor.tsx`), Rasterung + Eckenregel + Wiederholungsgrad + Element-CSV (`derive/fassadenmodule.ts`, ROADMAP 63/68/73/75), Module je Fassade, Fenster-Stanzung | ◐ — Studien-/Vorfab-Logik ist da (teils über ArchiCAD hinaus: Wiederholungsgrad!); ein konstruktives Pfosten-Riegel-Bauteil mit Profilen/Mengen fehlt |
| **Objekt** | GDL-Objektbibliothek (Tausende parametrische Teile) [K] | Möbelkatalog: 8 parametrische Typen MIT SIA-500-Bewegungsflächen (`derive/moebel.ts`, ROADMAP 62), Referenz-3D als GLB-Kontext (ROADMAP 20), IFC-Export als IfcFurnishingElement (ROADMAP 85) | ◐ — kuratierter CH-Katalog statt Universalbibliothek; siehe GDL in 2.7 |
| **Öffnungs-Werkzeug (Aussparungen)** | Opening-Tool für Durchbrüche durch Wand/Decke, echte Löcher [K] | `Aussparung`-Entity (Durchbruch/Schlitz) mit Werkplan-Symbol + Kote «D 300×300 UK 1200», bewusst OHNE Geometrieschnitt (Hochbauzeichner-Konvention), Mengenposition (ROADMAP 90, 98) | ◐ — symbolisch statt geometrisch; für den 2D-Werkplan gleichwertig, im 3D/IFC kein echtes Void |
| **Schnitte/Ansichten/Innenansichten** | Schnitt-, Ansichts-, Innenansichts-(IE)-Viewpoints, Details, Arbeitsblätter [H-Navigator] | Schnitt + Ansichten N/O/S/W mit eigener Verdeckungsrechnung (`derive/hiddenline.ts`, ROADMAP 17/21), Axonometrie als vierter Plantyp (ROADMAP 28), Terrain im Schnitt (ROADMAP 89) | ◐ — Gebäudeschnitt/Ansicht/Axo ja; **Innenansichten** (Bad/Küche-Wandabwicklung) und Detail-Ausschnitte fehlen |

### 2.2 Mehrschichtige Baustoffe + Verschneidungsprioritäten

| Feature | ArchiCAD | KosmoOrbit-Ist | Status |
|---|---|---|---|
| Baustoffe (Building Materials) | Baustoff = Schraffur + Oberfläche + physikalische Werte + **Verschneidungspriorität 0–999** in einer Attribut-Karte [H-IntersectionPriority] | Materialkatalog «PBR + SIA + Lambda aus einer Quelle» (`@kosmo/data`, ROADMAP 20/105), Schraffur-Katalog nach SIA-Lesart (`derive/schraffur.ts`, ROADMAP 37), Dichtetabelle für Schallschutz (`MATERIAL_DICHTE`, ROADMAP 99) | ● — dieselbe «eine Quelle»-Idee; Prioritätszahl fehlt (nächste Zeile) |
| Mehrschicht-Aufbauten (Composites) | Schichten mit Funktion (Kern/Dämmung/Bekleidung), tragende Schicht als Bezug [K] | `Assembly`/`AssemblyLayer` mit `LayerFunction` (tragend/daemmung/bekleidung/dichtung/hohlraum), Referenzlinien-Bezug kern-aussen/kern-innen, Rohkonstruktions-Masskette auf der tragenden Schicht (ROADMAP 93) | ● |
| Verschneidungsprioritäten | Höhere Priorität schneidet niedrigere — **über Bauteilgrenzen hinweg** (Wand↔Wand↔Decke), Skin-genau; plus Ebenen-Verschneidungsgruppen [H-IntersectionPriority, C] | **Prioritäts-Join im Grundriss gebaut (A1, ROADMAP 113)**: `MATERIAL_PRIORITAET` 0–999 (`model/prioritaet.ts`), höhere Priorität schneidet die niedrigere beim Poché-Join (Beton stösst durch, Dämmung/KS weichen), projektweite Overrides via `design.prioritaetSetzen`; Wandknoten weiterhin geometrisch (Gehrung/T-Stoss/Mehrfachknoten, ROADMAP 15/21/35) | ◐ — Grundriss ja; Wand↔Decke im SCHNITT (Face-Ebene) folgt als nächster Schritt |
| Komplexe Profile (Profil-Manager) | frei gezeichnete Querschnitte für Wand/Stütze/Unterzug, Baustoff je Teilfläche [K] | — | ○ — hängt an Stütze/Unterzug (A3) |

### 2.3 Ebenen-/Stift-/Linientyp-Logik + Attribut-Verwaltung

| Feature | ArchiCAD | KosmoOrbit-Ist | Status |
|---|---|---|---|
| Ebenen (Layers) + Kombinationen | Sichtbarkeit/Sperrung je Ebene, Ebenen-Kombinationen je Ausschnitt, Verschneidungsgruppen [C-Navigator, K] | keine Ebenen: Sichtbarkeit folgt der **Semantik** (Entity-Art, Phase, Umbau-Status, Geschoss) — z.B. Möbel drucken `abPhase` Bauprojekt (ROADMAP 91), Aussparungs-Symbole nur im Werkplan (ROADMAP 90). v0.8.9 E2 (Owner-Entscheid, `docs/V089-SPEZ.md` §3 E2): `meta.layer`/`meta.locked` sind **reines DXF-Interop + Sperrschutz**, KEIN Ebenen-System — `design.ebeneSetzen` übersteuert im DXF-Export (`dxf/export.ts` `layerFuer()`) NUR den CAD-Layernamen (AutoCAD/Rhino/Vectorworks-Zieldatei), ohne jede Plan-/Render-Wirkung; `design.sperren` blockiert Löschen/Bearbeiten am Interaktions-Pfad (Inspector), das Element bleibt aber immer klick-/anzeigbar — kein Schloss-Symbol im Plan-SVG | — bewusst nie: Derive statt Ebenen-Pflege; das Modell weiss, WAS etwas ist, statt auf welcher Ebene es liegt (Begründung in Abschnitt 4). Die DXF-Interop-/Sperr-Ergänzung widerspricht dem NICHT — sie tauscht kein Sichtbarkeits-System ein, sondern bedient nur den CAD-Austausch (Layer-Name) und einen Bearbeitungsschutz |
| Stifte + Stiftsätze | 255 Stifte, Stiftsätze je Ausschnitt (SIA-Stiftsätze der Büros) [K] | SIA-Stiftlogik als CSS-Stiftsätze (Owner-Mandat Q11): Schnitt 0.5, Ansicht 0.35, Möbel 0.18, Massstriche doppelt so dick wie Masslinien nach SIA 400 B.5.3 (ROADMAP 57) | ◐ — die SIA-Werte sind eingebaut statt einstellbar; ein Stiftsatz-**Editor** fehlt (bewusst klein: ein Büro, ein Standard) |
| Linientypen | Editor für Strich-/Symbol-Linien, skalierbar [K] | feste, bedeutungsgebundene Linienarten: Baugrenze/Raster strichpunktiert, Terrain gewachsen gestrichelt/neu ausgezogen (SIA 400 C.2.1, ROADMAP 89), über-Schnitt strichpunktiert (ROADMAP 95) | ◐ — jede SIA-relevante Linienart existiert, aber gebunden an ihre Bedeutung; kein freier Linientyp-Editor (bisher nie vermisst) |
| Attribut-Verwaltung | Attribute-Manager: Import/Export von Stiften/Ebenen/Baustoffen zwischen Projekten, seit AC27 Ordner-Hierarchie [AT, GS] | alle «Attribute» (Aufbauten, Materialien, Raumregeln, Zonenregeln, Module, Vorlagen, Formeln) sind **Bürger des einen Docs** (`DocSettings` + Assembly-Entities) — versioniert, undo-fähig, Yjs-syncbar, in .kosmo enthalten | ● — «ein Doc statt Attribut-Zoo» (Abschnitt 4); der **Büro-Transfer** ist gebaut (A8, ROADMAP 115): `katalogExport` + `design.katalogImportieren` (Namens-Dedup, nie überschreiben) mit Zentrale-Knöpfen «Katalog ↓/↑» |
| Favoriten | je Werkzeug gespeicherte Einstellungs-Sets [K] | Presets punktuell: Bemassung «Standard/Wettbewerb/Werkplan/Aus» (ROADMAP 40), Raumregel-Presets «CH-Wohnbau/Wettbewerb» (`model/regelpresets.ts`, ROADMAP 52), Zonen-Vorlagen/Plan-Library (ROADMAP 66/70) | ◐ — Presets dort, wo es zählt; generische Werkzeug-Favoriten (Wand-Aufbau-Schnellwahl etc.) fehlen |

### 2.4 Umbau-/Renovierungsfilter

| Feature | ArchiCAD | KosmoOrbit-Ist | Status |
|---|---|---|---|
| Renovierungs-**Status** je Element | Bestand/Abbruch/Neu als Element-Eigenschaft [H-RenoFilter] | `meta.renovation` (bestand/neu/abbruch) + `design.renovationSetzen` (Kosmo-sprachfähig), Poché-Join nach Status, Abbruch-Kreuz, Neubau rot / Abbruch gelb nach SIA 400 B.8.11, `Pset_KosmoUmbau` im IFC — `renClasses` in `derive/plan.ts` (ROADMAP 88) | ● |
| Renovierungs-**Filter** je Ausschnitt | pro View wählbar: Bestandsplan, Abbruchplan, Neubauplan … je Status Zeigen/Verbergen/Überschreiben, «Do not intersect»-Option für Neu↔Bestand [H-RenoFilter, C] | heute EINE kombinierte Darstellung (alle Status im selben Plan farbcodiert) | ◐ — Status-Modell komplett, aber der Schweizer Planlauf braucht **getrennte** Abbruch-/Neubaupläne aus einem Modell → Lücke A2 |

### 2.5 Ausschnitte (Views) + Layoutbuch + Publisher

| Feature | ArchiCAD | KosmoOrbit-Ist | Status |
|---|---|---|---|
| Projektmappe/Ausschnitte (View Map) | View = Viewpoint + eingefrorene Einstellungen (Massstab, Ebenen, Stifte, Überschreibung, Reno-Filter) im Navigator-Baum [H-Navigator, C-Navigator] | keine gespeicherten Views: jede Darstellung ist **Ableitung** aus Modell + Projektzustand (`DocSettings.phase` steuert Vorprojekt/Bauprojekt/Werkplan-Darstellung inkl. Massstabs-Automatik 1:200/100/50, ROADMAP 41/97); die Blatt-Platzierung (`SheetPlacement`: Plantyp, Geschoss, Massstab) übernimmt die View-Rolle | — bewusst anders: «Derive statt Views» — es gibt keinen View-Baum, der gegenüber dem Modell veralten kann (Abschnitt 4); Restlücke: Platzierungen können Phase/Reno-Filter noch nicht **pro Blatt** übersteuern (Teil von A2) |
| Layoutbuch | Layouts + Master-Layouts (Plankopf), Drawings mit Update-Status [H-Navigator] | `Sheet`-Entity als Kernel-Bürger (A0–A4, Platzierungen, Texte, Bild-Slots für Renders), Blatt-Editor, SIA-Plankopf mit Phase + Masseinheit, Plakat-Designer A0 (ROADMAP 11/29/34/37) | ● — Master-Layout fehlt als Konzept (der Plankopf ist eingebaut statt frei gestaltbar) |
| Publisher | Publikations-Sets: einmal definierte Baum-Auswahl → Batch PDF/DWG/IFC/BIMx mit Namensregeln [H-Navigator, K] | **Publikations-Sets gebaut (A4, ROADMAP 114)**: benannte Blattauswahl + Namensregel im Doc (`publish.setSpeichern/setEntfernen`, `derive/publikation.ts`), Set-PDF mit einem Klick, Einzel-SVGs nach Regel «P-01_Grundriss_EG_1-50.svg»; dazu weiter Plansatz-PDF A0–A4, DXF, IFC, GLB | ● — DWG/BIMx bewusst nie (Lizenz/proprietär) |

### 2.6 Bemassung / Beschriftung / Zonen

| Feature | ArchiCAD | KosmoOrbit-Ist | Status |
|---|---|---|---|
| Assoziative Bemassung | Ketten haften am Bauteil, aktualisieren mit [K] | assoziative Ketten aus der Parametrik: Aussenketten (Öffnungs-/Achs-/Rohbau-/Gesamtkette in Werkplan-Ordnung, ROADMAP 93), Innenketten, Höhenkoten roh/fertig + m ü.M. (ROADMAP 94), mm hochgestellt nach SIA 400 B.5.2 (ROADMAP 57), Stile als `DocSettings.bemassung` (ROADMAP 40) | ● — der SIA-Werkplan-Teil ist gleichwertig; freie Einzelmasse vom Nutzer gesetzt sind schmaler als ArchiCADs Mass-Werkzeugvielfalt (Radius/Winkel/Höhe im Grundriss) |
| Etiketten (Labels) | assoziative Etiketten lesen Element-Eigenschaften; AC28 **Keynotes**: zentrale Notiz-Datenbank, Ordner, XML/Excel-Roundtrip, Legenden [H-Keynotes, CB] | `PlanText`-Kanal (Aussparungs-Koten, ROADMAP 90), Zonen-Labels, Blatt-Texte (`publish.textSetzen`) — aber keine frei setzbaren, eigenschafts-lesenden Etiketten und keine Notiz-Datenbank | ● — **Etiketten + Keynotes gebaut (A6, ROADMAP 117)**: `Etikett`-Entity liest das Bauteil LIVE (Aufbau-Name + Schichtkette, Stützen-/UZ-Querschnitt), `design.keynoteSetzen` pflegt die zentrale Nummern-Liste, die Blatt-Legende schreibt verwendete Keynotes aus; XML/Excel-Roundtrip bewusst nie (Katalog-Transfer .json übernimmt den Büro-Austausch) |
| Zonen (Zoning) | Zone mit Stempel (GDL), Flächenberechnungs-Modi, Zonen-Kategorien; Grundlage der Flächenlisten [K] | `Zone` mit **SIA-416-Klasse** (HNF/NNF/VF/FF/KF, `derive/sia416.ts`) + `raumTyp` + `program` (Wohnungstyp), Zonentüren, **Raumgraph** (`derive/raumgraph.ts`, ROADMAP 49/72) mit Fluchtweg-Dijkstra, Live-Kennzahlen + Berechnungsliste (ROADMAP 25) | ● — fachlich über ArchiCAD hinaus (Graph, Fluchtweg, Regel-Checks je Raumtyp); nur der konfigurierbare Zonen-**Stempel** fehlt als Kosmetik |
| Auswertungen (Interactive Schedules) | interaktive Listen (Elemente/Bauteile/Öffnungen), rückwirkend editierbar, aufs Layout legbar [K] | Mengenauszug je Aufbau/Klasse (`derive/mengen.ts`, ROADMAP 33), **NPK-nahes Ausmass** mit Abzugsregeln + Herleitung + CSV (`derive/ausmass.ts`, ROADMAP 98), Berechnungsliste mit Soll/Ist/Δ Max (ROADMAP 25), Fassaden-Elementliste (ROADMAP 63) | ◐ — die CH-Auswertungen sind tiefer (Ausmassregeln!), aber es gibt keine frei **konfigurierbaren** Listen und kein Editieren aus der Liste zurück ins Modell |

### 2.7 GDL-Bibliotheken / Objekte

| Feature | ArchiCAD | KosmoOrbit-Ist | Status |
|---|---|---|---|
| GDL als Objektsprache | proprietäre Skriptsprache; Türen/Fenster/Treppen/Stempel/Plankopf sind GDL-Objekte; riesiges Ökosystem (BIMcomponents, Hersteller) [H-GDL, K] | Objekte sind **TypeScript-Kataloge im Kernel** (Möbel, Module, Schraffuren) + GLB-Referenzteile; parametrik über Commands statt Objektskript | — bewusst nie: GDL ist Graphisoft-proprietär, ein Nachbau wäre Lock-in ohne Ökosystem; Austausch läuft über IFC/GLB, Erweiterung über Code + Kosmo |
| Bibliotheks-Verwaltung | Bibliotheken laden/einbetten, Migration je Version [K] | ein Katalog im Paket `@kosmo/data` (CH-Bauteilkatalog, ROADMAP 105), Assets im .kosmo eingebettet (`ImageAsset`, ROADMAP 37) | ● für den V1-Anspruch (keine Versions-Migrationen, weil keine Fremdbibliotheken) |

### 2.8 Teamwork / BIMcloud

| Feature | ArchiCAD | KosmoOrbit-Ist | Status |
|---|---|---|---|
| Teamwork-Grundmodell | Reservierungs-basiert (Elemente reservieren → ändern → senden/empfangen), BIMcloud als Server, delta-basiert auch über langsame Leitungen [AT, K] | **CRDT statt Reservierung**: Yjs + Hocuspocus, Zwei-Client-Konvergenz getestet, Offline-Warteschlange über y-indexeddb, Token-Pflicht, Raum-Verwaltung (`@kosmo/sync`, ROADMAP 42/105) | ● — technisch moderner (kein Reservieren, kein Senden-Knopf); bewusst anders: lokaler Sync-Server statt Cloud-Abo |
| Rollen/Rechte | BIMcloud-Benutzerverwaltung, Rollen, Projektrechte [K] | Rollen-**Vorstufe** (`settings.rolle` entwurf/ausfuehrung/admin — ordnet Kacheln + Kosmo-Prompt, KEINE Rechte, ROADMAP 103) | ◐ — für ein Ein-Personen-Büro genügt das; echte Rechteverwaltung ist V2/Mehr-Büro (HOMESTATION-AUFTRAG «bewusst vertagt») |
| Markups/Issues (BCF) | Teamwork-Nachrichten mit Markups, BCF-Import/Export [AT] | ○ — kein Issue-/BCF-Kanal; Befunde existieren nur als Check-Karteikarten im eigenen Projekt | ○ — relevant erst bei Fachplaner-Koordination (V2, mit IFC-Rollen) |

### 2.9 IFC-Import/Export

| Feature | ArchiCAD | KosmoOrbit-Ist | Status |
|---|---|---|---|
| IFC-Schemata + Translatoren | IFC2x3 + IFC4, konfigurierbare Import-/Export-Translatoren (Mapping Klassen/Properties/Geometrie) [H-Translators] | IFC4-Export über eigenen SPF-Writer, **ifcopenshell-verifiziert** (Wände, Öffnungen als echte Voids, IfcSpace, Möbel, Psets; ROADMAP 7/83/85) | ● — ein fester, geprüfter Weg statt Translator-Zoo; Mapping-Konfiguration fehlt bewusst (eine Quelle der Wahrheit, keine Projektions-Varianten) |
| IFC-Import | als Modell oder Referenz, Klassen-Mapping [K] | Import als Kontext-Layer PLUS **editierbare Übernahme**: `derive/bestand.ts` erkennt Wände/Decken geometrisch (minimales Rechteck, ehrliche Ablehnung bei L-Footprints) und baut echte Entities inkl. Geschoss-Clustering (ROADMAP 46) | ● — der Erkennungs-Ansatz ist origineller als ArchiCADs 1:1-Import (der dafür alles abbildet, was wir ablehnen) |

### 2.10 Grafische Überschreibungen

| Feature | ArchiCAD | KosmoOrbit-Ist | Status |
|---|---|---|---|
| Override-Regeln (Kriterium → Stil) | Regel-Sets je Ausschnitt: «alle Elemente mit Eigenschaft X → Füllung Y» — Themenpläne (Brandschutz, Bauteilkataloge) ohne Modelländerung [C-Overrides, K] | fest verdrahtete Überschreibungen dort, wo die Norm sie verlangt: Umbau-Farben (SIA 400), Check-Verletzungen rot/amber im Plan (ROADMAP 52), Phasen-Darstellung (ROADMAP 41) | ● — **Themenpläne gebaut (A5, ROADMAP 116)**: `design.themenPlanSpeichern` (Regeln raumTyp/material/klasse → Farbe), je Blatt-Platzierung aktivierbar (`publish.ansichtAnpassen` thema), Legende + Titel-Zusatz aufs Blatt — Brandschutz-/Schallschutz-/Materialplan aus demselben Modell; dazu weiter die fest verdrahteten Umbau-/Check-/Phasen-Darstellungen |

### 2.11 Geländemodell (Mesh) + Grundriss-Schnitt-Ebene

| Feature | ArchiCAD | KosmoOrbit-Ist | Status |
|---|---|---|---|
| Gelände (Mesh-Tool) | Punkthöhen-Mesh, Plateaus, Volumenermittlung; Verschneidungs-Sonderfälle [C-Mesh, K] | `Terrain`-Entity als 3D-Profil-Polylinie (gewachsen/neu), Projektion in den Schnitt nach SIA 400 C.2.1 (ROADMAP 89); Parzellen-Import aus der amtlichen Vermessung (geo.admin.ch, ROADMAP 67) | ◐ — Schnitt-Terrain + echte Parzelle ja; **flächiges DGM** (swissALTI3D) ist bewusst HomeStation-Ausbau (`docs/HOMESTATION-AUFTRAG.md`), kein Punkt-für-Punkt-Mesh-Editor geplant |
| Grundriss-Schnittebene (Floor Plan Cut Plane) | globale Schnitthöhe + relativer Anzeigebereich je Element; über/unter Schnitt eigene Darstellung [C-CutPlane, K] | `storey.cutHeight` schneidet echt: Poché nur für geschnittene Körper, Treppe an der Schnitthöhe gekappt mit Bruchlinie, über-Schnitt strichpunktiert (`derive/plan.ts`, ROADMAP 95) | ● — je Element einstellbare Anzeigebereiche fehlen (bisher kein Bedarfsfall) |

### 2.12 Änderungsverfolgung / Revisionen / Varianten

| Feature | ArchiCAD | KosmoOrbit-Ist | Status |
|---|---|---|---|
| Revisions-Management | Änderungen (Change-Tool) mit ID, Revisionen je Layout, Revisionsverlauf im Plankopf, Transmittal-Sets [H-Revision] | **Plan-Revisionen gebaut (A7, ROADMAP 118)**: `publish.revisionErfassen` (Index A→B→…), Änderungswolken (`publish.wolkeSetzen`, Bogenkette + Index-Marker), Revisionsverzeichnis über dem Plankopf, `transmittalCsv` als Versand-Begleitliste (auch je Publikations-Set) | ● |
| Design Options (AC27) | Options-Sets IM Modell: Varianten parallel führen, je View eine Kombination zeigen [AT, AV] | Varianten-**Archiv**: eingefrorene Snapshots mit Kennzahlen + Mini-Plan im Projekt-Tresor, Vergleichsraster in der Zentrale, «Als Projekt öffnen» (`app/state/variant-archive.ts`, ROADMAP 92); Parallel-Axis-Vergleich (`derive/variantenmatrix.ts`, ROADMAP 53) | ◐ — Vergleich/Archiv stark (Parallel-Axis hat ArchiCAD nicht); **Optionen im lebenden Modell** (Wettbewerbs-Variante A/B im selben Grundriss) fehlen |
| Änderungs-Nachvollzug | Teamwork-Änderungsliste, Element-Historie [K] | invertierbare Patches (Undo-Gruppen), Lernjournal, Yjs-Historie | ◐ — technisch alles da, aber keine Nutzer-Ansicht «wer hat was wann geändert» |

### 2.13 Weitere ArchiCAD-Bausteine (Kurzabgleich)

| Feature | ArchiCAD | KosmoOrbit | Status |
|---|---|---|---|
| Distance Guides (AC27) | dynamische Abstands-Anzeigen zu Nachbarelementen beim Platzieren [AV] | magnetischer Fang auf Raster/Achsen (`derive/fang.ts`, ROADMAP 39), Distanz-Tippen beim Ziehen, Live-m² beim Zonen-Ziehen (ROADMAP 64) | ◐ — Fang + Zahlen ja, Nachbar-Abstands-Guides nein (kleine UX-Politur) |
| Trace & Reference | Referenz-Unterlage (anderes Geschoss, Schnitt, DWG) halbtransparent unterlegen [K] | Splitscreen (4 synchrone Fenster), Splat-/IFC-Kontext-Layer, Skizzen-Overlay | ● — Trace gebaut (A8, ROADMAP 115): Geschoss-Select im PlanView unterlegt jedes andere Geschoss blass (reine Arbeitshilfe, nie Planinhalt); DWG-Unterlage bewusst nie |
| Hotlinks/Module/Xref | wiederverwendete Teilmodelle (Wohnungs-Module!), DWG-Xref [K] | Plan-Library-Vorlagen decken den Wohnungs-Fall generativ ab (8 Lagen, ROADMAP 70/71); echte gelinkte Instanzen gibt es nicht | ◐ — bewusst: Vorlagen statt Links in V1; Instanz-Semantik (ändere eine, alle folgen) wäre der V2-Weg |
| AI Visualizer (AC27) | Stable-Diffusion-Aufsatz für Stimmungsbilder aus dem 3D-Fenster [AT] | KosmoVis: Render-Jobs an die HomeStation, Varianten-Serien, QA-Verdikt, **Prompt-Transparenz** (finaler Prompt sichtbar/überschreibbar, ROADMAP 61/74) | ● — gleichwertig im Konzept, lokal statt Cloud, Prompt ehrlicher |
| BIMx (Präsentation) | Hyper-Modelle für Mobile, Verknüpfung 2D/3D [K] | GLB/USDZ-frei? — GLB-Export ja (ROADMAP 8), Plakat-Designer + PDF-Plansätze; kein interaktives Präsentations-Format | ○ — bewusst niedrig priorisiert; das iPad läuft die App selbst (PWA/Tauri) statt eines Viewer-Formats |
| MEP Designer (AC28) | Lüftung/Sanitär/Elektro-Trassen im Architekturmodell [GS, CB] | — | — bewusst nie in V1: CH-Wohnbau-Fokus, Fachplaner-Koordination via IFC; eigene MEP-Modellierung ist kein Owner-Bedarf |
| Grasshopper-Anbindung | Live-Connection Rhino/GH [H-GC] | — (Kosmo-Commands sind die «parametrische Schnittstelle»; zod-Schemas = Tool-API) | — bewusst anders: die Skript-Ebene ist die KI-/Command-Ebene, nicht ein Node-Graph zu Rhino |
| Element-Eigenschaften/Klassifizierung | Property Manager, Expression-Properties, Klassifikationssysteme (z.B. eBKP möglich) [K] | feste, fachlich gewählte Eigenschaften (SIA-416-Klasse, Raumtyp, Programm, Umbau-Status, IFC-Identität in KosmoDraw); Custom-**Kennzahlen** als Formeln (CHF/m², CO₂ — ROADMAP 58) | ◐ — was der CH-Wohnbau braucht, ist da; frei definierbare Element-Properties + eBKP-Klassifizierung fehlen (wird mit ONLV/Devis-Frage relevant, Owner-Entscheid) |

---

## 3 · Was KosmoOrbit von ArchiCAD noch lernen sollte

Die wertvollsten Lücken, priorisiert nach Owner-Nutzen (CH-Wohnbau, SIA-Pläne,
Wettbewerb → Werkplanung). Aufwand in Blöcken: S = 1, M = 2–4, L = 5+. Alles
Container-machbar (reine Kernel/UI-Arbeit), HomeStation nirgends nötig.

| # | Block | Inhalt (konkret) | Nutzen fürs Büro | Aufwand | Einordnung |
|---|---|---|---|---|---|
| A1 | **Verschneidungsprioritäten** | Prioritätszahl je Material im Katalog (`@kosmo/data`); beim Poché-Join und an Wand↔Decke-Anschlüssen schneidet die höhere Priorität die niedrigere (Dämmung läuft durch, Beton stösst) — ArchiCADs 0–999-Modell [H-IntersectionPriority] auf unsere Schichtbänder übertragen | Werkplan-Anschlüsse (Decke/Wand, AW/IW) stimmen automatisch — heute der sichtbarste Abstand zum ArchiCAD-Plan | M | Container, Kern (`derive/plan.ts`, `derive/section.ts`) |
| A2 | **Umbau-Filter je Blatt** | `SheetPlacement.renoFilter` (bestand/abbruch/neu/kombiniert): dieselbe Ableitung, gefiltert + je Status zeigen/verbergen/färben — Abbruch- und Neubaupläne aus EINEM Modell (ArchiCAD-Renofilter [H-RenoFilter]); dito `phase` je Platzierung | Jeder Umbau-Planlauf braucht getrennte Pläne; Status-Modell (ROADMAP 88) ist fertig, es fehlt nur der Filter | S–M | Container; direktester Gewinn |
| A3 | **Stütze + Unterzug als Bauteile** | `Column`/`Beam`-Entities (Rechteck/Rund, Material, an GridAxis andockbar), Plansymbol + Schnitt + Mengen + IFC (IfcColumn/IfcBeam); Raster-Assistent (ROADMAP 26/39) schlägt Stützen auf Kreuzungen vor | Skelettbau/EG-Hallen sind heute nicht modellierbar — grösste Werkzeuglücke; VSS-Raster liefert die Intelligenz schon | M | Container, Kern |
| A4 | **Publikations-Sets** | benannte Export-Sets im Doc (Blätter + Format + Namensregel «P-01_Grundriss_EG_1-50.pdf»), ein Knopf = ganzer Plansatz; Publisher-Essenz [H-Navigator] ohne Baum-Bürokratie | Abgabe-Tage: ein Klick statt Blatt-für-Blatt; auch für Kosmo («publiziere den Wettbewerbssatz») | S | Container (`commands/publish.ts`) |
| A5 | **Override-Regeln für Themenpläne** | kleines Regelsystem (Kriterium: Raumtyp/Material/Eigenschaft → Farbe/Schraffur) als `DocSettings.themen`, je Blatt aktivierbar — Brandschutzplan, Schallschutz-Klassen, Bauteilkatalog-Plan aus demselben Modell [C-Overrides] | Wettbewerbs- und Baueingabe-Beilagen (Brandschutz!) ohne Zweitmodell; passt zu unserer Check-Färbung (ROADMAP 52) | M | Container |
| A6 | **Etiketten/Keynotes** | assoziative Etikette liest Bauteil-Daten (Aufbau-Name, U-Wert, Rw, Materialschichten) + zentrale Notizliste mit Ordnern und Excel-Roundtrip (AC28-Keynotes [H-Keynotes]); Legende aufs Blatt | Werkplan-Beschriftung ist heute Handarbeit; Mengen/Ausmass-Kern liefert die Daten bereits | M | Container |
| A7 | **Revisionen auf dem Plan** | Änderungs-Einträge (ID, Text, Datum) je Blatt, Änderungswolke als Zeichenobjekt, Revisionsindex-Tabelle im Plankopf, Transmittal-Liste als CSV [H-Revision] | Pflicht ab Bauprojekt (Planläufe mit Unternehmern); passt zur Karteikarten-Ästhetik | M | Container |
| A8 | **Alltags-Politur-Paar** | (a) Trace: anderes Geschoss/Bestand blass unterlegen (eine zweite Derive-Ebene im PlanView); (b) Katalog-Transfer: Aufbauten/Regeln/Module als .json exportieren/importieren (Attribute-Manager-Ersatz fürs nächste Projekt) | tägliche Handgriffe; (b) macht Projekt 2 sofort schneller als Projekt 1 | S | Container |

**Empfehlung.** (1) **A2 zuerst** — kleinster Aufwand, schliesst die Umbau-Kette
aus ROADMAP 88 zum vollen SIA-Planlauf; (2) **A3 + A1** als Kern-Paar (Bauteile
vervollständigen, dann Anschlüsse automatisch lösen); (3) **A4 + A8** als schnelle
Alltagsgewinne dazwischen; (4) **A6 → A7** zusammen als «Werkplan-Beschriftungs-
Kapitel», sobald der erste echte Planlauf ansteht; A5 wenn der erste Brandschutz-
Nachweis kommt. Bewusst NICHT bauen: GDL-Kompatibilität, Ebenen-System,
Translator-Konfiguration, MEP; Morph/Schale sind seit V2-Technik Block 3
(ROADMAP 192–197) als `FreeMesh` gebaut — bewusst NICHT darüber hinaus:
3D-CSG/Boolean, Sculpting, Kanten-Beveln, NURBS, ein hartes Vertex-Budget
statt unbegrenzter Freiheit (Buildplan §5).

**Stand 04.07.2026: alle 8 Container-Lücken sind gebaut** — A1 Verschneidungs-
prioritäten (ROADMAP 113, Grundriss; Schnitt-Faces offen), A2 Umbau-Filter je
Blatt (111), A3 Stütze/Unterzug (112), A4 Publikations-Sets (114), A5
Themenpläne (116), A6 Etiketten/Keynotes (117), A7 Plan-Revisionen (118),
A8 Trace + Katalog-Transfer (115). Die verbleibenden ◐/○ in Abschnitt 2 sind
bewusste Architektur-Entscheide oder V2-/HomeStation-Stufen.

---

## 4 · Was KosmoOrbit bewusst anders macht

1. **Lokal-first statt BIMcloud.** Projekt = ein .kosmo-File + IndexedDB-Tresor;
   Sync = eigener Hocuspocus-Prozess (CRDT, offline-fähig) statt Cloud-Abo mit
   Reservierungs-Choreografie. Kein Senden/Empfangen-Ritual, keine Server-Miete,
   keine Login-Pflicht — Owner-Mandat (Datenhoheit) vor Feature-Parität.
2. **Kosmo-KI als Steuerung statt Makro-Ökosystem.** ArchiCAD erweitert man mit
   GDL/Add-ons/Grasshopper; KosmoOrbit exponiert jeden Command als zod-beschriebenes
   LLM-Tool — «staple das Geschoss 2 mal» ist die Skriptsprache (ROADMAP 85: alle
   Ketten-Commands sprachfähig, gated mit Diff-Karten). Die Automatisierungs-Ebene
   ist dieselbe wie die Bedien-Ebene.
3. **Derive statt Views.** In ArchiCAD ist jede Darstellung ein gespeicherter
   Einstellungs-Satz (Ebenen + Stifte + Overrides + Filter je View) — mächtig, aber
   pflegeintensiv und drift-anfällig. Bei uns ist die Darstellung eine **Funktion**
   (Phase, Regeln, Status → Ableitung); es gibt nichts zu synchronisieren und
   nichts, das veralten kann. Der Preis: je-Blatt-Übersteuerungen müssen als
   explizite Parameter nachwachsen (A2), nicht als frei kombinierbarer Baum.
4. **Ein Doc statt Attribut-Zoo.** Stifte/Ebenen/Baustoffe/Ausschnitts-Einstellungen
   sind in ArchiCAD projektglobale Attribute mit eigenem Verwaltungs-Dialog und
   Migrations-Schmerz. Bei uns sind Kataloge und Regeln Bürger des einen Dokuments:
   undo-fähig, CRDT-syncbar, im Export enthalten, von Kosmo per Sprache setzbar.
5. **Eingebautes CH-Regelwissen statt neutraler Werkzeugkasten.** SIA 416/400/500,
   VKF-Fluchtweg-Richtwerte, Zonenregel-Katalog, NPK-nahes Ausmass und die
   Berechnungsliste sind Kernel-Funktionen — ArchiCAD liefert die Bühne, das Wissen
   müssen dort Vorlagen und Disziplin der Büros liefern.
6. **Generieren als Erstbürger.** Segmentierer, Grundriss-Generator, Plan-Library,
   Volumenstudien, Varianten-Matrix (aus den Finch-/Vorform-Dossiers gebaut) haben
   in ArchiCAD kein Gegenstück — dort beginnt jedes Geschoss von Hand.
7. **Ehrliche Symbolik vor Geometrie-Maximalismus.** Aussparungen als Symbol+Kote
   statt CSG-Loch, Terrain als Profil statt DGM, Erkennungs-Import mit ehrlicher
   Ablehnung — wo die SIA-Zeichnung das Ziel ist, gewinnt die Zeichnungs-Konvention
   gegen das Modell-Feature.

---

## 5 · Quellenverzeichnis + ehrliche Lücken

### Quellen (öffentlich, abgerufen 03./04.07.2026)

**Graphisoft (erste Hand):**
- [H-Keynotes] help.graphisoft.com/AC/28/INT/_AC28_Help/005_NewFeatures/005_NewFeatures-3.htm — Keynotes AC28 (Datenbank, Ordner, Label-Anbindung, XML/Excel)
- [H-IntersectionPriority] help.graphisoft.com/AC/26/INT/_AC26_Help/025_Attributes/025_Attributes-18.htm — Intersection Priority der Building Materials (0–999, Slider, stärker schneidet schwächer)
- [H-RenoFilter] help.graphisoft.com/AC/18/INT/…-154.htm — Renovation Filter Options (Show/Hide/Override je Status, «Do not intersect»); Grundmodell seit AC15 unverändert
- [H-Navigator] help.graphisoft.com/AC/27/INT/_AC27_Help/030_Interaction/030_Interaction-2.htm (+ AC20 Navigator View Map) — Projektmappe/View Map/Layoutbuch/Publisher-Sets
- [H-Translators] help.graphisoft.com/AC/27/INT/_AC27_Help/121_IFC/121_IFC-33.htm — IFC-Translatoren (IFC2x3/IFC4, Export-Detaileinstellungen)
- [H-Revision] help.graphisoft.com/AC/25/INT/_AC25_Help/070_Documentation/070_Documentation-107.htm — Revision Management (Change Scheme, Transmittal Sets, Revision History aufs Master-Layout)
- [H-Stair] help.graphisoft.com/AC/26/INT/_AC26_Help/040_ElementsVB/040_ElementsVB-177.htm — Stair Tool (Komponenten Treads/Risers/Structures als GDL)
- [H-CustomComponents] help.graphisoft.com/AC/27/INT/_AC27_Help/040_ElementsVB/040_ElementsVB-295.htm — Custom Components für Tür/Fenster/Curtain Wall/Treppe/Geländer
- [H-GDL] help.graphisoft.com/AC/26/INT/GDL.pdf — GDL Reference Guide; [H-GC] …/AC/27/INT/GC.pdf — Grasshopper-Live-Connection
- [GS] graphisoft.com/en-us/plans-and-products/whats-new/ (Lineup 2026: hierarchische Attribute, Suchleiste, Keynotes, MEP, Rhino-GH-Verbesserungen) + Update-Notes 28.1.0 (Design-Options-Fixes)

**Fachpresse/Community:**
- [AT] architosh.com «Product Review: Archicad 27 with BIMx and BIMcloud» (03/2024) + «Graphisoft's Building Together — Archicad 27» (10/2023): Design Options, Attribut-Ordner, Teamwork-Markups/BCF, AI Visualizer, BIMcloud-Delta-Sync
- [AV] archvista.com/archicad-27-new-features/ — Distance Guides (dynamische Abstände beim Platzieren von Objekt/Wand/Stütze/Unterzug/Fenster/Tür)
- [CB] contrabim.com/blog/archicad-28-top10 — AC28 Top-10 (Keynotes, MEP Designer, Suche)
- [C] community.graphisoft.com: «Archicad Basic Concepts — The Navigator» (View = Viewpoint + Einstellungen; vier Karten der Projektmappe), Renovation-Filter-Threads («Do not intersect»), Graphic-Overrides-auf-Layout-Thread, Floor-Plan-Cut-Plane-Threads, AC28-Q&A

**KosmoOrbit-Referenzen (Repo):** `ROADMAP.md` (zitierte Nummern 5–109),
`docs/OWNER-MANDAT.md` (Q9/Q11/Q12), `docs/KETTE.md`, `docs/HOMESTATION-AUFTRAG.md`,
`packages/kosmo-kernel/src/` (model/entities.ts, model/doc.ts, commands/design.ts,
derive/plan.ts, schraffur.ts, treppe.ts, raumgraph.ts, sia416.ts, ausmass.ts,
mengen.ts, fassadenmodule.ts, stuetzenraster.ts, fang.ts, variantenmatrix.ts,
bestand.ts, hiddenline.ts), `apps/kosmo-orbit/src/modules/*` (design/, publish/),
`apps/kosmo-orbit/src/state/variant-archive.ts`.

### Ehrliche Lückenliste

1. **Keine ArchiCAD-Installation in dieser Umgebung.** Alle Aussagen stammen aus
   Doku/Presse/Forum plus Produktkenntnis; [K]-markierte Zeilen (Standardverhalten
   wie Stifte, Ebenen-Kombinationen, Zonenstempel, Hotlinks, Schedules) sind breit
   dokumentiertes Allgemeinwissen, wurden aber nicht einzeln per Link belegt. Der
   Owner arbeitet täglich mit ArchiCAD und ist die beste Verifikationsinstanz —
   Korrekturen bitte direkt in dieses Dossier.
2. **Versionsstand.** Recherchiert wurden AC27/28 (+ Lineup-Seite 2026); ein
   allfälliges «Archicad 2026»-Release mit neuen Features nach dem
   Trainings-/Recherchestand ist nicht abgedeckt.
3. **CH-Spezifika (SIA-Template, CH-Bibliothek) nicht separat recherchiert** —
   die Schweizer Graphisoft-Distribution pflegt eigene Vorlagen; deren exakter
   Umfang (Plankopf-Objekte, eBKP-Mappings) ist hier nicht belegt, nur aus
   Büro-Praxis bekannt [K].
4. **Interna sind nicht Thema.** Anders als bei Finch/Vorform wurde nichts
   rekonstruiert (kein Bundle, keine Algorithmen-Hypothesen) — ArchiCAD dient als
   Feature-Referenz, nicht als technisches Vorbild; der Kernel bleibt Eigenbau
   (TECH-RADAR: «kein adoptierbarer Kernel existiert»).
5. **Preise/Lizenzmodell bewusst nicht erhoben** (Abo/SSA je Markt verschieden,
   für den Feature-Abgleich irrelevant).
6. **Proxy-Hinweis:** Recherche lief über Web-Suche mit Snippet-Auswertung; die
   help.graphisoft.com-Seiten wurden über Suchtreffer erschlossen, nicht jede
   Seite einzeln im Volltext geladen. Wo nur Snippets vorlagen, ist die Aussage
   konservativ formuliert.
