# Kosmo Training Eval Review Queue Plan

Generated: 2026-06-30T12:33:54.707Z
Status: `training_eval_review_queue_plan_ready`

## Summary

- Review lanes: 5
- Queue states: 6
- Role assignments: 4
- Templates from template: 6
- Required fields from template: 10
- Rubric suites: 6
- Rubric criteria: 24
- Pilot worker tasks: 12
- Queue items created now: 0
- Approved eval rows now: 0
- Training rows created now: 0
- Public-ready after plan: 0

## Review Lanes

- `candidate_intake`: Accept only structured candidate metadata, never raw private bodies.
- `source_grounding_review`: Check source state, citation basis, uncertainty and invention risk.
- `architecture_quality_review`: Grade architectural depth against rubric criteria.
- `rights_privacy_review`: Confirm rights state, privacy state and public-ready false by default.
- `promotion_decision`: Decide eval-only use, rework or rejection; no training promotion without later owner gate.

## Role Assignments

- `local_llm_worker`: May propose structured placeholders and classifications only; no repo writes, no private text bodies.
- `central_codex_worker`: Primary queue architect, guard author and first review pass for schema, grounding and safety.
- `claude_code_worker`: Second reviewer for implementation quality, Orbit/KosmoOverseer integration and contradiction checks.
- `human_owner`: Approves source-root unlocks, rights-sensitive decisions and any future public/training promotion.

## Promotion Gates

- source_grounding_passed
- architecture_quality_passed
- rights_privacy_passed
- codex_or_claude_review_recorded
- owner_gate_required_before_training_or_public_release

## Hard Stops

- Do not create queue items from this plan.
- Do not copy private source text, OCR/PDF bodies or local worker prose bodies.
- Do not create embeddings or fine-tunes now.
- Do not mark any row public_ready true.
- Do not train from approved_eval_only rows without a later owner-approved training gate.
