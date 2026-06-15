# KosmoReferences Pilot Gap Label Review

Generated: 2026-06-15T10:42:39.823Z
Status: `pilot_gap_label_review_ready`

## Summary

- Pilots: 3
- Gap labels: 12
- Hard blockers: 7
- Source-gated: 3
- Rights-gated: 2
- Provenance-gated: 2
- Review-gated: 2
- Private draft gated: 3
- Owner decisions required: 7
- Local worker allowed now: 5
- Public-ready after review: 0
- Failures: 0

## Gap Labels

| Gap | Gate | Severity | Owner decision | Local worker now | Source label |
| --- | --- | --- | --- | --- | --- |
| `villa-savoye:file_level_rights` | rights_required | hard_blocker | yes | no | media_rights_manifest_needed |
| `villa-savoye:plan_section_provenance` | provenance_required | hard_blocker | yes | no | pdf_decision_needed |
| `villa-savoye:model_layer_provenance` | provenance_required | hard_blocker | yes | no | plan_geometry_source_needed |
| `villa-savoye:material_system` | private_draft_only | private_study_ok | no | yes | material_profile_needed |
| `kapelle-sogn-benedetg:local_library_source` | source_required | hard_blocker | yes | no | source_metadata_needed |
| `kapelle-sogn-benedetg:plan_geometry` | review_required | review_blocker | no | yes | plan_geometry_source_needed |
| `kapelle-sogn-benedetg:timber_structure` | source_required | hard_blocker | yes | no | structure_source_needed |
| `kapelle-sogn-benedetg:material_texture_asset` | private_draft_only | private_study_ok | no | yes | material_profile_needed |
| `alterszentrum-kloster-ingenbohl:competition_pdf_extraction` | rights_required | hard_blocker | yes | no | pdf_decision_needed |
| `alterszentrum-kloster-ingenbohl:structure_evidence` | source_required | hard_blocker | yes | no | plan_geometry_source_needed |
| `alterszentrum-kloster-ingenbohl:material_system` | review_required | review_blocker | no | yes | material_profile_needed |
| `alterszentrum-kloster-ingenbohl:site_courtyard_model` | private_draft_only | private_study_ok | no | yes | plan_geometry_source_needed |

## Pilot Priorities

- `villa-savoye`: file_rights_and_plan_provenance_first; Draft file-level provenance manifest fields for existing local media/model assets.
- `kapelle-sogn-benedetg`: source_root_and_timber_structure_first; Draft source wishlist for library/lecture evidence and timber structure details.
- `alterszentrum-kloster-ingenbohl`: pdf_rights_and_structure_evidence_first; Draft link-only PDF extraction decision fields and structure evidence checklist.

## Hard Stops

- Do not read private pilot source folders.
- Do not copy PDF text, page images, plans or media into this review.
- Do not execute local workers from this review.
- Keep all media/model/asset slots blocked until file-level rights and provenance pass.
- Keep public-ready at 0.

## Failures

- None.
