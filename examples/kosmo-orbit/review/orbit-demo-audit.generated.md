# KosmoOrbit Demo Audit

Generated: 2026-06-01T13:10:06.097Z
Status: `orbit_demo_audit_passed`
HTML: `out/orbit/index.html`

Static audit for the human presentation flow of `/orbit`. It checks section order, visible approval boundaries and obvious render artifacts without starting a browser or touching cloud resources.

## Summary

- checks: 29/29 passed

## Demo Order

| Anchor | Section | Position |
| --- | --- | ---: |
| `autonomie` | Autonomie-Status | 14939 |
| `routine` | Buero-Routine | 17415 |
| `presenter` | 3-Minuten-Erklaerung | 30227 |
| `workflow-delta` | Workflow-Delta | 33244 |
| `pilotmessung` | Pilotmessung | 38966 |
| `pilotplan` | Pilot-Runbook | 43060 |
| `fortschritt` | Projektfortschritt | 50678 |
| `vision` | Vision Bridge | 57423 |
| `demo-ready` | Demo-Bereitschaft | 61763 |
| `projektpaket` | Projektpaket Tagesansicht | 64507 |
| `design-handoff` | KosmoDesign Handoff | 74099 |
| `entscheidung` | Review Decision Draft | 88230 |
| `runtime-contract` | Runtime-Vertrag | 95539 |
| `installation` | Buero-Installation | 101535 |
| `health` | Health Readiness | 109274 |
| `risiken` | Risiko-Register | 116131 |
| `commands` | Command-Vertrag | 123420 |
| `audit` | Audit-Trail-Vertrag | 132783 |
| `evidenz` | Pruefevidenz | 140297 |
| `ausbildung` | Ausbildungsmodus | 148556 |
| `rechte` | Rechte-Matrix | 153866 |
| `rollen` | Rollenumschaltung Preview | 171621 |

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
