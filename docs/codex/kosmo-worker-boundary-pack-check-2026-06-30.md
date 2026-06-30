# Kosmo Worker Boundary Pack Check

Generated: 2026-06-30T06:55:01.147Z
Status: `worker_boundary_pack_guard_failed`

## Summary

- Pack status: worker_boundary_pack_review_only_locked
- Workers: 3
- Allowed commands: 22
- Blocked commands: 3
- Failures: 2
- Warnings: 0
- Public-ready after guard: 0

## Findings

- passed: `pack_status_guarded` - Pack must remain review-only locked or metadata-diagnostic ready.
- passed: `metadata_only_true` - Pack must be metadata-only.
- passed: `reads_private_content_false` - Pack must not read private content.
- passed: `copies_private_content_false` - Pack must not copy private content.
- passed: `public_writes_false` - Pack must block public writes.
- passed: `public_ready_false` - Pack must block public-ready flags.
- passed: `local_worker_git_false` - Pack must block local-worker Git.
- failure: `data_lane_complete` - Data lane must have all configured steps passed.
- failure: `data_lane_review_only_passed` - Data lane must be review-only passed.
- passed: `source_root_state_guarded` - Source-root must be blocked or activation preflight must be metadata-diagnostic ready.
- passed: `probable_libraries_guarded` - Probable private libraries may only be nonzero after activation is ready.
- passed: `selected_root_guarded` - Selected root may exist only after activation is ready.
- passed: `private_diagnostic_guarded` - Private diagnostic may only be allowed when activation preflight is ready.
- passed: `private_inventory_guarded` - Private inventory may only be allowed when activation preflight is ready.
- passed: `source_root_activation_status_known` - Source-root activation status must be a known guarded state.
- passed: `public_ready_total_zero` - Public-ready total must remain 0.
- passed: `three_workers` - Pack must define three worker boundaries.
- passed: `worker_present:kosmo-local-llm` - Worker boundary must exist: kosmo-local-llm.
- passed: `worker_present:codex-central-overseer` - Worker boundary must exist: codex-central-overseer.
- passed: `worker_present:claude-code-kosmooverseer` - Worker boundary must exist: claude-code-kosmooverseer.
- passed: `local_scope_metadata_only` - Local LLM scope must be metadata_review_only.
- passed: `local_blocks_private_reads` - Local LLM must block private reads/OCR.
- passed: `local_blocks_private_copy` - Local LLM must block private excerpts in Git.
- passed: `local_blocks_public_ready` - Local LLM must block public-ready writes.
- passed: `local_blocks_git_cloud` - Local LLM must block Git/cloud/upload commands.
- passed: `pack_command_allowed` - Worker boundary pack command must be allowed.
- passed: `activation_preflight_command_allowed` - Activation preflight command must be allowed.
- passed: `private_metadata_inventory_command_allowed` - Private metadata inventory command must be available as a self-guarding command.
- passed: `private_library_diagnostic_guarded` - Private-library diagnostic must be blocked until activation preflight is ready.
- passed: `private_inventory_extraction_guarded` - Private inventory extraction must be blocked until activation preflight is ready.
- passed: `public_promotion_blocked` - Public promotion must be blocked.
- passed: `no_public_ready_command_allowed` - No allowed command may set public_ready=true.
- passed: `trigger_real_root` - Escalation triggers must include real private library root.
- passed: `trigger_onedrive_sync` - Escalation triggers must include OneDrive sync repair.
- passed: `trigger_private_diagnostic_allowed` - Escalation triggers must include private_diagnostic_allowed=true.
- passed: `trigger_activation_preflight` - Escalation triggers must include activation preflight readiness.
- passed: `trigger_private_metadata_inventory` - Escalation triggers must include private metadata inventory contract output.
- passed: `trigger_owner_answers` - Escalation triggers must include explicit current owner answers.

## Next Actions

- Fix worker boundary pack guard failures before handing tasks to local LLMs.
- Rerun npm run kosmo:worker-boundary-pack and npm run kosmo:worker-boundary-pack-check.
