# KosmoReferences Owner Review Decision Check

Datum: 2026-06-13

Codex hat das Owner-Review Decision Pack maschinell pruefbar gemacht:

```bash
npm run kosmo:owner-review-decision-check -- \
  --pack examples/kosmo-references/provenance/owner-review-decision-pack-2026-06-13.json \
  --out examples/kosmo-references/provenance/owner-review-decision-pack-2026-06-13-review
```

## Ergebnis

- Status: `passed`
- Decision groups: 4
- Decision items: 10
- Public-ready now: 0
- Confirm commands after review: 2
- Failures: 0
- Warnings: 0

## Gate

Der Checker blockiert:

- `auto_promote=true`
- `public_ready_after_pack != 0`
- fehlende Decision-Groups
- fehlende Evidence-Dateien
- `public_ready_now=true`
- Confirm-Commands ausserhalb der Modell-Promotion-Gruppe

## Reports

- `examples/kosmo-references/provenance/owner-review-decision-pack-2026-06-13-review/owner-review-decision-check.generated.json`
- `examples/kosmo-references/provenance/owner-review-decision-pack-2026-06-13-review/owner-review-decision-check.generated.md`
