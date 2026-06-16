# Kosmo Source-Root Blocker Refresh

Generated: 2026-06-16T12:30:32.712Z
Status: `source_root_blocker_needs_review`

## Summary

- OneDrive status: onedrive_sync_errors_visible
- OneDrive markers/leaf/missing: 59/58/58
- Private library: library_candidate_visible
- Private library book-like/target/own mounts: 168/1/1
- Source-root locator: source_root_candidates_need_owner_selection
- Source-root candidates/probable/mirrors: 1010/0/68
- Source-root selection: source_root_owner_selection_needed, options 10
- Decision check: passed_recorded_private_diagnostic_allowed
- Selected decision: select_existing_root_for_private_diagnostic
- Selected root exists: true
- Private diagnostic allowed: yes
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
