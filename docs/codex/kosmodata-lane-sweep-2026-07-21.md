# KosmoData Lane Sweep

Generated: 2026-07-21T15:50:11.087Z
Status: `kosmodata_lane_sweep_review_only_passed`

## Summary

- Steps passed: 29/29
- Duration: 30634ms
- KosmoReferences: passed_review_only (10/10)
- References public-ready assets: 0
- References owner pending: 10
- Private library: missing_report
- Private library sync errors: 0
- KosmoAsset: asset_full_review_ready_for_human_decisions (10/10)
- KosmoAsset open human reviews: 6
- KosmoAsset public-ready assets: 0
- KosmoAsset promotion allowed: no
- KosmoAsset promotion blockers: 18
- Human decision queue: human_decision_queue_open
- Human decision open items: 16
- Human decision split: 10 references / 6 assets
- Owner decision batches: owner_decision_batches_open
- Owner decision batches open: 5/5
- Owner decision batch items open: 16
- Local worker review: local_worker_outputs_present_review_only
- Local worker outputs: 9/9
- Local worker missing outputs: 0
- Local worker invalid JSON outputs: 0
- Local worker high-risk hits: 0
- Local worker public-ready allowed: no
- Pilot evidence matrix: pilot_evidence_matrix_review_only
- Pilot evidence pilots: 3
- Pilot evidence gaps: 12
- Pilot media slots blocked: 12
- Pilot asset candidates blocked: 9
- Pilot evidence public-ready assets: 0
- Villa brief: villa_provenance_review_brief_ready
- Villa candidates/blocked: 3/4
- Villa public-ready after brief: 0
- Ingenbohl brief: ingenbohl_pdf_extraction_decision_needed
- Ingenbohl PDF links: 1
- Ingenbohl public-ready after brief: 0
- Sogn brief: sogn_source_root_decision_needed
- Sogn public links/local files: 4/0
- Sogn public-ready after brief: 0
- Source-root locator: source_root_candidates_need_owner_selection
- Source-root locator probable/candidates: 0/1561
- Source-root locator mirrors/sync roots: 71/5
- Source-root selection: source_root_owner_selection_needed
- Source-root selection options: 10
- Source-root selection public-ready after brief: 0
- Source-root decision session: passed_pending_owner_input
- Source-root selected decision: pending
- Source-root selected root exists: false
- Source-root private diagnostic allowed: no
- Source-root decision public-ready after session: 0
- Private source inventory plan: private_metadata_inventory_blocked
- Private source inventory allowed: no
- Private source inventory public-ready after plan: 0
- Private inventory template: private_inventory_template_only
- Private inventory template pilots: 3
- Private inventory template public-ready after inventory: 0
- Private inventory output check: private_inventory_output_contract_passed
- Private inventory output check pilots: 3
- Private inventory output check failures/public-ready hits: 0/0
- Owner answer sheet: owner_answer_sheet_ready
- Owner answer sheet source-root options: 10
- Owner answer sheet cards/items: 5/16
- Owner answer sheet reference decisions: 10
- Owner answer sheet public-ready after sheet: 0
- Owner answer sheet check: owner_answer_sheet_guard_passed
- Owner answer sheet check failures/warnings: 0/0
- Owner answer sheet check public-ready after guard: 0
- Owner answer intake template: owner_answer_intake_template_pending_owner_input
- Owner answer intake template cards/reference decisions: 5/10
- Owner answer intake template public-ready after intake: 0
- Owner answer intake check: owner_answer_intake_guard_passed_pending_owner_input
- Owner answer intake check filled answers: 0
- Owner answer intake check failures/warnings: 0/0
- Owner answer intake check public-ready after guard: 0
- Owner answer session edit plan: owner_answer_session_edit_plan_pending_owner_input
- Owner answer session edit planned edits: 0
- Owner answer session edit public-ready after plan: 0
- Owner review batch resolution ledger: owner_review_batch_resolution_ledger_pending_owner_input
- Owner review batch resolution ledger resolved batches/items: 0/0
- Owner review batch resolution ledger check: owner_review_batch_resolution_ledger_guard_passed, failures 0
- Owner next review brief: owner_next_review_brief_open
- Owner next review open batches/items: 5/16
- Owner next review resolved batches review-only: 0
- Owner question brief: owner_question_brief_ready
- Owner question brief questions: 6
- Owner question brief public-ready after brief: 0
- Owner question brief check: owner_question_brief_guard_passed
- Owner question brief check failures/warnings: 0/0
- Owner question brief check public-ready after guard: 0
- Owner review packet: null
- Owner review packet questions: null
- Owner review packet filled answers/planned edits: null/null
- Owner review packet public-ready after packet: null
- Owner review packet check: null
- Owner review packet check failures/warnings: null/null
- Owner review packet check public-ready after guard: null
- Owner review session brief: null
- Owner review session brief questions: null
- Owner review session prior signals recordable/total: null/null
- Owner review session public-ready after brief: null
- Owner review session brief check: null
- Owner review session brief check failures/warnings: null/null
- Owner review session brief check public-ready after guard: null

## Steps

