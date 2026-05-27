# KosmoAsset Review Certificate

Asset: Warm Concrete Study Material (`warm-concrete-material-001`)
Route: `blender`
Generated: 2026-05-27T20:27:49.403Z
Status: `asset_local_review_certificate_blocked`
Certificate ID: `kosmo-asset-demo:warm-concrete-material-001:blender:2026-05-27T20:27:49.061Z`

Architecture Kosmos Local Quality Certificate V1. This is local review evidence only. It does not approve public use, upload assets, write D1/R2, mutate the library, write Blender scenes or write ArchiCAD project files.

## Summary

- checks: 13/15
- failed checks: 2
- public gate: `blocked`
- rights: `generated_needs_review`
- local ready: yes

## Architecture Kosmos Quality Scope

- human architecture review: yes
- source and rights review: yes
- AI slop quality gate: yes
- public release approval: no
- official external certification: no

## Limitations

- Architecture Kosmos local quality evidence confirms that a named human reviewer checked the asset route for local sandbox use.
- It is not an official external certification, not a legal rights opinion and not a public release approval.
- Public use still requires a separate owner, source, rights and publication review.

## Evidence

- decision: `examples/kosmo-assets/kosmo-asset-demo/review/asset-review-decision-warm-concrete-material-001-blender.generated.json`
- human session: `examples/kosmo-assets/kosmo-asset-demo/review/asset-human-review-session.generated.json`
- handoff smoke: `handoff_smoke_passed`
- source file: `examples/kosmo-assets/kosmo-asset-demo/assets/materials/warm-concrete.material.json`

## Checks

- passed: Human-review session exists.
- passed: Human-review session contains this asset.
- passed: Explicit local review decision exists.
- passed: Decision status is local_review_decision_recorded.
- failed: Decision is needs-review.
- failed: Decision reviewer is missing.
- passed: Decision route is blender, expected blender.
- passed: Review-pack marks the asset as local-ready.
- passed: Handoff smoke status is handoff_smoke_passed.
- passed: Handoff bundle contains a blender profile.
- passed: Route source file exists locally.
- passed: Public gate remains blocked.
- passed: Decision records no uploads.
- passed: Decision records no public downloads.
- passed: Decision records no library mutation.

## Outputs

- certificate_json: `examples/kosmo-assets/kosmo-asset-demo/review/asset-review-certificate-warm-concrete-material-001-blender.generated.json`
- certificate_markdown: `examples/kosmo-assets/kosmo-asset-demo/review/asset-review-certificate-warm-concrete-material-001-blender.generated.md`
- source_file: `examples/kosmo-assets/kosmo-asset-demo/assets/materials/warm-concrete.material.json`
- decision: `examples/kosmo-assets/kosmo-asset-demo/review/asset-review-decision-warm-concrete-material-001-blender.generated.json`

## Next Actions

- Resolve failed checks before treating this asset/route as locally certified.
