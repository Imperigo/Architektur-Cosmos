# KosmoAsset Candidate Taxonomy Review

Generated: 2026-06-16T17:45:28.717Z
Status: `kosmoasset_candidate_taxonomy_review_ready`

## Summary

- Source map: kosmoasset_source_candidate_map_review_only_ready
- Candidate reviews: 10
- Reviewable asset lanes: 3
- Material rights review: 2
- Project asset scope review: 1
- Blocked non-asset: 7
- Owner confirmations required: 3
- Private inventory candidates after owner: 3
- Failures: 0
- Public-ready after review: 0

## Lane Definitions

| Lane | Order | Owner confirmation | Private inventory now | Public-ready | Description |
| --- | ---: | --- | --- | ---: | --- |
| `material_texture_library` | 1 | yes | no | 0 | Material and texture libraries; owner confirmation and rights review before metadata inventory. |
| `project_asset_library` | 2 | yes | no | 0 | Project-level 2D/3D asset libraries; owner scope confirmation before metadata-only inventory. |
| `not_asset_lane` | 3 | no | no | 0 | Workflow mirrors, Codex context, missing roots or non-asset folders; keep blocked for KosmoAsset ingestion. |

## Candidate Reviews

| Candidate | Review lane | Owner confirmation | Inventory after owner | Next gate |
| --- | --- | --- | --- | --- |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | blocked_non_asset | no | no | keep_blocked_no_asset_action |
| `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-abgabe-tkb-bibl` | material_rights_review | yes | yes | owner_material_source_confirmation_then_rights_review |
| `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-ai-architektur-` | material_rights_review | yes | yes | owner_material_source_confirmation_then_rights_review |
| `possible-source-root-mnt-archiv-01-architekturkosmos-projekt-00-einrichtung-home-pc-kosmow` | blocked_non_asset | no | no | keep_blocked_no_asset_action |
| `possible-source-root-mnt-archiv-architekturkosmos-assets` | project_asset_scope_review | yes | yes | owner_asset_scope_confirmation_then_metadata_inventory_preflight |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc` | blocked_non_asset | no | no | keep_blocked_no_asset_action |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | blocked_non_asset | no | no | keep_blocked_no_asset_action |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | blocked_non_asset | no | no | keep_blocked_no_asset_action |
| `mount_archive_or_missing_root` | blocked_non_asset | no | no | keep_blocked_no_asset_action |
| `repair_onedrive_first` | blocked_non_asset | no | no | keep_blocked_no_asset_action |

## Hard Stops

- Do not copy candidate paths into downstream asset review tasks.
- Do not inspect private asset folders before owner confirmation.
- Do not run private metadata inventory from this review.
- Do not ingest, generate or publish assets.
- Keep public-ready at 0.

## Next Actions

- Ask owner to confirm whether material_texture_library candidates belong in KosmoAsset.
- Ask owner to confirm the scope of project_asset_library candidates before any metadata-only inventory.
- Keep not_asset_lane candidates out of KosmoAsset ingestion.
- Use this taxonomy as the safe input contract for later local worker triage.

## Failures

- None.
