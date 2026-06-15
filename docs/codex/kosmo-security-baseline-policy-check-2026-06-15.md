# Kosmo Security Baseline Policy Check

Generated: 2026-06-15T13:05:38.937Z
Status: `security_baseline_policy_guard_passed`

## Summary

- Policy status: security_baseline_policy_ready
- Categories: 5
- Rules: 6
- Failures: 0
- Public-ready after check: 0

## Findings

- passed: `schema_version` - Policy schema_version must be 0.1.
- passed: `policy_ready` - Policy must be ready.
- passed: `policy_only` - Policy must be policy-only.
- passed: `no_security_check_patch` - Policy must not patch security check now.
- passed: `no_suppression_now` - Policy must not suppress findings now.
- passed: `secrets_never_allowed` - Policy must keep secrets never allowed.
- passed: `public_ready_zero` - Policy must keep public-ready at 0.
- passed: `category:must_redact` - Policy must include category must_redact.
- passed: `category:private_repo_allowed` - Policy must include category private_repo_allowed.
- passed: `category:generated_review_allowed` - Policy must include category generated_review_allowed.
- passed: `category:script_context_allowed` - Policy must include category script_context_allowed.
- passed: `category:secret_never_allowed` - Policy must include category secret_never_allowed.
- passed: `rules_present` - Policy must include initial baseline rules.
- passed: `rule_category:source_root_artifacts` - source_root_artifacts must use a known category.
- passed: `rule_personal_only:source_root_artifacts` - source_root_artifacts must be scoped to personal identifiers.
- passed: `rule_no_secret:source_root_artifacts` - source_root_artifacts must not suppress secrets.
- passed: `rule_no_suppress_now:source_root_artifacts` - source_root_artifacts must not suppress now.
- passed: `rule_owner_review:source_root_artifacts` - source_root_artifacts must require owner review before public export.
- passed: `rule_category:onedrive_sync_artifacts` - onedrive_sync_artifacts must use a known category.
- passed: `rule_personal_only:onedrive_sync_artifacts` - onedrive_sync_artifacts must be scoped to personal identifiers.
- passed: `rule_no_secret:onedrive_sync_artifacts` - onedrive_sync_artifacts must not suppress secrets.
- passed: `rule_no_suppress_now:onedrive_sync_artifacts` - onedrive_sync_artifacts must not suppress now.
- passed: `rule_owner_review:onedrive_sync_artifacts` - onedrive_sync_artifacts must require owner review before public export.
- passed: `rule_category:owner_review_artifacts` - owner_review_artifacts must use a known category.
- passed: `rule_personal_only:owner_review_artifacts` - owner_review_artifacts must be scoped to personal identifiers.
- passed: `rule_no_secret:owner_review_artifacts` - owner_review_artifacts must not suppress secrets.
- passed: `rule_no_suppress_now:owner_review_artifacts` - owner_review_artifacts must not suppress now.
- passed: `rule_owner_review:owner_review_artifacts` - owner_review_artifacts must require owner review before public export.
- passed: `rule_category:private_library_diagnostics` - private_library_diagnostics must use a known category.
- passed: `rule_personal_only:private_library_diagnostics` - private_library_diagnostics must be scoped to personal identifiers.
- passed: `rule_no_secret:private_library_diagnostics` - private_library_diagnostics must not suppress secrets.
- passed: `rule_no_suppress_now:private_library_diagnostics` - private_library_diagnostics must not suppress now.
- passed: `rule_owner_review:private_library_diagnostics` - private_library_diagnostics must require owner review before public export.
- passed: `rule_category:generated_orbit_reviews` - generated_orbit_reviews must use a known category.
- passed: `rule_personal_only:generated_orbit_reviews` - generated_orbit_reviews must be scoped to personal identifiers.
- passed: `rule_no_secret:generated_orbit_reviews` - generated_orbit_reviews must not suppress secrets.
- passed: `rule_no_suppress_now:generated_orbit_reviews` - generated_orbit_reviews must not suppress now.
- passed: `rule_owner_review:generated_orbit_reviews` - generated_orbit_reviews must require owner review before public export.
- passed: `rule_category:local_context_scripts` - local_context_scripts must use a known category.
- passed: `rule_personal_only:local_context_scripts` - local_context_scripts must be scoped to personal identifiers.
- passed: `rule_no_secret:local_context_scripts` - local_context_scripts must not suppress secrets.
- passed: `rule_no_suppress_now:local_context_scripts` - local_context_scripts must not suppress now.
- passed: `rule_owner_review:local_context_scripts` - local_context_scripts must require owner review before public export.
