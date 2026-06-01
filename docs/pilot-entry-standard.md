# Pilot Entry Standard

Villa Savoye is the current goldstandard pilot. It defines the target standard
for turning a project from an atlas point into a full Architecture Cosmos archive
object with source-backed prose, 2D plan artifacts, 3D layer contracts and a
viewer-ready analysis profile.

## Pilot Object

- Entry: `villa-savoye`
- Title: Villa Savoye
- Authors: Le Corbusier, Pierre Jeanneret
- Year: 1931
- Source basis: ETH/lecture notes, Fondation Le Corbusier, Centre des monuments
  nationaux, UNESCO context and Architecture Cosmos diagrammatic plans
- Database status: reviewed
- R2 prefix: `entries/villa-savoye`

## Required Archive Layers

| Layer | Villa Savoye status | Meaning |
|---|---:|---|
| Entry metadata | ready | title, slug, year, location, authors, type, style sector |
| Text layers | ready | one-sentence, full description and 9-part text review |
| Sources | ready for preview | ETH/lecture, official, heritage and public-safe source trail |
| Media slots | ready as metadata | exterior, interior, section, plan |
| 2D plan artifacts | local review | SVG plan, SVG section, SVG analysis, DXF and plan graph |
| Tags | ready | source, typology, structure, material, landscape, analysis |
| Relations | ready | explicit atlas edges plus text-review network basis |
| 3D model rows | local review | mass, low, full, site, structure, tectonic, facade/material |
| Analysis layers | reviewed/draft mix | structure, tectonics, spatial order, materials and filter layers |

## Review Status Rules

- `draft`: useful but not yet checked.
- `reviewed`: checked enough for public archive preview.
- `verified`: confirmed against reliable primary/source material.
- `needs_source`: concept is plausible but needs stronger evidence.

Villa Savoye deliberately separates reviewed public metadata from local/private
model and plan review. That is good: the archive can show what is known, what is
planned and what still needs source or rights review before public release.

## Minimum For A New Mature Entry

A new object is “archive-ready” when it has:

1. stable `id` and `slug`
2. complete entry metadata
3. all four MVP media slots
4. at least one source row
5. at least five useful tags
6. one one-sentence description
7. one full description
8. source quality status
9. planned R2 prefix
10. review status

It is “model-ready” only when it additionally has:

1. source plan/section or reliable dimensional basis
2. `mass_model`
3. `low_poly_model`
4. at least one analysis layer
5. clear confidence score and source basis

It is “goldstandard-ready” only when it additionally has:

1. a text review pack answering These, Netzwerk/DNA, Topos, Typos, Tektonik,
   Konflikt/Kritik, KosmoData-Layer and Entwurfsintelligenz
2. a network basis from explicit relations or close comparison candidates
3. 2D plan-pipeline artifacts: plan SVG, section SVG, analysis SVG, DXF and
   vector graph
4. Blender/ArchiCAD layer contract: site, mass/full, structure, tectonic,
   material/facade
5. viewer/filter requirements for materials, structure, spatial order and model
   layers
6. a rights note that distinguishes public metadata from private/local geometry
   or plan evidence

## Next Pilot Improvements

- Use `database:pilot-quality` as the repeatable gate for the first five
  pilots.
- Add missing explicit network relations for Ingenbohl, MFO Park and Goebekli
  Tepe.
- Keep local plan/model artifacts out of Git and public R2 until reviewed.
- Promote analysis layers from `draft` to `reviewed` only after source
  verification.

## Current Pilot Queue

1. `villa-savoye`: 3D/analysis reference pilot with local GLB generation.
2. `alterszentrum-kloster-ingenbohl`: contemporary Swiss transformation pilot;
   currently a source-only/private-research automation pilot. It can pass
   capture, model planning, rights-gate and asset manifest generation, but model
   generation stays blocked until rights-reviewed plan/section assets or a
   project-specific procedural template exist.
3. `afasia-no-architecture-flower-house`: source-rights and Afasia policy pilot.
4. Glass House and Farnsworth House: comparison and typology targets.
5. Unité d’Habitation, Salk Institute, Centre Pompidou, Parc de la Villette and
   Bruder Klaus Field Chapel: next study-path and analysis candidates.
