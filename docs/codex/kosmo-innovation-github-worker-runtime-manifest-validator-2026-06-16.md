# Kosmo Innovation GitHub Worker Runtime Manifest Validator

Generated: 2026-06-16T05:22:34.182Z
Status: `innovation_github_worker_runtime_manifest_validator_passed`

## Summary

- Rules: 10
- Validated manifests: 12
- Manifest draft validated: 1
- Negative fixtures validated: 10
- Positive controls validated: 1
- Blocked manifests: 11
- Review-only valid manifests: 1
- Runtime executed now: 0
- Public-ready after validation: 0
- Failures: 0

## Validations

| Manifest | Kind | Status | Reasons |
| --- | --- | --- | --- |
| `github-worker-runtime-batch-draft-2026-06-16` | manifest_draft | blocked | require_runtime_apply_guard, require_overseer_review_gate |
| `manifest_marks_executable_now` | negative_fixture | blocked | block_executable_manifest, require_runtime_apply_guard, require_rollback_redaction_refs, require_overseer_review_gate |
| `manifest_skips_runtime_apply_guard` | negative_fixture | blocked | require_runtime_apply_guard, require_rollback_redaction_refs, require_overseer_review_gate |
| `manifest_missing_rollback_redaction_refs` | negative_fixture | blocked | require_runtime_apply_guard, require_rollback_redaction_refs, require_overseer_review_gate |
| `manifest_writes_raw_runtime_outputs` | negative_fixture | blocked | require_runtime_apply_guard, require_rollback_redaction_refs, block_raw_runtime_outputs, require_overseer_review_gate |
| `manifest_embeds_worker_output_body` | negative_fixture | blocked | require_runtime_apply_guard, require_rollback_redaction_refs, block_worker_output_body, require_overseer_review_gate |
| `manifest_contains_private_source_path` | negative_fixture | blocked | require_runtime_apply_guard, require_rollback_redaction_refs, block_private_paths, require_overseer_review_gate |
| `manifest_contains_secret_field` | negative_fixture | blocked | require_runtime_apply_guard, require_rollback_redaction_refs, block_secret_fields, require_overseer_review_gate |
| `manifest_starts_models_or_installs_dependencies` | negative_fixture | blocked | require_runtime_apply_guard, require_rollback_redaction_refs, block_runtime_side_effects, require_overseer_review_gate |
| `manifest_skips_overseer_review_gate` | negative_fixture | blocked | require_runtime_apply_guard, require_rollback_redaction_refs, require_overseer_review_gate |
| `manifest_promotes_public_ready` | negative_fixture | blocked | require_runtime_apply_guard, require_rollback_redaction_refs, require_overseer_review_gate, block_public_ready_promotion |
| `synthetic_review_only_safe_manifest` | positive_control | review_only_valid | - |

## Hard Stops

- Validator reads JSON metadata reports only.
- Validator never reads private Source Root, OneDrive or archive-library files.
- Validator never copies private content, secret values or worker output bodies.
- Validator never executes runtime commands, rollback commands, model starts, installs or downloads.
- Validator never writes runtime manifests, runtime outputs or worker outputs.
- Validator never promotes public-ready state.
