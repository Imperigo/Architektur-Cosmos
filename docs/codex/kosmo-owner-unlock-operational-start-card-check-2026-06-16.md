# Kosmo Owner Unlock Operational Start Card Check

Generated: 2026-06-16T05:34:00.385Z
Status: `owner_unlock_operational_start_card_guard_passed`

## Summary

- Checks: 28/28
- Failures: 0
- Public-ready after check: 0

## Checks

- passed: `status_ready` - owner_unlock_operational_start_card_ready
- passed: `policy_card_only` - true
- passed: `policy_no_decisions` - false
- passed: `policy_no_intake_write` - false
- passed: `policy_no_session_write` - false
- passed: `policy_no_execute_now` - false
- passed: `policy_no_private_reads` - false
- passed: `policy_no_private_inventory` - false
- passed: `public_ready_zero` - 0
- passed: `all_components_ready` - 6/6
- passed: `checkpoint_green` - 283/283
- passed: `owner_reply_not_applied` - broad_intent_seen_exact_reply_not_applied
- passed: `source_root_blocked` - blocked_until_explicit_owner_reply_and_guards
- passed: `selected_root_exists_preview` - true
- passed: `current_session_file` - examples/kosmo-references/provenance/source-root-decision-session-2026-06-16.json
- passed: `queue_fully_blocked` - 0/7/7
- passed: `exact_reply_has_root_choice` - source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf.
- passed: `exact_reply_has_confirmed_yes` - source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf.
- passed: `exact_reply_has_assets_path` - source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf.
- passed: `next_commands_start_validator` - npm run kosmo:owner-unlock-reply-validator -- --answer "source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf."
- passed: `next_commands_include_dry_run` - npm run kosmo:owner-unlock-reply-validator -- --answer "source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf." npm run kosmo:owner-unlock-answer-dry-run -- --answer "source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf." npm run kosmo:owner-unlock-session-edit-preview npm run kosmo:owner-unlock-session-edit-preview-check npm run kosmo:source-root-decision-session-check npm run kosmo:source-root-blocker-refresh npm run kosmo:source-root-activation-preflight npm run kosmo:source-root-post-owner-activation-queue npm run kosmo:source-root-post-owner-activation-queue-check
- passed: `next_commands_include_current_session_preview` - npm run kosmo:owner-unlock-reply-validator -- --answer "source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf." npm run kosmo:owner-unlock-answer-dry-run -- --answer "source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf." npm run kosmo:owner-unlock-session-edit-preview npm run kosmo:owner-unlock-session-edit-preview-check npm run kosmo:source-root-decision-session-check npm run kosmo:source-root-blocker-refresh npm run kosmo:source-root-activation-preflight npm run kosmo:source-root-post-owner-activation-queue npm run kosmo:source-root-post-owner-activation-queue-check
- passed: `next_commands_include_post_owner_queue_check` - npm run kosmo:owner-unlock-reply-validator -- --answer "source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf." npm run kosmo:owner-unlock-answer-dry-run -- --answer "source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf." npm run kosmo:owner-unlock-session-edit-preview npm run kosmo:owner-unlock-session-edit-preview-check npm run kosmo:source-root-decision-session-check npm run kosmo:source-root-blocker-refresh npm run kosmo:source-root-activation-preflight npm run kosmo:source-root-post-owner-activation-queue npm run kosmo:source-root-post-owner-activation-queue-check
- passed: `blocked_private_inventory` - npm run kosmo:private-metadata-inventory npm run kosmo:private-library-diagnostic -- --roots "<selected-root>" private ocr/pdf/book extraction local llm private-content task assignment public-ready promotion
- passed: `blocked_private_ocr` - npm run kosmo:private-metadata-inventory npm run kosmo:private-library-diagnostic -- --roots "<selected-root>" private ocr/pdf/book extraction local llm private-content task assignment public-ready promotion
- passed: `hard_stop_freeform_not_exact` - do not treat broad freeform approval as exact owner reply. do not write intake or session files from this card. do not run private inventory, ocr, embeddings or local llm private tasks from this card. do not change public-ready state.
- passed: `hard_stop_no_writes` - do not treat broad freeform approval as exact owner reply. do not write intake or session files from this card. do not run private inventory, ocr, embeddings or local llm private tasks from this card. do not change public-ready state.
- passed: `hard_stop_no_public_ready` - do not treat broad freeform approval as exact owner reply. do not write intake or session files from this card. do not run private inventory, ocr, embeddings or local llm private tasks from this card. do not change public-ready state.
