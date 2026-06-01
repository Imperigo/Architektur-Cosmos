# KosmoAsset Review Pack

Library: `kosmo-asset-demo`
Generated: 2026-06-01T19:33:44.099Z
Status: `asset_human_review_required`
Rights scope: `local_review_only`

Review-only. This pack does not upload, publish, promote or write public asset records.

## Summary

- assets: 3
- local ready: 3
- public ready: 0
- open human reviews: 3
- KosmoData refs: 2
- generated profiles: 4
- blocked routes: 0
- needs-review routes: 11
- recommended next step: `complete_asset_human_review_before_promotion`

## Assets

| Asset | Type | Rights | Review | KosmoData | Local formats | Routes | Suggested decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kosmo Axis Marker | 2d_symbol | own_work | draft | 0 | svg, dxf | svg:needs_review, dxf:needs_review, web:needs_review, layout:needs_review | complete_human_review_before_promotion |
| Warm Concrete Study Material | material | generated_needs_review | draft | 2 | material_json | blender:needs_review, archicad:needs_review, web:needs_review | complete_human_review_before_promotion |
| Generic Column GLB Slot | glb_model | generated_needs_review | draft | 0 | glb, dxf | glb:needs_review, blender:needs_review, archicad:needs_review, web:needs_review | complete_human_review_before_promotion |

## Kosmo Axis Marker

- asset id: `axis-marker-svg-001`
- human review: `open`
- public ready: no
- suggested decision: `complete_human_review_before_promotion`

Checklist:
- passed: Source basis is documented.
- passed: No KosmoData references are attached to this asset.
- passed: At least one local source/export file exists.
- passed: Rights status does not allow unsafe public use.
- passed: Public use is blocked unless rights and review are ready.
- needs_human_review: Human review status is reviewed or verified.
- passed: No export route is blocked.
- passed: Generated assets carry a generated profile.
- passed: Asset passed the library check row.

Generated profiles:
- kosmo-asset-generate-demo-dxf: local_review_dxf_generated (7 DXF entities)

## Warm Concrete Study Material

- asset id: `warm-concrete-material-001`
- human review: `open`
- public ready: no
- suggested decision: `complete_human_review_before_promotion`

KosmoData bridge:
- `villa-savoye`: material_context / context_only / context_only
- `pantheon`: material_context / context_only / context_only

Checklist:
- passed: Source basis is documented.
- passed: KosmoData references are explicit context/source metadata and do not imply automatic asset derivation.
- passed: At least one local source/export file exists.
- passed: Rights status does not allow unsafe public use.
- passed: Public use is blocked unless rights and review are ready.
- needs_human_review: Human review status is reviewed or verified.
- passed: No export route is blocked.
- passed: Generated assets carry a generated profile.
- passed: Asset passed the library check row.

Generated profiles:
- kosmo-asset-generate-demo-material-profile: local_review_material_profile_generated (4 material parameters)

## Generic Column GLB Slot

- asset id: `generic-column-glb-001`
- human review: `open`
- public ready: no
- suggested decision: `complete_human_review_before_promotion`

Checklist:
- passed: Source basis is documented.
- passed: No KosmoData references are attached to this asset.
- passed: At least one local source/export file exists.
- passed: Rights status does not allow unsafe public use.
- passed: Public use is blocked unless rights and review are ready.
- needs_human_review: Human review status is reviewed or verified.
- passed: No export route is blocked.
- passed: Generated assets carry a generated profile.
- passed: Asset passed the library check row.

Generated profiles:
- kosmo-asset-generate-demo-glb: local_review_glb_generated (176 triangles)
- kosmo-asset-generate-demo-dxf: local_review_dxf_generated (12 DXF entities)

## Next Actions

- Open local SVG/DXF/GLB/material files and record a human review decision before promotion.
- Confirm generated assets are not derived from protected project images, scans or third-party models.
