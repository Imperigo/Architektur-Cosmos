# Kosmo Source-Root Decision Session

Created: 2026-07-21T15:50:07.692Z
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
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | possible_source_root | 70 | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite` | keep_blocked |
| `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-abgabe-tkb-bibl` | possible_source_root | 60 | `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/abgabe/TKB_Bibliothek_Live-Final-Test_Abgabe` | keep_blocked |
| `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-ai-architektur-` | possible_source_root | 60 | `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/Ai Architektur Workflow/PBR Library + HDRI` | keep_blocked |
| `possible-source-root-mnt-archiv-01-architekturkosmos-projekt-00-einrichtung-home-pc-kosmow` | possible_source_root | 52 | `/mnt/archiv/01 ArchitekturKosmos Projekt/00 Einrichtung Home_PC/KosmoWebsite` | keep_blocked |
| `possible-source-root-mnt-archiv-architekturkosmos-assets` | possible_source_root | 52 | `/mnt/archiv/ArchitekturKosmos/Assets` | keep_blocked |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc` | possible_source_root | 48 | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC` | keep_blocked |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | possible_source_root | 48 | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/repo-context` | keep_blocked |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | possible_source_root | 48 | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/reports` | keep_blocked |
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
