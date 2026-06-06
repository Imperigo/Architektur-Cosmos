# KosmoOrbit Local Render Smoke

Generated: 2026-06-06T03:41:24.027Z
Status: `orbit_local_render_smoke_passed`
URL: `http://localhost:3107/orbit/`

Checks a running local KosmoOrbit route for the visible Home-PC handover and doctor markers. It does not start servers, push, deploy, upload, mutate accounts or trigger productive runtime actions.

## Summary

- checks: 12/12 passed

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `renders_home_pc_handover_index` | `passed` | Rendered HTML contains Home-PC Handover Index. |
| `renders_handover_doctor` | `passed` | Rendered HTML contains Handover Doctor. |
| `renders_doctor_checks` | `passed` | Rendered HTML contains Doctor Checks. |
| `renders_doctor_report` | `passed` | Rendered HTML contains Doctor Report. |
| `renders_doctor_passed_status` | `passed` | Rendered HTML contains home_pc_handover_doctor_passed. |
| `renders_doctor_check_count` | `passed` | Rendered HTML contains 19/19. |
| `renders_home_pc_dry_run_check_count` | `passed` | Rendered HTML contains 62/62. |
| `renders_zip_smoke_passed_status` | `passed` | Rendered HTML contains home_pc_handover_zip_smoke_passed. |
| `renders_zip_smoke_check_count` | `passed` | Rendered HTML contains 19/19. |
| `renders_start_card_path` | `passed` | Rendered HTML contains KOSMO_HOME_PC_START_CARD.md. |
| `renders_doctor_script_command` | `passed` | Rendered HTML contains scripts/kosmo-home-pc-handover-doctor.sh. |
| `renders_doctor_report_path` | `passed` | Rendered HTML contains tmp/kosmo-home-pc-handover-doctor.json. |

## Next Actions

- Keep this smoke as the local UI gate after refreshing the Orbit runtime bridge evidence.
- Run it against a local dev or preview server before handing Orbit UI changes to the Home-PC worker.
