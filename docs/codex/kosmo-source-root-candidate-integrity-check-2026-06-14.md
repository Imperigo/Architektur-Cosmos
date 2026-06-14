# Kosmo Source-Root Candidate Integrity Check

Generated: 2026-06-14T14:32:54.317Z
Status: `source_root_candidate_integrity_owner_review_ready`

## Summary

- Selection status: source_root_owner_selection_needed
- Options/path/existing: 10/8/8
- Archive path options: 8
- Workflow mirror options: 4
- Asset candidate options: 2
- Broad unsafe options: 0
- Owner-confirmable exact roots: 1
- Archive mount visible/source: yes//dev/sda
- Private diagnostic allowed: no
- Selected root exists: no
- Failures: 0
- Public-ready after check: 0

## Option Checks

| Option | Exists | Mount | Role | Guard | Top-level | Reason |
| --- | --- | --- | --- | --- | ---: | --- |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | yes | /mnt/archiv | workflow_mirror_or_codex_context | workflow_mirror_or_codex_context | 15 | Visible but looks like workflow/repo context, not the complete private architecture library. |
| `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-abgabe-tkb-bibl` | yes | /mnt/archiv | asset_material_library_candidate | asset_material_library_candidate | 6 | Visible but better treated as KosmoAsset/material source, not main KosmoReferences source root. |
| `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-ai-architektur-` | yes | /mnt/archiv | asset_material_library_candidate | asset_material_library_candidate | 1 | Visible but better treated as KosmoAsset/material source, not main KosmoReferences source root. |
| `possible-source-root-mnt-archiv-01-architekturkosmos-projekt-00-einrichtung-home-pc-kosmow` | yes | /mnt/archiv | workflow_mirror_or_codex_context | workflow_mirror_or_codex_context | 15 | Visible but looks like workflow/repo context, not the complete private architecture library. |
| `possible-source-root-mnt-archiv-architekturkosmos-assets` | yes | /mnt/archiv | archive_subtree_candidate | owner_confirmable_exact_root | 3 | Visible archive subtree; owner/overseer may confirm this exact path before diagnostics. |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc` | yes | /mnt/archiv | onedrive_mirror_candidate | onedrive_mirror_candidate | 30 | Visible OneDrive mirror; confirm sync completeness before any private metadata inventory. |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | yes | /mnt/archiv | workflow_mirror_or_codex_context | workflow_mirror_or_codex_context | 10 | Visible but looks like workflow/repo context, not the complete private architecture library. |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | yes | /mnt/archiv | workflow_mirror_or_codex_context | workflow_mirror_or_codex_context | 2 | Visible but looks like workflow/repo context, not the complete private architecture library. |
| `mount_archive_or_missing_root` | - | - | owner_storage_action | owner_storage_action | - | Mount or expose the real archive/OneDrive library root, then rerun locator and private-library diagnostic. |
| `repair_onedrive_first` | - | - | onedrive_integrity_gate | sync_repair_gate | - | Resolve OneDrive sync error roots before using visible OneDrive mirrors for inventory. |

## Guardrails

- Visible archive paths are evidence only; they are not selected roots.
- Workflow mirrors and repo-context paths stay blocked unless the owner explicitly confirms they are the complete private library.
- Asset/material libraries may feed KosmoAsset review lanes, but not the main KosmoReferences source root by default.
- Broad project roots or mount roots are too coarse for automatic activation.
- Private inventory remains blocked until the decision session records one exact owner-confirmed root.

## Next Actions

- Present the existing archive path candidates to Owner/KosmoOverseer as review-only options.
- Ask for one exact private library root, preferably a subfolder that is not a workflow mirror or asset-only library.
- After the decision session is edited by the owner/overseer, rerun source-root decision check, blocker refresh and activation preflight.
