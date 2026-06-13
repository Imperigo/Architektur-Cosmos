# Kosmo Human Decision Owner Batches

Generated: 2026-06-13
Status: `review_workplan_only`

## Purpose

This document turns the open Kosmo Human Decision Queue into small owner-review batches. It does not apply decisions, approve public display, promote models, write public manifests, upload assets or mark anything public-ready.

Source queue:

- `data/kosmo-human-decision-queue-2026-06-13.json`
- `docs/codex/kosmo-human-decision-queue-2026-06-13.md`

Current guardrail:

- Open items: 16/16
- Public-ready after queue: 0
- Safe defaults remain binding until a named human decision is recorded and the checks pass.

## Batch A: Villa Savoye Image Candidates

Intent: decide whether any Villa Savoye image candidate should enter a deeper source/credit review. This is the only near-term visual-display batch.

Safe default: `needs_more_source_context`

Items:

| Item | Path | Allowed owner direction |
| --- | --- | --- |
| `villa-savoye-exterior-savoye-3-cc0` | `public/archive-media/villa-savoye/exterior/savoye-3-exterior-cc0.jpg` | keep blocked, request source-basis review, or approve only after explicit rights review |
| `villa-savoye-exterior-loc-full` | `public/archive-media/villa-savoye/exterior/villa-savoye-loc-exterior.jpg` | keep blocked, request LOC/credit review, or approve only after explicit rights review |
| `villa-savoye-interior-chaise-cc-by-sa` | `public/archive-media/villa-savoye/interior/villa-savoye-chaise-longue-interior-cc-by-sa-2.jpg` | keep blocked, request attribution/ShareAlike review, or approve only after explicit rights review |

Recommended review stance:

- If no public preview is needed now, leave all three blocked.
- If a preview is needed, open a separate source-basis review before any public-ready change.

## Batch B: Villa Savoye Derived Files

Intent: keep generated or derived Villa Savoye files from becoming public-facing without source-basis review.

Safe default: `keep_blocked`

Items:

| Item | Path | Allowed owner direction |
| --- | --- | --- |
| Exterior crop | `public/archive-media/villa-savoye/exterior/villa-savoye-loc-exterior-crop.jpg` | keep blocked or open separate source-basis review |
| Ground-floor diagram | `public/archive-media/villa-savoye/plan/villa-savoye-ground-floor-diagram.svg` | keep blocked or open separate plan/source review |
| Long-section diagram | `public/archive-media/villa-savoye/section/villa-savoye-long-section-diagram.svg` | keep blocked or open separate section/source review |
| Low model | `public/archive-models/villa-savoye/low.glb` | keep blocked or open separate model/source review |

Recommended review stance:

- Record `keep_blocked` unless the owner explicitly starts a source-basis review for this batch.

## Batch C: Model Promotion Confirmation

Intent: prevent diagrammatic massing/model studies from being presented as measured or source-complete architecture models.

Safe default: `needs_more_source_context`

Items:

| Project | Path | Required owner acknowledgement before promotion |
| --- | --- | --- |
| `villa-savoye` | `public/archive-models/villa-savoye/low.glb` | model is diagrammatic, not measured; promotion needs separate review |
| `alterszentrum-kloster-ingenbohl` | `public/archive-models/alterszentrum-kloster-ingenbohl/low.glb` | model is diagrammatic, not measured; promotion needs separate review |

Recommended review stance:

- Defer promotion until a separate model-quality and source-confidence review exists.

## Batch D: Sogn Benedetg Source Gap

Intent: keep the Sogn Benedetg lane honest until the larger private library roots are visible.

Safe default: `needs_more_source_context`

Item:

| Item | Current state | Allowed owner direction |
| --- | --- | --- |
| `sogn-benedetg-source-gap` | private book/ETH/HSLU source root not yet visible | keep open, point Codex/Claude to source root, or keep Sogn link-only |

Recommended review stance:

- Keep open until the large OneDrive/book/ETH/HSLU library can be indexed or mounted.

## Batch E: KosmoAsset Human Reviews

Intent: review local-only study assets for Blender, DXF, web and future ArchiCAD workflows without public promotion.

Safe default: `needs-review`

Items:

| Asset | Route | Required human check before stronger decision |
| --- | --- | --- |
| Villa Savoye Concrete Frame Material Study | `blender` | inspect local files, material profile, scale/origin and source basis |
| Villa Savoye Five Points Diagram Kit | `web` | inspect generated web asset, naming, source basis and rights gate |
| Sogn Benedetg Wood Shingle Material Study | `blender` | inspect material profile, texture/source basis and public block |
| Sogn Benedetg Light Band Detail Study | `dxf` | inspect local DXF route, layer intent, scale and source basis |
| Ingenbohl Mineral Pigment Material Study | `blender` | inspect material profile, source basis and public block |
| Ingenbohl Concrete Core and Frame Study | `blender` | inspect structure study, geometry intent, source basis and public block |

Recommended review stance:

- Use `needs-review` until a named reviewer has opened the local files.
- Use `block-public` for anything that should remain private/local even after local approval.

## Worker Protocol

For Codex, Claude Code, KosmoOverseer and local workers:

1. Present one batch at a time to the owner or reviewer.
2. Never convert this document into decisions directly.
3. After a reference decision edit, run `npm run kosmo:owner-decision-session-check`.
4. After an asset decision edit, run `npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json`.
5. After any human-decision update, run `npm run kosmo:data-lane-sweep`.

## Current Recommendation

Use this order:

1. Batch A if a public Villa Savoye preview is needed soon.
2. Batch B to lock down derived files.
3. Batch C only when model promotion is actually needed.
4. Batch D after the private library source root is mounted.
5. Batch E after local asset files are inspectable in the target tools.
