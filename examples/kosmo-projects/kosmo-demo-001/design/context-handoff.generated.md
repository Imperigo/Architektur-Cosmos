# Kosmo Design Context Handoff

Project ID: `kosmo-demo-001`
Generated: 2026-05-25T19:39:52.540Z
Status: `context_handoff_pending_review`
Mode: `context_reference_only`

This handoff is an explicit boundary between reviewed context and blocked design seeds.

## Summary

- context inputs: 0
- design seed inputs: 0
- design seeds allowed: 0
- blocked inputs: 2
- unresolved inputs: 2
- alignment preview ready: no
- alignment hint: `-`
- IFC layer plan ready: yes
- IFC layer groups: 5
- IFC material groups: 1
- approved for design generation: no
- design generation allowed: no

## Context Inputs

| Candidate | Role | Permission | Use |
| --- | --- | --- | --- |
| none | - | - | - |

## Blocked Inputs

| Candidate | Decision | Reason |
| --- | --- | --- |
| Project origin marker | undecided | human_context_selection_required |
| Project perimeter | undecided | human_context_selection_required |

## Evidence

- context import objects: 3
- DXF total polylines: 0
- source mapping accepted context: 0
- IFC semantic proxies: 2
- IFC geometry bboxes: 2
- IFC/DXF alignment overlap: 0
- IFC/DXF alignment center offset: 0 m
- IFC layer groups: 5
- IFC material groups: 1

## Guardrails

- Use context inputs only as reference, snapping aid, extent check or visual underlay.
- Do not convert dense DXF context polylines into editable design geometry automatically.
- Do not claim BIM semantics from IFC bounding boxes or STEP fallback previews.
- Do not instantiate Blender collections from generated layer plans until a human approves the layer mapping.
- Do not run design generation unless context-selection has accepted_as_design_seed and approved_for_design_generation=true.
- Keep all outputs internal until public_release/external_upload/client_delivery gates are explicitly approved.
- Resolve needs_more_source_review or undecided inputs before promoting any design seed.

## Next Actions

- Review design/context-selection.json and accept safe context references first.

