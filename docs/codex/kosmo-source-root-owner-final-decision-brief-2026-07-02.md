# Kosmo Source-Root Owner Final Decision Brief

Generated: 2026-07-02T06:21:53.562Z
Status: `source_root_owner_final_decision_brief_ready`

## Owner Prompt

Welchen Source-Root-Entscheid soll Kosmo jetzt verwenden?

Safe default: Wenn du nicht 100% sicher bist, waehle repair_onedrive_first oder keep_blocked.

Warning: Die unlockende Option darf nur verwendet werden, wenn der angezeigte Pfad exakt die vollstaendige private Architekturquelle ist.

## Summary

- Selection status: source_root_owner_selection_needed
- Decision packet: source_root_owner_decision_packet_ready
- Packet guard: source_root_owner_decision_packet_guard_passed
- Decision session: passed_pending_owner_input
- Activation queue guard: source_root_post_owner_activation_queue_guard_passed
- Locator candidates: 1469
- Probable private libraries: 0
- Workflow/project mirrors: 71
- OneDrive-like roots: 149
- Roots with sync errors: 5
- Decision options: 3
- Unlock options: 1
- Recommended default: repair_onedrive_first_or_keep_blocked
- Private diagnostic allowed: no
- Public-ready after brief: 0

## Answer Choices

| Choice | Decision | Root | Unlocks private metadata diagnostic | When to use |
| --- | --- | --- | --- | --- |
| `keep_blocked` | `keep_blocked` | - | no | Owner is not ready to identify the complete private architecture library root. |
| `repair_onedrive_first` | `repair_onedrive_first` | - | no | Owner says the intended source root is a OneDrive mirror but sync markers/completeness are not resolved. |
| `select_exact_root_1` | `select_existing_root_for_private_diagnostic` | `/mnt/archiv/ArchitekturKosmos/Assets` | yes | Owner/KosmoOverseer explicitly confirms this exact path is the complete private source root for metadata-only diagnostics. |

## Visible Candidates

| Candidate | Role | Score | Path | Safe default |
| --- | --- | ---: | --- | --- |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | workflow_mirror_or_codex_context | 70 | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite` | keep_blocked |
| `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-abgabe-tkb-bibl` | asset_material_library_candidate | 60 | `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/abgabe/TKB_Bibliothek_Live-Final-Test_Abgabe` | keep_blocked |
| `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-ai-architektur-` | asset_material_library_candidate | 60 | `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/Ai Architektur Workflow/PBR Library + HDRI` | keep_blocked |
| `possible-source-root-mnt-archiv-01-architekturkosmos-projekt-00-einrichtung-home-pc-kosmow` | workflow_mirror_or_codex_context | 52 | `/mnt/archiv/01 ArchitekturKosmos Projekt/00 Einrichtung Home_PC/KosmoWebsite` | keep_blocked |
| `possible-source-root-mnt-archiv-architekturkosmos-assets` | archive_subtree_candidate | 52 | `/mnt/archiv/ArchitekturKosmos/Assets` | keep_blocked |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc` | onedrive_mirror_candidate | 48 | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC` | keep_blocked |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | workflow_mirror_or_codex_context | 48 | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/repo-context` | keep_blocked |
| `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` | workflow_mirror_or_codex_context | 48 | `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/reports` | keep_blocked |
| `mount_archive_or_missing_root` | owner_storage_action | - | - | keep_blocked |
| `repair_onedrive_first` | onedrive_integrity_gate | - | - | repair_before_inventory |

## Post-Decision Command Order

- `npm run kosmo:source-root-decision-session-check`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:source-root-activation-preflight`
- `npm run kosmo:source-root-post-owner-activation-queue`
- `npm run kosmo:source-root-post-owner-activation-queue-check`

## Hard Stops

- Do not edit the decision session from this brief without explicit owner confirmation.
- Do not run private metadata inventory while private_diagnostic_allowed is false.
- Do not run OCR/PDF extraction from private sources at this stage.
- Do not set public-ready from this source-root decision.

## Failures

- None.
