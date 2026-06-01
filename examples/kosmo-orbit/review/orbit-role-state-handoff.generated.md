# KosmoOrbit Role State Handoff

Generated: 2026-06-01T13:56:34.149Z
Status: `role_state_handoff_ready`

Review-only handoff from checked role state to the static role shell. This does not create auth, write user data, call networks, open Blender, generate geometry, upload files or publish.

## Summary

- checks: 10/10 passed
- active role: `owner_admin`
- selected role: `owner_admin`
- active project: `kosmo-demo-001`
- visible modules: 8
- blocked actions: 3

## Handoff Items

| Item | App Use | Source |
| --- | --- | --- |
| Session role state | Drive the displayed active role and preview role in a future local Orbit app route. | `examples/kosmo-orbit/role-state.demo.json` |
| Active project binding | Load the selected project package without introducing network or backend reads. | `examples/kosmo-projects/kosmo-demo-001/kosmo.project.json` |
| Visible module policy | Render primary, available and summary-only modules from data instead of hardcoded UI branches. | `examples/kosmo-orbit/role-state.demo.json` |
| Blocked action policy | Keep dangerous actions visible but disabled with gate reasons. | `examples/kosmo-orbit/role-state.demo.json` |
| Role shell visual reference | Use the generated HTML shell as the visual baseline before a Next route exists. | `examples/kosmo-projects/kosmo-demo-001/orbit/role-shell-prototype.generated.html` |
| Smoke gates | Run role state and role shell smokes before interaction or routing changes. | `examples/kosmo-projects/kosmo-demo-001/orbit/role-shell-smoke.generated.json` |

## Blocked Actions

| Action | Gate | Reason |
| --- | --- | --- |
| Generate Design | `human-review-gate` | Context and human-review gates are not approved. |
| Publish Public | `publish-gate` | Publish and rights gates remain blocked in the local demo. |
| Start Cloud Job | `cost-gate` | Cost gate is local-only and external network access is disabled. |

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `role_state_check_passed` | `passed` | Role state check passed. |
| `role_state_smoke_passed` | `passed` | Role state smoke passed. |
| `role_shell_ready` | `passed` | Role shell prototype is ready. |
| `role_shell_smoke_passed` | `passed` | Role shell smoke passed. |
| `same_active_role` | `passed` | Role shell active role matches role state. |
| `same_selected_role` | `passed` | Role shell selected role matches role state. |
| `same_active_project` | `passed` | Role shell active project matches role state. |
| `visible_modules_preserved` | `passed` | Visible module count is preserved in shell manifest. |
| `blocked_actions_preserved` | `passed` | Blocked action count is preserved in shell manifest. |
| `review_only_preserved` | `passed` | Review-only policy is preserved. |

## Next Actions

- Use this handoff as the contract for the first local/static KosmoOrbit role-state app route.
- Keep the next route static and data-read-only until auth/runtime decisions are explicit.
- Do not enable generation, publish, uploads or external network actions from this handoff.
