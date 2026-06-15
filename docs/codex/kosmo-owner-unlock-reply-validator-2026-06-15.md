# Kosmo Owner Unlock Reply Validator

Generated: 2026-06-15T15:12:59.634Z
Status: `owner_unlock_reply_invalid`

## Summary

- Answer present: yes
- Valid: no
- Source-root choices: 3
- Review batch choices: 5
- Failures: 2
- Public-ready after validation: 0

## Required Format

- `source_root_choice=...`
- `confirmed_exact_root=...`
- `review_batches=...`
- `note=...`

## Next Actions

- Wait for explicit owner reply in the required format.
- Keep source-root and review batches pending.

## Hard Stops

- Do not treat a valid reply as an applied decision.
- Do not mutate intake or session files from this validator.
- Do not run commands from this validator.
- Do not read private content.
- Keep public-ready at 0.

## Failures

- Missing source_root_choice.
- confirmed_exact_root must be yes or no.
