# Architecture Cosmos

Architecture Cosmos is a radial architecture atlas. It organizes architectural knowledge as a circular field of time rings, style sectors, entry nodes, and future relations.

The project starts deliberately small: a Next.js, React, TypeScript, Tailwind CSS, and SVG MVP with local JSON data.

## MVP

The first version builds the core atlas without filters, search, database, CMS, authentication, or backend infrastructure. It tests the essential interaction: open the atlas, inspect entries positioned by year and sector, and read a selected entry in a detail panel.

## Foundation Docs

- `docs/project-foundation.md`
- `docs/master-brief.md`
- `docs/data-model.md`
- `docs/database-architecture.md`
- `docs/storage-cost-guardrails.md`
- `docs/cloudflare-archive-preview.md`
- `docs/interface-concept.md`
- `docs/design-system.md`
- `docs/mvp-scope.md`
- `docs/innovation-backlog.md`
- `schema/architecture-cosmos-d1.sql`

## Run locally

```bash
npm install
npm run dev
```

Then open the local Next.js URL shown in the terminal.

## Deployment

The site is hosted on **Cloudflare Workers (Static Assets)** at
[architekturkosmos.ch](https://architekturkosmos.ch). Every push to `main`
is auto-deployed in 1–3 minutes — no manual step.

For build/runtime constraints and the deploy architecture, see
[`DEPLOYMENT.md`](./DEPLOYMENT.md). AI coding agents should also read
[`AGENTS.md`](./AGENTS.md) before making changes.
