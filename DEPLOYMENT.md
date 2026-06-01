# Deployment & Production Context

This file documents how this app is hosted in production, so that any code
change can be made with full awareness of the runtime environment.

**For Codex (and any future AI agent working on this repo)**: read this
before suggesting changes that touch build, runtime, or data layer.

---

## TL;DR — "publish this" / "make it live"

**Every push to `main` is automatically deployed.** There is no manual deploy
step. When the user says "publish", "deploy", "make it live", or similar:

1. Make sure changes are committed
2. Push to `main`
3. Cloudflare detects the push within seconds and rebuilds
4. Live at `https://architekturkosmos.ch` in 1–3 minutes
5. Verify by visiting the URL

If a build fails, the previous version stays live (no broken deployments).

---

## Production Architecture

| Component | Tech | Location |
|---|---|---|
| Hosting | **Cloudflare Workers (Static Assets + read-only API shell)** | edge, global |
| Worker name | `architekturkosmos` | Cloudflare account configured outside the repo |
| Production URL (Workers) | account-specific preview URL | intentionally not committed |
| Custom domain | `architekturkosmos.ch` | ✅ live (since 2026-05-18) |
| Custom domain (www) | `www.architekturkosmos.ch` | live alongside apex |
| Build runtime | Node 22 (CF build env) | CF cloud builders |
| Deploy tool | `wrangler` (version pinned to latest by CF) | auto-installed |
| Auto-deploy trigger | GitHub push to `main` | CF Pages GitHub integration |

The visual website is still a static Next export. A lightweight Worker shell now
handles read-only `/api/*` routes for external tools such as Blender, then
passes every non-API request through to Cloudflare Static Assets.

---

## Build Pipeline (what happens on every push)

1. CF Pages clones the repo at `main`
2. Runs `npm clean-install`
3. Runs `npm run build` (which runs `next build` and then verifies/copies referenced `/_next/static` assets)
4. Next.js produces a static export in `./out/` (because `next.config.js` has `output: 'export'`)
5. Runs `npx wrangler deploy`
6. Wrangler reads `wrangler.jsonc` → compiles `src/worker.ts` and uploads `./out/` as Workers Static Assets
7. New version becomes the active deployment

**Critical config files** (do not modify casually):

- **`next.config.js`** — must keep `output: 'export'`, `trailingSlash: true`, `images: { unoptimized: true }` for static export to work
- **`wrangler.jsonc`** — must keep `main: "./src/worker.ts"`, `assets.binding: "ASSETS"` and `assets.directory: "./out"` so `/api/*` works while all page routes remain static
- **`package.json`** name (`architektur-cosmos-browser`) — does NOT need to match the CF Worker name (`architekturkosmos`); a previous setup attempt failed because of this mismatch, the current static-assets-only setup avoids the issue

`scripts/next-static-export-assets.mjs` is part of the local/CI build guard:
after `next build`, it ensures that CSS and JS assets referenced from exported
HTML exist under `out/_next/static`. Keep it in the build command unless the
Next static export pipeline is replaced entirely.

---

## What this means for code changes

### ✅ Safe to change without deployment implications
- Components in `components/`, `app/` routes, `lib/` helpers
- Tailwind classes, styling
- New static pages (e.g., `app/about/page.tsx`)
- New entries in `data/mock-entries.json`
- TypeScript types in `lib/types.ts`
- Adding client-side libraries (D3, framer-motion, etc.)

### ⚠️ Touch with care (still works on static, but think through)
- **`generateStaticParams`** for dynamic routes — yes, this works with static export. Use it for things like `app/atlas/[slug]/page.tsx` to pre-render per-entry pages.
- **Client components** — fine, but make sure they degrade gracefully if JS is disabled (SEO-relevant)
- **Image sources** — keep `images: { unoptimized: true }` in next.config.js or use external CDN; Next.js Image Optimization API doesn't work on static export
- **Font loading** — `next/font` works, just verify bundle stays reasonable

