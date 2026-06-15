# KosmoPrepare Phase 1 Adapter Fixture

Generated: 2026-06-15T13:27:58.454Z
Status: `prepare_phase1_adapter_fixture_ready`

## Outputs

- source_html: `examples/kosmo-prepare/phase1-adapter-fixture/source.synthetic.html`
- converted_markdown: `examples/kosmo-prepare/phase1-adapter-fixture/converted.markitdown.md`
- ifc_entity_manifest: `examples/kosmo-prepare/phase1-adapter-fixture/ifcopenshell-entity-manifest.json`
- report_json: `examples/kosmo-prepare/phase1-adapter-fixture/prepare-phase1-adapter-report.json`
- report_markdown: `examples/kosmo-prepare/phase1-adapter-fixture/prepare-phase1-adapter-report.md`

## Adapter Contract

- Prepare input type: synthetic_html_plus_synthetic_ifc_entities
- MarkItDown output slot: `brief/converted-source.md`
- IfcOpenShell output slot: `design/ifc-semantic-proof.generated.json`
- Human review required before private use: true

## Checks

- passed: `markitdown_contains_heading`
- passed: `markitdown_contains_material`
- passed: `ifcopenshell_has_project`
- passed: `ifcopenshell_has_material`
