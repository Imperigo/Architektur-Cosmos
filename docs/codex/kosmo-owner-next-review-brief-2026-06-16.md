# Kosmo Owner Next Review Brief

Generated: 2026-06-16T17:15:00.191Z
Status: `owner_next_review_brief_clear`

## Summary

- Open batches: 0
- Open items: 0
- Resolved review-only batches: 5
- Resolved review-only items: 16
- Resolution ledger: owner_review_batch_resolution_ledger_ready
- Router: worker_router_private_diagnostic_ready
- Private diagnostic allowed: yes
- Private inventory allowed: yes
- Public-ready after brief: 0

## Review Cards

### 1. Batch A: Villa Savoye Image Candidates

Intent: Decide whether any Villa Savoye image candidate should enter a deeper source/credit review.

Owner question: Soll Villa Savoye Bildmaterial nur blockiert bleiben, oder soll genau ein Bild in eine separate Quellen-/Credit-Pruefung?

Open items: 0
Safe default: `needs_more_source_context`
Decision effect: This card has already been triaged review-only; no public-ready changes are allowed.
Command after decision: `npm run kosmo:owner-decision-session-check`

Recommended stance:
- If no public preview is needed now, leave all three blocked.
- If a preview is needed, open a separate source-basis review before any public-ready change.

### 2. Batch B: Villa Savoye Derived Files

Intent: Keep generated or derived Villa Savoye files from becoming public-facing without source-basis review.

Owner question: Sollen alle abgeleiteten Villa-Dateien blockiert bleiben, bis Plan-/Modell-Herkunft sauber belegt ist?

Open items: 0
Safe default: `keep_blocked`
Decision effect: This card has already been triaged review-only; no public-ready changes are allowed.
Command after decision: `npm run kosmo:owner-decision-session-check`

Recommended stance:
- Record `keep_blocked` unless the owner explicitly starts a source-basis review for this batch.

### 3. Batch C: Model Promotion Confirmation

Intent: Prevent diagrammatic massing/model studies from being presented as measured or source-complete architecture models.

Owner question: Sollen die vorhandenen Modelle weiterhin als diagrammatische Studien blockiert bleiben, bis Modellqualitaet und Quellenbasis geprueft sind?

Open items: 0
Safe default: `needs_more_source_context`
Decision effect: This card has already been triaged review-only; no public-ready changes are allowed.
Command after decision: `npm run kosmo:owner-decision-session-check`

Recommended stance:
- Defer promotion until a separate model-quality and source-confidence review exists.

### 4. Batch D: Sogn Benedetg Source Gap

Intent: Keep the Sogn Benedetg lane honest until the larger private library roots are visible.

Owner question: Soll Sogn Benedetg link-only bleiben, bis der echte private Bibliotheks-Root sichtbar ist?

Open items: 0
Safe default: `needs_more_source_context`
Decision effect: This card has already been triaged review-only; no public-ready changes are allowed.
Command after decision: `npm run kosmo:owner-decision-session-check`

Recommended stance:
- Keep open until the large OneDrive/book/ETH/HSLU library can be indexed or mounted.

### 5. Batch E: KosmoAsset Human Reviews

Intent: Review local-only study assets for Blender, DXF, web and future ArchiCAD workflows without public promotion.

Owner question: Welche lokalen Study-Assets sollen ein Human Review bekommen, ohne Public-Promotion zu erlauben?

Open items: 0
Safe default: `needs-review`
Decision effect: This card has already been triaged review-only; no public-ready changes are allowed.
Command after decision: `npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json`

Recommended stance:
- Use `needs-review` until a named reviewer has opened the local files.
- Use `block-public` for anything that should remain private/local even after local approval.

## Next Actions

- Present one review card at a time to the owner.
- If owner is unavailable, keep safe defaults and do not apply decisions.
- After owner records reference choices, run npm run kosmo:owner-decision-session-check.
- After asset reviewer choices, rerun npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json.
- Always rerun npm run kosmo:data-lane-sweep and npm run kosmo:data-lane-command-router after decision edits.
