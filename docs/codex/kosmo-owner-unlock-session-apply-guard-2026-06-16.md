# Kosmo Owner Unlock Session Apply Guard

Generated: 2026-06-16T17:47:22.975Z
Status: `owner_unlock_session_apply_guard_failed`

## Summary

- Mode: applied_matches_preview
- Target file: `examples/kosmo-references/provenance/source-root-decision-session-2026-06-16.json`
- Session path: `examples/kosmo-references/provenance/source-root-decision-session-2026-06-16.json`
- Fixture session: no
- Session status: source_root_decision_session_recorded
- Preview status: owner_unlock_session_edit_preview_needs_review
- Expected decision: select_existing_root_for_private_diagnostic
- Actual decision: select_existing_root_for_private_diagnostic
- Expected root path: /mnt/archiv/ArchitekturKosmos/Assets
- Actual root path: /mnt/archiv/ArchitekturKosmos/Assets
- Selected root exists: yes
- Matches preview: yes
- Untouched pending: no
- Private diagnostic allowed after apply: no
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

- Do not run private metadata inventory.
- If exact owner reply is present and reviewed, apply only the expected_after_apply fields to the target session file.
- Rerun this guard before source-root activation preflight.

## Hard Stops

- Do not apply this guard automatically.
- Do not infer approval from a broad freeform reply.
- Do not run private inventory while this guard is waiting.
- Do not change public-ready state.

## Failures

- Preview is not ready: owner_unlock_session_edit_preview_needs_review

## Warnings

- None.
