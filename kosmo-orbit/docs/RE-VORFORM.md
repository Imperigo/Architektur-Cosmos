# RE-VORFORM — Reverse-Engineering-Dossier (öffentliche Quellen)

> Stand 03.07.2026, erstellt aus ausschliesslich öffentlichen Quellen (Website,
> öffentlich ausgelieferte Frontend-Assets auf String-Ebene, YouTube-Metadaten,
> Suchmaschinen-Snippets, Wayback-CDX). Kein Login, keine App-Nutzung, keine
> Code-Dekompilierung, keine ToS-Verletzung; die robots.txt von vorform.com
> (Content-Signal `search=yes, ai-train=no, use=reference`) wurde als
> Referenz-Nutzung respektiert — dieses Dossier zitiert und paraphrasiert,
> kopiert keine Inhalte. Jede Aussage trägt eine Beleg-Marke:
> **[W]** Website/Meta (vorform.com), **[B]** öffentlich ausgeliefertes
> JS-Bundle (nur menschenlesbare UI-/Fehlertexte und Dateinamen — keine
> Logik-Analyse), **[Y]** YouTube (oEmbed-Metadaten), **[S]** Such-Snippet
> (Instagram/LinkedIn/Crunchbase), **[A]** Wayback-Archiv, **[H]** Hypothese.

---

## 1 · Produkt-Identifikation + Positionierung

### 1.1 Welches «Vorform»?

Der Auftrag nannte als Kandidat Nr. 1 ein Schweizer Tool unter **vorform.io /
vorform.ch** (Volumenstudien mit Zonenrecht/Ausnützung). Befund:

| Kandidat | Befund (03.07.2026) |
|---|---|
| `vorform.io` | **existiert nicht** — DNS `ENOTFOUND` |
| `vorform.ch` | **existiert nicht** — DNS `ENOTFOUND` |
| `vform.pro` | Architekturbüro «VFORM» (Ukraine) — kein Software-Produkt, irrelevant |
| **`vorform.com`** | **das Produkt**: «Vorform — 3D without modeling», browserbasiertes Architektur-Entwurfstool. Analysiert in diesem Dossier. |

**Identifikation ist eindeutig**: vorform.com ist das einzige real existierende
Software-Produkt namens Vorform im Architekturbereich. Die im Auftrag
vermutete Zonenrecht-Ausrichtung hat sich **nicht bestätigt** — im gesamten
öffentlich einsehbaren Material findet sich **kein** Zonenrecht, **keine**
Ausnützungsziffer, **keine** Grenzabstände (Suchbegriffe zoning/parcel/
setback/Ausnützung/utilization: null Treffer im Bundle) [B]. Das dem Auftrag
vorschwebende «CH-Machbarkeits-Tool mit ÖREB-Daten» beschreibt eher **LUUCY**
(luucy.ch) — als verwandtes Referenzprodukt in 6.4 kurz eingeordnet.

### 1.2 Steckbrief

- **Name/Slogan**: «Vorform — 3D without modeling» [W]
- **Beschreibung (Meta/Landing)**: «Browser-based architectural design — draw
  in 2D, view the model in 3D, collaborate in real-time, and render in your
  browser. No modeling required.» / «Draw in 2D, view the model in 3D.» /
  «Collaborate in real-time. Render in the browser.» [W]
- **Macher**: Dan Carlberg — Instagram-Bio «Architect, ceramicist, Zürich»
  [S]; LinkedIn-Snippet verortet ihn früher bei Johannes Norlander Arkitektur
  AB (Schweden) [S]; Kontakt `dan@vorform.com`, Footer «© 2026 VORFORM»,
  Learn-Seite: «FOR UPDATES: FOLLOW @DANCARLBERG» [B]. **Zürcher
  Ein-Personen-/Kleinst-Produkt** — Rechtsform/HR-Eintrag nicht auffindbar
  (Lücke). Der Schweiz-Bezug aus dem Auftrag stimmt also im Ursprung, nicht
  im Funktionsumfang.
