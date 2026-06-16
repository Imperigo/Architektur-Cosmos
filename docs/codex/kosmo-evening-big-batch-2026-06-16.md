# Kosmo Grosser Abendbatch

Generated: 2026-06-16T17:52:36.970Z
Status: `evening_big_batch_ready`
Target date: 2026-06-17

## Summary

- Phases: 7
- Required commands: 32
- Data lane: kosmodata_lane_sweep_review_only_passed
- Day loop: day_batch_loop_passed_review_only
- Source queue: source_independent_work_queue_ready
- Night checkpoint: night_loop_guarded_ready
- Review batches/items resolved: 5/16
- Owner actions now: 0
- Asset open reviews: 6
- References owner pending: 10
- Orbit blocking cards: 6
- Overseer next loop: resolve_asset_human_reviews
- Public-ready after batch: 0

## Phases

### 01_refresh_and_lock_status

Status frisch halten und keine neuen privaten Inhalte anfassen.

- `npm run kosmo:data-lane-sweep`
- `npm run kosmo:data-lane-command-router`
- `npm run kosmo:source-independent-work-queue`
- `npm run kosmo:night-loop-checkpoint`

### 02_references_detail_review_prep

Detailreviews fuer die drei Piloten vorbereiten, aber keine Public-Freigabe setzen.

- `npm run kosmo:pilot-evidence-matrix`
- `npm run kosmo:pilot-gap-label-review`
- `npm run kosmo:pilot-gap-label-review-check`
- `npm run kosmo:villa-provenance-brief`
- `npm run kosmo:sogn-source-root-brief`
- `npm run kosmo:ingenbohl-pdf-brief`

### 03_asset_review_prep

KosmoAsset-Kandidaten weiter review-only strukturieren.

- `npm run kosmo:asset-reference-bridge-check`
- `npm run kosmo:asset-source-candidate-map`
- `npm run kosmo:asset-candidate-taxonomy-review`
- `npm run kosmo:asset-candidate-taxonomy-review-check`

### 04_local_worker_guarded_preflight

Lokale Worker nur mit Fixture-/Runbook-Gates vorbereiten, keine private Inhaltsausfuehrung.

- `npm run kosmo:local-worker-output-review`
- `npm run kosmo:local-worker-output-contract-review`
- `npm run kosmo:local-worker-output-contract-review-check`
- `npm run kosmo:local-worker-execution-runbook`
- `npm run kosmo:local-worker-execution-runbook-check`

### 05_innovation_runtime_backlog

GitHub-/Runtime-Innovationen als review-only Backlog fuer morgen aktualisieren.

- `npm run kosmo:innovation-github-watchlist`
- `npm run kosmo:innovation-github-watchlist-check`
- `npm run kosmo:innovation-github-discovery`
- `npm run kosmo:innovation-github-discovery-check`
- `npm run kosmo:innovation-github-review-queue`
- `npm run kosmo:innovation-github-review-queue-check`

### 06_orbit_overseer_handoff

Orbit und Overseer mit Abendstand und Morgenauftrag synchronisieren.

- `npm run kosmo:orbit-status-bridge`
- `npm run kosmo:overseer-sync-board`
- `npm run kosmo:overseer-sync-board-check`

### 07_final_acceptance

Abschluss pruefen, Handoff schreiben, gezielt committen und privat pushen.

- `npm run kosmo:day-batch-loop`
- `npm run lint`
- `git diff --cached --check`
- `git status --short`

## Tonight Focus

- References: Villa Savoye, Sogn Benedetg und Ingenbohl auf item-level Review vorbereiten.
- Assets: sechs offene Human Reviews als echte naechste Owner-/Overseer-Entscheidung stehen lassen.
- Local Worker: nur Contracts, Validatoren und Runbooks haerten; keine private Inhaltsarbeit starten.
- Orbit/Overseer: Status sichtbar halten und Bericht 330 als Abendhandoff schreiben.
- Git: nur eigene Abendbatch-Artefakte gezielt committen und pushen.

## Hard Stops

- Keine privaten PDFs, Scans, OCR-Texte oder geschuetzten Assets nach Git kopieren.
- Keine Public-Freigabe und kein Asset-Promotion-Flag setzen.
- Keine lokalen LLMs auf privaten Inhaltsdateien ausfuehren.
- Keine Embeddings, Fine-Tunes oder Eval-Rows aus privaten Quellen erzeugen.
- Keine fremden Worker-Artefakte verdeckt aendern; jede Aenderung im Handoff markieren.
- Bei neuen Guard-Fehlern stoppen, Befund dokumentieren und nicht weiter eskalieren.

## Tomorrow Start

- first_command: `npm run kosmo:data-lane-sweep`
- second_command: `npm run kosmo:night-loop-checkpoint`
- third_command: `npm run kosmo:source-independent-work-queue`
- main_batch_after_green: `Work through phases 02-06, then run phase 07 final acceptance.`

## Failures

- None.
