# Claude/KosmoOverseer Implementation Intake

Generated: 2026-06-16T18:10:30Z
Status: `claude_kosmooverseer_implementation_intake_ready`

## Purpose

This package is the current Codex state prepared for Claude Code and KosmoOverseer. It condenses the evening batch, cross-worker reviews, owner-unlock state and tomorrow start line into one implementation intake.

## Current Repo Heads

- ArchitectureCosmos: `ccc539e`
- KosmoOrbit: `b15c639`

## Read First

- `docs/codex/kosmo-tomorrow-day-batch-2026-06-16.md`
- `docs/codex/kosmo-owner-unlock-operational-start-card-2026-06-16.md`
- `docs/codex/kosmo-cross-worker-delta-audit-2026-06-16.md`
- `docs/codex/kosmo-overseer-sync-board-2026-06-16.md`
- `docs/codex/kosmo-evening-batch-acceptance-certificate-2026-06-16.md`
- `docs/codex/kosmo-cross-worker-commit-review-2026-06-16.md`
- `docs/codex/kosmo-cross-worker-commit-review-2-2026-06-16.md`

## Latest Handoffs

- 337: Owner Unlock Operational Start Card
- 336: Cross-Worker Audit Ledger
- 335: Cross-Worker Review 2
- 334: Evening Rollup Needs Review
- 333: Cross-Worker Commit Review
- 332: Abendbatch Zusatz-Audits
- 331: Abendbatch Execution
- 330: Grosser Abendbatch

## Implementation Tasks

1. Ingest Codex handoffs 330-337 into KosmoOverseer as the current Codex state.
2. Surface the Owner Unlock Operational Start Card as the next owner-facing decision point.
3. Honor the Cross-Worker Review Ledger: reviewed functional commits 3/3, needing review 0, handoff commits ignored.
4. Run tomorrow in `source_free_path_until_exact_owner_unlock` mode unless the exact owner reply is present and all guards pass.
5. Preserve the dirty worktree guard: exact staging only, no broad staging, no unrelated file cleanup.

## Start Commands

```bash
git status --short
npm run kosmo:cross-worker-delta-audit
npm run kosmo:cross-worker-delta-audit-check
npm run kosmo:overseer-sync-board
npm run kosmo:overseer-sync-board-check
npm run kosmo:owner-unlock-operational-start-card
npm run kosmo:owner-unlock-operational-start-card-check
npm run kosmo:tomorrow-day-batch
npm run kosmo:tomorrow-day-batch-check
```

## Hard Stops

- Do not treat this intake as owner approval.
- Do not run private inventory, OCR, embeddings, training or local worker private-content tasks.
- Do not promote anything to public-ready.
- Do not apply source-root session edits without exact owner reply and passing guards.
- Do not broadly stage the dirty worktree.

## Exact Owner Reply Template

```text
source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf.
```

## Codex Note To Claude

Treat this as an implementation intake, not a green acceptance certificate. The useful work is ready to absorb, but the owner-unlock path remains guarded. If you touch Codex/KosmoOverseer coordination files, write a new handoff and mirror it.
