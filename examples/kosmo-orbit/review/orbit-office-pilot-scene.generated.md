# KosmoOrbit Office Pilot Scene Check

Generated: 2026-06-05T17:05:32.521Z
Status: `orbit_office_pilot_scene_ready`
Scene: `examples/kosmo-orbit/pilot/orbit-office-pilot-scene.demo.json`

Checks the local office pilot scene contract. It does not run a pilot, store customer data, upload files, push, deploy or claim savings.

## Summary

- checks: 13/13 passed
- steps: 4
- roles: 4
- evidence questions: 4

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `scene_file_exists` | `passed` | Office pilot scene JSON exists. |
| `json_parsed` | `passed` | Office pilot scene JSON parsed successfully. |
| `schema_version` | `passed` | Office pilot scene uses schema version 0.1. |
| `local_review_only` | `passed` | Office pilot scene stays local review only. |
| `tag_review_only` | `passed` | Office pilot scene uses the review-only tag. |
| `safety_flags` | `passed` | All required office pilot safety flags are true. |
| `steps_complete` | `passed` | Office pilot scene has start, review, roles and decision steps. |
| `roles_complete` | `passed` | Office pilot scene covers at least four office roles. |
| `evidence_questions_complete` | `passed` | Office pilot scene keeps at least four evidence questions. |
| `decision_not_run_yet` | `passed` | Office pilot scene does not claim a completed pilot. |
| `no_human_reviewer` | `passed` | Demo office pilot scene contains no human reviewer name. |
| `allowed_outcomes` | `passed` | Office pilot scene has all allowed human outcomes. |
| `no_failures` | `passed` | No blocking validation failures were collected. |

## Failures

- none

## Next Actions

- Use the scene as a local explanation contract for the first office pilot.
- Keep the decision not_run_yet until a human pilot is actually run.
- Do not claim savings, generation or certification from this template.
