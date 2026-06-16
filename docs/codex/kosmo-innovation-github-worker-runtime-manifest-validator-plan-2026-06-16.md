# Kosmo Innovation GitHub Worker Runtime Manifest Validator Plan

Generated: 2026-06-16T17:49:45.673Z
Status: `innovation_github_worker_runtime_manifest_validator_plan_needs_review`

## Summary

- Runtime batch ID: `github-worker-runtime-batch-draft-2026-06-16`
- Rules: 10
- Fixture categories: 8
- Negative fixtures: 10
- Expected blocked: 10
- Executable now: 0
- Validator code written now: 0
- Public-ready after plan: 0
- Failures: 2

## Rules

| Rule | Categories | Action | Fields |
| --- | --- | --- | --- |
| `block_executable_manifest` | execution_state | block | executable_now, runtime_executable_now, writes_runtime_manifest_now |
| `require_runtime_apply_guard` | missing_guard | block_if_missing | runtime_apply_guard_gate, exact_owner_reply_gate |
| `require_rollback_redaction_refs` | missing_guard | block_if_empty | rollback_refs, redaction_refs, negative_log_fixture_refs |
| `block_raw_runtime_outputs` | raw_runtime_output | block | raw_runtime_stdout, raw_runtime_stderr, redaction_required=false |
| `block_worker_output_body` | worker_output_body | block | worker_output_body, metadata_only=false |
| `block_private_paths` | private_path | block | PRIVATE_SOURCE_ROOT, ONEDRIVE_PRIVATE_LIBRARY |
| `block_secret_fields` | secret | block | OPENAI_API_KEY, SSH_PRIVATE_KEY, raw_secret |
| `block_runtime_side_effects` | runtime_side_effect | block | install_dependencies, download_models, start_model_runtime |
| `require_overseer_review_gate` | missing_guard | block_if_missing | overseer_review_gate |
| `block_public_ready_promotion` | public_ready_false_positive | block | public_ready=true, public_ready_after_manifest>0, rights_state=unknown |

## Hard Stops

- This plan never writes validator code.
- This plan never executes runtime commands.
- This plan never starts models or installs dependencies.
- This plan never reads private Source Root, OneDrive or archive-library content.
- This plan never writes runtime manifests or runtime outputs.
- This plan never promotes public-ready state.

## Failures

- Manifest draft not ready: innovation_github_worker_runtime_batch_manifest_draft_needs_review
- Manifest negative fixtures not ready: innovation_github_worker_runtime_manifest_negative_fixtures_needs_review
