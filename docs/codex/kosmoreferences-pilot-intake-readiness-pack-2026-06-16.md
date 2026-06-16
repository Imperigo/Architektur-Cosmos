# KosmoReferences Pilot Intake Readiness Pack

Generated: 2026-06-16T05:12:30.259Z
Status: `kosmoreferences_pilot_intake_readiness_pack_ready`

## Summary

- Pilots: 3
- Total stages: 24
- Blocked now: 24
- Complete review-only pilots: 3
- Evidence gap count: 12
- Public-ready assets: 0
- Public-ready after pack: 0

## Pilots

### Villa Savoye

- Package status: pilot_package_review_only_complete
- Evidence state: public link package exists; local media/model assets exist but need file-level review
- Gaps: 4
- Blocking gap types: file_level_rights, plan_section_provenance
- Recommended workers: codex-central-overseer, kosmo-local-llm, local-batch-workers

| Stage | Owner | Status | Guard |
| --- | --- | --- | --- |
| `metadata_inventory_match` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `source_list_review` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `media_plan_slot_review` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `rights_and_provenance_review` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `analysis_layer_completion` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `asset_candidate_bridge` | codex_kosmoasset_lane | blocked_until_source_root_unlock | npm run kosmo:references-nightly-gate |
| `local_worker_packet` | local_llm_after_overseer_guard | blocked_until_source_root_unlock | manual overseer review plus local worker output contract |
| `orbit_status_update` | codex_or_claude_overseer | blocked_until_prior_stages_pass | npm run kosmo:data-lane-sweep |

### Kapelle Sogn Benedetg

- Package status: pilot_package_review_only_complete
- Evidence state: public link package exists; no visible local book/lecture package yet
- Gaps: 4
- Blocking gap types: local_library_source, timber_structure
- Recommended workers: kosmo-local-llm, local-batch-workers, owner_plus_codex

| Stage | Owner | Status | Guard |
| --- | --- | --- | --- |
| `metadata_inventory_match` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `source_list_review` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `media_plan_slot_review` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `rights_and_provenance_review` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `analysis_layer_completion` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `asset_candidate_bridge` | codex_kosmoasset_lane | blocked_until_source_root_unlock | npm run kosmo:references-nightly-gate |
| `local_worker_packet` | local_llm_after_overseer_guard | blocked_until_source_root_unlock | manual overseer review plus local worker output contract |
| `orbit_status_update` | codex_or_claude_overseer | blocked_until_prior_stages_pass | npm run kosmo:data-lane-sweep |

### Alterszentrum Kloster Ingenbohl

- Package status: pilot_package_review_only_complete
- Evidence state: public link package exists, including study-commission PDF link; no copied PDF/media content in package
- Gaps: 4
- Blocking gap types: competition_pdf_extraction, structure_evidence
- Recommended workers: codex-central-overseer, kosmo-local-llm, local-batch-workers

| Stage | Owner | Status | Guard |
| --- | --- | --- | --- |
| `metadata_inventory_match` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `source_list_review` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `media_plan_slot_review` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `rights_and_provenance_review` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `analysis_layer_completion` | codex_kosmoreferences_lane | blocked_until_source_root_unlock | npm run kosmo:pilot-package-check |
| `asset_candidate_bridge` | codex_kosmoasset_lane | blocked_until_source_root_unlock | npm run kosmo:references-nightly-gate |
| `local_worker_packet` | local_llm_after_overseer_guard | blocked_until_source_root_unlock | manual overseer review plus local worker output contract |
| `orbit_status_update` | codex_or_claude_overseer | blocked_until_prior_stages_pass | npm run kosmo:data-lane-sweep |

## Command Order After Source-Root Unlock

- npm run kosmo:private-metadata-inventory
- npm run kosmo:private-metadata-inventory-check
- npm run kosmo:pilot-evidence-matrix
- npm run kosmo:pilot-package-check
- npm run kosmo:pilot-intake-readiness-pack
- npm run kosmo:pilot-intake-readiness-pack-check
- npm run kosmo:data-lane-sweep
- npm run kosmo:references-nightly-gate

## Hard Stops

- Do not execute pilot intake stages before the owner source-root answer is explicit and guards pass.
- Do not read private file contents in this readiness pack.
- Do not OCR, extract PDF text, or send private source contents to local LLM workers from this pack.
- Do not copy private files or generated private outputs into Git.
- Keep every pilot review-only and public-ready false.
