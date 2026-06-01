# KosmoOrbit App Route Spec

Generated: 2026-06-01T19:33:41.407Z
Status: `orbit_app_route_spec_ready`
Proposed path: `/orbit`
Implementation file: `app/orbit/page.tsx`
Implementation status: `implemented_static_preview`

Review-only route specification for the static `/orbit` preview. The route contract allows local JSON imports only and rejects API routes, auth runtime, server actions, middleware, network calls, uploads, publish actions and design generation.

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
| `route_is_static_preview` | `passed` | Orbit route is absent or remains a static preview page. |
| `visible_modules_available` | `passed` | Visible modules are present. |
| `blocked_actions_available` | `passed` | Blocked actions are present. |
| `generation_blocked` | `passed` | Generate Design remains blocked. |
| `publish_blocked` | `passed` | Publish Public remains blocked. |
| `network_blocked` | `passed` | External network access remains blocked. |
| `shell_matches_state_project` | `passed` | Shell manifest matches active project. |

## Next Actions

- Keep app/orbit/page.tsx aligned with this static route contract.
- Keep the Orbit route static-export-safe and driven by local JSON imports.
- Keep a route smoke before any public navigation points at /orbit.
