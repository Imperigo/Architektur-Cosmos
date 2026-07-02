# Kosmo Private Metadata Inventory Runner

Generated: 2026-07-02T06:20:20.098Z
Status: `private_metadata_inventory_blocked_until_activation`

## Summary

- Mode: private_guarded
- Activation: source_root_activation_waiting_for_owner_storage_action
- Activation ready: no
- Root scanned: no
- Files scanned: 0
- Dirs scanned: 0
- Candidate matches: 0
- Scan truncated: no
- Private inventory written: no
- Public-ready after run: 0

## Pilots

| Pilot | Candidates | Largest bytes | Rights | Public-ready |
| --- | ---: | ---: | --- | --- |
| Villa Savoye | 0 | 0 | review_only | no |
| Kapelle Sogn Benedetg | 0 | 0 | review_only | no |
| Alterszentrum Kloster Ingenbohl | 0 | 0 | review_only | no |

## Blocked Reason

- No private metadata inventory scan runs until source-root activation is ready.
- Current activation: source_root_activation_waiting_for_owner_storage_action
- Selected root present: no

## Next Actions

- Keep metadata inventory blocked until source-root activation is ready.
- After owner/overseer records a real source root, rerun source-root activation preflight.
- Then run this command against the approved selected root only.

