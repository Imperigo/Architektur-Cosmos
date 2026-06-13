# KosmoReferences Owner Decision Session Check

Datum: 2026-06-13
Status: `passed_pending_owner_input`

## Zweck

Dieses Gate ist die zweite Owner-Review-Stufe. Der bestehende Decision-Pack
listet, was entschieden werden muss. Die neue Decision-Session ist der sichere
Ort, an dem spaeter konkrete Owner-Entscheidungen eingetragen werden.

## Command

```bash
npm run kosmo:owner-decision-session-check
```

## Aktueller Stand

- Decision-Items: 10
- Selected Decisions: 0
- Pending Decisions: 10
- Public-ready after session: 0
- Confirm Commands after separate review: 2
- Failures: 0
- Warnings: 0

## Safety-Regeln

- `auto_promote` muss `false` bleiben.
- `writes_public_files` muss `false` bleiben.
- `writes_public_manifest` muss `false` bleiben.
- `public_ready_after_session` muss `0` bleiben.
- Jedes Item muss `public_ready_after_decision=false` behalten.
- Confirm-Commands sind nur als Text fuer spaetere separate Review erlaubt.

## Owner-Input

Owner/Claude/Codex duerfen spaeter pro Item `selected_decision` setzen:

- `approve_public_display_after_review`
- `keep_blocked`
- `open_separate_source_basis_review`
- `needs_more_source_context`

Danach muss der Check erneut laufen. Selbst bei `passed_recorded` erfolgt keine
automatische Public-Promotion; dafuer ist ein separater Review-/Promotion-Step
notwendig.

## Dateien

- Session: `examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json`
- Checker: `scripts/kosmo-owner-decision-session-check.mjs`
- Report JSON: `examples/kosmo-references/provenance/owner-decision-session-check.generated.json`
- Report Markdown: `examples/kosmo-references/provenance/owner-decision-session-check.generated.md`

