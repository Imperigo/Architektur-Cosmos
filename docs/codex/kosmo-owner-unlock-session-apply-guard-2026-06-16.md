# Kosmo Owner Unlock Session Apply Guard

Generated: 2026-06-16T12:13:47.629Z
Status: `owner_unlock_session_apply_guard_passed_after_manual_apply`

## Summary

- Mode: applied_matches_preview
- Target file: `examples/kosmo-references/provenance/source-root-decision-session-2026-06-16.json`
- Session path: `examples/kosmo-references/provenance/source-root-decision-session-2026-06-16.json`
- Fixture session: no
- Session status: source_root_decision_session_recorded
- Preview status: owner_unlock_session_edit_preview_ready
- Expected decision: select_existing_root_for_private_diagnostic
- Actual decision: select_existing_root_for_private_diagnostic
- Expected root path: /mnt/archiv/ArchitekturKosmos/Assets
- Actual root path: /mnt/archiv/ArchitekturKosmos/Assets
- Selected root exists: yes
- Matches preview: yes
- Untouched pending: no
- Private diagnostic allowed after apply: yes
- Public-ready after guard: 0

## Expected After Apply

```json
{
  "status": "source_root_decision_session_recorded",
  "selected_decision": "select_existing_root_for_private_diagnostic",
  "selected_root_path": "/mnt/archiv/ArchitekturKosmos/Assets",
  "owner_note": "/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf."
}
```

## Next Actions

- Run npm run kosmo:source-root-decision-session-check.
- Run npm run kosmo:source-root-blocker-refresh.
- Run npm run kosmo:source-root-activation-preflight.
- Run npm run kosmo:source-root-post-owner-activation-queue and its guard.

## Hard Stops

- Do not apply this guard automatically.
- Do not infer approval from a broad freeform reply.
- Do not run private inventory while this guard is waiting.
- Do not change public-ready state.

## Failures

- None.

## Warnings

- None.
