# Kosmo Innovation GitHub Fixture Payload Smoke Check

Generated: 2026-06-15T15:14:00.619Z
Status: `innovation_github_fixture_payload_smoke_guard_passed`

## Summary

- Smoke status: innovation_github_fixture_payload_smoke_passed
- Payloads: 10
- Lanes: 3
- Content types: 6
- Failures: 0
- Public-ready after check: 0

## Findings

- passed: `schema_version` - Smoke schema_version must be 0.1.
- passed: `smoke_passed` - Payload smoke must pass.
- passed: `fixture_payloads_only` - Smoke must read fixture payloads only.
- passed: `synthetic_only` - Smoke must be synthetic-fixture-only.
- passed: `no_code_copy` - Smoke must not copy GitHub code.
- passed: `no_readme_copy` - Smoke must not copy README text.
- passed: `no_clone` - Smoke must not clone repositories.
- passed: `no_installs` - Smoke must not install tools.
- passed: `no_download` - Smoke must not download models.
- passed: `no_discovered_code_run` - Smoke must not run discovered code.
- passed: `no_private_reads` - Smoke must not read private content.
- passed: `public_ready_zero` - Smoke must keep public-ready at 0.
- passed: `payload_count` - Smoke must cover at least 10 payloads.
- passed: `lanes_complete` - Smoke must cover all required lanes.
- passed: `content_types_complete` - Smoke must cover all required content types.
- passed: `smoke_failures_zero` - Smoke failures must be 0.
