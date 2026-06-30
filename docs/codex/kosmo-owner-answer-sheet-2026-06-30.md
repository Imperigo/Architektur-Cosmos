# Kosmo Owner Answer Sheet

Generated: 2026-06-30T06:54:59.005Z
Status: `owner_answer_sheet_ready`

## Guardrails

- This sheet records no decisions.
- It does not edit source-root or owner-review session files.
- Public-ready after sheet: 0.
- Unanswered items stay blocked/review-only.

## Summary

- Source-root options: 10
- Source-root options source: source_root_selection_brief
- Owner cards: 5
- Owner card items: 16
- Reference decision items: 10

## 1. Source-Root Answer

Safe default: `keep_blocked`

Allowed decisions:
- `keep_blocked`
- `mount_archive_first`
- `repair_onedrive_first`
- `select_existing_root_for_private_diagnostic`
- `select_root_after_mount_check`

Answer fields:

```text
selected_decision:
selected_root_path:
owner_note:
```

Top options:
- `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` - /mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite - possible_source_root/workflow_mirror_or_codex_context - keep_blocked
- `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-abgabe-tkb-bibl` - /mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/abgabe/TKB_Bibliothek_Live-Final-Test_Abgabe - possible_source_root/asset_material_library_candidate - keep_blocked
- `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-ai-architektur-` - /mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/Ai Architektur Workflow/PBR Library + HDRI - possible_source_root/asset_material_library_candidate - keep_blocked
- `possible-source-root-mnt-archiv-01-architekturkosmos-projekt-00-einrichtung-home-pc-kosmow` - /mnt/archiv/01 ArchitekturKosmos Projekt/00 Einrichtung Home_PC/KosmoWebsite - possible_source_root/workflow_mirror_or_codex_context - keep_blocked
- `possible-source-root-mnt-archiv-architekturkosmos-assets` - /mnt/archiv/ArchitekturKosmos/Assets - possible_source_root/archive_subtree_candidate - keep_blocked
- `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc` - /mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC - possible_source_root/onedrive_mirror_candidate - keep_blocked
- `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` - /mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/repo-context - possible_source_root/workflow_mirror_or_codex_context - keep_blocked
- `possible-source-root-mnt-archiv-fromssd-onedrive-2026-06-08-00-einrichtung-home-pc-kosmowe` - /mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/reports - possible_source_root/workflow_mirror_or_codex_context - keep_blocked
- `mount_archive_or_missing_root` - no path - missing_or_unmounted_root/owner_storage_action - keep_blocked
- `repair_onedrive_first` - no path - sync_repair_first/onedrive_integrity_gate - repair_before_inventory

Blocked until recorded selection:
- `sogn_private_source_inventory`
- `ingenbohl_pdf_private_extraction`
- `source_dependent_asset_authoring`
- `public_ready_promotion_from_private_sources`

## 2. Owner Review Cards

### Batch A: Villa Savoye Image Candidates

Soll Villa Savoye Bildmaterial nur blockiert bleiben, oder soll genau ein Bild in eine separate Quellen-/Credit-Pruefung?

- Batch: `batch-a-villa-savoye-image-candidates`
- Items: 3
- Safe default: `needs_more_source_context`
- Public-ready after card: 0
- Options: `keep_all_blocked`, `open_one_source_credit_review`, `needs_more_context`

```text
owner_choice:
owner_note:
```

### Batch B: Villa Savoye Derived Files

Sollen alle abgeleiteten Villa-Dateien blockiert bleiben, bis Plan-/Modell-Herkunft sauber belegt ist?

- Batch: `batch-b-villa-savoye-derived-files`
- Items: 4
- Safe default: `keep_blocked`
- Public-ready after card: 0
- Options: `use_safe_default`, `open_separate_review`, `needs_more_context`

```text
owner_choice:
owner_note:
```

### Batch C: Model Promotion Confirmation

Sollen die vorhandenen Modelle weiterhin als diagrammatische Studien blockiert bleiben, bis Modellqualitaet und Quellenbasis geprueft sind?

- Batch: `batch-c-model-promotion-confirmation`
- Items: 2
- Safe default: `needs_more_source_context`
- Public-ready after card: 0
- Options: `use_safe_default`, `open_separate_review`, `needs_more_context`

```text
owner_choice:
owner_note:
```

### Batch D: Sogn Benedetg Source Gap

Soll Sogn Benedetg link-only bleiben, bis der echte private Bibliotheks-Root sichtbar ist?

- Batch: `batch-d-sogn-benedetg-source-gap`
- Items: 1
- Safe default: `needs_more_source_context`
- Public-ready after card: 0
- Options: `use_safe_default`, `open_separate_review`, `needs_more_context`

```text
owner_choice:
owner_note:
```

### Batch E: KosmoAsset Human Reviews

Welche lokalen Study-Assets sollen ein Human Review bekommen, ohne Public-Promotion zu erlauben?

- Batch: `batch-e-kosmoasset-human-reviews`
- Items: 6
- Safe default: `needs-review`
- Public-ready after card: 0
- Options: `keep_needs_review`, `assign_named_human_review`, `block_public`

```text
owner_choice:
owner_note:
```

## 3. Existing Reference Decision Items

These are the session items that can later receive owner decisions.

- `villa-savoye-exterior-savoye-3-cc0` (villa-savoye-public-image-candidates) - safe default `needs_more_source_context` - selected: null
- `villa-savoye-exterior-loc-full` (villa-savoye-public-image-candidates) - safe default `needs_more_source_context` - selected: null
- `villa-savoye-interior-chaise-cc-by-sa` (villa-savoye-public-image-candidates) - safe default `needs_more_source_context` - selected: null
- `public/archive-media/villa-savoye/exterior/villa-savoye-loc-exterior-crop.jpg` (villa-savoye-blocked-derived-files) - safe default `keep_blocked` - selected: null
- `public/archive-media/villa-savoye/plan/villa-savoye-ground-floor-diagram.svg` (villa-savoye-blocked-derived-files) - safe default `keep_blocked` - selected: null
- `public/archive-media/villa-savoye/section/villa-savoye-long-section-diagram.svg` (villa-savoye-blocked-derived-files) - safe default `keep_blocked` - selected: null
- `public/archive-models/villa-savoye/low.glb` (villa-savoye-blocked-derived-files) - safe default `keep_blocked` - selected: null
- `villa-savoye` (model-promotion-owner-confirmation) - safe default `needs_more_source_context` - selected: null
- `alterszentrum-kloster-ingenbohl` (model-promotion-owner-confirmation) - safe default `needs_more_source_context` - selected: null
- `sogn-benedetg-source-gap` (sogn-benedetg-source-gap) - safe default `needs_more_source_context` - selected: null

## Next Actions After Owner Answers

- Record source-root answers in examples/kosmo-references/provenance/source-root-decision-session-2026-06-30.json only after owner confirmation.
- Run npm run kosmo:source-root-decision-session-check after source-root answers are recorded.
- Record reference owner answers in examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json only after owner confirmation.
- Run npm run kosmo:owner-decision-session-check after reference answers are recorded.
- Keep KosmoAsset human reviews separate from reference owner decisions.
- Rerun npm run kosmo:data-lane-sweep and npm run kosmo:data-lane-command-router after any recorded decision.
