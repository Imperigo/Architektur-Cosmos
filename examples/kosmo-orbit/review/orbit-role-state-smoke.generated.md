# KosmoOrbit Role State Smoke

Generated: 2026-06-01T14:06:49.232Z
Status: `role_state_smoke_passed`
Role state: `examples/kosmo-orbit/role-state.demo.json`
Schema: `schema/kosmo-orbit-role-state.schema.json`

Review-only smoke. This validates the local role-state contract without auth, user writes, network calls, uploads or public publishing.

## Summary

- checks: 16/16 passed
- failed checks: 0
- available roles: 8
- visible modules: 8
- blocked actions: 3
- active role: `owner_admin`
- active project: `kosmo-demo-001`

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `state_file_exists` | `passed` | Role-state JSON exists. |
| `schema_file_exists` | `passed` | Role-state schema exists. |
| `schema_version` | `passed` | Role-state version is 0.1. |
| `required_top_level_keys` | `passed` | All required top-level keys are present. |
| `review_only_policy` | `passed` | Interaction policy remains review-only. |
| `active_role_available` | `passed` | Active role is included in available roles. |
| `selected_role_available` | `passed` | Selected preview role is included in available roles. |
| `default_role_available` | `passed` | Default preview role is included in available roles. |
| `known_role_ids_only` | `passed` | Every available role id is known. |
| `project_package_path_local` | `passed` | Active project points at a local project package path. |
| `visible_modules_have_reasons` | `passed` | Every visible module has a valid visibility and reason. |
| `kosmo_design_primary` | `passed` | KosmoDesign is the primary visible module in this demo state. |
| `blocked_actions_have_gates` | `passed` | Every blocked action has a gate id and reason. |
| `generation_blocked` | `passed` | Generate Design is explicitly blocked. |
| `publish_blocked` | `passed` | Public publishing is explicitly blocked. |
| `no_external_network` | `passed` | External network access is blocked. |

## Next Actions

- Use this role-state contract as the safe local state input for the next KosmoOrbit UI shell pass.
- Keep this state review-only until real auth and role storage are explicitly designed.
- Do not wire role state to public writes, uploads, network jobs or generation actions without approval gates.
