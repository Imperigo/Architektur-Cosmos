# KosmoOrbit KosmoDesign UI Smoke

Generated: 2026-05-31T12:35:33.755Z
Status: `ui_smoke_passed`
HTML: `examples/kosmo-projects/kosmo-demo-001/orbit/design-handoff-ui-prototype.generated.html`

Review-only smoke. This check reads static files only and does not open Blender, generate geometry, upload files or call external URLs.

## Summary

- checks: 12/12 passed
- failed checks: 0
- blocker count: 4
- guardrail count: 7
- primary action enabled: yes
- generation enabled: no

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `html_exists` | `passed` | Prototype HTML exists. |
| `manifest_ready` | `passed` | Prototype manifest is ready. |
| `title_visible` | `passed` | KosmoDesign title is visible. |
| `review_mode_visible` | `passed` | Review-only open mode is visible. |
| `primary_review_action_visible` | `passed` | Primary review action is visible. |
| `generate_design_visible` | `passed` | Generate Design action is visible. |
| `generate_design_disabled` | `passed` | Generate Design is disabled. |
| `blocked_generation_reason_visible` | `passed` | Blocked generation reason is visible. |
| `blockers_visible` | `passed` | Critical blocker is visible. |
| `guardrails_visible` | `passed` | Critical guardrail is visible. |
| `no_network_scripts` | `passed` | Prototype has no script tags. |
| `no_external_assets` | `passed` | Prototype has no external assets or network URLs. |

## Next Actions

- UI prototype is safe as a local visual reference for the first KosmoOrbit app screen.
