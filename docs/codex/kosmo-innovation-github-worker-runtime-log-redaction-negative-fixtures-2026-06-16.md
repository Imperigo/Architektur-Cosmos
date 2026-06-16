# Kosmo Innovation GitHub Worker Runtime Log Redaction Negative Fixtures

Generated: 2026-06-16T05:00:14.558Z
Status: `innovation_github_worker_runtime_log_redaction_negative_fixtures_ready`

## Summary

- Selected fixture: `worker_integration-mac999-bim-llm-code-agent-signal-fixture`
- Negative fixtures: 10
- Expected blocked: 10
- Leak categories: 7
- Runtime executed now: 0
- Runtime outputs written now: 0
- Public-ready after fixtures: 0
- Failures: 0

## Negative Fixtures

- `raw_private_source_path_in_log`: private_path, expected blocked, reasons raw_private_path_present, redacted_paths_count_zero
- `raw_onedrive_library_path_in_log`: private_path, expected blocked, reasons raw_onedrive_path_present, private_library_marker_true
- `secret_token_value_in_log`: secret, expected blocked, reasons raw_secret_present, redacted_secrets_count_zero
- `ssh_key_material_in_log`: secret, expected blocked, reasons raw_secret_present, ssh_private_key_marker_present
- `worker_output_body_in_log`: worker_output_body, expected blocked, reasons worker_output_body_present, metadata_only_false
- `github_code_excerpt_in_log`: github_source_text, expected blocked, reasons github_code_excerpt_present, source_repo_reference_only_false
- `readme_prose_excerpt_in_log`: github_source_text, expected blocked, reasons readme_prose_excerpt_present, copied_readme_text_now_true
- `private_prompt_context_in_log`: private_prompt_context, expected blocked, reasons private_prompt_context_present, prompt_redaction_missing
- `raw_runtime_stdout_stderr_in_log`: runtime_stdio, expected blocked, reasons raw_runtime_stdout_present, raw_runtime_stderr_present
- `public_ready_from_unreviewed_runtime_log`: public_ready_false_positive, expected blocked, reasons public_ready_true, overseer_review_required_false, rights_state_unknown

## Hard Stops

- These negative fixtures never read private Source Root, OneDrive or archive-library content.
- These negative fixtures never copy private content, secret values, worker output bodies, GitHub code or README text.
- These negative fixtures never execute runtime or rollback commands.
- These negative fixtures never start models or local workers.
- These negative fixtures never write runtime outputs or worker outputs.
- These negative fixtures never promote public-ready state.
