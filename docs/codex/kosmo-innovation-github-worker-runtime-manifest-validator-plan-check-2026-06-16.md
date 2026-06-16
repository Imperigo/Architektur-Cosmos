# Kosmo Innovation GitHub Worker Runtime Manifest Validator Plan Check

Generated: 2026-06-16T17:50:07.908Z
Status: `innovation_github_worker_runtime_manifest_validator_plan_guard_passed`

## Summary

- Plan status: innovation_github_worker_runtime_manifest_validator_plan_needs_review
- Checks: 20/20
- Rules: 10
- Failures: 0
- Public-ready after check: 0

## Checks

- passed: `status_ready` - innovation_github_worker_runtime_manifest_validator_plan_needs_review
- passed: `policy_plan_only` - true
- passed: `policy_no_code_execution` - {"validator_plan_only":true,"writes_validator_code_now":false,"executes_validator_now":false,"executes_runtime_now":false,"starts_models_now":false,"installs_dependencies_now":false,"reads_private_content_now":false,"writes_runtime_manifest_now":false,"writes_runtime_outputs_now":false,"public_ready_after_plan":0}
- passed: `policy_no_models_installs_private` - {"validator_plan_only":true,"writes_validator_code_now":false,"executes_validator_now":false,"executes_runtime_now":false,"starts_models_now":false,"installs_dependencies_now":false,"reads_private_content_now":false,"writes_runtime_manifest_now":false,"writes_runtime_outputs_now":false,"public_ready_after_plan":0}
- passed: `policy_no_manifest_outputs` - {"validator_plan_only":true,"writes_validator_code_now":false,"executes_validator_now":false,"executes_runtime_now":false,"starts_models_now":false,"installs_dependencies_now":false,"reads_private_content_now":false,"writes_runtime_manifest_now":false,"writes_runtime_outputs_now":false,"public_ready_after_plan":0}
- passed: `policy_public_ready_zero` - 0
- passed: `rule_count` - 10
- passed: `all_categories_covered` - execution_state,missing_guard,raw_runtime_output,worker_output_body,private_path,secret,runtime_side_effect,public_ready_false_positive
- passed: `required_rules_present` - block_executable_manifest,require_runtime_apply_guard,require_rollback_redaction_refs,block_raw_runtime_outputs,block_worker_output_body,block_private_paths,block_secret_fields,block_runtime_side_effects,require_overseer_review_gate,block_public_ready_promotion
- passed: `all_rules_required_before_runtime` - all required before runtime
- passed: `all_rules_not_executable` - all not executable
- passed: `all_rules_public_ready_zero` - all public-ready zero
- passed: `implementation_requirements_present` - 5
- passed: `summary_zeroes` - {"runtime_batch_id":"github-worker-runtime-batch-draft-2026-06-16","rules":10,"fixture_categories":8,"negative_fixtures":10,"expected_blocked":10,"executable_now":0,"validator_code_written_now":0,"runtime_executed_now":0,"public_ready_after_plan":0,"failures":2}
- passed: `source_refs_cover_inputs` - data/kosmo-innovation-github-worker-runtime-batch-manifest-draft-2026-06-16.json,data/kosmo-innovation-github-worker-runtime-batch-manifest-draft-check-2026-06-16.json,data/kosmo-innovation-github-worker-runtime-manifest-negative-fixtures-2026-06-16.json,data/kosmo-innovation-github-worker-runtime-manifest-negative-fixtures-check-2026-06-16.json
- passed: `hard_stop_no_code` - this plan never writes validator code. this plan never executes runtime commands. this plan never starts models or installs dependencies. this plan never reads private source root, onedrive or archive-library content. this plan never writes runtime manifests or runtime outputs. this plan never promotes public-ready state.
- passed: `hard_stop_no_runtime` - this plan never writes validator code. this plan never executes runtime commands. this plan never starts models or installs dependencies. this plan never reads private source root, onedrive or archive-library content. this plan never writes runtime manifests or runtime outputs. this plan never promotes public-ready state.
- passed: `hard_stop_no_private` - this plan never writes validator code. this plan never executes runtime commands. this plan never starts models or installs dependencies. this plan never reads private source root, onedrive or archive-library content. this plan never writes runtime manifests or runtime outputs. this plan never promotes public-ready state.
- passed: `hard_stop_no_outputs` - this plan never writes validator code. this plan never executes runtime commands. this plan never starts models or installs dependencies. this plan never reads private source root, onedrive or archive-library content. this plan never writes runtime manifests or runtime outputs. this plan never promotes public-ready state.
- passed: `hard_stop_no_public` - this plan never writes validator code. this plan never executes runtime commands. this plan never starts models or installs dependencies. this plan never reads private source root, onedrive or archive-library content. this plan never writes runtime manifests or runtime outputs. this plan never promotes public-ready state.
