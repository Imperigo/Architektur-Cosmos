# KosmoDraw Bundle Intake Review

Generated: 2026-06-17T17:26:29.237Z
Status: `kosmodraw_bundle_intake_review_ready`

## Policy

- Review-only intake.
- No public data is written.
- IFC/local paths are not copied into this report.
- Public-ready after intake remains `0`.

## Summary

- Bundles: 2
- Projects: 2
- Rooms: 2
- Walls: 3
- Openings: 3
- Stories: 2
- Asset candidates: 4
- Unsafe public flags: 0
- Private leak candidates: 0
- Public-ready after intake: 0

## Bundles

| Project | Source kind | Rooms | Walls | Openings | Assets | Intake |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `alterszentrum-kloster-ingenbohl` | hybrid | 1 | 1 | 1 | 2 | ready |
| `villa-savoye` | sketch_to_3d | 1 | 2 | 2 | 2 | ready |

## Next Actions

- Ask KosmoDraw for a real reviewed opening bundle from sketch_to_3d/export_ifc, then rerun this intake review.
- Map asset candidates into KosmoAsset review rows only after human/owner review.
- If review is accepted later, create a separate public promotion decision; this intake does not promote.

## Hard Stops

- Do not copy IFC/local paths into public data.
- Do not write data/mock-entries.json from this intake review.
- Do not mark any asset public_display_allowed from this intake review.
- Do not upload generated drawings or models to R2 from this intake review.
- Require human/owner review before any public route displays new bundle outputs.