| Step | Status | Duration | Report |
| --- | --- | ---: | --- |
| KosmoReferences Nightly Gate | passed | 20766ms | `data/kosmoreferences-nightly-gate-2026-07-21.json` |
| KosmoAsset Seed Full Review | passed | 3400ms | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-full-review.generated.json` |
| Human Decision Queue | passed | 223ms | `data/kosmo-human-decision-queue-2026-07-21.json` |
| Owner Decision Batches | passed | 229ms | `data/kosmo-human-decision-owner-batches-2026-07-21.json` |
| Owner Next Review Brief | passed | 224ms | `data/kosmo-owner-next-review-brief-2026-07-21.json` |
| Owner Review Card Set | passed | 226ms | `data/kosmo-owner-review-card-set-2026-07-21.json` |
| Local Worker Task Pack Refresh | passed | 224ms | `data/kosmo-local-worker-task-pack-2026-07-21.json` |
| Pilot Evidence Matrix | passed | 230ms | `data/kosmoreferences-pilot-evidence-matrix-2026-07-21.json` |
| Villa Savoye Provenance Review Brief | passed | 223ms | `data/villa-savoye-provenance-review-brief-2026-07-21.json` |
| Ingenbohl PDF Extraction Brief | passed | 222ms | `data/ingenbohl-pdf-extraction-decision-brief-2026-07-21.json` |
| Sogn Benedetg Source-Root Brief | passed | 220ms | `data/sogn-benedetg-source-root-decision-brief-2026-07-21.json` |
| Source Root Locator | passed | 615ms | `data/kosmo-source-root-locator-2026-07-21.json` |
| Source Root Selection Brief | passed | 229ms | `data/kosmo-source-root-selection-brief-2026-07-21.json` |
| Source Root Decision Session Create | passed | 220ms | `examples/kosmo-references/provenance/source-root-decision-session-2026-07-21.json` |
| Source Root Decision Session Refresh | passed | 224ms | `data/kosmo-source-root-decision-session-refresh-2026-07-21.json` |
| Source Root Decision Session Check | passed | 224ms | `data/kosmo-source-root-decision-session-check-2026-07-21.json` |
| Private Source Inventory Plan | passed | 226ms | `data/kosmo-private-source-inventory-plan-2026-07-21.json` |
| Private Inventory Output Template | passed | 221ms | `examples/kosmo-references/private-inventory/private-inventory-output-template-2026-07-21.json` |
| Private Inventory Output Check | passed | 235ms | `data/kosmo-private-inventory-output-check-2026-07-21.json` |
| Owner Answer Sheet | passed | 225ms | `data/kosmo-owner-answer-sheet-2026-07-21.json` |
| Owner Answer Sheet Check | passed | 225ms | `data/kosmo-owner-answer-sheet-check-2026-07-21.json` |
| Owner Answer Intake Template | passed | 222ms | `examples/kosmo-references/provenance/owner-answer-intake-template-2026-07-21.json` |
| Owner Answer Intake Check | passed | 221ms | `data/kosmo-owner-answer-intake-check-2026-07-21.json` |
| Owner Answer Session Edit Plan | passed | 228ms | `data/kosmo-owner-answer-session-edit-plan-2026-07-21.json` |
| Owner Review Batch Resolution Ledger | passed | 225ms | `data/kosmo-owner-review-batch-resolution-ledger-2026-07-21.json` |
| Owner Review Batch Resolution Ledger Check | passed | 222ms | `data/kosmo-owner-review-batch-resolution-ledger-check-2026-07-21.json` |
| Local Worker Output Review | passed | 230ms | `data/kosmo-local-worker-output-review-2026-07-21.json` |
| Owner Question Brief | passed | 226ms | `data/kosmo-owner-question-brief-2026-07-21.json` |
| Owner Question Brief Check | passed | 226ms | `data/kosmo-owner-question-brief-check-2026-07-21.json` |

## Next Actions

- Owner resolves 10 KosmoReferences decisions before public promotion review.
- Complete 6 KosmoAsset human reviews before local approvals or sandbox certificates.
- Use 5 owner decision batches for review rounds instead of asking all open items at once.
- Track 12 pilot evidence gaps across Villa Savoye, Sogn Benedetg and Ingenbohl.
- Keep 4 Villa Savoye files blocked until source-basis/build-log review exists.
- Decide whether Ingenbohl PDF remains link-only or enters private metadata-only extraction.
- Keep Sogn Benedetg link-only until the real private source root is visible and inventoried.
- Select or mount the real source root; source-root locator has 0 probable large private libraries.
- Use the source-root selection brief before any private inventory or source-dependent authoring.
- Record the source-root decision session before any private diagnostic.
- Use the private source inventory plan only as a blocked next-step contract until source-root selection passes.
- Validate any future private inventory JSON with npm run kosmo:private-inventory-output-check before handoff.
- Use the owner answer sheet to capture Source-Root and Owner Card answers without editing session files prematurely.
- Keep owner answer sheet changes behind the guard before any decision-session edit.
- Use the owner answer intake template for machine-readable owner answers only after explicit confirmation.
- Owner answer intake is structurally ready and waiting for owner input.
- Session edit plan is ready and waiting for non-empty checked owner intake.
- Use the owner question brief for the next 6 owner questions.
- Owner question brief guard passed; present questions without treating answers as decisions.
- Expose or mount the real large private book/ETH/HSLU library root.
- Keep public-ready assets at 0 until separate owner and promotion reviews pass.
