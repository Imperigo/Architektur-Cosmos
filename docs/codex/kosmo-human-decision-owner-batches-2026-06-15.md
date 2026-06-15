# Kosmo Human Decision Owner Batches

Generated: 2026-06-15T10:42:34.369Z
Status: `owner_decision_batches_open`

## Purpose

This document turns the open Kosmo Human Decision Queue into small owner-review batches. It does not apply decisions, approve public display, promote models, write public manifests, upload assets or mark anything public-ready.

Source queue:

- `data/kosmo-human-decision-queue-2026-06-15.json`

Current guardrail:

- Open items: 16/16
- Public-ready after batches: 0
- Safe defaults remain binding until a named human decision is recorded and the checks pass.

## Batch A: Villa Savoye Image Candidates

Intent: Decide whether any Villa Savoye image candidate should enter a deeper source/credit review.

Status: `open`
Open items: 3/3
Safe defaults: `needs_more_source_context` 3

Items:

| Lane | Item | Path | Safe default | Allowed owner direction |
| --- | --- | --- | --- | --- |
| KosmoReferences | villa-savoye-exterior-savoye-3-cc0 | `public/archive-media/villa-savoye/exterior/savoye-3-exterior-cc0.jpg` | `needs_more_source_context` | keep blocked, request more source context, or approve only after explicit rights review |
| KosmoReferences | villa-savoye-exterior-loc-full | `public/archive-media/villa-savoye/exterior/villa-savoye-loc-exterior.jpg` | `needs_more_source_context` | keep blocked, request more source context, or approve only after explicit rights review |
| KosmoReferences | villa-savoye-interior-chaise-cc-by-sa | `public/archive-media/villa-savoye/interior/villa-savoye-chaise-longue-interior-cc-by-sa-2.jpg` | `needs_more_source_context` | keep blocked, request more source context, or approve only after explicit rights review |

Recommended review stance:

- If no public preview is needed now, leave all three blocked.
- If a preview is needed, open a separate source-basis review before any public-ready change.

## Batch B: Villa Savoye Derived Files

Intent: Keep generated or derived Villa Savoye files from becoming public-facing without source-basis review.

Status: `open`
Open items: 4/4
Safe defaults: `keep_blocked` 4

Items:

| Lane | Item | Path | Safe default | Allowed owner direction |
| --- | --- | --- | --- | --- |
| KosmoReferences | public/archive-media/villa-savoye/exterior/villa-savoye-loc-exterior-crop.jpg | `public/archive-media/villa-savoye/exterior/villa-savoye-loc-exterior-crop.jpg` | `keep_blocked` | keep blocked or open separate source-basis review |
| KosmoReferences | public/archive-media/villa-savoye/plan/villa-savoye-ground-floor-diagram.svg | `public/archive-media/villa-savoye/plan/villa-savoye-ground-floor-diagram.svg` | `keep_blocked` | keep blocked or open separate source-basis review |
| KosmoReferences | public/archive-media/villa-savoye/section/villa-savoye-long-section-diagram.svg | `public/archive-media/villa-savoye/section/villa-savoye-long-section-diagram.svg` | `keep_blocked` | keep blocked or open separate source-basis review |
| KosmoReferences | public/archive-models/villa-savoye/low.glb | `public/archive-models/villa-savoye/low.glb` | `keep_blocked` | keep blocked or open separate source-basis review |

Recommended review stance:

- Record `keep_blocked` unless the owner explicitly starts a source-basis review for this batch.

## Batch C: Model Promotion Confirmation

Intent: Prevent diagrammatic massing/model studies from being presented as measured or source-complete architecture models.

Status: `open`
Open items: 2/2
Safe defaults: `needs_more_source_context` 2

Items:

| Lane | Item | Path | Safe default | Allowed owner direction |
| --- | --- | --- | --- | --- |
| KosmoReferences | villa-savoye | `public/archive-models/villa-savoye/low.glb` | `needs_more_source_context` | defer promotion or open separate model-quality/source review |
| KosmoReferences | alterszentrum-kloster-ingenbohl | `public/archive-models/alterszentrum-kloster-ingenbohl/low.glb` | `needs_more_source_context` | defer promotion or open separate model-quality/source review |

Recommended review stance:

- Defer promotion until a separate model-quality and source-confidence review exists.

## Batch D: Sogn Benedetg Source Gap

Intent: Keep the Sogn Benedetg lane honest until the larger private library roots are visible.

Status: `open`
Open items: 1/1
Safe defaults: `needs_more_source_context` 1

Items:

| Lane | Item | Path | Safe default | Allowed owner direction |
| --- | --- | --- | --- | --- |
| KosmoReferences | sogn-benedetg-source-gap | none | `needs_more_source_context` | keep source gap open or point workers to the private source root |

Recommended review stance:

- Keep open until the large OneDrive/book/ETH/HSLU library can be indexed or mounted.

## Batch E: KosmoAsset Human Reviews

Intent: Review local-only study assets for Blender, DXF, web and future ArchiCAD workflows without public promotion.

Status: `open`
Open items: 6/6
Safe defaults: `needs-review` 6

Items:

| Lane | Item | Path | Safe default | Allowed owner direction |
| --- | --- | --- | --- | --- |
| KosmoAsset | Villa Savoye Concrete Frame Material Study | `villa-savoye-concrete-frame-material-001` | `needs-review` | keep needs-review until a named human reviewer inspects local files |
| KosmoAsset | Villa Savoye Five Points Diagram Kit | `villa-savoye-five-points-diagram-001` | `needs-review` | keep needs-review until a named human reviewer inspects local files |
| KosmoAsset | Sogn Benedetg Wood Shingle Material Study | `sogn-benedetg-wood-shingle-material-001` | `needs-review` | keep needs-review until a named human reviewer inspects local files |
| KosmoAsset | Sogn Benedetg Light Band Detail Study | `sogn-benedetg-light-band-detail-001` | `needs-review` | keep needs-review until a named human reviewer inspects local files |
| KosmoAsset | Ingenbohl Mineral Pigment Material Study | `ingenbohl-mineral-pigment-material-001` | `needs-review` | keep needs-review until a named human reviewer inspects local files |
| KosmoAsset | Ingenbohl Concrete Core and Frame Study | `ingenbohl-concrete-core-frame-study-001` | `needs-review` | keep needs-review until a named human reviewer inspects local files |

Recommended review stance:

- Use `needs-review` until a named reviewer has opened the local files.
- Use `block-public` for anything that should remain private/local even after local approval.

## Worker Protocol

1. Present one batch at a time to the owner or reviewer.
2. Never convert this report into decisions directly.
3. After a reference decision edit, run `npm run kosmo:owner-decision-session-check`.
4. After an asset decision edit, run `npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json`.
5. After any human-decision update, run `npm run kosmo:data-lane-sweep`.

## Current Recommendation

Use this order:

1. Villa Savoye Image Candidates.
2. Villa Savoye Derived Files.
3. Model Promotion Confirmation.
4. Sogn Benedetg Source Gap.
5. KosmoAsset Human Reviews.
