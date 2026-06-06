# KosmoOrbit Pilot Result Draft Check

Generated: 2026-06-06T07:07:25.299Z
Status: `orbit_pilot_result_draft_template_ready`
Draft: `examples/kosmo-orbit/pilot/orbit-office-pilot-result-draft.demo.json`

Checks the empty local result draft for a later human office pilot. It does not claim completed results, savings, quality improvements or public validation.

## Summary

- checks: 21/21 passed
- result slots: 5/5 empty
- missing evidence sources: 3

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `schema_exists` | `passed` | Pilot result draft schema exists. |
| `draft_exists` | `passed` | Pilot result draft template exists. |
| `no_parse_failures` | `passed` | Pilot result draft JSON parsed successfully. |
| `schema_version` | `passed` | Pilot result draft uses schema version 0.1. |
| `not_recorded` | `passed` | Pilot result draft is empty, not a completed result. |
| `local_review_only` | `passed` | Pilot result draft stays local review only. |
| `source_kit_exists` | `passed` | Source pilot measurement kit exists. |
| `source_session_exists` | `passed` | Source pilot session exists. |
| `safety_flags` | `passed` | All required safety flags are true. |
| `result_slots_complete` | `passed` | Result slots cover all required measurements. |
| `result_slots_empty` | `passed` | All result slots are empty until a human pilot records evidence. |
| `required_sources_listed` | `passed` | All required sources are listed for evidence review. |
| `required_sources_exist` | `passed` | All required source files exist locally. |
| `evidence_not_reviewed` | `passed` | Evidence is not reviewed yet. |
| `human_notes_missing` | `passed` | Human pilot notes remain explicitly missing. |
| `publication_blocked` | `passed` | Publication is blocked before real evidence exists. |
| `no_public_claims` | `passed` | No public claims are allowed from the empty template. |
| `decision_not_run_yet` | `passed` | Pilot result decision is not claimed yet. |
| `no_decision_values` | `passed` | Template contains no selected option, reviewer or review note. |
| `no_failures` | `passed` | No blocking validation failures were collected. |
| `warnings_allowed` | `passed` | Warnings are informational only. |

## Warnings

- none

## Next Actions

- Keep result values empty until a human office pilot records observations.
- Do not publish savings, quality or validation claims from this empty template.
- Use this draft only as the future landing place for reviewed pilot evidence.
