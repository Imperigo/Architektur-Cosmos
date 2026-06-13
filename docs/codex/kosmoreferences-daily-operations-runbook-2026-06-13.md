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
   - Owner Decision Batches.

4. Open the generated report:

   - `docs/codex/kosmodata-lane-sweep-2026-06-13.md`

5. If a narrow rerun is needed, run the KosmoReferences Nightly Gate:

   ```bash
   npm run kosmo:references-nightly-gate
   ```

6. Open the generated reports:

   - `docs/codex/kosmoreferences-nightly-gate-2026-06-13.md`
   - `data/kosmoreferences-data-lane-status.md`

7. If a narrow asset rerun is needed, run the KosmoAsset seed full review:

   ```bash
   npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json
   ```

8. Open the generated report:

   - `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-full-review.generated.md`

## If Nightly Gate Passes

Use the result as the current read-only status:

- `passed_review_only` means the lane is structurally healthy.
- `public_ready_assets: 0` is expected until owner approval and separate promotion review.
- `owner_decision_session_status: passed_pending_owner_input` means the next human blocker is owner decision, not code.
- `asset_full_review_ready_for_human_decisions` means KosmoAsset is structurally healthy but still requires explicit asset human-review decisions.

Then continue with one of these safe work types:

- improve source packages without copying source content;
- add provenance checks;
- add UI visibility for read-only status;
- prepare local-worker task packets;
- improve KosmoAsset review-only library structure;
- complete or refine KosmoAsset generated profiles, handoff bundles and local review worksheets;
- write handoffs for Claude/KosmoOverseer.

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
