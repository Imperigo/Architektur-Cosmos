# Kosmo Source-Root Decision Session

Created: 2026-06-13T19:57:58.941Z
Status: `source_root_decision_session_pending`

## Decision Fields

- Selected decision: `pending`
- Selected root path: `pending`
- Public-ready after session: 0

## Allowed Decisions

- `keep_blocked`
- `mount_archive_first`
- `repair_onedrive_first`
- `select_existing_root_for_private_diagnostic`
- `select_root_after_mount_check`

## Selection Options

| Option | Classification | Score | Path | Safe default |
| --- | --- | ---: | --- | --- |
| `workflow-or-project-mirror-mnt-data-architekturkosmos-11-ai-workflow-onedrive-2026-06-09-0` | workflow_or_project_mirror | 38 | `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/00 Einrichtung Home_PC/KosmoWebsite` | keep_blocked |
| `possible-source-root-mnt-data-architekturkosmos` | possible_source_root | 32 | `/mnt/data/ArchitekturKosmos` | keep_blocked |
| `incomplete-onedrive-candidate-home-andrin-baumann-architekturkosmos-onedrive` | incomplete_onedrive_candidate | 22 | `/home/andrin-baumann/ArchitekturKosmos Onedrive` | keep_blocked |
| `weak-path-signal-mnt-archiv` | weak_path_signal | 20 | `/mnt/archiv` | keep_blocked |
| `weak-path-signal-mnt-data-archive-logs` | weak_path_signal | 20 | `/mnt/data/_archive_logs` | keep_blocked |
| `weak-path-signal-mnt-data-zum-archivieren` | weak_path_signal | 20 | `/mnt/data/Zum_Archivieren` | keep_blocked |
| `workflow-or-project-mirror-home-andrin-baumann-architekturkosmos-onedrive-11-ai-workflow` | workflow_or_project_mirror | 16 | `/home/andrin-baumann/ArchitekturKosmos Onedrive/11 AI Workflow` | keep_blocked |
| `workflow-or-project-mirror-home-andrin-baumann-architekturkosmos-onedrive-11-ai-workflow-0` | workflow_or_project_mirror | 16 | `/home/andrin-baumann/ArchitekturKosmos Onedrive/11 AI Workflow/00 Architekturkosmos Zentrale` | keep_blocked |
| `mount_archive_or_missing_root` | missing_or_unmounted_root | - | - | keep_blocked |
| `repair_onedrive_first` | sync_repair_first | - | - | repair_before_inventory |

## Blocked Until Recorded Selection

- `sogn_private_source_inventory`
- `ingenbohl_pdf_private_extraction`
- `source_dependent_asset_authoring`
- `public_ready_promotion_from_private_sources`

## Next Actions

- Owner/Claude/KosmoOverseer sets selected_decision and, if selecting a root, selected_root_path.
- Run npm run kosmo:source-root-decision-session-check.
- Only after a passing recorded selection may Codex/Claude run the private-library diagnostic against the selected root.
- Keep all source-dependent public-ready states at 0 until later provenance and rights reviews pass.

## Safety

This session is metadata-only. It does not authorize private extraction, PDF ingestion, public-ready flags or source-dependent asset promotion.
