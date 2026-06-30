# KosmoAsset Prepare Phase 1 Fixture Contract Check

Generated: 2026-06-30T06:49:34.850Z
Status: `kosmoasset_prepare_phase1_fixture_contract_guard_passed`

## Summary

- Contract status: kosmoasset_prepare_phase1_fixture_contract_ready
- Library: kosmo-prepare-phase1-fixture
- Assets: 2
- Failures: 0
- Public-ready after check: 0

## Findings

- passed: `schema_version` - Report schema_version must be 0.1.
- passed: `contract_ready` - Contract must be ready.
- passed: `synthetic_only` - Contract must be synthetic-only.
- passed: `no_private_reads` - Contract must not read private content.
- passed: `no_private_copies` - Contract must not copy private content.
- passed: `no_asset_ingestion` - Contract must not ingest external assets.
- passed: `no_uploads` - Contract must keep uploads disabled.
- passed: `no_public_assets` - Contract must not allow public assets.
- passed: `public_ready_zero` - Contract must keep public-ready at 0.
- passed: `library_schema` - Library schema_version must be 0.1.
- passed: `library_review_only` - Library must be local_review_only.
- passed: `library_uploads_false` - Library uploads must be disabled.
- passed: `library_public_false` - Library public assets must be disabled.
- passed: `two_assets` - Fixture library must include exactly two asset candidates.
- passed: `all_assets_private` - All fixture assets must have public_use_allowed=false.
- passed: `all_assets_local_only` - All fixture assets must be local_only.
- passed: `asset_library_check_passes` - kosmo-asset-library-check passed for the fixture library.

## Asset Library Checker

- KosmoAsset library check
- Library: examples/kosmo-assets/kosmo-prepare-phase1-fixture/library.json
- Status: passed
- Assets: 2
- Failures: 0
- Warnings: 2
- Wrote: examples/kosmo-assets/kosmo-prepare-phase1-fixture/review/asset-library-check.generated.md
