# Kosmo Innovation Dependency Install Queue Check

Generated: 2026-06-15T13:20:51.622Z
Status: `innovation_dependency_install_queue_guard_passed`

## Summary

- Queue status: innovation_dependency_install_queue_ready
- Queue items: 2
- Failures: 0
- Public-ready after check: 0

## Findings

- passed: `schema_version` - Queue schema_version must be 0.1.
- passed: `queue_ready` - Install queue must be ready.
- passed: `queue_only` - Queue must be queue-only.
- passed: `no_installs` - Queue must not install dependencies.
- passed: `no_downloads` - Queue must not download models.
- passed: `no_tool_runs` - Queue must not run tools.
- passed: `no_private_reads` - Queue must not read private content.
- passed: `public_ready_zero` - Queue must keep public-ready at 0.
- passed: `owner_batch_required` - Queue must require an explicit owner install batch.
- passed: `executable_zero` - Queue executable_now must be 0.
- passed: `queue_items_present` - Queue must include install items.
- passed: `item_owner_batch:qwen_embedding_reranker` - qwen_embedding_reranker must require explicit install batch.
- passed: `item_not_executable:qwen_embedding_reranker` - qwen_embedding_reranker must not be executable now.
- passed: `item_public_ready_zero:qwen_embedding_reranker` - qwen_embedding_reranker must keep public-ready at 0.
- passed: `model_root_gate:qwen_embedding_reranker` - qwen_embedding_reranker must require a model root decision.
- passed: `item_owner_batch:deepseek_ocr` - deepseek_ocr must require explicit install batch.
- passed: `item_not_executable:deepseek_ocr` - deepseek_ocr must not be executable now.
- passed: `item_public_ready_zero:deepseek_ocr` - deepseek_ocr must keep public-ready at 0.
- passed: `ocr_source_root_gate` - DeepSeek OCR must remain blocked until Source Root unlock.
- passed: `model_root_gate:deepseek_ocr` - deepseek_ocr must require a model root decision.
