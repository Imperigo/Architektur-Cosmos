# Public Worker Boundary Check

Generated: 2026-07-22T07:41:13.742Z
Status: `public_worker_boundary_check_passed`

Checks the Cloudflare Worker deploy boundary for static-assets mode, read-only API routes and forbidden live bindings without starting a server or reading private content.

## Policy

- source_free: true
- reads_private_content: false
- writes_public_ready: false
- starts_server: false
- static_assets_worker: true
- api_read_only: true

## Summary

- allowed API routes: 7
- findings: 0
- public-ready after check: 0
