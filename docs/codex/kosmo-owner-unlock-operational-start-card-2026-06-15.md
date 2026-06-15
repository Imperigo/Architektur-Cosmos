# Kosmo Owner Unlock Operational Start Card

Generated: 2026-06-15T16:03:19.574Z
Status: `owner_unlock_operational_start_card_ready`

## Summary

- Components: 6/6
- Checkpoint: owner_unlock_pipeline_checkpoint_ready (236/236)
- Owner reply state: broad_intent_seen_exact_reply_not_applied
- Source-root state: blocked_until_explicit_owner_reply_and_guards
- Selected root preview: /mnt/archiv/ArchitekturKosmos/Assets
- Selected root exists preview: yes
- Expected session file: `examples/kosmo-references/provenance/source-root-decision-session-2026-06-15.json`
- Queue: 7 steps, executable 0, blocked 7
- Writes now: no
- Public-ready after card: 0

## Exact Owner Reply Template

```text
source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf.
```

## Next Commands After Exact Reply

- `npm run kosmo:owner-unlock-reply-validator -- --answer "source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf."`
- `npm run kosmo:owner-unlock-answer-dry-run -- --answer "source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf."`
- `npm run kosmo:owner-unlock-session-edit-preview`
- `npm run kosmo:owner-unlock-session-edit-preview-check`
- `npm run kosmo:source-root-decision-session-check`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:source-root-activation-preflight`
- `npm run kosmo:source-root-post-owner-activation-queue`
- `npm run kosmo:source-root-post-owner-activation-queue-check`

## Blocked Commands

- `npm run kosmo:private-metadata-inventory`
- `npm run kosmo:private-library-diagnostic -- --roots "<selected-root>"`
- `private OCR/PDF/book extraction`
- `local LLM private-content task assignment`
- `public-ready promotion`

## Worker Notes

- codex: Start with this card, then run checkpoint and queue guards before any private metadata task.
- claude_code: Do not apply the session edit unless the exact owner reply is present and reviewed.
- local_llm: No private-content work is executable from this card.
- kosmo_overseer: Treat this as an operational checklist, not owner approval.

## Hard Stops

- Do not treat broad freeform approval as exact owner reply.
- Do not write intake or session files from this card.
- Do not run private inventory, OCR, embeddings or local LLM private tasks from this card.
- Do not change public-ready state.
