# KosmoOrbit Responsive Audit

Generated: 2026-06-02T13:17:18.490Z
Status: `orbit_responsive_audit_passed`
Source: `app/orbit`

Source-level responsive guard for `/orbit`. This does not replace a visual browser/mobile smoke; it only catches layout-risk patterns before that step.

## Summary

- checks: 29/29 passed
- min-w-0 guards: 91
- flex-wrap usages: 74
- responsive grid usages: 77

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `all_orbit_files_present` | `passed` | All expected /orbit source files exist. |
| `page_uses_safe_viewport_scroll` | `passed` | Page uses a stable viewport shell with internal scroll. |
| `section_index_wraps` | `passed` | Demo navigation wraps and keeps touch-height links. |
| `text_width_guards_present` | `passed` | Orbit components use min-w-0 guards in dense panels. |
| `wrapping_controls_present` | `passed` | Orbit components use flex-wrap for dense controls. |
| `responsive_grids_present` | `passed` | Orbit components use breakpoint grids instead of fixed desktop-only columns. |
| `permission_matrix_responsive` | `passed` | Permission matrix collapses before the five-column desktop layout. |
| `vision_bridge_responsive` | `passed` | Vision bridge uses responsive cards for the pipeline tracks. |
| `installation_topology_responsive` | `passed` | Installation topology uses responsive cards for the office system map. |
| `health_readiness_responsive` | `passed` | Health readiness uses responsive cards for local telemetry channels. |
| `risk_register_responsive` | `passed` | Risk register uses responsive cards for approval gates. |
| `command_contract_responsive` | `passed` | Command contract uses responsive cards for command intents. |
| `audit_trail_responsive` | `passed` | Audit trail uses responsive cards for trace events. |
| `design_handoff_responsive` | `passed` | KosmoDesign handoff panel uses responsive columns for role, model, blockers and context. |
| `office_routine_responsive` | `passed` | Office routine uses responsive cards for day phases and hard stops. |
| `runtime_contract_responsive` | `passed` | Runtime contract uses responsive cards for the runtime stages. |
| `workstation_profile_responsive` | `passed` | Workstation profile contract uses responsive cards for profile and escalation layouts. |
| `local_identity_responsive` | `passed` | Local identity contract uses responsive cards for profile classes, sessions and promotion requirements. |
| `progress_bars_have_stable_height` | `passed` | Progress map uses stable bar height and constrained width. |
| `demo_readiness_uses_responsive_grid` | `passed` | Demo readiness summary uses responsive columns. |
| `publish_readiness_responsive` | `passed` | Publish readiness uses responsive columns for live gate statuses. |
| `workflow_delta_responsive` | `passed` | Workflow delta uses a responsive comparison grid. |
| `pilot_measurement_responsive` | `passed` | Pilot measurement uses responsive metric and rule grids. |
| `pilot_runbook_responsive` | `passed` | Pilot runbook uses responsive cards for timed steps, evidence and hard stops. |
| `pilot_session_template_responsive` | `passed` | Pilot session template uses responsive columns for session and metric cards. |
| `learning_mode_responsive` | `passed` | Learning mode uses responsive cards for learning profiles and tracks. |
| `badges_can_wrap_long_words` | `passed` | Long labels can break instead of overflowing pills. |
| `no_viewport_scaled_font` | `passed` | No /orbit source scales font size directly with viewport width. |
| `no_negative_letter_spacing` | `passed` | No /orbit source uses negative letter spacing. |

## Next Actions

- Use this as a source-level guard before the real browser/mobile smoke.
- Do not treat this as a replacement for a visual browser check.
