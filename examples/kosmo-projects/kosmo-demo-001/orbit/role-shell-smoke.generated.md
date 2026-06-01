# KosmoOrbit Role Shell Smoke

Generated: 2026-06-01T19:33:41.028Z
Status: `role_shell_smoke_passed`
HTML: `examples/kosmo-projects/kosmo-demo-001/orbit/role-shell-prototype.generated.html`

Review-only smoke. This check reads static files only and does not create users, call external URLs, open Blender, generate geometry or upload files.

## Summary

- checks: 17/17 passed
- failed checks: 0
- role cards: 8
- role buttons: 8
- blocked generation actions: 8
- visible modules: 8
- blocked actions: 3

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `html_exists` | `passed` | Role shell HTML exists. |
| `manifest_ready` | `passed` | Role shell manifest is ready. |
| `title_visible` | `passed` | Role-aware Orbit Shell title is visible. |
| `all_role_labels_visible` | `passed` | All eight office roles are visible. |
| `role_card_count` | `passed` | Eight role cards are rendered. |
| `role_button_count` | `passed` | Eight role buttons are rendered. |
| `generate_design_blocked_everywhere` | `passed` | Generate Design is blocked on all role cards. |
| `role_state_visible` | `passed` | Role-state panel is visible. |
| `active_project_visible` | `passed` | Active project from role state is visible. |
| `visible_modules_visible` | `passed` | Visible modules from role state are visible. |
| `blocked_actions_visible` | `passed` | Blocked actions from role state are visible. |
| `static_safety_copy_visible` | `passed` | Static safety copy is visible. |
| `no_script_tags` | `passed` | Role shell has no script tags. |
| `no_external_assets` | `passed` | Role shell has no external assets or network URLs. |
| `manifest_no_generation` | `passed` | Manifest keeps generation-capable roles at zero. |
| `manifest_smoke_passed` | `passed` | Manifest references a passed role UI smoke. |
| `manifest_role_state_present` | `passed` | Manifest references the role-state contract. |

## Next Actions

- Keep this smoke check in the Orbit full review before changing the role shell prototype.
- Use the role shell as the local visual reference for a future role-aware app route.
- Add real interaction only after local auth and role state contracts are explicit.
