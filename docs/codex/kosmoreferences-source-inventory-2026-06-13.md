# KosmoReferences Source Inventory

Stand: 2026-06-13

Diese Inventur ist der lokale Quellenbefund fuer die ersten
KosmoReferences/KosmoAsset-Piloten. Sie trennt bewusst zwischen:

- lokal belegten Referenzen;
- fachlich guten Kandidaten;
- Quellen, die noch nicht im aktuellen Dateisystem sichtbar sind.

## Gepruefte Speicherorte

| Pfad | Befund |
|---|---|
| `/mnt/data/ArchitekturKosmos/Code/ArchitectureCosmos` | Hauptrepo mit Atlas-, Medien-, Modell-, Source-Registry- und Book-Ingestion-Daten |
| `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09` | OneDrive-Spiegel mit Projekt-/Workflow-Dokumenten, aber ohne grosse Buch-/Vorlesungsbibliothek |
| `/home/andrin-baumann/ArchitekturKosmos Onedrive/11 AI Workflow` | lokale OneDrive-Struktur, ca. 515 MB, keine grosse ETH/HSLU/Buecher-Library im aktuellen Scan |
| `/mnt/data/Zum_Archivieren` | Archivordner vorhanden, noch kein konkretes Quellenpaket selektiert |

## Pilotbefund

### Villa Savoye

Status: **stark lokal belegt**.

Vorhanden sind Goldstandard-Dokumentation, Medien, SVG-Plan/Schnitt,
Low-GLB-Modell sowie Book-Ingestion-Smoke-Material:

- `docs/pilot-entry-standard.md`
- `archive-inbox/books/smoke-villa-savoye/*`
- `archive-inbox/books/test-villa-savoye/*`
- `public/archive-media/villa-savoye/*`
- `public/archive-models/villa-savoye/low.glb`

Villa Savoye bleibt der erste saubere KosmoReferences-Goldstandard und liefert
die ersten KosmoAsset-Derivate fuer 2D, 3D und Plan-/Schnitt-Review.

### Alterszentrum Kloster Ingenbohl

Status: **lokaler Draft vorhanden, rechtlich vorsichtig behandeln**.

Vorhanden sind Draft, Analyse-/Preview-Daten, Source-Hinweise und Low-GLB:

- `data/drafts/alterszentrum-kloster-ingenbohl.json`
- `data/database-analysis-preview.json`
- `data/public-model-previews.json`
- `archive-inbox/alterszentrum-kloster-ingenbohl/sources.md`
- `public/archive-models/alterszentrum-kloster-ingenbohl/low.glb`

Ingenbohl ist der zeitgenoessische Schweizer Pilot fuer Transformation,
Materialsystem, mineralische Oberflaechen, Holzfassade und Tectonic-Review.
Medien, Plaene und Office-Bilder bleiben blockiert, bis Rechte und
Quellenstatus geklaert sind.

### Schweizer Holzbau

Status: **Kandidat noch offen**.

Lokale Hinweise:

- `docs/ai-reference-archive-vision.md` nennt die Vision:
  Schweizer Holzbauten des 18. Jahrhunderts mit Satteldach.
- `docs/blender-wettbewerb-schema-erweiterung.md` nennt
  Schulhaus Paspels und Kapelle Sogn Benedetg.
- `data/research-source-registry.json` fuehrt Lignumdata und Material-Archiv
  als konservative Holz-/Materialquellen.

Kandidaten:

| Kandidat | Rolle | Quellenlage |
|---|---|---|
| Kapelle Sogn Benedetg / Peter Zumthor | sehr guter Schweizer Holz-/Schindelbau | bisher nur lokaler Doc-Hinweis |
| Schulhaus Paspels / Gion A. Caminada | Schweizer Schul-/Dorf-Referenz | bisher nur lokaler Doc-Hinweis; Holzrolle pruefen |
| Kloster St. Gallen | vorhandener historischer Schweizer Eintrag mit Timber-Tags | repo-intern belegt, aber kein dedizierter Holzbau-Pilot |

Ich wuerde den Schweizer-Holzbau-Slot erst promoten, wenn ein echtes lokales
Buch-/ETH-/HSLU-Quellenpaket sichtbar ist. Bis dahin ist St. Gallen nur ein
interner Zwischenanker, nicht der finale Holzbau-Pilot.

## Kritischer Befund

Die vom Owner erwartete grosse digitale Buecher-/ETH-/HSLU-Library ist in den
aktuell gemounteten OneDrive-Pfaden nicht als grosser Bestand sichtbar. Das ist
kein Stopp, aber ein wichtiges Routing-Problem fuer Claude/KosmoOverseer:

```text
KosmoReferences kann lokal sauber starten,
aber die grosse Library muss noch als realer Pfad gefunden oder synchronisiert werden.
```

## Naechste Schritte

1. Villa Savoye und Ingenbohl weiter als lokale Pilotdaten nutzen.
2. Schweizer Holzbau erst nach konkretem Quellenpaket festlegen.
3. Claude/KosmoOverseer bitten, den echten Library-Pfad zu bestaetigen.
4. Fuer alle Buch-/Vorlesungsquellen striktes Private/Public-Splitting
   beibehalten: Scans und OCR privat, oeffentlich nur Metadaten, Zitate,
   Links und selbst formulierte Analyse.

## Lokale Research-Gates

Ausgefuehrt am 2026-06-13:

```bash
npm run database:source-audit
npm run database:research -- --agent historical --topic "Villa Savoye"
npm run database:analyze -- --agent current --topic "Kloster Ingenbohl"
npm run database:research -- --agent all --topic "Swiss timber housing"
```

Befund:

- Source Registry: 30 Quellen, 17 automation-ready, 21 primary/high-reliability,
  0 Warnungen.
- Villa Savoye: Research-Pack erstellt, keine Datenbankzeile geschrieben.
- Ingenbohl: Analysis-Pack erstellt, Readiness `strong_pilot` mit Score 0.94,
  Public Policy `metadata_and_links_only`.
- Swiss timber housing: Research-Pack erstellt, aber noch kein lokaler
  Projektkandidat mit echtem Quellenpaket.

Die `out/`-Pakete sind lokale Review-Artefakte und werden nicht als
kanonische Inhalte promotet.
