# Kosmo Innovation GitHub Worker Runtime Apply Guard Check

Generated: 2026-06-16T17:48:34.799Z
Status: `innovation_github_worker_runtime_apply_guard_guard_passed`

## Summary

- Checks: 31/31
- Failures: 0
- Guard status: innovation_github_worker_runtime_apply_guard_not_ready
- Exact reply valid: no
- Separate runtime allowed after guard: no
- Execute now: 0
- Public-ready after check: 0

## Checks

- passed: `status_guarded` - innovation_github_worker_runtime_apply_guard_not_ready
- passed: `policy_guard_only` - true
- passed: `policy_no_decision_now` - false
- passed: `policy_no_runtime_now` - false
- passed: `policy_no_rollback_now` - false
- passed: `policy_no_local_workers_now` - false
- passed: `policy_no_model_start` - false
- passed: `policy_no_dependency_install` - false
- passed: `policy_no_private_reads` - false
- passed: `policy_no_outputs` - {"guard_only":true,"records_owner_decision_now":false,"executes_runtime_now":false,"executes_rollback_now":false,"executes_local_workers_now":false,"starts_models_now":false,"installs_dependencies_now":false,"reads_private_content_now":false,"writes_runtime_outputs_now":false,"writes_worker_outputs_now":false,"copies_secret_values_now":false,"promotes_training_rows_now":false,"public_ready_after_guard":0}
- passed: `policy_no_secret_copy` - false
- passed: `policy_no_training_promotion` - false
- passed: `public_ready_zero` - 0
- passed: `execute_zero` - 0
- passed: `runtime_not_executable_now` - false
- passed: `starts_models_false` - false
- passed: `no_private_reads_summary` - false
- passed: `no_runtime_outputs_summary` - false
- passed: `exact_reply_required_choice` - github_worker_runtime_choice=approve_separate_source_free_runtime_batch_later confirmed_source_free_only=yes confirmed_no_private_content=yes confirmed_no_model_or_worker_start_from_guard=yes confirmed_rerun_redaction_and_rollback_checks=yes confirmed_runtime_outputs_review_only=yes note=Nur ein separater GitHub-Worker-Runtime-Batch darf nach erneut gruenen Guards vorbereitet werden.
- passed: `exact_reply_source_free` - github_worker_runtime_choice=approve_separate_source_free_runtime_batch_later confirmed_source_free_only=yes confirmed_no_private_content=yes confirmed_no_model_or_worker_start_from_guard=yes confirmed_rerun_redaction_and_rollback_checks=yes confirmed_runtime_outputs_review_only=yes note=Nur ein separater GitHub-Worker-Runtime-Batch darf nach erneut gruenen Guards vorbereitet werden.
- passed: `exact_reply_no_private` - github_worker_runtime_choice=approve_separate_source_free_runtime_batch_later confirmed_source_free_only=yes confirmed_no_private_content=yes confirmed_no_model_or_worker_start_from_guard=yes confirmed_rerun_redaction_and_rollback_checks=yes confirmed_runtime_outputs_review_only=yes note=Nur ein separater GitHub-Worker-Runtime-Batch darf nach erneut gruenen Guards vorbereitet werden.
- passed: `exact_reply_no_start_from_guard` - github_worker_runtime_choice=approve_separate_source_free_runtime_batch_later confirmed_source_free_only=yes confirmed_no_private_content=yes confirmed_no_model_or_worker_start_from_guard=yes confirmed_rerun_redaction_and_rollback_checks=yes confirmed_runtime_outputs_review_only=yes note=Nur ein separater GitHub-Worker-Runtime-Batch darf nach erneut gruenen Guards vorbereitet werden.
- passed: `exact_reply_redaction_rerun` - github_worker_runtime_choice=approve_separate_source_free_runtime_batch_later confirmed_source_free_only=yes confirmed_no_private_content=yes confirmed_no_model_or_worker_start_from_guard=yes confirmed_rerun_redaction_and_rollback_checks=yes confirmed_runtime_outputs_review_only=yes note=Nur ein separater GitHub-Worker-Runtime-Batch darf nach erneut gruenen Guards vorbereitet werden.
- passed: `exact_reply_review_only_outputs` - github_worker_runtime_choice=approve_separate_source_free_runtime_batch_later confirmed_source_free_only=yes confirmed_no_private_content=yes confirmed_no_model_or_worker_start_from_guard=yes confirmed_rerun_redaction_and_rollback_checks=yes confirmed_runtime_outputs_review_only=yes note=Nur ein separater GitHub-Worker-Runtime-Batch darf nach erneut gruenen Guards vorbereitet werden.
- passed: `separate_runtime_flag_consistent` - false/false
- passed: `valid_reply_has_ready_status` - innovation_github_worker_runtime_apply_guard_not_ready
- passed: `invalid_or_waiting_no_runtime` - false
- passed: `hard_stop_no_runtime` - this guard never executes runtime commands. this guard never executes rollback commands. this guard never starts models or local workers. this guard never installs dependencies. this guard never reads private source root, onedrive or archive-library content. this guard never writes runtime outputs or worker outputs. this guard never copies secret values. a broad approval is not enough; exact key=value fields are required.
- passed: `hard_stop_no_models_workers` - this guard never executes runtime commands. this guard never executes rollback commands. this guard never starts models or local workers. this guard never installs dependencies. this guard never reads private source root, onedrive or archive-library content. this guard never writes runtime outputs or worker outputs. this guard never copies secret values. a broad approval is not enough; exact key=value fields are required.
- passed: `hard_stop_no_private` - this guard never executes runtime commands. this guard never executes rollback commands. this guard never starts models or local workers. this guard never installs dependencies. this guard never reads private source root, onedrive or archive-library content. this guard never writes runtime outputs or worker outputs. this guard never copies secret values. a broad approval is not enough; exact key=value fields are required.
- passed: `hard_stop_exact_required` - this guard never executes runtime commands. this guard never executes rollback commands. this guard never starts models or local workers. this guard never installs dependencies. this guard never reads private source root, onedrive or archive-library content. this guard never writes runtime outputs or worker outputs. this guard never copies secret values. a broad approval is not enough; exact key=value fields are required.
