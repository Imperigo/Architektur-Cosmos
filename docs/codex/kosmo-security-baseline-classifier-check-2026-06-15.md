# Kosmo Security Baseline Classifier Check

Generated: 2026-06-15T13:08:13.526Z
Status: `security_baseline_classifier_guard_passed`

## Summary

- Classifier status: security_baseline_classifier_ready
- Personal identifier findings: 202
- Secret findings: 0
- Failures: 0
- Public-ready after check: 0

## Findings

- passed: `schema_version` - Classifier schema_version must be 0.1.
- passed: `classifier_ready` - Classifier must be ready.
- passed: `classifier_only` - Classifier must be classifier-only.
- passed: `no_suppression_now` - Classifier must not suppress findings.
- passed: `no_security_check_patch` - Classifier must not modify security check.
- passed: `secrets_never_allowed` - Classifier must keep secrets never allowed.
- passed: `redacted_output` - Classifier output must avoid identifier values.
- passed: `public_ready_zero` - Classifier must keep public-ready at 0.
- passed: `personal_count_present` - Classifier must count personal findings.
- passed: `secret_count_present` - Classifier must count secret findings.
- passed: `top_files_present` - Classifier must include top files by count.
