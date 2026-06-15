# Kosmo Owner Remaining Decision Brief

Generated: 2026-06-15T13:48:18.447Z
Status: `owner_remaining_decision_brief_ready`

## Summary

- Decision groups: 2
- Open owner actions: 2
- Source-root choices: 3
- Unlock choices: 1
- Open review batches: 5
- Open review items: 16
- Pilot-gap owner decisions: 7
- Asset owner confirmations: 3
- Public-ready after brief: 0

## Decisions

### source_root_choice

- Status: owner_action_required
- Question: Welche Source-Root-Option soll als naechster Zustand gelten?
- Recommended default: repair_onedrive_first_or_keep_blocked_until_complete_root_is_confirmed
- Safe after answer: Run source-root decision checks and activation preflight before any private metadata inventory.
- Choices:
  - `keep_blocked`: Keep source-root blocked; unlocks metadata diagnostic no; public-ready 0
  - `repair_onedrive_first`: Repair OneDrive first; unlocks metadata diagnostic no; public-ready 0
  - `select_exact_root_1`: Select visible exact root for metadata diagnostic; unlocks metadata diagnostic yes; public-ready 0

### open_review_batches

- Status: owner_action_required
- Question: Welche offenen Reference/Asset Review-Batches duerfen als naechstes bearbeitet werden?
- Recommended default: keep_all_review_only_until_source_root_and_rights_gates_are_confirmed
- Safe after answer: Record answers into owner intake/session only; keep public-ready at 0.

## Hard Stops

- Do not record an owner decision automatically.
- Do not run private metadata inventory from this brief.
- Do not read private source contents.
- Do not execute local workers.
- Keep public-ready at 0.
