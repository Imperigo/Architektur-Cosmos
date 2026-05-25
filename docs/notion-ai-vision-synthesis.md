# Notion AI Vision Synthesis

Stand: 2026-05-25  
Quelle: Notion-Seite `AI (2)` unter `Architektur Workflow-Pipeline` plus verlinkte Unterseiten `image-blaster` und `Skills architect`.

## 1. Gelesene Notion-Quellen

- `Architektur Workflow-Pipeline`: https://www.notion.so/366c5f77d5f7803ba125fabf83afa115
- `AI (2)`: https://www.notion.so/366c5f77d5f78023843eec81d63ea890
- `image-blaster`: https://www.notion.so/f98c5f77d5f782e6a2c481b9f25979ff
- `Skills architect`: https://www.notion.so/812c5f77d5f782fd886e816bcb01a7eb

## 2. Was die Notion-Vision bereits beschreibt

Die Notion-Seite beschreibt keine kleine Add-on-Idee, sondern eine komplette Architektur-Workflow-Pipeline fuer Wettbewerb und Entwurf. Die Grundstruktur ist:

- Manuelle Aktionen: bewusste Arbeitsschritte des Benutzers.
- PN-Manuell: Pipeline-Node mit Reglern und Buttons.
- PNA: programmierte Pipeline-Node-Automation.
- KI-Agent: recherchierende KI, die externe Informationen sammelt.
- KI-Erinnerung: lokales Projektgedaechtnis.
- KI-Generator: generiert Modelle, Bilder, Plaene, Layouts oder Texte aus Datenbank/Projektstand.
- AK: Architekturkosmos als Datenbank- und Referenzgrundlage.

Diese Logik passt sehr gut zur Kosmo-Architektur: Kosmo Zentrale orchestriert, Kosmo Data erinnert und liefert Quellen, Kosmo Design modelliert, Kosmo Draw erzeugt Plaene, Kosmo Viz erzeugt Bilder und Kosmo Publish buendelt Layout/Abgabe.

## 3. Phase 0: Vorbereitung / Grundlagenmodell

Ziel: Aus Wettbewerbs- und Standortgrundlagen entsteht ein digitales Grundlagenmodell plus Entwurfsdossier.

Wesentliche Elemente:

- Wettbewerbs-PDF wird importiert und durch KI-Erinnerung verstanden.
- Standort, Koordinaten und Projektparzelle werden als Blender-Nullpunkt erfasst.
- Grundlagenbedingungen, Boundaries, Do's/No-Do's und Parzellenverstaendnis werden im Projektgedaechtnis gespeichert.
- Deep Research sammelt trockene Fakten: GIS, Geschichte, Tektonik, Typologie, Topos, Demografie, Topografie, Infrastruktur, Bewegung, Natur, Material, Herstellung.
- Eine zweite Recherche sammelt mythische, kulturelle und narrative Ortsgeschichten.
- Atelier-Blaupause-/GIS-/3D-Daten werden importiert.
- Streetview, 3D-GIS und Gaussian-Splats koennen die Umgebung anreichern.
- Unsichtbare Baugesetz-Boundaries werden in 3D platziert.
- Bestand auf der Parzelle wird analysiert, markiert und bei Bedarf konzeptionell rekonstruiert.
- Exportpakete fuer neue Blender- und ArchiCAD-Dateien sind vorgesehen.

Kosmo-Einordnung:

- `Kosmo Prepare`: liest Wettbewerb, Ort, Gesetz, Programm, Fragen und Constraints.
- `Kosmo Data`: sammelt Quellen, Ortswissen, Referenzen, Rechte und Metadaten.
- `Kosmo Design`: erzeugt das Grundlagenmodell in Blender.
- `Kosmo Zentrale`: speichert Projektgedaechtnis, Entscheidungen, Unsicherheiten und Freigaben.

## 4. Phase 1: Wettbewerb / Entwurf

### Toolkit 1: AR Modelling

Die Notion-Vision sieht AR-Raum, Gesten, 3D-Skizzenstift, Speak-to-KI und Variantenwerkzeug vor. Das passt direkt zu `AR-Blender-Claude` und `KosmoDesign`.

Kosmo-Einordnung:

- `Kosmo Design`: Plan-Sketch-to-BIM, Raum-/Wand-/Geschossmodellierung, Varianten, Massen, 3D-Entwurf, AR-Interaktion, Snaps, Tracker, Story Stack.
- `Kosmo Zentrale`: nimmt Sprach-/Intent-Befehle entgegen und leitet sie kontrolliert an Blender weiter.