- **Status**: **Invite-only Beta mit Warteliste** («Vorform is invite-only —
  contact us if you'd like access», JOIN WAITLIST, Beta-Terms-Modal) [B].
  Keine Preisseite, kein Blog, keine Doku ausser einer Learn-Seite mit einem
  8-Minuten-Video [W]. Sehr jung: Domain war laut Wayback bis mindestens 2022
  eine «Domain for Sale»-Parkseite [A]; die Chat-Modellliste (Claude Haiku
  4.5 / Sonnet 4.6 / Opus 4.7) datiert den aktuellen Build auf 2026 [B].
- **Tutorial**: YouTube «Vorform: Draw and Render a Building in 8 Minutes»,
  Kanal «dan carlberg» (einziges Video des Kanals) [Y].
- **Stack (aus öffentlich sichtbaren Asset-Namen der index.html)**: Vite-SPA,
  React, Radix UI, three.js, Supabase (Auth/Cloud), Sentry, IndexedDB lokal
  [W/B]. Bemerkenswerte Parallele zu KosmoOrbit (React + three.js + eigener
  Ableitungskern).

### 1.3 Positionierung

Vorform besetzt die **früheste Entwurfsphase** (SIA 31 Vorstudie/Vorprojekt,
Wettbewerb): schnelles Volumen aus 2D-Zeichnung, Programm-Soll/Ist, Kontext
aus OpenStreetMap, sofortiges Bild (Echtzeit-3D + KI-Render). Es ist bewusst
**kein BIM** (kein IFC, keine Bauteil-Schichten, keine Normflächen) und
**kein Regel-Tool** (kein Baurecht). Die Essenz ist ein Paradigma:
**«Zeichnung + Semantik = Modell»** — jede 2D-Form kann Bedeutung tragen
(Wand, Programmfläche, Erschliessung, Öffnung, Möbel) und daraus wird das 3D
vollautomatisch abgeleitet. Genau diese Essenz meint der Werkzeug-Fahrplan
des Owner-Mandats (Q9: «ArchiCAD-Kern zuerst, dann **MassBody/Vorform**,
dann FreeMesh») und sie steckt schon im Kommentar von
`packages/kosmo-kernel/src/derive/volumenstudie.ts` («Vorform-Essenz»).

---

## 2 · Feature-Inventar

Reifegrad: ● belegt vorhanden · ◐ vorhanden, Umfang unklar · ○ nicht belegt/fehlt.

| # | Feature | Beschreibung | Beleg | Reife |
|---|---|---|---|---|
| F1 | 2D-Zeichenwerkzeuge | Select, Line, Rectangle, Circle/Ellipse/Arc, Polyline, Curve (Kontrollpunkte), Freehand, Text; Duplicate/Group/Hide/«Show only» | [B] Werkzeug-Labels + Validierungstexte | ● |
| F2 | Wand-Werkzeug | «Wall (Polyline)» mit Wandstärke (Default 0.2 m), Option Eckenumgriff (`wrapCorners`); Wände aus Rechteck/Kreis/Kurve/Polygon ableitbar | [B] | ● |
| F3 | Semantik-Zuweisung | Formen tragen Bedeutung: Wand, Programmfläche (Raum), Erschliessung (Treppe/Rampe), Öffnung, Möbel — das Kern-Paradigma | [B] `semantics.kind`, «Unsupported shape type for semantic command» | ● |
| F4 | Geschosse | Bis 100 Geschosse, Geschosshöhe je Floor, Geschossbereiche als Range («1-3,5»), per-Geschoss-Sichtbarkeit, «Ground Floor» | [B] «Floor numbers must be between 0 and 100», floorScope.range | ● |
| F5 | Dach-Katalog | Flat, Gable, Shed, Mansard, Gambrel, Butterfly, Sawtooth, Saltbox, Dome, Vault, Pyramid, Cone, «Cone mansard», M-shaped; ehrlicher Fallback: konkave/ungleich breite Polygone werden flach gerendert | [B] Labels + «Polygon gable roof rendered flat…» | ● |
| F6 | Treppen + Rampen | Gerade und Spindel-/Kreistreppen, Zwischenpodest, Riser/Tread-Parameter, Wange (Stringer), Untersicht (Soffit), Handlauf, Geländerfüllung (Panel/Pfosten/Stäbe); Rampen mit Stil + Stärke | [B] Detail-Tooltips («The vertical face under each step» usw.) | ● |
| F7 | Struktur | Stützen + Unterzüge (Profile rund/rechteckig), Struktur-Raster: Rectangular / Radial / Polygon / Curve Grid, Achsnummern/-beschriftung, Zuteilungs-Strategie | [B] «Structure & Circulation», Grid-Validierungen | ● |
| F8 | Fassaden-Modul-System | Fassadenmodule in eigenen Frames zeichnen (Module-/Elevation-Frames), Bindungen verteilen sie über Fassadenflächen (Face-Filter, Ausrichtung, Geschossbereich), Eckeninstanzen, Öffnungsanteile («Open %», «Gap %»); Stückliste als CSV | [B] facade bindings/corner instances, «APP_CSV_EXPORT_FACADE_INSTANCES_FAILED» | ● |
| F9 | Öffnungen | Fenster (Sill), Türen (Türblatt, Bandseite, Aufschlagrichtung, Dreh/Schiebe/Falt), «Flip door opening»; Öffnungen auf Front-/Seiten-/Oberflächen | [B] | ● |
| F10 | **Programmflächen mit Soll** | Programm-Targets (Code, Name, Sollfläche m²) mit Räumen darunter; gezeichnete Ist-Fläche live gegen Soll, %-Erfüllung, Summenzeile; Soll-Import («Import Area Targets»); Labels im Plan (Raumname, Soll) und 3D | [B] Tabellen-Spalten `programCode/programName/targetArea/actualArea/percentOfTarget`, Settings-Labels | ● |
| F11 | Möblierung | Möbelbibliothek (Bett, Sofa, Tisch, Stuhl, Café-/Desk-/Dining-Gruppen … als DXF-Top-Views), Bäume, Sonnenschirm, Photovoltaik | [B] DXF-Dateinamen + Labels | ● |
| F12 | **Standort-Kontext** | Adresssuche (Reverse-Geocode-Endpoint), OSM-Gebäude als 2D-Linien + 3D-Massen, OSM-Bäume, Terrain (2D-Konturen + 3D), Nord-Indikator, Rotation zu Nord, Attribution «OpenStreetMap contributors» | [B] «OSM data endpoint», «Terrain endpoint», `rotationToNorth`, `showTerrain2D/3D` | ● |
| F13 | 3D-Viewport | three.js; Perspektive/Orthographisch/Axonometrisch, Blickrichtungen per Taste (Front S, Back N, Left W, Right E), gespeicherte Ansichten, Kanten an/aus, Licht-Rig (Key/Fill/Back/Ambient), Schattenqualität, Tone Mapping, Exposure | [B] View-/Settings-Labels | ● |
| F14 | Material-Katalog | ~60 Render-Materialien (Beton, Sichtbeton, Backstein-Varianten, Holz horizontal/vertikal, Shou Sugi Ban, Metall-Familien, Glas-Familien, ETFE, Polycarbonat, Stampflehm, Eternit-Welle, Naturstein-Familien, Textil, PV …), Material-Legende in Plänen (auto-erkannt) | [B] Label-Liste + «Force material legend…» | ● |
| F15 | **KI-Render** | Bildgenerierung aus dem Viewport via **Google Gemini**; Prompt wird aus Szene/Materialien komponiert (Material-Prompts wie «ETFE pillow cladding, translucent white…»), einsehbar («View final prompt») und überschreibbar; Stil «Photorealistic», Seitenverhältnis, Kandidaten-Anzahl; **Kredit-System** («5 credits», «Out of AI credits. Resets …») | [B] | ● |
| F16 | **KI-Chat** | Chat-Assistent mit wählbarem **Claude**-Modell (Haiku 4.5 «fast, cheap», Sonnet 4.6, Opus 4.7 «smart, expensive»), Streaming, führt semantische Befehle auf Formen aus, Token-Kostenrechnung im Client | [B] `chatModels`-Chunk (Klartext), «Shape target not found for semantic command» | ● |
| F17 | Echtzeit-Kollaboration | Cloud-Sync (Supabase), Projekt-Sharing mit Rollen (Owner/Viewer, Mitglieder suchen/hinzufügen/entfernen), Konfliktschutz: «Undo blocked because a newer collaborator edit changed the same property» | [B] ShareModal + Sync-Meldungen | ● |
| F18 | Versionen + Autosave | Snapshots («Must be signed in to create snapshots»), Version-History-Modal, «Project restored to previous version», lokale Persistenz in IndexedDB, Offline-Weiterarbeit («continuing with local project only»), Wiederherstellungs-Fallbacks | [B] | ● |
| F19 | Import | DXF (2D-Plan + 3D), GLB/OBJ/FBX, Rhino .3dm (eigener Chunk `threedmImport`), Bilder JPEG/PNG/WebP ≤ 5 MB («Import as textured rectangle» oder 3D-Instanz) | [B] ImportModal | ● |
| F20 | Export | PDF (Plan-Frames), SVG, PNG/JPG, DXF, 3D: GLB/OBJ/**USDZ** (AR-tauglich), portables Projektarchiv `.vfmz` (VFM: document.json + Assets, Fingerprint-geprüft) | [B] ExportModal-Formatliste | ● |
| F21 | Frames/Leinwand | Zeichnen in «Frames» (benennbar, Navigation vor/zurück) auf einer Leinwand; Plan-Frames sind die Druck-Einheiten; Module-/Elevation-Frames füttern F8 | [B] «Frame name», «No plan frames available for PDF export» | ◐ (genaue Canvas-Organisation unklar) |
| F22 | Snapping + Masse | Shape-/Mittelpunkt-/Schnittpunkt-/Rastersnap, Winkel-Snap (Shift), Masse während des Zeichnens, Flächenlabels m² | [B] Settings «Snapping», `showDimensionsWhileDrawing` | ● |
| F23 | Bedienkomfort | Befehlspalette («Search commands…»), Shortcuts, Hell/Dunkel-Theme, Feedback-Modal, Admin-Dashboard (intern) | [W/B] | ● |
| F24 | Onboarding | Learn-Seite, ein 8-min-Video «Getting started: draw & render in 8 minutes» | [W/Y] | ◐ |
| — | **Nicht vorhanden** | IFC (kein Treffer), Schnitte/Sektionen als Planart (kein Beleg), Sonnenstand-/Schattenstudie (kein Beleg; nur Render-Setting «sunHighlight»), Baurecht/Zonen/Ausnützung (kein Treffer), Kostenkennwerte, generative Varianten-Optimierung (kein Beleg) | [B] Negativ-Suche | ○ |

---

## 3 · Kern-Algorithmen-Analyse

Alles hier ist aus **öffentlich sichtbaren Strings** (Fehlermeldungen,
Store-/Job-Namen, Validierungstexte) rekonstruiert — die Logik selbst wurde
nicht analysiert. Hypothesen sind markiert.

### 3.1 Ableitungs-Pipeline 2D→3D (das Herz)

**Belegt** [B]: Es gibt einen Job-basierten «Derivation»-Mechanismus mit
Warteschlangen je Domäne (`roofShapesToDerive`, `stairsToDerive`,
`rampsToDerive`, `pendingRenderShapesToMirror`), einem «derivation flush»
mit Fixpunkt-Kontrolle («Fixed-point violation detected during derivation
flush», «Fixed-point recovery retry budget exhausted», «Recursive derivation
flush detected»), Instanz-Stores (`StairInstancesStore`,
`RampInstancesStore`, `RenderShapesStore`, Facade-Sets, Modul-Instanzen mit
Waisen-Bereinigung) und Caches mit Inhalts-Hashes («Compiled geometry cache
miss», `elevationsFingerprint` = «content hash of elevation values»,
`TerrainContourCache`).

**Hypothese** [H]: Deklarative Ableitung — 2D-Quellformen sind die einzige
Wahrheit; abgeleitete 3D-Instanzen werden nach jeder Mutation inkrementell
neu erzeugt, bis ein Fixpunkt erreicht ist (Ableitungen können weitere
Ableitungen triggern, z. B. Fassadenmodule auf abgeleiteten Wandflächen).
Das ist strukturell **dieselbe Architektur wie KosmoOrbits Derive-Pipeline**
(Commands → derive → Pläne/3D), nur mit expliziter Job-Queue statt
Voll-Rederivation.

### 3.2 Massen-/Volumenerzeugung

**Belegt** [B]: Formen erhalten «Shape Height» bzw. Geschossbereiche;
Wände sind Polylinien mit Stärke (Offset beidseits, Eckenumgriff optional);
Dächer sind ein parametrischer Typenkatalog auf dem Footprint, mit ehrlichem
Flach-Fallback bei nicht unterstützten Polygonen. **Hypothese** [H]: reine
2D-Polygon-Offsets + Extrusion je Geschossbereich, Dächer als Spezialfamilien
— **kein allgemeines 3D-CSG** (keinerlei Boolean-/CSG-Strings). Deckt sich
mit KosmoOrbits Prinzip «2D-Boolean vor Extrusion».

### 3.3 Regelwerk-Einbindung (Zonenrecht, AZ/BMZ, Höhen/Abstände)

**Befund: existiert nicht.** Vorform prüft keine einzige baurechtliche
Regel. Die einzige «Regel»-Ebene ist das Raumprogramm (Soll/Ist). Für
KosmoOrbit heisst das: Der im Auftrag vermutete «Zonenregel-Katalog» ist
**keine Vorform-Kopie, sondern eine Differenzierungs-Chance** (siehe 6/7).

### 3.4 Kennzahlen-Live-Ableitung

**Belegt** [B]: Programm-Targets `{code, name, targetArea}` mit Räumen;
gezeichnete Programmflächen liefern `actualArea`; Tabelle mit Spaltenmodell
`programCode | programName | targetArea | actualArea | percentOfTarget`
inklusive Summenzeile (Gesamt-Soll, Gesamt-Ist, Gesamt-%); Soll-Import als
Datei; Flächenlabels live im Plan (Raumname + Soll einblendbar, auch 3D).
**Hypothese** [H]: Ist-Fläche = Polygonfläche der Form × 1 (keine Faktoren,
keine GF/HNF-Systematik). KosmoOrbits Berechnungsliste (HNF-Soll → aGF-Ziel
× 1.22, Δ Max, Tie-out) ist fachlich **reicher**; Vorform ist dafür
**generischer** (freie Codes statt fixe Wohnungstypen) und hat die
**Raum-Ebene unter dem Typ** plus **Soll-Import** — beides fehlt uns.

### 3.5 Fassaden-Algorithmus (der originellste Teil)

**Belegt** [B]: Module werden als eigene Frames gezeichnet; «Bindings»
koppeln Modul ↔ Zielflächen mit `faceFilter` (welche Fassadenseiten),
`alignment`, `floorScope.range` (z. B. «1-3,5»); es entstehen zählbare
Instanzen inkl. Eckeninstanzen; Waisen (Binding ohne Frame/Grid) werden
bereinigt; Export der Instanzen als CSV. **Hypothese** [H]: Fassadenfläche
wird aus dem extrudierten Volumen abgewickelt, in ein Raster (Modulbreite ×
Geschosshöhe) unterteilt und pro Zelle die Modul-Zeichnung instanziert —
regelbasierte Wiederholung statt Modellierung; die CSV ist faktisch eine
**Elementliste** (Vorfabrikations-Denke).

### 3.6 Standort-Kontext

**Belegt** [B]: eigener Backend-Proxy («Reverse geocode endpoint», «OSM
data endpoint», «Terrain endpoint»); Ergebnis: `osmBuildings`, `osmTrees`,
`terrain` (+ Attribution, zOffset), 2D-Hintergrund + 3D-Site, Rotation zu
Nord, Farben für Kontext-Linien/-Gebäude einstellbar. **Hypothese** [H]:
Overpass-/OSM-Abfrage im Umkreis, Gebäude aus Footprint + Höhen-Tags
extrudiert, Terrain aus einem DEM-Dienst trianguliert und als Konturen
geschnitten. Kein Kataster, keine Parzellengrenzen, keine amtliche
Vermessung — für CH-Machbarkeit klar zu wenig.

### 3.7 KI-Render

**Belegt** [B]: Screenshot/Canvas + **komponierter Text-Prompt** (u. a.
fotoreale Materialbeschreibungen je Katalogeintrag) → Gemini-Bildmodell;
Nutzer kann den finalen Prompt sehen, kopieren, überschreiben
(`render-prompt-override`); Kandidaten-Anzahl, Seitenverhältnis, Kredite mit
Reset-Zeitpunkt; Kamera-Presets («0° = camera at south (front), 90° = west
…»), Korrektur «refined photorealistic height offset». **Hypothese** [H]:
Image-to-Image-Konditionierung auf dem Viewport-Bild — das 3D liefert
Geometrie-Wahrheit, die KI liefert Material/Licht/Entourage. Architektonisch
identisch mit KosmoVis' Ansatz (Modell → Bild), nur Cloud statt HomeStation.

### 3.8 Kollaboration/Persistenz

**Belegt** [B]: Supabase-Auth (Magic Link + Passwort), Cloud-Dokumente mit
`docVersion`/Content-Hash, IndexedDB mit OPERATIONS- und SNAPSHOTS-Stores,
`baseSeq`/Diffs, Undo-Log-GC, Rollback-Integritätsprüfung mit «Freeze»,
Konflikt-UI («Sync entity conflict surfaced to user»), Undo-Sperre bei
kollidierender Fremdänderung derselben Property. **Hypothese** [H]:
Operations-Log + Snapshots mit Property-Level-Konfliktauflösung (Last-Writer
-Wins + Undo-Schutz), **kein CRDT** — schwächer als KosmoOrbits Yjs-Ansatz,
dafür mit auffällig viel Wiederherstellungs-/Integritäts-Maschinerie
(Fallback-Ketten, «Truth snapshot restore», Degraded-Cache-Repair).

### 3.9 Varianten/Optimierung

**Kein Beleg** für Varianten-Vergleich, Massen-Generatoren oder generative
Optimierung. Vorform ist ein manuelles Direkt-Werkzeug. KosmoOrbits
Volumenstudien-Generator (Extremvarianten) hat dort **kein Vorbild und keine
Konkurrenz** im Produkt.

---

## 4 · UX-Muster

1. **Zeichnen statt Modellieren**: Der gesamte Input ist 2D (Maus/Stift-nah);
   3D ist reine, stets aktuelle Ableitung. Kein einziges 3D-Editier-Werkzeug
   belegt. Slogan trägt das Versprechen («3D without modeling») [W].
2. **Semantik nachträglich**: erst Form, dann Bedeutung (Wand/Programm/
   Erschliessung) — geringe Einstiegshürde, Skizzenlogik [B].
3. **Frames als Ordnung**: Pläne, Fassadenmodule, Ansichten leben als
   benannte Frames; PDF-Export = Auswahl von Plan-Frames [B]. (Figma-Muster
   auf Architektur übertragen [H].)
4. **Live-Zahlen im Bild**: Flächen-m², Raumname, Soll-Wert direkt am
   Polygon; Programm-Tabelle mit %-Erfüllung — Feedback ohne Moduswechsel [B].
5. **Regel-Feedback = ehrliche Degradierung**: nicht Machbares wird sichtbar
   benannt («Polygon gable roof rendered flat…», DXF-Export «omits
   unsupported shapes») statt still verschluckt [B] — dieselbe Haltung wie
   KosmoOrbits «ehrlich markieren statt verstecken».
6. **KI als Beschleuniger, nicht Autor**: Chat mit Modellwahl und
   Kosten-Transparenz; Render-Prompt einsehbar/überschreibbar — Nutzer
   behält die Hand [B].
7. **Berichte**: PDF-Plansätze aus Frames, Programm-Tabelle (mit Summen und
   %), CSV-Fassadenstückliste, 3D-Abgabeformate inkl. USDZ (iPad/AR) [B].
8. **Niedrige Betriebs-Reibung**: Browser, Magic-Link, Autosave, Offline-
   Fallback, Wiederherstellungs-Ketten, Theme hell/dunkel [B/W].
9. **Beta-Gemeinschaft**: invite-only, Warteliste mit Zähler, Feedback-Modal,
   persönliche Absender-Adresse — Solo-Founder-Nähe als Feature [B].

---

## 5 · Datenmodell-Hypothese

Aus Validierungs-/Serialisierungs-Strings des portablen Formats (VFM/.vfmz:
`document.json` + Asset-Manifest + Fingerprint) [B], Rest [H]:

```
Project (.vfmz)
├─ metadata { name, timestamps, owner, docVersion, contentHash }
├─ document
│  ├─ floors[]        { id, enabled, height }            // 0–100
│  ├─ shapes[]        // 2D-Primitive: line|rect|circle|polyline|curve|freehand|text|grid|furniture
│  │   ├─ geometry    (points/center/rotation …)
│  │   ├─ style       (stroke, colorFill|hatchFill|textureFill|gradientFill)
│  │   ├─ semantics   { kind: wall|programArea|circulation|opening|structure,
│  │   │                targetId, roomId, wallThickness, wrapCorners,
│  │   │                circulationType, stairConfig|rampConfig, floorRange }
│  │   └─ frameId
│  ├─ frames[]        { id, name, kind: plan|module|elevation }
│  ├─ bindings[]      { kind, frameId, gridId, facadeConfig{faceFilter, alignment},
│  │                    floorScope{range} }               // Fassadenmodule
│  ├─ program         { targets[{ id, code, name, targetArea, rooms[] }], enabled }
│  ├─ location        { geocode, rotationToNorth, offsetX/Y, osmData{buildings,trees},
│  │                    terrain{contours, attribution}, background2D, site3D }
│  ├─ roofSettings / slabSettings / columnSettings / beamSettings (je Form-Id)
│  └─ settings        (Anzeige, Einheiten m², Licht, Render …)
├─ derived (nicht persistiert): wall/roof/stair/ramp/facade/element instances
└─ assets { images, models(GLB-normalisiert), furniture-DXF }
```

**Vergleich der Ketten**: Vorform: *Zeichnung → Semantik → Volumen →
Programm-Kennzahlen* (+ Kontext als Kulisse). KosmoOrbit-Ziel: *Parzelle →
**Regeln** → Volumen → Kennzahlen*. Vorform fehlt die Regel-Ebene komplett;
uns fehlt Vorforms Kontext-Ebene (Ort/OSM/Terrain) und die Raum-Ebene im
Programm.

---

## 6 · Abgleich mit dem KosmoOrbit-Bestand

### 6.1 Wo KosmoOrbit schon vorne ist

| Thema | Vorform | KosmoOrbit heute |
|---|---|---|
| Volumenstudien-Generator | ○ fehlt | ● 6 Typologien mit Owner-Regeln (`derive/volumenstudie.ts`: Spänner-Tiefen, Hof ≥ 13 m, 3h-Näherung) |
| CH-Kennzahlen | ○ nur Soll/Ist generisch | ● Berechnungsliste (HNF→aGF ×1.22, Δ Max, Tie-out, Typ-Farben; ROADMAP 25) |
| Schattenstudie | ○ fehlt | ● suncalc, Datum/Zeit, Innerschweiz (ROADMAP 19) |
| Baurecht-Ansatz | ○ fehlt | ◐ Boundary-Entity + Grundriss-Checks melden Lage-/Höhenverstösse (ROADMAP 30) |
| BIM/IFC, SIA-Pläne, Schnitte | ○ fehlt | ● voll (IFC-Roundtrip, SIA-Stifte, Poché, Bemassung) |
| Sync | ◐ Op-Log/LWW | ● Yjs-CRDT + Offline-Queue (ROADMAP 42) |

### 6.2 Was Vorform hat und uns fehlt (die Lücken)

1. **Standort-Kontext auf Knopfdruck** (F12): Adresse → Umgebungsgebäude,
   Bäume, Terrain, Nord. Bei uns existieren nur manuelle Kontext-Layer
   (IFC/Splat). Für die Schweiz können wir das sogar besser: swisstopo
   (swissBUILDINGS3D, swissALTI3D, AV-Parzellen) statt nur OSM.
2. **Zonenregel-Katalog CH + Grenzabstands-Checks**: fehlt bei BEIDEN —
   unsere Chance. Heute haben wir nur `grenzabstand`-Option (fix 4 m) im
   Generator und die Baugrenze je Geschoss.
3. **Raum-Ebene + Soll-Import** in der Berechnungsliste (F10): Räume unter
   Wohnungstypen, Soll aus Excel/CSV importieren, %-Erfüllung als Spalte.
4. **Varianten-Matrix**: fehlt bei Vorform ebenfalls; unser Varianten-Panel
   erzeugt Studien, aber Archiv/Nebeneinander-Vergleich mit Kennzahlen fehlt
   (ROADMAP 25 «offen: Varianten-Archiv»).
5. **Fassaden-Modul-Studien** (F8): Modul zeichnen → über MassBody-Fassade
   rastern → Elementliste. Bei uns nur Wand-Aufbauten, keine Fassadenraster.
6. **MassBody-Direktzeichnen mit Live-m²** (F22): Flächenlabel während des
   Ziehens; unser MassBody entsteht über Werkzeug + Inspector.
7. **Ehrlich prüfen, nicht übernehmen**: KI-Bildrender via Cloud (F15) —
   bei uns bewusst HomeStation-Sache (Q4/Q22), kein Handlungsbedarf; die
   Idee «finaler Prompt sichtbar/überschreibbar» ist aber ein gutes
   KosmoVis-UX-Detail.

### 6.3 Paradigma-Bestätigung

Vorform validiert zwei KosmoOrbit-Grundentscheide unabhängig: (a) reine
2D-Eingabe mit abgeleitetem 3D skaliert bis zur Fassadenebene, (b) ehrliche
Degradierung schlägt stille Magie. Der Owner-Fahrplan «MassBody/Vorform als
Werkzeug-Stufe» heisst konkret: **MassBody so zeichenbar machen wie eine
Vorform-Shape** (Umriss ziehen, Geschossbereich, Programm-Typ, live m²).

### 6.4 Randnotiz LUUCY (nicht Analysegegenstand)

Für den CH-Regel-Teil (ÖREB-Kataster, amtliche Vermessung, Zonen im
3D-Stadtmodell) ist LUUCY (luucy.ch) das real existierende Schweizer
Referenzprodukt [S]. Falls der Owner mit «Vorform» funktional eher DIESES
Profil meinte, deckt Bau-Block V-3/V-4 unten genau das ab — als eigener
Baustein, nicht als Vorform-Nachbau.

---

## 7 · Priorisierte Bau-Blöcke (Stil V2-Entscheidungsvorlage)

Aufwand in Blöcken: S = 1, M = 2–4, L = 5+.

| # | Kandidat | Nutzen | Aufwand | HomeStation? |
|---|---|---|---|---|
| V1 | **Zonenregel-Katalog CH** (Zone als Datensatz: AZ/ÜZ/BMZ, max. Höhe/Geschosse, Grenzabstand klein/gross, Mehrlängenzuschlag; Kanton ZG/LU zuerst, editierbar als Karteikarten; Parzelle→Zone-Zuweisung; speist Volumenstudien + Δ-Max der Berechnungsliste automatisch) | Das, was der Auftrag in Vorform vermutete — existiert dort NICHT: unsere Differenzierung; macht Q12-Kennzahlen rechtsverbindlich statt frei | M–L | nein |
| V2 | **Grenzabstands-/Höhen-Checks live** (offsetPolygon je Regel statt fix 4 m, gestaffelte Abstände nach Fassadenhöhe, Verletzungs-Schraffur im Grundriss + rote Kante in 3D; Anschluss an bestehende Grundriss-Checks/Boundary) | Jede Studie sofort «zulässig/nicht zulässig»; baut direkt auf `volumenstudie.ts` + Boundary (ROADMAP 30) auf | M | nein |
| V3 | **Varianten-Matrix** (Studien als benannte Varianten archivieren, Galerie nebeneinander: Mini-Axo + GF/aGF/Δ Max/Besonnung/Checks als Vergleichstabelle, «Variante übernehmen»; schliesst ROADMAP-25-Rest «Varianten-Archiv») | Owner-Kernritual im Wettbewerb; Vorform hat es nicht — niemand hat es | M | nein |
| V4 | **CH-Standort-Kontext** (Adresse→Koordinate, swissBUILDINGS3D-Umgebung + swissALTI3D-Terrain + AV-Parzellengrenze als Kontext-Layer, Nordpfeil aus Geodaten; OSM als Fallback) | Vorforms sichtbarster Wow-Effekt, mit amtlichen CH-Daten statt OSM; füttert V2 (echte Parzellen) und Schattenstudie (echte Nachbarn) | L (APIs + 3D-Einbindung) | nein (öffentliche geo.admin.ch-APIs; Cache via Bridge optional) |
| V5 | **Raum-Ebene + Soll-Import in der Berechnungsliste** (Räume unter Wohnungstypen, %-Erfüllung-Spalte, CSV/Excel-Import des Raumprogramms) | Wettbewerbs-Soll kommt als Datei — nie mehr abtippen; direkte Vorform-Übernahme (F10) | S–M | nein |
| V6 | **MassBody-Direktzeichnen** (Umriss ziehen mit Live-m²-Label, Geschossbereich + Programm-Typ im Zug, danach Semantik wechselbar) | Die «Vorform-Essenz» als Handgefühl; Einstiegshürde der Volumenphase sinkt auf Skizzenniveau | S–M | nein |
| V7 | **Fassaden-Modul-Studien** (Modul als 2D-Zeichnung, Raster über MassBody-Fassaden mit Face-Filter/Geschossbereich, Eckenregel, Elementliste als CSV) | Vorfabrikations-Denke früh; stärkstes Vorform-Alleinstellungsmerkmal | L | nein |
| V8 | **Render-Prompt-Transparenz in KosmoVis** («finalen Prompt anzeigen/überschreiben» am Render-Job, Material→Prompt-Bausteine aus dem Materialkatalog) | Kleines UX-Detail aus F15 mit grossem Vertrauensgewinn | S | Renders ja (wie bisher), Feature nein |

**Empfehlung (Reihenfolge)**: **V2 → V1 → V3** als zusammenhängender
«Baurecht-Dreisprung» (V2 ist mit Bestand am schnellsten sichtbar, V1 gibt
ihm die Daten, V3 macht ihn zum Owner-Ritual). Danach **V5 + V6** (kleine,
tägliche Gewinne), dann **V4** (grosser Wow, aber API-Integrationsaufwand).
**V7** erst nach Praxis-Feedback; **V8** als Lückenfüller jederzeit.

---

## 8 · Quellenverzeichnis + Lückenliste

### Quellen (alle öffentlich, abgerufen 03.07.2026)

1. https://vorform.com/ — index.html: Titel, Meta-Description, OG-Tags,
   Theme, Asset-Manifest [W]
2. https://vorform.com/robots.txt — Cloudflare Content-Signals
   (search=yes, ai-train=no, use=reference) [W]
3. Öffentlich ausgelieferte JS-Bundles (anonym abrufbar, nur String-Ebene):
   `assets/index-fXNHXwHi.js`, `MainView-CDM1ENg_.js`,
   `SignedOutPage-DLpNgrpr.js`, `LearnPage-Cxxbt5me.js`,
   `ExportModal-Cr1rmiPC.js`, `ImportModal-D13JkDcY.js`,
   `SettingsModal-BxgoI5L8.js`, `ShareModal-BITZjwxH.js`,
   `chatModels-DSmK4AVb.js`, `BetaTermsPreview-Ci8LPg2Z.js` [B]
4. YouTube oEmbed: «Vorform: Draw and Render a Building in 8 Minutes»,
   Kanal «dan carlberg» (youtube.com/watch?v=vbMy6j4_J4o) [Y]
5. Such-Snippets: Instagram @dancarlberg («Architect, ceramicist Zürich»),
   LinkedIn Dan Carlberg (Johannes Norlander Arkitektur AB), Crunchbase
   (Co-founder/Designer @ Activate) [S]
6. Wayback CDX für vorform.com (Snapshots 2013–2022: Domain-Verkaufsseite;
   keine Captures des heutigen Produkts) [A]
7. LUUCY-Randnotiz: luucy.ch «App-Tipp: Machbarkeitsstudien» [S]

### Ehrliche Lücken

- **Preise/Geschäftsmodell**: nichts öffentlich (invite-only Beta; nur
  KI-Render-Kredite belegt). 
- **Launch-Datum, Nutzerzahlen, Roadmap**: unbekannt; kein Blog/Changelog.
- **Firmenform/HR-Eintrag** (Einzelfirma? GmbH?): nicht auffindbar.
- **Video-Inhalt**: YouTube-Watch-Seite lieferte über den Proxy keine
  Beschreibung/kein Transkript (nur oEmbed-Metadaten); der konkrete
  8-Minuten-Workflow ist deshalb nicht Schritt für Schritt belegt.
- **X/@dancarlberg und LinkedIn-Details**: hinter Login — nicht abgerufen.
- **In-App-Verhalten** (echte Bedienung, Qualität der Ableitung, Grenzen):
  nicht getestet — App ist invite-only; alle ◐/[H]-Einstufungen bleiben
  Hypothesen bis zu einem Hands-on.
- **vorform.io / vorform.ch**: existieren nicht; falls der Owner unter
  diesem Namen ein ANDERES Tool im Kopf hat (z. B. LUUCY-Profil), bitte
  Rückmeldung — Abschnitt 6.4 und die Bau-Blöcke V1–V4 decken dieses Profil
  vorsorglich ab.
