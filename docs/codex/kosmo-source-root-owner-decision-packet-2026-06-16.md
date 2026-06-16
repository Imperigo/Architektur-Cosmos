# Kosmo Source-Root Owner Decision Packet

Generated: 2026-06-16T12:30:33.203Z
Status: `source_root_owner_decision_packet_satisfied_metadata_only`

## Summary

- Owner action required: no
- Recommended decision: `already_allowed`
- Decision refresh: source_root_decision_session_refresh_refused, options 10
- Candidate integrity: source_root_candidate_integrity_owner_review_ready
- Visible path options: 8
- Owner-confirmable exact roots: 1
- Workflow mirrors: 4
- Asset candidates: 2
- Selected decision: `select_existing_root_for_private_diagnostic`
- Selected root path: `/mnt/archiv/ArchitekturKosmos/Assets`
- Private diagnostic allowed: yes
- Decision templates: 0
- Failures: 0
- Public-ready after packet: 0

## Owner Question

- `source_root_decision_now`: Source-root decision has already been recorded and guarded.
- Safe default: `already_recorded`

## Decision Templates

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
