# WERKZEUG-LÜCKENLISTE — ArchiCAD ↔ KosmoDesign (K24)

> **Auftrag (K24, wörtlich):** «hier haben wir noch lange nicht alle werkzeuge
> von archicad nachgebaut, einfach das dus schon mal weist, müssen wir dann
> machen» — `docs/OWNER-KORREKTUREN-2026-07.md` K24.
> Erstellt 21.07.2026 (Recherche-Agent). Reiner Befund + Schnittvorschlag —
> **keine Code-Änderung**, Umsetzung gatet Fable.
>
> **Abgrenzung:** Arbeitsumgebung/Profile (K14), Ebenen + Kombinationen (K31)
> und Renovation-Filter/Phasen (K29) sind bereits in
> `docs/REFERENZ-ARCHICAD-UMGEBUNG.md` recherchiert und werden hier NICHT
> gedoppelt — diese Liste behandelt die **Werkzeugpalette** (Zeichnen +
> Dokumentation) und die **Werkzeug-Einstellungsdialoge als Konzept**.
> Die Fenster-/Tür-Tiefe (K21) ist ein eigener Grossposten und wird hier nur
> referenziert, nicht ausgebreitet.

## Quellenlage

- **Primär:** offizielle Graphisoft-Hilfe (`help.graphisoft.com`, AC18–AC28 —
  die Werkzeugpalette ist über die Versionen stabil, zitiert wird die konkret
  geprüfte Seite).
- **Sekundär:** eigener Code-Stand v0.8.11 (Datei:Zeile-Angaben, 21.07.2026).
- **Ehrlichkeits-Regel:** jede Web-Behauptung trägt eine Quelle. Was nicht
  direkt auf einer geprüften Seite steht, ist als **[nicht direkt belegt]**
  markiert (Modellwissen/Community-Konsens — vor Umsetzung nachprüfen).

Geprüfte Quellen (alle am 21.07.2026 abgerufen):

