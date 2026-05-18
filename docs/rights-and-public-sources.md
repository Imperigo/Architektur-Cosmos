# Rights Gate and Public Source Strategy

Architecture Cosmos should capture knowledge even when visual publication is not
allowed. The database may store source metadata, links, notes and analysis tasks
while the public website only renders media that has a clear display status.

## Rights Gate Rule

Public display is allowed only for:

- `own_work`
- `public_domain`
- `licensed`

Everything else becomes:

- `link_only`: show title, source URL, bibliographic note and metadata;
- `private_research`: local-only source/model/analysis material for Andrin's
  private pipeline; never public display, never R2 upload;
- `private_review`: keep local/private until reviewed;
- `blocked_upload`: never upload or render publicly.

Watermarks, credits or “via” links do not replace a license. Credits are still
required for licensed files, but they are not permission by themselves.

## Local Command

```bash
npm run archive:rights-gate -- --entry villa-savoye
```

This reads the local capture package and writes:

```text
out/archive-rights/{slug}/rights-report.json
out/archive-rights/{slug}/rights-report.md
```

The report is also run by:

```bash
npm run archive:autopilot -- --input archive-inbox/{slug} --title "Project Title"
```

## Source Tiers

### Best for Public Display

- Own photographs, drawings, scans and videos.
- Institution media explicitly marked public domain or reusable.
- Wikimedia Commons files with clear file-level license.
- CC0, public domain, CC BY and CC BY-SA files, with attribution retained.

### Good for Sources, Links and Verification

- Official building pages and foundation pages.
- Museum, archive and university pages.
- Afasia, architecture magazines and publisher pages.
- Book records, catalog entries and library references.

These are excellent for source trails and factual verification, but their media
should stay link-only unless a file-level reusable license is clear.

### Private Review Only

- Book scans.
- Magazine scans.
- Plans from protected publications.
- Photographer images without explicit reuse license.
- Screenshots from websites.

## Useful Public/Reusable Source Families

- Wikimedia Commons: file-level license metadata.
- Europeana: cultural heritage records with explicit rights statements.
- Library of Congress: historic photos, maps and drawings with rights advisory.
- Rijksmuseum: open cultural images and metadata where marked reusable.
- Internet Archive / Open Library: source trail and research references; public
  display only when the item rights are clear.
- Official public-domain government or archive collections.

## Architecture Cosmos Policy

1. Always create the entry if source metadata exists.
2. Do not block the knowledge graph because images are restricted.
3. Use placeholders or own diagrammatic reconstructions for the public UI.
4. Store links to restricted sources instead of republishing their files.
5. Use own/licensed video frames for Gaussian splats.
6. Keep AI analysis separate from media rights: an analysis note can be public
   even when the source image remains link-only, provided it is written in our
   own words and does not reproduce protected material.

## Private Research Mode

`private_research` is for Andrin's local archive and design pipeline. It is meant
for material such as book scans, Afasia/source screenshots, protected plans or
private research PDFs that should help with analysis, model generation and
Blender/ArchiCAD experimentation.

Rules:

- keep files only in `archive-inbox/` or `archive-intake/`;
- never commit private files to GitHub;
- never upload them to R2;
- never render them on the public website;
- allow derived private analysis/modeling notes locally;
- publish only own-written summaries, public links, rights-clean assets or own
  diagrammatic reconstructions.

A frontend "key" inside a static export is not secure. A real private cloud mode
must later use server-side authentication, for example Cloudflare Access, signed
URLs and private R2 buckets. Until then, `private_research` is local-only.
