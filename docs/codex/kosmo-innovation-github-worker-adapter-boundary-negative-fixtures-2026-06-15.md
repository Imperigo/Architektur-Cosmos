# Kosmo Innovation GitHub Worker Adapter Boundary Negative Fixtures

Generated: 2026-06-15T18:24:34.915Z
Status: `innovation_github_worker_adapter_boundary_negative_fixtures_ready`

## Summary

- Selected fixture: `worker_integration-mac999-bim-llm-code-agent-signal-fixture`
- Negative fixtures: 8
- Expected blocked: 8
- Categories: 6
- Runtime executed now: 0
- Adapter files written now: 0
- Public-ready after fixtures: 0
- Failures: 0

## Negative Fixtures

- `private_path_placeholder_input`: private_path, expected blocked, reasons private_path_detected, private_content_flag_true
- `runtime_clone_command`: runtime_command, expected blocked, reasons clone_repository, network_access, unexpected_executable_command
- `dependency_install_command`: runtime_command, expected blocked, reasons install_dependencies, unexpected_executable_command
- `copied_readme_text_claim`: readme_or_code_copy, expected blocked, reasons copy_readme_text, source_repo_reference_only_violation
- `copied_github_code_claim`: readme_or_code_copy, expected blocked, reasons copy_github_code, github_source_file_detected
- `public_ready_false_positive`: public_ready_false_positive, expected blocked, reasons promote_public_ready, rights_state_unknown
- `training_promotion_request`: training_promotion, expected blocked, reasons promote_training_row, missing_human_overseer_review_gate
- `missing_launch_apply_guard`: review_gate_missing, expected blocked, reasons write_runtime_adapter, execute_local_worker, missing_separate_launch_apply_guard

## Hard Stops

- These negative fixtures never read private Source Root, OneDrive or archive-library content.
- These negative fixtures never clone repositories, install dependencies or download models.
- These negative fixtures never run discovered code or local workers.
- These negative fixtures never copy GitHub code or README text into Git.
- These negative fixtures never write runtime adapter files.
- These negative fixtures never promote training rows or public-ready state.
