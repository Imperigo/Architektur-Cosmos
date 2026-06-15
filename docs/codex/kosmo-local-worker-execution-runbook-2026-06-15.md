# Kosmo Local Worker Execution Runbook

Generated: 2026-06-15T10:42:45.364Z
Status: `local_worker_execution_runbook_idle_review_only`

## Summary

- Tasks total: 9
- Outputs present: 9
- Outputs missing: 0
- Runner-safe tasks: 8
- Blocked by private_context_paths: 1
- Execute allowed if output missing: 0
- Public-ready after runbook: 0

## Guard State

- Launch queue: local_worker_launch_queue_idle_outputs_present, launchable 0
- Conversion plan: local_worker_output_conversion_plan_review_only, repo now 0
- Runner check: local_worker_http_runner_guard_passed, failures 0

## Tasks

| Task | Lane | Output | Runner Safe | Decision | Blockers |
| --- | --- | --- | --- | --- | --- |
| `kosmo-private-doctrine-summary` | kosmoreferences | present | no | do_not_execute_runner_blocked | private_context_paths |
| `kosmo-reference-pilot-gap-map` | kosmoreferences | present | yes | do_not_execute_output_present | - |
| `kosmo-book-library-mount-questions` | source_discovery | present | yes | do_not_execute_output_present | - |
| `kosmo-asset-seed-candidates` | kosmoasset | present | yes | do_not_execute_output_present | - |
| `kosmo-public-source-link-synthesis` | source_discovery | present | yes | do_not_execute_output_present | - |
| `kosmo-asset-source-candidate-triage` | kosmoasset | present | yes | do_not_execute_output_present | - |
| `kosmo-human-decision-queue-triage` | human_review_support | present | yes | do_not_execute_output_present | - |
| `kosmo-owner-batch-review-questions` | human_review_support | present | yes | do_not_execute_output_present | - |
| `kosmo-owner-session-safe-next-tasks` | human_review_support | present | yes | do_not_execute_output_present | - |

## Command Templates

- dry_run: `npm run kosmo:local-worker-http-runner -- --task <task_id>`
- execute: `npm run kosmo:local-worker-http-runner -- --task <task_id> --execute`
- force_execute_existing_output: `npm run kosmo:local-worker-http-runner -- --task <task_id> --execute --force`

## Next Actions

- Do not execute local worker tasks now; required outputs are already present or tasks are not runner-safe.
- Use this runbook to choose future --execute targets only after a task output is missing and runner/check guards pass.
- Keep private_context_paths tasks manual/overseer-reviewed until a separate private-safe adapter exists.
