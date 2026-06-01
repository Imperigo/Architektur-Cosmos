# KosmoOrbit Route Smoke

Generated: 2026-06-01T14:07:14.016Z
Status: `orbit_route_smoke_passed`
Route: `app/orbit/page.tsx`

Static route smoke for the first `/orbit` preview. This check rejects server-only patterns, network calls, cookies, headers and redirects.

## Summary

- checks: 149/149 passed

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
| `design_handoff_panel_file_exists` | `passed` | Orbit KosmoDesign handoff panel component exists. |
| `design_handoff_panel_data_file_exists` | `passed` | Orbit KosmoDesign handoff panel spec exists. |
| `presenter_brief_file_exists` | `passed` | Orbit presenter brief component exists. |
| `workflow_delta_file_exists` | `passed` | Orbit workflow delta component exists. |
| `pilot_measurement_file_exists` | `passed` | Orbit pilot measurement component exists. |
| `pilot_runbook_file_exists` | `passed` | Orbit pilot runbook component exists. |
| `pilot_session_template_file_exists` | `passed` | Orbit pilot session template component exists. |
| `progress_map_file_exists` | `passed` | Orbit progress map component exists. |
| `vision_bridge_file_exists` | `passed` | Orbit vision bridge component exists. |
| `demo_questions_file_exists` | `passed` | Orbit demo questions component exists. |
| `installation_topology_file_exists` | `passed` | Orbit local installation topology component exists. |
| `health_readiness_file_exists` | `passed` | Orbit local health readiness component exists. |
| `health_readiness_contract_file_exists` | `passed` | Orbit health readiness contract exists. |
| `risk_register_file_exists` | `passed` | Orbit risk register component exists. |
| `command_contract_file_exists` | `passed` | Orbit command contract component exists. |
| `command_contract_data_file_exists` | `passed` | Orbit command contract data exists. |
| `audit_trail_file_exists` | `passed` | Orbit audit trail component exists. |
| `audit_trail_data_file_exists` | `passed` | Orbit audit trail contract data exists. |
| `review_decision_draft_file_exists` | `passed` | Orbit review decision draft component exists. |
| `runtime_boundary_file_exists` | `passed` | Orbit MVP/runtime boundary component exists. |
| `runtime_contract_file_exists` | `passed` | Orbit local runtime contract component exists. |
| `quality_evidence_file_exists` | `passed` | Orbit quality evidence component exists. |
| `workstation_priorities_file_exists` | `passed` | Orbit workstation priorities component exists. |
| `learning_mode_file_exists` | `passed` | Orbit learning mode component exists. |
| `permission_matrix_file_exists` | `passed` | Orbit permission matrix component exists. |
| `autonomy_status_file_exists` | `passed` | Orbit autonomy status component exists. |
| `office_routine_file_exists` | `passed` | Orbit office routine component exists. |
| `office_routine_data_file_exists` | `passed` | Orbit office routine contract exists. |
| `demo_readiness_file_exists` | `passed` | Orbit demo readiness component exists. |
| `publish_readiness_file_exists` | `passed` | Orbit publish readiness component exists. |
| `section_index_file_exists` | `passed` | Orbit section index component exists. |
| `imports_role_switcher` | `passed` | Route imports the role switcher preview component. |
| `imports_demo_review_path` | `passed` | Route imports the guided demo review component. |
| `imports_project_dashboard` | `passed` | Route imports the project package dashboard component. |
| `imports_design_handoff_panel` | `passed` | Route imports the KosmoDesign handoff panel component. |
| `imports_presenter_brief` | `passed` | Route imports the presenter brief component. |
| `imports_workflow_delta` | `passed` | Route imports the workflow delta component. |
| `imports_pilot_measurement` | `passed` | Route imports the pilot measurement component. |
| `imports_pilot_runbook` | `passed` | Route imports the pilot runbook component. |
| `imports_pilot_session_template` | `passed` | Route imports the pilot session template component. |
| `imports_progress_map` | `passed` | Route imports the vision-to-MVP progress map component. |
| `imports_vision_bridge` | `passed` | Route imports the vision bridge component. |
| `imports_demo_questions` | `passed` | Route imports the demo questions briefing component. |
| `imports_installation_topology` | `passed` | Route imports the local installation topology component. |
| `imports_health_readiness` | `passed` | Route imports the local health readiness component. |
| `imports_health_readiness_contract` | `passed` | Health readiness component imports the local contract JSON. |
| `imports_risk_register` | `passed` | Route imports the risk register component. |
| `imports_command_contract` | `passed` | Route imports the command contract component. |
| `imports_command_contract_data` | `passed` | Command contract component imports the local contract JSON. |
| `imports_audit_trail` | `passed` | Route imports the audit trail component. |
| `imports_audit_trail_data` | `passed` | Audit trail component imports the local contract JSON. |
| `imports_review_decision_draft` | `passed` | Route imports the review decision draft component. |
| `imports_runtime_boundary` | `passed` | Route imports the MVP/runtime boundary component. |
| `imports_runtime_contract` | `passed` | Route imports the local runtime contract component. |
| `imports_quality_evidence` | `passed` | Route imports the quality evidence component. |
| `imports_workstation_priorities` | `passed` | Route imports the workstation priorities component. |
| `imports_learning_mode` | `passed` | Route imports the learning mode component. |
| `imports_permission_matrix` | `passed` | Route imports the permission matrix component. |
| `imports_autonomy_status` | `passed` | Route imports the autonomy status component. |
| `imports_office_routine` | `passed` | Route imports the office routine component. |
| `imports_demo_readiness` | `passed` | Route imports the demo readiness component. |
| `imports_publish_readiness` | `passed` | Route imports the publish readiness component. |
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
| `shows_design_handoff_panel` | `passed` | Route renders the KosmoDesign handoff review console. |
| `design_handoff_uses_ui_panel_spec` | `passed` | KosmoDesign handoff panel imports the generated UI panel spec. |
| `design_handoff_blocks_generation` | `passed` | KosmoDesign handoff panel keeps design generation blocked. |
| `design_handoff_shows_context_inputs` | `passed` | KosmoDesign handoff panel shows blocked context inputs and guardrails. |
| `shows_presenter_brief` | `passed` | Route renders the three-minute presenter explanation. |
| `shows_value_claims` | `passed` | Presenter brief covers better, faster and cheaper value claims. |
| `shows_workflow_delta` | `passed` | Route renders workflow delta for non-technical office value. |
| `workflow_delta_avoids_roi_claim` | `passed` | Workflow delta avoids unproven ROI claims. |
| `shows_pilot_measurement` | `passed` | Route renders pilot measurement for evidence before claims. |
| `pilot_measurement_blocks_live_actions` | `passed` | Pilot measurement blocks live data, uploads, costs and generation. |
| `shows_pilot_runbook` | `passed` | Route renders a concrete 45-60 minute office pilot runbook. |
| `pilot_runbook_keeps_live_actions_blocked` | `passed` | Pilot runbook keeps customer data, uploads, costs, design generation and push blocked. |
| `shows_pilot_session_template` | `passed` | Route renders pilot session template and empty measurement copy. |
| `pilot_session_template_avoids_fake_results` | `passed` | Pilot session template does not claim completed measurements. |
| `shows_progress_map` | `passed` | Route renders a visible project progress map. |
| `keeps_progress_map_non_absolute` | `passed` | Progress map avoids claiming one absolute total project percentage. |
| `shows_runtime_and_generation_lanes` | `passed` | Progress map separates local runtime from CAD/plan generation. |
| `shows_vision_bridge` | `passed` | Route renders the KosmoOrbit vision bridge. |
| `keeps_vision_bridge_review_only` | `passed` | Vision bridge keeps runtime and write actions gated. |
| `shows_installation_topology` | `passed` | Route renders the local office installation topology. |
| `keeps_installation_topology_safe` | `passed` | Installation topology keeps auth, upload, process and network actions gated. |
| `shows_health_readiness` | `passed` | Route renders the local health readiness contract. |
| `keeps_health_readiness_safe` | `passed` | Health readiness keeps hardware, model, filesystem, process and queue actions gated. |
| `shows_risk_register` | `passed` | Route renders the human approval risk register. |
| `risk_register_covers_core_gates` | `passed` | Risk register covers runtime, generation, rights, profiles, data and external collaboration. |
| `shows_command_contract` | `passed` | Route renders the static Orbit command contract. |
| `command_contract_blocks_runtime_actions` | `passed` | Command contract blocks runtime, generation, write, publish and network actions. |
| `shows_audit_trail` | `passed` | Route renders the static Orbit audit trail contract. |
| `audit_trail_tracks_intent_evidence_gate_outcome` | `passed` | Audit trail tracks intent, evidence, gate, outcome and non-writing events. |
| `shows_demo_questions` | `passed` | Route renders architect-facing demo questions. |
| `anchors_demo_claims` | `passed` | Demo questions point claims back to visible panels. |
| `shows_review_decision_draft` | `passed` | Route renders a local non-writing review decision draft. |
| `keeps_decision_draft_non_writing` | `passed` | Decision draft states that it writes no decision record. |
| `shows_runtime_boundary` | `passed` | Route renders visible MVP and runtime boundaries. |
| `keeps_runtime_side_effects_off` | `passed` | Runtime boundary states no runtime side effects. |
| `shows_runtime_contract` | `passed` | Route renders the future local runtime contract. |
| `keeps_runtime_contract_non_operational` | `passed` | Runtime contract keeps model, process, queue and memory actions gated. |
| `shows_quality_evidence` | `passed` | Route renders local review and route-smoke quality evidence. |
| `imports_quality_reports` | `passed` | Route imports full review and route smoke reports. |
| `imports_static_smoke_report` | `passed` | Route imports the static export smoke report. |
| `shows_workstation_priorities` | `passed` | Route renders role-first workstation priorities. |
| `covers_core_workstation_roles` | `passed` | Workstation priorities cover owner, project lead, design, drafting and education. |
| `shows_learning_mode` | `passed` | Route renders education mode for learning roles. |
| `learning_mode_keeps_actions_blocked` | `passed` | Learning mode blocks accounts, writes, generation and public publish. |
| `shows_permission_matrix` | `passed` | Route renders role permission matrix. |
| `keeps_generation_blocked_in_matrix` | `passed` | Permission matrix keeps generation and public gates visibly blocked. |
| `shows_autonomy_status` | `passed` | Route renders local autonomy status and safety limits. |
| `keeps_autonomy_cost_safe` | `passed` | Autonomy status keeps Cloud costs and writes blocked. |
| `keeps_autonomy_named_orbit` | `passed` | Autonomy status names KosmoOrbit, not KosmoWebsite. |
| `shows_office_routine` | `passed` | Route renders the static office routine contract. |
| `office_routine_covers_day_phases` | `passed` | Office routine covers morning, workday, training, evening and safety. |
| `office_routine_blocks_live_automation` | `passed` | Office routine blocks model start, Blender launch, uploads, publish, push and costs. |
| `shows_demo_readiness` | `passed` | Route renders demo readiness with explicit human approval boundary. |
| `shows_publish_readiness` | `passed` | Route renders publish readiness and the live gate. |
| `publish_readiness_blocks_live_push` | `passed` | Publish readiness blocks push/deploy until owner go, security review and live smoke. |
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
