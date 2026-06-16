# Kosmo Owner Unlock Reply Validator

Generated: 2026-06-16T12:12:29.580Z
Status: `owner_unlock_reply_valid`

## Summary

- Answer present: yes
- Valid: yes
- Source-root choices: 3
- Review batch choices: 5
- Failures: 0
- Public-ready after validation: 0

## Required Format

- `source_root_choice=...`
- `confirmed_exact_root=...`
- `review_batches=...`
- `note=...`

## Next Actions

- Copy only explicit validated fields into owner answer intake/session files.
- Run owner answer intake check, session edit plan and source-root guards.
- Do not run private inventory unless the selected branch permits it and guards pass.

## Hard Stops

- Do not treat a valid reply as an applied decision.
- Do not mutate intake or session files from this validator.
- Do not run commands from this validator.
- Do not read private content.
- Keep public-ready at 0.
