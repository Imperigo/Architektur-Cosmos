# Kosmo Local Worker Task Pack

Created: 2026-07-02T06:00:46.212Z
Status: `ready_for_local_review`

## Summary

- Target worker: kosmo-odysseus-local-llm
- Tasks: 9
- Updated refs: 23
- Metadata inventory guard refs: 0
- Reuses existing output paths: yes
- Public-ready after refresh: 0

## Policy

- Metadata-only: yes
- Reads private content: no
- Starts models: no

## Tasks

| Priority | Task | Lane | Output |
| ---: | --- | --- | --- |
| 1 | `kosmo-private-doctrine-summary` | kosmoreferences | `/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/kosmo-local-worker-2026-06-13/doctrine-summary.private.md` |
| 2 | `kosmo-reference-pilot-gap-map` | kosmoreferences | `/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/kosmo-local-worker-2026-06-13/reference-pilot-gap-map.private.json` |
| 3 | `kosmo-book-library-mount-questions` | source_discovery | `/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/kosmo-local-worker-2026-06-13/book-library-mount-questions.private.md` |
| 4 | `kosmo-asset-seed-candidates` | kosmoasset | `/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/kosmo-local-worker-2026-06-13/asset-seed-candidates.private.json` |
| 5 | `kosmo-public-source-link-synthesis` | source_discovery | `/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/kosmo-local-worker-2026-06-13/public-source-link-synthesis.private.json` |
| 6 | `kosmo-asset-source-candidate-triage` | kosmoasset | `/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/kosmo-local-worker-2026-06-13/asset-source-candidate-triage.private.json` |
| 7 | `kosmo-human-decision-queue-triage` | human_review_support | `/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/kosmo-local-worker-2026-06-13/human-decision-queue-triage.private.md` |
| 8 | `kosmo-owner-batch-review-questions` | human_review_support | `/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/kosmo-local-worker-2026-06-13/owner-batch-review-questions.private.md` |
| 9 | `kosmo-owner-session-safe-next-tasks` | human_review_support | `/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/kosmo-local-worker-2026-06-13/owner-session-safe-next-tasks.private.md` |

## Next Actions

- Run `npm run kosmo:local-worker-output-review`.
- Run `npm run kosmo:local-worker-launch-queue`.
- Run `npm run kosmo:local-worker-output-conversion-plan`.
- Keep all outputs private/review-only until owner, source-root, provenance and rights gates pass.
