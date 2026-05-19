# Cloudflare Archive Preview Runbook

This runbook prepares the first D1 + R2 preview archive for Architecture Cosmos.
It does not connect the live website to the database.

## Current Status

- The visual website remains a static Next export.
- A lightweight read-only Cloudflare Worker API now serves `/api/entries.json`,
  `/api/taxonomies.json` and `/api/search` from the bundled static snapshot for
  Blender/local tooling.
- Cloudflare D1 preview is created and imported as `architecture-cosmos-preview`.
- Cloudflare R2 preview bucket is created as `architecture-cosmos-assets-preview`.
- R2 upload/write workflows are intentionally not implemented yet.
- D1/R2 are not connected to the live frontend.
- No auth, CMS, backend writes, upload routes, or D1/R2 runtime reads are added.
- Wrangler currently needs a `CLOUDFLARE_API_TOKEN` in non-interactive Codex runs.

Last confirmed successful preview import: **2026-05-18**.

## Local Checks

Run these before touching Cloudflare:

```bash
npm run archive:validate
npm run archive:preview-json
npm run archive:export
npm run archive:smoke
npm run archive:r2-manifest
npm run archive:draft
npm run blender:smoke
```

Generated files:

- `data/archive-preview.json`
- `out/archive-d1-import.sql`
- `out/archive-r2-manifest.json`
- `out/entry-draft-preview.json`

`data/archive-preview.json` is committed because it powers the static archive UI.
The `out/*` files are generated output and are not committed.

`archive:draft` validates `data/entry-draft-template.json` by default and writes
a local preview with planned R2 keys but no uploads.

## Recommended Preview Names

- D1 database: `architecture-cosmos-preview`
- R2 bucket: `architecture-cosmos-assets-preview` (preview bucket; no uploads yet)

## Remote Setup Commands

Only run these after Cloudflare authentication is available:

```bash
export CLOUDFLARE_API_TOKEN="..."

npm run archive:cloudflare-preview
```

The command above validates the local archive, exports SQL plus a local asset
planning manifest, creates the preview D1 database when missing, imports the
schema/data, and runs smoke queries.

R2 is still skipped by default by the script to avoid accidental bucket creation
in fresh accounts. In this account the preview bucket exists, but the local R2
manifest remains the only asset planning artifact and no file is uploaded.

It deliberately passes `--update-config=false` when creating resources. Do not
let Wrangler add D1/R2 bindings to `wrangler.jsonc` while the site is still a
static export.

Preferred explicit D1 command:

```bash
npm run archive:d1-preview
```

Remote smoke queries without re-importing:

```bash
npm run archive:d1-smoke-remote
```

To explicitly include or recreate the R2 preview bucket, two cost-guard steps are required:

```bash
export ARCHITECTURE_COSMOS_ENABLE_R2=1
npm run archive:d1-preview -- --with-r2 --i-understand-r2-costs
```

Without both the environment variable and the explicit flag, the script refuses
to create or check/create an R2 bucket.

Read-only R2 bucket status:

```bash
npm run archive:r2-status
```

Manual equivalent:

```bash
export CLOUDFLARE_API_TOKEN="..."

npx wrangler d1 create architecture-cosmos-preview

npm run archive:export
npm run archive:r2-plan

npx wrangler d1 execute architecture-cosmos-preview --remote --file schema/architecture-cosmos-d1.sql
npx wrangler d1 execute architecture-cosmos-preview --remote --file out/archive-d1-import.sql
```

## Remote Smoke Queries

```bash
npx wrangler d1 execute architecture-cosmos-preview --remote --command "SELECT COUNT(*) AS entries FROM entries;"
npx wrangler d1 execute architecture-cosmos-preview --remote --command "SELECT COUNT(*) AS relations FROM entry_relations;"
npx wrangler d1 execute architecture-cosmos-preview --remote --command "SELECT COUNT(*) AS flower_models FROM entry_models WHERE entry_id = 'afasia-no-architecture-flower-house';"
npx wrangler d1 execute architecture-cosmos-preview --remote --command "SELECT COUNT(*) AS flower_analysis FROM entry_analysis WHERE entry_id = 'afasia-no-architecture-flower-house';"
npx wrangler d1 execute architecture-cosmos-preview --remote --command "SELECT e.title, m.model_type, m.review_status FROM entries e JOIN entry_models m ON m.entry_id = e.id WHERE e.id = 'afasia-no-architecture-flower-house';"
```

Expected local baseline:

- Entries: 111
- Relations: 69
- Flower House sources: 3
- Flower House media: 4 imported MVP rows
- Flower House models: 6
- Flower House analysis layers: 7
- Afasia entries: 1

## R2 Cost Guardrail Policy

Do not upload copyrighted images or drawings until rights and source policy are clear.
For now, R2 is a preview bucket plus key structure target. D1 is the database;
R2 is future file storage for heavy assets. No public frontend upload path
exists.

```text
entries/{slug}/media/exterior-01.jpg
entries/{slug}/media/interior-01.jpg
entries/{slug}/media/section-01.jpg
entries/{slug}/media/plan-01.jpg
entries/{slug}/models/full.glb
entries/{slug}/models/structure.glb
entries/{slug}/analysis/structure.json
entries/{slug}/analysis/tectonics.json
entries/{slug}/sources/source-asset-01.json
```

## Website Connection

Do not add D1/R2 bindings to `wrangler.jsonc` yet. The frontend stays static and
the current Worker API reads only from `data/mock-entries.json`. D1/R2 runtime
reads or writes still require an explicit decision.

## Blender API Smoke Test

Run the live API contract check after publish:

```bash
npm run blender:smoke
```

It verifies:

- `/api/entries.json` returns an Entry array;
- `/api/search` returns `{ count, results }`;
- `/api/taxonomies.json` exposes taxonomy arrays;
- CORS allows local Blender/browser development;
- `assets.architekturkosmos.ch` DNS is visible.

Until the asset domain is activated, the asset-domain check is a warning. To
make it blocking:

```bash
npm run blender:smoke -- --strict-assets
```
