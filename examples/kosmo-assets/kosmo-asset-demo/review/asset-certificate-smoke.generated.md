# KosmoAsset Certificate Smoke

Asset: `warm-concrete-material-001`
Route: `blender`
Generated: 2026-05-31T07:50:26.226Z
Status: `asset_certificate_smoke_passed`

This smoke test creates temporary local review evidence, verifies the certificate gate, then removes the temporary decision and certificate files. It does not upload, publish, write D1/R2 or mutate the asset library.

## Summary

- checks: 12/12
- failed checks: 0
- certificate status: `asset_local_review_certified`
- ledger certificate status: `asset_local_review_certified`

## Steps

| Step | Status |
| --- | --- |
| review_decision | passed |
| review_certificate | passed |
| decision_ledger_with_certificate | passed |
| decision_ledger_after_cleanup | passed |

## Checks

- passed: Temporary local review decision command passed.
- passed: Temporary review certificate command passed.
- passed: Decision ledger reads temporary certificate.
- passed: Decision ledger reruns after cleanup.
- passed: Decision status was local_review_decision_recorded.
- passed: Certificate status was asset_local_review_certified.
- passed: Certificate failed checks: 0.
- passed: Ledger saw certified local review row before cleanup.
- passed: Temporary decision files were removed.
- passed: Temporary certificate files were removed.
- passed: Public gate remained blocked during certificate smoke.
- passed: Certificate policy disallows uploads and R2 writes.

## Outputs

- smoke_json: `examples/kosmo-assets/kosmo-asset-demo/review/asset-certificate-smoke.generated.json`
- smoke_markdown: `examples/kosmo-assets/kosmo-asset-demo/review/asset-certificate-smoke.generated.md`
- cleaned_temp_decision: `examples/kosmo-assets/kosmo-asset-demo/review/asset-review-decision-warm-concrete-material-001-blender-certificate-smoke.generated.json`
- cleaned_temp_certificate: `examples/kosmo-assets/kosmo-asset-demo/review/asset-review-certificate-warm-concrete-material-001-blender-certificate-smoke.generated.json`

## Next Actions

- Certificate gate is smoke-tested; keep generated approvals explicit and local-only.
