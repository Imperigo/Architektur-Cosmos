# Kosmo Private Source Inventory Plan

Generated: 2026-06-14T08:42:21.059Z
Status: `private_metadata_inventory_blocked`

## Summary

- Source-root decision status: passed_pending_owner_input
- Selected root path: pending
- Selected root exists: no
- Private diagnostic allowed: no
- Pilot count: 3
- Pilot gaps: 12
- Public-ready after plan: 0

## Inventory Scope

| Pilot | First pass | Allowed now | Source need |
| --- | --- | --- | --- |
| Villa Savoye | `metadata_only_media_plan_model_provenance` | no | file-level provenance and build-log evidence for existing media, diagrams and low.glb |
| Kapelle Sogn Benedetg | `metadata_only_private_library_source_discovery` | no | private book/ETH/HSLU references for timber structure, drawings, materials and model basis |
| Alterszentrum Kloster Ingenbohl | `metadata_only_pdf_and_structure_source_discovery` | no | private/link-only study-commission PDF decision, structure/material evidence and model basis |

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

- Keep private inventory blocked.
- Record a source-root decision session and rerun npm run kosmo:source-root-decision-session-check.
- Only continue when private_diagnostic_allowed=true.
