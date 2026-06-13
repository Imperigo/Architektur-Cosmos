# Kosmo Owner Review Agenda

Generated: 2026-06-13
Status: `agenda_only`

## Purpose

This agenda prepares a future owner review round for KosmoReferences and KosmoAsset. It does not record decisions, approve media, promote models, upload assets, write manifests or mark anything public-ready.

Inputs:

- `docs/codex/kosmo-human-decision-owner-batches-2026-06-13.md`
- `data/kosmo-human-decision-owner-batches-2026-06-13.json`
- private overseer-corrected local worker output:
  `/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/kosmo-local-worker-2026-06-13/owner-batch-review-questions.private.md`

Current state:

- Human Decision Queue: 16/16 open
- Owner Decision Batches: 5/5 open
- Public-ready assets: 0

## Rules For The Review Round

- Ask one batch at a time.
- Start each batch with the safe default.
- Never ask for direct public approval without separate source/rights review.
- Do not record choices in this agenda.
- After actual choices are entered into the session files, run the relevant checks.

## Batch D: Sogn Benedetg Source Gap

Safe default: `needs_more_source_context`

Use first if the owner can locate the missing private library root.

Questions:

1. Where is the real private book/ETH/HSLU source root mounted?
2. Should Sogn Benedetg stay link-only and review-only until that source root is visible?
3. Which Sogn source should Codex/Claude inventory first once the root is available?

Expected next action:

- If the source root is provided, run the private-library diagnostic again before changing any public state.

## Batch A: Villa Savoye Image Candidates

Safe default: `needs_more_source_context`

Use only if a Villa Savoye visual preview is needed soon.

Questions:

1. Should Codex/Claude open a separate source/rights review for any of the three Villa Savoye image candidates?
2. Should the LOC candidate be checked for acceptable credit/attribution wording?
3. Should the CC-BY-SA interior candidate stay blocked unless ShareAlike obligations are explicitly accepted?
4. If no near-term preview is needed, can all three stay at `needs_more_source_context`?

Expected next action:

- Open source/rights review only for named candidates; otherwise keep blocked.

## Batch B: Villa Savoye Derived Files

Safe default: `keep_blocked`

Use to keep generated or derived files from drifting toward public use.

Questions:

1. Should the Villa Savoye crop, plan, section and GLB remain blocked?
2. Is there a named source-basis review for any one of these derived files?
3. Should the GLB remain explicitly diagrammatic/not-measured?

Expected next action:

- Record `keep_blocked` only in the real decision session if the owner confirms that default.

## Batch C: Model Promotion Confirmation

Safe default: `needs_more_source_context`

Use only if model promotion is actually needed.

Questions:

1. Should Villa Savoye or Ingenbohl model promotion be prepared, or should both stay internal/review-only?
2. Does the owner accept that current models are diagrammatic and not measured?
3. Should every model promotion require a separate model-quality/source-confidence review?

Expected next action:

- Prepare a promotion review only after explicit owner direction. Do not promote from this agenda.

## Batch E: KosmoAsset Human Reviews

Safe default: `needs-review`

Use after local asset files are inspectable in their target tools.

Questions:

1. Who should inspect the six local asset studies in Blender/DXF/Web?
2. Which asset route matters first: Blender material, DXF detail, web diagram or later ArchiCAD?
3. Should any assets remain `block-public` even after local approval?
4. Should asset reviews wait until the missing private source library is visible?

Expected next action:

- Record asset decisions only through `kosmo:asset-review-decision` after a named human review.

## Commands After Real Decisions

Reference decisions:

```bash
npm run kosmo:owner-decision-session-check
```

Asset decisions:

```bash
npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json
```

Full state:

```bash
npm run kosmo:data-lane-sweep
```
