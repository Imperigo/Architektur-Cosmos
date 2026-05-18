# Cloudflare Archive Preview Runbook

This runbook prepares the first D1/R2 test archive for Architecture Cosmos.
It does not connect the live website to the database.

## Current Status

- The website remains a static export.
- D1/R2 are preview infrastructure only.
- No API routes, auth, CMS, backend writes, or runtime reads are added.
- Wrangler currently needs a `CLOUDFLARE_API_TOKEN` in non-interactive Codex runs.

## Local Checks

Run these before touching Cloudflare:

```bash
npm run archive:validate
npm run archive:export
npm run archive:smoke
npm run archive:r2-manifest
```

Generated files:

- `out/archive-d1-import.sql`
- `out/archive-r2-manifest.json`

Both are generated output and are not committed.

## Recommended Preview Names

- D1 database: `architecture-cosmos-preview`
- R2 bucket: `architecture-cosmos-assets-preview`

## Remote Setup Commands

Only run these after Cloudflare authentication is available:

```bash
export CLOUDFLARE_API_TOKEN="..."

npm run archive:cloudflare-preview
```

The command above validates the local archive, exports SQL/R2 manifests, creates
the preview D1 database and R2 bucket when missing, imports the schema/data, and
runs smoke queries.

Manual equivalent:

```bash
export CLOUDFLARE_API_TOKEN="..."

npx wrangler d1 create architecture-cosmos-preview
npx wrangler r2 bucket create architecture-cosmos-assets-preview

npm run archive:export
npm run archive:r2-manifest

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
- Flower House media: 4 imported MVP rows
- Flower House models: 6
- Flower House analysis layers: 7

## R2 Preview Policy

Do not upload copyrighted images or drawings until rights and source policy are clear.
For now, R2 is only a key structure target:

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

Do not add D1/R2 bindings to `wrangler.jsonc` yet. The frontend stays static
until there is an explicit decision to add Worker endpoints or migrate to
OpenNext.
