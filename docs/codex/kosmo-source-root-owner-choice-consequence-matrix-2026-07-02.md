# Kosmo Source-Root Owner Choice Consequence Matrix

Generated: 2026-07-02T06:21:53.783Z
Status: `source_root_owner_choice_consequence_matrix_ready`

## Summary

- Final brief: source_root_owner_final_decision_brief_ready
- Dry run: source_root_decision_dry_run_ready
- Queue guard: source_root_post_owner_activation_queue_guard_passed
- Choices: 3
- Unlock choices: 1
- Blocked choices: 2
- Failures: 0
- Public-ready after matrix: 0

## Recommendation

- Safe default: repair_onedrive_first_or_keep_blocked
- Rule: Pick the unlock choice only after explicit owner confirmation that the exact path is the complete private architecture source root.

## Choice Matrix

| Choice | Decision | Root | Private metadata | First command | Public-ready | Next human review |
| --- | --- | --- | --- | --- | ---: | --- |
| `keep_blocked` | `keep_blocked` | - | blocked | `npm run kosmo:source-root-decision-session-check` | 0 | owner confirms a real complete source root or repair/mount action is complete |
| `repair_onedrive_first` | `repair_onedrive_first` | - | blocked | `npm run kosmo:source-root-decision-session-check` | 0 | owner confirms a real complete source root or repair/mount action is complete |
| `select_exact_root_1` | `select_existing_root_for_private_diagnostic` | `/mnt/archiv/ArchitekturKosmos/Assets` | metadata_only_possible_after_all_guards | `npm run kosmo:source-root-decision-session-check` | 0 | review private metadata inventory output contract before any extraction or local LLM content tasks |

## Guard Sequences

### keep_blocked

- `npm run kosmo:source-root-decision-session-check`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:source-root-activation-preflight`
- `npm run kosmo:source-root-post-owner-activation-queue`
- `npm run kosmo:source-root-post-owner-activation-queue-check`
- `npm run kosmo:day-batch-loop`

Still blocked:
- private metadata inventory
- private OCR/PDF/book text extraction
- source-dependent authoring
- public-ready promotion from private sources
- local LLM tasks with private file contents

### repair_onedrive_first

- `npm run kosmo:source-root-decision-session-check`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:source-root-activation-preflight`
- `npm run kosmo:source-root-post-owner-activation-queue`
- `npm run kosmo:source-root-post-owner-activation-queue-check`
- `npm run kosmo:day-batch-loop`

Still blocked:
- private metadata inventory
- private OCR/PDF/book text extraction
- source-dependent authoring
- public-ready promotion from private sources
- local LLM tasks with private file contents

### select_exact_root_1

- `npm run kosmo:source-root-decision-session-check`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:source-root-activation-preflight`
- `npm run kosmo:source-root-post-owner-activation-queue`
- `npm run kosmo:source-root-post-owner-activation-queue-check`
- `npm run kosmo:private-metadata-inventory`
- `npm run kosmo:private-metadata-inventory-check`
- `npm run kosmo:day-batch-loop`

Still blocked:
- private OCR/PDF/book text extraction
- copying private files into Git
- public-ready promotion from private sources
- local LLM file-content tasks before metadata output guards pass

## Failures

- None.
