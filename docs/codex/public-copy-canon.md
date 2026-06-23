# ArchitekturKosmos Public Copy Canon

Status: active
Updated: 2026-06-23

This document governs visible copy on the public ArchitectureCosmos website. Internal worker contracts, repository fields and machine-readable values may remain English, but the public interface must translate them into architecture-facing German.

## Titles

- Use a literal subject or task, not a generic product claim.
- A page H1 names the public offer or collection.
- A section H2 explains what the user can inspect or what the section contains.
- A project title remains the verified project name.
- Avoid slogans and broad claims such as smarter, revolutionary, next level, future, platform or intelligent.

Current page titles:

- `Referenzatlas für Architekturprojekte`
- `Assetbibliothek für Planung und Analyse`

Useful section patterns:

- `Vom Quellenfund zum geprüften Modell`
- `Bauteile, Materialien und Modellstruktur`
- `{Projekt}: Bauteile untersuchen`
- `Planregister und Freigabestatus`

## Public Vocabulary

| Internal value | Public label |
| --- | --- |
| public gate | Freigabeprüfung |
| public-ready | öffentlich bereit / öffentlich freigegeben |
| review-only | intern / in Prüfung |
| intake | Übernahme |
| bundle | Projektpaket |
| preflight | Vorprüfung / Mengenprüfung |
| unsafe public flag | unsichere Freigabe |
| preview | Vorschau |
| model layer | Modellgruppe / Bauteilgruppe |
| analysis layer | Analyseebene |
| metadata only | nur Metadaten |
| draft | Entwurf |
| blocked | gesperrt |
| review ready | prüfbereit |

## Architecture Terms

Use the established German architecture term where one exists:

- structure → Tragwerk
- envelope / facade → Fassade
- circulation → Erschliessung
- spatial order → Raumordnung
- material system → Materialsystem
- source reconstruction → Quellenrekonstruktion
- typology → Typologie
- tectonics → Tektonik
- site / terrain → Terrain
- landscape → Freiraum
- services / MEP / HLKSE → Gebäudetechnik

Product names such as KosmoReferences, KosmoAsset, KosmoDraw, KosmoPublish and KosmoOrbit remain unchanged.

## Status Copy

Status labels must tell the user what is true now:

- `freigegeben`
- `geprüft`
- `öffentlich`
- `ausstehend`
- `gesperrt`
- `Prüfung erforderlich`

Do not expose raw enum values, file paths, repository terms or worker instructions in visible website copy.

## Verification

Changes to public copy should pass:

- `npm run lint`
- `npm run build`
- `npm run ui:audit`
- `npm run public:gate-check`
- `npm run public:route-content-smoke -- --base-url http://127.0.0.1:3000`

The route smoke must assert important public labels so internal jargon cannot silently return.
