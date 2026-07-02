# Kosmo Local Worker Output Contract Review

Generated: 2026-07-02T06:20:42.522Z
Status: `local_worker_output_contract_review_ready`

## Summary

- Output review: local_worker_outputs_present_review_only
- Conversion plan: local_worker_output_conversion_plan_review_only
- Runbook: local_worker_execution_runbook_idle_review_only
- Runbook check: local_worker_execution_runbook_guard_passed
- Contracts: 9
- Present valid outputs: 9
- Invalid JSON outputs: 0
- High-risk hits: 0
- Eligible for manual metadata review: 9
- Repo conversion allowed now: 0
- Execute allowed now: 0
- Blocked by private context: 1
- Failures: 0
- Public-ready after review: 0

## Contracts

| Task | Lane | Output | Runner safe | Decision | Contract state | Next gate |
| --- | --- | --- | --- | --- | --- | --- |
| `kosmo-private-doctrine-summary` | kosmoreferences | present | no | do_not_execute_runner_blocked | blocked_by_contract | owner_or_overseer_private_context_review |
| `kosmo-reference-pilot-gap-map` | kosmoreferences | present | yes | do_not_execute_output_present | present_hold_manual_metadata_review | manual_metadata_review_without_body_copy |
| `kosmo-book-library-mount-questions` | source_discovery | present | yes | do_not_execute_output_present | present_hold_manual_metadata_review | manual_metadata_review_without_body_copy |
| `kosmo-asset-seed-candidates` | kosmoasset | present | yes | do_not_execute_output_present | present_hold_manual_metadata_review | manual_metadata_review_without_body_copy |
| `kosmo-public-source-link-synthesis` | source_discovery | present | yes | do_not_execute_output_present | present_hold_manual_metadata_review | manual_metadata_review_without_body_copy |
| `kosmo-asset-source-candidate-triage` | kosmoasset | present | yes | do_not_execute_output_present | present_hold_manual_metadata_review | manual_metadata_review_without_body_copy |
| `kosmo-human-decision-queue-triage` | human_review_support | present | yes | do_not_execute_output_present | present_hold_manual_metadata_review | manual_metadata_review_without_body_copy |
| `kosmo-owner-batch-review-questions` | human_review_support | present | yes | do_not_execute_output_present | present_hold_manual_metadata_review | manual_metadata_review_without_body_copy |
| `kosmo-owner-session-safe-next-tasks` | human_review_support | present | yes | do_not_execute_output_present | present_hold_manual_metadata_review | manual_metadata_review_without_body_copy |

## Hard Stops

- Do not open private worker output bodies from this review.
- Do not convert worker outputs into repo data automatically.
- Do not execute local workers while execute_allowed_now is 0.
- Do not set public-ready from local worker outputs.
- Keep manual metadata review as the next gate.

## Failures

- None.
