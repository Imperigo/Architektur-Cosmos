# Architecture Cosmos Brain

Architecture Cosmos Brain is the controlled operating layer for the atlas, archive and future database. It is not a free-running replacement for the project owner. It is a rule-bound curator that observes, audits, drafts and prepares work for approval.

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

3. `review`
   Organize proposed work into a queue with priorities, risks and approval gates.

4. `execute`
   Only after explicit approval. May edit repository files, run tests and prepare commits.

5. `publish`
   Only after tests pass and either the owner explicitly asks for publish or a future signed approval workflow exists.

## Approval Gates

- Public website content must pass rights review.
- Private research assets must remain private or link-only until cleared.
- New upload/auth/database behavior requires a security review before implementation.
- Automation may suggest code changes, but it may not silently deploy.
- Model generation must keep a source-basis note and confidence level.

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
- relation coverage;
- suggested review tasks;
- recommended next steps.

## Future Extensions

- mail intake summary;
- weekly update scout integration;
- dashboard review queue;
- signed approval links;
- private library quarantine;
- R2 signed upload preparation;
- Blender import request generation;
- owner-approved execute/publish automation.
