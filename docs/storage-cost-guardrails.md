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

`archive-inbox/` and `archive-intake/` are local-only and ignored by Git. The
capture workflow enforces a default local private storage budget of 10 GB across
those folders.

```bash
npm run archive:capture -- --input archive-inbox/villa-savoye --title "Villa Savoye"
```

The command creates only local output under `out/archive-captures/` and never
uploads assets.

## Local Disk Guardrail

Generated review files can grow quickly because `out/` contains reports,
previews and smoke-test artifacts, while `archive-intake/` contains local
private project packages. Use the local storage report before long automation
runs:

```bash
npm run storage:report
```

This writes:

- `out/local-storage/latest.json`
- `out/local-storage/latest.md`

The report is read-only and shows the largest ignored local folders. A cleanup
dry run is available:

```bash
npm run storage:cleanup:dry-run
```

Nothing is deleted in dry-run mode. Actual deletion requires both explicit flags:

```bash
npm run storage:cleanup:dry-run -- --apply --i-understand-local-delete
```

The cleanup tool only accepts these local generated roots: `archive-inbox/`,
`archive-intake/` and `out/`. It refuses arbitrary paths and keeps deletion out
of normal publish/build commands.

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

Local asset intake is also upload-free:

```bash
npm run archive:asset-manifest -- --entry villa-savoye
```

This command creates ignored local folders under `archive-intake/`, scans files,
checks file types, size and rights status, then writes a manifest under
`out/asset-manifests/`. It does not call Cloudflare and cannot create R2 cost.

## Future R2 Checklist

Before uploading real assets:

1. Keep the monthly budget alert active in Cloudflare.
2. Confirm current Cloudflare pricing and free limits in the dashboard.
3. Define allowed file types and maximum file sizes.
4. Keep copyrighted source images as external references until rights are clear.
5. Start with one pilot object only.
6. Generate and review a local asset manifest first.
7. Add lifecycle cleanup rules for test objects.
8. Keep all upload/write actions out of the public frontend.

## Alternative To R2

If avoiding object-storage billing entirely is more important than Cloudflare
integration, the first alternative is to keep real media outside the app and
store only source URLs, credits and review status in D1. This is enough for the
archive model and lets the public website stay fast, static and nearly free.
