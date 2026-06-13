# Kosmo Owner Review Card: Batch A: Villa Savoye Image Candidates

Generated: 2026-06-13T20:29:41.041Z
Status: `owner_review_card_ready`

## Owner Question

Soll Villa Savoye Bildmaterial nur blockiert bleiben, oder soll genau ein Bild in eine separate Quellen-/Credit-Pruefung?

## Summary

- Batch: `batch-a-villa-savoye-image-candidates`
- Items: 3
- Safe default: `needs_more_source_context`
- Public-ready after card: 0
- Decision effect: No public-ready changes are allowed from this card; any positive direction opens or confirms a separate reviewed step.

## Options

| Option | Safe | Effect |
| --- | --- | --- |
| `keep_all_blocked` Keep all blocked | yes | All three image candidates remain review-only; no public display is prepared. |
| `open_one_source_credit_review` Open one source/credit review | yes | Owner names exactly one image candidate for a separate provenance, license and credit review. No public-ready flag changes. |
| `needs_more_context` Needs more context | yes | Codex/Claude prepare a stronger source comparison before asking again. |

## Items

| Item | Path | Safe default | Public-ready after decision |
| --- | --- | --- | --- |
| villa-savoye-exterior-savoye-3-cc0 | `public/archive-media/villa-savoye/exterior/savoye-3-exterior-cc0.jpg` | `needs_more_source_context` | no |
| villa-savoye-exterior-loc-full | `public/archive-media/villa-savoye/exterior/villa-savoye-loc-exterior.jpg` | `needs_more_source_context` | no |
| villa-savoye-interior-chaise-cc-by-sa | `public/archive-media/villa-savoye/interior/villa-savoye-chaise-longue-interior-cc-by-sa-2.jpg` | `needs_more_source_context` | no |

## Recommended Stance

- If no public preview is needed now, leave all three blocked.
- If a preview is needed, open a separate source-basis review before any public-ready change.

## After Decision

- `npm run kosmo:owner-decision-session-check`
- `npm run kosmo:data-lane-sweep`
- `npm run kosmo:data-lane-command-router`
- `npm run kosmo:night-loop-checkpoint`
