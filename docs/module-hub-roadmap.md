# Module Hub Roadmap

Stand: 2026-05-22

## Ziel

Architecture Cosmos wird vom reinen Atlas zu einem modularen Architektur-Betriebssystem. Nach dem Startbild erscheint eine Projektzentrale mit vier Orbit-Stationen. Nur `KosmoData` ist aktuell aktiv; die weiteren Module bleiben sichtbar vorbereitet, bis ihre Logik sicher spezifiziert ist.

## Orbit-Stationen

Aktuelle sichtbare Hauptmodule:

- `KosmoData`
- `KosmoAsset`
- `KosmoDesign`
- `KosmoShop`

### KosmoData

Status: aktiv

Aufgabe: Architektur-Datenbank, Wurmloch-Atlas, Quellen, Medien, Analysefelder, 3D-Modellpakete, öffentliche und private Datenlogik.

Produktentscheidung 2026-05-25: `KosmoAsset` ist wieder eine eigene
Orbit-Station. KosmoData bleibt die Referenzbibliothek mit Wurmloch-Atlas;
KosmoAsset wird die eigenständige Bibliothek fuer wiederverwendbare 2D-/3D-,
Textur-, Material- und Bauteilressourcen.

KosmoData-Modi:

- `Referenzbibliothek`: Architekturgeschichte, Projekte, Texte, Plaene,
  Landschaft, Stadt, Quellen und Netzwerke. Diese Ansicht nutzt das Wurmloch,
  weil Zeit, Geschichte, Stilsektoren und Relationen hier die zentrale
  Navigation bilden.
- `Projektbibliothek`: Architekturgeschichte, Projekte, Texte, Plaene,
  Landschaft, Stadt, Quellen und Netzwerke. Diese Ansicht nutzt das Wurmloch,
  weil Zeit, Geschichte, Stilsektoren und Relationen hier die zentrale
  Navigation bilden.

Nächste Schritte:

- Hero-/Planetbild-Coverage von 77/112 auf 90+/112 erhöhen.
- Database-Popup und Archive-Seite weiter vereinheitlichen.
- Detailseiten mit stärkerer Projektindividualität und besserem 3D-/Analyse-Reiter ausbauen.
- Öffentliche Daten strikt public-safe halten; private/dev Daten bleiben getrennt.
- KosmoData klar als Projekt-/Referenzbibliothek halten, damit KosmoAsset
  spaeter eine eigene katalog- und exportorientierte UI erhalten kann.

### KosmoAsset

Status: geplant

Aufgabe: 2D-/3D-/Textur- und Bauteilbibliothek. Das Modul sammelt
wiederverwendbare Ressourcen, Materialsysteme, Details, Fassadenmodule,
Treppen, Stuetzen, Dachformen, Landschaftselemente, Blender Collections und
ArchiCAD-Layer.

Mögliche Werkzeuge:

- 2D-/3D-Asset-Katalog
- Material- und Texturverwaltung
- Blender-/ArchiCAD-Exportprofile
- Rechte- und Lizenzstatus pro Asset
- Varianten- und Bauteilfamilien

Erster technischer Baustein:

- `schema/kosmo-asset-library.schema.json`
- `examples/kosmo-assets/kosmo-asset-demo/library.json`
- `npm run kosmo:asset-library-check`

Diese V1 prueft nur lokale Review-Metadaten, Rechte und Exportziele. Sie
publiziert nichts und laedt keine Assets hoch.

### KosmoDesign

Status: geplant

Aufgabe: Gebündelte Entwurfsmaschine. KosmoDesign fasst KosmoPrepare,
KosmoDraw, KosmoVis und KosmoPublish zusammen: Vorbereitung, Kontext,
Plan-/Modellgenerierung, Visualisierung und Abgabe.

Mögliche Werkzeuge:

- Aufgabenanalyse und Projektbriefing
- Kontext- und Standortanalyse
- Referenzpfade aus KosmoData
- 3D-Modellgenerator
- Material- und Tragwerkslayer
- 2D Vector Plan Generator
- Render-/Bildvarianten
- Abgabe- und Layoutsystem
- Blender-Importprofile
- ArchiCAD-Austauschprofile
- Gaussian-Splat- oder Photogrammetrie-Pipeline für eigene Quellen

### KosmoShop

Status: geplant

Aufgabe: Späterer Produkt- und Toolzugang. KosmoShop ist fuer freigegebene
Pakete, Käufe, Abos, Erweiterungen und professionelle Projektmodule gedacht.

Mögliche Werkzeuge:

- freigegebene Asset- und Toolpakete
- Lizenz- und Produktzugänge
- Projektmodule fuer Wettbewerbe und Buero-Workflows
- klare Trennung von Shop, Dev-Zugang und privaten Daten

## Lokale Zentrale und Online-Klon

Langfristig bleibt der Home-PC die private Hardware-Zentrale. Dort liegen grosse Medien, private Quellen, urheberrechtlich unklare Materialien, Blender/ArchiCAD-Pipelines und rechenintensive Jobs. Die Website ist die öffentliche, kontrollierte Online-Schicht und darf nur public-safe Daten zeigen.

Grundprinzip:

- Public Website: Präsentation, Navigation, public-safe Daten, Review-Status.
- Private Local Core: grosse Medien, private Daten, Dev-Recherche, lokale KI-Workflows.
- Cloud Brain: Monitoring, Vorschläge, Review Packs, keine grossen Änderungen ohne Freigabe.
- Sync Bridge: später signierte, begrenzte Transfers statt offener Uploads.

## Sicherheitsregel

Kein Modul darf automatisch veröffentlichen, was aus privaten, urheberrechtlich unklaren oder dev-only Quellen stammt. Jede automatische Erweiterung muss zuerst als Review Pack entstehen und durch Rights Gate, Security Gate und manuelle Freigabe laufen.
