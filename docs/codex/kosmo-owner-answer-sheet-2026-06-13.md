# Kosmo Owner Answer Sheet

Generated: 2026-06-13T20:41:55.545Z
Status: `owner_answer_sheet_ready`

## Guardrails

- This sheet records no decisions.
- It does not edit source-root or owner-review session files.
- Public-ready after sheet: 0.
- Unanswered items stay blocked/review-only.

## Summary

- Source-root options: 10
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
- `workflow-or-project-mirror-mnt-data-architekturkosmos-11-ai-workflow-onedrive-2026-06-09-0` - /mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/00 Einrichtung Home_PC/KosmoWebsite - workflow_or_project_mirror - keep_blocked
- `possible-source-root-mnt-data-architekturkosmos` - /mnt/data/ArchitekturKosmos - possible_source_root - keep_blocked
- `incomplete-onedrive-candidate-home-andrin-baumann-architekturkosmos-onedrive` - /home/andrin-baumann/ArchitekturKosmos Onedrive - incomplete_onedrive_candidate - keep_blocked
- `weak-path-signal-mnt-archiv` - /mnt/archiv - weak_path_signal - keep_blocked
- `weak-path-signal-mnt-data-archive-logs` - /mnt/data/_archive_logs - weak_path_signal - keep_blocked
- `weak-path-signal-mnt-data-zum-archivieren` - /mnt/data/Zum_Archivieren - weak_path_signal - keep_blocked
- `workflow-or-project-mirror-home-andrin-baumann-architekturkosmos-onedrive-11-ai-workflow` - /home/andrin-baumann/ArchitekturKosmos Onedrive/11 AI Workflow - workflow_or_project_mirror - keep_blocked
- `workflow-or-project-mirror-home-andrin-baumann-architekturkosmos-onedrive-11-ai-workflow-0` - /home/andrin-baumann/ArchitekturKosmos Onedrive/11 AI Workflow/00 Architekturkosmos Zentrale - workflow_or_project_mirror - keep_blocked
- `mount_archive_or_missing_root` - no path - missing_or_unmounted_root - keep_blocked
- `repair_onedrive_first` - no path - sync_repair_first - repair_before_inventory

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

- Record source-root answers in examples/kosmo-references/provenance/source-root-decision-session-2026-06-13.json only after owner confirmation.
- Run npm run kosmo:source-root-decision-session-check after source-root answers are recorded.
- Record reference owner answers in examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json only after owner confirmation.
- Run npm run kosmo:owner-decision-session-check after reference answers are recorded.
- Keep KosmoAsset human reviews separate from reference owner decisions.
- Rerun npm run kosmo:data-lane-sweep and npm run kosmo:data-lane-command-router after any recorded decision.
