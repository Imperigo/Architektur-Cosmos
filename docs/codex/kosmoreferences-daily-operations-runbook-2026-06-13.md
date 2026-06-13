# KosmoReferences Daily Operations Runbook

Generated: 2026-06-13T18:06:00Z
Owner lane: Codex Zentraler Worker
Coordination lane: Claude Code, KosmoOverseer, KosmoOrbit

## Purpose

This runbook is the daily execution order for the KosmoReferences/KosmoAsset data lane. It keeps the local worker useful for repetitive review work while Codex and Claude remain the review, reasoning and safety layer.

## Hard Rules

- Keep all pilot reference media review-only until file-level provenance, rights review and owner decision pass.
- Do not copy protected source contents into public packages.
- Do not mark assets public-ready from a nightly or local-worker run.
- Push small, explicit commits autonomously; stage only files touched by the current task.
- Write a KosmoOrbit handoff whenever Codex changes ArchitectureCosmos or KosmoOrbit behavior.

## Daily Start

1. Check local repository state before editing.
2. Read the newest KosmoOrbit handoffs from `_overseer/intake/inbox`.
3. Run the combined KosmoData Lane Sweep:

   ```bash
   npm run kosmo:data-lane-sweep
   ```

   The sweep is the daily start gate and includes:

   - KosmoReferences Nightly Gate;
   - KosmoAsset Seed Full Review;
   - Human Decision Queue;
   - Owner Decision Batches;
   - Local Worker Output Review;
   - Pilot Evidence Matrix;
   - Villa Savoye Provenance Review Brief;
   - Ingenbohl PDF Extraction Brief;
   - Sogn Benedetg Source-Root Brief;
   - Source Root Locator;
   - Source Root Selection Brief;
   - Source Root Decision Session Check;
   - Private Source Inventory Plan;
   - Private Inventory Output Template;
   - Private Inventory Output Check;
   - Owner Answer Sheet;
   - Owner Answer Sheet Check;
   - Owner Answer Intake Template;
   - Owner Answer Intake Check;
   - Owner Answer Session Edit Plan;
   - Owner Question Brief;
   - Owner Question Brief Check.

4. Open the generated report:

   - `docs/codex/kosmodata-lane-sweep-2026-06-13.md`

5. Refresh the worker command router:

   ```bash
   npm run kosmo:data-lane-command-router
   ```

6. Open the generated router:

   - `docs/codex/kosmo-data-lane-command-router-2026-06-13.md`

7. Refresh the owner next review brief:

   ```bash
   npm run kosmo:owner-next-review-brief
   ```

8. Open the generated owner brief:

   - `docs/codex/kosmo-owner-next-review-brief-2026-06-13.md`

9. Refresh the night loop checkpoint:

   ```bash
   npm run kosmo:night-loop-checkpoint
   ```

10. Open the generated checkpoint:

   - `docs/codex/kosmo-night-loop-checkpoint-2026-06-13.md`

11. Generate the current owner review card:

   ```bash
   npm run kosmo:owner-review-card
   ```

12. Open the generated card:

   - `docs/codex/kosmo-owner-review-card-batch-a-villa-savoye-image-candidates-2026-06-13.md`

13. Generate the full owner review card set:

   ```bash
   npm run kosmo:owner-review-card-set
   ```

14. Open the generated card set:

   - `docs/codex/kosmo-owner-review-card-set-2026-06-13.md`

15. Generate the owner answer sheet:

   ```bash
   npm run kosmo:owner-answer-sheet
   ```

16. Open the generated answer sheet:

   - `docs/codex/kosmo-owner-answer-sheet-2026-06-13.md`

17. Check the owner answer sheet contract:

   ```bash
   npm run kosmo:owner-answer-sheet-check
   ```

18. Open the generated check:

   - `docs/codex/kosmo-owner-answer-sheet-check-2026-06-13.md`

19. Generate the machine-readable owner answer intake template:

   ```bash
   npm run kosmo:owner-answer-intake-template
   ```

