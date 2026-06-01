# KosmoOrbit Route Smoke

Generated: 2026-06-01T07:00:30.249Z
Status: `orbit_route_smoke_passed`
Route: `app/orbit/page.tsx`

Static route smoke for the first `/orbit` preview. This check rejects server-only patterns, network calls, cookies, headers and redirects.

## Summary

- checks: 40/40 passed

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `route_file_exists` | `passed` | app/orbit/page.tsx exists. |
| `spec_ready` | `passed` | App route spec is ready. |
| `spec_sees_implemented_route` | `passed` | App route spec sees the route as implemented static preview. |
| `imports_route_spec` | `passed` | Route imports the local route spec JSON. |
| `imports_role_state` | `passed` | Route imports the local role state JSON. |
| `imports_role_variants` | `passed` | Route imports the local role variants JSON. |
| `imports_shell_manifest` | `passed` | Route imports the local shell manifest JSON. |
| `role_switcher_file_exists` | `passed` | Orbit role switcher client component exists. |
| `demo_review_file_exists` | `passed` | Orbit guided demo review component exists. |
| `project_dashboard_file_exists` | `passed` | Orbit project package dashboard component exists. |
| `presenter_brief_file_exists` | `passed` | Orbit presenter brief component exists. |
| `demo_questions_file_exists` | `passed` | Orbit demo questions component exists. |
| `imports_role_switcher` | `passed` | Route imports the role switcher preview component. |
| `imports_demo_review_path` | `passed` | Route imports the guided demo review component. |
| `imports_project_dashboard` | `passed` | Route imports the project package dashboard component. |
| `imports_presenter_brief` | `passed` | Route imports the presenter brief component. |
| `imports_demo_questions` | `passed` | Route imports the demo questions briefing component. |
| `uses_force_static` | `passed` | Route declares force-static rendering. |
| `shows_kosmo_orbit` | `passed` | Route renders KosmoOrbit heading. |
| `shows_demo_path` | `passed` | Route renders the 3-minute human demo path. |
| `shows_design_review_mode` | `passed` | Route renders KosmoDesign Review Mode handoff copy. |
| `shows_role_explanations` | `passed` | Route renders role explanations from variants. |
| `shows_role_switcher_preview` | `passed` | Route renders a local role switching preview. |
| `keeps_role_switcher_local` | `passed` | Role switcher explains that it writes no user data. |
| `shows_guided_demo_review_path` | `passed` | Route renders a guided project lead and design review path. |
| `shows_project_lead_and_design_roles` | `passed` | Guided demo includes Projektleitung and Entwurf roles. |
| `shows_project_package_dashboard` | `passed` | Route renders the project package day view. |
| `imports_project_review_artifacts` | `passed` | Route imports project inspector and design handoff artifacts. |
| `shows_presenter_brief` | `passed` | Route renders the three-minute presenter explanation. |
| `shows_value_claims` | `passed` | Presenter brief covers better, faster and cheaper value claims. |
| `shows_demo_questions` | `passed` | Route renders architect-facing demo questions. |
| `anchors_demo_claims` | `passed` | Demo questions point claims back to visible panels. |
| `shows_blocked_actions` | `passed` | Route renders blocked action labels from role state. |
| `shows_review_only_copy` | `passed` | Route keeps review-only safety copy visible. |
| `no_use_server` | `passed` | Forbidden pattern is absent: no_use_server. |
| `no_next_server` | `passed` | Forbidden pattern is absent: no_next_server. |
| `no_fetch` | `passed` | Forbidden pattern is absent: no_fetch. |
| `no_cookies` | `passed` | Forbidden pattern is absent: no_cookies. |
| `no_headers` | `passed` | Forbidden pattern is absent: no_headers. |
| `no_redirect` | `passed` | Forbidden pattern is absent: no_redirect. |

## Next Actions

- Keep /orbit static-export-safe until a local Orbit runtime exists.
- Do not add public navigation to /orbit before a human review approves the preview.
- Use this route as the first visible KosmoOrbit cockpit for role and gate review.
