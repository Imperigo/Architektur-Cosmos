# KosmoAsset Source Candidate Map

Generated: 2026-06-30T06:46:38.917Z
Status: `kosmoasset_source_candidate_map_review_only_ready`

## Summary

- Selection status: source_root_owner_selection_needed
- Asset bridge: null
- Source candidates seen: 10
- Asset-lane candidates: 3
- Material library candidates: 2
- Project asset candidates: 1
- Blocked reference-root candidates: 10
- Public-ready after map: 0

## Candidate Lanes

| Candidate | Lane | Role | Score | Reference root allowed | Asset use now | Required confirmation | Path |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | not_asset_lane | workflow_mirror_or_codex_context | 70 | no | no | keep_blocked_for_asset_use | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite` |
| `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-abgabe-tkb-bibl` | material_texture_library | asset_material_library_candidate | 60 | no | no | owner_confirms_kosmoasset_material_source_then_rights_review | `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/abgabe/TKB_Bibliothek_Live-Final-Test_Abgabe` |
| `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-ai-architektur-` | material_texture_library | asset_material_library_candidate | 60 | no | no | owner_confirms_kosmoasset_material_source_then_rights_review | `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/Ai Architektur Workflow/PBR Library + HDRI` |
| `possible-source-root-mnt-archiv-01-architekturkosmos-projekt-00-einrichtung-home-pc-kosmow` | not_asset_lane | workflow_mirror_or_codex_context | 52 | no | no | keep_blocked_for_asset_use | `/mnt/archiv/01 ArchitekturKosmos Projekt/00 Einrichtung Home_PC/KosmoWebsite` |
| `possible-source-root-mnt-archiv-architekturkosmos-assets` | project_asset_library | archive_subtree_candidate | 52 | no | no | owner_confirms_asset_scope_then_private_metadata_only_inventory | `/mnt/archiv/ArchitekturKosmos/Assets` |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc` | not_asset_lane | onedrive_mirror_candidate | 48 | no | no | keep_blocked_for_asset_use | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC` |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | not_asset_lane | workflow_mirror_or_codex_context | 48 | no | no | keep_blocked_for_asset_use | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/repo-context` |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | not_asset_lane | workflow_mirror_or_codex_context | 48 | no | no | keep_blocked_for_asset_use | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/reports` |
| `mount_archive_or_missing_root` | not_asset_lane | owner_storage_action | - | no | no | keep_blocked_for_asset_use | - |
| `repair_onedrive_first` | not_asset_lane | onedrive_integrity_gate | - | no | no | keep_blocked_for_asset_use | - |

## Blockers

- `source_root_owner_selection`: active - Owner/KosmoOverseer has not selected an exact private source root.
- `asset_bridge_review_only`: active - KosmoAsset reference bridge must stay review-only and passing before new candidate lanes are promoted.
- `public_ready_zero`: active - All source-derived KosmoAsset candidates stay public-ready=false until rights and human review gates pass.

## Next Actions

- Use material_texture_library candidates only as KosmoAsset review inputs after owner confirmation.
- Do not treat KosmoAsset material libraries as the main KosmoReferences source root.
- After owner selection, run private diagnostics on the exact selected path before any extraction.
- Keep public-ready at 0 until rights, provenance and human review gates pass.

## Safety

This map is metadata-only. It does not read private source contents, copy assets, create textures, generate models or approve public use.
