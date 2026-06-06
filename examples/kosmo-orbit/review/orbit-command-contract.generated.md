# KosmoOrbit Command Contract Smoke

Generated: 2026-06-06T07:07:24.548Z
Status: `orbit_command_contract_passed`
Contract: `examples/kosmo-orbit/commands/orbit-command.contract.json`

Static smoke for the future KosmoOrbit command contract. It validates local JSON only and does not launch tools, generate geometry, write user data, upload, publish, access external accounts, control networks or spend money.

## Summary

- checks: 14/14 passed
- commands: 9
- blocked commands: 6
- review-enabled commands: 2

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `contract_file_exists` | `passed` | Command contract file exists. |
| `status_ready` | `passed` | Command contract status is ready. |
| `mode_static_review_only` | `passed` | Command contract is static review-only. |
| `required_commands_present` | `passed` | All required command intents are present. |
| `command_count` | `passed` | Contract defines at least nine command intents. |
| `states_cover_review_and_blocked` | `passed` | Contract separates review, local check and blocked states. |
| `all_commands_have_copy` | `passed` | Every command has label, area, role, today and gate copy. |
| `safety_flags_present` | `passed` | All safety flags are present and true. |
| `blocks_process_launches` | `passed` | Process launches stay blocked. |
| `blocks_geometry_generation` | `passed` | Geometry generation stays blocked. |
| `blocks_user_writes` | `passed` | User writes stay blocked. |
| `blocks_public_publish` | `passed` | Public publish stays blocked. |
| `blocks_network_control` | `passed` | Network control stays blocked. |
| `has_next_actions` | `passed` | Contract records next safe actions. |

## Next Actions

- Keep review-enabled commands separate from blocked runtime commands.
- Before real execution exists, define command input schemas, logs, owners and rollback behavior.
- Do not connect Blender, publishing, repair or external sync commands without human approval.
