# KosmoOrbit Static Export Smoke

Generated: 2026-06-01T14:07:44.995Z
Status: `orbit_static_export_smoke_passed`
HTML: `out/orbit/index.html`

Checks the built static export for the visible KosmoOrbit demo panels. It does not start a server, call networks, write cloud data or open local tools.

## Summary

- checks: 47/47 passed

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `html_exists` | `passed` | Static /orbit HTML exists. |
| `renders_kosmo_orbit` | `passed` | Export renders KosmoOrbit heading. |
| `renders_demo_navigation` | `passed` | Export renders compact demo navigation. |
| `renders_autonomy_status` | `passed` | Export renders autonomy status. |
| `renders_office_routine` | `passed` | Export renders office routine contract. |
| `renders_presenter_mode` | `passed` | Export renders presenter mode. |
| `renders_workflow_delta` | `passed` | Export renders workflow delta. |
| `renders_pilot_measurement` | `passed` | Export renders pilot measurement. |
| `renders_pilot_runbook` | `passed` | Export renders pilot runbook. |
| `renders_pilot_session_template` | `passed` | Export renders pilot session template. |
| `renders_progress_map` | `passed` | Export renders progress map. |
| `renders_vision_bridge` | `passed` | Export renders vision bridge. |
| `renders_demo_readiness` | `passed` | Export renders demo readiness. |
| `renders_publish_readiness` | `passed` | Export renders publish readiness live gate. |
| `renders_project_dashboard` | `passed` | Export renders project package dashboard. |
| `renders_design_handoff_panel` | `passed` | Export renders KosmoDesign handoff review console. |
| `renders_review_decision` | `passed` | Export renders review decision draft. |
| `renders_runtime_boundary` | `passed` | Export renders MVP/runtime boundary. |
| `renders_runtime_contract` | `passed` | Export renders local runtime contract. |
| `renders_installation_topology` | `passed` | Export renders local office installation topology. |
| `renders_health_readiness` | `passed` | Export renders local health readiness contract. |
| `renders_risk_register` | `passed` | Export renders human approval risk register. |
| `renders_command_contract` | `passed` | Export renders static command contract. |
| `renders_audit_trail` | `passed` | Export renders static audit trail contract. |
| `renders_quality_evidence` | `passed` | Export renders quality evidence. |
| `renders_workstation_priorities` | `passed` | Export renders workstation priorities. |
| `renders_learning_mode` | `passed` | Export renders education mode. |
| `renders_permission_matrix` | `passed` | Export renders permission matrix. |
| `renders_role_switcher` | `passed` | Export renders role switcher. |
| `renders_guided_review_path` | `passed` | Export renders guided review path. |
| `anchors_core_sections` | `passed` | Export contains section anchors. |
| `keeps_no_runtime_side_effects` | `passed` | Export states that runtime side effects are off. |
| `keeps_runtime_contract_safe` | `passed` | Export keeps runtime process/model/queue actions gated. |
| `keeps_workflow_delta_honest` | `passed` | Export keeps workflow delta honest about savings. |
| `keeps_pilot_measurement_safe` | `passed` | Export keeps pilot measurement safe and local. |
| `keeps_pilot_runbook_safe` | `passed` | Export keeps pilot runbook safe and local. |
| `keeps_pilot_session_template_empty` | `passed` | Export keeps pilot session measurements empty. |
| `keeps_publish_readiness_safe` | `passed` | Export keeps publish readiness blocked without owner go. |
| `keeps_installation_topology_safe` | `passed` | Export keeps installation topology non-operational. |
| `keeps_office_routine_safe` | `passed` | Export keeps office routine non-operational. |
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
