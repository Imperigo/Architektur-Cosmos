# 3D and Analysis Automation Pipeline

Architecture Cosmos treats each project as two parallel artifacts:

1. a clean analytical reference model for learning, filtering and reuse;
2. an optional reality layer such as a Gaussian splat for atmosphere and spatial memory.

The analytical model is the canonical archive object. The splat is a contextual
visual layer and must not be treated as measured geometry.

## Local-first command

For a complete local run:

```bash
npm run archive:autopilot -- --input archive-inbox/villa-savoye --title "Villa Savoye" --copyright licensed
```

The autopilot runs capture, model planning, asset-manifest dry run when the entry
is already a database pilot, and the procedural massing generator where a
template exists. It writes a local run summary to:

```text
out/archive-automation/{entry-slug}/run-summary.json
out/archive-automation/{entry-slug}/next-actions.md
```

No upload is performed.

For individual pipeline steps:

```bash
npm run archive:model-plan -- --entry villa-savoye
```

The command reads `data/mock-entries.json` and writes local, gitignored planning
files into:

```text
archive-intake/{entry-slug}/models/model-package.manifest.json
archive-intake/{entry-slug}/analysis/analysis-profile.json
archive-intake/{entry-slug}/automation/blender-import-profile.json
archive-intake/{entry-slug}/automation/archicad-exchange-profile.json
archive-intake/{entry-slug}/splats/gaussian-splat-plan.json
archive-intake/{entry-slug}/automation/next-actions.md
```

No Cloudflare upload is performed. No local asset is committed to GitHub.

## First Procedural Massing

```bash
npm run archive:model-generate -- --entry villa-savoye
```

This creates the first local low-poly GLB for the archive pilot:

```text
archive-intake/villa-savoye/models/low.glb
archive-intake/villa-savoye/models/mass.glb
archive-intake/villa-savoye/analysis/generated-geometry-profile.json
```

The model is intentionally diagrammatic. It contains a site plane, lifted villa
volume, pilotis grid, horizontal window bands, ramp/promenade markers, roof slab,
roof garden and a few envelope/trace markers. It is useful as a first
machine-readable reference body for Blender import tests and analysis tooling.
It is not a measured reconstruction.

## Model Layer Contract

Every serious pilot should eventually separate:

- `site_model`: terrain, plot, access, context and landscape frame;
- `mass_model`: simplified building volume;
- `low_poly_model`: lightweight atlas/browser model;
- `structure_model`: load-bearing structure and structural grid;
- `tectonic_model`: envelope, joints, material assemblies and construction logic;
- `full_model`: reviewed complete reference model.

Suggested object storage keys:

```text
entries/{slug}/models/mass.glb
entries/{slug}/models/low.glb
entries/{slug}/models/full.glb
entries/{slug}/models/structure.glb
entries/{slug}/models/tectonic.glb
entries/{slug}/models/site.glb
```

## Analysis Contract

Analysis files should be machine-readable first and visually rendered later.
Typical layers:

- `materials.json`
- `tectonics.json`
- `structure.json`
- `circulation.json`
- `spatial_order.json`
- `filter_classification.json`
- `vector-plan-graph.json`

These files become the bridge between the website, D1 filters, Blender queries
and later ArchiCAD/IFC exchange.

## Blender and ArchiCAD Goal

The Blender profile defines expected collections, units, layer naming and future
chat queries. The ArchiCAD profile defines coarse exchange classes and preferred
formats. This keeps the current local MVP compatible with the larger vision:

> Ask Claude in Blender for Swiss 18th-century timber buildings with pitched
> roofs, retrieve them from the archive, and insert the relevant reference
> models into the current design context.

## Gaussian Splat Policy

Gaussian splats are promising for Architecture Cosmos because they can preserve
spatial atmosphere from video or photo capture. They are especially useful for:

- immersive project preview;
- material and light memory;
- real-site context;
- comparison between analytical model and observed reality.

They are not good enough as the only archive geometry. Use them beside clean
GLB/IFC layers, not instead of them.

Minimum input for a useful splat:

- own or licensed video/stills;
- slow exterior orbit or interior walkthrough;
- 80-250 sharp frames after extraction;
- rights review before any upload;
- explicit upload command before R2 usage.
