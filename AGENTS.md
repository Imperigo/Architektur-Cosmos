# Agent Instructions

This file is the entry point for AI coding agents (OpenAI Codex, Claude,
Cursor, Copilot, etc.) working on this repo.

## Read these files first

1. **`DEPLOYMENT.md`** — production setup, build pipeline, what breaks the
   static build, deployment flow. **Critical for any change that touches
   `next.config.js`, `wrangler.jsonc`, build scripts, or data fetching.**
2. **`README.md`** — project concept, local dev setup.
3. **`docs/project-foundation.md`** + sibling docs — design system,
   data model, interaction concept.

## Deployment in one sentence

**Every push to `main` is auto-deployed to Cloudflare Workers Static Assets.**
The live URL is `architekturkosmos.andrin99zsc.workers.dev`
(custom domain `architekturkosmos.ch` is being set up).

When the user says "publish", "deploy", "make it live", "veröffentliche das",
"live damit": **commit and push to main**. No other action required.
CF detects the push and rebuilds within 1–3 minutes.

## Hard constraints

- **Static export only.** `next.config.js` has `output: 'export'`. Do not
  add API routes, Server Actions, middleware, server-side `redirect()` at
  module level, or async data fetching that needs a server runtime —
  these break the build. See DEPLOYMENT.md for the full list and the
  migration path if you genuinely need server-side runtime.
- **Don't change `wrangler.jsonc`** unless you understand the static-assets
  deploy mode. Adding a `main` entry switches the project to a
  full Worker deploy and was the source of a deploy failure on 2026-05-18.
- **Don't add DB code.** Future DB integration is planned but the user
  will explicitly initiate it. For now: data comes from
  `data/mock-entries.json`.

## Soft preferences

- Keep the codebase TypeScript-strict.
- Tailwind for styling (no separate CSS files except `globals.css`).
- D3 + framer-motion are already deps — use them, don't pull in alternatives.
- New entries go into `data/mock-entries.json` following the shape in
  `lib/types.ts`.
- New routes: `app/<route>/page.tsx`. Per-entry detail pages
  (`app/atlas/[slug]/page.tsx`) would help SEO — welcome PR.

## When in doubt

If a change might affect deployment, runtime, or data layer: flag it
explicitly in the PR description rather than just doing it. The user
self-hosts adjacent infrastructure (see `DEPLOYMENT.md` → Future section)
and some changes have implications outside this repo.
