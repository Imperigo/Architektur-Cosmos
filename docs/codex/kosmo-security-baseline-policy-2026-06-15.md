# Kosmo Security Baseline Policy

Generated: 2026-06-15T13:05:38.703Z
Status: `security_baseline_policy_ready`

## Summary

- Categories: 5
- Initial rules: 6
- Suppresses findings now: false
- Secrets never allowed: true
- Public-ready after policy: 0

## Categories

- `must_redact`: Identifiers or paths that would leak private owner, device, source-root or account information in public artifacts.
- `private_repo_allowed`: Identifiers that are acceptable only because the repository is private and the artifact is operationally local.
- `generated_review_allowed`: Generated review examples that quote local roles or worker names and are not public export inputs.
- `script_context_allowed`: Scripts that contain local context strings needed for detection, but not secrets.
- `secret_never_allowed`: API keys, tokens, private keys and credentials.

## Initial Rules

| Rule | Category | Globs |
| --- | --- | --- |
| `source_root_artifacts` | private_repo_allowed | `data/kosmo-source-root-*`<br>`docs/codex/kosmo-source-root-*`<br>`examples/kosmo-references/provenance/source-root-*` |
| `onedrive_sync_artifacts` | private_repo_allowed | `data/kosmo-onedrive-sync-error-summary-*`<br>`docs/codex/kosmo-onedrive-sync-error-summary-*` |
| `owner_review_artifacts` | private_repo_allowed | `data/kosmo-owner-*`<br>`docs/codex/kosmo-owner-*` |
| `private_library_diagnostics` | private_repo_allowed | `data/kosmoreferences-private-library-*`<br>`docs/codex/kosmoreferences-private-library-*` |
| `generated_orbit_reviews` | generated_review_allowed | `examples/kosmo-orbit/review/*` |
| `local_context_scripts` | script_context_allowed | `scripts/kosmo-source-root-locator.mjs`<br>`scripts/kosmo-storage-mount-snapshot.mjs`<br>`scripts/kosmo-private-library-diagnostic.mjs`<br>`scripts/kosmo-onedrive-sync-error-summary.mjs` |

## Implementation Contract

- Baseline must be explicit data, not hard-coded broad regex weakening.
- Baseline can suppress only personal identifier findings, never secret patterns.
- Every suppressed finding must retain count and category in the report.
- Public export workflows must keep failing on must_redact and secret_never_allowed.
- New paths are not auto-allowed; they require a baseline rule update.

## Next Actions

- Create config/kosmo-security-baseline.json from this policy.
- Patch scripts/security-check.mjs to load the baseline and report suppressed counts.
- Run npm run security:check and verify secrets still hard-fail.
- Only after that rerun npm run quality:check.
