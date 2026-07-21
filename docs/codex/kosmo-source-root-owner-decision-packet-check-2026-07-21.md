# Kosmo Source-Root Owner Decision Packet Check

Generated: 2026-07-21T15:54:45.673Z
Status: `source_root_owner_decision_packet_guard_passed`

## Summary

- Packet status: source_root_owner_decision_packet_ready
- Candidate integrity: source_root_candidate_integrity_owner_review_ready
- Decision session: source_root_decision_session_pending
- Decision templates: 3
- Unlocking templates: 1
- Owner-confirmable exact roots: 1
- Failures: 0
- Warnings: 0
- Public-ready after guard: 0

## Findings

| Finding | Severity | Message |
| --- | --- | --- |
| `packet_ready` | passed | Packet status must be ready. |
| `records_decisions_false` | passed | Packet must not record decisions. |
| `mutates_decision_session_false` | passed | Packet must not mutate the decision session. |
| `reads_private_content_false` | passed | Packet must not read private content. |
| `copies_private_content_false` | passed | Packet must not copy private content. |
| `writes_public_files_false` | passed | Packet must not write public files. |
| `writes_public_manifest_false` | passed | Packet must not write public manifests. |
| `packet_public_ready_zero` | passed | Packet must keep public-ready at 0. |
| `private_diagnostic_not_allowed_yet` | passed | Pending packet must not allow private diagnostic yet. |
| `selected_decision_null` | passed | Packet must not contain a selected decision. |
| `selected_root_path_null` | passed | Packet must not contain a selected root path. |
| `candidate_integrity_ready` | passed | Candidate integrity must be ready. |
| `decision_session_pending` | passed | Decision session must remain pending. |
| `session_selected_decision_empty` | passed | Decision session must not contain selected_decision. |
| `session_selected_root_empty` | passed | Decision session must not contain selected_root_path. |
| `templates_present` | passed | Packet must expose at least three decision templates. |
| `template_keep_blocked_present` | passed | keep_blocked template must exist. |
| `template_repair_onedrive_present` | passed | repair_onedrive_first template must exist. |
| `unlocking_template_count_matches_exact_roots` | passed | Unlocking templates must match owner-confirmable exact roots. |
| `unlocking_template_count_limited` | passed | Only one unlocking template is allowed before owner selection. |
| `template:keep_blocked:recorded_status` | passed | Template must record the session only after owner confirmation. |
| `template:keep_blocked:allowed_decision` | passed | Template selected_decision must be allowed: keep_blocked |
| `template:keep_blocked:no_root_for_blocked_decision` | passed | Non-unlocking templates must not include a root path. |
| `template:repair_onedrive_first:recorded_status` | passed | Template must record the session only after owner confirmation. |
| `template:repair_onedrive_first:allowed_decision` | passed | Template selected_decision must be allowed: repair_onedrive_first |
| `template:repair_onedrive_first:no_root_for_blocked_decision` | passed | Non-unlocking templates must not include a root path. |
| `template:select_exact_root_1:recorded_status` | passed | Template must record the session only after owner confirmation. |
| `template:select_exact_root_1:allowed_decision` | passed | Template selected_decision must be allowed: select_existing_root_for_private_diagnostic |
| `template:select_exact_root_1:unlock_decision` | passed | Unlocking template must use select_existing_root_for_private_diagnostic. |
| `template:select_exact_root_1:absolute_root` | passed | Unlocking template must include an absolute selected_root_path. |
| `template:select_exact_root_1:root_in_integrity` | passed | Unlocking template root must match an owner-confirmable exact root. |

## Next Actions

- Use this guarded packet as the owner-facing source-root decision surface.
- Record a decision only after explicit owner/KosmoOverseer confirmation.
- Rerun source-root decision-session check and day batch after any recorded decision.
