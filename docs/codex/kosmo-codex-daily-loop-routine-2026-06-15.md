# Kosmo Codex Daily Loop Routine

Generated: 2026-06-15T13:58:57.286Z
Status: `codex_daily_loop_routine_ready`

## Policy

- Max tick minutes: 2
- Avoids idle wait: true
- Public-ready after routine: 0
- Installs/downloads require explicit batch: true

## Morning Routine

1. `repo_state_scan` - Git states in ArchitectureCosmos and KosmoOrbit, scoped dirty-file review, no unrelated resets.
2. `handoff_intake` - Read latest Claude/KosmoOverseer inbox notes and compare against Codex-owned lane state.
3. `source_root_gate` - Run or inspect Source Root gate status before any private OCR, embedding, training or source scan.
4. `orbit_health` - Check KosmoOrbit handoff visibility and whether a status artifact needs mirroring.
5. `innovation_watch` - Review local queue plus trusted upstream innovation candidates before installing or downloading anything.
6. `priority_pick` - Pick the highest-value safe block: guards, fixture-only experiments, handoff clarity, or bug cleanup.
7. `commit_push` - Commit and push completed blocks with exact staging and a worker-facing handoff note.

## Today Loop Priorities

1. `finish_dependency_lane` - Dependency preflight plan, availability runner and install queue are the active safe innovation lane.
2. `prepare_install_batch_without_execution` - Keep installs/downloads as explicit future batch with model-root and Source-Root gates.
3. `strengthen_worker_contracts` - Improve Codex/Claude/KosmoOverseer handoff contracts whenever code changes touch shared boundaries.
4. `source_independent_progress` - When Source Root is blocked, progress with fixtures, schemas, review-only contracts and Orbit status.
5. `cleanup_and_guarding` - If no feature block is available, reduce ambiguity, add checks, and clean generated status docs safely.

## Escalation Rules

- Ask the owner only for decisions that change private source processing, public release, credentials, destructive filesystem actions or large installs/downloads.
- If an exact Source Root is required, keep the structured unlock phrase requirement visible.
- If a worker artifact is changed, mirror a handoff to KosmoOrbit inbox.

## Fallback Work

- Run fixture-only checks and improve their guards.
- Audit handoff consistency between ArchitectureCosmos and KosmoOrbit.
- Create review packets for owner decisions.
- Inspect trusted upstream docs or repos for relevant architecture-AI improvements, then add queue-only plans.
- Clean local generated artifacts only when they are Codex-owned and safely scoped.
