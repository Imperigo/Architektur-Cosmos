# Security Policy

Architecture Cosmos is a static public atlas with planned private archive and
upload features. Security issues should be reported privately before public
discussion.

## Reporting A Vulnerability

Use GitHub private vulnerability reporting / security advisories for this
repository:

<https://github.com/Imperigo/Architektur-Cosmos/security/advisories/new>

Do not open a public issue for exploitable vulnerabilities, leaked secrets,
private archive exposure, upload bypasses, authentication bypasses, or data
access bugs.

## Current Runtime

- Public site: static export on Cloudflare.
- No public write API is active.
- D1/R2 archive layers are prepared, but the public frontend should not expose
  write credentials or direct storage access.

## Security Priorities

- Keep personal/contact details out of the public repository.
- Keep secrets out of Git and browser bundles.
- Keep private research files out of `public/` and out of commits.
- Put future uploads behind authentication, rate limits, malware scanning,
  rights review, and quarantined storage.
- Publish only rights-cleared assets.
