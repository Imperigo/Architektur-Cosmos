# Kosmo Innovation GitHub Worker Runtime Rollback Redaction Fixtures Check

Generated: 2026-06-16T17:48:07.297Z
Status: `innovation_github_worker_runtime_rollback_redaction_fixtures_guard_passed`

## Summary

- Fixtures status: innovation_github_worker_runtime_rollback_redaction_fixtures_ready
- Checks: 22/22
- Fixture groups: 3
- Failures: 0
- Public-ready after check: 0

## Checks

- passed: `status_ready` - innovation_github_worker_runtime_rollback_redaction_fixtures_ready
- passed: `policy_fixture_only` - {"fixture_plan_only":true,"synthetic_metadata_only":true,"executes_runtime_now":false,"executes_rollback_now":false,"starts_models_now":false,"reads_private_content_now":false,"writes_runtime_outputs_now":false,"writes_worker_outputs_now":false,"copies_secret_values_now":false,"copies_worker_output_body_now":false,"copies_github_code_or_readme_now":false,"public_ready_after_fixtures":0}
- passed: `policy_no_runtime_rollback` - {"fixture_plan_only":true,"synthetic_metadata_only":true,"executes_runtime_now":false,"executes_rollback_now":false,"starts_models_now":false,"reads_private_content_now":false,"writes_runtime_outputs_now":false,"writes_worker_outputs_now":false,"copies_secret_values_now":false,"copies_worker_output_body_now":false,"copies_github_code_or_readme_now":false,"public_ready_after_fixtures":0}
- passed: `policy_no_models_workers` - false
- passed: `policy_no_private_reads` - false
- passed: `policy_no_outputs` - {"fixture_plan_only":true,"synthetic_metadata_only":true,"executes_runtime_now":false,"executes_rollback_now":false,"starts_models_now":false,"reads_private_content_now":false,"writes_runtime_outputs_now":false,"writes_worker_outputs_now":false,"copies_secret_values_now":false,"copies_worker_output_body_now":false,"copies_github_code_or_readme_now":false,"public_ready_after_fixtures":0}
- passed: `policy_no_copy_sensitive` - {"fixture_plan_only":true,"synthetic_metadata_only":true,"executes_runtime_now":false,"executes_rollback_now":false,"starts_models_now":false,"reads_private_content_now":false,"writes_runtime_outputs_now":false,"writes_worker_outputs_now":false,"copies_secret_values_now":false,"copies_worker_output_body_now":false,"copies_github_code_or_readme_now":false,"public_ready_after_fixtures":0}
- passed: `public_ready_zero` - 0
- passed: `fixture_groups_present` - redacted_log_shape_fixture,rollback_manifest_shape_fixture,post_rollback_evidence_fixture
- passed: `redaction_rules_present` - private_path_redaction,secret_token_redaction,worker_output_body_redaction,github_source_text_redaction,model_prompt_redaction
- passed: `rollback_steps_present` - stop_runtime_processes,remove_generated_runtime_outputs,restore_pre_runtime_config,invalidate_unreviewed_worker_outputs,rerun_readiness_without_execution
- passed: `rollback_steps_non_executable` - rollback steps non-executable
- passed: `forbidden_fields_present` - forbidden fields per group
- passed: `required_before_runtime_unblock` - redacted_log_shape_fixture_check_passed rollback_manifest_shape_fixture_check_passed post_rollback_evidence_fixture_check_passed runtime_batch_readiness_plan_still_guard_passed negative_fixtures_still_guard_passed separate_runtime_apply_guard_passed
- passed: `runtime_zero` - {"selected_fixture_id":"worker_integration-mac999-bim-llm-code-agent-signal-fixture","fixture_groups":3,"redaction_rules":5,"rollback_steps":5,"forbidden_fields_total":11,"runtime_executed_now":0,"rollback_executed_now":0,"runtime_outputs_written_now":0,"worker_outputs_written_now":0,"public_ready_after_fixtures":0,"failures":0}
- passed: `outputs_zero` - {"selected_fixture_id":"worker_integration-mac999-bim-llm-code-agent-signal-fixture","fixture_groups":3,"redaction_rules":5,"rollback_steps":5,"forbidden_fields_total":11,"runtime_executed_now":0,"rollback_executed_now":0,"runtime_outputs_written_now":0,"worker_outputs_written_now":0,"public_ready_after_fixtures":0,"failures":0}
- passed: `hard_stop_no_runtime` - these fixtures never execute runtime or rollback commands. these fixtures never start models or local workers. these fixtures never read private source root, onedrive or archive-library content. these fixtures never write runtime outputs or worker outputs. these fixtures never copy secret values, worker output bodies, github code or readme text. these fixtures never promote public-ready state.
- passed: `hard_stop_no_models_workers` - these fixtures never execute runtime or rollback commands. these fixtures never start models or local workers. these fixtures never read private source root, onedrive or archive-library content. these fixtures never write runtime outputs or worker outputs. these fixtures never copy secret values, worker output bodies, github code or readme text. these fixtures never promote public-ready state.
- passed: `hard_stop_no_private` - these fixtures never execute runtime or rollback commands. these fixtures never start models or local workers. these fixtures never read private source root, onedrive or archive-library content. these fixtures never write runtime outputs or worker outputs. these fixtures never copy secret values, worker output bodies, github code or readme text. these fixtures never promote public-ready state.
- passed: `hard_stop_no_outputs` - these fixtures never execute runtime or rollback commands. these fixtures never start models or local workers. these fixtures never read private source root, onedrive or archive-library content. these fixtures never write runtime outputs or worker outputs. these fixtures never copy secret values, worker output bodies, github code or readme text. these fixtures never promote public-ready state.
- passed: `hard_stop_no_sensitive_copy` - these fixtures never execute runtime or rollback commands. these fixtures never start models or local workers. these fixtures never read private source root, onedrive or archive-library content. these fixtures never write runtime outputs or worker outputs. these fixtures never copy secret values, worker output bodies, github code or readme text. these fixtures never promote public-ready state.
- passed: `hard_stop_no_public` - these fixtures never execute runtime or rollback commands. these fixtures never start models or local workers. these fixtures never read private source root, onedrive or archive-library content. these fixtures never write runtime outputs or worker outputs. these fixtures never copy secret values, worker output bodies, github code or readme text. these fixtures never promote public-ready state.
