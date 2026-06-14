# Kosmo Local Worker Pilot Task Queue Check

Generated: 2026-06-14T18:13:23.424Z
Status: `local_worker_pilot_task_queue_guard_passed`

## Summary

- Checks: 22/22
- Failures: 0
- Warnings: 0
- Public-ready after check: 0

## Checks

- passed: `status_ready_blocked` - local_worker_pilot_task_queue_ready_blocked
- passed: `policy_queue_only` - true
- passed: `policy_no_execute_now` - false
- passed: `policy_no_private_reads` - false
- passed: `policy_no_repo_write` - false
- passed: `policy_requires_overseer` - true
- passed: `public_ready_zero` - 0
- passed: `three_pilots` - 3
- passed: `twelve_tasks` - 12
- passed: `four_tasks_per_pilot` - 4
- passed: `nine_references_tasks` - 9
- passed: `three_asset_tasks` - 3
- passed: `worker_contracts_present` - 9
- passed: `launchable_now_zero` - 0
- passed: `writes_repo_now_zero` - 0
- passed: `all_tasks_blocked` - 
- passed: `all_tasks_public_ready_zero` - 
- passed: `all_tasks_have_overseer` - 
- passed: `hard_stop_no_launch_now` - do not launch local worker tasks from this queue now. do not pass full private documents to local workers. do not let local worker output write directly to repo. do not mark local worker output public-ready.
- passed: `hard_stop_no_full_private_docs` - do not launch local worker tasks from this queue now. do not pass full private documents to local workers. do not let local worker output write directly to repo. do not mark local worker output public-ready.
- passed: `hard_stop_no_repo_write` - do not launch local worker tasks from this queue now. do not pass full private documents to local workers. do not let local worker output write directly to repo. do not mark local worker output public-ready.
- passed: `hard_stop_no_public_ready` - do not launch local worker tasks from this queue now. do not pass full private documents to local workers. do not let local worker output write directly to repo. do not mark local worker output public-ready.