### ❌ Will break the static build
- **Server Components with async data fetching from external APIs** at request time (`fetch` with `cache: 'no-store'`) — these need server runtime, not available on static export
- **Next API routes** (`app/api/.../route.ts`) — would fail to build with `output: 'export'`; use the standalone Cloudflare Worker in `src/worker.ts` for edge API endpoints
- **Server Actions** — same
- **`redirect()` from `next/navigation`** at module top-level — breaks build
- **Middleware** — not supported on static export
- **ISR/`revalidate`** — no-op on static export, won't error but doesn't do anything

### Current Worker API Contract

The Worker is intentionally small and read-only:

- `GET /api/entries.json` — bundled `data/mock-entries.json`, 1h edge cache, CORS `*`
- `GET /api/taxonomies.json` — derived taxonomy lists, 1h edge cache, CORS `*`
- `GET /api/search` — server-side filtering for Blender/local tools, response `{ count, results }`, CORS `*`

The Worker does **not** write to D1/R2, does not expose admin upload routes and
does not replace the static frontend data flow.

### 🚀 If you need the Next runtime items above
That means the app is outgrowing static export. Then the migration path is:
1. Remove `output: 'export'` from `next.config.js`
2. Replace the lightweight `src/worker.ts` shell with an `@opennextjs/cloudflare` worker
3. Install `@opennextjs/cloudflare` adapter
4. Change deploy to `npx opennextjs-cloudflare build && npx wrangler deploy`

But don't do this preemptively — flag it to the user first ("this change would require switching to OpenNext.js, ok?").

---

## Local Development

Unchanged from any Next.js project:

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # produces ./out/, mirrors what CF will do
npm run lint
```

No environment variables needed currently.

---

## Future: DB / Archive Integration

The preferred low-cost database path is now Cloudflare-native, but D1 and R2
are separate phases:

1. **Database**: Cloudflare D1 for structured metadata, relations, tags, sources,
   analysis records, and 3D model metadata.
2. **Asset storage**: Cloudflare R2 preview bucket for images, plans, PDFs, source scans,
   textures, `.glb` / `.gltf` / `.usdz` models, and large analysis JSON files.
   Uploads are still blocked and cost-guarded until real upload policy is ready.
3. **Schema contract**: `docs/database-architecture.md` and
   `schema/architecture-cosmos-d1.sql`.
4. **Frontend pattern**: keep static JSON as the local fallback while the schema
   stabilizes. Only introduce runtime data reads when explicitly requested.
5. **Runtime switch**: dynamic read-only endpoints can live in `src/worker.ts`.
   Write endpoints, auth, uploads, D1/R2 bindings or CMS flows still require an
   explicit architecture decision.

**For now: do not add live D1/R2 bindings, auth, CMS, upload routes or write
endpoints.** D1 can be used as a preview/import target through scripts, while
the website stays static + mock JSON until the user explicitly asks to activate
live database reads or writes.

---

## SEO / Search Engine Indexing

The site is meant to be indexable. When adding pages:

- Use `metadata` export in each `page.tsx` (Next.js Metadata API) for title/description/og-image
- Per-entry detail pages (`app/atlas/[slug]/page.tsx`) significantly help indexing — currently missing
- A `sitemap.ts` and `robots.ts` in `app/` would help — currently missing
- Structured data (JSON-LD with schema.org Building/Place) for entries would help — currently missing

These improvements are welcome PRs. They don't require any infra changes.

---

## Project URLs

- **Repo**: https://github.com/Imperigo/Architektur-Cosmos
- **Production (Custom Domain)**: https://architekturkosmos.ch ✅ live
- **CF Dashboard**: https://dash.cloudflare.com → Workers & Pages → `architekturkosmos`

---

## Project context

Private owner/contact details must stay outside the public repository.

- **Concept**: "Architecture Universe" — radial zoomable atlas of architectural
  history with concentric time rings, style sectors, expandable entries.

If anything in this file is unclear or out of date, update it as part of your
PR — keeping this current is part of the deployment contract.
