# Kosmo Source-Root Owner Final Decision Brief

Generated: 2026-06-14T15:18:12.023Z
Status: `source_root_owner_final_decision_brief_ready`

## Owner Prompt

Welchen Source-Root-Entscheid soll Kosmo jetzt verwenden?

Safe default: Wenn du nicht 100% sicher bist, waehle repair_onedrive_first oder keep_blocked.

Warning: Die unlockende Option darf nur verwendet werden, wenn der angezeigte Pfad exakt die vollstaendige private Architekturquelle ist.

## Summary

- Selection status: source_root_owner_selection_needed
- Decision packet: source_root_owner_decision_packet_ready
- Packet guard: source_root_owner_decision_packet_guard_passed
- Decision session: passed_pending_owner_input
- Activation queue guard: source_root_post_owner_activation_queue_guard_passed
- Locator candidates: 953
- Probable private libraries: 0
- Workflow/project mirrors: 64
- OneDrive-like roots: 148
- Roots with sync errors: 5
- Decision options: 3
- Unlock options: 1
- Recommended default: repair_onedrive_first_or_keep_blocked
- Private diagnostic allowed: no
- Public-ready after brief: 0

## Answer Choices

| Choice | Decision | Root | Unlocks private metadata diagnostic | When to use |
| --- | --- | --- | --- | --- |
| `keep_blocked` | `keep_blocked` | - | no | Owner is not ready to identify the complete private architecture library root. |
| `repair_onedrive_first` | `repair_onedrive_first` | - | no | Owner says the intended source root is a OneDrive mirror but sync markers/completeness are not resolved. |
| `select_exact_root_1` | `select_existing_root_for_private_diagnostic` | `/mnt/archiv/ArchitekturKosmos/Assets` | yes | Owner/KosmoOverseer explicitly confirms this exact path is the complete private source root for metadata-only diagnostics. |

## Visible Candidates

| Candidate | Role | Score | Path | Safe default |
| --- | --- | ---: | --- | --- |

## Post-Decision Command Order

- `npm run kosmo:source-root-decision-session-check`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:source-root-activation-preflight`
- `npm run kosmo:source-root-post-owner-activation-queue`
- `npm run kosmo:source-root-post-owner-activation-queue-check`

## Hard Stops

- Do not edit the decision session from this brief without explicit owner confirmation.
- Do not run private metadata inventory while private_diagnostic_allowed is false.
- Do not run OCR/PDF extraction from private sources at this stage.
- Do not set public-ready from this source-root decision.

## Failures

- None.