20. Check the owner answer intake contract:

   ```bash
   npm run kosmo:owner-answer-intake-check
   ```

21. Open the generated intake files:

   - `docs/codex/kosmo-owner-answer-intake-template-2026-06-13.md`
   - `docs/codex/kosmo-owner-answer-intake-check-2026-06-13.md`

22. Generate the session edit plan:

   ```bash
   npm run kosmo:owner-answer-session-edit-plan
   ```

23. Open the generated plan:

   - `docs/codex/kosmo-owner-answer-session-edit-plan-2026-06-13.md`

24. Generate the owner-facing question brief:

   ```bash
   npm run kosmo:owner-question-brief
   ```

25. Open the generated brief:

   - `docs/codex/kosmo-owner-question-brief-2026-06-13.md`

26. Check the owner-facing question brief:

   ```bash
   npm run kosmo:owner-question-brief-check
   ```

27. Open the generated check:

   - `docs/codex/kosmo-owner-question-brief-check-2026-06-13.md`

28. If a narrow rerun is needed, run the KosmoReferences Nightly Gate:

   ```bash
   npm run kosmo:references-nightly-gate
   ```

29. Open the generated reports:

   - `docs/codex/kosmoreferences-nightly-gate-2026-06-13.md`
   - `data/kosmoreferences-data-lane-status.md`

30. If a narrow asset rerun is needed, run the KosmoAsset seed full review:

   ```bash
   npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json
   ```

31. Open the generated report:

   - `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-full-review.generated.md`

## If Nightly Gate Passes

Use the result as the current read-only status:

- `passed_review_only` means the lane is structurally healthy.
- `public_ready_assets: 0` is expected until owner approval and separate promotion review.
- `owner_decision_session_status: passed_pending_owner_input` means the next human blocker is owner decision, not code.
- `asset_full_review_ready_for_human_decisions` means KosmoAsset is structurally healthy but still requires explicit asset human-review decisions.
- `source_root_owner_selection_needed` means Sogn private inventory, Ingenbohl private PDF extraction and source-dependent asset authoring stay blocked until owner/overseer selects the real private source root.
- `passed_pending_owner_input` on the Source Root Decision Session means no private diagnostic is allowed yet.
- `private_metadata_inventory_blocked` means the inventory sequence is prepared but must not run before a passing recorded source-root decision.
- `private_inventory_output_contract_passed` means the empty output template is structurally safe; real private outputs must still be checked before handoff.
- `worker_router_guarded_review_only` means local workers may only do metadata/review-only work and may not run Git, cloud, public promotion or source-copy actions.
- `owner_next_review_brief_open` means owner questions are prepared in five small batches, but no decision has been recorded.
- `night_loop_guarded_ready` means the next autonomous loop is structurally ready but remains guarded by source-root and owner-decision blockers.
- `owner_review_card_ready` means exactly one owner discussion card is prepared; it still records no decision and permits no public-ready change.
- `owner_review_card_set_ready` means all five owner discussion cards are prepared as a safe question set; it still records no decisions and keeps `public_ready_after_set: 0`.
- `owner_answer_sheet_ready` means source-root and owner-card answers can be captured quickly; it still writes no session files and keeps `public_ready_after_sheet: 0`.
- `owner_answer_sheet_guard_passed` means the answer sheet contract matches the source-root/card/decision sessions with no failures and no public-ready change.
- `owner_answer_intake_template_pending_owner_input` means the machine-readable intake file is ready but contains no owner answers yet.
- `owner_answer_intake_guard_passed_pending_owner_input` means the intake contract is valid and waiting for owner answers.
- `owner_answer_session_edit_plan_pending_owner_input` means the edit-plan layer is ready, but no session edit is planned until checked owner intake exists.
- `owner_question_brief_ready` means the next owner-facing question block is ready; it still records no decisions.
- `owner_question_brief_guard_passed` means the owner-facing question block matches the answer-sheet source and is safe to present.

Then continue with one of these safe work types:

