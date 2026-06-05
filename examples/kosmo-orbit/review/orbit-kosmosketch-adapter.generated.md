# KosmoOrbit KosmoSketch Adapter Check

Generated: 2026-06-05T17:01:17.870Z
Status: `kosmosketch_adapter_contract_passed`
Contract: `examples/kosmo-orbit/runtime/kosmosketch-tool-adapter.contract.json`
Target Tool: `kosmo-draw.kosmosketch`

Static review-only check for the KosmoSketch target_tool contract. It does not call /jobs, /router/plan, approvals, artifact upload, Blender, KosmoSketch jobs, BIM writes, Bridge writes, IFC export, 2D regeneration, iPad upload, external accounts or cost jobs.

## Summary

- checks: 20/20 passed
- keywords: 12
- aliases: 5
- artifact contracts: 3
- blocked today: 13
- promotion requirements: 6

## Artifact Contract

| Type | Name | Purpose |
| --- | --- | --- |
| `diff` | `kosmosketch-intent-preview` | SketchIntent, confidence, clarifying questions, proposed edit operations and preview diff. |
| `blender_export` | `kosmosketch-approved-commit` | Approved model commit output, Bridge payload, IFC or regenerated 2D package. |
| `markdown_package` | `kosmosketch-human-review-pack` | Human-readable review summary for project lead, design architect and owner. |

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `contract_file_exists` | `passed` | KosmoSketch adapter contract exists. |
| `status_ready` | `passed` | KosmoSketch adapter contract status is ready. |
| `mode_static_review_only` | `passed` | KosmoSketch adapter contract is static review-only. |
| `target_tool_selected` | `passed` | Target tool is selected as kosmo-draw.kosmosketch. |
| `department_entwurf` | `passed` | Department is Entwurf. |
| `routing_keywords_present` | `passed` | Routing keywords cover sketch and core edit intents. |
| `aliases_present` | `passed` | Aliases cover KosmoSketch and KosmoDraw naming variants. |
| `job_contract_present` | `passed` | JobCreate, execute_after_approval, router and panic contracts are present. |
| `approval_contract_present` | `passed` | Approval contract requires review before model writes. |
| `artifact_contract_present` | `passed` | Artifact contract includes diff, blender_export and markdown_package. |
| `blocked_actions_present` | `passed` | Executable backend, Blender, BIM, Bridge, IFC and 2D actions are blocked today. |
| `allowed_today_review_only` | `passed` | Allowed today items are static review and readiness only. |
| `review_roles_present` | `passed` | Review roles include owner, IT/KI, project lead, design architect and privacy review. |
| `promotion_requirements_present` | `passed` | Promotion requirements include owner, Zentrale, KosmoDraw, review gate, panic and no customer data. |
| `component_imports_contract` | `passed` | Component imports the KosmoSketch adapter contract. |
| `component_renders_adapter_copy` | `passed` | Component renders KosmoSketch target-tool copy. |
| `component_renders_safety_boundary` | `passed` | Component keeps jobs, router, approvals, artifacts, Blender, BIM, IFC and 2D regeneration blocked. |
| `route_imports_adapter` | `passed` | Orbit route imports the KosmoSketch adapter component. |
| `route_anchors_adapter` | `passed` | Orbit route renders a kosmosketch-adapter anchor. |
| `section_index_links_adapter` | `passed` | Section index links to KosmoSketch adapter. |

## Next Actions

- KosmoSketch ToolAdapter in KosmoOrbit sichtbar pruefen.
- Nach Gruenstand den Contract an KosmoDraw/KosmoZentrale spiegeln.
- Erst danach einen lokalen nicht-schreibenden Adapter-Smoke mit Testdaten vorbereiten.
