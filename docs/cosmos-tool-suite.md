# Architecture Cosmos Tool Suite

The Cosmos tool suite is the local, review-first bridge between archive data,
Brain planning, 2D vector drawings, 3D model packages and architectural prose.
It does not publish, upload or write to D1/R2.

## Commands

```bash
npm run cosmos:plan-generate -- --entry villa-savoye
npm run cosmos:model-generate -- --entry villa-savoye
npm run cosmos:text-generate -- --entry villa-savoye
npm run cosmos:entry-build -- --entry villa-savoye --mode review
```

## 2D Vector Plan Generator

`cosmos:plan-generate` writes a draft plan, section, analysis drawing, vector
graph and ArchiCAD 2D exchange profile to `archive-intake/{slug}/`.

Outputs:

- `plans/{slug}-cosmos-plan.svg`
- `plans/{slug}-cosmos-section.svg`
- `plans/{slug}-cosmos-analysis.svg`
- `plans/{slug}-cosmos-plan.dxf`
- `analysis/vector-plan-graph.json`
- `automation/archicad-2d-exchange-profile.json`

These drawings are Cosmos-style analytical study drawings. They are not measured
construction plans and must not be published as exact reconstructions until
reviewed.

## 3D Model Generator

`cosmos:model-generate` first runs the existing model-plan pipeline. When a
reviewed procedural template exists, it then generates local GLB geometry. Villa
Savoye is the first supported procedural template.

For entries without a reviewed template, the tool writes a model-generation
review file instead of inventing plausible geometry.

Required future layer contract:

- site
- mass
- structure
- facade
- interior
- tectonic
- materials

## Architecture Text Generator

`cosmos:text-generate` writes a review-only architecture text pack to
`out/text-review/{slug}` and `archive-intake/{slug}/texts`. The `archive-intake`
copy is the durable local review copy because `out/` is also used by the static
Next.js export.

The output contains:

- headline
- overview
- one-sentence suggestion
- chapter prose for architectural reading, material/structure, spatial order,
  tectonics, context and database/model value

The text generator is intentionally source-cautious. It turns dry metadata,
analysis layers and ETH/source notes into better prose, but every factual claim
must be reviewed before being promoted into `data/mock-entries.json`.

## Brain Integration

The Brain reads `data/brain-tools.json` as the tool registry. The registry tells
the Brain which local commands exist, where their outputs land and which actions
need approval before public use.

Guardrails:

- no automatic public database write;
- no R2/D1 upload;
- no public release of unclear images, plans or exact plan-derived assets;
- every tool output carries review status and public-use metadata.
