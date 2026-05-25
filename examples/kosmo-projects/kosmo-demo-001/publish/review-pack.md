# Kosmo Demo 001 Review Pack

Generated: 2026-05-25T15:39:13.255Z
Project ID: `kosmo-demo-001`
Risk level: `local_review_only`
Readiness: `review_required`

## Module Status

| Module | Status | Owner | Summary |
| --- | --- | --- | --- |
| prepare | review_ready | Kosmo Prepare | Initial brief, constraints and open questions are available. |
| data | review_ready | Kosmo Data | Local references, sources and asset candidates are listed. |
| orbit | review_ready | Kosmo Orbit | Package manifest and module folders exist. |
| design | in_progress | Kosmo Design | Conceptual two-story room profile is available for Blender import. |
| draw | in_progress | Kosmo Draw | Placeholder ground floor and section SVG exports are available. |
| viz | pending | Kosmo Viz | Camera and render presets are defined, no render image generated yet. |
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
- ok: `draw/exports/ground-floor-plan.svg` (draw, plan_export, generated_needs_review)
- ok: `draw/exports/section-a.svg` (draw, plan_export, generated_needs_review)
- ok: `publish/review-pack.md` (publish, review_pack, internal_only)

## Blockers

- none

## Warnings

- Public release is not approved.
- External upload is not approved.
- Generated output needs review: design/model-profile.json
- Generated output needs review: draw/exports/ground-floor-plan.svg
- Generated output needs review: draw/exports/section-a.svg

## Recent Memory

- decisions: 2
- jobs: 2
- uncertainties: 2

## Next Actions

- Generate a first Kosmo Viz preview or camera check.
- Review generated outputs before any public or external use.
- Ask for explicit approval before paid cloud jobs.
