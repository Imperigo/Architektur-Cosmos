# KosmoAsset Handoff Smoke

Library: `examples/kosmo-assets/kosmo-asset-demo/library.json`
Generated: 2026-05-31T09:26:51.004Z
Status: `handoff_smoke_passed`

Review-only. This smoke checks generated handoff files and does not import assets, write project files, upload or publish anything.

## Summary

- checks: 12/12
- failures: 0
- Blender rows: 2
- ArchiCAD rows: 3
- open reviews: 3

## Checks

- passed: Bundle status is local_review_handoff_bundle.
- passed: Bundle policy stays review-only, no uploads and no public downloads.
- passed: Blender handoff exists at examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-handoff.generated.py.
- passed: ArchiCAD CSV exists at examples/kosmo-assets/kosmo-asset-demo/review/asset-archicad-schedule.generated.csv.
- passed: Blender script keeps ALLOW_SCENE_WRITE = False.
- passed: Blender script does not call save/open mainfile operators.
- passed: Blender Python handoff runs in review-only mode without importing bpy.
- passed: ArchiCAD CSV header matches the handoff contract.
- passed: ArchiCAD CSV has 3 data rows.
- passed: ArchiCAD rows remain unapproved and open for human review.
- passed: All referenced local source files exist.
- passed: All public gates remain blocked.

## Python Runtime

- command: `python3 examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-handoff.generated.py`
- status: 0
- stdout: `KosmoAsset Blender handoff / - Warm Concrete Study Material: create_material_from_parameters -> KOSMO_ASSET/material/warm-concrete-material-001 /   review gate: not approved for production import / - Generic Column GLB Slot: link_glb_as_collection -> KOSMO_ASSET/structure/generic-column-glb-001 /   review gate: not approved for production import / Review-only mode. Set ALLOW_SCENE_WRITE = True only inside an approved smoke-test file.`

## Next Actions

- Handoff bundle is ready for human review-only smoke tests. Keep ALLOW_SCENE_WRITE disabled until explicit approval.
