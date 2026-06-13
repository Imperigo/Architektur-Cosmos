# KosmoAsset Export Plan

Library: `kosmoreferences-pilot-seed-library-2026-06-13`
Generated: 2026-06-13T18:23:42.609Z
Status: `review_plan`

This is a local review-only export plan. It does not upload assets, write D1/R2 or create public downloads.

## Summary

- assets: 6
- ready routes: 0
- review routes: 0
- planned routes: 18
- blocked routes: 1

## Asset Routes

| Asset | Target | Status | Required formats | Blockers |
| --- | --- | --- | --- | --- |
| Villa Savoye Concrete Frame Material Study | blender | planned | material_json, blend | Required format planned but not generated: material_json or blend |
| Villa Savoye Concrete Frame Material Study | archicad | planned | material_json, gsm | Required format planned but not generated: material_json or gsm |
| Villa Savoye Concrete Frame Material Study | web | planned | material_json, webp, png | Web/public route remains private because public_use_allowed or rights are not public-safe.; Required format planned but not generated: material_json or webp or png |
| Villa Savoye Five Points Diagram Kit | svg | planned | svg | Required format planned but not generated: svg |
| Villa Savoye Five Points Diagram Kit | web | planned | svg, glb, webp, png | Web/public route remains private because public_use_allowed or rights are not public-safe.; Required format planned but not generated: svg or glb or webp or png |
| Villa Savoye Five Points Diagram Kit | layout | planned | svg | Required format planned but not generated: svg |
| Sogn Benedetg Wood Shingle Material Study | blender | planned | material_json, blend | Required format planned but not generated: material_json or blend |
| Sogn Benedetg Wood Shingle Material Study | archicad | planned | material_json, gsm | Required format planned but not generated: material_json or gsm |
| Sogn Benedetg Wood Shingle Material Study | web | planned | material_json, webp, png | Web/public route remains private because public_use_allowed or rights are not public-safe.; Required format planned but not generated: material_json or webp or png |
| Sogn Benedetg Light Band Detail Study | dxf | planned | dxf | Required format planned but not generated: dxf |
| Sogn Benedetg Light Band Detail Study | svg | planned | svg | Required format planned but not generated: svg |
| Sogn Benedetg Light Band Detail Study | layout | planned | svg | Required format planned but not generated: svg |
| Ingenbohl Mineral Pigment Material Study | blender | planned | material_json, blend | Required format planned but not generated: material_json or blend |
| Ingenbohl Mineral Pigment Material Study | archicad | planned | material_json, gsm | Required format planned but not generated: material_json or gsm |
| Ingenbohl Mineral Pigment Material Study | web | planned | material_json, webp, png | Web/public route remains private because public_use_allowed or rights are not public-safe.; Required format planned but not generated: material_json or webp or png |
| Ingenbohl Concrete Core and Frame Study | blender | planned | glb, blend | Required format planned but not generated: glb or blend |
| Ingenbohl Concrete Core and Frame Study | archicad | blocked | dxf, gsm, ifc | Missing target format: dxf or gsm or ifc |
| Ingenbohl Concrete Core and Frame Study | glb | planned | glb | Required format planned but not generated: glb |
| Ingenbohl Concrete Core and Frame Study | web | planned | svg, glb, webp, png | Web/public route remains private because public_use_allowed or rights are not public-safe.; Required format planned but not generated: svg or glb or webp or png |

## Next Actions

- Resolve blocked routes before exposing export buttons in the UI.
- Generate planned DXF/GLB/GSM or material exports in local review mode.

## Per Asset

### Villa Savoye Concrete Frame Material Study

- existing formats: -
- planned formats: material_json
- public ready: no
- next step: Generate planned formats: material_json.

### Villa Savoye Five Points Diagram Kit

- existing formats: -
- planned formats: svg, json
- public ready: no
- next step: Generate planned formats: svg, json.

### Sogn Benedetg Wood Shingle Material Study

- existing formats: -
- planned formats: material_json
- public ready: no
- next step: Generate planned formats: material_json.

### Sogn Benedetg Light Band Detail Study

- existing formats: -
- planned formats: dxf, svg
- public ready: no
- next step: Generate planned formats: dxf, svg.

### Ingenbohl Mineral Pigment Material Study

- existing formats: -
- planned formats: material_json
- public ready: no
- next step: Generate planned formats: material_json.

### Ingenbohl Concrete Core and Frame Study

- existing formats: -
- planned formats: json, glb
- public ready: no
- next step: Generate missing target formats or remove blocked export targets.
