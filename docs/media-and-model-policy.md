# Media And Model Policy

This policy defines how Architecture Cosmos should handle images, drawings,
plans, source files and generated 3D models before any public upload workflow is
implemented.

## Core Principle

D1 stores knowledge and metadata. R2 stores heavy files only after rights,
file-size limits and review status are clear.

The public website must not upload files. Upload/import remains a local or admin
workflow until an explicit backend decision is made.

## Required Media Slots

Every mature building entry should aim for four visible study slots:

| Slot | Purpose | Accepted formats | Initial status |
|---|---|---|---|
| `exterior` | Object in context, facade, landscape relation | jpg, webp, png | `needs_permission` or `own_work` |
| `interior` | Spatial atmosphere, structure, material reading | jpg, webp, png | `needs_permission` or `own_work` |
| `section` | Spatial/tectonic cut | jpg, png, webp, pdf, svg | `needs_permission`, `licensed`, `public_domain` or `own_work` |
| `plan` | Organization, geometry, circulation | jpg, png, webp, pdf, svg | `needs_permission`, `licensed`, `public_domain` or `own_work` |

Other entry types may reuse the slots as placeholders until custom media schemas
exist. Example: a text entry can use `exterior` for cover/source image and
`plan` for diagrammatic page structure.

## File Size Targets

Preview targets before upload:

- Images: max 2400 px on longest side for normal web display.
- Thumbnails: max 800 px on longest side.
- PDFs/source scans: no upload until rights and citation policy are clear.
- GLB preview models: target below 8 MB for atlas preview.
- Full/source models: no public serving until a separate review and compression
  pass exists.

## Copyright And Source Status

Use conservative status labels:

- `placeholder`: no real file yet.
- `needs_permission`: source exists but rights are not cleared.
- `licensed`: explicit permission or license exists.
- `public_domain`: verified public-domain source.
- `own_work`: created by the maintainer or Architecture Cosmos.

For now, Afasia and office images should remain source references unless rights
are explicitly cleared. R2 keys may be planned, but the actual files should not
be uploaded as public assets.

## R2 Key Pattern

Use stable, predictable keys:

```text
entries/{entry_slug}/media/exterior-01.jpg
entries/{entry_slug}/media/interior-01.jpg
entries/{entry_slug}/media/section-01.jpg
entries/{entry_slug}/media/plan-01.jpg
entries/{entry_slug}/models/low.glb
entries/{entry_slug}/models/full.glb
entries/{entry_slug}/models/structure.glb
entries/{entry_slug}/models/tectonic.glb
entries/{entry_slug}/analysis/structure.json
entries/{entry_slug}/analysis/tectonics.json
entries/{entry_slug}/sources/source-notes.json
```

The key can exist in D1 before the file exists in R2. This lets the archive plan
its structure without creating storage cost or copyright risk.

## 3D Model Layers

Each mature object should be able to grow toward:

- `mass_model`: simplified volume, fastest preview.
- `low_poly_model`: lightweight web model.
- `full_model`: best available full reconstruction.
- `structure_model`: load-bearing system.
- `tectonic_model`: layers, joints, material assembly.
- `site_model`: terrain, urban fabric, landscape context.

Every model row needs:

- source basis
- generation method
- review status
- confidence score when approximate
- R2 key, even if no file is uploaded yet

## Upload Gate

First capture the local source package:

```bash
npm run archive:capture -- --input archive-inbox/villa-savoye --title "Villa Savoye"
```

Before an upload is even considered, generate a local intake manifest:

```bash
npm run archive:asset-manifest -- --entry villa-savoye
```

This creates `archive-intake/{entry_slug}/` folders and writes a dry-run manifest
to `out/asset-manifests/{entry_slug}.json`. The command never uploads files.

Before any actual R2 upload:

1. Confirm budget alert is active.
2. Confirm the local intake manifest exists.
3. Confirm file has an allowed copyright status.
4. Confirm file size is inside the target.
5. Confirm the D1 row already exists.
6. Confirm the R2 key matches the policy.
7. Upload one pilot object first.
8. Re-run archive validation and smoke tests.

Until these checks are automated, uploads stay manual and rare.
