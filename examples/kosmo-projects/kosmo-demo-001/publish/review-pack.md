# Kosmo Demo 001 Review Pack

Generated: 2026-05-25T20:56:16.411Z
Project ID: `kosmo-demo-001`
Risk level: `local_review_only`
Readiness: `review_required`

## Module Status

| Module | Status | Owner | Summary |
| --- | --- | --- | --- |
| prepare | review_ready | Kosmo Prepare | Initial brief, constraints and open questions are available. |
| data | review_ready | Kosmo Data | Local references, sources and asset candidates are listed. |
| orbit | review_ready | Kosmo Orbit | Package manifest and module folders exist. |
| design | in_progress | Kosmo Design | Conceptual two-story room profile imports into Blender; write-back smoke export is verified. |
| draw | review_ready | Kosmo Draw | Generated ground floor and section SVG exports are available from Blender room objects. |
| viz | review_ready | Kosmo Viz | Generated axon preview, camera manifest and preview manifest are available from Blender room objects. |
| publish | pending | Kosmo Publish | Review pack scaffold exists and awaits generated outputs. |
| zentrale | pending | Kosmo Zentrale | Memory logs exist, not yet registered in the live Control Hub. |

## Review Gates

| Gate | Mode | Reason |
| --- | --- | --- |
| public_release | disabled | Demo package is local-only and contains unreviewed generated content. |
| external_upload | disabled | No external upload is allowed in MVP 0.1 demo. |
| client_delivery | disabled | Not a client package. |
| paid_cloud_job | requires_human_approval | Any paid cloud generation must be approved explicitly. |

## Inputs

- ok: `brief/kosmo-brief.md` (prepare, brief, internal_only)
- ok: `brief/constraints.json` (prepare, constraints, internal_only)
- ok: `data/references.json` (data, reference_list, internal_only)

## Outputs

- ok: `design/model-profile.json` (design, model_profile, generated_needs_review)
- ok: `design/context-import.generated.json` (design, other, generated_needs_review)
- ok: `design/context-candidates.generated.json` (design, other, generated_needs_review)
- ok: `design/context-selection.json` (design, other, internal_only)
- ok: `draw/exports/ground-floor-plan.svg` (draw, plan_export, generated_needs_review)
- ok: `draw/exports/section-a.svg` (draw, plan_export, generated_needs_review)
- ok: `viz/previews/kosmo-preview-axon.png` (viz, viz_preview, generated_needs_review)
- ok: `viz/previews/preview-manifest.json` (viz, viz_preview_manifest, internal_only)
- ok: `viz/cameras.generated.json` (viz, camera_manifest, internal_only)
- ok: `publish/review-pack.md` (publish, review_pack, internal_only)
- ok: `design/context-decision-matrix.generated.json` (design, other, generated_needs_review)
- ok: `design/context-decision-matrix.generated.md` (design, other, generated_needs_review)
- ok: `design/context-review.json` (design, other, internal_only)
- ok: `design/context-review.md` (design, other, internal_only)
- ok: `design/context-source-review.generated.json` (design, other, generated_needs_review)
- ok: `design/context-source-review.generated.md` (design, other, generated_needs_review)
- ok: `design/context-source-map.generated.json` (design, other, generated_needs_review)
- ok: `design/context-source-map.generated.md` (design, other, generated_needs_review)
- ok: `design/context-source-mapping.json` (design, other, internal_only)
- ok: `design/context-source-mapping.md` (design, other, internal_only)
- ok: `design/ifc-semantic-proof.generated.json` (design, other, generated_needs_review)
- ok: `design/ifc-semantic-proof.generated.md` (design, other, generated_needs_review)
- ok: `design/ifc-geometry-preview.generated.json` (design, other, generated_needs_review)
- ok: `design/ifc-geometry-preview.generated.md` (design, other, generated_needs_review)
- ok: `viz/previews/ifc-geometry-preview.svg` (viz, viz_preview, generated_needs_review)
- ok: `design/ifc-layer-plan.generated.json` (design, other, generated_needs_review)
- ok: `design/ifc-layer-plan.generated.md` (design, other, generated_needs_review)
- ok: `design/blender-layer-profile.generated.json` (design, other, generated_needs_review)
- ok: `design/archicad-layer-profile.generated.json` (design, other, generated_needs_review)
- ok: `viz/previews/ifc-layer-plan.svg` (viz, render_preview, generated_needs_review)
- ok: `design/context-handoff.generated.json` (design, other, generated_needs_review)
- ok: `design/context-handoff.generated.md` (design, other, generated_needs_review)
- ok: `design/model-layer-handoff.generated.json` (design, other, generated_needs_review)
- ok: `design/model-layer-handoff.generated.md` (design, other, generated_needs_review)
- ok: `design/blender-collection-handoff.generated.py` (design, other, generated_needs_review)
- ok: `design/archicad-layer-schedule.generated.csv` (design, other, generated_needs_review)
- ok: `design/blender-context-import.generated.json` (design, other, generated_needs_review)
- ok: `design/blender-context-import.generated.md` (design, other, generated_needs_review)
- ok: `design/blender-context-import.generated.py` (design, other, generated_needs_review)

## Context Selection

