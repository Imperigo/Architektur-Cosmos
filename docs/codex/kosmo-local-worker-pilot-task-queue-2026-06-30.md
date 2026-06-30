# Kosmo Local Worker Pilot Task Queue

Generated: 2026-06-30T07:08:29.552Z
Status: `local_worker_pilot_task_queue_ready_blocked`

## Summary

- Pilots: 3
- Tasks: 12
- Tasks per pilot: 4
- KosmoReferences tasks: 9
- KosmoAsset tasks: 3
- Worker contracts: 9
- Runner-safe tasks: 8
- Launchable now: 0
- Public-ready after queue: 0

## Tasks

- `villa-savoye:metadata_match_candidates` -> candidate source-to-slot match table
- `villa-savoye:provenance_gap_summary` -> review-only provenance gap summary
- `villa-savoye:analysis_layer_draft` -> typology/material/structure/space/construction draft fields
- `villa-savoye:asset_schema_draft` -> review-only asset schema draft
- `kapelle-sogn-benedetg:metadata_match_candidates` -> candidate source-to-slot match table
- `kapelle-sogn-benedetg:provenance_gap_summary` -> review-only provenance gap summary
- `kapelle-sogn-benedetg:analysis_layer_draft` -> typology/material/structure/space/construction draft fields
- `kapelle-sogn-benedetg:asset_schema_draft` -> review-only asset schema draft
- `alterszentrum-kloster-ingenbohl:metadata_match_candidates` -> candidate source-to-slot match table
- `alterszentrum-kloster-ingenbohl:provenance_gap_summary` -> review-only provenance gap summary
- `alterszentrum-kloster-ingenbohl:analysis_layer_draft` -> typology/material/structure/space/construction draft fields
- `alterszentrum-kloster-ingenbohl:asset_schema_draft` -> review-only asset schema draft

## Next Actions After Source Root

- Run pilot-scoped metadata inventory and guard first.
- Materialize task inputs as minimal metadata snippets, not full private documents.
- Run local worker tasks only through existing output contracts.
- Require Codex/Claude review before any repo conversion.

## Hard Stops

- Do not launch local worker tasks from this queue now.
- Do not pass full private documents to local workers.
- Do not let local worker output write directly to repo.
- Do not mark local worker output public-ready.
