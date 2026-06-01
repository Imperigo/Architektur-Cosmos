# KosmoOrbit Demo Audit

Generated: 2026-06-01T08:01:36.402Z
Status: `orbit_demo_audit_passed`
HTML: `out/orbit/index.html`

Static audit for the human presentation flow of `/orbit`. It checks section order, visible approval boundaries and obvious render artifacts without starting a browser or touching cloud resources.

## Summary

- checks: 11/11 passed

## Demo Order

| Anchor | Section | Position |
| --- | --- | ---: |
| `autonomie` | Autonomie-Status | 11932 |
| `presenter` | 3-Minuten-Erklaerung | 14408 |
| `fortschritt` | Projektfortschritt | 17425 |
| `vision` | Vision Bridge | 24067 |
| `demo-ready` | Demo-Bereitschaft | 28407 |
| `projektpaket` | Projektpaket Tagesansicht | 31149 |
| `entscheidung` | Review Decision Draft | 44797 |
| `evidenz` | Pruefevidenz | 52062 |
| `rechte` | Rechte-Matrix | 60319 |
| `rollen` | Rollenumschaltung Preview | 78074 |

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
| `permission_boundary_visible` | `passed` | Role permission boundary is visible in the export. |
| `no_runtime_promise` | `passed` | Export does not claim live runtime execution. |
| `no_render_artifacts` | `passed` | Visible export HTML has no obvious unresolved render artifacts. |
| `no_server_runtime_markers` | `passed` | Export has no server-runtime markers. |

## Next Actions

- Use this after build when /orbit changes affect the human presentation flow.
- Keep browser visual QA separate; this audit only verifies static demo structure.
