# KosmoAsset Blender Sandbox

Asset: Warm Concrete Study Material (`warm-concrete-material-001`)
Generated: 2026-05-27T20:38:11.664Z
Status: `blender_sandbox_script_ready`

This is a local sandbox bridge for Blender. It is not a production import, does not save `.blend` files and does not publish assets.

## Checks

- passed: Decision status is local_review_decision_recorded.
- passed: Decision route is blender.
- passed: Handoff smoke status is handoff_smoke_passed.
- passed: Handoff bundle has a Blender profile for this asset.
- passed: Public gate remains blocked.
- passed: Referenced local source file exists.
- passed: Generated sandbox script does not save or open Blender project files.
- passed: Generated sandbox script does not upload or publish assets.

## Outputs

- sandbox_json: `examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-sandbox-warm-concrete-material-001.generated.json`
- sandbox_markdown: `examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-sandbox-warm-concrete-material-001.generated.md`
- sandbox_python: `examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-sandbox-warm-concrete-material-001.generated.py`
- decision: `examples/kosmo-assets/kosmo-asset-demo/review/asset-review-decision-warm-concrete-material-001-blender.generated.json`
- handoff_bundle: `examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-bundle.generated.md`
- handoff_smoke: `examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-smoke.generated.md`

## Blender Layers

- material/base_color
- material/roughness
- material/metallic
- material/specular
- blender/principled_bsdf
- archicad/material/concrete/review

## Next Actions

- Open a copied Blender sandbox file, not a production project.
- Run the generated Python script from Blender Text Editor or console.
- Inspect created KOSMO_SANDBOX collections/materials, then discard or save the copied sandbox manually.
