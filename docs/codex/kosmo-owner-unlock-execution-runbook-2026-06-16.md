# Kosmo Owner Unlock Execution Runbook

Generated: 2026-06-16T17:35:43.997Z
Status: `owner_unlock_execution_runbook_ready`

## Summary

- Phases: 8
- Commands: 21
- Manual gates: 2
- Mutating phases after review: 1
- Expected session file: `examples/kosmo-references/provenance/source-root-decision-session-2026-06-16.json`
- Expected selected root path: /mnt/archiv/ArchitekturKosmos/Assets
- Operational start card: owner_unlock_operational_start_card_ready
- Pipeline checkpoint: missing
- Session edit preview: owner_unlock_session_edit_preview_ready
- Post-owner queue: source_root_post_owner_activation_queue_ready; executable now 2
- Public-ready after runbook: 0

## Phases

### phase-1-start-card-and-checkpoint

- Open the current operational start card and checkpoint
- Mutates project files: no
- Commands:
  - `npm run kosmo:owner-unlock-operational-start-card`
  - `npm run kosmo:owner-unlock-operational-start-card-check`
  - `npm run kosmo:owner-unlock-pipeline-checkpoint`
  - `npm run kosmo:owner-unlock-pipeline-checkpoint-check`
- Stop if:
  - Operational start card guard has any failure.
  - Pipeline checkpoint is not owner_unlock_pipeline_checkpoint_ready.
  - The start card does not point to the current source-root session file.

### phase-2-validate-exact-owner-reply

- Validate explicit owner reply
- Mutates project files: no
- Commands:
  - `npm run kosmo:owner-unlock-reply-validator -- --answer "source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf."`
  - `npm run kosmo:owner-unlock-reply-validator-check`
- Stop if:
  - Validator status is not owner_unlock_reply_valid.
  - Validator guard has any failure.
  - The owner reply is broad/freeform rather than exact key-value text.

### phase-3-dry-run-and-patch-preview

- Dry-run the exact reply and preview patch effects
- Mutates project files: no
- Commands:
  - `npm run kosmo:owner-unlock-answer-dry-run -- --answer "source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf."`
  - `npm run kosmo:owner-unlock-exact-reply-preview-check`
  - `npm run kosmo:owner-unlock-patch-review-bundle`
  - `npm run kosmo:owner-unlock-patch-review-bundle-check`
- Stop if:
  - Answer dry-run is not ready for review.
  - Patch review bundle has any failure.
  - Any patch writes intake/session files now.

### phase-4-review-session-edit-preview

- Review current session edit preview before any session edit
- Mutates project files: no
- Commands:
  - `npm run kosmo:owner-unlock-session-edit-preview`
  - `npm run kosmo:owner-unlock-session-edit-preview-check`
- Stop if:
  - Session edit preview guard has any failure.
  - Preview target is not the current source-root decision session file.
  - Preview would write now or change public-ready.

### phase-5-apply-reviewed-source-root-session-only

- Apply exactly the reviewed source-root session fields
- Mutates project files: yes
- Stop if:
  - Exact owner reply is not present in normal chat.
  - Claude/Codex/KosmoOverseer have not reviewed the session preview.
  - Target file is not the current source-root decision session.
  - Proposed root path is not the selected root preview.

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
  - Activation preflight is interpreted as public promotion.

### phase-7-post-source-readiness

- Prepare post-source metadata queue, still no public promotion
- Condition: Only after phase 6 passes.
- Mutates project files: no
- Commands:
  - `npm run kosmo:source-root-post-owner-activation-queue`
  - `npm run kosmo:source-root-post-owner-activation-queue-check`
- Stop if:
  - Any queue or readiness guard fails.
  - Queue still shows executable_now=0 after the reviewed session edit should have been applied.
  - Any artifact tries to mark private-derived material public-ready.

### phase-8-private-metadata-only-if-queue-unblocks

- Run private metadata only if the guarded queue makes it executable
- Condition: Only after phase 7 reports activation_ready=true and private_metadata_inventory executable_now=true.
- Mutates project files: no
- Commands:
  - `npm run kosmo:private-metadata-inventory`
  - `npm run kosmo:private-metadata-inventory-check`
  - `npm run kosmo:data-lane-sweep`
  - `npm run kosmo:references-nightly-gate`
- Stop if:
  - Post-owner queue keeps private metadata blocked.
  - Any private metadata check fails.
  - Any output contains private full text, scans, screenshots or public-ready promotion.

## Hard Stops

- Do not run source-root private diagnostics from a merely valid reply or broad freeform approval.
- Do not edit intake files from this runbook.
- Do not edit session files before the exact reply, start card, checkpoint and session preview guards pass.
- Do not edit any source-root session except examples/kosmo-references/provenance/source-root-decision-session-2026-06-16.json.
- Do not read private content in this runbook step.
- Do not run private metadata inventory unless the post-owner queue explicitly unblocks it.
- Do not mark any private-derived material public-ready.
