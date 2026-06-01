# KosmoOrbit Pilot Session Check

Generated: 2026-06-01T13:45:04.135Z
Status: `orbit_pilot_session_template_ready`
Session: `examples/kosmo-orbit/pilot/orbit-office-pilot-session.demo.json`

Checks the local office pilot template for safe measurement structure. It does not store real customer data, does not upload anything and does not claim completed pilot results.

## Summary

- checks: 17/17 passed
- roles: 5
- runbook steps: 5
- measurement points: 5

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `schema_exists` | `passed` | Pilot session schema exists. |
| `session_exists` | `passed` | Pilot session template exists. |
| `no_parse_failures` | `passed` | Pilot session JSON parsed successfully. |
| `schema_version` | `passed` | Pilot session uses schema version 0.1. |
| `local_review_only` | `passed` | Pilot session stays local review only. |
| `planned_not_claimed` | `passed` | Demo pilot session is planned, not claimed as completed. |
| `duration_guard` | `passed` | Pilot duration is 45 to 60 minutes. |
| `project_package_exists` | `passed` | Referenced demo project package exists. |
| `safety_flags` | `passed` | All required safety flags are true. |
| `roles_known` | `passed` | Pilot roles use known KosmoOrbit role ids. |
| `runbook_complete` | `passed` | Pilot runbook has all five required steps. |
| `metrics_complete` | `passed` | Pilot measurement points cover all required metrics. |
| `metrics_are_empty_template` | `passed` | Demo measurement values are still empty until a real pilot runs. |
| `decision_not_run_yet` | `passed` | Pilot decision is not claimed yet. |
| `no_human_reviewer_in_template` | `passed` | Demo template contains no human reviewer name. |
| `no_failures` | `passed` | No blocking validation failures were collected. |
| `warnings_allowed` | `passed` | Warnings are informational only. |

## Warnings

- none

## Next Actions

- Use this template for a real office pilot only after anonymising project inputs.
- Keep values null until a human records real pilot measurements.
- Do not treat planned pilot templates as proof of time or cost savings.
