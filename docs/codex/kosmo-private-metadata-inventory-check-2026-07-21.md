# Kosmo Private Metadata Inventory Check

Generated: 2026-07-21T15:53:03.337Z
Status: `private_metadata_inventory_guard_passed`

## Summary

- Runner: private_metadata_inventory_blocked_until_activation
- Fixture: private_metadata_inventory_fixture_passed
- Runner files scanned: 0
- Fixture files scanned: 6
- Fixture candidate matches: 6
- Pilots: 3
- Failures: 0
- Warnings: 0
- Forbidden field hits: 0
- Public-ready hits: 0
- Public-ready after check: 0

## Findings

- passed: `runner_report_present` - Runner report must exist.
- passed: `fixture_report_present` - Fixture smoke report must exist.
- passed: `runner_schema_version` - runner schema_version must be 0.1.
- passed: `runner_metadata_only` - runner must be metadata-only.
- passed: `runner_no_content_reads` - runner must declare no file-content reads.
- passed: `runner_no_private_copy` - runner must not copy private content.
- passed: `runner_no_public_writes` - runner must not write public files.
- passed: `runner_public_ready_zero` - runner public-ready after run must be 0.
- passed: `runner_pilots_array` - runner pilots must be an array.
- passed: `runner_pilot_count` - runner must contain all expected pilots.
- passed: `runner_pilot_expected:villa-savoye` - runner pilot must be expected: villa-savoye.
- passed: `runner_pilot_rights:villa-savoye` - runner pilot villa-savoye must stay review_only.
- passed: `runner_pilot_public_ready:villa-savoye` - runner pilot villa-savoye must keep public_ready=false.
- passed: `runner_fingerprints_array:villa-savoye` - runner pilot villa-savoye fingerprints must be an array.
- passed: `runner_pilot_expected:kapelle-sogn-benedetg` - runner pilot must be expected: kapelle-sogn-benedetg.
- passed: `runner_pilot_rights:kapelle-sogn-benedetg` - runner pilot kapelle-sogn-benedetg must stay review_only.
- passed: `runner_pilot_public_ready:kapelle-sogn-benedetg` - runner pilot kapelle-sogn-benedetg must keep public_ready=false.
- passed: `runner_fingerprints_array:kapelle-sogn-benedetg` - runner pilot kapelle-sogn-benedetg fingerprints must be an array.
- passed: `runner_pilot_expected:alterszentrum-kloster-ingenbohl` - runner pilot must be expected: alterszentrum-kloster-ingenbohl.
- passed: `runner_pilot_rights:alterszentrum-kloster-ingenbohl` - runner pilot alterszentrum-kloster-ingenbohl must stay review_only.
- passed: `runner_pilot_public_ready:alterszentrum-kloster-ingenbohl` - runner pilot alterszentrum-kloster-ingenbohl must keep public_ready=false.
- passed: `runner_fingerprints_array:alterszentrum-kloster-ingenbohl` - runner pilot alterszentrum-kloster-ingenbohl fingerprints must be an array.
- passed: `runner_status_guarded` - Runner status must be blocked or private-output-written.
- passed: `runner_blocked_no_scan` - Blocked runner must not scan a root.
- passed: `runner_blocked_zero_files` - Blocked runner must scan zero files.
- passed: `runner_blocked_no_private_write` - Blocked runner must not write private inventory.
- passed: `runner_blocked_reason_present` - Blocked runner must include blocked_reason.
- passed: `fixture_schema_version` - fixture schema_version must be 0.1.
- passed: `fixture_metadata_only` - fixture must be metadata-only.
- passed: `fixture_no_content_reads` - fixture must declare no file-content reads.
- passed: `fixture_no_private_copy` - fixture must not copy private content.
- passed: `fixture_no_public_writes` - fixture must not write public files.
- passed: `fixture_public_ready_zero` - fixture public-ready after run must be 0.
- passed: `fixture_pilots_array` - fixture pilots must be an array.
- passed: `fixture_pilot_count` - fixture must contain all expected pilots.
- passed: `fixture_pilot_expected:villa-savoye` - fixture pilot must be expected: villa-savoye.
- passed: `fixture_pilot_rights:villa-savoye` - fixture pilot villa-savoye must stay review_only.
- passed: `fixture_pilot_public_ready:villa-savoye` - fixture pilot villa-savoye must keep public_ready=false.
- passed: `fixture_fingerprints_array:villa-savoye` - fixture pilot villa-savoye fingerprints must be an array.
- passed: `fixture_fingerprint_hash:villa-savoye` - fixture fingerprint must include path_hash.
- passed: `fixture_fingerprint_no_path:villa-savoye` - fixture fingerprint must not include raw path.
- passed: `fixture_fingerprint_no_content:villa-savoye` - fixture fingerprint must not include content.
- passed: `fixture_fingerprint_hash:villa-savoye` - fixture fingerprint must include path_hash.
- passed: `fixture_fingerprint_no_path:villa-savoye` - fixture fingerprint must not include raw path.
- passed: `fixture_fingerprint_no_content:villa-savoye` - fixture fingerprint must not include content.
- passed: `fixture_pilot_expected:kapelle-sogn-benedetg` - fixture pilot must be expected: kapelle-sogn-benedetg.
- passed: `fixture_pilot_rights:kapelle-sogn-benedetg` - fixture pilot kapelle-sogn-benedetg must stay review_only.
- passed: `fixture_pilot_public_ready:kapelle-sogn-benedetg` - fixture pilot kapelle-sogn-benedetg must keep public_ready=false.
- passed: `fixture_fingerprints_array:kapelle-sogn-benedetg` - fixture pilot kapelle-sogn-benedetg fingerprints must be an array.
- passed: `fixture_fingerprint_hash:kapelle-sogn-benedetg` - fixture fingerprint must include path_hash.
- passed: `fixture_fingerprint_no_path:kapelle-sogn-benedetg` - fixture fingerprint must not include raw path.
- passed: `fixture_fingerprint_no_content:kapelle-sogn-benedetg` - fixture fingerprint must not include content.
- passed: `fixture_fingerprint_hash:kapelle-sogn-benedetg` - fixture fingerprint must include path_hash.
- passed: `fixture_fingerprint_no_path:kapelle-sogn-benedetg` - fixture fingerprint must not include raw path.
- passed: `fixture_fingerprint_no_content:kapelle-sogn-benedetg` - fixture fingerprint must not include content.
- passed: `fixture_pilot_expected:alterszentrum-kloster-ingenbohl` - fixture pilot must be expected: alterszentrum-kloster-ingenbohl.
- passed: `fixture_pilot_rights:alterszentrum-kloster-ingenbohl` - fixture pilot alterszentrum-kloster-ingenbohl must stay review_only.
- passed: `fixture_pilot_public_ready:alterszentrum-kloster-ingenbohl` - fixture pilot alterszentrum-kloster-ingenbohl must keep public_ready=false.
- passed: `fixture_fingerprints_array:alterszentrum-kloster-ingenbohl` - fixture pilot alterszentrum-kloster-ingenbohl fingerprints must be an array.
- passed: `fixture_fingerprint_hash:alterszentrum-kloster-ingenbohl` - fixture fingerprint must include path_hash.
- passed: `fixture_fingerprint_no_path:alterszentrum-kloster-ingenbohl` - fixture fingerprint must not include raw path.
- passed: `fixture_fingerprint_no_content:alterszentrum-kloster-ingenbohl` - fixture fingerprint must not include content.
- passed: `fixture_fingerprint_hash:alterszentrum-kloster-ingenbohl` - fixture fingerprint must include path_hash.
- passed: `fixture_fingerprint_no_path:alterszentrum-kloster-ingenbohl` - fixture fingerprint must not include raw path.
- passed: `fixture_fingerprint_no_content:alterszentrum-kloster-ingenbohl` - fixture fingerprint must not include content.
- passed: `fixture_status_passed` - Fixture smoke must pass.
- passed: `fixture_public_safe_mode` - Fixture smoke must be public-safe mode.
- passed: `fixture_root_scanned` - Fixture smoke must exercise scan path.
- passed: `fixture_files_scanned` - Fixture smoke must scan at least six files.
- passed: `fixture_candidate_matches` - Fixture smoke must produce at least six candidate matches.
- passed: `fixture_no_private_write` - Fixture smoke must not write private inventory output.
- passed: `fixture_pilot_candidates:villa-savoye` - Fixture pilot villa-savoye must have at least two candidates.
- passed: `fixture_pilot_candidates:kapelle-sogn-benedetg` - Fixture pilot kapelle-sogn-benedetg must have at least two candidates.
- passed: `fixture_pilot_candidates:alterszentrum-kloster-ingenbohl` - Fixture pilot alterszentrum-kloster-ingenbohl must have at least two candidates.

## Next Actions

- Keep private metadata inventory blocked until source-root activation passes.
- Use fixture smoke as the public-safe regression test for scan-path changes.
- After a real private metadata run, verify the private output with kosmo:private-inventory-output-check before handoff.
