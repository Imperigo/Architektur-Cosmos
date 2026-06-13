# Kosmo Data-Lane Command Router

Generated: 2026-06-13T21:30:54.064Z
Status: `worker_router_guarded_review_only`

## Summary

- Data lane: 26/26 (kosmodata_lane_sweep_review_only_passed)
- Source-root decision: passed_pending_owner_input
- Private diagnostic allowed: no
- Private inventory plan: private_metadata_inventory_blocked
- Private inventory allowed: no
- Private inventory output contract: private_inventory_output_contract_passed
- Owner open items: 16
- Asset open reviews: 6

## Workers

### kosmo-local-llm

Role: `fliessarbeit_metadata_review_only`

Allowed now:
- summarize existing repo reports in own words
- prepare gap maps from provided JSON/Markdown
- draft metadata-only private inventory rows using the output template after owner-approved source-root flow
- run no Git, cloud, public promotion or source-copy actions

Forbidden now:
- run private-library diagnostic before source-root decision passes
- copy private book/PDF/plan/image content into repo outputs
- set public_ready=true
- push to Git or write R2/D1/cloud state

### codex-central-overseer

Role: `architecture_reasoning_code_review_gate_owner`

Allowed now:
- run review-only gates
- add validators, contracts and UI visibility
- review local-worker outputs
- prepare scoped commits and private Git pushes

Forbidden now:
- invent source-root selection
- promote public assets without separate owner/provenance review
- copy private source contents into Git

### claude-code-kosmooverseer

Role: `parallel_overseer_architecture_review`

Allowed now:
- review Codex changes from handoff inbox
- challenge provenance, rights and worker-boundary assumptions
- record owner decisions when provided

Forbidden now:
- treat workflow mirrors as complete private library
- bypass source-root decision session
- approve public-ready from review-only reports

## Allowed Commands Now

- `npm run kosmo:data-lane-sweep`
- `npm run kosmo:private-inventory-output-template`
- `npm run kosmo:private-inventory-output-check`
- `npm run kosmo:human-decision-owner-batches`
- `npm run kosmo:owner-decision-session-check`
- `npm run kosmo:owner-review-packet-check`
- `npm run kosmo:owner-review-session-brief`
- `npm run kosmo:owner-review-session-brief-check`

## Blocked Commands Now

- `npm run kosmo:private-library-diagnostic -- --roots "<selected-root>"`: Source-root decision session has not passed with private_diagnostic_allowed=true.
- `private inventory extraction or source-dependent asset authoring`: Private source inventory plan is still blocked.
- `public promotion / public_ready=true / R2-D1 public writes`: Separate owner, provenance and rights reviews are still required.

## Next Best Actions

- Owner/Claude/KosmoOverseer records a source-root decision session with a real visible source root.
- Resolve 16 owner decision queue items in batches.
- Resolve 6 KosmoAsset human reviews before promotion.
- Keep all three pilots review-only until source, provenance and rights gates pass.
