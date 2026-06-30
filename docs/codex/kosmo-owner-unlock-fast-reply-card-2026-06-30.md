# Kosmo Owner Unlock Fast Reply Card

Generated: 2026-06-30T07:03:53.158Z
Status: `owner_unlock_fast_reply_card_ready`

## Summary

- Answer present: no
- Broad unlock intent: no
- Validator status: owner_unlock_reply_validator_pending_owner_reply
- Applies decision now: no
- Public-ready after card: 0

## Recommended Reply If Exact Root Is True

- `source_root_choice=select_exact_root_1`
- `confirmed_exact_root=yes`
- `review_batches=all_review_only`
- `note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf.`

## Safe Default Reply

- `source_root_choice=repair_onedrive_first`
- `confirmed_exact_root=no`
- `review_batches=none`
- `note=Quelle bleibt blockiert, bis die vollstaendige private Architekturquelle bestaetigt ist.`

## Next Actions

- Owner can send exactly one of the reply blocks.
- After an exact reply, rerun owner-unlock-reply-validator and owner-unlock-answer-dry-run.
- Only after those pass may source-root activation preflight run.

## Hard Stops

- Do not treat this card as owner approval.
- Do not rewrite the owner reply automatically.
- Do not edit intake/session files from this card.
- Do not read private content.
- Keep public-ready at 0.
