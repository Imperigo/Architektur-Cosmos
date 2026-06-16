# Kosmo Innovation GitHub Worker Runtime Manifest Negative Fixtures

Generated: 2026-06-16T17:49:21.597Z
Status: `innovation_github_worker_runtime_manifest_negative_fixtures_needs_review`

## Summary

- Runtime batch ID: `github-worker-runtime-batch-draft-2026-06-16`
- Negative fixtures: 10
- Expected blocked: 10
- Categories: 8
- Executable now: 0
- Runtime manifests written now: 0
- Runtime outputs written now: 0
- Worker outputs written now: 0
- Public-ready after fixtures: 0
- Failures: 3

## Fixtures

| Fixture | Category | Expected | Reasons |
| --- | --- | --- | --- |
| `manifest_marks_executable_now` | execution_state | blocked | executable_now_true, runtime_executable_now_true, writes_runtime_manifest_now_true |
| `manifest_skips_runtime_apply_guard` | missing_guard | blocked | runtime_apply_guard_gate_missing |
| `manifest_missing_rollback_redaction_refs` | missing_guard | blocked | rollback_refs_missing, redaction_refs_missing, negative_log_fixture_refs_missing |
| `manifest_writes_raw_runtime_outputs` | raw_runtime_output | blocked | raw_runtime_stdout_requested, raw_runtime_stderr_requested, redaction_required_false |
| `manifest_embeds_worker_output_body` | worker_output_body | blocked | worker_output_body_requested, metadata_only_false |
| `manifest_contains_private_source_path` | private_path | blocked | private_source_path_present, onedrive_private_path_present |
| `manifest_contains_secret_field` | secret | blocked | secret_field_present, ssh_key_field_present, redacted_secrets_count_zero |
| `manifest_starts_models_or_installs_dependencies` | runtime_side_effect | blocked | install_dependencies_phase_executable, download_models_phase_executable, start_model_runtime_phase_executable |
| `manifest_skips_overseer_review_gate` | missing_guard | blocked | overseer_review_gate_missing, public_ready_gate_passed |
| `manifest_promotes_public_ready` | public_ready_false_positive | blocked | public_ready_true, public_ready_after_manifest_nonzero, rights_state_unknown |

## Hard Stops

- These manifest negative fixtures never execute runtime commands.
- These manifest negative fixtures never execute rollback commands.
- These manifest negative fixtures never start models, install dependencies or download models.
- These manifest negative fixtures never read private Source Root, OneDrive or archive-library content.
- These manifest negative fixtures never copy private content, secret values or worker output bodies.
- These manifest negative fixtures never write runtime manifests, runtime outputs or worker outputs.
- These manifest negative fixtures never promote public-ready state.
