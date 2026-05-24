# Architecture Cosmos Brain

Architecture Cosmos Brain is the controlled operating layer for the atlas, archive and future database. It is allowed to behave like an active autonomous project brain: watchful, opinionated, self-checking and self-healing. It still asks before large or irreversible changes.

## Purpose

The Brain coordinates the data flow into and out of Architecture Cosmos:

- monitor archive completeness, source quality, rights status and model readiness;
- detect entries that need research, media review, material analysis, structure analysis or 3D layer planning;
- prepare review tasks that can later become code, content, model or database work;
- keep public and private archive logic separated;
- support future mail, upload and automation workflows through an approval queue.

## Operating Modes

1. `observe`
   Read project files, entries, relations, local review outputs and public metadata. No writes except local reports.

2. `draft`
   Create proposed tasks, source trails, entry drafts, rights notes and model plans. No live publishing.

3. `autonomous_review`
   Run audits, generate reports, detect broken flows, retry safe checks and prepare owner approval tasks.

4. `review`
   Organize proposed work into a queue with priorities, risks and approval gates.

5. `execute`
   Only after explicit approval. May edit repository files, run tests and prepare commits.

6. `publish`
   Only after tests pass and either the owner explicitly asks for publish or a future signed approval workflow exists.

## Approval Gates

- Public website content must pass rights review.
- Private research assets must remain private or link-only until cleared.
- New upload/auth/database behavior requires a security review before implementation.
- Automation may suggest code changes, but it may not silently deploy.
- Model generation must keep a source-basis note and confidence level.
- Commits, pushes, deploys, cloud writes, email sends, R2 uploads and database writes require approval.

## Self-Healing Policy

Allowed without approval:

- create missing `out/` report folders;
- regenerate local review reports;
- regenerate derived archive preview files;
- rerun a failed safe check once;
- write diagnostics explaining what broke.

Not allowed without approval:

- delete user files;
- rewrite tracked source files as a fix;
- commit, push or publish;
- create cloud resources;
- send emails;
- upload private or copyrighted assets;
- change auth/security boundaries.

## Brain V1 Command

```bash
npm run brain:review
```

The command produces a local report under:

```text
out/brain-review/YYYY-MM-DD/
```

The report includes:

- archive coverage;
- source and rights gaps;
- model and analysis gaps;
- registered local tools from `data/brain-tools.json`;
- relation coverage;
- suggested review tasks;
- recommended next steps.

## Local Tool Suite

The Brain now has a local review-only tool registry for integrated archive work:

```bash
npm run cosmos:plan-generate -- --entry villa-savoye
npm run cosmos:model-generate -- --entry villa-savoye
npm run cosmos:text-generate -- --entry villa-savoye
npm run cosmos:entry-build -- --entry villa-savoye --mode review
npm run kosmodata:book-ingest -- --input archive-inbox/books/villa-savoye-book --title "Villa Savoye Source Book"
npm run kosmodata:book-drafts -- --book villa-savoye-source-book
npm run kosmodata:book-pipeline -- --input archive-inbox/books/villa-savoye-book --title "Villa Savoye Source Book"
npm run database:source-audit
npm run database:research -- --agent all --topic "Villa Savoye"
```

These tools create 2D vector study drawings, Blender/ArchiCAD model planning
outputs, architecture-text review packs, private book-ingestion review packs,
metadata-only book entry drafts and source-research packages. They do not write
to the public database, upload assets or publish. The source audit is the first
gate before Brain research runs: it checks source coverage, rights modes,
automation readiness and unsafe URLs.

The detailed contract is documented in:

```text
docs/cosmos-tool-suite.md
docs/database-research-agents.md
docs/book-library-ingestion.md
```

## Brain Doctor

```bash
npm run brain:doctor
```

Runs the current autonomous health loop:

- `brain:review`
- `archive:validate`
- `lint`
- `ui:audit`
- `build`
- `security:check`

It writes:

```text
out/brain-review/YYYY-MM-DD/brain-doctor.md
out/brain-review/YYYY-MM-DD/brain-doctor.json
```

If a safe check fails, the doctor retries once where allowed and records the failure. It does not silently edit source code or publish.

## Brain Autopilot

```bash
npm run brain:autopilot
npm run brain:autopilot -- --execute --limit 1
npm run brain:autopilot -- --entry villa-savoye --kind model --execute
```

Brain Autopilot is the bridge between the Brain and the KosmoData ingestion
pipeline. It reads the latest Brain task list, selects the next supported
entry-level task and turns it into a local review-only pipeline run.

Supported task kinds:

- `rights` → rights gate + entry build review
- `research` → seed from research + enrichment review + entry build review
- `analysis` → seed from research + enrichment review + architecture text + entry build review
- `model` → model plan + model generation/review + entry build review
- `media` → hero/planet thumbnail audits + entry build review
- `relations` → archive validation + entry build review

The Autopilot writes reports under:

```text
out/brain-autopilot/YYYY-MM-DD/
```

It may run safe local review commands, but it does not run
`kosmodata:promote`, does not edit tracked source files, does not commit, does
not push, does not upload to R2 and does not write to D1. Its job is to prepare
review packets and suggested approval commands.

