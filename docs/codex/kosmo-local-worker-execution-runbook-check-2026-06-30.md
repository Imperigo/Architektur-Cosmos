# Kosmo Local Worker Execution Runbook Check

Generated: 2026-06-30T11:08:58.247Z
Status: `local_worker_execution_runbook_guard_passed`

## Summary

- Runbook status: local_worker_execution_runbook_idle_review_only
- Tasks total: 9
- Runner-safe tasks: 8
- Executable now: 0
- Blocked by private context: 1
- Failures: 0
- Warnings: 0
- Public-ready after check: 0

## Findings

- passed: `runbook_status_guarded` - Runbook status must be idle review-only or explicitly list executable tasks.
- passed: `runbook_only_true` - Runbook must be runbook-only.
- passed: `starts_model_false` - Runbook must not start models.
- passed: `reads_private_outputs_false` - Runbook must not read private outputs.
- passed: `reads_private_sources_false` - Runbook must not read private sources.
- passed: `writes_worker_outputs_false` - Runbook must not write worker outputs.
- passed: `writes_git_false` - Runbook must not write Git.
- passed: `writes_cloud_false` - Runbook must not write cloud.
- passed: `public_ready_zero` - Runbook must keep public-ready at 0.
- passed: `task_count_matches` - Summary task count must match task rows.
- passed: `output_count_matches` - Present + missing outputs must equal total tasks.
- passed: `runner_safe_count_matches` - Runner-safe count must match task rows.
- passed: `private_context_count_matches` - Private-context blocker count must match task rows.
- passed: `executable_count_matches` - Executable-now count must match task rows.
- passed: `summary_public_ready_zero` - Summary public-ready after runbook must be 0.
- passed: `launch_queue_state_valid` - Launch queue must be idle, explicitly launchable, or safely blocked with no missing outputs.
- passed: `repo_conversion_zero` - Repo conversion must remain 0.
- passed: `runner_check_passed` - HTTP runner check must pass.
- passed: `runner_check_failures_zero` - HTTP runner check failures must be 0.
- passed: `task_id_present:kosmo-private-doctrine-summary` - Each task must have an id.
- passed: `output_status_known:kosmo-private-doctrine-summary` - kosmo-private-doctrine-summary output status must be known.
- passed: `blocked_has_blockers:kosmo-private-doctrine-summary` - kosmo-private-doctrine-summary must explain why it is blocked.
- passed: `blocked_safe_command_null:kosmo-private-doctrine-summary` - kosmo-private-doctrine-summary must not expose safe_command when blocked.
- passed: `task_id_present:kosmo-reference-pilot-gap-map` - Each task must have an id.
- passed: `output_status_known:kosmo-reference-pilot-gap-map` - kosmo-reference-pilot-gap-map output status must be known.
- passed: `runner_safe_without_blockers:kosmo-reference-pilot-gap-map` - kosmo-reference-pilot-gap-map cannot be runner-safe while blockers exist.
- passed: `safe_command_present:kosmo-reference-pilot-gap-map` - kosmo-reference-pilot-gap-map needs a safe command when runner-safe.
- passed: `present_decision_matches:kosmo-reference-pilot-gap-map` - kosmo-reference-pilot-gap-map output-present decision must match present output.
- passed: `task_id_present:kosmo-book-library-mount-questions` - Each task must have an id.
- passed: `output_status_known:kosmo-book-library-mount-questions` - kosmo-book-library-mount-questions output status must be known.
- passed: `runner_safe_without_blockers:kosmo-book-library-mount-questions` - kosmo-book-library-mount-questions cannot be runner-safe while blockers exist.
- passed: `safe_command_present:kosmo-book-library-mount-questions` - kosmo-book-library-mount-questions needs a safe command when runner-safe.
- passed: `present_decision_matches:kosmo-book-library-mount-questions` - kosmo-book-library-mount-questions output-present decision must match present output.
- passed: `task_id_present:kosmo-asset-seed-candidates` - Each task must have an id.
- passed: `output_status_known:kosmo-asset-seed-candidates` - kosmo-asset-seed-candidates output status must be known.
- passed: `runner_safe_without_blockers:kosmo-asset-seed-candidates` - kosmo-asset-seed-candidates cannot be runner-safe while blockers exist.
- passed: `safe_command_present:kosmo-asset-seed-candidates` - kosmo-asset-seed-candidates needs a safe command when runner-safe.
- passed: `present_decision_matches:kosmo-asset-seed-candidates` - kosmo-asset-seed-candidates output-present decision must match present output.
- passed: `task_id_present:kosmo-public-source-link-synthesis` - Each task must have an id.
- passed: `output_status_known:kosmo-public-source-link-synthesis` - kosmo-public-source-link-synthesis output status must be known.
- passed: `runner_safe_without_blockers:kosmo-public-source-link-synthesis` - kosmo-public-source-link-synthesis cannot be runner-safe while blockers exist.
- passed: `safe_command_present:kosmo-public-source-link-synthesis` - kosmo-public-source-link-synthesis needs a safe command when runner-safe.
- passed: `present_decision_matches:kosmo-public-source-link-synthesis` - kosmo-public-source-link-synthesis output-present decision must match present output.
- passed: `task_id_present:kosmo-asset-source-candidate-triage` - Each task must have an id.
- passed: `output_status_known:kosmo-asset-source-candidate-triage` - kosmo-asset-source-candidate-triage output status must be known.
- passed: `runner_safe_without_blockers:kosmo-asset-source-candidate-triage` - kosmo-asset-source-candidate-triage cannot be runner-safe while blockers exist.
- passed: `safe_command_present:kosmo-asset-source-candidate-triage` - kosmo-asset-source-candidate-triage needs a safe command when runner-safe.
- passed: `present_decision_matches:kosmo-asset-source-candidate-triage` - kosmo-asset-source-candidate-triage output-present decision must match present output.
- passed: `task_id_present:kosmo-human-decision-queue-triage` - Each task must have an id.
- passed: `output_status_known:kosmo-human-decision-queue-triage` - kosmo-human-decision-queue-triage output status must be known.
- passed: `runner_safe_without_blockers:kosmo-human-decision-queue-triage` - kosmo-human-decision-queue-triage cannot be runner-safe while blockers exist.
- passed: `safe_command_present:kosmo-human-decision-queue-triage` - kosmo-human-decision-queue-triage needs a safe command when runner-safe.
- passed: `present_decision_matches:kosmo-human-decision-queue-triage` - kosmo-human-decision-queue-triage output-present decision must match present output.
- passed: `task_id_present:kosmo-owner-batch-review-questions` - Each task must have an id.
- passed: `output_status_known:kosmo-owner-batch-review-questions` - kosmo-owner-batch-review-questions output status must be known.
- passed: `runner_safe_without_blockers:kosmo-owner-batch-review-questions` - kosmo-owner-batch-review-questions cannot be runner-safe while blockers exist.
- passed: `safe_command_present:kosmo-owner-batch-review-questions` - kosmo-owner-batch-review-questions needs a safe command when runner-safe.
- passed: `present_decision_matches:kosmo-owner-batch-review-questions` - kosmo-owner-batch-review-questions output-present decision must match present output.
- passed: `task_id_present:kosmo-owner-session-safe-next-tasks` - Each task must have an id.
- passed: `output_status_known:kosmo-owner-session-safe-next-tasks` - kosmo-owner-session-safe-next-tasks output status must be known.
- passed: `runner_safe_without_blockers:kosmo-owner-session-safe-next-tasks` - kosmo-owner-session-safe-next-tasks cannot be runner-safe while blockers exist.
- passed: `safe_command_present:kosmo-owner-session-safe-next-tasks` - kosmo-owner-session-safe-next-tasks needs a safe command when runner-safe.
- passed: `present_decision_matches:kosmo-owner-session-safe-next-tasks` - kosmo-owner-session-safe-next-tasks output-present decision must match present output.
- passed: `dry_run_command_present` - Dry-run command template must use HTTP runner.
- passed: `execute_command_has_execute` - Execute command template must include --execute.
- passed: `force_command_has_force` - Force command template must include --force.
- passed: `commands_no_git_cloud` - Command templates must not include Git or cloud writes.

## Next Actions

- Use the execution runbook as the safe command map for future local worker runs.
- Do not execute local worker tasks while executable_now is 0.
- Rerun this guard after task-pack, launch queue, conversion plan or runner-check changes.
