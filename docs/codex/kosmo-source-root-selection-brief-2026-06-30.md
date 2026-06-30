# Kosmo Source-Root Selection Brief

Generated: 2026-06-30T07:10:47.508Z
Status: `source_root_owner_selection_needed`

## Summary

- Locator status: source_root_candidates_need_owner_selection
- Candidates: 1307
- Probable large private libraries: 0
- Workflow/project mirrors: 71
- OneDrive-like roots: 149
- Roots with sync errors: 5
- Archive mount visible: yes
- Archive mount source/total GiB: /dev/sda/11086.8
- Data mount source/total GiB: /dev/nvme1n1/3666.5
- Owner selection required: yes
- Public-ready after brief: 0

## Selection Options

| Option | Role guess | Classification | Score | Path | Safe default | Recommended action |
| --- | --- | --- | ---: | --- | --- | --- |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | workflow_mirror_or_codex_context | possible_source_root | 70 | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite` | keep_blocked | Treat as workflow/context mirror first; only select as source root if owner explicitly confirms it contains the complete private architecture library. |
| `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-abgabe-tkb-bibl` | asset_material_library_candidate | possible_source_root | 60 | `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/abgabe/TKB_Bibliothek_Live-Final-Test_Abgabe` | keep_blocked | Treat as KosmoAsset/material-library candidate; do not use as the main architecture reference root without owner confirmation. |
| `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-ai-architektur-` | asset_material_library_candidate | possible_source_root | 60 | `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/Ai Architektur Workflow/PBR Library + HDRI` | keep_blocked | Treat as KosmoAsset/material-library candidate; do not use as the main architecture reference root without owner confirmation. |
| `possible-source-root-mnt-archiv-01-architekturkosmos-projekt-00-einrichtung-home-pc-kosmow` | workflow_mirror_or_codex_context | possible_source_root | 52 | `/mnt/archiv/01 ArchitekturKosmos Projekt/00 Einrichtung Home_PC/KosmoWebsite` | keep_blocked | Treat as workflow/context mirror first; only select as source root if owner explicitly confirms it contains the complete private architecture library. |
| `possible-source-root-mnt-archiv-architekturkosmos-assets` | archive_subtree_candidate | possible_source_root | 52 | `/mnt/archiv/ArchitekturKosmos/Assets` | keep_blocked | Keep blocked unless owner/overseer confirms this exact path as the real source root. |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc` | onedrive_mirror_candidate | possible_source_root | 48 | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC` | keep_blocked | Treat as OneDrive mirror candidate; confirm completeness and sync health before any private metadata inventory. |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | workflow_mirror_or_codex_context | possible_source_root | 48 | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/repo-context` | keep_blocked | Treat as workflow/context mirror first; only select as source root if owner explicitly confirms it contains the complete private architecture library. |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | workflow_mirror_or_codex_context | possible_source_root | 48 | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/reports` | keep_blocked | Treat as workflow/context mirror first; only select as source root if owner explicitly confirms it contains the complete private architecture library. |
| `mount_archive_or_missing_root` | owner_storage_action | missing_or_unmounted_root | - | - | keep_blocked | Mount or expose the real archive/OneDrive library root, then rerun locator and private-library diagnostic. |
| `repair_onedrive_first` | onedrive_integrity_gate | sync_repair_first | - | - | repair_before_inventory | Resolve OneDrive sync error roots before using visible OneDrive mirrors for inventory. |

## Owner Questions

- `true_private_library_root`: Which exact path is the real large book/ETH/HSLU architecture source library? Safe default: `unknown_keep_blocked`.
- `archive_mount`: The archive HDD is mounted at /mnt/archiv. Which exact folder inside it, if any, is the real private source root? Safe default: `select_exact_subfolder_or_keep_blocked`.
- `onedrive_repair`: Should OneDrive sync repair happen before any private metadata inventory? Safe default: `repair_before_inventory`.
- `private_inventory_scope`: After a true root is selected, should the first inventory cover only Villa/Sogn/Ingenbohl or the whole architecture library? Safe default: `pilots_first_metadata_only`.

## Blocked Until Selection

- `sogn_private_source_inventory`
- `ingenbohl_pdf_private_extraction`
- `source_dependent_asset_authoring`
- `public_ready_promotion_from_private_sources`

## Next Actions

- Owner/Claude/KosmoOverseer selects the exact real private source root, now preferably as a concrete folder path rather than a broad mount.
- Run npm run kosmo:private-library-diagnostic -- --roots "<selected-root>" after selection.
- Open a private metadata-only inventory task under KosmoZentrale, not Git.
- Keep all source-dependent public-ready states at 0 until provenance and rights reviews pass.

## Safety

This brief is metadata-only. It does not authorize private extraction, public-ready flags, PDF ingestion or source-dependent asset promotion.
