# KosmoPrepare Phase 1 Source Package Contract

Generated: 2026-07-02T06:03:22.589Z
Package: `examples/kosmo-references/source-packages/kosmo-prepare-phase1-adapter-fixture-2026-07-02/source-package.json`
Status: `adapter_contract_ready`

## Policy

- Rights scope: synthetic_fixture
- Source files public: false
- Extracted text public: false
- Derived summary public: false
- Public-ready after contract: 0

## Files

- source `kosmo-prepare-synthetic-html`: `examples/kosmo-prepare/phase1-adapter-fixture/source.synthetic.html`
- artifact `kosmo-prepare-markitdown-md`: `examples/kosmo-prepare/phase1-adapter-fixture/converted.markitdown.md`
- artifact `kosmo-prepare-ifc-entity-manifest`: `examples/kosmo-prepare/phase1-adapter-fixture/ifcopenshell-entity-manifest.json`
- artifact `kosmo-prepare-adapter-report-json`: `examples/kosmo-prepare/phase1-adapter-fixture/prepare-phase1-adapter-report.json`
- artifact `kosmo-prepare-adapter-report-md`: `examples/kosmo-prepare/phase1-adapter-fixture/prepare-phase1-adapter-report.md`

## Review Gates

- pass: `source_integrity` - All source and artifact files have SHA-256 and byte counts recorded.
- pass: `rights` - Synthetic fixture only; still review-only by policy.
- pass: `text_quality` - Converted Markdown contains the intended fixture heading and material/system lines.
- not_applicable: `layout_quality` - HTML fixture has no scanned pages or plan layout blocks.
- pass: `entry_mapping` - Maps to a synthetic KosmoPrepare adapter fixture, not to a public architecture entry.
- review_only: `asset_mapping` - Ifc/material semantics may seed KosmoAsset fixture contracts, but no asset is public-ready.
- pass: `public_private_split` - No private content is read or copied; public-ready remains 0.
