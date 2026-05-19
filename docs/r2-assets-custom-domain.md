# R2 Assets Custom Domain Setup

This runbook connects the future public asset host for Blender and web clients.
It is intentionally limited to DNS/domain activation and verification. It does
not upload files and does not connect user uploads.

## Target

- Public asset domain: `https://assets.architekturkosmos.ch`
- Production R2 bucket: `cosmos-assets`
- Preview/local planning bucket: `architecture-cosmos-assets-preview`

Public key contract:

```text
models/{entry_id}/{full|structure|facade|interior|site}.glb
models/{entry_id}/materials/{material_tag}.glb
images/{entry_id}/{hero|gallery_N}.webp
images/{entry_id}/{hero|gallery_N}@1200.webp
images/{entry_id}/{hero|gallery_N}@600.webp
```

## Preconditions

1. Cloudflare zone `architekturkosmos.ch` is active.
2. R2 is enabled on the Cloudflare account.
3. Budget alert is active.
4. No public upload route exists in the website.
5. No R2 credentials are exposed in frontend code.

## Dashboard Steps

1. Open Cloudflare Dashboard.
2. Go to **R2 Object Storage**.
3. Create bucket `cosmos-assets` if it does not exist.
4. Open the bucket.
5. Go to **Settings** or **Custom Domains**.
6. Connect custom domain `assets.architekturkosmos.ch`.
7. Let Cloudflare create the DNS record automatically if offered.
8. Keep public access limited to approved asset serving. Do not add browser
   upload credentials or public write access.

If Cloudflare asks for a zone, choose `architekturkosmos.ch`.

## Local Verification

Run:

```bash
npm run blender:smoke
```

Before the domain is active, this may pass with a warning:

```text
Asset domain is not resolving yet: assets.architekturkosmos.ch
```

After activation, require the asset domain to resolve:

```bash
npm run assets:check
```

`assets:check` is the strict version of the Blender smoke test. It fails if
`assets.architekturkosmos.ch` does not resolve.

## Dry-Run A Planned Asset Key

Example:

```bash
npm run archive:r2-dry-run -- \
  --entry villa-savoye \
  --file public/archive-media/villa-savoye/exterior/savoye-3-exterior-cc0.jpg \
  --type hero \
  --copyright public_domain \
  --public-layout
```

Expected planned key:

```text
images/villa-savoye/hero.webp
```

This command is still a dry run only. It does not upload the file.

## Upload Rule

Actual R2 uploads remain blocked until a separate explicit upload command exists
with these checks:

1. rights status is `own_work`, `licensed` or `public_domain`;
2. file size is within policy;
3. entry exists in the archive;
4. key matches this public asset contract;
5. command is explicitly confirmed by the maintainer.

Anything marked `needs_permission`, `private_research` or unclear must remain
local or link-only.
