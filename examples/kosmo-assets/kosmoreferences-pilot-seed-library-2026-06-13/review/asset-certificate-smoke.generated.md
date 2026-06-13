# KosmoAsset Certificate Smoke

Asset: `villa-savoye-concrete-frame-material-001`
Route: `blender`
Generated: 2026-06-13T18:15:52.114Z
Status: `asset_certificate_smoke_passed`

This smoke test creates temporary local review evidence, verifies the certificate gate, then removes the temporary decision and certificate files. It does not upload, publish, write D1/R2 or mutate the asset library.

## Summary

- checks: 12/12
- failed checks: 0
- certificate status: `asset_local_review_certificate_blocked`
- ledger certificate status: `asset_local_review_certificate_blocked`

## Steps

| Step | Status |
| --- | --- |
| review_decision | passed |
| review_certificate | failed |
| decision_ledger_with_certificate | passed |
| decision_ledger_after_cleanup | passed |

## Checks

- passed: Temporary local review decision command passed.
- passed: Temporary review certificate command completed or blocked an unsafe certificate as expected.
- passed: Decision ledger reads temporary certificate.
- passed: Decision ledger reruns after cleanup.
- passed: Decision status was local_review_decision_recorded.
- passed: Certificate status was asset_local_review_certificate_blocked.
- passed: Certificate failed checks: 2.
- passed: Ledger saw the temporary certificate outcome before cleanup.
- passed: Temporary decision files were removed.
- passed: Temporary certificate files were removed.
- passed: Public gate remained blocked during certificate smoke.
- passed: Certificate policy disallows uploads and R2 writes.

## Outputs

- smoke_json: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-certificate-smoke.generated.json`
- smoke_markdown: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-certificate-smoke.generated.md`
- cleaned_temp_decision: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-review-decision-villa-savoye-concrete-frame-material-001-blender-certificate-smoke.generated.json`
- cleaned_temp_certificate: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-review-certificate-villa-savoye-concrete-frame-material-001-blender-certificate-smoke.generated.json`

## Next Actions

- Certificate gate is smoke-tested; keep generated approvals explicit and local-only.