### Guarded Autopush

After explicit owner approval, the Brain can also publish safe repository
changes through a guarded command:

```bash
npm run brain:autopush -- --message "Brain update" --confirm-autopush
```

This command is intentionally separate from normal review mode. It:

- refuses to run without `--confirm-autopush` or
  `ARCHITECTURE_COSMOS_BRAIN_AUTOPUSH=1`;
- refuses to run outside `main`;
- refuses to stage local/private paths such as `archive-inbox/`,
  `archive-intake/`, `out/`, `.env*`, `.next/` and `.wrangler/`;
- runs `security:check`, `lint` and `build`;
- commits safe tracked repository changes when needed;
- pushes `main`, which triggers the Cloudflare production deploy.

Autopilot can call the same guard explicitly:

```bash
npm run brain:autopilot -- --execute --limit 5 --autopush --confirm-autopush
```

Without those flags, Autopilot remains review-only and does not push.

## Brain Promotion Controller

Once Autopilot has prepared local review packs, the Promotion Controller checks
which proposed entries can safely move into the static public data file:

```bash
npm run brain:promote -- --limit 5
```

The default mode is a plan/dry-run. It scans local
`archive-intake/{slug}/enrichment/proposed-entry.json` files, runs
`kosmodata:promote --dry-run` for each candidate, and writes a report under:

```text
out/brain-promote/YYYY-MM-DD/
```

After owner approval, a small batch can be applied:

```bash
npm run brain:promote -- --limit 5 --execute --confirm-promote
```

This writes only `data/mock-entries.json`. It does not upload assets, does not
write D1/R2 and does not publish private files. To deploy the promoted public
metadata immediately after the same gates, add guarded autopush:

```bash
npm run brain:promote -- --limit 5 --execute --confirm-promote --autopush --confirm-autopush
```

## Brain Text Polish

The Brain should also turn reviewed research into good public contribution
texts. This is separate from new research: it uses only existing entry metadata,
analysis layers and source trails, then writes a review report.

```bash
npm run brain:polish-texts -- --limit 8
```

After owner approval, the polished German texts can be applied to
`data/mock-entries.json`:

```bash
npm run brain:polish-texts -- --limit 8 --execute --confirm-public-text
```

The tool does not browse, upload media, write D1/R2 or publish private files.
It improves `one_sentence`, `full_description` and `architecture_text` with the
Architecture Cosmos question framework: These, Netzwerk/DNA, Topos, Typos,
Tektonik, Raumlogik, Kritik and KosmoData/3D value.

## Brain Model Status And Batch

The Brain must be honest about 3D. A planned R2 key is not a model. A real
public model is only a checked GLB under `public/archive-models/...` or a later
verified object-store URL.

```bash
npm run brain:model-status
```

This writes:

```text
out/brain-model-status/YYYY-MM-DD/latest.md
```

The status buckets are:

- `public_preview_glb` — static website can load a GLB preview;
- `local_review_glb` — local/private GLB exists under `archive-intake` or `out`;
- `planned_only` — model assets/R2 keys exist, but no GLB exists yet;
- `no_model_plan` — no model layer plan exists.

To run the local model pipeline for pilot entries:

```bash
npm run brain:model-batch -- --execute
```

The batch calls `cosmos:model-generate` only. It does not copy GLBs to
`public/`, does not upload R2, does not write D1 and does not modify
`data/mock-entries.json`. At the moment Villa Savoye, Alterszentrum Kloster
Ingenbohl, Habitat 67, Narkomfin Housing and Euralille Metropole have reviewed
procedural GLB templates; other entries receive model review plans until their
plan/section/source basis is strong enough.

To promote a reviewed local GLB into the public static website, use the
approval-gated promote tool:

```bash
npm run brain:promote-model -- --entry habitat-67
```

Without confirmation this only writes a review report. It validates the local
`archive-intake/{slug}/models/low.glb`, the geometry profile and the model tool
run. Public promotion requires the explicit owner flag:

```bash
npm run brain:promote-model -- --entry habitat-67 --confirm-public-model
```

That copies the checked preview to `public/archive-models/{slug}/low.glb` and
registers the entry in `data/public-model-previews.json`. It still does not
upload R2, does not write D1 and does not change `data/mock-entries.json`.

## Future Extensions

- mail intake summary;
- weekly update scout integration;
- dashboard review queue;
- signed approval links;
- private library quarantine;
- R2 signed upload preparation;
- Blender import request generation;
- owner-approved execute/publish automation.

## Cloud Brain V2

The official hosted direction is documented in:

```text
docs/cloud-brain-architecture.md
schema/architecture-cosmos-brain-d1.sql
```

Cloud Brain V2 should run as a Cloudflare Scheduled Worker with D1 state. The
first version is read-only/status-first:

- produce health and database-quality reports;
- store Brain run metadata and proposed tasks;
- expose read-only status endpoints;
- keep all execution, publishing, cloud writes, email sends and asset uploads
behind approval gates.

Local readiness check:

```bash
npm run brain:cloud-plan
```

Obsidian is tracked as a private knowledge/review surface for project notes,
research packs, Brain reports, taxonomies and decisions. It is not the public
asset store and does not replace rights gates.
