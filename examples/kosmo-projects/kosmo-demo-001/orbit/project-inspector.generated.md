# KosmoOrbit Project Package Inspector

Project: `Kosmo Demo 001`
Generated: 2026-05-31T13:53:12.578Z
Status: `local_review_only`
Risk level: `local_review_only`
Manifest: `examples/kosmo-projects/kosmo-demo-001/kosmo.project.json`

Review-only. This inspector reads the project package and writes this report only. It does not start tools, upload files, publish data or approve gates.

## Summary

- modules: 8
- artifacts: 59
- inputs: 3
- outputs: 56
- missing artifacts: 0
- review artifacts: 46
- disabled gates: 3
- approval gates: 1

## Site

- address: Demo site, Zurich region
- locality: Zurich
- country: CH
- coordinates: 47.3769, 8.5417

## Modules

| Module | Status | Readiness | Owner | Artifacts | Review | Missing |
| --- | --- | --- | --- | ---: | ---: | ---: |
| prepare | `review_ready` | `review_ready` | Kosmo Prepare | 2 | 0 | 0 |
| data | `review_ready` | `review_ready` | Kosmo Data | 1 | 0 | 0 |
| orbit | `review_ready` | `review_ready` | Kosmo Orbit | 0 | 0 | 0 |
| design | `in_progress` | `review_required` | Kosmo Design | 47 | 40 | 0 |
| draw | `review_ready` | `review_required` | Kosmo Draw | 2 | 2 | 0 |
| viz | `review_ready` | `review_required` | Kosmo Viz | 6 | 4 | 0 |
| publish | `pending` | `pending` | Kosmo Publish | 1 | 0 | 0 |
| zentrale | `pending` | `pending` | Kosmo Zentrale | 0 | 0 | 0 |

## Package Paths

| Area | Path | Status |
| --- | --- | --- |
| brief | `brief/` | ok |
| data | `data/` | ok |
| design | `design/` | ok |
| draw | `draw/` | ok |
| viz | `viz/` | ok |
| publish | `publish/` | ok |
| memory | `memory/` | ok |

## Review Gates

| Gate | Mode | Severity | Approved by | Reason |
| --- | --- | --- | --- | --- |
| public_release | `disabled` | `red` | - | Demo package is local-only and contains unreviewed generated content. |
| external_upload | `disabled` | `red` | - | No external upload is allowed in MVP 0.1 demo. |
| client_delivery | `disabled` | `red` | - | Not a client package. |
| paid_cloud_job | `requires_human_approval` | `yellow` | - | Any paid cloud generation must be approved explicitly. |

## Artifacts

| Kind | Module | Path | Rights | Exists | Review |
| --- | --- | --- | --- | --- | --- |
| input | prepare | `brief/kosmo-brief.md` | `internal_only` | yes | no |
| input | prepare | `brief/constraints.json` | `internal_only` | yes | no |
| input | data | `data/references.json` | `internal_only` | yes | no |
| output | design | `design/model-profile.json` | `generated_needs_review` | yes | yes |
| output | design | `design/context-import.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/context-candidates.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/context-selection.json` | `internal_only` | yes | no |
| output | draw | `draw/exports/ground-floor-plan.svg` | `generated_needs_review` | yes | yes |
| output | draw | `draw/exports/section-a.svg` | `generated_needs_review` | yes | yes |
| output | viz | `viz/previews/kosmo-preview-axon.png` | `generated_needs_review` | yes | yes |
| output | viz | `viz/previews/preview-manifest.json` | `internal_only` | yes | no |
| output | viz | `viz/cameras.generated.json` | `internal_only` | yes | no |
| output | publish | `publish/review-pack.md` | `internal_only` | yes | no |
| output | design | `design/context-decision-matrix.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/context-decision-matrix.generated.md` | `generated_needs_review` | yes | yes |
| output | design | `design/context-review.json` | `internal_only` | yes | no |
| output | design | `design/context-review.md` | `internal_only` | yes | no |
| output | design | `design/context-source-review.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/context-source-review.generated.md` | `generated_needs_review` | yes | yes |
| output | design | `design/context-source-map.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/context-source-map.generated.md` | `generated_needs_review` | yes | yes |
| output | design | `design/context-source-mapping.json` | `internal_only` | yes | no |
| output | design | `design/context-source-mapping.md` | `internal_only` | yes | no |
| output | design | `design/ifc-semantic-proof.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-semantic-proof.generated.md` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-geometry-preview.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-geometry-preview.generated.md` | `generated_needs_review` | yes | yes |
| output | viz | `viz/previews/ifc-geometry-preview.svg` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-layer-plan.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-layer-plan.generated.md` | `generated_needs_review` | yes | yes |
| output | design | `design/blender-layer-profile.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/archicad-layer-profile.generated.json` | `generated_needs_review` | yes | yes |
| output | viz | `viz/previews/ifc-layer-plan.svg` | `generated_needs_review` | yes | yes |
| output | design | `design/context-handoff.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/context-handoff.generated.md` | `generated_needs_review` | yes | yes |
| output | design | `design/model-layer-handoff.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/model-layer-handoff.generated.md` | `generated_needs_review` | yes | yes |
| output | design | `design/blender-collection-handoff.generated.py` | `generated_needs_review` | yes | yes |
| output | design | `design/archicad-layer-schedule.generated.csv` | `generated_needs_review` | yes | yes |
| output | design | `design/blender-context-import.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/blender-context-import.generated.md` | `generated_needs_review` | yes | yes |
| output | design | `design/blender-context-import.generated.py` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-human-review-pack.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-human-review-pack.generated.md` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-dxf-alignment-preview.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-dxf-alignment-preview.generated.md` | `generated_needs_review` | yes | yes |
| output | viz | `viz/previews/ifc-dxf-alignment-preview.svg` | `generated_needs_review` | yes | yes |
| output | design | `design/ifcopenshell-semantic-review.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/ifcopenshell-semantic-review.generated.md` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-human-review-viewer.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-human-review-viewer.generated.html` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-human-review-decision.json` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-human-review-decision.md` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-human-review-sync.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-human-review-sync.generated.md` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-human-review-guide.generated.json` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-human-review-guide.generated.md` | `generated_needs_review` | yes | yes |
| output | design | `design/ifc-human-review-session.json` | `internal_only` | yes | no |
| output | design | `design/ifc-human-review-session.md` | `internal_only` | yes | no |

## Next Actions

- Keep generated outputs local until human review records source, geometry, plan and visualization quality.
- Use KosmoOrbit to surface the design review gates before opening a KosmoDesign handoff.
- Keep public release disabled; this package is a local review package, not a publishable client/public package.
- Require explicit approval before any paid cloud/GPU job is started from this project.
