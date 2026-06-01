# KosmoOrbit Role UI Smoke

Generated: 2026-06-01T08:45:52.360Z
Status: `role_ui_smoke_passed`
Project: `Kosmo Demo 001`

Review-only role guard. This does not create users, write auth data, open Blender or generate geometry.

## Summary

- checks: 14/14 passed
- variants: 8
- required roles: 8
- generation-capable roles: 0
- learning variants: 3
- explained variants: 8

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `source_status_ready` | `passed` | Role variants report is ready. |
| `variant_count` | `passed` | Exactly eight office role variants exist. |
| `required_roles_present` | `passed` | All required KosmoOrbit office roles exist. |
| `generation_summary_blocked` | `passed` | No role is generation-capable in the summary. |
| `generation_disabled_everywhere` | `passed` | Every role keeps design generation disabled. |
| `owner_admin_public_approval` | `passed` | Owner admin can approve public gates. |
| `design_architect_review_access` | `passed` | Entwurfsarchitekt can open design review context. |
| `drafter_review_blocked` | `passed` | Zeichner EFZ stays blocked from design review opening. |
| `trial_user_read_only` | `passed` | Schnupperstift remains read-only. |
| `learning_roles_supported` | `passed` | Praktikant, Lehrling and Schnupperstift have learning support. |
| `role_explanations_present` | `passed` | Every variant has plain-language role explanations. |
| `professional_depths_distinct` | `passed` | Professional roles use distinct interface depth levels. |
| `visible_sections_present` | `passed` | Every variant has visible UI sections. |
| `warnings_present` | `passed` | Every variant keeps at least one warning visible. |

## Next Actions

- Keep this smoke check in the Orbit full review before changing role permissions.
- Use the role variants as a safe input for the first role-aware KosmoOrbit app screen.
- Do not enable design generation until context and human-review gates are approved.
