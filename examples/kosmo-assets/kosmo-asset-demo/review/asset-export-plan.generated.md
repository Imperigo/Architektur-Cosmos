# KosmoAsset Export Plan

Library: `kosmo-asset-demo`
Generated: 2026-05-26T12:54:21.423Z
Status: `review_plan`

This is a local review-only export plan. It does not upload assets, write D1/R2 or create public downloads.

## Summary

- assets: 3
- ready routes: 0
- review routes: 9
- planned routes: 1
- blocked routes: 1

## Asset Routes

| Asset | Target | Status | Required formats | Blockers |
| --- | --- | --- | --- | --- |
| Kosmo Axis Marker | svg | needs_review | svg | - |
| Kosmo Axis Marker | dxf | planned | dxf | Required format planned but not generated: dxf |
| Kosmo Axis Marker | web | needs_review | svg, glb, webp, png | Web/public route remains private because public_use_allowed or rights are not public-safe. |
| Kosmo Axis Marker | layout | needs_review | svg | - |
| Warm Concrete Study Material | blender | needs_review | material_json, blend | - |
| Warm Concrete Study Material | archicad | needs_review | material_json, gsm | - |
| Warm Concrete Study Material | web | needs_review | material_json, webp, png | Web/public route remains private because public_use_allowed or rights are not public-safe. |
| Generic Column GLB Slot | glb | needs_review | glb | - |
| Generic Column GLB Slot | blender | needs_review | glb, blend | - |
| Generic Column GLB Slot | archicad | blocked | dxf, gsm, ifc | Missing target format: dxf or gsm or ifc |
| Generic Column GLB Slot | web | needs_review | svg, glb, webp, png | Web/public route remains private because public_use_allowed or rights are not public-safe. |

## Next Actions

- Resolve blocked routes before exposing export buttons in the UI.
- Generate planned DXF/GLB/GSM or material exports in local review mode.
- Review assets with local source files before promoting them to reusable workflow assets.

## Per Asset

### Kosmo Axis Marker

- existing formats: svg
- planned formats: dxf
- public ready: no
- next step: Generate planned formats: dxf.

### Warm Concrete Study Material

- existing formats: material_json
- planned formats: -
- public ready: no
- next step: Run human review and move review_status to reviewed or verified.

### Generic Column GLB Slot

- existing formats: glb
- planned formats: -
- public ready: no
- next step: Generate missing target formats or remove blocked export targets.

