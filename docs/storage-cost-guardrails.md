# Storage Cost Guardrails

Architecture Cosmos separates the archive into a database layer and an asset
layer. This keeps the project cheap while the schema, sources, copyright policy
and 3D-model workflow are still being designed.

## Current Decision

- **Use D1 now** for the real structured archive preview.
- **R2 preview bucket is enabled** for future asset workflow testing.
- **Do not upload production assets yet.**
- **Generate a local R2 manifest** so future file keys are planned before any
  upload workflow exists.

## Why D1 Is Enough Now

D1 stores the knowledge graph:

- entries
- dates, authors, places, style sectors and entry types
- source rows and reliability notes
- media metadata
- 3D model metadata
- analysis layer metadata
- tags and filter classifications
- relations between entries

This is enough to design the archive and test queries. The frontend still ships
as static JSON, so D1 is currently a validation and migration target rather than
a live dependency.

## What R2 Will Store Later

R2 is only for heavy files:

- exterior/interior images
- plans, sections and diagrams
- PDFs and source scans
- GLB/USDZ/OBJ model files
- deep-zoom image tiles
- larger generated analysis JSON files

The database should store only URLs, keys, rights status, captions and metadata.
It should never store heavy binary assets.

## Repository Guardrail

The Cloudflare preview script still skips R2 by default. R2 bucket creation
requires both:

```bash
export ARCHITECTURE_COSMOS_ENABLE_R2=1
npm run archive:d1-preview -- --with-r2 --i-understand-r2-costs
```

If either the environment variable or explicit flag is missing, the script exits
before creating a bucket.

The current preview bucket is:

```text
architecture-cosmos-assets-preview
```

Status checks are read-only:

```bash
npm run archive:r2-status
```

## Future R2 Checklist

Before uploading real assets:

1. Keep the monthly budget alert active in Cloudflare.
2. Confirm current Cloudflare pricing and free limits in the dashboard.
3. Define allowed file types and maximum file sizes.
4. Keep copyrighted source images as external references until rights are clear.
5. Start with one pilot object only.
6. Add lifecycle cleanup rules for test objects.
7. Keep all upload/write actions out of the public frontend.

## Alternative To R2

If avoiding object-storage billing entirely is more important than Cloudflare
integration, the first alternative is to keep real media outside the app and
store only source URLs, credits and review status in D1. This is enough for the
archive model and lets the public website stay fast, static and nearly free.
