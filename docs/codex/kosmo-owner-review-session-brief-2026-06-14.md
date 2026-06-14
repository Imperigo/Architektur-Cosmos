# Kosmo Owner Review Session Brief

Generated: 2026-06-14T07:22:01.457Z
Status: `owner_review_session_brief_ready`

## Guardrails

- Diese Session-Brief schreibt keine Entscheidungen.
- Sie schreibt keine Session-Dateien und wendet nichts an.
- Public-ready bleibt 0.
- Fruehere Chat-Aussagen werden nur als Hinweise klassifiziert.

## Stand

- Packet: owner_review_packet_ready
- Packet Guard: owner_review_packet_guard_passed
- Router: worker_router_guarded_review_only
- Fragen offen: 6/6
- Fruehere Signale recordable now: 0/5
- Public-ready after brief: 0

## Fruehere Signale

### pilot_reference_scope

- Signal: Villa Savoye, ein Schweizer Holzbau, und ein Bau von Roger Boltshauser/Frauenkloster Ingenbohl.
- Klasse: `already_reflected_in_pilot_scope`
- Jetzt schreibbar: nein
- Grund: The pilot scope is already represented by Villa Savoye, Sogn Benedetg and Ingenbohl. It does not answer the current source-root or owner-review card decisions.

### sample_depth

- Signal: Von allem eines.
- Klasse: `scope_hint_not_decision`
- Jetzt schreibbar: nein
- Grund: This supports small pilot batches, but does not select a source root, asset review target or public promotion decision.

### local_first_onedrive_books_eth_hslu

- Signal: Zuerst lokal; OneDrive hat eine riesige Library; Architektur-Referenzen sollen spaeter aus digitalen Buechern, ETH- und HSLU-Vorlesungen kommen.
- Klasse: `source_root_hint_only`
- Jetzt schreibbar: nein
- Grund: This confirms the desired source family, but no exact visible path is selected and OneDrive still has sync-error markers.

### same_day_nightshift

- Signal: Beides heute, Nachtschicht bis Nutzlimit.
- Klasse: `execution_cadence`
- Jetzt schreibbar: nein
- Grund: This authorizes autonomous preparation work, not data-lane decisions.

### autonomous_private_github_push

- Signal: GitHub staendig selbst autonom pushen, privat.
- Klasse: `operational_permission`
- Jetzt schreibbar: nein
- Grund: This guides Codex commit/push behavior, but does not alter reference provenance, rights, source-root or public-ready state.

## Source-Root Kurzlage

- Aktuelle Entscheidung: pending
- Aktueller Root: pending
- Safe default: `keep_blocked`

Top Optionen:
- `workflow_or_project_mirror`: /mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/00 Einrichtung Home_PC/KosmoWebsite - Treat as workflow mirror only; do not use as the large architecture source library.
- `possible_source_root`: /mnt/data/ArchitekturKosmos - Keep blocked unless owner/overseer confirms this exact path as the real source root.
- `incomplete_onedrive_candidate`: /home/andrin-baumann/ArchitekturKosmos Onedrive - Do not inventory yet; repair sync errors or confirm the complete synced root first.
- `weak_path_signal`: /mnt/archiv - Use only as a mount/path clue; not enough evidence for private inventory.
- `weak_path_signal`: /mnt/data/_archive_logs - Use only as a mount/path clue; not enough evidence for private inventory.

## Paste-Ready Fragerunde

- Ich habe deine bisherigen Aussagen eingearbeitet, aber noch keine Entscheidungen daraus geschrieben.
- Bitte beantworte die sechs Punkte unten mit einer der erlaubten Antworten oder mit kurzer Notiz.
- Wenn du unsicher bist, gilt der Safe Default und alles bleibt blockiert/review-only.
- Nach deinen Antworten uebertragen Codex/Claude nur explizit bestaetigte Antworten in das Intake Template und lassen die Guards laufen.

### 1. Private Source-Root

Welcher Pfad ist die echte grosse Buch-/ETH-/HSLU-Architektur-Library, oder soll alles blockiert bleiben bis Archiv/OneDrive sauber sichtbar ist?

- Safe default: `keep_blocked`
- Erlaubte Antworten: `keep_blocked`, `mount_archive_first`, `repair_onedrive_first`, `select_existing_root_for_private_diagnostic`, `select_root_after_mount_check`

```text
Antwort 1:
Notiz:
```

### 2. Batch A: Villa Savoye Image Candidates

Soll Villa Savoye Bildmaterial nur blockiert bleiben, oder soll genau ein Bild in eine separate Quellen-/Credit-Pruefung?

- Safe default: `needs_more_source_context`
- Erlaubte Antworten: `keep_all_blocked`, `open_one_source_credit_review`, `needs_more_context`

```text
Antwort 2:
Notiz:
```

### 3. Batch B: Villa Savoye Derived Files

Sollen alle abgeleiteten Villa-Dateien blockiert bleiben, bis Plan-/Modell-Herkunft sauber belegt ist?

- Safe default: `keep_blocked`
- Erlaubte Antworten: `use_safe_default`, `open_separate_review`, `needs_more_context`

```text
Antwort 3:
Notiz:
```

### 4. Batch C: Model Promotion Confirmation

Sollen die vorhandenen Modelle weiterhin als diagrammatische Studien blockiert bleiben, bis Modellqualitaet und Quellenbasis geprueft sind?

- Safe default: `needs_more_source_context`
- Erlaubte Antworten: `use_safe_default`, `open_separate_review`, `needs_more_context`

```text
Antwort 4:
Notiz:
```

### 5. Batch D: Sogn Benedetg Source Gap

Soll Sogn Benedetg link-only bleiben, bis der echte private Bibliotheks-Root sichtbar ist?

- Safe default: `needs_more_source_context`
- Erlaubte Antworten: `use_safe_default`, `open_separate_review`, `needs_more_context`

```text
Antwort 5:
Notiz:
```

### 6. Batch E: KosmoAsset Human Reviews

Welche lokalen Study-Assets sollen ein Human Review bekommen, ohne Public-Promotion zu erlauben?

- Safe default: `needs-review`
- Erlaubte Antworten: `keep_needs_review`, `assign_named_human_review`, `block_public`

```text
Antwort 6:
Notiz:
```

## Next Actions

- Present this session brief to the owner before editing any intake or decision-session file.
- Treat prior source statements as hints only until an exact source-root decision is confirmed.
- After explicit answers, update the intake template, then rerun intake check and session edit plan.
- Keep public-ready at 0 until separate provenance, rights and promotion reviews pass.
