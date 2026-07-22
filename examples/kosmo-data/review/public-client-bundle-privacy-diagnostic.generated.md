# Public Client Bundle Privacy Diagnostic

Generated: 2026-07-22T11:34:38.324Z
Status: `public_client_bundle_privacy_diagnostic_clean`

Report-only scan of exported Next client JavaScript bundles for existing public leak patterns. Findings are pointers only: no bundle excerpts are written, no server is started and public-ready remains 0.

## Summary

- bundles: 30/30 clean
- bundles needing review: 0
- findings: 0
- matched patterns: 0
- truncated bundles: 0
- public-ready after check: 0

## Pattern Counts

- none

## Bundles

| Path | Status | Findings | Bytes |
| --- | --- | ---: | ---: |
| `/_next/static/chunks/239-e0a193b742b70f85.js` | `clean` | 0 | 11881 |
| `/_next/static/chunks/255-81ba70bd132d3eed.js` | `clean` | 0 | 173668 |
| `/_next/static/chunks/350.9c22f9fe6b6449aa.js` | `clean` | 0 | 43949 |
| `/_next/static/chunks/498-77af2bee97164c42.js` | `clean` | 0 | 274629 |
| `/_next/static/chunks/4bd1b696-c023c6e3521b1417.js` | `clean` | 0 | 173019 |
| `/_next/static/chunks/718-5901e6b9ef570c12.js` | `clean` | 0 | 18187 |
| `/_next/static/chunks/788-9fe45e9660c39033.js` | `clean` | 0 | 14633 |
| `/_next/static/chunks/833.67f862e4aad65810.js` | `clean` | 0 | 19844 |
| `/_next/static/chunks/app/_not-found/page-2ead2863c038fbf3.js` | `clean` | 0 | 2670 |
| `/_next/static/chunks/app/archive/page-dd748a2bd79edbfd.js` | `clean` | 0 | 4327 |
| `/_next/static/chunks/app/assets/page-d47269634682fef6.js` | `clean` | 0 | 16563 |
| `/_next/static/chunks/app/atlas/[slug]/page-73f190fe383631ac.js` | `clean` | 0 | 2209 |
| `/_next/static/chunks/app/atlas/page-e1f6d3511910c3b9.js` | `clean` | 0 | 225 |
| `/_next/static/chunks/app/layout-1a70f3f6b416166d.js` | `clean` | 0 | 255 |
| `/_next/static/chunks/app/orbit/page-37d88375725e534d.js` | `clean` | 0 | 2213 |
| `/_next/static/chunks/app/page-1c414034f057a349.js` | `clean` | 0 | 2938 |
| `/_next/static/chunks/app/references/page-3946f5a5c16f4889.js` | `clean` | 0 | 16051 |
| `/_next/static/chunks/app/robots.txt/route-068ba3586843ea10.js` | `clean` | 0 | 135 |
| `/_next/static/chunks/app/sitemap.xml/route-068ba3586843ea10.js` | `clean` | 0 | 135 |
| `/_next/static/chunks/b536a0f1.171f5a420d0144e4.js` | `clean` | 0 | 358997 |
| `/_next/static/chunks/bd904a5c.9c0670f6b114bcd8.js` | `clean` | 0 | 381905 |
| `/_next/static/chunks/framework-1570c2e8a0b531a3.js` | `clean` | 0 | 189765 |
| `/_next/static/chunks/main-app-4f7ed41d8108a811.js` | `clean` | 0 | 557 |
| `/_next/static/chunks/main-c49243c272ca0850.js` | `clean` | 0 | 128286 |
| `/_next/static/chunks/pages/_app-7d307437aca18ad4.js` | `clean` | 0 | 234 |
| `/_next/static/chunks/pages/_error-cb2a52f75f2162e2.js` | `clean` | 0 | 218 |
| `/_next/static/chunks/polyfills-42372ed130431b0a.js` | `clean` | 0 | 112594 |
| `/_next/static/chunks/webpack-94b40ae1aec43a3f.js` | `clean` | 0 | 3579 |
| `/_next/static/yDZvJzOo0d_DVTwgysXxq/_buildManifest.js` | `clean` | 0 | 857 |
| `/_next/static/yDZvJzOo0d_DVTwgysXxq/_ssgManifest.js` | `clean` | 0 | 105 |

## Follow Up

- Use this report as a review-only pointer for client-bundle cleanup.
- Do not promote this diagnostic to a hard public gate until known public false positives are classified.
- Prefer moving review-only constants out of client components or replacing them with explicit public-safe summaries.
