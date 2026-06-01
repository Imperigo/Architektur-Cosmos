# KosmoOrbit Demo Audit

Generated: 2026-06-01T14:07:30.073Z
Status: `orbit_demo_audit_passed`
HTML: `out/orbit/index.html`

Static audit for the human presentation flow of `/orbit`. It checks section order, visible approval boundaries and obvious render artifacts without starting a browser or touching cloud resources.

## Summary

- checks: 33/33 passed

## Demo Order

| Anchor | Section | Position |
| --- | --- | ---: |
| `autonomie` | Autonomie-Status | 15443 |
| `routine` | Buero-Routine | 17919 |
| `presenter` | 3-Minuten-Erklaerung | 30731 |
| `workflow-delta` | Workflow-Delta | 33748 |
| `pilotmessung` | Pilotmessung | 39470 |
| `pilotplan` | Pilot-Runbook | 43564 |
| `pilot-session` | Pilot-Session Template | 51182 |
| `fortschritt` | Projektfortschritt | 56621 |
| `vision` | Vision Bridge | 63366 |
| `demo-ready` | Demo-Bereitschaft | 67706 |
| `live-gate` | Live-Gate | 70450 |
| `projektpaket` | Projektpaket Tagesansicht | 74019 |
| `design-handoff` | KosmoDesign Handoff | 83611 |
| `entscheidung` | Review Decision Draft | 97742 |
| `runtime-contract` | Runtime-Vertrag | 105051 |
| `installation` | Buero-Installation | 111047 |
| `health` | Health Readiness | 118786 |
| `risiken` | Risiko-Register | 125643 |
| `commands` | Command-Vertrag | 132932 |
| `audit` | Audit-Trail-Vertrag | 142295 |
| `evidenz` | Pruefevidenz | 149809 |
| `ausbildung` | Ausbildungsmodus | 158068 |
| `rechte` | Rechte-Matrix | 163378 |
| `rollen` | Rollenumschaltung Preview | 181133 |

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `html_exists` | `passed` | Built /orbit HTML exists. |
| `demo_order_complete` | `passed` | Core demo section anchors are all present. |
| `demo_order_logical` | `passed` | Core demo sections appear in the intended presentation order. |
| `navigation_complete` | `passed` | Demo navigation exposes all core stops. |
| `approval_boundary_visible` | `passed` | Approval boundary is visible in the export. |
| `review_only_visible` | `passed` | Review-only mode is visible in the export. |
| `office_routine_visible` | `passed` | Office routine is visible in the export. |
| `office_routine_safety_visible` | `passed` | Office routine safety line is visible in the export. |
| `workflow_delta_visible` | `passed` | Workflow delta is visible in the export. |
| `workflow_delta_honest` | `passed` | Workflow delta avoids unsupported savings claims. |
| `pilot_measurement_visible` | `passed` | Pilot measurement is visible in the export. |
| `pilot_measurement_safe` | `passed` | Pilot measurement keeps live actions blocked. |
| `pilot_runbook_visible` | `passed` | Pilot runbook is visible in the export. |
| `pilot_runbook_safe` | `passed` | Pilot runbook keeps live actions blocked. |
| `pilot_session_template_visible` | `passed` | Pilot session template is visible in the export. |
| `pilot_session_template_empty` | `passed` | Pilot session template keeps demo measurements empty. |
| `publish_readiness_visible` | `passed` | Publish readiness live gate is visible in the export. |
| `publish_readiness_safe` | `passed` | Publish readiness keeps public push blocked until owner and security review. |
| `vision_bridge_visible` | `passed` | Vision bridge is visible in the export. |
| `design_handoff_visible` | `passed` | KosmoDesign handoff console is visible in the export. |
| `design_handoff_blocks_generation` | `passed` | KosmoDesign handoff keeps generation visibly blocked. |
| `runtime_contract_visible` | `passed` | Runtime contract is visible and non-operational. |
| `installation_topology_visible` | `passed` | Office installation topology is visible in the export. |
| `health_readiness_visible` | `passed` | Health readiness contract is visible in the export. |
| `risk_register_visible` | `passed` | Risk register is visible in the export. |
| `command_contract_visible` | `passed` | Command contract is visible in the export. |
| `audit_trail_visible` | `passed` | Audit trail is visible in the export. |
| `learning_mode_visible` | `passed` | Education mode is visible in the export. |
| `learning_mode_safety_visible` | `passed` | Education mode safety line is visible in the export. |
| `permission_boundary_visible` | `passed` | Role permission boundary is visible in the export. |
| `no_runtime_promise` | `passed` | Export does not claim live runtime execution. |
| `no_render_artifacts` | `passed` | Visible export HTML has no obvious unresolved render artifacts. |
| `no_server_runtime_markers` | `passed` | Export has no server-runtime markers. |

## Next Actions

- Use this after build when /orbit changes affect the human presentation flow.
- Keep browser visual QA separate; this audit only verifies static demo structure.
