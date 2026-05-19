# AI Reference Archive Vision

Architecture Cosmos is intended to become more than a public architecture atlas.
It is the reference archive foundation for a larger design pipeline connecting
the website, Cloudflare archive storage, Blender, ArchiCAD and AI-assisted
analysis.

## Long-Term Goal

The atlas should let the host/admin drop source material such as PDFs, books,
plans, image references and model files into a database intake area. The
system then prepares a structured object for the wormhole atlas and for later
design-tool workflows.

A mature archive object should contain:

- verified metadata, dates, authors, location and source references
- exterior, interior, section and plan media slots
- downloadable 3D model layers for web, Blender and ArchiCAD workflows
- structure, material, tectonic, typology and spatial analysis layers
- filter tags such as material, roof form, region, period and construction system
- relations to other objects in the Architecture Cosmos knowledge graph

## Blender / ArchiCAD Direction

The design-tool handbook describes a Blender Cycles, ComfyUI/SDXL and future
ArchiCAD export pipeline. Architecture Cosmos should become the curated
reference archive behind that tool.

Future example:

```text
In Blender, ask Claude:
"Hole Schweizer Holzbau-Referenzen aus dem 18. Jahrhundert mit Satteldach aus
der Architecture Cosmos Datenbank und füge die wichtigsten 3D-Modelle als
Referenzen in mein Projekt ein."
```

For that to work, every object needs consistent tags, rights status, model
package metadata and analysis layers.

## V1 Principle

The first implementation stays local and cheap:

- no browser upload to the public website
- no authentication or CMS yet
- no automatic R2 upload
- no automatic public use of unclear copyrighted images
- local storage budget: 10 GB for `archive-inbox/` and `archive-intake/`

The local capture workflow creates drafts, manifests and analysis placeholders
without touching Cloudflare. D1/R2 remain prepared archive layers for later.

The next public-product expansion is a signed-in private library for each user:
private upload, private object generation, review submission and moderated public
publishing. This is documented separately in
[`docs/private-user-archive-security-plan.md`](./private-user-archive-security-plan.md)
because it changes the security model from static archive to authenticated
backend system.

## Rights And Public Display

Public display is allowed only when the asset status is one of:

- `own_work`
- `licensed`
- `public_domain`
- `private_research` for local-only private analysis/model generation

Everything else remains a source candidate, external link, placeholder or
private review item until cleared by the host/admin.

## Model Package Standard

Each mature object should be able to grow toward:

```text
entries/{slug}/models/low.glb
entries/{slug}/models/full.glb
entries/{slug}/models/structure.glb
entries/{slug}/models/tectonic.glb
entries/{slug}/models/site.glb
entries/{slug}/analysis/materials.json
entries/{slug}/analysis/tectonics.json
entries/{slug}/analysis/filter-classification.json
```

Automatic 3D generation is a later phase. The current priority is a stable
schema and local intake workflow.

## Capture Pipeline

```bash
npm run archive:capture -- --input archive-inbox/villa-savoye --title "Villa Savoye"
```

This creates a local capture package in `out/archive-captures/{slug}/` with:

- `entry-draft.json`
- `source-candidates.json`
- `asset-candidates.json`
- `asset-manifest.json`
- `capture-manifest.json`

These files are generated output and are not committed. Reviewed entries can
later be promoted manually into `data/mock-entries.json` and D1 preview.
