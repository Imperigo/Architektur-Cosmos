# KosmoOrbit Static Export Smoke

Generated: 2026-06-30T12:52:38.424Z
Status: `orbit_static_export_smoke_passed`
HTML: `out/orbit/index.html`

Checks the built static export for the visible KosmoOrbit demo panels. It does not start a server, call networks, write cloud data or open local tools.

## Summary

- checks: 17/17 passed

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `html_exists` | `passed` | Static /orbit HTML exists. |
| `referenced_static_assets_exist` | `passed` | Every _next/static asset referenced by /orbit exists in out/. |
| `renders_kosmo_orbit` | `passed` | Export renders KosmoOrbit heading. |
| `renders_public_context` | `passed` | Export renders public development status context. |
| `renders_current_public_headline` | `passed` | Export renders current public Orbit headline. |
| `renders_public_gate_notice` | `passed` | Export renders public release and privacy notice. |
| `renders_public_metrics` | `passed` | Export renders public metrics. |
| `renders_system_areas` | `passed` | Export renders public system areas. |
| `renders_system_area_states` | `passed` | Export renders current system area states. |
| `renders_public_pilot_section` | `passed` | Export renders the two public pilot projects section. |
| `renders_villa_pilot_link` | `passed` | Export renders Villa Savoye pilot link. |
| `renders_ingenbohl_pilot_link` | `passed` | Export renders Ingenbohl pilot link. |
| `renders_public_principles` | `passed` | Export renders public safety principles. |
| `keeps_private_sources_off_site` | `passed` | Export states that private local sources are not delivered through the website. |
| `keeps_public_orbit_static` | `passed` | Export keeps Orbit as static public status page. |
| `no_private_leak_patterns` | `passed` | Export contains no blocked private/source leak patterns: none. |
| `no_server_runtime_markers` | `passed` | Export does not include server runtime markers. |

## Next Actions

- Use this smoke after build:fresh before publishing /orbit changes.
- Add visual browser smoke only after the static export contract stays green.
