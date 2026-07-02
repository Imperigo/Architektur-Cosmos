# Kosmo Source-Root Blocker Refresh

Generated: 2026-07-02T06:17:17.328Z
Status: `source_root_blocker_still_active`

## Summary

- OneDrive status: onedrive_sync_errors_visible
- OneDrive markers/leaf/missing: 59/58/58
- Private library: library_candidate_visible
- Private library book-like/target/own mounts: 169/66/1
- Source-root locator: source_root_candidates_need_owner_selection
- Source-root candidates/probable/mirrors: 1470/0/71
- Source-root selection: source_root_owner_selection_needed, options 10
- Decision check: passed_pending_owner_input
- Selected decision: pending
- Selected root exists: false
- Private diagnostic allowed: no
- Public-ready after refresh: 0

## Blocked Until

- Owner/KosmoOverseer selects or mounts a real source root.
- OneDrive sync markers are repaired or owner confirms a complete non-OneDrive source root.
- Source-root decision session passes with private_diagnostic_allowed=true.

## Allowed Now

- Keep using owner review session brief for source-root question.
- Keep local worker outputs metadata-only and review-only.
- Rerun diagnostics after mount/sync changes.

## Forbidden Now

- Do not run private inventory extraction.
- Do not download or OCR private PDFs.
- Do not copy private books, plans, images or lecture contents into Git.
- Do not mark Sogn, Ingenbohl or source-dependent assets public-ready.
