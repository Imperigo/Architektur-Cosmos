# Kosmo Autonomous Batch Status

Generated: 2026-06-13 20:55 CEST
Owner lane: Codex Zentraler Worker
Coordination lane: Claude Code, KosmoOverseer, KosmoOrbit

## Current Gate State

- KosmoData Lane Sweep: `kosmodata_lane_sweep_review_only_passed`
- Sweep steps: 4/4
- KosmoReferences Nightly Gate: `passed_review_only`
- KosmoAsset Seed Full Review: `asset_full_review_ready_for_human_decisions`
- Human Decision Queue: `human_decision_queue_open`
- Owner Decision Batches: `owner_decision_batches_open`
- Public-ready assets: 0

## What Changed In This Batch

Owner review flow:

- Created owner-friendly decision batches from the 16 open human decisions.
- Added `npm run kosmo:human-decision-owner-batches`.
- Integrated owner batches into the 4-step `npm run kosmo:data-lane-sweep`.
- Added owner review agenda for a future batchwise question round.

Local worker:

- Refreshed the Kosmo/Odysseus local worker task pack and startprompt.
- Added owner-batch review question task.
- Ran local worker once and stored a corrected private output:
  `/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/kosmo-local-worker-2026-06-13/owner-batch-review-questions.private.md`
- Overseer note: raw local worker wording was not safe enough for public-approval framing; Codex corrected it before storage.

Private library:

- Extended the private-library diagnostic with OneDrive sync error counts.
- Current visible OneDrive/Home mirror has 30 sync error marker files.
- Added private-library sync/mount checklist.
- Added sync error visibility to KosmoReferences status card, KosmoData sweep and KosmoOrbit DataPanel.

KosmoOrbit:

- DataPanel now shows:
  - 4/4 Data-Lane Sweep;
  - Human Decisions open;
  - Owner Batches open;
  - 30 OneDrive Sync-Errors;
  - current sweep/nightly/local-worker timings.

## Current Blockers

1. Owner decisions remain open: 16/16.
2. Owner Decision Batches remain open: 5/5.
3. Large private book/ETH/HSLU library is not visible.
4. `/mnt/archiv` is not visible as its own archive HDD mount.
5. Home OneDrive mirror has 30 sync error marker files.
6. Six KosmoAsset human reviews remain open.

## Safe Next Work

Do next, in this order:

1. Resolve storage/sync question for the real private library root.
2. Re-run `npm run kosmo:private-library-diagnostic`.
3. Re-run `npm run kosmo:data-lane-sweep`.
4. If the library becomes visible, create a private source inventory for Sogn Benedetg, ETH and HSLU material.
5. If owner review is desired before library sync, use `docs/codex/kosmo-owner-review-agenda-2026-06-13.md` and ask only one batch at a time.

## Commands Verified

ArchitectureCosmos:

```bash
node --check scripts/kosmo-data-lane-sweep.mjs
npm run kosmo:data-lane-sweep
```

KosmoOrbit:

```bash
npm test -- --run
npm run lint
npm run build
```

## Safety Position

No decisions were applied. No public media or models were promoted. No D1/R2/cloud state was written. Public-ready remains 0.
