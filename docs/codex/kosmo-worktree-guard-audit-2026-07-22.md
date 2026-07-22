# Kosmo Worktree Guard Audit

Generated: 2026-07-22T10:43:36.964Z
Status: `worktree_guard_audit_dirty_review_required`

## Summary

- Entries: 1855
- Staged: 0
- Unstaged: 1415
- Untracked: 440
- High-risk path hints: 80
- Broad stage allowed: no
- Public-ready after audit: 0

## Branch State

- Branch: main
- Upstream: origin/main
- Ahead: 0
- Behind: 0
- Diverged: no
- Push requires sync decision: no

## Top-Level Buckets

- docs: 629
- data: 569
- examples: 382
- scripts: 155
- app: 50
- public: 27
- components: 9
- schema: 9
- lib: 6
- .github: 3
- _IMPORT_NOTE_2026-06-10.md: 1
- .gitignore: 1
- .nvmrc: 1
- .tmp: 1
- AGENTS.md: 1
- DEPLOYMENT.md: 1
- eslint.config.mjs: 1
- next-env.d.ts: 1
- next.config.js: 1
- postcss.config.js: 1
- README.md: 1
- SECURITY.md: 1
- src: 1
- tailwind.config.ts: 1
- tsconfig.json: 1
- wrangler.jsonc: 1

## Status Code Buckets

- ` M`: 1415
- `??`: 440

## Worker Rules

- Do not run git add . in this repository.
- Stage exact files only and inspect git diff --cached --stat before commit.
- Treat existing dirty files as user/other-worker state unless the current worker created them in this batch.
- Do not revert unrelated dirty files.
- If local and upstream branches diverge, do not push until a sync or owner decision is explicit.
- If a file owned by another worker must change, write a handoff.
