# KosmoReferences + KosmoAsset Pilotplan

Stand: 2026-06-13

## Owner-Entscheid

Codex uebernimmt die Data-Lane als zwei Unterprojekte:

- **KosmoReferences**: Architekturprojekte, Referenzen, Quellen, Plaene,
  Bilder, Materialisierung, Tragstruktur, Analyse und 3D-Referenzmodelle.
- **KosmoAsset**: wiederverwendbare 2D-/3D-Assets, Texturen, Materialien,
  Bauteile, Details und Exportprofile.

Erste Referenzpiloten:

1. `villa-savoye`
2. `alterszentrum-kloster-ingenbohl`
3. `swiss-timber-reference-slot` als Platzhalter fuer den ersten konkreten
   Schweizer-Holzbau aus Andrins lokaler/OneDrive-Library.

## Lokaler Befund 2026-06-13

### Villa Savoye

Status: staerkster vorhandener Pilot.

Bereits lokal vorhanden:

- `data/archive-preview.json` mit Quellen, Medien, Modellen und Analyse-Layern.
- `docs/pilot-entry-standard.md` definiert Villa Savoye als Goldstandard.
- Medien:
  - `public/archive-media/villa-savoye/exterior/savoye-3-exterior-cc0.jpg`
  - `public/archive-media/villa-savoye/exterior/villa-savoye-loc-exterior.jpg`
  - `public/archive-media/villa-savoye/interior/villa-savoye-chaise-longue-interior-cc-by-sa-2.jpg`
  - `public/archive-media/villa-savoye/plan/villa-savoye-ground-floor-diagram.svg`
  - `public/archive-media/villa-savoye/section/villa-savoye-long-section-diagram.svg`
- Modell:
  - `public/archive-models/villa-savoye/low.glb`

Naechster Schritt:

- als KosmoReferences-Goldstandard weiter nutzen;
- Plan/Schnitt als erstes KosmoAsset-2D-Pilotpaar spiegeln;
- low GLB als 3D-Asset-Pilot referenzieren;
- Rechte-/Quellenstatus nicht automatisch auf public setzen.

### Alterszentrum Kloster Ingenbohl / Roger Boltshauser

Status: vorhandener Draft + lokales Modell, aber Medien/Planrechte noch offen.

Bereits lokal vorhanden:

- `data/drafts/alterszentrum-kloster-ingenbohl.json`
- `data/database-analysis-preview.json` mit Analyse-Preview
- `public/archive-models/alterszentrum-kloster-ingenbohl/low.glb`

Naechster Schritt:

- als zeitgenoessischen Schweizer Transformation-/Material-/Holzfassaden-Pilot
  ausbauen;
- Quellen-/Rechte-Gate fuer Office-/Artikelbilder und Plaene hart lassen;
- Material-/Fassaden-Asset nur als `private_research` oder `generated_needs_review`
  aufnehmen, bis Rechte geklaert sind.

### Schweizer Holzbau

Status: konzeptionell wichtig, aber noch kein konkret lokal belegter Kandidat.

Vorhandene Hinweise:

- `docs/ai-reference-archive-vision.md` nennt die Zielabfrage:
  Schweizer Holzbauten des 18. Jahrhunderts mit Satteldach.
- `docs/blender-wettbewerb-schema-erweiterung.md` nennt Schweizer Anker wie
  Schulhaus Paspels und Kapelle Sogn Benedetg.
- `data/research-source-registry.json` enthaelt Quellen fuer Schweizer
  Architektur und Holzbau.

Naechster Schritt:

- lokale/OneDrive-Library, digitale Buecher, ETH-/HSLU-Vorlesungen nach einem
  ersten belegten Holzbau durchsuchen;
- Kandidat erst dann promoten, wenn mindestens Quelle, Projektdaten und ein
  nutzbarer Analysepfad vorliegen.

## KosmoAsset Pilotumfang

Von jedem Bereich wird ein erstes Asset angelegt:

| Bereich | Pilot | Quelle |
|---|---|---|
| 2D | Villa Savoye Plan/Schnitt SVG | lokale public archive media |
| 3D | Villa Savoye low GLB oder Ingenbohl low GLB | lokale public archive models |
| Material/Textur | Ingenbohl mineral/timber facade material profile | Draft/Analyse, review-only |
| Bauteil/Detail | Villa Savoye pilotis / Ingenbohl facade layer detail | generated/review-only |
| Exportprofil | ArchiCAD/Blender layer mapping fuer References/Assets | generated/review-only |

## Arbeitsregel

Jeder Eintrag bleibt review-only, bis diese Kette belegbar ist:

```text
Quelle -> Rechte -> Analyse -> Medien/Plan/Modell/Asset -> Review -> Nutzung
```

Die bestehende `ArchitectureCosmos`-Codebasis wird vorerst nicht umbenannt.
Neue Nomenklatur wird additiv eingefuehrt, um Website, Scripts und bestehende
Pilotdaten nicht zu brechen.
