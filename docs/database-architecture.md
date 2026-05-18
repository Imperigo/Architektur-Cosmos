# Architecture Cosmos Database Architecture

This document defines the planned low-cost database foundation for Architecture Cosmos.
It is a design contract only: the current website still ships as a static export with local JSON.

## Recommended Stack

Use Cloudflare-native storage first:

- **Cloudflare D1** for structured data: entries, sources, tags, relations, analyses, and model metadata.
- **Cloudflare R2** for large assets: photos, drawings, PDFs, textures, GLB/USDZ models, analysis JSON, and source scans.
- **Cloudflare Workers / Pages** for the frontend and later lightweight API endpoints.

This avoids a dedicated server while staying close to the current deployment platform.

## Cost Logic

The first production database can likely start inside free or very low-cost tiers:

- D1 stores metadata and analysis records, which are small.
- R2 stores large files and scales by object storage usage.
- 3D models, source PDFs, plan tiles, and textures must never be stored inside D1.

If Architecture Cosmos later needs collaborative editing, permissions, and a rich admin UI, Supabase can still be introduced. For now, D1 + R2 is the simplest fit because the site is already on Cloudflare.

## Data Ownership Split

| Layer | Stored In | Examples |
|---|---|---|
| Structured knowledge | D1 | entries, dates, categories, relations, source records |
| Flexible analysis payloads | D1 JSON text or R2 JSON files | tectonics, filter classification, annotation graphs |
| Heavy media | R2 | images, plans, sections, PDFs, 3D models, textures |
| Frontend rendering | Static export now, Worker later | atlas, filters, dossier UI |

## Core Tables

### `entries`

Main knowledge unit. One row can represent a building, urban plan, landscape project, text, theory, map, infrastructure, object, or event.

Important fields:

- `id`: stable machine id.
- `slug`: route-safe id.
- `entry_type`: one of the existing atlas entry types.
- `year_start`, `year_end`: atlas time placement.
- `style_sector`: one of the six current radial style sectors.
- `short_description`, `one_sentence`, `full_description`: textual dossier layers.
- `location_*`: optional spatial metadata.

### `entry_media`

Media metadata for images and drawings. The file itself lives in R2.

MVP media types:

- `exterior`
- `interior`
- `section`
- `plan`

Extended media types:

- `diagram`
- `map`
- `archive_photo`
- `source_scan`
- `detail`
- `material_sample`

### `entry_models`

3D model metadata. The model file lives in R2.

Model types:

- `full_model`
- `low_poly_model`
- `structure_model`
- `tectonic_model`
- `site_model`
- `mass_model`

Recommended per-entry R2 layout:

```text
entries/{entry_slug}/media/exterior-01.jpg
entries/{entry_slug}/media/plan-01.jpg
entries/{entry_slug}/models/full.glb
entries/{entry_slug}/models/low.glb
entries/{entry_slug}/models/structure.glb
entries/{entry_slug}/models/tectonic.glb
entries/{entry_slug}/analysis/tectonics.json
entries/{entry_slug}/analysis/annotations.json
entries/{entry_slug}/sources/source-notes.json
```

### `entry_analysis`

Stores structured analytical layers. Small payloads can sit in `data_json`; larger generated analysis files should use `r2_key`.

Analysis types:

- `structure`
- `tectonics`
- `spatial_order`
- `material_system`
- `circulation`
- `typology`
- `urban_context`
- `landscape_system`
- `filter_classification`
- `source_reconstruction`

### `tags` and `entry_tags`

Flexible filter system. Tags are grouped so the UI can distinguish typology, style, period, material, source, course, and structural logic.

Tag groups:

- `style`
- `typology`
- `theme`
- `course`
- `source`
- `structure`
- `material`
- `period`
- `region`
- `analysis`

### `entry_relations`

Knowledge graph between entries.

Relation types:

- `influences`
- `responds_to`
- `same_author`
- `same_place`
- `shares_theme`
- `typological_reference`
- `structural_reference`
- `material_reference`
- `source_connection`
- `context`

## 3D Model Policy

Every mature object should eventually support multiple model layers:

- `full_model`: best available complete model.
- `low_poly_model`: web/mobile preview.
- `structure_model`: load-bearing logic.
- `tectonic_model`: assembly, joints, layers, and construction logic.
- `site_model`: terrain/context when relevant.
- `mass_model`: simplified volume for global atlas use.

Each generated model should have:

- `source_basis`: what source material was used.
- `generation_method`: manual, photogrammetry, AI-assisted, procedural, survey-derived.
- `review_status`: draft, reviewed, verified, needs_source.
- `confidence_score`: optional 0-1 estimate.

## Integration Path

1. Keep the static site on local JSON while the schema stabilizes.
2. Create a D1 database in Cloudflare when ready.
3. Create an R2 bucket for media/model assets.
4. Import current `data/mock-entries.json` into D1 using a migration script.
5. Add read-only Worker API endpoints or migrate to OpenNext only when dynamic reads are required.
6. Add admin/write flows later; do not start with editing UI before the schema is proven.

## Current Static Pilot

The current repository includes `data/archive-preview.json` as a static normalized preview of the future D1/R2 archive. It uses Flower House as the pilot object and mirrors the planned tables for entries, sources, media, 3D models, analysis layers, tags, and asset manifests.

The atlas database panel reads this preview directly. It is intentionally not a backend and does not write anything from the browser.

## Current Constraint

Do not add live database bindings, API routes, authentication, CMS logic, or backend infrastructure until explicitly requested. This schema is the preparation layer.
