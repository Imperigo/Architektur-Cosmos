# Kosmo Private Source Inventory Plan

Generated: 2026-06-16T12:31:12.354Z
Status: `private_metadata_inventory_plan_ready`

## Summary

- Source-root decision status: passed_recorded_private_diagnostic_allowed
- Selected root path: `/mnt/archiv/ArchitekturKosmos/Assets`
- Selected root exists: yes
- Private diagnostic allowed: yes
- Pilot count: 3
- Pilot gaps: 12
- Public-ready after plan: 0

## Inventory Scope

| Pilot | First pass | Allowed now | Source need |
| --- | --- | --- | --- |
| Villa Savoye | `metadata_only_media_plan_model_provenance` | yes | file-level provenance and build-log evidence for existing media, diagrams and low.glb |
| Kapelle Sogn Benedetg | `metadata_only_private_library_source_discovery` | yes | private book/ETH/HSLU references for timber structure, drawings, materials and model basis |
| Alterszentrum Kloster Ingenbohl | `metadata_only_pdf_and_structure_source_discovery` | yes | private/link-only study-commission PDF decision, structure/material evidence and model basis |

## Output Contract

Private root: `/mnt/data/ArchitekturKosmos/KosmoZentrale/sources/private-inventory`

Allowed in Git/public repo:
- metadata counts
- file path fingerprints
- rights status placeholders
- gap summaries written in own words

Forbidden in Git/public repo:
- book scans
- PDF full text
- protected plans or screenshots
- private images
- long quotations
- public-ready promotion flags

## Next Actions

- Run npm run kosmo:private-library-diagnostic -- --roots "/mnt/archiv/ArchitekturKosmos/Assets"
- Create a private metadata-only inventory folder under KosmoZentrale.
- Inventory pilots first, not the whole library.
- Return only counts, paths, fingerprints and own-written gap summaries to Git.
