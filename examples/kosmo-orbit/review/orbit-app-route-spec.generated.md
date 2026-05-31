# KosmoOrbit App Route Spec

Generated: 2026-05-31T14:18:22.173Z
Status: `orbit_app_route_spec_ready`
Proposed path: `/orbit`
Implementation file: `app/orbit/page.tsx`

Review-only route specification. This does not create a Next route, API route, auth runtime, server action, middleware, network call, upload, publish action or design generation.

## Summary

- checks: 10/10 passed
- sections: 5
- visible modules: 8
- disabled actions: 3
- active role: `owner_admin`
- active project: `kosmo-demo-001`

## Sections

| Section | Source | Content |
| --- | --- | --- |
| Orbit Header | `role_state` | active role, selected preview role, active project, review-only status |
| Module Visibility | `role_state.visible_modules` | kosmo-data:available, kosmo-asset:available, kosmo-design:primary, kosmo-prepare:summary_only, kosmo-draw:summary_only, kosmo-viz:summary_only, kosmo-publish:summary_only, kosmo-zentrale:summary_only |
| Blocked Actions | `role_state.blocked_actions` | generate-design:human-review-gate, publish-public:publish-gate, start-cloud-job:cost-gate |
| Role Shell Reference | `shell_manifest` | examples/kosmo-projects/kosmo-demo-001/orbit/role-shell-prototype.generated.html |
| Safety Copy | `handoff.policy` | no auth runtime, no user writes, no network calls, no generation, no publish |

## Disabled Actions

| Action | Gate | Display | Reason |
| --- | --- | --- | --- |
| Generate Design | `human-review-gate` | `visible_disabled` | Context and human-review gates are not approved. |
| Publish Public | `publish-gate` | `visible_disabled` | Publish and rights gates remain blocked in the local demo. |
| Start Cloud Job | `cost-gate` | `visible_disabled` | Cost gate is local-only and external network access is disabled. |

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `handoff_ready` | `passed` | Role-state handoff is ready. |
| `shell_ready` | `passed` | Role shell manifest is ready. |
| `role_state_review_only` | `passed` | Role state remains review-only. |
| `no_route_file_written` | `passed` | This spec does not write a real app route. |
| `visible_modules_available` | `passed` | Visible modules are present. |
| `blocked_actions_available` | `passed` | Blocked actions are present. |
| `generation_blocked` | `passed` | Generate Design remains blocked. |
| `publish_blocked` | `passed` | Publish Public remains blocked. |
| `network_blocked` | `passed` | External network access remains blocked. |
| `shell_matches_state_project` | `passed` | Shell manifest matches active project. |

## Next Actions

- Use this spec as the implementation contract before creating app/orbit/page.tsx.
- Keep the future route static-export-safe and driven by local JSON imports.
- Add a route smoke before any public navigation points at /orbit.
