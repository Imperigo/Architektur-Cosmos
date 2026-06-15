# Kosmo Dependency Install Batch Brief Check

Generated: 2026-06-15T13:18:06.423Z
Status: `dependency_install_batch_brief_guard_passed`

## Summary

- Brief status: dependency_install_batch_brief_ready
- Phases: 3
- Phase 1 package count: 5
- Failures: 0
- Public-ready after check: 0

## Findings

- passed: `schema_version` - Brief schema_version must be 0.1.
- passed: `brief_ready` - Brief must be ready.
- passed: `decision_brief_only` - Brief must be decision-brief-only.
- passed: `no_installs` - Brief must not install dependencies.
- passed: `no_model_downloads` - Brief must not download models.
- passed: `no_tool_runs` - Brief must not run tools.
- passed: `no_private_reads` - Brief must not read private content.
- passed: `public_ready_zero` - Brief must keep public-ready at 0.
- passed: `phase_count` - Brief must include three phases.
- passed: `phase_1_packages` - Phase 1 must include the package candidates.
- passed: `phase_not_executing:phase_1_python_package_env` - phase_1_python_package_env must not execute now.
- passed: `phase_no_private_reads:phase_1_python_package_env` - phase_1_python_package_env must not read private content.
- passed: `item_not_executing:markitdown` - markitdown must not execute now.
- passed: `item_public_ready_zero:markitdown` - markitdown must keep public-ready at 0.
- passed: `item_not_executing:docling` - docling must not execute now.
- passed: `item_public_ready_zero:docling` - docling must keep public-ready at 0.
- passed: `item_not_executing:ifcopenshell` - ifcopenshell must not execute now.
- passed: `item_public_ready_zero:ifcopenshell` - ifcopenshell must keep public-ready at 0.
- passed: `item_not_executing:topologicpy` - topologicpy must not execute now.
- passed: `item_public_ready_zero:topologicpy` - topologicpy must keep public-ready at 0.
- passed: `item_not_executing:speckle` - speckle must not execute now.
- passed: `item_public_ready_zero:speckle` - speckle must keep public-ready at 0.
- passed: `phase_not_executing:phase_2_embedding_model_root` - phase_2_embedding_model_root must not execute now.
- passed: `phase_no_private_reads:phase_2_embedding_model_root` - phase_2_embedding_model_root must not read private content.
- passed: `item_not_executing:qwen_embedding_reranker` - qwen_embedding_reranker must not execute now.
- passed: `item_public_ready_zero:qwen_embedding_reranker` - qwen_embedding_reranker must keep public-ready at 0.
- passed: `model_root_gate:qwen_embedding_reranker` - qwen_embedding_reranker must require model root decision.
- passed: `phase_not_executing:phase_3_ocr_model_root` - phase_3_ocr_model_root must not execute now.
- passed: `phase_no_private_reads:phase_3_ocr_model_root` - phase_3_ocr_model_root must not read private content.
- passed: `item_not_executing:deepseek_ocr` - deepseek_ocr must not execute now.
- passed: `item_public_ready_zero:deepseek_ocr` - deepseek_ocr must keep public-ready at 0.
- passed: `model_root_gate:deepseek_ocr` - deepseek_ocr must require model root decision.
- passed: `ocr_source_root_gate` - DeepSeek OCR must stay source-root gated.
