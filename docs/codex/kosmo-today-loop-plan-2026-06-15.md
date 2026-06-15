# Kosmo Today Loop Plan

Generated: 2026-06-15T18:14:52.943Z
Status: `today_loop_plan_ready`

## Summary

- Execution mode: source_free_path_b
- Current blocker: source_root_owner_confirmation_pending
- Loop until: 2026-06-15T18:00:00+02:00
- Tick max: 2 minutes
- Checkup interval: 3 minutes
- Data lane: kosmodata_lane_sweep_review_only_passed (24/24)
- Router: worker_router_guarded_review_only
- Worker boundary guard: worker_boundary_pack_guard_passed
- Conversion evidence ledger: local_worker_innovation_conversion_evidence_ledger_ready
- Source-root unlocked: no
- Public-ready after plan: 0

## Morning Routine

- `npm run kosmo:data-lane-sweep`
- `npm run kosmo:data-lane-command-router`
- `npm run kosmo:worker-boundary-pack`
- `npm run kosmo:worker-boundary-pack-check`
- `npm run kosmo:owner-review-session-brief && npm run kosmo:owner-review-session-brief-check`
- `npm run kosmo:overseer-sync-board && npm run kosmo:overseer-sync-board-check`

## Work Blocks

### local_worker_conversion_governance

- Lane: local-worker-kosmo-prepare-kosmoasset
- Objective: Keep the local-worker output path executable only through validator, review, preview, apply guard and evidence ledger.
- First commands: `npm run kosmo:local-worker-innovation-output-validator`, `npm run kosmo:local-worker-innovation-output-validator-check`, `npm run kosmo:local-worker-innovation-post-output-intake-review`, `npm run kosmo:local-worker-innovation-post-output-intake-review-check`, `npm run kosmo:local-worker-innovation-human-overseer-review-decision-card`, `npm run kosmo:local-worker-innovation-human-overseer-review-decision-card-check`, `npm run kosmo:local-worker-innovation-conversion-plan-preview`, `npm run kosmo:local-worker-innovation-conversion-plan-preview-check`, `npm run kosmo:local-worker-innovation-conversion-apply-guard`, `npm run kosmo:local-worker-innovation-conversion-apply-guard-check`, `npm run kosmo:local-worker-innovation-conversion-evidence-ledger`, `npm run kosmo:local-worker-innovation-conversion-evidence-ledger-check`
- Acceptance: all local-worker conversion gates remain green; no worker body copied into git; no repo derivative or training row created; public-ready remains 0

### innovation_scout

- Lane: kosmo-prepare-kosmoreferences-kosmoasset
- Objective: Check current primary-source code and model candidates that can accelerate ArchitekturKosmos without installing or touching private data.
- First commands: `npm run kosmo:daily-innovation-scout`, `npm run kosmo:daily-innovation-scout-check`, `npm run kosmo:innovation-github-watchlist`, `npm run kosmo:innovation-github-watchlist-check`, `npm run kosmo:innovation-github-discovery`, `npm run kosmo:innovation-github-discovery-check`, `npm run kosmo:innovation-github-review-queue`, `npm run kosmo:innovation-github-review-queue-check`, `npm run kosmo:innovation-github-readme-signal-scan`, `npm run kosmo:innovation-github-readme-signal-scan-check`, `npm run kosmo:innovation-github-fixture-contract-plan`, `npm run kosmo:innovation-github-fixture-contract-plan-check`, `npm run kosmo:innovation-github-fixture-skeletons`, `npm run kosmo:innovation-github-fixture-skeletons-check`, `npm run kosmo:innovation-github-fixture-payloads`, `npm run kosmo:innovation-github-fixture-payloads-check`, `npm run kosmo:innovation-github-fixture-payload-smoke`, `npm run kosmo:innovation-github-fixture-payload-smoke-check`, `npm run kosmo:innovation-github-worker-integration-signal-bridge`, `npm run kosmo:innovation-github-worker-integration-signal-bridge-check`
- Acceptance: Scout report exists; all candidates mapped to lanes; GitHub fixture skeletons/payloads/smoke are review-only ready; no install/private-read/training action enabled

### references_schema_hardening

- Lane: kosmoreferences
- Objective: Tighten source-free pilot package contracts for Villa Savoye, Sogn Benedetg and Ingenbohl.
- First commands: `npm run kosmo:pilot-gap-label-review`, `npm run kosmo:pilot-gap-label-review-check`, `npm run kosmo:pilot-intake-readiness-pack`, `npm run kosmo:pilot-intake-readiness-pack-check`
- Acceptance: pilot gaps have machine labels; intake readiness remains review-only; public-ready remains 0

### asset_schema_hardening

- Lane: kosmoasset
- Objective: Prepare review-only asset intake from reference candidates without public release.
- First commands: `npm run kosmo:asset-source-candidate-map`, `npm run kosmo:asset-candidate-taxonomy-review`, `npm run kosmo:asset-candidate-taxonomy-review-check`, `npm run kosmo:asset-intake-readiness-pack`, `npm run kosmo:asset-intake-readiness-pack-check`
- Acceptance: asset candidates remain review-only; rights/owner fields explicit; local worker can classify metadata only

### training_eval_readiness

- Lane: kosmo-training
- Objective: Keep future Kosmo training data honest before private ingestion: rubric, row template, review queue and ontology.
- First commands: `npm run kosmo:training-eval-rubric-pack`, `npm run kosmo:training-eval-rubric-pack-check`, `npm run kosmo:training-eval-row-template`, `npm run kosmo:training-eval-row-template-check`, `npm run kosmo:training-eval-review-queue-plan`, `npm run kosmo:training-eval-review-queue-plan-check`, `npm run kosmo:architecture-ontology-seed`, `npm run kosmo:architecture-ontology-seed-check`
- Acceptance: no raw private text fields; evaluation gates explicit; ontology fields map to references/assets

### orbit_and_handoff

- Lane: kosmoorbit-overseer-sync
- Objective: Expose today status in Orbit and mirror handoff for Claude/KosmoOverseer.
- First commands: `npm run kosmo:orbit-status-bridge`, `npm run kosmo:overseer-sync-board`, `npm run kosmo:overseer-sync-board-check`
- Acceptance: Orbit bridge updated; handoff mirrored; checks pass before commit/push

## Path A If Owner Confirms Source Root

- `npm run kosmo:owner-unlock-reply-validator -- --answer "<owner_reply>"`
- `npm run kosmo:owner-unlock-answer-dry-run -- --answer "<owner_reply>"`
- `npm run kosmo:source-root-decision-session-check`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:source-root-activation-preflight`
- `npm run kosmo:source-root-post-owner-activation-queue`
- `npm run kosmo:source-root-post-owner-activation-queue-check`
- `npm run kosmo:private-metadata-inventory`
- `npm run kosmo:private-metadata-inventory-check`

## Path B While Blocked

- Continue source-free schema, guard, eval, Orbit and handoff work.
- Do not scan private books, plans, PDFs, OCR text, OneDrive libraries or archive roots.
- Use public/current technical research only for planning and isolated experiments.
- Use Notion or project notes only for planning context; do not copy private-source bodies into Git.
- Commit only repo-safe metadata, docs, scripts and checks.

## Handoff Notes

- Codex may add clearly named Codex-owned reports and scripts.
- Codex must label any change that affects Claude/KosmoOverseer files.
- Local LLM work stays metadata-review-only until Source Root and owner gates pass.
