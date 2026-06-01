# KosmoOrbit Demo Audit

Generated: 2026-06-01T12:44:35.568Z
Status: `orbit_demo_audit_passed`
HTML: `out/orbit/index.html`

Static audit for the human presentation flow of `/orbit`. It checks section order, visible approval boundaries and obvious render artifacts without starting a browser or touching cloud resources.

## Summary

- checks: 25/25 passed

## Demo Order

| Anchor | Section | Position |
| --- | --- | ---: |
| `autonomie` | Autonomie-Status | 14438 |
| `routine` | Buero-Routine | 16914 |
| `presenter` | 3-Minuten-Erklaerung | 29726 |
| `workflow-delta` | Workflow-Delta | 32743 |
| `fortschritt` | Projektfortschritt | 38465 |
| `vision` | Vision Bridge | 45210 |
| `demo-ready` | Demo-Bereitschaft | 49550 |
| `projektpaket` | Projektpaket Tagesansicht | 52294 |
| `design-handoff` | KosmoDesign Handoff | 61886 |
| `entscheidung` | Review Decision Draft | 76017 |
| `runtime-contract` | Runtime-Vertrag | 83326 |
| `installation` | Buero-Installation | 89322 |
| `health` | Health Readiness | 97061 |
| `risiken` | Risiko-Register | 103918 |
| `commands` | Command-Vertrag | 111207 |
| `audit` | Audit-Trail-Vertrag | 120570 |
| `evidenz` | Pruefevidenz | 128084 |
| `ausbildung` | Ausbildungsmodus | 136343 |
| `rechte` | Rechte-Matrix | 141653 |
| `rollen` | Rollenumschaltung Preview | 159408 |

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
