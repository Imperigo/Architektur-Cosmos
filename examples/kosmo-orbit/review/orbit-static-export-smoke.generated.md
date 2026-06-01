# KosmoOrbit Static Export Smoke

Generated: 2026-06-01T07:46:28.352Z
Status: `orbit_static_export_smoke_passed`
HTML: `out/orbit/index.html`

Checks the built static export for the visible KosmoOrbit demo panels. It does not start a server, call networks, write cloud data or open local tools.

## Summary

- checks: 18/18 passed

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `html_exists` | `passed` | Static /orbit HTML exists. |
| `renders_kosmo_orbit` | `passed` | Export renders KosmoOrbit heading. |
| `renders_demo_navigation` | `passed` | Export renders compact demo navigation. |
| `renders_autonomy_status` | `passed` | Export renders autonomy status. |
| `renders_presenter_mode` | `passed` | Export renders presenter mode. |
| `renders_progress_map` | `passed` | Export renders progress map. |
| `renders_demo_readiness` | `passed` | Export renders demo readiness. |
| `renders_project_dashboard` | `passed` | Export renders project package dashboard. |
| `renders_review_decision` | `passed` | Export renders review decision draft. |
| `renders_runtime_boundary` | `passed` | Export renders MVP/runtime boundary. |
| `renders_quality_evidence` | `passed` | Export renders quality evidence. |
| `renders_workstation_priorities` | `passed` | Export renders workstation priorities. |
| `renders_permission_matrix` | `passed` | Export renders permission matrix. |
| `renders_role_switcher` | `passed` | Export renders role switcher. |
| `renders_guided_review_path` | `passed` | Export renders guided review path. |
| `anchors_core_sections` | `passed` | Export contains section anchors. |
| `keeps_no_runtime_side_effects` | `passed` | Export states that runtime side effects are off. |
| `no_server_runtime_markers` | `passed` | Export does not include server runtime markers. |

## Next Actions

- Use this smoke after build:fresh before publishing /orbit changes.
- Add visual browser smoke only after the static export contract stays green.
