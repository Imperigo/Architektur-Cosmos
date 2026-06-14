# Kosmo Vision Completion Roadmap

Generated: 2026-06-14T18:44:54.261Z
Status: `vision_completion_roadmap_ready`

## Summary

- Phases: 6
- Immediate owner gates: 2
- Owner unlock checkpoint: 11/11 components, 113/113 guards
- Owner unlock latest handoff: 201
- Source-free Codex tasks remaining: 0
- Codex-ready tonight: 2
- Pilot-gap owner decisions: 7
- Asset owner confirmations: 3
- Training eval templates/fields: 6/10
- Training review lanes/states: 5/6
- Ontology entity/relation/facet groups: 8/10/6
- Public-ready after roadmap: 0

## Phases

### Owner/Overseer Unlock

- Status: dry_run_pipeline_ready_blocked_by_owner_reply
- Objective: Capture the explicit owner source-root/review-batch answer through dry-run, map review and guards without weakening privacy rules.
- Gates: owner_unlock_answer_dry_run, intake_map_review, source_root_choice, owner_open_review_batches
- Deliverables: Validated owner reply dry-run; Reviewed intake patch; Recorded owner answer intake; Activation preflight rerun
- Codex now: Use checkpoint 11/11 components and 113/113 guards; Run npm run kosmo:owner-unlock-answer-dry-run -- --answer "<owner_reply>" before any intake edit; Keep source-root private diagnostics blocked until reviewed intake and source-root guards pass

### Private Metadata Inventory

- Status: blocked_until_source_root_activation
- Objective: After owner unlock, scan metadata only for pilot-relevant private sources.
- Gates: source_root_activation_preflight, private_metadata_inventory_check
- Deliverables: Pilot-scoped metadata inventory; No OCR/text extraction yet; No private files in Git
- Codex now: Keep output contract strict; Prepare review templates for Villa/Sogn/Ingenbohl

### Pilot Reference Packages

- Status: partially_ready_review_only
- Objective: Turn Villa Savoye, Sogn Benedetg and Ingenbohl into complete review-only KosmoReferences packages.
- Gates: 7 pilot owner decisions, file rights/provenance, source evidence
- Deliverables: Project metadata; Plan/image/PDF slots with rights state; Typology/material/structure/space/construction analysis; Export status private/review-only/public-ready false
- Codex now: Use 12 gap labels as worklist; Prioritize Villa file provenance, Sogn source evidence, Ingenbohl PDF decision

### KosmoAsset Bridge

- Status: review_only_ready
- Objective: Convert validated reference signals into 2D/3D/material asset candidates without public release.
- Gates: 3 asset owner confirmations, rights review, manual metadata review
- Deliverables: Material/texture candidate lanes; Project asset scope review; Asset provenance contracts; No automatic public release
- Codex now: Use 10 asset taxonomy reviews; Keep repo conversion at 0 until manual approval

### Local Worker Fleet

- Status: contracts_ready_no_execution_now
- Objective: Use local LLMs for cheap fleissarbeit while Codex/Claude supervise quality and architecture.
- Gates: manual metadata review, safe task execution request, output guard
- Deliverables: Runnable local worker command map; Output contracts; Review-only worker packets; No blind commit of local output
- Codex now: Convert worker outputs only through guarded metadata review; Keep smart models as overseer/reviewer

### Kosmo Training Memory

- Status: training_scaffold_ready_blocked_by_verified_data
- Objective: Transform verified references/assets into future RAG, eval and fine-tuning material for Kosmo KI.
- Gates: verified provenance, rights classification, quality evals, owner training gate
- Deliverables: Architecture-specific schema; Architecture ontology seed; Eval row template; Eval review queue; RAG corpus; Evaluation set; Fine-tuning candidate set
- Codex now: Do not train on unverified private content; Use 6 eval row templates and 5 review lanes; Bind future rows to ontology 8/10/6; Keep queue items, eval rows, embeddings and fine-tunes at 0 until verified data and owner training gate exist

## Tonight Batch

- Publish this roadmap artifact and guard status.
- Use Owner Unlock Answer Dry Run as the next machine entry point after owner reply.
- Keep Owner Unlock Prompt as the single next human decision surface.
- Keep the training scaffold as schema/review-only: no queue items, eval rows, embeddings or fine-tunes.
- Do not run private inventory, local worker execution or public promotion until owner gates pass.
