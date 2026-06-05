# KosmoOrbit GitHub Imperigo Gate Check

Generated: 2026-06-05T17:01:17.590Z
Status: `github_imperigo_gate_passed`
Contract: `examples/kosmo-orbit/governance/orbit-github-imperigo-gate.contract.json`

Static review-only check for the GitHub/Imperigo automation boundary. It does not push, create PRs, mutate GitHub, deploy, read secrets, spend money or call external CI.

## Summary

- checks: 16/16 passed
- local autonomy lanes: 3
- owner-go gates: 4
- blocked today: 9
- publish evidence requirements: 7

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `contract_file_exists` | `passed` | GitHub Imperigo gate contract exists. |
| `status_ready` | `passed` | GitHub Imperigo gate is ready. |
| `mode_static_review_only` | `passed` | GitHub Imperigo gate is static review-only. |
| `source_goal_terms_present` | `passed` | Source goal terms are preserved. |
| `local_autonomy_present` | `passed` | Local autonomous actions are explicit and local-only. |
| `owner_go_required_present` | `passed` | Owner-Go required actions cover push, GitHub mutation, live claim and external CI/secrets. |
| `imperigo_protocol_present` | `passed` | Imperigo fire protocol keeps 5-minute interval and midnight Zurich boundary. |
| `publish_evidence_required` | `passed` | Publish evidence requires owner go, Git health, TypeScript, ESLint, build, static smoke and live smoke. |
| `blocked_today_present` | `passed` | Blocked actions prevent GitHub, deploy, secret, CI, live and cost side effects. |
| `next_actions_present` | `passed` | Next actions are explicit. |
| `component_imports_contract` | `passed` | Component imports the GitHub Imperigo gate contract. |
| `component_renders_gate_copy` | `passed` | Component renders GitHub Imperigo gate copy. |
| `component_renders_safety_copy` | `passed` | Component renders safety boundaries. |
| `route_imports_component` | `passed` | Orbit route imports the GitHub Imperigo gate component. |
| `route_anchors_gate` | `passed` | Orbit route renders github-imperigo-gate anchor. |
| `section_index_links_gate` | `passed` | Section index links to GitHub Imperigo gate. |

## Next Actions

- GitHub Imperigo Gate in /orbit sichtbar machen.
- Route-Smoke und Full-Review um den Gate-Vertrag erweitern.
- Fire Records weiterhin lokal speichern.
- Push/Live erst nach explizitem Owner-Go und belastbarer Toolchain-Evidenz.
