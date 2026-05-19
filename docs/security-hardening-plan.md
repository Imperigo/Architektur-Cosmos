# Architecture Cosmos Security Hardening Plan

This document defines the security direction for the public atlas, private
archive intake, future user libraries, D1 metadata, and R2 media/model storage.

## Immediate Posture

- Public website stays static by default.
- No private files, personal contact data, account-specific preview URLs, local
  inboxes, raw books, or copyrighted private research assets are committed.
- Local-only folders stay ignored: `archive-inbox/`, `archive-intake/`, and
  generated previews in `out/`.
- The browser receives restrictive headers via `public/_headers`.
- Public assets are shown only when rights status is allowed by policy.

## Cloudflare Edge Protection

Configure these in the Cloudflare dashboard for `architekturkosmos.ch`:

1. Enable WAF managed rules for common OWASP attacks.
2. Enable bot protection or Bot Fight Mode where available.
3. Add rate limiting for future write/intake endpoints.
4. Put admin/private intake routes behind Cloudflare Access.
5. Add Turnstile to any public upload, login, or submission form.
6. Keep D1/R2 write credentials out of the browser. Browser uploads must use
   short-lived signed upload URLs from a protected Worker.

## Dashboard Checklist

Use this order when hardening the live Cloudflare project:

1. **DNS / SSL**: keep SSL mode at Full or stricter and verify HTTPS-only access.
2. **WAF**: enable Cloudflare Managed Rules and OWASP Core Rules for the zone.
3. **Bot protection**: enable the lowest-friction bot protection available on the plan.
4. **Rate limits**: add conservative limits for future `/api/*`, upload and auth routes before they exist publicly.
5. **Turnstile**: prepare a site key for future public forms; do not wire it into static mock forms yet.
6. **Access**: protect future admin/private routes with Cloudflare Access or a managed auth provider.
7. **Logs**: review firewall/security events after each deploy and before adding upload functionality.

## Future Private Archive Security Model

Public user uploads and private maintainer research need different lanes:

- `public_candidate`: safe metadata can be reviewed for public publication.
- `private_research`: private/local or access-controlled material only.
- `quarantine`: newly uploaded files before malware, MIME, size, and rights
  checks finish.
- `rejected`: unsafe, unclear, or prohibited material.

Uploads should never go directly into public buckets. The intended flow is:

1. Authenticated user uploads to quarantine.
2. Worker validates file size, MIME type, extension, checksum, and rate limit.
3. Virus/malware scan job runs before promotion.
4. Rights classifier marks `own_work`, `licensed`, `public_domain`,
   `linked_reference_only`, or `private_research`.
5. Only explicitly approved public derivatives become visible on the site.

## Pentest Scope

Allowed safe checks for routine development:

- Secret scanning with `rg`.
- Dependency audit with `npm audit`.
- Local security baseline with `npm run security:check`.
- Static build verification.
- Header verification on the exported/static deployment.
- UI tests against local dev and the live domain.
- Non-destructive manual checks for upload forms, panels, and links.

Do not run aggressive automated attacks, fuzzers, credential attacks, or high
volume scanners against Cloudflare or third-party sites without a written test
window and scope.

## Security Backlog

- Add a private admin route protected by Cloudflare Access before real uploads.
- Add signed upload URL Worker for R2 instead of direct browser credentials.
- Add file scanning pipeline before any asset becomes public.
- Add append-only moderation log for approval decisions.
- Add CSP report-only endpoint once a Worker runtime exists.
- Add dependency update automation with human approval.
- Add periodic passive security report for headers, dependencies, and exposed
  public files.

## References

- Cloudflare WAF and rate limiting rules:
  <https://developers.cloudflare.com/waf/> and
  <https://developers.cloudflare.com/waf/rate-limiting-rules/>
- Cloudflare Turnstile:
  <https://developers.cloudflare.com/turnstile/>
- OWASP File Upload Cheat Sheet:
  <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>
- OWASP Web Security Testing Guide:
  <https://owasp.org/www-project-web-security-testing-guide/>
