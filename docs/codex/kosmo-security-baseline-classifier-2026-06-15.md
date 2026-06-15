# Kosmo Security Baseline Classifier

Generated: 2026-06-15T13:08:13.281Z
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

## Next Actions

- Review must_redact counts before enabling any suppression.
- Create config baseline only for reviewed private_repo_allowed/generated/script-context groups.
- Keep secret findings hard-failing regardless of baseline.
