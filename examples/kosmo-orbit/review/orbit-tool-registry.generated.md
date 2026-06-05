# KosmoOrbit Tool Registry Check

Generated: 2026-06-05T17:08:20.918Z
Status: `orbit_tool_registry_ready`
Workspace: `examples/kosmo-orbit/workspace.demo.json`

Review-only check for the visible KosmoOrbit tool registry. It validates local JSON and React source only; it does not launch tools, start models, upload, publish, call external accounts or spend money.

## Summary

- checks: 13/13 passed
- tools: 8
- roles: 8
- gates: 7
- active/prototype tools: 3
- blocked/review gates: 5

## Tools

| Tool | Status | Roles | Declared Gates | Workspace Gates |
| --- | --- | --- | --- | --- |
| `kosmo-data` | `active` | 5 | 2 | 1 |
| `kosmo-asset` | `prototype` | 4 | 3 | 1 |
| `kosmo-design` | `planned` | 4 | 2 | 1 |
| `kosmo-prepare` | `planned` | 3 | 2 | 0 |
| `kosmo-draw` | `prototype` | 3 | 2 | 1 |
| `kosmo-viz` | `planned` | 2 | 3 | 0 |
| `kosmo-publish` | `planned` | 3 | 3 | 1 |
| `kosmo-zentrale` | `external` | 2 | 2 | 2 |

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `workspace_has_core_tools` | `passed` | Workspace lists all eight Architecture Kosmos tools. |
| `workspace_has_role_profiles` | `passed` | Workspace covers the expected office role profiles. |
| `every_tool_has_role_gate_copy` | `passed` | Every tool has roles, gates and descriptive copy. |
| `tool_gates_resolve` | `passed` | Every tool gate resolves to a workspace gate. |
| `zentrale_is_external` | `passed` | KosmoZentrale stays external until local runtime integration exists. |
| `design_has_handoff_target` | `passed` | KosmoDesign has an explicit handoff target. |
| `publish_and_cost_gates_blocked` | `passed` | Publish and cost gates are blocked or local-only. |
| `component_imports_workspace_contract` | `passed` | Component imports the local workspace contract. |
| `component_renders_tool_orchestration` | `passed` | Component renders KosmoOrbit as Tool-Orchestrierung. |
| `component_renders_safety_boundary` | `passed` | Component states no launches, model starts, uploads, costs or public release. |
| `route_imports_tool_registry` | `passed` | Orbit route imports the tool registry component. |
| `route_anchors_tool_registry` | `passed` | Orbit route renders a tool-registry anchor. |
| `section_index_links_tool_registry` | `passed` | Section index links to the tool registry. |

## Next Actions

- Use this registry as the next KosmoOrbit module-orchestration contract.
- Keep tool launches, model starts, uploads, costs and public release blocked until a local runtime is explicitly approved.
