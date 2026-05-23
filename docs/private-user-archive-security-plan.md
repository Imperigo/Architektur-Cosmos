# Private User Archive And Moderated Public Publishing

This document defines the next Architecture Cosmos product layer: every signed-in
user can create a private project archive from uploaded sources, while only
reviewed and rights-safe entries can become public.

## Goal

Architecture Cosmos should support three archive scopes:

1. **Public Atlas**: curated public entries visible to everyone.
2. **User Private Library**: each authenticated user has private entries,
   private uploads and private generated drafts. These are never visible to
   other users by default.
3. **Maintainer Review Queue**: user entries can be submitted for automated and
   human review. Approved entries can become public, but only with rights-safe
   text, metadata and public-display assets.

This is not possible as a static-only frontend. It requires a real backend
surface, authentication, private storage and moderation workflow.

## Product Flow

### User Private Flow

1. User signs in.
2. User opens `Database / My Library`.
3. User uploads PDFs, images, plans, links, notes or models.
4. Upload goes to quarantine/private storage, not public storage.
5. Backend creates a private `user_entry_draft`.
6. AI extraction proposes:
   - title, architect, year, place;
   - themes and filters;
   - source candidates;
   - media slots;
   - rights status;
   - material, structure and tectonic analysis hypotheses.
7. User can view the private entry in their own wormhole/library.
8. User can submit the entry for public review.

### Private Book Library Flow

The private library should also support complete book/chapter intake:

1. User uploads book scans, phone photos or book PDFs.
2. Raw files stay in private quarantine.
3. The system creates cleaned private page images and OCR/layout metadata.
4. Detected projects become private project drafts with page references.
5. The user can keep these drafts private, merge them with existing private
   entries or submit a public-safe version for review.

This flow is described in
[`docs/book-library-ingestion.md`](./book-library-ingestion.md). It must never
promote copyrighted page images, OCR extracts or plan reproductions to the
public Atlas without rights approval.

### Review Flow

1. Submitted entry enters `review_pending`.
2. Automated checks run:
   - source reliability;
   - duplicate detection;
   - metadata completeness;
   - copyright/risk classification;
   - file safety and malware scan status;
   - public-display eligibility.
3. Maintainer/admin reviews the generated public version.
4. Public version strips or blocks unsafe copyrighted media.
5. Approved public entry moves into the public Atlas.

## Recommended Cloudflare Architecture

### Authentication

Use a managed identity provider first. Do not build custom password auth in V1.

Good low-cost candidates:

- Clerk, Auth0, Supabase Auth, Firebase Auth, or Cloudflare Access for private
  admin-only sections.
- For public user accounts, prefer OIDC/OAuth-based sign-in with verified email.

Required auth rules:

- random internal user IDs, not guessable sequential IDs;
- email verification;
- session validation on every write endpoint;
- separate admin role for review queue;
- never expose D1/R2 credentials to frontend code;
- all authenticated pages over HTTPS only.

### API Layer

Static export cannot write to D1/R2 directly. Add a Worker API:

- `POST /api/private/uploads/presign`
- `POST /api/private/uploads/complete`
- `POST /api/private/entries/draft`
- `GET /api/private/entries`
- `GET /api/private/entries/:id`
- `POST /api/private/entries/:id/submit-review`
- `GET /api/admin/review-queue`
- `POST /api/admin/review/:id/approve`
- `POST /api/admin/review/:id/reject`

The static frontend can remain fast, but all writes go through this Worker.

### Storage

Use separate storage areas:

- `R2 private quarantine`: raw user uploads, private, not public.
- `R2 private processed`: sanitized derivatives and private generated models.
- `R2 public approved`: only approved public assets.
- `D1`: metadata, ownership, rights status, review status and relations.

Do not put raw user uploads into public buckets.

### Presigned Uploads

The Worker creates short-lived presigned PUT URLs for R2 uploads. The browser
uploads directly to R2, but only after auth and quota checks.

Rules:

- URL expires quickly, e.g. 5-15 minutes;
- single object key only;
- object key includes user ID and random UUID;
- file size and MIME type are checked before presigning;
- upload is finalized only after the Worker verifies the object exists.

## Security Model

### Upload Security

Every upload must pass defense-in-depth checks:

