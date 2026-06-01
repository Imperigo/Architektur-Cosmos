# KosmoData Atlas Static Export Smoke

Generated: 2026-06-01T20:09:19.262Z
Status: `atlas_static_export_smoke_passed`
HTML: `out/atlas/index.html`

Checks the built static export for the KosmoData `/atlas` shell, serialized entry payload and referenced CSS/JS assets. It does not start a server, call networks, write cloud data or open local tools.

## Summary

- checks: 17/17 passed
- referenced static assets: 10
- missing static assets: 0

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `html_exists` | `passed` | Static /atlas HTML exists. |
| `referenced_static_assets_exist` | `passed` | Every _next/static asset referenced by /atlas exists in out/. |
| `renders_architektur_kosmos_intro` | `passed` | Export renders the intro title. |
| `renders_kosmodata_module` | `passed` | Export includes the KosmoData module handoff. |
| `renders_database_copy` | `passed` | Export includes database panel copy. |
| `renders_relation_copy` | `passed` | Export includes relation/network copy. |
| `renders_known_entry_villa_savoye` | `passed` | Export includes Villa Savoye data. |
| `renders_known_entry_hagia_sophia` | `passed` | Export includes Hagia Sophia data. |
| `renders_known_entry_mfo_park` | `passed` | Export includes MFO Park data. |
| `exports_entry_detail_routes` | `passed` | Export includes static detail route HTML files. |
| `renders_image_media_slots` | `passed` | Export includes media/image vocabulary. |
| `renders_model_vocabulary` | `passed` | Export includes 3D/model vocabulary. |
| `keeps_public_safe_boundary` | `passed` | Export keeps public/private boundary copy. |
| `keeps_static_frontend_boundary` | `passed` | Export does not include server runtime markers. |
| `has_serialized_entry_payload` | `passed` | Export includes serialized entry data for hydration. |
| `has_german_metadata` | `passed` | Export has German document language. |
| `has_icon_links` | `passed` | Export includes icon links. |

## Next Actions

- Use this smoke after build:fresh before publishing KosmoData changes.
- Pair with atlas:interaction-guard for click, filter and dossier contracts.
