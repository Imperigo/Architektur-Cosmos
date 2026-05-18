# Asset Intake Workflow

Architecture Cosmos keeps real media and model files out of Git until rights,
file sizes and upload policy are ready. The local intake workflow creates a
safe staging area and a dry-run manifest for each object.

## Local Folder

Drop raw source material into the local inbox:

```text
archive-inbox/{entry_slug}/
```

Then run the capture command:

```bash
npm run archive:capture -- --input archive-inbox/villa-savoye --title "Villa Savoye"
```

The command writes a local capture package to `out/archive-captures/{entry_slug}/`
and prepares the intake folders below.

Use one folder per entry slug:

```text
archive-intake/{entry_slug}/
  exterior/
  interior/
  section/
  plan/
  models/
```

`archive-intake/` is ignored by Git. It is for local files only.
`archive-inbox/` is also ignored by Git and is the drag-and-drop simulation for
the future host/admin intake area.

## Create Or Refresh A Manifest

```bash
npm run archive:asset-manifest -- --entry villa-savoye
```

The command creates missing folders and writes:

```text
out/asset-manifests/{entry_slug}.json
```

The manifest checks file type, size, copyright status and planned R2 keys. It
does not upload anything.

## Rights Gate

By default the command uses `needs_permission`, so discovered files are blocked
until rights are explicit:

```bash
npm run archive:asset-manifest -- --entry villa-savoye --copyright own_work
```

Allowed copyright statuses are:

- `needs_permission`
- `private_research`
- `licensed`
- `public_domain`
- `own_work`

Only `licensed`, `public_domain` and `own_work` can become dry-run ready.
`private_research` is allowed for local analysis/modeling but remains blocked
from public display and R2 upload.

## Accepted Preview Files

- Images: `.jpg`, `.jpeg`, `.png`, `.webp`
- Models: `.glb`, `.gltf`, `.usdz`, `.obj`, `.fbx`
- Preview file limit: 8 MB per file

## Upload Rule

This workflow is a manifest generator, not an uploader. Real R2 upload remains a
separate future step with a separate confirmation gate.
