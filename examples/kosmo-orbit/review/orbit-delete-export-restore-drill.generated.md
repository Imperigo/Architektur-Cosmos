# KosmoOrbit Delete / Export / Restore Drill Check

Generated: 2026-06-06T07:07:25.188Z
Status: `delete_export_restore_drill_passed`
Contract: `examples/kosmo-orbit/storage/orbit-delete-export-restore-drill.contract.json`

Static review-only check for the future local delete/export/restore drill. It does not delete, export, restore, write audit logs, touch customer data, run backups or sync archives.

## Summary

- checks: 16/16 passed
- drill scope items: 4
- blocked capabilities: 10
- review roles: 4
- promotion requirements: 5

## Drill Scope

| Scope | Evidence Items | Status |
| --- | ---: | --- |
| `delete_request` | 3 | `needs_human_review` |
| `export_package` | 3 | `needs_human_review` |
| `restore_probe` | 3 | `needs_human_review` |
| `audit_trace` | 3 | `needs_human_review` |

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `contract_file_exists` | `passed` | Delete/export/restore drill contract exists. |
| `status_ready` | `passed` | Drill contract status is ready. |
| `mode_static_review_only` | `passed` | Drill contract is static review-only. |
| `required_scope_present` | `passed` | Delete, export, restore and audit trace scopes are present. |
| `scope_needs_human_review` | `passed` | Every drill scope still needs human review and evidence. |
| `blocked_capabilities_present` | `passed` | Real delete, export, restore, customer data, backup and sync actions are blocked. |
| `allowed_today_is_review_only` | `passed` | Allowed actions are static, human-review and test-data only. |
| `review_roles_present` | `passed` | Review roles include owner, IT/KI, project lead and privacy review. |
| `promotion_requirements_present` | `passed` | Promotion requirements include drill, privacy, backup, audit and owner gates. |
| `component_imports_contract` | `passed` | Component imports the delete/export/restore drill contract. |
| `component_renders_drill_copy` | `passed` | Component renders delete/export/restore drill copy. |
| `component_renders_safety_boundary` | `passed` | Component keeps real delete, export, restore, customer data, backup restore and external archive sync blocked. |
| `route_imports_drill` | `passed` | Orbit route imports the delete/export/restore drill component. |
| `route_anchors_drill` | `passed` | Orbit route renders a delete-export-restore anchor. |
| `section_index_links_drill` | `passed` | Section index links to delete/export/restore drill. |
| `next_actions_present` | `passed` | Next actions are explicit. |

## Next Actions

- Drill als sichtbares Orbit-Panel pruefen.
- Mit Testdaten definieren, was ein Exportmanifest enthalten muss.
- Erst nach menschlicher Freigabe ueber echte lokale Delete/Export/Restore-Jobs sprechen.
