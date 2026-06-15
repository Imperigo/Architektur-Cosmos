# Kosmo Source-Root Post-Owner Activation Queue

Generated: 2026-06-15T10:41:55.957Z
Status: `source_root_post_owner_activation_queue_ready`

## Summary

- Dry run: source_root_decision_dry_run_ready
- Activation: source_root_activation_waiting_for_owner_storage_action
- Activation ready: no
- Decision still pending: yes
- Private metadata runner: private_metadata_inventory_blocked_until_activation
- Private metadata guard: private_metadata_inventory_guard_passed
- Worker boundary: worker_boundary_pack_guard_passed
- Queue steps: 7
- Executable now: 0
- Blocked now: 7
- Failures: 0
- Public-ready after queue: 0

## Queue

| Step | Phase | Executable now | Command | Blocked reason |
| --- | --- | --- | --- | --- |
| `record_owner_decision` | owner | no | `edit examples/kosmo-references/provenance/source-root-decision-session-2026-06-14.json` | human decision required |
| `decision_session_check` | guard | no | `npm run kosmo:source-root-decision-session-check` | no recorded decision yet |
| `blocker_refresh` | guard | no | `npm run kosmo:source-root-blocker-refresh` | decision check pending |
| `activation_preflight` | activation | no | `npm run kosmo:source-root-activation-preflight` | source-root owner decision pending |
| `private_metadata_inventory` | private_metadata | no | `npm run kosmo:private-metadata-inventory` | activation not ready |
| `private_metadata_inventory_check` | private_metadata | no | `npm run kosmo:private-metadata-inventory-check` | activation not ready |
| `day_batch_loop` | review | no | `npm run kosmo:day-batch-loop` | private metadata guard sequence pending |

## Hard Stops

- Do not run private OCR/PDF/book text extraction from this queue.
- Do not copy private source files into Git.
- Do not assign local LLM tasks that read private contents before activation and output guards pass.
- Do not set public-ready from metadata inventory results.

## Handoff Note

After owner records a source-root decision, run this queue top-to-bottom and stop at the first failed guard.

## Failures

- None.
