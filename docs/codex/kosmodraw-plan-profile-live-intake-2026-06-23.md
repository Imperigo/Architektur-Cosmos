# KosmoDraw plan_profile Live Intake

Date: 2026-06-23
Producer commit: KosmoDraw `01257fa`
ArchitectureCosmos policy: review-only

## Contract correction

The ArchitectureCosmos adapter now follows the live producer rather than the earlier broad draft:

- required producer fields: `provenance`, `rooms`, `walls`, `openings`, `bounds`, `story_id`, `floor_level`, `units`
- optional consumer fields: `room_stamps`, `dimensions`, `grid`
- room stamps and a default grid are derived consumer-side when absent
- dimension chains remain empty when the producer does not provide them

## Confidence

Every room, wall and opening must carry a finite confidence from 0 to 1.

- `exact_projection`: producer-supplied confidence is expected to be 1.0
- `recognized`: producer-supplied recognition confidence is preserved exactly

ArchitectureCosmos does not invent or normalize missing confidence. Missing or invalid values fail closed.

## Public boundary

The adapted result remains:

- `status: review_only`
- `public_display_allowed: false`
- no public drawings, model preview or asset promotion
- no source or IFC path copied
