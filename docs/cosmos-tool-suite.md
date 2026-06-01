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
npm run kosmodata:seed-from-research -- --entry red-house
npm run kosmodata:enrich -- --entry crystal-palace
npm run kosmodata:promote -- --entry crystal-palace --confirm
npm run kosmodata:book-ingest -- --input archive-inbox/books/villa-savoye-book --title "Villa Savoye Source Book"
npm run kosmodata:book-drafts -- --book villa-savoye-source-book
npm run kosmodata:book-pipeline -- --input archive-inbox/books/villa-savoye-book --title "Villa Savoye Source Book"
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
- chapter prose that answers the Architecture Cosmos question framework:
  These, Netzwerk/DNA, Topos, Typos, Tektonik, Raumlogik, Konflikt/Kritik,
  KosmoData-Layer/3D-Potenzial and Entwurfsintelligenz

The generator should never produce a neutral encyclopedia summary. Each project
text asks what architectural idea is being tested, how the object sits in the
atlas network, how it differs from related projects of the same "DNA", and what
can be extracted for filters, analysis layers, Blender/ArchiCAD and future
design work.

The text generator is intentionally source-cautious. It turns dry metadata,
analysis layers and ETH/source notes into better prose, but every factual claim
must be reviewed before being promoted into `data/mock-entries.json`.

Source priority is strict:

1. owner-authored ETH/PDF notes and the original Architecture Cosmos diagram
   texts are the primary prose basis;
2. existing reviewed entry text in `data/mock-entries.json`;
3. official/archive/project sources for fact checks, dates, names and missing
   fields;
4. online research synthesis only when no owner/ETH/PDF text is available.

`kosmodata:seed-from-research` therefore preserves existing texts for entries
with `lecture_pdf`, `lecture_notes` or ETH/PDF `source_documents` by default.
Online research may still add source trails, tags, model requirements and review
notes, but it must not overwrite the project prose unless the command is run
explicitly with `--allow-online-text-rewrite` after owner review.

## KosmoData Enrichment Pipeline

`database:pilot-quality` is the local quality gate for the current pilot set:

```bash
npm run database:pilot-quality
```

It reads `data/mock-entries.json`, `data/relations.json` and local review
artifacts under `archive-intake/{slug}/`. It checks whether the entry has
source-backed architectural prose, the question-led text framework, network/DNA
placement, material/context/program fields, 2D plan-pipeline artifacts, 3D
model-layer contracts and viewer/filter readiness. It does not browse, upload,
write D1/R2 or modify entries.

The gate is intentionally honest: an entry can have a high score and still stay
in `review` when a critical network, source, 2D, 3D or viewer requirement is
missing.

`kosmodata:seed-from-research` prepares the seed candidate that replaces manual
JSON drafting. It reads the current entry plus matching research packs from
`out/database-research/`, then writes:

- `out/kosmodata-enrichment/{slug}/seed-candidate.json`
- `out/kosmodata-enrichment/{slug}/seed-candidate.md`
- `archive-intake/{slug}/enrichment/seed-candidate.json`

The seed candidate includes the normal entry fields plus dedicated automation
requirements:

- `plan_requirements` for SVG/DXF/ArchiCAD 2D outputs;
- `model_requirements` for Blender/ArchiCAD/GLB layer contracts;
- `viewer_requirements` for the project 3D viewer filter buttons and modes.

`kosmodata:enrich` reads the current entry plus either the local seed candidate
or a source-backed seed from `data/kosmodata-enrichment-seeds.json`, then writes
a review pack:

- `out/kosmodata-enrichment/{slug}/enrichment-review.json`
- `out/kosmodata-enrichment/{slug}/enrichment-review.md`
- `archive-intake/{slug}/enrichment/proposed-entry.json`

The review pack contains:

- source trail;
- proposed entry patch;
- rights report;
- changed fields;
- plan / 3D / viewer pipeline commands and requirements;
- validation blockers/warnings;
- a promotion command only when the proposal is safe enough for owner review.

`kosmodata:promote` is deliberately separate:

```bash
npm run kosmodata:promote -- --entry crystal-palace --confirm
```

Promotion writes only to `data/mock-entries.json`. It does not upload assets,
write D1/R2, publish the site or bypass rights review. This keeps the public
frontend static while allowing the Brain, the Website-Dev UI and local research
pipelines to converge on the same controlled workflow.

After promotion, run the entry build review to create the plan/model/text
artifacts from the approved entry data:

```bash
npm run cosmos:entry-build -- --entry crystal-palace --mode review
```

This runs the 2D vector plan generator, 3D model generator and architecture text
review together. The plan and 3D tools remain review-only and generate local
artifacts under `archive-intake/{slug}/`.

New seeds should include only public-safe metadata, links, paraphrased analysis
and rights-reviewed media candidates. Protected plans, book scans and OCR text
stay in local/private intake folders and are never copied into the seed file.

## Book Library Ingest

`kosmodata:book-ingest` reads a local private folder of book PDFs, chapter
scans, phone photos, page images and notes. It writes a review pack to
`out/book-ingestion/{book_slug}/`:

- `book-manifest.json`
- `detected-projects.json`
- `source-map.json`
- `review-report.md`

This is not a public ingest. Book pages, OCR text, photographed plans and page
images remain private by default. Public Atlas output is limited to metadata,
external references and paraphrased analysis until rights are explicitly
cleared.

`kosmodata:book-drafts` converts the detected project list into metadata-only
Entry draft candidates under `out/book-ingestion/{book_slug}/entry-drafts/`.
These drafts remain local review material and can be validated with
`archive:draft` before any manual promotion.

`kosmodata:book-pipeline` runs the ingest, draft generation and draft validation
as one review sequence and writes `pipeline-report.json` plus
`pipeline-report.md`. This is the preferred handoff when the Brain or owner
wants to check whether a private book package is ready for manual review.

## Brain Integration

The Brain reads `data/brain-tools.json` as the tool registry. The registry tells
the Brain which local commands exist, where their outputs land and which actions
need approval before public use.

Guardrails:

- no automatic public database write;
- no R2/D1 upload;
- no public release of unclear images, plans or exact plan-derived assets;
- no public release of book scans, OCR text or photographed pages without
  rights clearance;
- every tool output carries review status and public-use metadata.
