# Kosmo Evening Batch Acceptance Certificate Check

Generated: 2026-06-16T18:00:53.039Z
Status: `evening_batch_acceptance_certificate_guard_failed`

## Summary

- Checks: 16/19
- Failures: 3
- Warnings: 0
- Public-ready after check: 0

## Checks

- failed: `status_ready` - evening_batch_acceptance_certificate_needs_review
- passed: `policy_certificate_only` - true
- passed: `policy_no_private_reads` - false
- passed: `policy_no_decisions` - false
- passed: `policy_no_inventory` - false
- passed: `policy_no_workers` - false
- passed: `policy_no_eval_rows` - false
- passed: `policy_no_training` - false
- passed: `public_ready_zero` - 0
- passed: `five_guard_families` - 5
- failed: `all_known_guards_passed` - 140/149
- passed: `latest_handoff_current` - 333
- passed: `owner_reply_pending` - pending
- failed: `guard_families_no_failures` - vision_roadmap,evening_rollup,next_shift,owner_unlock_checkpoint
- passed: `acceptance_mentions_source_free` - Evening batch is accepted as source-free, review-only, handoff-synced and blocked on explicit owner source-root reply.
- passed: `hard_stop_not_owner_approval` - do not treat this certificate as owner approval. do not run private inventory, ocr, embeddings, fine-tuning or local worker execution from this certificate. do not create eval rows or queue items from this certificate. keep public-ready at 0.
- passed: `hard_stop_blocks_private_and_training` - do not treat this certificate as owner approval. do not run private inventory, ocr, embeddings, fine-tuning or local worker execution from this certificate. do not create eval rows or queue items from this certificate. keep public-ready at 0.
- passed: `hard_stop_blocks_eval_queue` - do not treat this certificate as owner approval. do not run private inventory, ocr, embeddings, fine-tuning or local worker execution from this certificate. do not create eval rows or queue items from this certificate. keep public-ready at 0.
- passed: `hard_stop_public_ready_zero` - do not treat this certificate as owner approval. do not run private inventory, ocr, embeddings, fine-tuning or local worker execution from this certificate. do not create eval rows or queue items from this certificate. keep public-ready at 0.
