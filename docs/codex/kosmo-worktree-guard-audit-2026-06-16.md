# Kosmo Worktree Guard Audit

Generated: 2026-06-16T18:07:04.435Z
Status: `worktree_guard_audit_dirty_review_required`

## Summary

- Entries: 1324
- Staged: 0
- Unstaged: 1194
- Untracked: 130
- High-risk path hints: 80
- Broad stage allowed: no
- Public-ready after audit: 0

## Top-Level Buckets

- docs: 374
- examples: 344
- data: 318
- scripts: 149
- app: 58
- public: 27
- components: 19
- schema: 9
- lib: 7
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

- ` M`: 1194
- `??`: 130

## Worker Rules

- Do not run git add . in this repository.
- Stage exact files only and inspect git diff --cached --stat before commit.
- Treat existing dirty files as user/other-worker state unless the current worker created them in this batch.
- Do not revert unrelated dirty files.
- If a file owned by another worker must change, write a handoff.
