# Kosmo Dependency Phase 1 Fixture Smoke Check

Generated: 2026-06-15T13:24:45.834Z
Status: `dependency_phase1_fixture_smoke_guard_passed`

## Summary

- Smoke status: dependency_phase1_fixture_smoke_passed
- Checks: 5/5
- Failures: 0
- Public-ready after check: 0

## Findings

- passed: `schema_version` - Smoke schema_version must be 0.1.
- passed: `smoke_passed` - Smoke must pass.
- passed: `fixture_only` - Smoke must be fixture-only.
- passed: `synthetic_only` - Smoke must use synthetic inputs only.
- passed: `no_model_downloads` - Smoke must not download models.
- passed: `no_private_reads` - Smoke must not read private content.
- passed: `no_private_ocr` - Smoke must not run private OCR.
- passed: `no_private_embeddings` - Smoke must not run embeddings on private content.
- passed: `public_ready_zero` - Smoke must keep public-ready at 0.
- passed: `check_count` - Smoke must include five checks.
- passed: `all_passed` - All smoke checks must pass.
- passed: `check_passed:markitdown_html_conversion` - markitdown_html_conversion must pass.
- passed: `check_no_private:markitdown_html_conversion` - markitdown_html_conversion must not read private content.
- passed: `check_public_ready_zero:markitdown_html_conversion` - markitdown_html_conversion must keep public-ready at 0.
- passed: `check_passed:docling_import_only` - docling_import_only must pass.
- passed: `check_no_private:docling_import_only` - docling_import_only must not read private content.
- passed: `check_public_ready_zero:docling_import_only` - docling_import_only must keep public-ready at 0.
- passed: `check_passed:ifcopenshell_synthetic_entity` - ifcopenshell_synthetic_entity must pass.
- passed: `check_no_private:ifcopenshell_synthetic_entity` - ifcopenshell_synthetic_entity must not read private content.
- passed: `check_public_ready_zero:ifcopenshell_synthetic_entity` - ifcopenshell_synthetic_entity must keep public-ready at 0.
- passed: `check_passed:topologicpy_import_only` - topologicpy_import_only must pass.
- passed: `check_no_private:topologicpy_import_only` - topologicpy_import_only must not read private content.
- passed: `check_public_ready_zero:topologicpy_import_only` - topologicpy_import_only must keep public-ready at 0.
- passed: `check_passed:specklepy_import_only` - specklepy_import_only must pass.
- passed: `check_no_private:specklepy_import_only` - specklepy_import_only must not read private content.
- passed: `check_public_ready_zero:specklepy_import_only` - specklepy_import_only must keep public-ready at 0.