### Toolkit 2: Arch Visualizer

Vorgesehen sind Cycles-Renderings, Multipasses, standardisierte Kameras, 1.7m Augenhoehe, Materialkatalog, KI-Materiale, Asset-Scatter, Kompositor, AI Image Variants und Nachbearbeitung ohne komplettes Neu-Rendering.

Kosmo-Einordnung:

- `Kosmo Viz`: Render-Presets, Kameras, Licht, Material, Kompositor, AI-Varianten.
- `Kosmo Data`: Materialkatalog, Stilreferenzen, Projekt- und Referenzdaten.
- `Kosmo Zentrale`: Renderjobs, Kosten, Variantenprotokoll, Freigaben.

### Toolkit 3: Architekturkosmos-Datenbank

Die Notion-Vision sieht vor, Referenzprojekte aus `architekturkosmos.ch` direkt in Blender zu holen: Bilder, Plaene, Texte, 3D-Assets, Filter/Ebenen und Referenzkataloge.

Kosmo-Einordnung:

- `Kosmo Data`: ist genau diese Referenz- und Asset-Schicht.
- Blender soll nur public-safe, rechteklare oder intern markierte Daten konsumieren.
- Import braucht Lizenz-/Rechtewarnungen und Quellenstatus.

### Toolkit 4: 2D Plangenerierung

Vorgesehen sind Grundriss, Schnitt, Ansicht, Axonometrie und vektorisierte Exporte direkt aus Blender. Wichtig sind Geschosslogik, boolesche Schnitt-/Grundrissvolumen, Layer je Geschoss, Plananalyse, Referenzplanvergleich, Plan-KI-Generator, manuelle Nachbearbeitung und Export als DWG/PDF/ArchiCAD-Paket.

Kosmo-Einordnung:

- `Kosmo Draw`: erzeugt Planansichten, Schnitte, Axos und vektorisierte Zeichnungen.
- `Kosmo Design`: liefert semantische Modellobjekte und Geschoss-/Raumstruktur.
- `Kosmo Zentrale`: fuehrt Aenderungs- und Variantenprotokoll.

### Toolkit 5: 2D Layout-Designer

Vorgesehen sind Wettbewerbsplakate, Textvorschlaege, Layoutvorschlaege, manuelles Gestaltungsinterface, Projektverstaendnis aus Gedaechtnis, Referenzlayouts, Berichtserstellung und PDF-Export.

Kosmo-Einordnung:

- `Kosmo Publish`: Layout, Plakat, Planabgabe, Bericht und Exportpaket.
- `Kosmo Viz`: Bild- und Renderauswahl.
- `Kosmo Prepare`: Projekttext, Konzept, Narrative.
- `Kosmo Zentrale`: Freigabe, Versionierung, Exportpaket.

## 5. Innovationsliste aus Notion

Notion nennt als zu untersuchende Themen:

- Gemini Antigravity
- Gemini omni
- Subquadratic
- Gaussian-Splats
- AI-Physics
- Open-Design mit Claude
- Trellis.2
- image-blaster: Image-to-3D-Scene

Fuer Kosmo sind besonders relevant:

- Gaussian-Splats fuer Orts-/Bestandskontext und atmosphaerische Umgebungsschichten.
- AI-Physics fuer fruehe, konzeptionelle Entwurfs- und Interaktionssimulationen.
- Image-to-3D-Scene fuer schnelle Bestands-/Stimmungs-/Referenzmodelle.
- Skills-Architektur als Muster fuer modular geladenes Fachwissen.

## 6. Unterseite: image-blaster

Die `image-blaster`-Unterseite beschreibt ein System, das aus einem Bild schnell 3D-Umgebungen, Meshes, Gaussian Splats und Sound erzeugt. Es nutzt Claude Skills, World Labs, FAL, Hunyuan 3D und weitere Generatoren.

Kosmo-Relevanz:

- aus Referenzbild, Foto oder Rendering eine grobe 3D-Szene erzeugen
- statische Umgebung als Gaussian Splat, dynamische Objekte als GLB/OBJ
- schnelle Startpunkte fuer KosmoDesign, KosmoVis und Bestandsrekonstruktion
- sehr spannend fuer Phase 0 und fruehe Phase 1

Grenze:

- Solche Resultate muessen als konzeptionell/unsicher markiert werden.
- Rechte, Quellen und Modellqualitaet duerfen nicht automatisch public-safe sein.

## 7. Unterseite: Skills architect

