# Kosmo Public Static Asset Signature Guard

Generated: 2026-07-22 13:20 CEST
Status: `passed`

## Summary

Fallback block because `kosmo:source-independent-work-queue` reported `0` Codex-executable tasks and `2` owner actions.

Hardened the public static asset surface guard so renamed source/archive/database artifacts are rejected by file signature, not only by extension. The guard now detects PDF, ZIP, gzip, 7z, RAR, SQLite and Office compound signatures in `out/`, reports `blocked_signature_assets`, and keeps `public_ready_after_check: 0`.

## Changed

- `scripts/public-static-asset-surface-check.mjs`
  - Added blocked binary signature detection for static export assets.
  - Added `blocked_signature_assets` summary/report field.
  - Added console output for blocked signatures.
- `scripts/public-static-asset-surface-negative-smoke.mjs`
  - Added synthetic renamed `.jpg`, `.js` and `.json` fixtures carrying blocked signatures.
  - Verified expected `blocked-signature` failures without reading private content.
- Regenerated `examples/kosmo-data/review/public-static-asset-surface-check.generated.*`.

## Checks

- `node --check scripts/public-static-asset-surface-check.mjs && node --check scripts/public-static-asset-surface-negative-smoke.mjs`: passed.
- `npm run public:static-asset-surface-negative-smoke`: passed.
- `npm run public:static-asset-surface-check`: passed, `317/317`, blocked signatures `0`.
- `npx eslint scripts/public-static-asset-surface-check.mjs scripts/public-static-asset-surface-negative-smoke.mjs`: passed.
- `npm run public:gate-check`: passed.
- `npm run public:vacation-safe-check -- --require-static-export`: passed, `35/35`.
- `npm run build`: passed, `124` static pages.
- Post-build `npm run public:static-asset-surface-check`: passed, blocked signatures `0`.
- Post-build `npm run public:gate-check`: passed.
- `npm run kosmo:source-independent-work-queue`: ready, Codex executable now `0`, public-ready `0`.
- `npm run kosmo:owner-unlock-pipeline-checkpoint`: attention required, guards `42/42`, public-ready `0`.

## Privacy

No private PDFs, scans, OCR text, OneDrive/archive raw content, private source-root contents, worker logs or worker outputs were read or copied. No private inventory, local worker content run, embeddings, fine-tunes, uploads or public-ready promotion.

## Exact Staging

Stage only:

- `scripts/public-static-asset-surface-check.mjs`
- `scripts/public-static-asset-surface-negative-smoke.mjs`
- `examples/kosmo-data/review/public-static-asset-surface-check.generated.json`
- `examples/kosmo-data/review/public-static-asset-surface-check.generated.md`
- `docs/codex/kosmo-public-static-asset-signature-guard-2026-07-22.md`
- `/mnt/data/ArchitekturKosmos/KosmoOrbit/_overseer/intake/inbox/2026-07-22-codex-public-static-asset-signature-guard.md`
- `/mnt/data/ArchitekturKosmos/09 Codex Memory/2026-07-22 Public Static Asset Signature Guard.md`

Do not stage unrelated dirty files, daemon-generated routine report churn, `.tmp/`, `out/`, or older unowned changes.
