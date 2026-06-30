# Public Route Link Smoke

Generated: 2026-06-30T16:36:45.782Z
Status: `public_route_link_smoke_passed`
Base URL: `http://127.0.0.1:3211`
Public display allowed: `false`

Checks the manifest-derived public HTML routes for core navigation links, private/source leak patterns in rendered pages and hrefs, and HTTP 2xx responses for discovered internal targets.

## Summary

- seed routes: 8
- checked internal targets: 112
- skipped external links: 11
- failed findings: 0

## Seed Routes

| Route | Status | Anchors | Core links | Private patterns |
| --- | --- | ---: | ---: | ---: |
| `/` | 200 | 14 | 5/5 | 0 |
| `/orbit/` | 200 | 15 | 5/5 | 0 |
| `/atlas/` | 200 | 11 | 5/5 | 0 |
| `/archive/` | 200 | 143 | 5/5 | 0 |
| `/references/` | 200 | 23 | 5/5 | 0 |
| `/assets/` | 200 | 59 | 5/5 | 0 |
| `/atlas/villa-savoye/` | 200 | 28 | 5/5 | 0 |
| `/atlas/alterszentrum-kloster-ingenbohl/` | 200 | 18 | 5/5 | 0 |
