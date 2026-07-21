# Kosmo Owner Review Card Set

Generated: 2026-07-21T15:50:05.509Z
Status: `owner_review_card_set_ready`

## Summary

- Cards: 5
- Open items: 16
- First card: `batch-a-villa-savoye-image-candidates`
- Public-ready after set: 0

## Cards

### 1. Batch A: Villa Savoye Image Candidates

Question: Soll Villa Savoye Bildmaterial nur blockiert bleiben, oder soll genau ein Bild in eine separate Quellen-/Credit-Pruefung?

- Batch: `batch-a-villa-savoye-image-candidates`
- Items: 3
- Safe default: `needs_more_source_context`
- Public-ready after card: 0
- Options: `keep_all_blocked`, `open_one_source_credit_review`, `needs_more_context`
- Command after decision: `npm run kosmo:owner-decision-session-check`

### 2. Batch B: Villa Savoye Derived Files

Question: Sollen alle abgeleiteten Villa-Dateien blockiert bleiben, bis Plan-/Modell-Herkunft sauber belegt ist?

- Batch: `batch-b-villa-savoye-derived-files`
- Items: 4
- Safe default: `keep_blocked`
- Public-ready after card: 0
- Options: `use_safe_default`, `open_separate_review`, `needs_more_context`
- Command after decision: `npm run kosmo:owner-decision-session-check`

### 3. Batch C: Model Promotion Confirmation

Question: Sollen die vorhandenen Modelle weiterhin als diagrammatische Studien blockiert bleiben, bis Modellqualitaet und Quellenbasis geprueft sind?

- Batch: `batch-c-model-promotion-confirmation`
- Items: 2
- Safe default: `needs_more_source_context`
- Public-ready after card: 0
- Options: `use_safe_default`, `open_separate_review`, `needs_more_context`
- Command after decision: `npm run kosmo:owner-decision-session-check`

### 4. Batch D: Sogn Benedetg Source Gap

Question: Soll Sogn Benedetg link-only bleiben, bis der echte private Bibliotheks-Root sichtbar ist?

- Batch: `batch-d-sogn-benedetg-source-gap`
- Items: 1
- Safe default: `needs_more_source_context`
- Public-ready after card: 0
- Options: `use_safe_default`, `open_separate_review`, `needs_more_context`
- Command after decision: `npm run kosmo:owner-decision-session-check`

### 5. Batch E: KosmoAsset Human Reviews

Question: Welche lokalen Study-Assets sollen ein Human Review bekommen, ohne Public-Promotion zu erlauben?

- Batch: `batch-e-kosmoasset-human-reviews`
- Items: 6
- Safe default: `needs-review`
- Public-ready after card: 0
- Options: `keep_needs_review`, `assign_named_human_review`, `block_public`
- Command after decision: `npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json`

## Next Actions

- Present one card at a time.
- If owner is unavailable, keep every card at safe default.
- After reference decisions, run npm run kosmo:owner-decision-session-check.
- After asset decisions, run npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json.
- After any decision edit, rerun sweep, router and night-loop checkpoint.
