# KosmoOrbit KosmoDesign Handoff Preview

Project: `Kosmo Demo 001`
Generated: 2026-05-31T14:31:54.684Z
Status: `handoff_review_only`
Mode: `context_review_only`

Review-only. This preview does not open Blender, generate geometry, approve design generation, upload files or publish data.

## Current Role

- user: Kosmo Owner
- role: Chef / Owner Admin (`owner_admin`)
- UI mode: `full_admin`
- can use KosmoDesign: yes

## Handoff

- target: `kosmo-design`
- runtime: KosmoDraw / Blender kosmo_design
- recommended open mode: `context_review_only`
- design generation allowed: no
- Orbit readiness: `review_required`
- module readiness: `review_required`

## Blockers

- Context handoff does not approve design generation.
- Workspace gates for KosmoDesign are blocked, needs_review or unknown.
- Design artifacts still require human review.
- Context handoff contains blocked inputs.

## Allowed Actions

- Open KosmoDesign only in context review mode.
- Show model-profile rooms, stories, areas and collections as read-only project context.
- Show blocked context inputs and guardrails before any geometry action.
- Keep generation, public release and external upload disabled.

## Model Profile

- source confidence: `conceptual`
- stories: 2
- rooms: 3
- areas: 1
- collections: 6

| Room | Story | Function | Area m2 |
| --- | --- | --- | ---: |
| Shared Studio | level-00 | work | 48 |
| Project Library | level-00 | reference | 18 |
| Meeting | level-01 | meeting | 16 |

## Context Handoff

- context status: `context_handoff_pending_review`
- handoff mode: `context_reference_only`
- candidates: 2
- context inputs: 0
- design seed inputs: 0
- blocked inputs: 2
- unresolved inputs: 2
- recommended next step: `use_context_as_reference_only_and_complete_open_source_review`

Blocked inputs:
- `context-origin`: Project origin marker / human_context_selection_required
- `context-perimeter`: Project perimeter / human_context_selection_required

Guardrails:
- Use context inputs only as reference, snapping aid, extent check or visual underlay.
- Do not convert dense DXF context polylines into editable design geometry automatically.
- Do not claim BIM semantics from IFC bounding boxes or STEP fallback previews.
- Do not instantiate Blender collections from generated layer plans until a human approves the layer mapping.
- Do not run design generation unless context-selection has accepted_as_design_seed and approved_for_design_generation=true.
- Keep all outputs internal until public_release/external_upload/client_delivery gates are explicitly approved.
- Resolve needs_more_source_review or undecided inputs before promoting any design seed.

## Next Actions

- Build the first Orbit UI panel for this handoff: role, open mode, blockers, model profile and guardrails.
- Resolve or explicitly accept/reject blocked context inputs in design/context-selection.json.
- Close the relevant design human-review records before allowing generation.
