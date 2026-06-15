# KosmoPrepare Phase 1 Source Package Contract Check

Generated: 2026-06-15T13:33:51.067Z
Status: `prepare_phase1_source_package_contract_guard_passed`

## Summary

- Package: kosmo-prepare-phase1-adapter-fixture-2026-06-15
- Package status: adapter_contract_ready
- Rights scope: synthetic_fixture
- Sources: 1
- Artifacts: 4
- Review gates: 7
- Failures: 0
- Public-ready after check: 0

## Findings

- passed: `schema_version` - Manifest schema_version must be 0.1.
- passed: `status_adapter_contract_ready` - Manifest must be adapter_contract_ready.
- passed: `rights_scope_synthetic` - Manifest rights_scope must be synthetic_fixture.
- passed: `source_files_not_public` - Source files must not be marked public.
- passed: `extracted_text_not_public` - Extracted text must not be marked public.
- passed: `derived_summary_not_public` - Derived summary must not be marked public for this contract.
- passed: `one_source` - Contract should have exactly one synthetic source file.
- passed: `artifact_minimum` - Contract should include markdown, IFC manifest and report artifacts.
- passed: `review_gate_count` - Contract must include all seven source package gates.
- passed: `promotion_adapter_only` - Candidate must remain adapter_contract_only.
- passed: `next_action_checker` - Next actions must include source-package-check.
- passed: `source_package_checker_passes` - kosmo-source-package-check passed with --strict-artifacts.

## Source Package Checker

- Package: examples/kosmo-references/source-packages/kosmo-prepare-phase1-adapter-fixture-2026-06-15/source-package.json
- Status: passed
- Sources: 1
- Artifacts: 4
- Candidates: 1
- Failures: 0
- Warnings: 0
- Wrote: examples/kosmo-references/source-packages/kosmo-prepare-phase1-adapter-fixture-2026-06-15/review/source-package-check.generated.md
