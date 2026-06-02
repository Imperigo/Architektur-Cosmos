# KosmoOrbit Demo Audit

Generated: 2026-06-02T14:18:57.778Z
Status: `orbit_demo_audit_passed`
HTML: `out/orbit/index.html`

Static audit for the human presentation flow of `/orbit`. It checks section order, visible approval boundaries and obvious render artifacts without starting a browser or touching cloud resources.

## Summary

- checks: 43/43 passed

## Demo Order

| Anchor | Section | Position |
| --- | --- | ---: |
| `autonomie` | Autonomie-Status | 27529 |
| `routine` | Buero-Routine | 30005 |
| `presenter` | 3-Minuten-Erklaerung | 59703 |
| `workflow-delta` | Workflow-Delta | 62720 |
| `pilotmessung` | Pilotmessung | 68442 |
| `pilotplan` | Pilot-Runbook | 89394 |
| `pilot-session` | Pilot-Session Template | 97012 |
| `fortschritt` | Projektfortschritt | 102451 |
| `vision` | Vision Bridge | 109196 |
| `demo-ready` | Demo-Bereitschaft | 113536 |
| `live-gate` | Live-Gate | 116291 |
| `projektpaket` | Projektpaket Tagesansicht | 135613 |
| `design-handoff` | KosmoDesign Handoff | 145205 |
| `entscheidung` | Review Decision Draft | 165063 |
| `runtime-contract` | Runtime-Vertrag | 172372 |
| `installation` | Buero-Installation | 196533 |
| `health` | Health Readiness | 204272 |
| `risiken` | Risiko-Register | 211129 |
| `commands` | Command-Vertrag | 218418 |
| `audit` | Audit-Trail-Vertrag | 227781 |
| `evidenz` | Pruefevidenz | 235295 |
| `workstation-profile` | Workstation Profile Contract | 243554 |
| `local-identity` | Local Identity Boundary | 265561 |
| `data-governance` | Data Governance Boundary | 281495 |
| `office-memory` | Office Memory Readiness | 300009 |
| `local-storage-decision` | Local Storage Decision Draft | 313394 |
| `ausbildung` | Ausbildungsmodus | 323215 |
| `rechte` | Rechte-Matrix | 328525 |
| `rollen` | Rollenumschaltung Preview | 346280 |

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
| `workstation_profile_visible` | `passed` | Workstation profile contract is visible in the export. |
| `workstation_profile_safe` | `passed` | Workstation profile keeps accounts, user writes, persistence and auth runtime blocked. |
| `local_identity_visible` | `passed` | Local identity boundary is visible in the export. |
| `local_identity_safe` | `passed` | Local identity blocks logins, profile persistence, session cookies and external identity providers. |
| `data_governance_visible` | `passed` | Data governance boundary is visible in the export. |
| `data_governance_safe` | `passed` | Data governance blocks database writes, uploads, customer data writes and external sync. |
| `office_memory_visible` | `passed` | Office memory readiness is visible in the export. |
| `office_memory_safe` | `passed` | Office memory keeps writes, scans, embeddings, backup status and external sync blocked. |
| `local_storage_decision_visible` | `passed` | Local storage decision draft is visible in the export. |
| `local_storage_decision_safe` | `passed` | Local storage decision keeps writes, indexing, embeddings, backup, restore and sync blocked. |
| `learning_mode_visible` | `passed` | Education mode is visible in the export. |
| `learning_mode_safety_visible` | `passed` | Education mode safety line is visible in the export. |
| `permission_boundary_visible` | `passed` | Role permission boundary is visible in the export. |
| `no_runtime_promise` | `passed` | Export does not claim live runtime execution. |
| `no_render_artifacts` | `passed` | Visible export HTML has no obvious unresolved render artifacts. |
| `no_server_runtime_markers` | `passed` | Export has no server-runtime markers. |

## Next Actions

- Use this after build when /orbit changes affect the human presentation flow.
- Keep browser visual QA separate; this audit only verifies static demo structure.
