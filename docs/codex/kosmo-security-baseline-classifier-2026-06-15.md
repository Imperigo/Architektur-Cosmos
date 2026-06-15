# Kosmo Security Baseline Classifier

Generated: 2026-06-15T13:09:27.591Z
Status: `security_baseline_classifier_ready`

## Summary

- Files scanned: 1588
- Personal identifier findings: 202
- Secret findings: 0
- Unclassified personal findings: 25
- Public-ready after classifier: 0

## Category Counts

- `generated_review_allowed`: 41
- `must_redact`: 25
- `private_repo_allowed`: 132
- `script_context_allowed`: 4

## Top Files By Count

- `examples/kosmo-orbit/review/orbit-full-review.generated.json`: 39
- `data/kosmo-source-root-locator-2026-06-13.json`: 38
- `data/kosmo-owner-answer-sheet-2026-06-13.json`: 6
- `data/kosmo-source-root-selection-brief-2026-06-13.json`: 6
- `data/kosmo-source-root-unlock-runbook-2026-06-13.json`: 6
- `data/kosmo-source-root-unlock-runbook-2026-06-14.json`: 6
- `examples/kosmo-references/provenance/source-root-decision-session-2026-06-13.json`: 6
- `data/kosmo-onedrive-sync-error-summary-2026-06-13.json`: 5
- `data/kosmo-onedrive-sync-error-summary-2026-06-14.json`: 5
- `data/kosmo-onedrive-sync-error-summary-2026-06-15.json`: 5
- `data/kosmoreferences-private-library-diagnostic-2026-06-13.json`: 4
- `data/kosmoreferences-private-library-diagnostic-2026-06-14.json`: 4
- `data/kosmoreferences-private-library-diagnostic-2026-06-15.json`: 4
- `docs/codex/kosmo-source-root-locator-2026-06-13.md`: 4
- `data/kosmo-storage-mount-snapshot-2026-06-14.json`: 3
- `data/kosmo-storage-mount-snapshot-2026-06-15.json`: 3
- `docs/codex/kosmo-owner-answer-sheet-2026-06-13.md`: 3
- `docs/codex/kosmo-source-root-decision-session-2026-06-13.md`: 3
- `docs/codex/kosmo-source-root-selection-brief-2026-06-13.md`: 3
- `docs/codex/kosmo-source-root-unlock-runbook-2026-06-13.md`: 3

## Unclassified Files

- `data/kosmo-storage-mount-snapshot-2026-06-14.json`: 3
- `data/kosmo-storage-mount-snapshot-2026-06-15.json`: 3
- `docs/codex/kosmo-storage-mount-snapshot-2026-06-14.md`: 3
- `docs/codex/kosmo-storage-mount-snapshot-2026-06-15.md`: 3
- `docs/codex/kosmo-private-library-sync-resolution-2026-06-13.md`: 2
- `data/kosmoreferences-local-library-inventory-2026-06-13.json`: 1
- `data/kosmoreferences-pilots.json`: 1
- `data/kosmoreferences-source-inventory-2026-06-13.json`: 1
- `data/kosmoreferences-worker-doctrine-2026-06-13.json`: 1
- `docs/codex/kosmoreferences-kosmoasset-pilot-plan-2026-06-13.md`: 1
- `docs/codex/kosmoreferences-local-library-inventory-2026-06-13.md`: 1
- `docs/codex/kosmoreferences-source-inventory-2026-06-13.md`: 1
- `docs/codex/swiss-timber-candidate-sogn-benedetg-2026-06-13.md`: 1
- `examples/kosmo-references/source-packages/alterszentrum-kloster-ingenbohl-public-source-candidate-2026-06-13/source-package.json`: 1
- `examples/kosmo-references/source-packages/kapelle-sogn-benedetg-public-source-candidate-2026-06-13/source-package.json`: 1
- `scripts/kosmo-owner-unlock-prompt-pack.mjs`: 1

## Next Actions

- Review must_redact counts before enabling any suppression.
- Create config baseline only for reviewed private_repo_allowed/generated/script-context groups.
- Keep secret findings hard-failing regardless of baseline.
