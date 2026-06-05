# KosmoOrbit Workstation Profile Check

Generated: 2026-06-05T17:01:18.011Z
Status: `workstation_profile_contract_passed`
Contract: `examples/kosmo-orbit/workstations/orbit-workstation-profile.contract.json`

Static review-only check for the future role-specific KosmoOrbit workstation profiles. It validates local JSON and React source only; it does not create accounts, persist user profiles, start models, launch tools, upload, publish, access external accounts or spend money.

## Summary

- checks: 16/16 passed
- profiles: 8
- learning profiles: 3
- safety flags: 12/12
- escalation rules: 4

## Profiles

| Profile | Role | Station | Depth | Modules | Blocked | Human Gate |
| --- | --- | --- | --- | --- | --- | --- |
| `owner-admin-workstation` | `owner_admin` | decision_station | full | 5 | 3 | Owner-Go und Security Review |
| `it-ai-admin-workstation` | `it_ai_admin` | infrastructure_station | full | 4 | 4 | IT/KI Freigabe und Owner-Kostenfreigabe |
| `project-lead-workstation` | `project_lead_architect` | project_control_station | decision | 5 | 3 | Projektleitungs-Review und Owner-Go fuer Public Gate |
| `design-architect-workstation` | `design_architect` | design_review_station | creative | 5 | 3 | Design Review und Modellqualitaets-Gate |
| `drafter-efz-workstation` | `drafter_efz` | production_review_station | technical | 4 | 3 | Modellqualitaets-Review und Projektleitungsfreigabe |
| `intern-workstation` | `intern` | guided_assist_station | guided | 3 | 4 | Betreuung durch Projektleitung oder Entwurf |
| `apprentice-workstation` | `apprentice` | learning_station | learning | 2 | 4 | Ausbildner-Review |
| `trial-user-workstation` | `trial_user` | observer_station | observer | 1 | 5 | Begleitperson im Buero |

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `contract_file_exists` | `passed` | Workstation profile contract file exists. |
| `status_ready` | `passed` | Workstation profile contract status is ready. |
| `mode_static_review_only` | `passed` | Workstation profile contract is static review-only. |
| `required_roles_present` | `passed` | Contract covers all expected office roles. |
| `profile_count` | `passed` | Contract defines at least eight workstation profiles. |
| `all_profiles_have_startup_contract` | `passed` | Every profile has station type, startup surface, focus, modules, safe actions, blocked actions and human gate. |
| `learning_profiles_are_guided` | `passed` | Learning and observer profiles stay guided or observer depth. |
| `safety_flags_present` | `passed` | All workstation safety flags are present and true. |
| `blocks_sensitive_actions` | `passed` | Workstation profiles block runtime, write, upload, publish and external actions. |
| `has_escalation_rules` | `passed` | Contract includes explicit escalation rules. |
| `component_imports_contract` | `passed` | Component imports the local workstation profile contract. |
| `component_renders_workstation_copy` | `passed` | Component renders workstation profile copy. |
| `component_renders_safety_boundary` | `passed` | Component states no accounts, user writes, persistence or auth runtime. |
| `route_imports_workstation_profile` | `passed` | Orbit route imports the workstation profile component. |
| `route_anchors_workstation_profile` | `passed` | Orbit route renders a workstation-profile anchor. |
| `section_index_links_workstation_profile` | `passed` | Section index links to workstation profiles. |

## Next Actions

- Use this contract as the safe local profile map before building persistent users or auth.
- Keep every workstation profile review-only until KosmoZentrale runtime and local identity storage are explicitly designed.
- Use the profile contract in a future pilot to decide which role-specific surface should be built first.
