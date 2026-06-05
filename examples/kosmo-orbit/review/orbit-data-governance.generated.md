# KosmoOrbit Data Governance Check

Generated: 2026-06-05T17:08:21.208Z
Status: `data_governance_contract_passed`
Contract: `examples/kosmo-orbit/governance/orbit-data-governance.contract.json`

Static review-only check for future local Orbit storage, retention, backup and privacy rules. It validates local JSON and React source only; it does not write D1/R2, upload, persist profiles, write customer data, start backup jobs, sync external systems or publish data.

## Summary

- checks: 16/16 passed
- principles: 4
- data domains: 5
- storage lanes: 3
- blocked capabilities: 13
- promotion requirements: 6

## Data Domains

| Domain | Future Scope | Preview Scope | Blocked Today | Retention Gate |
| --- | ---: | ---: | ---: | --- |
| `project_knowledge` | 4 | 3 | 4 | Projektleitung + Owner bestaetigen Projektablage, Aufbewahrung und Loeschfrist. |
| `asset_and_rights` | 4 | 3 | 4 | Owner bestaetigt Rechtekette, Lizenzstatus und Public-Safe-Grenze. |
| `identity_and_sessions` | 4 | 3 | 4 | Owner + Datenschutz Review bestaetigen Consent, Retention und Offboarding. |
| `audit_and_decisions` | 4 | 3 | 4 | Owner bestaetigt, welche Entscheide rechtlich relevant gespeichert werden. |
| `learning_and_training` | 3 | 3 | 4 | Ausbildner + Owner bestaetigen, ob Lernhistorie ueberhaupt gespeichert werden darf. |

## Storage Lanes

| Lane | Blocked Today |
| --- | ---: |
| `local_json_preview` | 3 |
| `local_office_store` | 3 |
| `external_exchange` | 4 |

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `contract_file_exists` | `passed` | Data governance contract file exists. |
| `status_ready` | `passed` | Data governance contract status is ready. |
| `mode_static_review_only` | `passed` | Data governance contract is static review-only. |
| `principles_present` | `passed` | Governance principles are explicit. |
| `required_domains_present` | `passed` | All required data domains are present. |
| `domains_have_retention_backup_and_blocks` | `passed` | Every data domain has preview scope, future storage scope, retention gate, backup gate and blocked actions. |
| `storage_lanes_present` | `passed` | Local JSON preview, local office store and external exchange lanes are present. |
| `storage_lanes_block_writes` | `passed` | Every storage lane blocks writes or sync today. |
| `blocked_capabilities_present` | `passed` | All sensitive data capabilities are blocked today. |
| `promotion_requirements_present` | `passed` | Promotion requirements are explicit. |
| `component_imports_contract` | `passed` | Component imports the data governance contract. |
| `component_renders_governance_copy` | `passed` | Component renders data governance boundary copy. |
| `component_renders_safety_boundary` | `passed` | Component states D1 writes, R2 uploads, customer writes, backup jobs and external sync are blocked. |
| `route_imports_data_governance` | `passed` | Orbit route imports the data governance component. |
| `route_anchors_data_governance` | `passed` | Orbit route renders a data-governance anchor. |
| `section_index_links_data_governance` | `passed` | Section index links to data governance. |

## Next Actions

- Use this contract before implementing any local Orbit database, backup job or persistent office memory.
- Keep all /orbit data reads static until storage, retention and privacy rules are approved.
- Connect this governance contract to future KosmoData, KosmoAsset and Local Identity storage work.
