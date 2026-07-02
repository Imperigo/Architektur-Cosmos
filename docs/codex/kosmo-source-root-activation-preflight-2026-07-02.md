# Kosmo Source-Root Activation Preflight

Generated: 2026-07-02T06:16:51.916Z
Status: `source_root_activation_waiting_for_owner_storage_action`

## Summary

- Data mount visible: no
- Data mount available GiB: unknown
- Archive mount visible: no
- OneDrive marker files: unknown
- Source-root decision: passed_pending_owner_input
- Selected root: `pending`
- Selected root exists: no
- Private diagnostic allowed: no
- Private inventory plan: private_metadata_inventory_blocked
- Private inventory contract: private_inventory_output_contract_passed
- Local models: missing
- Worker boundary: missing
- Private root outside repo: yes
- Activation ready: no
- Public-ready after preflight: 0

## Pilot Scope

| Pilot | First pass | Allowed after activation | Source need |
| --- | --- | --- | --- |
| Villa Savoye | `metadata_only_media_plan_model_provenance` | no | file-level provenance and build-log evidence for existing media, diagrams and low.glb |
| Kapelle Sogn Benedetg | `metadata_only_private_library_source_discovery` | no | private book/ETH/HSLU references for timber structure, drawings, materials and model basis |
| Alterszentrum Kloster Ingenbohl | `metadata_only_pdf_and_structure_source_discovery` | no | private/link-only study-commission PDF decision, structure/material evidence and model basis |

## Safe Activation Sequence

1. `npm run kosmo:storage-mount-snapshot` - refresh mount metadata only
2. `npm run kosmo:source-root-locator` - refresh source-root candidate metadata
3. `npm run kosmo:source-root-selection-brief` - refresh owner selection worksheet
4. `npm run kosmo:source-root-decision-session-check` - verify selected root and owner decision
5. `npm run kosmo:source-root-blocker-refresh` - summarize blocker state
6. `npm run kosmo:private-source-inventory-plan` - build pilot-first metadata inventory scope
7. `npm run kosmo:private-inventory-output-template` - refresh safe private-output contract template
8. `npm run kosmo:private-inventory-output-check` - verify output contract contains no private content
9. `npm run kosmo:data-lane-sweep` - refresh KosmoReferences/KosmoAsset guard state
10. `npm run kosmo:data-lane-command-router` - refresh safe command routing
11. `npm run kosmo:worker-boundary-pack` - refresh worker boundary map
12. `npm run kosmo:worker-boundary-pack-check` - verify worker boundaries
13. `npm run kosmo:day-batch-loop` - rerun full review-only loop before any handoff

## Blocked Commands

- `npm run kosmo:private-library-diagnostic -- --roots "<selected-root>"` - blocked until source-root decision check allows private diagnostic
- `npm run kosmo:private-metadata-inventory -- --root "<selected-root>"` - blocked until source-root activation preflight is ready
- `local OCR/PDF extraction on private files` - blocked until source-root, scope and output guards pass
- `any public-ready promotion` - blocked until provenance, rights and owner review pass

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

- Owner/KosmoOverseer selects or mounts a real private source root.
- Rerun source-root locator, selection brief, decision-session check and blocker refresh.
- Do not run private OCR, extraction, copying or public promotion.

