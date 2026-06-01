# KosmoOrbit Demo Audit

Generated: 2026-06-01T12:39:18.981Z
Status: `orbit_demo_audit_passed`
HTML: `out/orbit/index.html`

Static audit for the human presentation flow of `/orbit`. It checks section order, visible approval boundaries and obvious render artifacts without starting a browser or touching cloud resources.

## Summary

- checks: 23/23 passed

## Demo Order

| Anchor | Section | Position |
| --- | --- | ---: |
| `autonomie` | Autonomie-Status | 14183 |
| `routine` | Buero-Routine | 16659 |
| `presenter` | 3-Minuten-Erklaerung | 29471 |
| `fortschritt` | Projektfortschritt | 32488 |
| `vision` | Vision Bridge | 39233 |
| `demo-ready` | Demo-Bereitschaft | 43573 |
| `projektpaket` | Projektpaket Tagesansicht | 46317 |
| `design-handoff` | KosmoDesign Handoff | 55909 |
| `entscheidung` | Review Decision Draft | 70040 |
| `runtime-contract` | Runtime-Vertrag | 77349 |
| `installation` | Buero-Installation | 83345 |
| `health` | Health Readiness | 91084 |
| `risiken` | Risiko-Register | 97941 |
| `commands` | Command-Vertrag | 105230 |
| `audit` | Audit-Trail-Vertrag | 114593 |
| `evidenz` | Pruefevidenz | 122107 |
| `ausbildung` | Ausbildungsmodus | 130366 |
| `rechte` | Rechte-Matrix | 135676 |
| `rollen` | Rollenumschaltung Preview | 153431 |

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
