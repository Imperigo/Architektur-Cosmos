# Kosmo Source-Root Unlock Runbook

Generated: 2026-06-14T07:50:04.116Z
Status: `source_root_unlock_runbook_owner_storage_action_needed`

## Hard State

- Blocker: source_root_blocker_still_active
- OneDrive marker/leaf/missing: 59/58/58
- Source-root candidates/probable/mirrors: 717/0/64
- Selected decision: pending
- Selected root exists: no
- Private diagnostic allowed: no
- Router status: worker_router_guarded_review_only
- Public-ready after runbook: 0

## Owner / Storage Actions

- `mount_or_confirm_real_root`: Mount or confirm the exact real book/ETH/HSLU architecture source root. Success: The selected path exists and is not only a workflow/project mirror.
- `repair_onedrive_if_used`: Repair OneDrive sync if the chosen source root is OneDrive-based. Success: OneDrive marker/leaf/missing counts no longer indicate incomplete source access.
- `record_decision_session`: Record selected_decision and selected_root_path in the approved source-root decision session. Success: `npm run kosmo:source-root-decision-session-check` reports private_diagnostic_allowed=true.

## Selection Options

| Option | Class | Score | Path | Safe default |
| --- | --- | ---: | --- | --- |
| `workflow-or-project-mirror-mnt-data-architekturkosmos-11-ai-workflow-onedrive-2026-06-09-0` | workflow_or_project_mirror | 38 | /mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/00 Einrichtung Home_PC/KosmoWebsite | keep_blocked |
| `possible-source-root-mnt-data-architekturkosmos` | possible_source_root | 32 | /mnt/data/ArchitekturKosmos | keep_blocked |
| `incomplete-onedrive-candidate-home-andrin-baumann-architekturkosmos-onedrive` | incomplete_onedrive_candidate | 22 | /home/andrin-baumann/ArchitekturKosmos Onedrive | keep_blocked |
| `weak-path-signal-mnt-archiv` | weak_path_signal | 20 | /mnt/archiv | keep_blocked |
| `weak-path-signal-mnt-data-archive-logs` | weak_path_signal | 20 | /mnt/data/_archive_logs | keep_blocked |
| `weak-path-signal-mnt-data-zum-archivieren` | weak_path_signal | 20 | /mnt/data/Zum_Archivieren | keep_blocked |
| `workflow-or-project-mirror-home-andrin-baumann-architekturkosmos-onedrive-11-ai-workflow` | workflow_or_project_mirror | 16 | /home/andrin-baumann/ArchitekturKosmos Onedrive/11 AI Workflow | keep_blocked |
| `workflow-or-project-mirror-home-andrin-baumann-architekturkosmos-onedrive-11-ai-workflow-0` | workflow_or_project_mirror | 16 | /home/andrin-baumann/ArchitekturKosmos Onedrive/11 AI Workflow/00 Architekturkosmos Zentrale | keep_blocked |
| `mount_archive_or_missing_root` | missing_or_unmounted_root | - | - | keep_blocked |
| `repair_onedrive_first` | sync_repair_first | - | - | repair_before_inventory |

## Command Sequence After Storage Action

- `npm run kosmo:source-root-locator`
- `npm run kosmo:source-root-selection-brief`
- `npm run kosmo:source-root-decision-session-check`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:data-lane-command-router`
- `npm run kosmo:worker-boundary-pack`
- `npm run kosmo:worker-boundary-pack-check`

## Still Forbidden Until Unlock

- private PDF/OCR extraction
- private inventory extraction
- source-dependent asset authoring
- public-ready promotion
- local-worker Git/cloud/public writes

## Next Actions

- Owner/KosmoOverseer chooses storage path or repairs sync outside Git.
- Rerun the command sequence only after that storage action.
- If private_diagnostic_allowed remains false, keep all source-dependent work blocked.
