# Kosmo Demo 001 Review Pack

Generated: 2026-05-25T17:38:41.882Z
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
- Context selection still has undecided candidates: 2

## Recent Memory

- decisions: 2
- jobs: 4
- uncertainties: 4

## Next Actions

- Review context-selection decisions before using candidates as design input.
- Review generated outputs before any public or external use.
- Ask for explicit approval before paid cloud jobs.

