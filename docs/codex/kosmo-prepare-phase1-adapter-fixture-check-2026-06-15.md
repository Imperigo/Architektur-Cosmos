# KosmoPrepare Phase 1 Adapter Fixture Check

Generated: 2026-06-15T13:27:58.690Z
Status: `prepare_phase1_adapter_fixture_guard_passed`

## Summary

- Fixture status: prepare_phase1_adapter_fixture_ready
- Checks: 4
- Failures: 0
- Public-ready after check: 0

## Findings

- passed: `schema_version` - Report schema_version must be 0.1.
- passed: `fixture_ready` - Adapter fixture must be ready.
- passed: `synthetic_only` - Adapter fixture must be synthetic-only.
- passed: `no_private_reads` - Adapter fixture must not read private content.
- passed: `no_model_downloads` - Adapter fixture must not download models.
- passed: `public_ready_zero` - Adapter fixture must keep public-ready at 0.
- passed: `output_exists:source_html` - source_html output must exist.
- passed: `output_exists:converted_markdown` - converted_markdown output must exist.
- passed: `output_exists:ifc_entity_manifest` - ifc_entity_manifest output must exist.
- passed: `output_exists:report_json` - report_json output must exist.
- passed: `output_exists:report_markdown` - report_markdown output must exist.
- passed: `markdown_heading` - Converted markdown must include fixture heading.
- passed: `markdown_material` - Converted markdown must include material line.
- passed: `ifc_project` - IFC manifest must include IfcProject.
- passed: `ifc_material` - IFC manifest must include IfcMaterial.
- passed: `all_report_checks_passed` - All report checks must pass.
