# Kosmo Owner Question Brief

Generated: 2026-06-15T10:42:39.089Z
Status: `owner_question_brief_ready`

## Guardrails

- Diese Fragen schreiben keine Entscheidungen.
- Public-ready bleibt 0.
- Antworten muessen spaeter in das Intake Template uebertragen und geprueft werden.

## Fragen

### Private Source-Root

Welcher Pfad ist die echte grosse Buch-/ETH-/HSLU-Architektur-Library, oder soll alles blockiert bleiben bis Archiv/OneDrive sauber sichtbar ist?

- Safe default: `keep_blocked`
- Erlaubte Antworten: `keep_blocked`, `mount_archive_first`, `repair_onedrive_first`, `select_existing_root_for_private_diagnostic`, `select_root_after_mount_check`

```text
Antwort:
Notiz:
```

### Batch A: Villa Savoye Image Candidates

Soll Villa Savoye Bildmaterial nur blockiert bleiben, oder soll genau ein Bild in eine separate Quellen-/Credit-Pruefung?

- Safe default: `needs_more_source_context`
- Erlaubte Antworten: `keep_all_blocked`, `open_one_source_credit_review`, `needs_more_context`

```text
Antwort:
Notiz:
```

### Batch B: Villa Savoye Derived Files

Sollen alle abgeleiteten Villa-Dateien blockiert bleiben, bis Plan-/Modell-Herkunft sauber belegt ist?

- Safe default: `keep_blocked`
- Erlaubte Antworten: `use_safe_default`, `open_separate_review`, `needs_more_context`

```text
Antwort:
Notiz:
```

### Batch C: Model Promotion Confirmation

Sollen die vorhandenen Modelle weiterhin als diagrammatische Studien blockiert bleiben, bis Modellqualitaet und Quellenbasis geprueft sind?

- Safe default: `needs_more_source_context`
- Erlaubte Antworten: `use_safe_default`, `open_separate_review`, `needs_more_context`

```text
Antwort:
Notiz:
```

### Batch D: Sogn Benedetg Source Gap

Soll Sogn Benedetg link-only bleiben, bis der echte private Bibliotheks-Root sichtbar ist?

- Safe default: `needs_more_source_context`
- Erlaubte Antworten: `use_safe_default`, `open_separate_review`, `needs_more_context`

```text
Antwort:
Notiz:
```

### Batch E: KosmoAsset Human Reviews

Welche lokalen Study-Assets sollen ein Human Review bekommen, ohne Public-Promotion zu erlauben?

- Safe default: `needs-review`
- Erlaubte Antworten: `keep_needs_review`, `assign_named_human_review`, `block_public`

```text
Antwort:
Notiz:
```

## Antwortfluss

- Owner answers this brief in plain language.
- Codex/Claude transfers explicitly confirmed answers into the owner answer intake template.
- Run npm run kosmo:owner-answer-intake-check.
- Run npm run kosmo:owner-answer-session-edit-plan.
- Only then review any planned session edit.
