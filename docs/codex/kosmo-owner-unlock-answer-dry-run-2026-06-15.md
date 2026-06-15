# Kosmo Owner Unlock Answer Dry Run

Generated: 2026-06-15T15:13:00.099Z
Status: `owner_unlock_answer_dry_run_attention_required`

## Summary

- Answer present: yes
- Validator: owner_unlock_reply_invalid
- Validator guard: owner_unlock_reply_validator_guard_failed
- Intake map: owner_unlock_reply_intake_map_blocked_by_invalid_reply
- Intake map guard: owner_unlock_reply_intake_map_guard_passed
- Patch operations: 0
- Owner card patches: 0
- Failures: 5
- Public-ready after dry-run: 0

## Outputs

- directory: `data/owner-unlock-dry-runs/2026-06-15`
- validator: `data/owner-unlock-dry-runs/2026-06-15/validator.json`
- validator_check: `data/owner-unlock-dry-runs/2026-06-15/validator-check.json`
- intake_map: `data/owner-unlock-dry-runs/2026-06-15/intake-map.json`
- intake_map_check: `data/owner-unlock-dry-runs/2026-06-15/intake-map-check.json`

## Next Actions

- Do not edit intake or session files.
- Correct the owner reply format or wait for a valid explicit answer.

## Hard Stops

- Do not treat this dry-run as applied owner approval.
- Do not run source-root guards from this dry-run.
- Do not write the intake template from this dry-run.
- Do not read private content.
- Keep public-ready at 0.

## Failures

- validator exited 1
- validator-check exited 1
- Missing source_root_choice.
- confirmed_exact_root must be yes or no.
- validator-check reported failures