- improve source packages without copying source content;
- add provenance checks;
- add UI visibility for read-only status;
- prepare local-worker task packets;
- improve KosmoAsset review-only library structure;
- complete or refine KosmoAsset generated profiles, handoff bundles and local review worksheets;
- write handoffs for Claude/KosmoOverseer.

## Source Root Blocker

Before any private source inventory or source-dependent asset authoring:

1. Check `docs/codex/kosmo-source-root-selection-brief-2026-06-13.md`.
2. Record the selected decision in `examples/kosmo-references/provenance/source-root-decision-session-2026-06-13.json`.
3. Validate it:

   ```bash
   npm run kosmo:source-root-decision-session-check
   ```

4. Owner/Claude/KosmoOverseer must select or mount the real private book/ETH/HSLU source root.
5. Only if the check reports private diagnostic allowed, run:

   ```bash
   npm run kosmo:private-library-diagnostic -- --roots "<selected-root>"
   ```

6. Refresh the private source inventory plan:

   ```bash
   npm run kosmo:private-source-inventory-plan
   ```

7. Create/check the private inventory output contract:

   ```bash
   npm run kosmo:private-inventory-output-template
   npm run kosmo:private-inventory-output-check -- --inventory "<private-inventory-json>"
   ```

8. Only then open a private metadata-only inventory task under KosmoZentrale.

Until this happens, keep blocked:

- Sogn private source inventory;
- Ingenbohl PDF private extraction;
- source-dependent asset authoring;
- public-ready promotion from private sources.

## If Owner Decisions Are Needed

First generate or refresh the owner batch plan:

```bash
npm run kosmo:human-decision-owner-batches
```

Use:

- `docs/codex/kosmo-human-decision-owner-batches-2026-06-13.md`
- `data/kosmo-human-decision-owner-batches-2026-06-13.json`

Present one batch at a time. Do not ask the owner to resolve all open decisions in one pass.

Then generate the detailed worksheet when a batch is ready for explicit decisions:

```bash
npm run kosmo:owner-decision-worksheet
```

Use:

- `docs/codex/kosmoreferences-owner-decision-worksheet-2026-06-13.md`

After owner choices are entered into:

- `examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json`

run:

```bash
npm run kosmo:owner-decision-session-check
```

Only after this check passes with recorded decisions may Codex/Claude prepare a separate promotion review.

## Local Worker Lane

Use the local model for repetitive, low-risk analysis:

- gap maps;
- checklist completion;
- source-link summaries;
- asset candidate inventories;
- review-only draft comparisons.

Current local worker:

- `kosmo-qwen3-coder:30b-a3b-q4km`
- API route: Ollama HTTP API
- smoke command: `npm run kosmo:local-worker-ollama-smoke`

Do not send private book excerpts or protected source bodies into public repo outputs. Private packets stay under KosmoZentrale worker packet paths.

## Codex/Claude Review Lane

Codex and Claude should review the local worker output for:

- rights mistakes;
- hallucinated source claims;
- ungrounded public-ready assumptions;
- mismatched file paths;
- missing provenance evidence;
- incorrect separation between KosmoReferences and KosmoAsset.

Any code or manifest change by Codex must be visible to Claude through a handoff in:

- `/mnt/data/ArchitekturKosmos/Code/KosmoOrbit/_overseer/intake/inbox`

Mirror local-only notes to:

- `/mnt/data/ArchitekturKosmos/KosmoOrbit/_overseer/intake/inbox`

## Promotion Gate

Promotion requires all of the following:

1. Nightly Gate passing.
2. Owner decision session recorded and passing.
3. File-level provenance passing for the specific file.
4. Rights candidate check passing for the specific file.
5. Separate Codex/Claude review of the exact manifest or command.
6. Explicit public-ready change committed as its own small commit.

Until then, status remains:

- `review-only`
- `public_ready_assets: 0`

## End Of Daily Loop

Before stopping:

1. Re-run the narrow check touched by the work.
2. Commit and push the scoped change.
3. Write a KosmoOrbit handoff.
4. Keep unresolved owner/private-library blockers explicit in the report.
