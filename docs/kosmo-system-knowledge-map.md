# Architektur Kosmos / Kosmo System Knowledge Map

Stand: 2026-05-25  
Zweck: Gemeinsames Arbeitsgedaechtnis fuer die laufenden Kosmo-Projekte, damit neue Codex-/Claude-Sessions nicht bei null anfangen.

Namensregel: Der Dachname des Projekts ist **Architektur Kosmos**. Die lokale KI heisst **Kosmo**. Bestehende Dateien, APIs oder Dokumente koennen noch `KOSMO` als historische/technische Schreibweise enthalten.

## 1. Kernverstaendnis

Architektur Kosmos ist nicht als 1:1-Kopie von ArchiCAD, Vectorworks, Rhino oder Blender zu verstehen. Die Produktidee ist ein lokales, KI-natives Hardware- und Software-Netzwerk fuer Architekturbueros:

- Kosmo ist das lokale Herz des Netzwerks und laeuft perspektivisch auf einer starken HomeStation im Buero.
- Kosmo denkt nicht nur in CAD-Befehlen, sondern in Projektabsicht, Quellen, Regeln, Varianten, Plaenen, Modellen, Freigaben und Buero-Wissen.
- Das Ziel ist nicht, manuelles Zeichnen besser zu kopieren, sondern den Weg von Skizze, Sprache, Referenz, Kontext, AR-Geste oder Foto zu pruefbaren Plaenen, 3D-Modellen und Entscheidungen neu zu bauen.
- Der Mensch bleibt Autor, Kritiker und Freigabeinstanz. Kosmo bereitet vor, prueft, dokumentiert und schlaegt vor.

Arbeitsthese: Das eigentliche Produkt ist nicht ein einzelnes CAD, sondern ein lokales Architektur-Produktionssystem mit Kosmo Design als raeumlicher Werkbank, Kosmo Data als Wissens- und Asset-Gedaechtnis, Kosmo Orbit als Software-Schicht und Kosmo Zentrale als physischer KI-Zentrale.

## 2. Projektkarte

| Bereich | Rolle | Status / Gelerntes |
| --- | --- | --- |
| Architecture Cosmos / KosmoData | Oeffentliche Wissens-, Referenz- und spaeter Asset-Schicht | Aktiver Next.js/Cloudflare-Static-Export, radialer Atlas, Brain-Tools, KosmoData-Pipelines, Cloud-Brain-Entwurf, Modul-Hub-Roadmap. |
| KosmoZentrale | Lokales Kontrollzentrum / Kosmo Core | Separates OneDrive-Projekt mit FastAPI Control Hub, SQLite, Jobs, Approvals, Events, Artifacts, Memory, Benchmarks, Android/macOS Control Center und Operator Mode. |
| KosmoDraw / Kosmo Design | Blender-native Entwurfs- und Zeichnungswerkbank | Aktives Blender-Add-on mit Action-Bus, Plan-Sketch-to-BIM, ArchiCAD-aehnlicher UX, Snaps, Tracker, Story Stack, AI Layouts, Voice Commands, Schnitt/Fassade-Tools und erster Kosmo Project Package Bridge. |
| ArchViz Toolkit / Blender-Claude | Visualisierungs- und Variantensystem | Blender 5.1 plus KI/ComfyUI/SDXL, Materialkatalog, Masken, Multipass-Rendering, Bolognese-Refiner, ArchViz-Pipeline V6. |
| Blender Capability Scan | Werkzeugkarte fuer Kosmo | Erfasst Blender-Subsysteme wie Python API, Geometry Nodes, Physics, Cycles/EEVEE, Sun Position, Grease Pencil, Asset Libraries und Import/Export als Kosmo-Bausteine. |
| Notion AI Vision | Prozessvision fuer Wettbewerb/Entwurf | Beschreibt Phase 0 Grundlagenmodell, Phase 1 AR-Modelling, ArchViz, Architekturkosmos-Import, 2D-Planwerk, Layout-Designer und Innovationsliste. |
| Architektur Kosmos Network Concept | Namens- und Netzwerkbild | Definiert die sichtbaren Namen: Architektur Kosmos, Kosmo Data, Kosmo Orbit, Kosmo Zentrale, Kosmo Design, Kosmo Prepare, Kosmo Draw, Kosmo Viz, Kosmo Publish. |
| Kosmo MVP 0.1 Architecture | erster vertikaler Prototyp | Schneidet die Vision auf ein lokales Projektpaket von Brief/Ort/Skizze zu Blender-Modell, Planexport, Preview und Review-Pack. |
| KosmoCAD | Begriff / leerer Projektordner | Der Name existiert, aber die vorhandene Substanz liegt eher in KosmoDesign, KosmoZentrale und KosmoData. |
| Recht / Business / ETH | Gruendung, Schutz, Lizenz- und Produktstrategie | Es existieren OneDrive-Unterlagen und PDF/Markdown-Dateien zu rechtlichen und betriebswirtschaftlichen Fragen; noch nicht als kanonische Kosmo-Strategie zusammengefuehrt. |

