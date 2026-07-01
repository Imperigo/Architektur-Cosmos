# Kosmo Owner Unlock Patch Review Bundle

Generated: 2026-07-01T06:26:08.725Z
Status: `owner_unlock_patch_review_bundle_ready`

## Summary

- Preview status: owner_unlock_answer_dry_run_ready_for_review
- Intake map status: owner_unlock_reply_intake_map_ready_for_review
- Intake map check: owner_unlock_reply_intake_map_guard_passed
- Patch operations: 6
- Source-root patches: 1
- Owner-card patches: 5
- Applies patch now: no
- Public-ready after bundle: 0

## Proposed Patch Operations

- set_validated_owner_answer -> `source_root_answer`
- set_review_only_owner_choice -> `owner_card_answers.batch-a-villa-savoye-image-candidates`
- set_review_only_owner_choice -> `owner_card_answers.batch-b-villa-savoye-derived-files`
- set_review_only_owner_choice -> `owner_card_answers.batch-c-model-promotion-confirmation`
- set_review_only_owner_choice -> `owner_card_answers.batch-d-sogn-benedetg-source-gap`
- set_review_only_owner_choice -> `owner_card_answers.batch-e-kosmoasset-human-reviews`

## Review Sequence Before Any Apply

- Claude/Codex review this bundle and the intake-map guard.
- Owner sends the exact reply in the same turn or a newer turn.
- Apply only the listed fields to the owner answer intake template.
- Run npm run kosmo:owner-answer-intake-check.
- Run npm run kosmo:owner-answer-session-edit-plan.
- Only then run source-root decision/session guards.

## Hard Stops

- Do not apply this bundle automatically.
- Do not write the intake template from this bundle.
- Do not mutate session files from this bundle.
- Do not run source-root guards from this bundle.
- Do not read private content.
- Keep public-ready at 0.
