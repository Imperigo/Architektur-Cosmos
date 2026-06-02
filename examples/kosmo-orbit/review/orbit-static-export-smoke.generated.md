# KosmoOrbit Static Export Smoke

Generated: 2026-06-02T13:16:30.330Z
Status: `orbit_static_export_smoke_passed`
HTML: `out/orbit/index.html`

Checks the built static export for the visible KosmoOrbit demo panels. It does not start a server, call networks, write cloud data or open local tools.

## Summary

- checks: 74/74 passed

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `html_exists` | `passed` | Static /orbit HTML exists. |
| `referenced_static_assets_exist` | `passed` | Every _next/static asset referenced by /orbit exists in out/. |
| `renders_kosmo_orbit` | `passed` | Export renders KosmoOrbit heading. |
| `renders_hub_return` | `passed` | Export renders safe return link to the Kosmo Hub. |
| `renders_demo_navigation` | `passed` | Export renders compact demo navigation. |
| `renders_grouped_demo_navigation` | `passed` | Export renders grouped demo navigation lanes. |
| `renders_autonomy_status` | `passed` | Export renders autonomy status. |
| `renders_office_routine` | `passed` | Export renders office routine contract. |
| `renders_tool_registry` | `passed` | Export renders KosmoOrbit tool registry. |
| `renders_presenter_mode` | `passed` | Export renders presenter mode. |
| `renders_workflow_delta` | `passed` | Export renders workflow delta. |
| `renders_pilot_measurement` | `passed` | Export renders pilot measurement. |
| `renders_pilot_measurement_kit` | `passed` | Export renders pilot measurement kit. |
| `renders_pilot_facilitator_checklist` | `passed` | Export renders pilot facilitator checklist. |
| `renders_pilot_result_draft` | `passed` | Export renders pilot result draft. |
| `renders_pilot_runbook` | `passed` | Export renders pilot runbook. |
| `renders_pilot_session_template` | `passed` | Export renders pilot session template. |
| `renders_progress_map` | `passed` | Export renders progress map. |
| `renders_vision_bridge` | `passed` | Export renders vision bridge. |
| `renders_demo_readiness` | `passed` | Export renders demo readiness. |
| `renders_static_asset_readiness` | `passed` | Export renders static CSS/JS asset readiness. |
| `renders_publish_readiness` | `passed` | Export renders publish readiness live gate. |
| `renders_launch_decision_brief` | `passed` | Export renders launch decision brief. |
| `renders_push_readiness_report` | `passed` | Export renders push readiness report summary. |
| `renders_push_command_evidence` | `passed` | Export renders push readiness command evidence. |
| `renders_office_pilot_scene` | `passed` | Export renders office pilot scene. |
| `renders_project_dashboard` | `passed` | Export renders project package dashboard. |
| `renders_design_handoff_panel` | `passed` | Export renders KosmoDesign handoff review console. |
| `renders_design_pilot_path` | `passed` | Export renders KosmoDesign pilot path. |
| `renders_review_decision` | `passed` | Export renders review decision draft. |
| `renders_runtime_boundary` | `passed` | Export renders MVP/runtime boundary. |
| `renders_runtime_contract` | `passed` | Export renders local runtime contract. |
| `renders_runtime_adapter` | `passed` | Export renders runtime adapter contract. |
| `renders_installation_topology` | `passed` | Export renders local office installation topology. |
| `renders_health_readiness` | `passed` | Export renders local health readiness contract. |
| `renders_risk_register` | `passed` | Export renders human approval risk register. |
| `renders_command_contract` | `passed` | Export renders static command contract. |
| `renders_audit_trail` | `passed` | Export renders static audit trail contract. |
| `renders_quality_evidence` | `passed` | Export renders quality evidence. |
| `renders_workstation_priorities` | `passed` | Export renders workstation priorities. |
| `renders_workstation_profile_contract` | `passed` | Export renders workstation profile contract. |
| `renders_local_identity_contract` | `passed` | Export renders local identity contract. |
| `renders_learning_mode` | `passed` | Export renders education mode. |
| `renders_permission_matrix` | `passed` | Export renders permission matrix. |
| `renders_role_switcher` | `passed` | Export renders role switcher. |
| `renders_guided_review_path` | `passed` | Export renders guided review path. |
| `anchors_core_sections` | `passed` | Export contains section anchors. |
| `keeps_no_runtime_side_effects` | `passed` | Export states that runtime side effects are off. |
| `keeps_runtime_contract_safe` | `passed` | Export keeps runtime process/model/queue actions gated. |
| `keeps_runtime_adapter_safe` | `passed` | Export keeps runtime adapters non-operational. |
| `keeps_workflow_delta_honest` | `passed` | Export keeps workflow delta honest about savings. |
| `keeps_workstation_profile_review_only` | `passed` | Export keeps workstation profiles non-operational. |
| `keeps_local_identity_review_only` | `passed` | Export keeps local identity non-operational. |
| `keeps_pilot_measurement_safe` | `passed` | Export keeps pilot measurement safe and local. |
| `keeps_pilot_measurement_kit_empty` | `passed` | Export keeps pilot measurement kit empty before real pilot. |
| `keeps_pilot_facilitator_safe` | `passed` | Export keeps pilot facilitator checklist safe and local. |
| `keeps_pilot_result_draft_empty` | `passed` | Export keeps pilot result draft empty before real pilot. |
| `keeps_pilot_runbook_safe` | `passed` | Export keeps pilot runbook safe and local. |
| `keeps_pilot_session_template_empty` | `passed` | Export keeps pilot session measurements empty. |
| `keeps_publish_readiness_safe` | `passed` | Export keeps publish readiness blocked without owner go. |
| `keeps_launch_decision_human_gated` | `passed` | Export keeps launch decision human-gated. |
| `keeps_push_readiness_owner_gated` | `passed` | Export keeps push readiness owner-gated. |
| `keeps_office_pilot_review_only` | `passed` | Export keeps office pilot scene review-only and claim-safe. |
| `keeps_design_pilot_before_generation` | `passed` | Export keeps KosmoDesign pilot review before generation. |
| `keeps_installation_topology_safe` | `passed` | Export keeps installation topology non-operational. |
| `keeps_office_routine_safe` | `passed` | Export keeps office routine non-operational. |
| `keeps_tool_registry_safe` | `passed` | Export keeps tool registry non-operational. |
| `keeps_health_readiness_safe` | `passed` | Export keeps health readiness non-operational. |
| `keeps_risk_register_human_gated` | `passed` | Export keeps risk register human-gated. |
| `keeps_command_contract_static` | `passed` | Export keeps command contract non-operational. |
| `keeps_audit_trail_static` | `passed` | Export keeps audit trail non-writing. |
| `keeps_design_handoff_generation_blocked` | `passed` | Export keeps KosmoDesign generation blocked. |
| `keeps_learning_mode_safe` | `passed` | Export keeps learning mode read-safe. |
| `no_server_runtime_markers` | `passed` | Export does not include server runtime markers. |

## Next Actions

- Use this smoke after build:fresh before publishing /orbit changes.
- Add visual browser smoke only after the static export contract stays green.
