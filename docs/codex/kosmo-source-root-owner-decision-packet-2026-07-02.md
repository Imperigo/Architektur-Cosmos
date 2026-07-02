# Kosmo Source-Root Owner Decision Packet

Generated: 2026-07-02T06:21:36.468Z
Status: `source_root_owner_decision_packet_ready`

## Summary

- Owner action required: yes
- Recommended decision: `mount_archive_first_or_confirm_non_archive_root`
- Decision refresh: source_root_decision_session_refresh_not_needed, options 10
- Candidate integrity: source_root_candidate_integrity_owner_review_ready
- Visible path options: 8
- Owner-confirmable exact roots: 1
- Workflow mirrors: 4
- Asset candidates: 2
- Selected decision: `pending`
- Selected root path: `pending`
- Private diagnostic allowed: no
- Decision templates: 3
- Failures: 0
- Public-ready after packet: 0

## Owner Question

- `source_root_decision_now`: Which exact source-root decision should be recorded now?
- Safe default: `keep_blocked`

## Decision Templates

### keep_blocked

- Label: Keep source-root blocked
- When: Owner is not ready to identify the complete private architecture library root.
- Unlocks private metadata diagnostic: no
- Session fields:
  - `status`: `source_root_decision_session_recorded`
  - `selected_decision`: `keep_blocked`
  - `selected_root_path`: `null`

### repair_onedrive_first

- Label: Repair OneDrive first
- When: Owner says the intended source root is a OneDrive mirror but sync markers/completeness are not resolved.
- Unlocks private metadata diagnostic: no
- Session fields:
  - `status`: `source_root_decision_session_recorded`
  - `selected_decision`: `repair_onedrive_first`
  - `selected_root_path`: `null`

### select_exact_root_1

- Label: Select visible exact root for metadata diagnostic
- When: Owner/KosmoOverseer explicitly confirms this exact path is the complete private source root for metadata-only diagnostics.
- Caution: Visible archive subtree; owner/overseer may confirm this exact path before diagnostics.
- Unlocks private metadata diagnostic: yes
- Session fields:
  - `status`: `source_root_decision_session_recorded`
  - `selected_decision`: `select_existing_root_for_private_diagnostic`
  - `selected_root_path`: `/mnt/archiv/ArchitekturKosmos/Assets`

## Option Groups

### Owner-confirmable Exact Roots

| Path | Guard | Score | Activation now | Reason |
| --- | --- | ---: | --- | --- |
| `/mnt/archiv/ArchitekturKosmos/Assets` | owner_confirmable_exact_root | 52 | no | Visible archive subtree; owner/overseer may confirm this exact path before diagnostics. |

### Workflow Mirrors Keep Blocked

| Path | Guard | Score | Activation now | Reason |
| --- | --- | ---: | --- | --- |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite` | workflow_mirror_or_codex_context | 70 | no | Visible but looks like workflow/repo context, not the complete private architecture library. |
| `/mnt/archiv/01 ArchitekturKosmos Projekt/00 Einrichtung Home_PC/KosmoWebsite` | workflow_mirror_or_codex_context | 52 | no | Visible but looks like workflow/repo context, not the complete private architecture library. |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/repo-context` | workflow_mirror_or_codex_context | 48 | no | Visible but looks like workflow/repo context, not the complete private architecture library. |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/reports` | workflow_mirror_or_codex_context | 48 | no | Visible but looks like workflow/repo context, not the complete private architecture library. |

### Asset Sources For KosmoAsset Review Only

| Path | Guard | Score | Activation now | Reason |
| --- | --- | ---: | --- | --- |
| `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/abgabe/TKB_Bibliothek_Live-Final-Test_Abgabe` | asset_material_library_candidate | 60 | no | Visible but better treated as KosmoAsset/material source, not main KosmoReferences source root. |
| `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/Ai Architektur Workflow/PBR Library + HDRI` | asset_material_library_candidate | 60 | no | Visible but better treated as KosmoAsset/material source, not main KosmoReferences source root. |

## Forbidden Until After Recorded Owner Decision

- private metadata inventory against any selected root
- private OCR or PDF/book text extraction
- copying private scans, plans, images or lecture material into Git
- public-ready promotion for private-source-derived references or assets

## Exact Next Commands After Recorded Owner Decision

- `npm run kosmo:source-root-decision-session-check`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:source-root-activation-preflight`
- `npm run kosmo:private-metadata-inventory`
- `npm run kosmo:private-metadata-inventory-check`
- `npm run kosmo:day-batch-loop`

## Failures

- None.
