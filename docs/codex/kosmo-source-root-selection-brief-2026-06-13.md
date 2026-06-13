# Kosmo Source-Root Selection Brief

Generated: 2026-06-13T21:49:32.726Z
Status: `source_root_owner_selection_needed`

## Summary

- Locator status: source_root_candidates_need_owner_selection
- Candidates: 708
- Probable large private libraries: 0
- Workflow/project mirrors: 64
- OneDrive-like roots: 38
- Roots with sync errors: 5
- Owner selection required: yes
- Public-ready after brief: 0

## Selection Options

| Option | Classification | Score | Path | Safe default | Recommended action |
| --- | --- | ---: | --- | --- | --- |
| `workflow-or-project-mirror-mnt-data-architekturkosmos-11-ai-workflow-onedrive-2026-06-09-0` | workflow_or_project_mirror | 38 | `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/00 Einrichtung Home_PC/KosmoWebsite` | keep_blocked | Treat as workflow mirror only; do not use as the large architecture source library. |
| `possible-source-root-mnt-data-architekturkosmos` | possible_source_root | 32 | `/mnt/data/ArchitekturKosmos` | keep_blocked | Keep blocked unless owner/overseer confirms this exact path as the real source root. |
| `incomplete-onedrive-candidate-home-andrin-baumann-architekturkosmos-onedrive` | incomplete_onedrive_candidate | 22 | `/home/andrin-baumann/ArchitekturKosmos Onedrive` | keep_blocked | Do not inventory yet; repair sync errors or confirm the complete synced root first. |
| `weak-path-signal-mnt-archiv` | weak_path_signal | 20 | `/mnt/archiv` | keep_blocked | Use only as a mount/path clue; not enough evidence for private inventory. |
| `weak-path-signal-mnt-data-archive-logs` | weak_path_signal | 20 | `/mnt/data/_archive_logs` | keep_blocked | Use only as a mount/path clue; not enough evidence for private inventory. |
| `weak-path-signal-mnt-data-zum-archivieren` | weak_path_signal | 20 | `/mnt/data/Zum_Archivieren` | keep_blocked | Use only as a mount/path clue; not enough evidence for private inventory. |
| `workflow-or-project-mirror-home-andrin-baumann-architekturkosmos-onedrive-11-ai-workflow` | workflow_or_project_mirror | 16 | `/home/andrin-baumann/ArchitekturKosmos Onedrive/11 AI Workflow` | keep_blocked | Treat as workflow mirror only; do not use as the large architecture source library. |
| `workflow-or-project-mirror-home-andrin-baumann-architekturkosmos-onedrive-11-ai-workflow-0` | workflow_or_project_mirror | 16 | `/home/andrin-baumann/ArchitekturKosmos Onedrive/11 AI Workflow/00 Architekturkosmos Zentrale` | keep_blocked | Treat as workflow mirror only; do not use as the large architecture source library. |
| `mount_archive_or_missing_root` | missing_or_unmounted_root | - | - | keep_blocked | Mount or expose the real archive/OneDrive library root, then rerun locator and private-library diagnostic. |
| `repair_onedrive_first` | sync_repair_first | - | - | repair_before_inventory | Resolve OneDrive sync error roots before using visible OneDrive mirrors for inventory. |

## Owner Questions

- `true_private_library_root`: Which exact path is the real large book/ETH/HSLU architecture source library? Safe default: `unknown_keep_blocked`.
- `archive_mount`: Should the archive HDD be mounted or exposed at a different path than /mnt/archiv? Safe default: `do_not_assume_mounted`.
- `onedrive_repair`: Should OneDrive sync repair happen before any private metadata inventory? Safe default: `repair_before_inventory`.
- `private_inventory_scope`: After a true root is selected, should the first inventory cover only Villa/Sogn/Ingenbohl or the whole architecture library? Safe default: `pilots_first_metadata_only`.

## Blocked Until Selection

- `sogn_private_source_inventory`
- `ingenbohl_pdf_private_extraction`
- `source_dependent_asset_authoring`
- `public_ready_promotion_from_private_sources`

## Next Actions

- Owner/Claude/KosmoOverseer selects or mounts the real private source root.
- Run npm run kosmo:private-library-diagnostic -- --roots "<selected-root>" after selection.
- Open a private metadata-only inventory task under KosmoZentrale, not Git.
- Keep all source-dependent public-ready states at 0 until provenance and rights reviews pass.

## Safety

This brief is metadata-only. It does not authorize private extraction, public-ready flags, PDF ingestion or source-dependent asset promotion.