- candidates: 2
- selection file: present
- decision matrix: present
- accepted as context: 0
- accepted as design seed: 0
- needs more source review: 0
- rejected: 0
- undecided: 2
- matrix recommends context-only: 0
- matrix recommends design seed: 0
- matrix recommends source review: 2
- matrix recommends rejected: 0
- source map: present
- source map DXF layers: 0
- source map DXF polylines: 0
- source map IFC entity types: 20
- source map IFC semantic elements: 2
- source map design-seed candidates after review: 1
- source mapping: present
- source mapping rows: 1
- source mapping pending: 1
- source mapping accepted context: 0
- source mapping accepted design seed: 0
- source mapping needs source review: 0
- source mapping rejected: 0
- source review: present
- source review targets: 0
- source evidence confirmed: 0
- source human checks open: 0
- source review design-seed possible after review: 0
- IFC semantic proof: present
- IFC semantic proof engine: kosmo_step_semantic_probe
- IFC semantic proxies: 2
- IFC semantic contained proxies: 2
- IFC semantic proxies with property sets: 2
- IFC semantic integrity score: 1
- IFC geometry preview: ready
- IFC geometry preview elements: 2
- IFC geometry preview bboxes: 2
- IFC geometry preview faces: 12
- IFC geometry preview extents: 10 x 8 x 3.35 m
- IFC/DXF alignment preview: missing
- IFC/DXF alignment DXF polylines: 0
- IFC/DXF alignment IFC bboxes: 0
- IFC/DXF alignment center offset: 0 m
- IFC/DXF alignment overlap ratio: 0
- IFC/DXF alignment hint: -
- IFC layer plan: ready
- IFC layer plan elements: 2
- IFC layer plan groups: 5
- IFC layer plan material groups: 1
- IFC layer plan structure elements: 2
- IFC layer plan facade elements: 1
- model layer handoff: ready
- model layer handoff layer exports: 5
- model layer handoff planned GLBs: 5
- model layer handoff Blender collections: 5
- model layer handoff ArchiCAD layers: 5
- model layer handoff GLB export allowed: no
- context handoff: pending (context_handoff_pending_review)
- context handoff mode: context_reference_only
- context handoff context inputs: 0
- context handoff design seeds allowed: 0
- context handoff blocked inputs: 2
- Blender context import: pending (blender_context_import_pending_context_handoff)
- Blender context import objects: 4
- Blender context import DXF polylines: 0
- Blender context import IFC bboxes: 2
- Blender context import layer collections: 5
- Blender context smoke: passed
- Blender context smoke objects: 4
- Blender context smoke locked objects: 4
- Blender context smoke review-only objects: 4
- Blender context smoke output blend: no
- Blender context audit: missing
- Blender context audit failures: 0
- Blender context audit mesh polygons: 0
- Blender context audit DXF polylines: 0
- Blender context audit IFC bboxes: 0
- approved for design generation: no
- readiness: needs_human_selection

## Blockers

- none

## Warnings

- Public release is not approved.
- External upload is not approved.
- Generated output needs review: design/model-profile.json
- Generated output needs review: design/context-import.generated.json
- Generated output needs review: design/context-candidates.generated.json
- Generated output needs review: draw/exports/ground-floor-plan.svg
- Generated output needs review: draw/exports/section-a.svg
- Generated output needs review: viz/previews/kosmo-preview-axon.png
- Generated output needs review: design/context-decision-matrix.generated.json
- Generated output needs review: design/context-decision-matrix.generated.md
- Generated output needs review: design/context-source-review.generated.json
- Generated output needs review: design/context-source-review.generated.md
- Generated output needs review: design/context-source-map.generated.json
- Generated output needs review: design/context-source-map.generated.md
- Generated output needs review: design/ifc-semantic-proof.generated.json
- Generated output needs review: design/ifc-semantic-proof.generated.md
- Generated output needs review: design/ifc-geometry-preview.generated.json
- Generated output needs review: design/ifc-geometry-preview.generated.md
- Generated output needs review: viz/previews/ifc-geometry-preview.svg
- Generated output needs review: design/ifc-layer-plan.generated.json
- Generated output needs review: design/ifc-layer-plan.generated.md
- Generated output needs review: design/blender-layer-profile.generated.json
- Generated output needs review: design/archicad-layer-profile.generated.json
- Generated output needs review: viz/previews/ifc-layer-plan.svg
- Generated output needs review: design/context-handoff.generated.json
- Generated output needs review: design/context-handoff.generated.md
- Generated output needs review: design/model-layer-handoff.generated.json
- Generated output needs review: design/model-layer-handoff.generated.md
- Generated output needs review: design/blender-collection-handoff.generated.py
- Generated output needs review: design/archicad-layer-schedule.generated.csv
- Generated output needs review: design/blender-context-import.generated.json
- Generated output needs review: design/blender-context-import.generated.md
- Generated output needs review: design/blender-context-import.generated.py
- Context selection still has undecided candidates: 2
- Context source mapping still has pending review rows: 1

## Recent Memory

- decisions: 2
- jobs: 4
- uncertainties: 4

## Next Actions

- Review context-selection decisions before using candidates as design input.
- Review pending source-mapping rows before syncing decisions to context-selection.
- Run npm run kosmo:blender-context-audit to reopen and verify the saved Blender review file.
- Review source-map semantic candidates before any design-seed approval.
- Review generated outputs before any public or external use.
- Ask for explicit approval before paid cloud jobs.

