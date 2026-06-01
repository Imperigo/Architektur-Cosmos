# KosmoOrbit Route Smoke

Generated: 2026-06-01T08:00:42.294Z
Status: `orbit_route_smoke_passed`
Route: `app/orbit/page.tsx`

Static route smoke for the first `/orbit` preview. This check rejects server-only patterns, network calls, cookies, headers and redirects.

## Summary

- checks: 82/82 passed

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
| `progress_map_file_exists` | `passed` | Orbit progress map component exists. |
| `vision_bridge_file_exists` | `passed` | Orbit vision bridge component exists. |
| `demo_questions_file_exists` | `passed` | Orbit demo questions component exists. |
| `review_decision_draft_file_exists` | `passed` | Orbit review decision draft component exists. |
| `runtime_boundary_file_exists` | `passed` | Orbit MVP/runtime boundary component exists. |
| `quality_evidence_file_exists` | `passed` | Orbit quality evidence component exists. |
| `workstation_priorities_file_exists` | `passed` | Orbit workstation priorities component exists. |
| `permission_matrix_file_exists` | `passed` | Orbit permission matrix component exists. |
| `autonomy_status_file_exists` | `passed` | Orbit autonomy status component exists. |
| `demo_readiness_file_exists` | `passed` | Orbit demo readiness component exists. |
| `section_index_file_exists` | `passed` | Orbit section index component exists. |
| `imports_role_switcher` | `passed` | Route imports the role switcher preview component. |
| `imports_demo_review_path` | `passed` | Route imports the guided demo review component. |
| `imports_project_dashboard` | `passed` | Route imports the project package dashboard component. |
| `imports_presenter_brief` | `passed` | Route imports the presenter brief component. |
| `imports_progress_map` | `passed` | Route imports the vision-to-MVP progress map component. |
| `imports_vision_bridge` | `passed` | Route imports the vision bridge component. |
| `imports_demo_questions` | `passed` | Route imports the demo questions briefing component. |
| `imports_review_decision_draft` | `passed` | Route imports the review decision draft component. |
| `imports_runtime_boundary` | `passed` | Route imports the MVP/runtime boundary component. |
| `imports_quality_evidence` | `passed` | Route imports the quality evidence component. |
| `imports_workstation_priorities` | `passed` | Route imports the workstation priorities component. |
| `imports_permission_matrix` | `passed` | Route imports the permission matrix component. |
| `imports_autonomy_status` | `passed` | Route imports the autonomy status component. |
| `imports_demo_readiness` | `passed` | Route imports the demo readiness component. |
| `imports_section_index` | `passed` | Route imports the section index navigation component. |
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
| `shows_progress_map` | `passed` | Route renders a visible project progress map. |
| `keeps_progress_map_non_absolute` | `passed` | Progress map avoids claiming one absolute total project percentage. |
| `shows_runtime_and_generation_lanes` | `passed` | Progress map separates local runtime from CAD/plan generation. |
| `shows_vision_bridge` | `passed` | Route renders the KosmoOrbit vision bridge. |
| `keeps_vision_bridge_review_only` | `passed` | Vision bridge keeps runtime and write actions gated. |
| `shows_demo_questions` | `passed` | Route renders architect-facing demo questions. |
| `anchors_demo_claims` | `passed` | Demo questions point claims back to visible panels. |
| `shows_review_decision_draft` | `passed` | Route renders a local non-writing review decision draft. |
| `keeps_decision_draft_non_writing` | `passed` | Decision draft states that it writes no decision record. |
| `shows_runtime_boundary` | `passed` | Route renders visible MVP and runtime boundaries. |
| `keeps_runtime_side_effects_off` | `passed` | Runtime boundary states no runtime side effects. |
| `shows_quality_evidence` | `passed` | Route renders local review and route-smoke quality evidence. |
| `imports_quality_reports` | `passed` | Route imports full review and route smoke reports. |
| `imports_static_smoke_report` | `passed` | Route imports the static export smoke report. |
| `shows_workstation_priorities` | `passed` | Route renders role-first workstation priorities. |
| `covers_core_workstation_roles` | `passed` | Workstation priorities cover owner, project lead, design, drafting and education. |
| `shows_permission_matrix` | `passed` | Route renders role permission matrix. |
| `keeps_generation_blocked_in_matrix` | `passed` | Permission matrix keeps generation and public gates visibly blocked. |
| `shows_autonomy_status` | `passed` | Route renders local autonomy status and safety limits. |
| `keeps_autonomy_cost_safe` | `passed` | Autonomy status keeps Cloud costs and writes blocked. |
| `keeps_autonomy_named_orbit` | `passed` | Autonomy status names KosmoOrbit, not KosmoWebsite. |
| `shows_demo_readiness` | `passed` | Route renders demo readiness with explicit human approval boundary. |
| `shows_section_index` | `passed` | Route renders compact demo section navigation. |
| `anchors_core_sections` | `passed` | Route contains anchors for core demo sections. |
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
