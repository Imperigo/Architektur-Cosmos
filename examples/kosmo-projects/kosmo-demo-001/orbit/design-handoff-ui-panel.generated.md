# KosmoOrbit KosmoDesign UI Panel Spec

Project: `Kosmo Demo 001`
Generated: 2026-05-31T14:31:54.865Z
Panel state: `review_only`
Tone: `yellow`

This is a product/UI specification only. It does not open Blender, generate geometry, upload files or approve any gate.

## Header

- title: KosmoDesign
- subtitle: Design handoff
- purpose: Decide how KosmoOrbit may open KosmoDesign for this project and role.
- open mode: `context_review_only`
- description: KosmoDesign may show context and model data, but must not generate or mutate design geometry.

## Badges

| Badge | Label | Tone |
| --- | --- | --- |
| open-mode | context_review_only | `yellow` |
| role | Chef / Owner Admin | `neutral` |
| generation | generation blocked | `red` |
| risk | local_review_only | `blue` |

## Primary Action

- label: Open Review Mode
- enabled: yes
- mode: `context_review_only`
- requires confirmation: no
- effect: `open_kosmo_design_context_review_only`

## Secondary Actions

| Action | Enabled | Effect |
| --- | --- | --- |
| View Project Inspector | yes | `open_orbit_project_inspector` |
| Review Context Selection | yes | `open_context_selection_for_human_review` |
| Copy Guardrails | yes | `copy_guardrails_to_clipboard` |

## Disabled Generation Action

- label: Generate Design
- enabled: no
- reason: Design generation is blocked until context and human-review gates are approved.

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

- Source confidence: conceptual
- Stories: 2
- Rooms: 3
- Areas: 1
- Collections: 6

| Room | Story | Function | Area m2 |
| --- | --- | --- | ---: |
| Shared Studio | level-00 | work | 48 |
| Project Library | level-00 | reference | 18 |
| Meeting | level-01 | meeting | 16 |

## Context Inputs

- Candidates: 2
- Context inputs: 0
- Design seeds: 0
- Blocked inputs: 2
- Unresolved inputs: 2

Blocked inputs:
- `context-origin`: Project origin marker / human_context_selection_required
- `context-perimeter`: Project perimeter / human_context_selection_required

## Guardrails

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
