# KosmoAsset Intake Readiness Pack

Generated: 2026-06-15T04:58:49.470Z
Status: `kosmoasset_intake_readiness_pack_ready`

## Summary

- Pilot asset groups: 3
- Pilot assets: 6
- Library candidates: 3
- Blocked candidates: 7
- Total stages: 36
- Executable now: 0
- Open human reviews: 6
- Promotion allowed: no
- Public-ready after pack: 0

## Pilot Asset Groups

### Villa Savoye

- Assets: 2
- Categories: annotation, material
- Export targets: archicad, blender, layout, svg, web
- Public use allowed: 0
- Asset IDs: villa-savoye-concrete-frame-material-001, villa-savoye-five-points-diagram-001

### Kapelle Sogn Benedetg

- Assets: 2
- Categories: material, opening
- Export targets: archicad, blender, dxf, layout, svg, web
- Public use allowed: 0
- Asset IDs: sogn-benedetg-wood-shingle-material-001, sogn-benedetg-light-band-detail-001

### Alterszentrum Kloster Ingenbohl

- Assets: 2
- Categories: material, structure
- Export targets: archicad, blender, glb, web
- Public use allowed: 0
- Asset IDs: ingenbohl-mineral-pigment-material-001, ingenbohl-concrete-core-frame-study-001

## Private Library Candidate Groups

- `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-abgabe-tkb-bibl`: material_rights_review; owner confirmation required
- `possible-source-root-mnt-archiv-architekturkosmos-assets-claude-to-blender-ai-architektur-`: material_rights_review; owner confirmation required
- `possible-source-root-mnt-archiv-architekturkosmos-assets`: project_asset_scope_review; owner confirmation required

## Command Order After Owner And Source Guards

- npm run kosmo:asset-reference-bridge-check
- npm run kosmo:asset-candidate-taxonomy-review
- npm run kosmo:asset-candidate-taxonomy-review-check
- npm run kosmo:asset-intake-readiness-pack
- npm run kosmo:asset-intake-readiness-pack-check
- npm run kosmo:data-lane-sweep
- npm run kosmo:references-nightly-gate

## Hard Stops

- Do not ingest private asset libraries before owner lane confirmation and rights review.
- Do not generate, normalize or export assets from private contents in this pack.
- Do not send private file contents to local LLM workers.
- Do not upload or publish assets.
- Keep pilot-derived assets review-only until human review and promotion guards pass.
- Keep public-ready at 0.
