# Kosmo Private Inventory Output Template

Created: 2026-06-13T20:13:33.587Z
Status: `private_inventory_template_only`

## Policy

- Private content included: no
- Copied private files: no
- Public-ready after inventory: 0
- Long quotes allowed: no

## Pilots

| Pilot | Status | Rights | Public-ready |
| --- | --- | --- | --- |
| villa-savoye | not_started | review_only | no |
| kapelle-sogn-benedetg | not_started | review_only | no |
| alterszentrum-kloster-ingenbohl | not_started | review_only | no |

## Forbidden Fields

- `full_text`
- `ocr_text`
- `pdf_text`
- `book_excerpt`
- `page_scan`
- `image_base64`
- `copied_plan`
- `private_image`

## Next Actions

- Use this template only after source-root decision and private-library diagnostic pass.
- Write real inventory outputs under KosmoZentrale private paths.
- Run npm run kosmo:private-inventory-output-check -- --inventory "<private-inventory-json>" before handing results to Codex/Claude.
