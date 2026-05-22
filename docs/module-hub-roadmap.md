# Module Hub Roadmap

Stand: 2026-05-22

## Ziel

Architecture Cosmos wird vom reinen Atlas zu einem modularen Architektur-Betriebssystem. Nach dem Startbild erscheint eine Projektzentrale mit vier Orbit-Stationen. Nur `KosmoData` ist aktuell aktiv; die weiteren Module bleiben sichtbar vorbereitet, bis ihre Logik sicher spezifiziert ist.

## Orbit-Stationen

### KosmoData

Status: aktiv

Aufgabe: Architektur-Datenbank, Wurmloch-Atlas, Quellen, Medien, Analysefelder, 3D-Modellpakete, öffentliche und private Datenlogik.

Nächste Schritte:

- Hero-/Planetbild-Coverage von 77/112 auf 90+/112 erhöhen.
- Database-Popup und Archive-Seite weiter vereinheitlichen.
- Detailseiten mit stärkerer Projektindividualität und besserem 3D-/Analyse-Reiter ausbauen.
- Öffentliche Daten strikt public-safe halten; private/dev Daten bleiben getrennt.

### KosmoBrief

Status: geplant

Aufgabe: Entwurfs- und Wettbewerbsphase. Das Modul soll Wettbewerbsprogramme, Orte, Referenzen, Aufgabenstellungen und Strategien in ein strukturiertes Projektbriefing übersetzen.

Mögliche Werkzeuge:

- Aufgabenanalyse
- Kontext- und Standortanalyse
- Referenzpfade aus KosmoData
- Konzeptvarianten
- Jury-/Abgabe-Risikoanalyse
- Wochenplan und Aufgabenpakete

### KosmoForm

Status: geplant

Aufgabe: 3D-Modellierung, Visualisierung und Analyse. Das Modul verbindet KosmoData mit Blender, ArchiCAD und KI-basierten Modell-/Bildvarianten.

Mögliche Werkzeuge:

- 3D-Modellgenerator
- Material- und Tragwerkslayer
- Tektonik- und Fassadenanalyse
- Blender-Importprofile
- ArchiCAD-Austauschprofile
- Gaussian-Splat- oder Photogrammetrie-Pipeline für eigene Quellen

### KosmoPlanwerk

Status: geplant

Aufgabe: 2D-Planexport, Layout und Wettbewerbsabgabe. Das Modul erzeugt saubere Vektorpläne, Schnitte, Diagramme und Layouts aus Projekt- oder Referenzdaten.

Mögliche Werkzeuge:

- 2D Vector Plan Generator
- Schnitt-/Grundriss-/Analyseplan-Layer
- DXF/SVG/PDF-Export
- Layoutsystem für Wettbewerbsabgaben
- Plangrafik-Regeln im Cosmos-Stil
- Legenden, Massstäbe und Quellenblöcke

## Lokale Zentrale und Online-Klon

Langfristig bleibt der Home-PC die private Hardware-Zentrale. Dort liegen grosse Medien, private Quellen, urheberrechtlich unklare Materialien, Blender/ArchiCAD-Pipelines und rechenintensive Jobs. Die Website ist die öffentliche, kontrollierte Online-Schicht und darf nur public-safe Daten zeigen.

Grundprinzip:

- Public Website: Präsentation, Navigation, public-safe Daten, Review-Status.
- Private Local Core: grosse Medien, private Daten, Dev-Recherche, lokale KI-Workflows.
- Cloud Brain: Monitoring, Vorschläge, Review Packs, keine grossen Änderungen ohne Freigabe.
- Sync Bridge: später signierte, begrenzte Transfers statt offener Uploads.

## Sicherheitsregel

Kein Modul darf automatisch veröffentlichen, was aus privaten, urheberrechtlich unklaren oder dev-only Quellen stammt. Jede automatische Erweiterung muss zuerst als Review Pack entstehen und durch Rights Gate, Security Gate und manuelle Freigabe laufen.

