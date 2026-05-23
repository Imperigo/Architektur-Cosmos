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
