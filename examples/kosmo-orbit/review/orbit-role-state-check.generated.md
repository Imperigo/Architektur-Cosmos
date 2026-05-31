# KosmoOrbit Role State Check

Generated: 2026-05-31T14:36:46.067Z
Status: `role_state_check_passed`
Role state: `examples/kosmo-orbit/role-state.demo.json`

Review-only role-state check. This validates a local UI state contract and does not create users, write auth data, call networks, open Blender or generate geometry.

## Summary

- checks: 18/18 passed
- active role: `owner_admin`
- selected role: `owner_admin`
- active project: `kosmo-demo-001`
- available roles: 8
- visible modules: 8
- blocked actions: 3

## Visible Modules

| Tool | Visibility | Reason |
| --- | --- | --- |
| `kosmo-data` | `available` | Reference and project knowledge can be inspected locally. |
| `kosmo-asset` | `available` | Asset review evidence can be inspected locally. |
| `kosmo-design` | `primary` | Current Orbit prototype focuses on the KosmoDesign review handoff. |
| `kosmo-prepare` | `summary_only` | Prepare is visible as planned context, but not active in this demo shell. |
| `kosmo-draw` | `summary_only` | Draw handoff stays summary-only until model-quality review is closed. |
| `kosmo-viz` | `summary_only` | Viz is planned and remains blocked from generation in this state. |
| `kosmo-publish` | `summary_only` | Publish stays visible but blocked by publish and rights gates. |
| `kosmo-zentrale` | `summary_only` | Zentrale runtime is external to this static repo and only shown as status. |

## Blocked Actions

| Action | Gate | Reason |
| --- | --- | --- |
| Generate Design | `human-review-gate` | Context and human-review gates are not approved. |
| Publish Public | `publish-gate` | Publish and rights gates remain blocked in the local demo. |
| Start Cloud Job | `cost-gate` | Cost gate is local-only and external network access is disabled. |

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `schema_version` | `passed` | Role state schema version is supported. |
| `active_user_matches_workspace` | `passed` | Role state user matches workspace current user. |
| `active_role_exists` | `passed` | Active role exists in workspace roles. |
| `selected_role_exists` | `passed` | Selected preview role exists in workspace roles. |
| `default_role_exists` | `passed` | Default preview role exists in workspace roles. |
| `available_roles_exist` | `passed` | Every available preview role exists in workspace roles. |
| `project_exists` | `passed` | Active project exists in workspace projects. |
| `package_path_exists` | `passed` | Active project package path exists locally. |
| `review_only_policy` | `passed` | Role state remains review-only. |
| `no_user_write` | `passed` | Role state does not allow user writes. |
| `no_design_generation` | `passed` | Role state does not allow design generation. |
| `no_public_publish` | `passed` | Role state does not allow public publish. |
| `no_external_network` | `passed` | Role state does not allow external network access. |
| `visible_modules_reference_tools` | `passed` | Every visible module references a known tool. |
| `primary_design_module_visible` | `passed` | KosmoDesign is the primary visible module for this demo state. |
| `blocked_actions_reference_gates` | `passed` | Every blocked action references a known gate. |
| `generate_design_blocked` | `passed` | Generate Design remains explicitly blocked. |
| `publish_public_blocked` | `passed` | Public publish remains explicitly blocked. |

## Next Actions

- Use this role state as the data contract for the next role-aware Orbit prototype pass.
- Keep this check in the full review before adding real interaction or routing.
- Do not treat this role state as auth; it is a local UI contract only.
