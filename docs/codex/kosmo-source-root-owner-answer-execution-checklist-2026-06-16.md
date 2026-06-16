# Kosmo Source-Root Owner Answer Execution Checklist

Generated: 2026-06-16T05:12:29.776Z
Status: `source_root_owner_answer_execution_checklist_ready`

## Summary

- Branches: 3
- Unlock branches: 1
- Executable now: 0
- Owner actions required: 2
- Readiness command steps: 9
- Public-ready after checklist: 0

## Branches

### keep_blocked

- Label: Keep source-root blocked
- Selected decision: keep_blocked
- Selected root path: none
- Unlocks metadata diagnostic: no
- Executable now: no
- Immediate Codex action: Record blocked decision, refresh blockers, and keep all source-dependent work closed.
- Next human review: owner confirms a real complete source root or repair/mount action is complete
- Command order after recording:
  - npm run kosmo:source-root-decision-session-check
  - npm run kosmo:source-root-blocker-refresh
  - npm run kosmo:source-root-activation-preflight
  - npm run kosmo:source-root-post-owner-activation-queue
  - npm run kosmo:source-root-post-owner-activation-queue-check
  - npm run kosmo:day-batch-loop

### repair_onedrive_first

- Label: Repair OneDrive first
- Selected decision: repair_onedrive_first
- Selected root path: none
- Unlocks metadata diagnostic: no
- Executable now: no
- Immediate Codex action: Record repair-first decision, keep private work blocked, refresh blockers, and wait for OneDrive/source mount completion.
- Next human review: owner confirms a real complete source root or repair/mount action is complete
- Command order after recording:
  - npm run kosmo:source-root-decision-session-check
  - npm run kosmo:source-root-blocker-refresh
  - npm run kosmo:source-root-activation-preflight
  - npm run kosmo:source-root-post-owner-activation-queue
  - npm run kosmo:source-root-post-owner-activation-queue-check
  - npm run kosmo:day-batch-loop

### select_exact_root_1

- Label: Select visible exact root for metadata diagnostic
- Selected decision: select_existing_root_for_private_diagnostic
- Selected root path: /mnt/archiv/ArchitekturKosmos/Assets
- Unlocks metadata diagnostic: yes
- Executable now: no
- Immediate Codex action: After explicit owner confirmation, record the exact root decision, run source-root guards, then run metadata-only private inventory if activation is ready.
- Next human review: review private metadata inventory output contract before any extraction or local LLM content tasks
- Command order after recording:
  - npm run kosmo:source-root-decision-session-check
  - npm run kosmo:source-root-blocker-refresh
  - npm run kosmo:source-root-activation-preflight
  - npm run kosmo:source-root-post-owner-activation-queue
  - npm run kosmo:source-root-post-owner-activation-queue-check
  - npm run kosmo:private-metadata-inventory
  - npm run kosmo:private-metadata-inventory-check
  - npm run kosmo:day-batch-loop

## Required Owner Answer Format

- source_root_choice: One of: keep_blocked, repair_onedrive_first, select_exact_root_1
- exact_root_confirmation: Required only for select_exact_root_1; must confirm the exact shown path is the complete private architecture source root.
- review_batch_scope: Optional next review batch IDs; keep review-only unless separately approved.

## Hard Stops

- Do not infer the owner answer from this checklist.
- Do not run commands from a branch until the owner answer is explicitly recorded.
- Do not run private metadata inventory unless the selected branch unlocks it and all guards pass.
- Do not OCR, extract PDF text, or send private file contents to local LLM workers from this checklist.
- Do not copy private files, scans, OCR text, or protected assets into Git.
- Do not set public-ready.
