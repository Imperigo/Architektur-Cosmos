# KosmoOrbit Push Decision Draft Check

Generated: 2026-06-05T17:01:17.627Z
Status: `push_decision_draft_passed`
Contract: `examples/kosmo-orbit/governance/orbit-push-decision-draft.contract.json`

Static review-only check for a local push decision draft. It does not push, deploy, create PRs, mutate GitHub, read secrets, install dependencies or spend money.

## Summary

- checks: 16/16 passed
- positive evidence: 4
- blocking evidence: 4
- owner-go checklist: 7
- blocked today: 9

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `contract_file_exists` | `passed` | Push decision draft contract exists. |
| `status_ready` | `passed` | Push decision draft is ready. |
| `mode_static_review_only` | `passed` | Push decision draft is static review-only. |
| `decision_holds_local` | `passed` | Decision recommends holding local and not pushing now. |
| `positive_evidence_present` | `passed` | Positive evidence includes route smoke, full review, loop ledger and GitHub Imperigo gate. |
| `blocking_evidence_present` | `passed` | Blocking evidence includes TypeScript, ESLint, Next build and static export smoke. |
| `owner_go_checklist_present` | `passed` | Owner-Go checklist covers Git, TypeScript, ESLint, build, static smoke and live smoke. |
| `prepared_summary_present` | `passed` | Prepared summary includes commit scope, risk note and release note. |
| `blocked_today_present` | `passed` | Blocked today covers push, GitHub mutation, deploy claims, secrets, dependencies and costs. |
| `next_actions_present` | `passed` | Next actions are explicit. |
| `component_imports_contract` | `passed` | Component imports the push decision draft contract. |
| `component_renders_decision_copy` | `passed` | Component renders push decision draft copy. |
| `component_renders_safety_copy` | `passed` | Component renders no-push/deploy safety copy. |
| `route_imports_component` | `passed` | Orbit route imports the push decision draft component. |
| `route_anchors_draft` | `passed` | Orbit route renders push-decision-draft anchor. |
| `section_index_links_draft` | `passed` | Section index links to push decision draft. |

## Next Actions

- Push Decision Draft in /orbit sichtbar machen.
- Route-Smoke und Full-Review um den Draft erweitern.
- Bei spaeterem Owner-Go zuerst Heavy-Check-/Build-Evidenz erneuern.
- Ohne Owner-Go weiter lokal halten.
