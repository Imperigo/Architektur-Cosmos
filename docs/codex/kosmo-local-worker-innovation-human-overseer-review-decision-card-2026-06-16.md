# Kosmo Local Worker Innovation Human/Overseer Review Decision Card

Generated: 2026-06-16T05:28:10.746Z
Status: `local_worker_innovation_human_overseer_review_decision_card_ready`

## Summary

- Mode: waiting_for_review_candidates
- Review candidates: 0
- Decisions applied now: 0
- Accepted now: 0
- Repo conversions now: 0
- Training rows promoted now: 0
- Public-ready after card: 0
- Failures: 0

## Question

Noch keine lokalen Worker-Outputs vorhanden. Soll die Review-Decision-Card bereit gehalten werden?

## Allowed Answers

- `hold_waiting_for_review_candidates`: Keine Entscheidung, keine Uebernahme, weiter warten.
- `approve_review_candidate_for_separate_conversion_plan`: Nur fuer einen spaeteren separaten Conversion-Plan vormerken; keine direkte Uebernahme.
- `reject_or_rework_review_candidate`: Kandidat bleibt blockiert; lokale Worker-Ausgabe oder Validator/Policy wird ueberarbeitet.

## Exact Reply Template For Future Candidate

```text
local_worker_review_decision=approve_review_candidate_for_separate_conversion_plan; candidate_task_id=<task_id>; confirmed_validator_guard_passed=yes; confirmed_no_private_content=yes; confirmed_no_direct_repo_conversion=yes; confirmed_public_ready_false=yes; note=Nur als Review-Kandidat fuer einen separaten Conversion-Plan vormerken.
```

## Candidates

- None.

## Hard Stops

- This card never applies review decisions.
- This card never accepts worker outputs into repo artifacts.
- This card never copies worker output bodies or recommendation text into Git.
- This card never promotes training rows.
- This card never marks public-ready.
- This card never reads private Source Root, OneDrive or archive-library content.
