# Public Demo Gate Static Asset Ref Guard

Generated: 2026-07-22T12:39:30+02:00
Status: `completed_public_safe`

## Scope

- Fallback lane: public gate hardening.
- Source-free: yes.
- Reads private content: no.
- Writes public-ready: no.
- Starts local workers: no.

## Change

- Extended `scripts/public-demo-gate-check.mjs` so the static export phase also checks HTML subresource references from `script`, `img`, `source`, `link`, `meta`, `video`, and `audio` tags.
- Added missing-target and leak checks for same-origin static assets.
- Added recursive CSS `url(...)` checks for referenced CSS assets.
- Added `checked_static_assets` to the public demo gate static export summary.
- Hardened `scripts/public-demo-gate-static-link-negative-smoke.mjs` with synthetic missing image, CSS content leak, and missing CSS font fixtures.

## Verification

- `npm run public:demo-gate-static-link-negative-smoke` passed.
- `npm run public:gate-check` passed; checked 30 static assets.
- `npx eslint scripts/public-demo-gate-check.mjs scripts/public-demo-gate-static-link-negative-smoke.mjs` passed.
- `npm run lint` still fails on pre-existing `kosmo-orbit/packages/kosmo-contracts` `no-redeclare` errors; unrelated to this change.

## Next Safe Step

- Keep public gate fallback lane active while source-root remains blocked.
- A future block can reuse the asset-ref helpers in `public-static-link-check.mjs` to reduce duplication, but this block avoided broader refactor churn.
