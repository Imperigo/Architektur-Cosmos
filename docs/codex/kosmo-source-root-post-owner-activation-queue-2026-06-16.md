# Kosmo Source-Root Post-Owner Activation Queue

Generated: 2026-06-16T12:30:33.924Z
Status: `source_root_post_owner_activation_queue_ready`

## Summary

- Dry run: source_root_decision_dry_run_satisfied_recorded_selection
- Activation: source_root_activation_ready_for_private_metadata_diagnostic
- Activation ready: yes
- Decision still pending: no
- Private metadata runner: private_metadata_inventory_ready_private_output_written
- Private metadata guard: private_metadata_inventory_guard_passed
- Worker boundary: worker_boundary_pack_guard_passed
- Queue steps: 7
- Executable now: 2
- Blocked now: 5
- Failures: 0
- Public-ready after queue: 0

## Queue

| Step | Phase | Executable now | Command | Blocked reason |
| --- | --- | --- | --- | --- |
| `record_owner_decision` | owner | no | `edit examples/kosmo-references/provenance/source-root-decision-session-2026-06-16.json` | human decision required |
| `decision_session_check` | guard | no | `npm run kosmo:source-root-decision-session-check` | no recorded decision yet |
| `blocker_refresh` | guard | no | `npm run kosmo:source-root-blocker-refresh` | decision check pending |
| `activation_preflight` | activation | no | `npm run kosmo:source-root-activation-preflight` | activation preflight already passed |
| `private_metadata_inventory` | private_metadata | yes | `npm run kosmo:private-metadata-inventory` | - |
| `private_metadata_inventory_check` | private_metadata | yes | `npm run kosmo:private-metadata-inventory-check` | - |
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
