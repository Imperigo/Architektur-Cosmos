# KosmoOrbit Demo Audit

Generated: 2026-06-01T08:21:35.669Z
Status: `orbit_demo_audit_passed`
HTML: `out/orbit/index.html`

Static audit for the human presentation flow of `/orbit`. It checks section order, visible approval boundaries and obvious render artifacts without starting a browser or touching cloud resources.

## Summary

- checks: 13/13 passed

## Demo Order

| Anchor | Section | Position |
| --- | --- | ---: |
| `autonomie` | Autonomie-Status | 12445 |
| `presenter` | 3-Minuten-Erklaerung | 14921 |
| `fortschritt` | Projektfortschritt | 17938 |
| `vision` | Vision Bridge | 24682 |
| `demo-ready` | Demo-Bereitschaft | 29022 |
| `projektpaket` | Projektpaket Tagesansicht | 31764 |
| `entscheidung` | Review Decision Draft | 45412 |
| `runtime-contract` | Runtime-Vertrag | 52721 |
| `installation` | Buero-Installation | 58717 |
| `evidenz` | Pruefevidenz | 66456 |
| `rechte` | Rechte-Matrix | 74713 |
| `rollen` | Rollenumschaltung Preview | 92468 |

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `html_exists` | `passed` | Built /orbit HTML exists. |
| `demo_order_complete` | `passed` | Core demo section anchors are all present. |
| `demo_order_logical` | `passed` | Core demo sections appear in the intended presentation order. |
| `navigation_complete` | `passed` | Demo navigation exposes all core stops. |
| `approval_boundary_visible` | `passed` | Approval boundary is visible in the export. |
| `review_only_visible` | `passed` | Review-only mode is visible in the export. |
| `vision_bridge_visible` | `passed` | Vision bridge is visible in the export. |
| `runtime_contract_visible` | `passed` | Runtime contract is visible and non-operational. |
| `installation_topology_visible` | `passed` | Office installation topology is visible in the export. |
| `permission_boundary_visible` | `passed` | Role permission boundary is visible in the export. |
| `no_runtime_promise` | `passed` | Export does not claim live runtime execution. |
| `no_render_artifacts` | `passed` | Visible export HTML has no obvious unresolved render artifacts. |
| `no_server_runtime_markers` | `passed` | Export has no server-runtime markers. |

## Next Actions

- Use this after build when /orbit changes affect the human presentation flow.
- Keep browser visual QA separate; this audit only verifies static demo structure.