| # | Quelle | URL |
|---|--------|-----|
| Q1 | Tool Settings Dialog Boxes — Werkzeugliste (AC26) | https://help.graphisoft.com/AC/26/INT/_AC26_Help/150_UserInterfaceToolSettings/150_UserInterfaceToolSettings-1.htm |
| Q2 | Working in Tool Settings Dialog Boxes (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/150_UserInterfaceToolSettings/150_UserInterfaceToolSettings-2.htm |
| Q3 | Toolbox — vier Gruppen Select/Design/Document/More (AC18) | https://help.graphisoft.com/AC/18/INT/AC18Help/01_Configuration/01_Configuration-74.htm |
| Q4 | Railing Settings: Overview (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/040_ElementsVB/040_ElementsVB-210.htm |
| Q5 | Pattern Editor (Railing Tool, AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/040_ElementsVB/040_ElementsVB-213.htm |
| Q6 | Openings / Opening Tool (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/040_ElementsVB/040_ElementsVB-257.htm |
| Q7 | New Opening Tool (AC23) | https://help.graphisoft.com/AC/23/INT/_AC23_Help/005_NewFeatures/005_NewFeatures-9.htm |
| Q8 | About the Stair Tool (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/040_ElementsVB/040_ElementsVB-177.htm |
| Q9 | Morph Tool Settings (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/150_UserInterfaceToolSettings/150_UserInterfaceToolSettings-8.htm |
| Q10 | Wall Tool Settings (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/150_UserInterfaceToolSettings/150_UserInterfaceToolSettings-3.htm |
| Q11 | Curtain Wall / Components / Overview (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/040_ElementsVB/040_ElementsVB-148.htm (auch -149, -150) |
| Q12 | Use Standard Steel Column or Beam Profile (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/040_ElementsVB/040_ElementsVB-58.htm |
| Q13 | Wall End Tool Settings (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/150_UserInterfaceToolSettings/150_UserInterfaceToolSettings-37.htm |
| Q14 | Marquee Area (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/030_Interaction/030_Interaction-33.htm |
| Q15 | Walls (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/040_ElementsVB/040_ElementsVB-6.htm |

---

## Teil 1 — IST-Inventar KosmoDesign (v0.8.11)

### 1.1 Zahlen

- **85 `design.*`-Commands** (`packages/kosmo-kernel/src/commands/design.ts`,
  85 `registerCommand`-Blöcke, Ids eindeutig), dazu 33 `publish.*`, 10
  `vis.*`, 1 `grundlagen.*` — jedes Command ist per `commandTools()` zugleich
  Kosmo-Werkzeug.
- **13 interaktive Zeichenwerkzeuge** (`ToolId`-Union,
  `apps/kosmo-orbit/src/state/ui-zustand.ts:36-49`): auswahl, wand, volumen,
  zone, dach, treppe, stuetze, schnitt, skizze, mesh, oeffnung, messen,
  kommentar.
- **ZEICHNEN-Insel: 11 Werkzeuge** von 29 Insel-Werkzeugen gesamt
  (`apps/kosmo-orbit/src/modules/design/island/island-katalog.ts:163-182` —
  Auswahl, Wand, Öffnung, Volumen, Zone, Dach, Treppe, Stütze, Skizze, Mesh,
  Messen; `schnitt` und `kommentar` laufen über ANSICHT-/PROJEKT-Wege).

**Tiefe-Legende:** *rudimentär* = eine Geometrie, wenige Parameter; *solide* =
mehrere Commands/Parameter + eigene Ableitungen; *tief* = Semantik-Felder,
Command-Familie und derive-Ketten bis in Plan/Schnitt/Listen.

### 1.2 Zeichen-/Bearbeitungswerkzeuge mit eigenem UI-Werkzeug

| Werkzeug | Kernel-Command(s) (`design.ts`) | UI-Zugang | Tiefe |
|---|---|---|---|
| Auswahl (inkl. Marquee-Rahmen) | `verschieben` (:541), `loeschen` (:620), `eigenschaftSetzen` (:775), `sperren` (:4178) | ZEICHNEN-Insel; Rechteck-Mehrfachauswahl in `PlanView.tsx:623-628,1098` | solide |
| Wand | `wandZeichnen` (:121), `wandGeometrieSetzen` (:203), `waendeAusZonen` (:1996), `aufbauErstellen` (:89, Mehrschicht-Aufbau/assembly) | ZEICHNEN-Insel `wand` | tief |
| Öffnung (Fenster/Tür/Leibung) | `oeffnungSetzen` (:327), `fensterAusModulen` (:1652), `fensterParametrieren` (:1744), `fensterBoegenSetzen` (:3070), `beschlagSetzen`/`beschlaegeSetzen` (:1804/:1844), `tuerSetzen` (:2165), `tuerenPlatzieren` (:3794) | ZEICHNEN-Insel `oeffnung`; Parametrik über Inspector/Kosmo | solide → tief im Ausbau (K21, eigener XL-Strang) |
| Volumen (Masse/Baukörper) | `volumenErstellen` (:367) | ZEICHNEN-Insel `volumen` | solide |
| Zone (Raum) | `zoneErstellen` (:648), `raumTypSetzen` (:311), `zonenRegelSetzen` (:2916), `wohnungenSegmentieren` (:2193), `raumprogrammSetzen` (:1523) | ZEICHNEN-Insel `zone` | tief |
| Dach | `dachErstellen` (:688) + `derive/dach.ts` (Skelett/First) | ZEICHNEN-Insel `dach` | solide |
| Treppe | `treppeErstellen` (:1394), `treppeGeometrieSetzen` (:1451) + `derive/treppe.ts` | ZEICHNEN-Insel `treppe` | solide |
| Stütze | `stuetzeSetzen` (:1188), `stuetzenAusRaster` (:1257) | ZEICHNEN-Insel `stuetze` | solide (Profil-Manager fehlt, K30) |
| Schnitt/Ansicht | `schnittSetzen` (:246) + `derive/section.ts` (`deriveSection`, Schnitt UND Ansicht mit Verdeckung) | ToolId `schnitt`, SectionView | solide |
| Skizze | Overlay `SketchOverlay.tsx`, `sketch.ts`, `skizze-annaeherungen.ts` (kein Doc-Command — Laufzeit) | ZEICHNEN-Insel `skizze` — **K25: Button soll weg, Pencil-Auto-Aktivierung** | solide |
| Mesh (FreeMesh/Terrain) | `meshErstellen` (:408), `meshVertexSchieben` (:488), `meshFlaecheExtrudieren` (:518), `terrainSetzen` (:1154) | ZEICHNEN-Insel `mesh` — **K26: hinterfragt, R4-Vorschlag Spezial-Untermenü** | solide |
| Messen | ToolId `messen` (reines Mess-Overlay, kein Doc-Patch) | ZEICHNEN-Insel `messen` | rudimentär |
| Kommentar | `kommentarSetzen` (:3419), `…StatusSetzen` (:3448), `…Loeschen` (:3475) | PROJEKT-Insel `kommentare` | solide |

### 1.3 Werkzeuge ohne eigenes Insel-Zeichenwerkzeug (Command/Panel/Kosmo-Weg)

| Werkzeug | Command(s) | UI-Zugang | Tiefe |
|---|---|---|---|
| Decke | `deckeZeichnen` (:280), `deckeGeometrieSetzen` (:3579) | Kosmo/Inspector/`DesignWorkspace` — **kein Insel-Werkzeug** | solide |
| Träger/Unterzug | `unterzugZeichnen` (:1221), `unterzugGeometrieSetzen` (:3607) | Kosmo/Inspector — **kein Insel-Werkzeug** | solide |
| Fassade (Curtain Wall) | `curtainWallSetzen` (:1940), `fassadenModulZuweisen` (:2058), `modulSpeichern` (:2129) | `CurtainWallPanel.tsx`, `ModulEditor.tsx` | solide |
| Achsraster | `rasterSetzen` (:3219), `rasterEntfernen` (:3289) | `RasterPanel.tsx`, ANSICHT-Insel `achsen` (Toggle) | solide |
| Aussparung/Durchbruch | `aussparungSetzen` (:1319) | Kosmo/Inspector | rudimentär–solide |
| Möbel/Objekt | `moebelSetzen` (:2867), `katalogImportieren` (:939) | Inspector/Katalog | rudimentär–solide |
| Masskette (Bemassung) | `massKetteSetzen` (:3494), `…Loeschen` (:3521), `…GeometrieSetzen` (:3542), `bemassungSetzen` (:3187) + automatische Bemassung `derive/dimensions.ts` | PlanView/Inspector | solide |
| Etikett/Keynote | `etikettSetzen` (:1009), `keynoteSetzen` (:1045) | Inspector | solide |
| Geschoss | `geschossErstellen` (:51), `geschossKopieren` (:1597) | GeschossPille/Projekt | solide |
| Baugrenze/Parzelle | `baugrenzeSetzen` (:1553), `nachbarnUebernehmen` (:2603), `standortSetzen` (:2516) | Stammdaten/Kosmo | solide |
| Mangel (Bauleitung) | `mangelErfassen` (:3340) u.a. | `MaengelPanel.tsx` | solide |
| Renovation-Status | `renovationSetzen` (:1364) | Inspector (Details: `REFERENZ-ARCHICAD-UMGEBUNG.md` Teil 3) | solide |
| Text/Bild **auf Blättern** | `publish.textSetzen` (`publish.ts:309`), `publish.bildPlatzieren` (:492), `publish.ansichtPlatzieren` (:208), Revisionswolke `publish.wolkeSetzen` (:115), `publish.revisionErfassen` (:86) | Publish-Station | solide |
| Kamera/Blick | `derive/kamera.ts`, `vis.render` + Render-Presets | Vis-Station | solide |

---

## Teil 2 — SOLL-Referenz: die ArchiCAD-Werkzeugpalette

### 2.1 Aufbau

Die ArchiCAD-Toolbox zeigt «a variety of tools for selection, 3D construction,
2D drawing and visualization» in vier Standard-Gruppen **Select / Design /
Document / More** (Q3). Die Auswahl-Gruppe enthält **Pfeil** und
**Markierungsrahmen (Marquee)** (Q14; Vier-Teilung auch Graphisoft-Community
«The Archicad interface», https://community.graphisoft.com/t5/Getting-started/The-Archicad-interface/ta-p/303976).
Die genaue Zuordnung einzelner Werkzeuge zu Design/Document/More variiert je
Version und Arbeitsumgebung — Gruppenzugehörigkeit im Einzelnen
**[nicht direkt belegt]**, die Werkzeuge selbst sind es (Q1 + Einzelseiten).

### 2.2 Design-Werkzeuge (3D-Bauteile)

Q1 (AC26) listet die Werkzeug-Einstellungsdialoge namentlich; Werkzeuge mit
eigenem Hilfe-Kapitel sind zusätzlich einzeln belegt.

| # | ArchiCAD-Werkzeug | Funktion | Beleg |
|---|---|---|---|
| 1 | Wand (Wall) | tragende/nichttragende Wände, Mehrschicht/Profil | Q10, Q15 |
| 2 | Tür (Door) | parametrische Türen in Wänden, eigener Einstellungsdialog | Q1 («Door/Window Tool») |
| 3 | Fenster (Window) | parametrische Fenster, Laibung/Anschlag/Fensterbank | Q1 |
| 4 | Eckfenster (Corner Window) | Spezialfall über Eck | Q1 |
| 5 | Dachflächenfenster (Skylight) | Öffnung in Dach/Schale | Q1 |
| 6 | Wandabschluss (Wall End) | Abschluss-Objekt an freien Wandenden | Q1, Q13 |
| 7 | Stütze (Column) | Stützen inkl. Stahl-/Sonderprofile | Q12 |
| 8 | Träger (Beam) | Unter-/Überzüge inkl. Profile | Q12 |
| 9 | Decke (Slab) | Geschossdecken/Platten | Q1 |
| 10 | Dach (Roof) | Ein-/Mehrflächendächer | Q1 |
| 11 | Schale (Shell) | extrudierte/rotierte/regelfähige Freiform-Hüllen | Q1 |
| 12 | Treppe (Stair) | Segmente/Wendelungen, Komponenten Tritt/Setzstufe/Konstruktion, Edit-Mode | Q8 |
| 13 | Geländer (Railing) | assoziativ zu Treppe/Decke; Segmente/Knoten, Pattern-Editor, Handlauf/Pfosten/Staketen/Paneele | Q4, Q5 |
| 14 | Fassade (Curtain Wall) | System aus Rahmen/Paneel/Zubehör/Anschluss auf Scheme-Grid | Q11 |
| 15 | Morph | freies Push/Pull-Modellieren beliebiger Körper | Q9 |
| 16 | Zone | Raum mit Stempel und Flächen-/Volumenauswertung | Q1 |
| 17 | Netz (Mesh) | Gelände/unregelmässige Flächen über Höhenpunkte | Q1 |
| 18 | Öffnung (Opening) | Durchbrüche/Nischen in Wand, Decke, Träger, Netz; Orientierung ausgerichtet/vertikal/horizontal | Q6, Q7 |
| 19 | Objekt (Object) | GDL-Bibliothekselemente (Möbel, Sanitär, Symbole …) | Q1 («Library Part Elements», «Object Tool») |
| 20 | Lampe (Lamp) | Lichtquellen-Objekte | Q1 |
| 21 | Raster-Element (Grid) | Achsraster-Elemente | Q1 («Grid Tool») |

### 2.3 Dokumentations-Werkzeuge (2D)

| # | ArchiCAD-Werkzeug | Funktion | Beleg |
|---|---|---|---|
| 22 | Bemassung (Dimension) | assoziative Massketten; Untertypen Höhenkote/Radial/Winkel **[Untertypen nicht direkt belegt auf Q1]** | Q1 («Dimension Tool») |
| 23 | Text | freier Text in jedem Fenster (Plan, Layout …) | Q1 |
| 24 | Etikett (Label) | assoziative Beschriftung von Elementen | Q1 |
| 25 | Schraffur (Fill) | freie 2D-Schraffurflächen | Q1 |
| 26 | Linie / Bogen-Kreis / Polylinie | 2D-Liniengeometrie («Line-type Tools») | Q1 |
| 27 | Spline | Freiformkurven | Q1 |
| 28 | Hotspot | Fangpunkte ohne Druckbild | Q1 |
| 29 | Figur (Figure) | Pixelbild direkt im Modell-/Planfenster | Q1 |
| 30 | Zeichnung (Drawing) | platzierte Zeichnung (Views auf Layouts, externe Pläne) | Q1 |
| 31 | Schnitt + Ansicht (Section/Elevation) | Marker erzeugen abgeleitete Schnitt-/Ansichtfenster | Q1 («Section and Elevation Tool») |
| 32 | Innenansicht (Interior Elevation) | Raum-Abwicklungen | Q1 |
| 33 | Arbeitsblatt + Detail (Worksheet/Detail) | 2D-Ableitungen mit Marker (Details, Bestandspläne) | Q1 |
| 34 | Änderung (Change) | Revisions-/Änderungsverfolgung mit Wolke | Q1 («Change Tool») |
| 35 | Kamera | Kamerapfade/Standpunkte für Visualisierung | Q1 |

### 2.4 Werkzeug-Einstellungsdialoge als Konzept (Vorbild für K21 und alles Weitere)

Der ArchiCAD-Kern, den der Owner in K21 meint («für jedes tool ein
einstellungsmenü»), ist ein **einheitliches Dialog-Muster für alle Werkzeuge**
(Q2):

1. **Default vs. Auswahl:** derselbe Dialog stellt entweder die Vorgabe für
   NEUE Elemente («Default: These settings will be used as the default for new
   elements») oder ändert die SELEKTIERTEN («Selected: … applied to the
   currently selected elements») (Q2).
2. **Panels:** Einstellungen in auf-/zuklappbaren Panels (Geometrie/Position,
   Grundriss+Schnitt-Darstellung, Modell, Klassifizierung) — «organized into
   several panels that can be opened or closed individually» (Q2).
3. **Favoriten:** benannte, wiederverwendbare Einstellungs-Sets je Werkzeug
   (Favoriten-Knopf im Dialog, Q2).
4. **Ebenen-Zuweisung im Dialog** (unten als Dropdown, Q2) — verbindet sich
   mit K31 (`REFERENZ-ARCHICAD-UMGEBUNG.md` Teil 2).
5. **Klassifizierung/IFC/Renovation** als Standard-Abschnitte jedes Dialogs
   (Q2) — bei uns: `rolleSetzen`, `renovationSetzen`, künftig BKP (K31).
6. Erreichbar per Doppelklick aufs Werkzeug, Infobox oder Kontextmenü (Q2).

**KosmoOrbit-Ist dazu:** wir haben KEIN durchgängiges Pendant — Einstellungen
leben verteilt in Inspector-Feldern, Panels und Kosmo-Commands; es gibt kein
Default-für-neue-Elemente-Modell (jedes Zeichnen startet mit Command-Defaults)
und keine Favoriten je Werkzeug. Einzelne Werkzeug-Popups der Inseln (Stufe
2/3, `island/inhalte/`) sind der natürliche Andockpunkt. Das ist eine
**Querschnittslücke**, kein Einzelwerkzeug — als eigener Posten in Teil 4.

---

## Teil 3 — Lückenliste

**Prioritäten aus Architektensicht** (Owner-Kompass F25: alle SIA-Phasen bis
1.0; Reihenfolge Wettbewerb → Bauprojekt/Baueingabe → Ausführung):
**P1** = blockiert schon Wettbewerb/Vorprojekt-Alltag, **P2** = nötig für
Bauprojekt/Baueingabe, **P3** = nötig für Ausführung/Werkplanung, **P4** =
Komfort/Sonderfall, **—** = kommt bewusst nicht (Teil 4.3).
Aufwandsklassen S/M/L/XL wie im Korrekturen-Register.

| ArchiCAD-Werkzeug | Bei uns | Befund | Prio | Aufwand |
|---|---|---|---|---|
| Pfeil (Auswahl) | **vorhanden** | `auswahl` + Element-Commands | — | — |
| Markierungsrahmen (Marquee) | **vorhanden** (integriert) | Rechteck-Auswahl im Auswahl-Werkzeug (`PlanView.tsx:623-628`) — eigenes Werkzeug unnötig | — | — |
| Wand | **vorhanden (tief)** | inkl. Mehrschicht-Aufbauten; Lücke: Profil-Wände → Profil-Manager (K30) | P3 (Profile) | L (K30b) |
| Tür | **teilweise** | `tuerSetzen`/`tuerenPlatzieren`/Beschläge; Einstellungs-Tiefe fehlt | P2 | **XL — K21-Grossposten** (eigener Strang) |
| Fenster | **teilweise** | Parametrik seit 0.7.x (Typ/Teilung/Flügel/Beschlag, `design.ts:1744-1801`); Material/Verglasung/Laibungssitz/Fensterbank fehlen | P2 | **XL — K21-Grossposten** |
| Eckfenster | **fehlt** | als Erweiterung der Fenster-Parametrik denkbar, kein eigenes Werkzeug | P4 | M (in K21) |
| Dachflächenfenster (Skylight) | **fehlt** | keine Öffnung in Dachflächen | P2 | M |
| Wandabschluss (Wall End) | **fehlt** | bewusst nie als Werkzeug — gehört als Wand-Eigenschaft gelöst | — | (S, als Wand-Attribut) |
| Stütze | **vorhanden** | inkl. Raster-Platzierung; Lücke Grundrissdetail + Profile = K30 | P3 | S/M + L (K30) |
| Träger | **vorhanden** | Commands da; **kein Insel-Werkzeug** (nur Kosmo/Inspector) | P2 (UI-Zugang) | S (UI) |
| Decke | **vorhanden** | Commands da; **kein Insel-Werkzeug** | P2 (UI-Zugang) | S (UI) |
| Dach | **vorhanden** | Skelett-Ableitung; Lücke: komplexe Mehrflächen-/Sonderdächer | P3 | M |
| Schale (Shell) | **fehlt** | Freiform-Hüllen; FreeMesh deckt Sonderkörper teilweise | P4 | XL |
| Treppe | **vorhanden** | Lücke: Komponenten-Tiefe (Tritt/Setzstufe/Konstruktion wie Q8-Edit-Mode) | P3 | L |
| **Geländer (Railing)** | **fehlt komplett** | kein Entity, kein Command (nur `absturzsicherung`-Flag an Öffnungen, `design.ts:1813`); Absturzsicherung ist ab Baueingabe/Ausführung pflichtig (SIA 358 als Fachkontext **[nicht direkt belegt]**) | **P2** | L |
| Fassade (Curtain Wall) | **teilweise** | Module/Zuweisung/Panel da; Scheme-Grid-Systematik (Rahmen/Paneel/Anschluss je Rasterlinie, Q11) fehlt | P3 | L |
| Morph | **fehlt** | bewusst nicht in ArchiCAD-Form; FreeMesh ist unser Freiform-Weg (aber K26!) | P4 | XL (nicht empfohlen) |
| Zone | **vorhanden (tief)** | inkl. Regeln/Wohnungen/Raumprogramm — über ArchiCAD-Niveau (Segmentierung) | — | — |
| Netz/Mesh (Gelände) | **vorhanden** | `terrainSetzen` + FreeMesh; **K26: Owner hinterfragt Mesh in der Insel** → keine ArchiCAD-Paritäts-Investition, R4-Vorschlag Spezial-Untermenü | P4 | — |
| Öffnung (Opening/Durchbruch) | **teilweise** | `aussparungSetzen`; Orientierungen/Nischen begrenzt gegenüber Q6 | P3 | M |
| Objekt | **teilweise** | Möbel + Katalog-Import; kein allgemeines parametrisches Objektsystem (GDL: nie, Teil 4.3) | P3 | L (Katalog-Ausbau) |
| Lampe | **fehlt** | bewusst kein Zeichenwerkzeug — Licht gehört zur Vis-Station/Rendern | — | — |
| Raster | **vorhanden** | `rasterSetzen` + Stützen aus Raster | — | — |
| Bemassung | **teilweise** | Massketten + automatische Bemassung; Radial-/Winkel-/manuelle Höhenkoten fehlen | P3 | M |
| **Text (im Plan)** | **fehlt** | Text existiert NUR auf Blättern (`publish.textSetzen`); freier Plan-Text fehlt | **P2** | M |
| Etikett | **vorhanden** | `etikettSetzen`/`keynoteSetzen` | — | — |
| Schraffur (frei) | **fehlt** | Schraffur nur materialgebunden (`derive/schraffur.ts`) | P3 | M |
| **Linie/Kreis/Polylinie** | **fehlt** | keine freien 2D-Linien im Doc (Skizze ist Laufzeit-Overlay, DXF-Import wandelt in Bauteile) | **P2** | M |
| Spline | **fehlt** | Freiformkurven 2D | P4 | S (auf Linienwerk aufbauend) |
| Hotspot | **fehlt** | Fangpunkte; unser Fang (`derive/fang.ts`) ist elementbasiert | P4 | S |
| Figur (Bild im Plan) | **teilweise** | Bilder nur auf Blättern (`publish.bildPlatzieren`) | P3 | S/M |
| Zeichnung (Drawing) | **vorhanden** | `publish.ansichtPlatzieren`/`blattFuellen` decken das Layout-Konzept | — | — |
| Schnitt/Ansicht | **vorhanden** | `schnittSetzen` + `deriveSection` (Schnitt UND Ansicht) | — | — |
| Innenansicht | **fehlt** | Raum-Abwicklungen für Innenausbau | P3 | M |
| **Arbeitsblatt/Detail** | **fehlt** | keine 2D-Detail-Ableitung mit Marker; verbindet sich mit K30a (Stützen-Grundrissdetail) | **P3 (früh)** | L |
| Änderung (Change) | **vorhanden** | `publish.revisionErfassen` + Revisionswolke | — | — |
| Kamera | **vorhanden** | Vis-Station/`derive/kamera.ts` (anders verortet, gleicher Zweck) | — | — |
| **Werkzeug-Einstellungsdialoge (Konzept, §2.4)** | **fehlt als System** | kein Default/Auswahl-Modell, keine Favoriten, Einstellungen verstreut | **P2** | L (Rahmen) — Träger für K21 |

**Zählung:** 37 ArchiCAD-Werkzeuge im SOLL (2 Auswahl + 21 Design + 14
Dokumentation) + 1 Querschnittskonzept (Einstellungsdialoge).
Davon bei uns: **16 vorhanden · 7 teilweise · 14 fehlend** — plus das
fehlende Einstellungsdialog-System als Querschnittslücke.

---

## Teil 4 — Schnittvorschlag

### 4.1 Die fünf ersten Lücken (Empfehlung)

1. **Werkzeug-Einstellungsdialog-Rahmen (§2.4) — L.** Ein einheitliches
   Muster (Default vs. Auswahl, Panels, Favoriten, Klassifizierung) an den
   Insel-Popups verankert. Begründung: das ist der TRÄGER für K21 und jede
   künftige Werkzeugtiefe — ohne den Rahmen wird jede Tiefe erneut als
   Inspector-Streufeld gebaut. Zuerst der Rahmen, dann die Inhalte.
2. **Fenster-/Tür-Tiefe (K21) — XL, eigener Strang.** Hier nur referenziert:
   Rahmenmaterial, Verglasung, Laibungssitz, Fensterbank, Beschläge — läuft
   als eigener Grossposten über mehrere Versionen und füllt den Rahmen aus
   Punkt 1 als erstes.
3. **Geländer-Werkzeug — L.** Einzige komplett fehlende Bauteilklasse mit
   Norm-Pflicht ab Baueingabe (Absturzsicherung); jede Treppe und jeder
   Balkon braucht es, Mengen/KV hängen daran. Schnitt: erst assoziativ zu
   Treppe/Deckenkante mit einfachem Pfosten/Handlauf-Modell, Pattern-Editor
   (Q5) später.
4. **Freie 2D-Dokumentation: Text im Plan + Linie/Kreis/Polylinie + freie
   Schraffur — je M, zusammen L.** Ohne freien Text und Linienwerk lässt
   sich kein Plan «fertig machen» (Notizen, Bestandsergänzungen,
   Abstandslinien im Baueingabeplan). Als EIN Paket «2D-Zeichenschicht»
   schneiden: gemeinsames Entity-Modell (annotation-Layer im Doc), drei
   Werkzeuge darauf.
5. **Detail-/Arbeitsblatt-Ableitung — L.** Ausschnitt mit Marker als
   eigenes, weiterzeichenbares Blatt (nutzt Punkt 4 als Zeichenschicht);
   deckt K30a (Stützen-Grundrissdetail) gleich mit und ist der Einstieg in
   die Werkplanung (SIA-Phase 51).

Danach in dieser Reihenfolge: Träger/Decke als sichtbare Insel-Werkzeuge
(S — reine UI-Lücke), Profil-Manager (K30b, L), Skylight (M),
Bemassungs-Untertypen (M), Innenansicht (M), Öffnungs-/Aussparungs-Ausbau (M),
Curtain-Wall-Scheme-Grid (L).

### 4.2 Owner-Signale eingearbeitet

- **K25 (Skizze):** der Skizze-Button verschwindet aus der ZEICHNEN-Insel
  (Pencil-Auto-Aktivierung) — der freiwerdende Insel-Platz ist für das
  Geländer-Werkzeug (Punkt 3) reserviert. In den Skizzen-AUSBAU wird nicht
  weiter investiert, nur in die Erkennung.
- **K26 (Mesh):** keine ArchiCAD-Mesh-Paritäts-Arbeit. FreeMesh/Terrain
  bleibt (trägt Terrain- und Sonderkörper, R4), wandert aber gemäss
  R4-Vorschlag aus der Insel in ein Spezial-Untermenü — auch das gibt
  Insel-Platz frei (z.B. für Decke oder Träger).
- **K29 (Phasen):** jedes NEUE Werkzeug wird sofort in die
  Phasen-Werkzeug-Matrix eingetragen (Konzept in
  `REFERENZ-ARCHICAD-UMGEBUNG.md` Teil 3): Geländer z.B. ab Bauprojekt,
  2D-Zeichenschicht in allen Phasen, Detail ab Ausführungsplanung.

### 4.3 Was bewusst NIE kommt (Ehrlichkeit)

- **GDL-Objektsprache.** ArchiCADs Objekt-System ist eine eigene
  Programmiersprache mit Jahrzehnten Bibliotheksbestand — das bauen wir
  nicht nach. Unser Weg: zod-parametrisierte Commands + kuratierte Kataloge
  (`katalogImportieren`) + IFC-Interop. Konsequenz offen benannt: fremde
  GDL-Objekte werden nie 1:1 laufen, nur als Geometrie ankommen.
- **Add-On-/API-Ökosystem und MEP-Modeler.** Kein Plugin-Markt, keine
  Haustechnik-Trassen — Interop über IFC/DXF, Haustechnik bleibt beim
  Fachplaner.
- **Lampe als Zeichenwerkzeug.** Licht ist bei uns Sache der Vis-Station
  (Rendern/HomeStation), nicht des Grundrisses.
- **Wall-End- und Eckfenster-Spezialwerkzeuge.** Beides lösen wir als
  Eigenschaft (Wandabschluss an der Wand, Eckfenster in der
  Fenster-Parametrik K21), nicht als eigene Toolbox-Einträge.
- **Marquee als eigenes Werkzeug.** Bleibt im Auswahl-Werkzeug integriert.
- **Morph in voller ArchiCAD-Form.** Freies Push/Pull-Modellieren beliebiger
  Körper ist ein Modellierkernel-Projekt (XL) mit kleinem Nutzen für den
  Büro-Alltag Wettbewerb→Ausführung; FreeMesh + Volumen decken die
  ehrlichen 90 %. Wird nur neu bewertet, wenn der Owner es explizit
  verlangt.

### 4.4 Offene Owner-Fragen

1. Bestätigt die Reihenfolge der Top-5 (insbesondere: Einstellungsdialog-
   Rahmen VOR weiteren Einzelwerkzeugen)?
2. Geländer: reicht der einfache Erst-Schnitt (Pfosten/Handlauf assoziativ,
   ohne Pattern-Editor) für Baueingabe-Niveau?
3. Skylight vs. Innenansicht — welches früher, falls Kapazität für nur eines?
4. Teil 4.3 («nie»-Liste) — Einverständnis, besonders zu GDL und Morph?
