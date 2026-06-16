# Kosmo Owner Unlock Prompt Pack

Generated: 2026-06-16T05:33:08.873Z
Status: `owner_unlock_prompt_pack_ready`

## Kurzantwort

- `source_root_choice=...`
- `confirmed_exact_root=...`
- `review_batches=...`
- `note=...`

## Sichere Default-Antwort

- `source_root_choice=repair_onedrive_first`
- `confirmed_exact_root=no`
- `review_batches=none`
- `note=Quelle bleibt blockiert, bis die vollstaendige private Architekturquelle bestaetigt ist.`

## Unlock Nur Wenn Wirklich Korrekt

- `source_root_choice=select_exact_root_1`
- `confirmed_exact_root=yes`
- `review_batches=all_review_only`
- `note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf.`

## Fragen

### source_root_choice

- Required: yes
- Question: Welche Source-Root-Antwort soll ich als naechstes explizit erfassen?
- Safe default: repair_onedrive_first_or_keep_blocked
- Reply format: `source_root_choice=<keep_blocked|repair_onedrive_first|select_exact_root_1>; confirmed_exact_root=<yes|no>; note=<optional>`

### review_batch_scope

- Required: no
- Question: Welche Review-Batches sollen als naechstes vorbereitet werden?
- Safe default: keep_all_review_only
- Reply format: `review_batches=<none|batch-a|batch-b|batch-c|batch-d|batch-e|all_review_only>; batch_notes=<optional>`

## After Owner Reply Pipeline

- Copy only explicit owner answers into the owner answer intake template.
- Run owner answer intake check and session edit plan.
- Run source-root decision session check and activation preflight.
- Only after guards pass, follow the matching owner answer execution branch.

## Hard Stops

- Do not infer missing owner answers.
- Do not auto-fill intake/session files from this prompt pack.
- Do not run commands from the selected branch until the explicit answer is recorded.
- Do not run private inventory unless the unlock branch is explicitly confirmed and guards pass.
- Do not read, OCR, embed, train on or copy private source contents.
- Keep public-ready at 0.