Die `Skills architect`-Unterseite beschreibt ein Claude-Skill-System fuer Architekturwissen mit Fachskills, Laender-Dossiers und Rechnern fuer Flaechen, U-Werte, Tageslicht, Fluchtwege, Struktur, Energie und Kosten.

Kosmo-Relevanz:

- Sehr gutes Muster fuer progressive disclosure: nur benoetigtes Wissen wird geladen.
- Fachwissen kann als Skill-/Dossier-System strukturiert werden.
- Kosmo koennte eigene DACH-/Schweiz-/ETH-/Buero-Standards als lokale Skills fuehren.
- Rechner koennen als pruefbare Tools an KosmoZentrale angebunden werden.

Kosmo-Entscheidung:

- Externe Skills nicht blind uebernehmen.
- Als Inspiration fuer eigene, quellengestuetzte, lokale Architektur-Skills nutzen.
- Schweizer Normen, SIA, kantonale Baugesetze, ETH-Kontext und Buero-Standards separat aufbauen.

## 8. Mapping: Notion-Pipeline zu Kosmo-Modulen

| Notion-Element | Kosmo-Modul | Bedeutung |
| --- | --- | --- |
| Wettbewerbs-PDF, Standort, Baugesetz, Programm | Kosmo Prepare | Projektbrief, Constraints, offene Fragen |
| KI-Erinnerung / Projektgedaechtnis | Kosmo Zentrale + Kosmo Data | lokales Memory, Quellen, Entscheidungen |
| Deep Research Facts/Stories | Kosmo Data | Ort, Geschichte, Topos, Material, Referenzen |
| 3D Grundlagenimport | Kosmo Design | Blender-Grundmodell, Boundary-Layer |
| AR Modelling | Kosmo Design | Entwurf in Raum, Skizze, Geste, Sprache |
| Arch Visualizer | Kosmo Viz | Render, Material, Kamera, AI-Varianten |
| Architekturkosmos-Import | Kosmo Data + KosmoAsset | Referenzbibliothek und Assetbibliothek |
| 2D Plangenerierung | Kosmo Draw | Grundriss, Schnitt, Ansicht, Axo, Export |
| Layout-Designer | Kosmo Publish + Kosmo Prepare | Plakat, Text, Bericht, Wettbewerbsabgabe |
| Exportpakete | Kosmo Publish + Kosmo Zentrale | Versionierung, Freigabe, Ordnerstruktur |

## 9. Wie wir hier fortfahren sollten

Meine Empfehlung: Nicht als naechstes "ein CAD bauen", sondern den Notion-Workflow in einen ersten vertikalen Kosmo-Prototyp schneiden.

Diese Empfehlung wurde als MVP-Architektur festgehalten:

- `docs/kosmo-mvp-0-1-architecture.md`

### MVP-Schnitt 1: Wettbewerb Phase 0

Input:

- Wettbewerbs-PDF oder Projektordner
- Standort/Koordinaten
- einfache Baugesetz-/Programmnotizen

Output:

- Projektgedaechtnis mit Constraints, Fragen, Quellen
- Blender-Grunddatei mit Koordinaten, Parzelle, Boundary-Layern
- erstes KosmoPrepare-Briefing
- Review-Report: was ist sicher, was unsicher, was fehlt

### MVP-Schnitt 2: Skizze zu Modell

Input:

- einfache Plan-Skizze oder Textprompt
- Raumprogramm

Output:

- Kosmo Design erzeugt Raeume, Waende, Geschosse, Flaechen
- Kosmo Zentrale speichert Entscheidungen
- Kosmo Data liefert Referenzen/Assets
- Kosmo Draw erzeugt einfachen Grundriss/Schnitt als Export

### MVP-Schnitt 3: Modell zu Wettbewerbsmini-Paket

Input:

- Kosmo Design-Modell

Output:

- standardisierte Kameras
- EEVEE/Cycles Preview
- ein Planblatt oder PDF
- Varianten- und Aenderungsprotokoll

## 10. Wichtigste Produktidee aus der Synthese

Die neue eigene Software-Idee ist nicht losgeloest von der bestehenden Vision. Sie ist die Produktform davon:

Kosmo wird die lokale, KI-native Architekturmaschine, die den Notion-Workflow aus einzelnen Toolkits in ein zusammenhaengendes System verwandelt:

- von PDF/Ort/Skizze zu Modell
- von Modell zu Plan
- von Plan zu Layout
- von Referenz zu Entwurf
- von KI-Vorschlag zu menschlich freigegebener Architekturentscheidung
