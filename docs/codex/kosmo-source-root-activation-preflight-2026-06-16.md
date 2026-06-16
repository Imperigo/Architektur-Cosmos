# Kosmo Source-Root Activation Preflight

Generated: 2026-06-16T12:31:14.960Z
Status: `source_root_activation_ready_for_private_metadata_diagnostic`

## Summary

- Data mount visible: yes
- Data mount available GiB: 3243.3
- Archive mount visible: yes
- OneDrive marker files: 59
- Source-root decision: passed_recorded_private_diagnostic_allowed
- Selected root: `/mnt/archiv/ArchitekturKosmos/Assets`
- Selected root exists: yes
- Private diagnostic allowed: yes
- Private inventory plan: private_metadata_inventory_plan_ready
- Private inventory contract: private_inventory_output_contract_passed
- Local models: local_model_inventory_ready_review_only
- Worker boundary: worker_boundary_pack_guard_passed
- Private root outside repo: yes
- Activation ready: yes
- Public-ready after preflight: 0

## Pilot Scope

| Pilot | First pass | Allowed after activation | Source need |
| --- | --- | --- | --- |
| Villa Savoye | `metadata_only_media_plan_model_provenance` | yes | file-level provenance and build-log evidence for existing media, diagrams and low.glb |
| Kapelle Sogn Benedetg | `metadata_only_private_library_source_discovery` | yes | private book/ETH/HSLU references for timber structure, drawings, materials and model basis |
| Alterszentrum Kloster Ingenbohl | `metadata_only_pdf_and_structure_source_discovery` | yes | private/link-only study-commission PDF decision, structure/material evidence and model basis |

## Safe Activation Sequence

1. `npm run kosmo:storage-mount-snapshot` - refresh mount metadata only
2. `npm run kosmo:source-root-locator` - refresh source-root candidate metadata
3. `npm run kosmo:source-root-selection-brief` - refresh owner selection worksheet
4. `npm run kosmo:source-root-decision-session-check` - verify selected root and owner decision
5. `npm run kosmo:source-root-blocker-refresh` - summarize blocker state
6. `npm run kosmo:private-library-diagnostic -- --roots "/mnt/archiv/ArchitekturKosmos/Assets"` - metadata-only diagnostic for the owner-approved root
7. `npm run kosmo:private-metadata-inventory -- --root "/mnt/archiv/ArchitekturKosmos/Assets"` - pilot-scoped metadata inventory for the owner-approved root
8. `npm run kosmo:private-source-inventory-plan` - build pilot-first metadata inventory scope
9. `npm run kosmo:private-inventory-output-template` - refresh safe private-output contract template
10. `npm run kosmo:private-inventory-output-check` - verify output contract contains no private content
11. `npm run kosmo:data-lane-sweep` - refresh KosmoReferences/KosmoAsset guard state
12. `npm run kosmo:data-lane-command-router` - refresh safe command routing
13. `npm run kosmo:worker-boundary-pack` - refresh worker boundary map
14. `npm run kosmo:worker-boundary-pack-check` - verify worker boundaries
15. `npm run kosmo:day-batch-loop` - rerun full review-only loop before any handoff

## Blocked Commands

- None for metadata diagnostics; private content extraction and public promotion still require later gates.

## Git Guard

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

- Run the safe activation sequence in order.
- Keep pilot scope limited to Villa Savoye, Kapelle Sogn Benedetg and Alterszentrum Kloster Ingenbohl.
- Run private inventory output check before handing any metadata back to Codex/Claude.
- Keep public-ready false until rights/provenance review passes.