## 3. Aktuelle Module

### Kosmo Zentrale

Kosmo Zentrale ist das operative Nervensystem und die physische Hardware-Zentrale. Gefundene Bausteine:

- lokaler FastAPI Control Hub
- SQLite-Persistenz fuer Jobs, Approvals, Events, Artifacts, Memory und Reports
- Android App und macOS Advanced Control Center als Kontrolloberflaechen
- Agent Router fuer Codex, Claude, Blender, Website, Research, ComfyUI/Ollama und spaeter lokale Modelle
- Operator Session Registry fuer laufende KI-/Terminal-/Desktop-Sessions
- Screen Control Mode mit sichtbarer Kontrolle, Fokus auf erlaubte Apps, sicherem Texteingabe-Hand-off und Live-Screen-Tracking ohne Speicherung
- Approval Gates fuer riskante Aktionen wie Publish, Push, Upload, Kosten, externe Kommunikation oder Datenveraenderung

Kosmo Zentrale ist damit der Ort fuer Orchestrierung, Sicherheit, Freigaben, lokale Sessions, Aufgabenverteilung und Buero-Gedaechtnis.

### Kosmo Data

Kosmo Data ist die Daten-, Referenz- und Asset-Schicht. Aus den gelesenen Dokumenten:

- Referenzbibliothek: Architekturgeschichte, Projekte, Personen, Orte, Stile, Quellen, Medien und Netzwerkbeziehungen im Wormhole-/Atlas-Interface.
- Asset-Bibliothek: wiederverwendbare 3D-/2D-Assets, Bauteile, Details, Fassadenmodule, Materialsysteme, Treppen, Stuetzen, Dachformen, Landschaftselemente, Blender Collections und ArchiCAD-Layer.
- Strikte Trennung von privaten Rohdaten und oeffentlich geprueften Inhalten.
- Rechte- und Quellenstatus sind zentrale Datenfelder, nicht nachtraegliche Dekoration.
- Public Website bleibt derzeit static-facing und liest aus `data/mock-entries.json`; D1/R2 sind geplant bzw. vorbereitend, aber nicht frei live zu beschreiben.

Wichtige Produktentscheidung aus den Sessions: KosmoAssets bleibt vorerst innerhalb von Kosmo Data und wird nicht als eigenes Orbit-Modul abgespalten.

### Kosmo Design

Kosmo Design ist die konkrete Blender-native Entwurfswerkbank und der zentrale Planungsbot:

- separates Add-on `kosmo_design`, getrennt vom AR-Bridge-Code
- `ar_bridge` als Action-Bus und WebXR-/Blender-Verbindung
- 2D Plan-Sketch-to-BIM: Polygon-Grundriss erzeugt Waende, Boden, Decke und BIM-nahe Custom Properties
- ArchiCAD-aehnliche UX mit Top-Ortho-Lock, Tracker, Snap, Achsensperren, Pipette/Parameter Transfer, Push-Pull, Story Stack
- AI-Funktionen: Text-to-Room, Multi-Room Layouts, Raumfunktionsklassifikation, Varianten behalten/verwerfen, async Streaming
- Voice MVP: Browser Speech API zu Action-Bus zu Blender-Operatoren
- Schnitt/Fassade-Tools mit Panels und Oeffnungen

Dies ist der derzeit staerkste Beweis, dass die Vision nicht bei Theorie bleibt: Skizze, Sprache und KI koennen bereits in Blender-nahe Architektur-Geometrie uebersetzt werden.

### Kosmo Orbit, Kosmo Prepare, Kosmo Draw, Kosmo Viz, Kosmo Publish

Diese sichtbaren Modulnamen stammen aus der visuellen Architektur-Kosmos-Grafik und ersetzen/ordnen einige fruehere Arbeitsnamen:

- Kosmo Orbit: Software-Schicht und Modul-Umlaufbahn zwischen Data, Design und Zentrale.
- Kosmo Prepare: Vorbereitung, Wettbewerb/Briefing, Standort, Baugesetz, Programm, Boundaries.
- Kosmo Draw: Zeichnung, Skizze, Grundriss/Schnitt/Ansicht, vektorisierte Plaene.
- Kosmo Viz: Visualisierung, Bildvarianten, Rendering, KI-Refinement, Praesentationsmaterial.
- Kosmo Publish: Export, Wettbewerbsabgabe, Bericht, Layout, Freigabe und Publikation.

Die Notion-Seite `AI (2)` bestaetigt dieses Mapping: Phase 0 entspricht vor allem Kosmo Prepare/Kosmo Data/Kosmo Zentrale, AR Modelling entspricht Kosmo Design, Arch Visualizer entspricht Kosmo Viz, 2D Plangenerierung entspricht Kosmo Draw und Layout/Abgabe entspricht Kosmo Publish.

## 4. Technische Grundentscheidungen

### Blender als Basis, aber vorsichtig mit Forking

Die vorhandenen Unterlagen sprechen eher fuer:

- Blender als Host, Engine und visuelle Werkbank nutzen
- Wert in Kosmo Core, Daten, Workflows, Agenten, Freigaben, lokalen Modellen, Assets und Support schaffen
- Blender-Connector/Add-ons duenn halten, sauber namenspacen und GPL-/Add-on-Grenzen respektieren
- erst spaeter forken, falls echte Produktgruende entstehen

Ein frueher Blender-Fork wuerde Wartung, Lizenzklarheit, Updates und Distribution massiv erschweren. Ein Add-on-/Connector-Ansatz ist fuer eine 1-2-Personen-Armee mit KI-Zugriff viel realistischer und passt besser zum aktuellen Code.

### Lokales System vor Cloud-SaaS

Kosmo ist besonders stark, wenn es lokal laeuft:

- sensible Buero- und Projektdaten bleiben im Buero
- HomeStation/Core kann starke Modelle, Agenten, lokale Datenbanken und Blender-Jobs ausfuehren
- Cloud-KI kann ueber Adapter genutzt werden, bleibt aber austauschbar
- Remote Control ueber Android/macOS ist moeglich, aber mit Pairing, VPN/Tailscale/WireGuard und Approval Gates

### Review-first statt Auto-Publish

Wiederkehrendes Prinzip:

- KI darf beobachten, vorschlagen, Pakete vorbereiten und pruefen.
- Publizieren, Uploads, Kosten, externe Kommunikation, Datenbank-Promotion und Git-Push brauchen klare Gates.
- Oeffentliche Inhalte brauchen Quellen-, Rechte- und Qualitaetsstatus.

### Static-Export-Guardrails fuer Architecture Cosmos

Dieses Repo ist oeffentlich/deployment-nah. Deshalb:

- `next.config.js` bleibt `output: 'export'`.
- Keine API Routes, Server Actions, Middleware oder Runtime-Data-Fetching fuer die Public Site.
- `wrangler.jsonc` nicht ohne explizite Absicht aendern.
- Public Frontend liest aktuell `data/mock-entries.json`.
- D1/R2/Backend sind vorbereitet oder geplant, aber nicht ohne Auftrag in die public runtime ziehen.

## 5. Rechtliche und strategische Punkte

Noch kein Rechtsgutachten, aber als Arbeitsgedaechtnis:

- ArchiCAD, Vectorworks, Rhino und andere Programme nicht kopieren, sondern Arbeitsweisen analysieren und eigene UX/Workflows bauen.
- Reverse Engineering nur sehr vorsichtig und rechtlich pruefen; keine proprietaeren Assets, UI-Texte, Icons, Dateiformat-Implementierungen oder geschuetzten Workflows uebernehmen.
- Blender ist GPL; Add-ons/Connectoren und ein kommerzielles Produkt muessen sauber getrennt und lizenziert werden.
- Der Produktwert sollte in Kosmo Core, HomeStation, Datenmodell, Agenten, Training, Support, Templates, Office-Standards und Workflows liegen, nicht in einem geschlossenen Blender-Repackaging.
- ETH-Kontext ist stark fuer Forschung, Pilotpartner, Glaubwuerdigkeit und Foerderung, aber IP-/Uni-Regeln und eventuelle Nutzung von ETH-Ressourcen sollten frueh geklaert werden.

## 6. Naechster Integrationsschritt

Sinnvoller naechster Schritt ist nicht "CAD komplett bauen", sondern ein vertikaler Kosmo-MVP:

1. Input: Text, Handskizze oder einfacher Grundriss.
2. KosmoBrief: Programm, Kontext, offene Fragen, Constraints.
3. KosmoDesign: erzeugt in Blender ein einfaches, editierbares Modell mit Raeumen, Geschossen, Flaechen und Bauteilen.
4. KosmoData: liefert Referenzen, Assets, Material-/Typologiehinweise und Quellen.
5. KosmoPlanwerk: erzeugt erste 2D-Planansichten, Massangaben, Schnitte/Fassaden und Layout-Entwuerfe.
6. KosmoZentrale: koordiniert Agenten, speichert Entscheidungen, zeigt Unsicherheiten, fragt Freigaben ab.

Damit entsteht schnell ein pruefbares Produktversprechen: vom architektonischen Intent zu verifizierbaren Modellen, Plaenen und Entscheidungen.

## 7. Quellindex

### Aktuelles Repo

- `README.md`
- `DEPLOYMENT.md`
- `docs/project-foundation.md`
- `docs/architecture-cosmos-brain.md`
- `docs/cloud-brain-architecture.md`
- `docs/cosmos-tool-suite.md`
- `docs/module-hub-roadmap.md`
- `docs/blender-wettbewerb-integration.md`
- `docs/ai-reference-archive-vision.md`
- `docs/architecture-office-2045-guideline.md`
- `docs/database-architecture.md`
- `docs/media-and-model-policy.md`
- `docs/3d-analysis-automation-pipeline.md`
- `docs/blender-capability-scan-for-kosmo.md`
- `docs/notion-ai-vision-synthesis.md`
- `docs/architektur-kosmos-network-concept.md`
- `docs/kosmo-mvp-0-1-architecture.md`
- `docs/kosmo-design-package-bridge.md`
- `schema/kosmo-project-package.schema.json`
- `examples/kosmo-projects/kosmo-demo-001/kosmo.project.json`

### Private lokale Wissensquellen

- KosmoZentrale / Control-Hub-Dokumentation im privaten lokalen Arbeitsbereich.
- AR-/Blender-/KosmoDesign-Dokumentation und Code im privaten lokalen
  Arbeitsbereich, aktuell insbesondere die KosmoDraw Package Bridge.
- Codex-Session-Kontext bleibt privat und wird hier nicht mit internen IDs
  dokumentiert.
