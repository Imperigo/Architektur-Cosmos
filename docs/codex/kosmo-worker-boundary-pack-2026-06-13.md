# Kosmo Worker Boundary Pack

Generated: 2026-06-13T21:55:58.317Z
Status: `worker_boundary_pack_review_only_locked`

## Hard State

- Data lane: 26/26 (kosmodata_lane_sweep_review_only_passed)
- Source-root blocker: source_root_blocker_still_active
- Source-root candidates/probable/mirrors: 708/0/64
- OneDrive marker/leaf/missing: 59/58/58
- Selected root exists: no
- Private diagnostic allowed: no
- Private inventory allowed: no
- Owner open items: 16
- Asset open human reviews: 6
- Public-ready total: 0

## Worker Boundaries

### kosmo-local-llm

Scope: `metadata_review_only`

Allowed tasks:
- summarize existing JSON/Markdown reports
- draft gap maps and checklists from repo-visible metadata
- prepare local-only private inventory row shapes from templates
- propose source-search keywords without reading private files

Blocked tasks:
- read or OCR private books, PDFs, plans, lectures or images
- copy private excerpts into Git
- write public-ready flags
- run Git, cloud, deploy or external upload commands

### codex-central-overseer

Scope: `review_gate_code_ui_private_push`

Allowed tasks:
- add validators and status reports
- run review-only sweeps
- review local worker outputs for high-risk terms
- push scoped private commits with explicit staged files

Blocked tasks:
- select a source root from weak path signals
- promote public assets from review-only status
- treat previous chat signals as current owner decisions

### claude-code-kosmooverseer

Scope: `parallel_review_owner_decision_recording`

Allowed tasks:
- review Codex handoffs
- challenge provenance, source-root and rights assumptions
- record explicit owner decisions in the approved session files
- request rerun of diagnostics after storage changes

Blocked tasks:
- bypass source-root decision session
- use workflow mirrors as the large private library
- start private extraction while blocker refresh is active

## Allowed Commands Now

- `npm run kosmo:data-lane-sweep`
- `npm run kosmo:private-inventory-output-template`
- `npm run kosmo:private-inventory-output-check`
- `npm run kosmo:human-decision-owner-batches`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:owner-decision-session-check`
- `npm run kosmo:owner-review-packet-check`
- `npm run kosmo:owner-review-session-brief`
- `npm run kosmo:owner-review-session-brief-check`
- `npm run kosmo:overseer-sync-board`
- `npm run kosmo:overseer-sync-board-check`
- `npm run kosmo:worker-boundary-pack`

## Blocked Commands Now

- `npm run kosmo:private-library-diagnostic -- --roots "<selected-root>"`: Source-root decision session has not passed with private_diagnostic_allowed=true.
- `private inventory extraction or source-dependent asset authoring`: Private source inventory plan is still blocked.
- `public promotion / public_ready=true / R2-D1 public writes`: Separate owner, provenance and rights reviews are still required.

## Escalation Triggers

- real private library root is mounted or selected
- OneDrive sync markers are repaired
- source-root decision check reports private_diagnostic_allowed=true
- owner provides explicit current answers for owner review packet

## Next Best Actions

- Keep worker activity metadata-only until source-root blocker clears.
- Use this pack as the first local-LLM/Claude instruction boundary before any KosmoReferences task.
- After a storage change, rerun source-root diagnostics, blocker refresh, command router and this pack.
- Keep Villa Savoye, Sogn Benedetg and Ingenbohl pilots review-only until separate provenance and rights gates pass.
