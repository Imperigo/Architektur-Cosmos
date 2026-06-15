# Kosmo Owner Unlock Execution Runbook

Generated: 2026-06-15T10:37:02.814Z
Status: `owner_unlock_execution_runbook_ready`

## Summary

- Phases: 7
- Commands: 12
- Manual gates: 2
- Mutating phases after review: 1
- Public-ready after runbook: 0

## Phases

### phase-1-validate-owner-reply

- Validate explicit owner reply
- Mutates project files: no
- Commands:
  - `npm run kosmo:owner-unlock-reply-validator -- --answer "<owner_reply>"`
  - `npm run kosmo:owner-unlock-reply-validator-check`
- Stop if:
  - Validator status is not owner_unlock_reply_valid.
  - Validator guard has any failure.

### phase-2-map-to-intake-patch

- Map validated reply to reviewable intake patch
- Mutates project files: no
- Commands:
  - `npm run kosmo:owner-unlock-reply-intake-map`
  - `npm run kosmo:owner-unlock-reply-intake-map-check`
- Stop if:
  - Map status is not owner_unlock_reply_intake_map_ready_for_review.
  - Map guard has any failure.
  - Any proposed owner-card patch is not allowed by the template.

### phase-3-human-review-intake-patch

- Review proposed intake patch before editing template
- Mutates project files: no
- Stop if:
  - Claude/Codex/KosmoOverseer have not reviewed the map.
  - Owner intent is ambiguous.
  - The selected source-root path is not explicitly confirmed.

### phase-4-apply-intake-only-after-review

- Apply reviewed fields to owner answer intake template
- Mutates project files: yes
- Commands:
  - `npm run kosmo:owner-answer-intake-check`
- Stop if:
  - Intake guard has any failure.
  - Filled answers do not match the reviewed map.

### phase-5-plan-session-edits

- Generate session edit plan only after intake guard passes
- Mutates project files: no
- Commands:
  - `npm run kosmo:owner-answer-session-edit-plan`
- Stop if:
  - Session edit plan is blocked by intake guard.
  - Planned edits include unexpected target files.

### phase-6-source-root-guards

- Run source-root guards before private metadata diagnostics
- Condition: Only if reviewed intake/session plan selects source-root diagnostic.
- Mutates project files: no
- Commands:
  - `npm run kosmo:source-root-decision-session-check`
  - `npm run kosmo:source-root-blocker-refresh`
  - `npm run kosmo:source-root-activation-preflight`
- Stop if:
  - Any source-root guard fails.
  - Root path is missing, incomplete, or not owner-confirmed.

### phase-7-post-source-readiness

- Prepare post-source metadata queue, still no public promotion
- Condition: Only after phase 6 passes.
- Mutates project files: no
- Commands:
  - `npm run kosmo:source-root-post-owner-activation-queue`
  - `npm run kosmo:source-root-post-owner-activation-queue-check`
  - `npm run kosmo:post-source-root-metadata-readiness-pack`
- Stop if:
  - Any queue or readiness guard fails.
  - Any artifact tries to mark private-derived material public-ready.

## Hard Stops

- Do not run source-root private diagnostics from a merely valid reply.
- Do not edit intake before reviewing the intake map.
- Do not edit session files before the intake guard passes.
- Do not read private content in this runbook step.
- Do not mark any private-derived material public-ready.