- allowlist extensions only;
- do not trust `Content-Type`;
- validate magic bytes/file signatures;
- rename files to server-generated UUID keys;
- enforce filename length and safe metadata;
- enforce per-file and per-user storage limits;
- reject archives or process them only in a safe sandbox;
- quarantine all raw uploads;
- malware scan where available;
- CDR/sanitization for PDFs and office files where available;
- never execute uploaded files;
- never render uploaded SVG/HTML directly in the public site.

### User Isolation

Every query must enforce ownership:

- `user_id` on every private entry, asset, source, draft and model row;
- no private object lookup by slug alone;
- all private URLs are time-limited signed URLs;
- public pages read only approved public records;
- admin review endpoints require admin role, not just login.

### Moderation And Rights Gate

Public publishing requires:

- `review_status = approved`;
- `rights_status` allows public display;
- source citations attached;
- no private/copyrighted raw assets in public output;
- public text generated as summary/analysis, not copied source text;
- public media either `own_work`, `licensed`, `public_domain` or blocked.

### Abuse Controls

Add:

- rate limits per user/IP;
- daily upload quotas;
- total private storage budget per user;
- file count limits per draft;
- content moderation logs;
- suspicious upload blocking;
- admin audit trail.

## Database Additions

Suggested new D1 tables:

```text
users
user_profiles
user_entries
user_entry_sources
user_entry_assets
user_entry_models
user_entry_analysis
user_entry_tags
review_submissions
review_events
upload_jobs
security_events
```

Important fields:

```text
owner_user_id
visibility: private | submitted | public
review_status: draft | queued | automated_pass | needs_human_review | approved | rejected
rights_status: unknown | private_research | needs_permission | licensed | public_domain | own_work
scan_status: pending | clean | suspicious | blocked
public_display_allowed
r2_bucket_scope: quarantine | private_processed | public_approved
r2_key
created_at
updated_at
```

## AI Pipeline

V1 should be asynchronous:

1. Upload complete creates `upload_job`.
2. Worker queues job.
3. Pipeline extracts text/images/metadata.
4. AI proposes structured JSON.
5. Rights classifier marks public/private risk.
6. User reviews private draft.
7. Submission triggers automated public-review package.

Do not run heavy AI or 3D generation synchronously in the request/response path.

## Frontend UX

Public website:

- `Database` becomes `My Library` when logged in.
- Logged-out users see “Sign in to create private archive”.
- Logged-in users see:
  - upload/drop area;
  - private drafts;
  - private wormhole entries;
  - submit-for-review button;
  - review status.

Maintainer/admin:

- separate `Review Queue`;
- side-by-side private source summary and proposed public entry;
- approve/reject/edit controls;
- rights warnings and blocked asset list.

## Implementation Phases

### Phase 0: Admin-Only Access Prototype

- Use Cloudflare Access or an equivalent managed access layer for maintainer-only
  routes before opening public user accounts.
- Keep public users on the static atlas while the private draft/review model is
  proven.
- Do not add browser uploads until quarantine, limits, rights checks and signed
  upload URLs are ready.

### Phase 1: Private Archive Spec

- Finalize D1 schema for user/private/review tables.
- Add Worker API design.
- Choose auth provider.
- Build UI-only `My Library` prototype.

### Phase 2: Auth And Private Drafts

- Add auth.
- Create private D1 records.
- No file uploads yet.
- Users can create private text/link drafts.

### Phase 3: Secure Uploads

- Add presigned R2 upload flow.
- Quarantine raw uploads.
- Store metadata only after finalize.
- Add size/type/quota/rate limits.

### Phase 4: Automated Review

- Add extraction/classification pipeline.
- Add scan status and rights status.
- Build maintainer review dashboard.

### Phase 5: Public Publishing

- Approved public entry writes to public table.
- Public Atlas reads public entries.
- Unsafe assets remain private/blocked.

## Hard Rules

- No public frontend writes directly to D1/R2.
- No user-uploaded file is public by default.
- No raw SVG/HTML/PDF is rendered directly without sanitization/review.
- No copyrighted media is public unless rights status permits it.
- No admin controls in normal user routes.
- No “frontend secret key”; browser secrets are not secrets.

## References

- OWASP File Upload Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Multifactor Authentication Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
- Cloudflare R2 Presigned URLs:
  https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Cloudflare R2 upload objects / Workers presigned PUT:
  https://developers.cloudflare.com/r2/objects/multipart-objects/
