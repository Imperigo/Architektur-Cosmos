# KosmoReferences Pilot Evidence Matrix

Generated: 2026-06-15T10:42:39.580Z
Status: `pilot_evidence_matrix_review_only`

## Summary

- Pilots: 3
- Total gaps: 12
- Media slots blocked: 12
- Asset candidates blocked: 9
- Public-ready assets: 0
- Data-Lane Sweep: 24/24 (kosmodata_lane_sweep_review_only_passed)
- Local Worker Review: 9/9, 0 risk (local_worker_outputs_present_review_only)
- Private library: library_candidate_visible, 30 curated sync errors
- OneDrive Repair Sweep: 58/59 markers, 58 missing

## Pilot Matrix

| Pilot | Status | Gaps | Blocking gap types | Workers | Next action |
| --- | --- | ---: | --- | --- | --- |
| Villa Savoye | review_only_draft | 4 | file_level_rights, plan_section_provenance | codex-central-overseer, kosmo-local-llm, local-batch-workers | Run a Villa file-level asset provenance pass before any public media/model promotion. |
| Kapelle Sogn Benedetg | review_only_draft | 4 | local_library_source, timber_structure | kosmo-local-llm, local-batch-workers, owner_plus_codex | Find the missing local library source first; otherwise keep Sogn geometry/material outputs clearly labeled as study hypotheses. |
| Alterszentrum Kloster Ingenbohl | review_only_draft | 4 | competition_pdf_extraction, structure_evidence | codex-central-overseer, kosmo-local-llm, local-batch-workers | Decide whether the linked study-commission PDF can enter private extraction; then build structure/material gap evidence. |

## Next Actions

- Keep all three pilots review-only until owner decisions and file-level rights/provenance pass.
- Use Villa Savoye for file-level media/model provenance first because local assets already exist.
- Use Sogn Benedetg for private-library mount/source discovery; do not harden geometry before the source root is visible.
- Use Ingenbohl for link-only PDF extraction decision and structure/material evidence planning.
- Run npm run kosmo:data-lane-sweep after any pilot evidence update.

## Safety

All pilots remain review-only. This matrix does not approve public display or copy private source content.
