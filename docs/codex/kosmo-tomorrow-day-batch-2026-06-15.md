# Kosmo Tagesauftrag 2026-06-16

Generated: 2026-06-15T14:22:25.148Z
Status: `tomorrow_day_batch_ready`

## Summary

- Execution mode: source_free_path_until_exact_owner_unlock
- Source-root unlocked: no
- Owner unlock components: 11/11
- Owner unlock guards: 115/115
- Acceptance known checks: -
- Source queue: source_independent_work_queue_ready
- Codex executable now: 0
- Open owner actions: 2
- Live GitHub probe: 9/9
- Latest handoff: 240
- Public-ready after plan: 0

## Policy

- Max tick minutes: 2
- Checkup interval minutes: 3
- No idle wait between tasks: true
- Reads private content now: false
- Installs or downloads now: false

## Start Sequence

- `git status --short in ArchitectureCosmos and KosmoOrbit`
- `npm run kosmo:innovation-github-watchlist`
- `npm run kosmo:innovation-github-watchlist-check`
- `npm run kosmo:innovation-github-discovery`
- `npm run kosmo:innovation-github-discovery-check`
- `npm run kosmo:innovation-github-review-queue`
- `npm run kosmo:innovation-github-review-queue-check`
- `npm run kosmo:codex-daily-loop-routine`
- `npm run kosmo:codex-daily-loop-routine-check`
- `npm run kosmo:owner-unlock-pipeline-checkpoint`
- `npm run kosmo:owner-unlock-pipeline-checkpoint-check`
- `npm run kosmo:source-independent-work-queue`
- `npm run kosmo:owner-remaining-decision-brief`
- `npm run kosmo:owner-remaining-decision-brief-check`

## Path A If Exact Owner Unlock Reply Is Present

- `npm run kosmo:owner-unlock-prompt-pack-check`
- `npm run kosmo:owner-unlock-reply-validator -- --answer "<owner_reply>"`
- `npm run kosmo:owner-unlock-answer-dry-run -- --answer "<owner_reply>"`
- `npm run kosmo:source-root-decision-session-check`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:source-root-activation-preflight`
- `npm run kosmo:source-root-post-owner-activation-queue`
- `npm run kosmo:source-root-post-owner-activation-queue-check`

## After Path A Clean Only

- `npm run kosmo:private-metadata-inventory`
- `npm run kosmo:private-metadata-inventory-check`
- `npm run kosmo:pilot-intake-readiness-pack`
- `npm run kosmo:pilot-intake-readiness-pack-check`

## Path B If Still Blocked

- `live_innovation_scout`: Refresh upstream GitHub candidates and keep installs/downloads gated.
- `guard_cleanup`: Tighten source-root, public-ready and worker-boundary guards where ambiguity remains.
- `orbit_visibility`: Refresh Orbit status bridge and overseer sync board after any source-free guard work.
- `owner_review_packet`: Keep the exact owner decisions visible and answerable without exposing private content.
- `handoff_and_push`: Mirror handoffs to KosmoOrbit, run lint/security and push exact staged files.

## Acceptance Criteria

- Source Root either explicitly validated or cleanly blocked.
- No private PDFs, scans, OCR text, embeddings, training rows or protected assets in Git.
- No local worker execution, installation or model download without explicit batch gate.
- Live GitHub scout runs as watchlist-only and reports live/fallback probe counts.
- Claude/KosmoOverseer handoff is mirrored when shared state changes.
- ArchitectureCosmos and KosmoOrbit are pushed after verified blocks.

## Start Sentence

> Weiter mit docs/codex/kosmo-tomorrow-day-batch-2026-06-15.md. Zuerst Live-GitHub-Scout und Owner-Unlock-Checkpoint ausfuehren, dann Path A nur bei exakter Owner-Antwort.
