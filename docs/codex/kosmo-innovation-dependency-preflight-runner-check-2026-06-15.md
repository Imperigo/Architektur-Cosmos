# Kosmo Innovation Dependency Preflight Runner Check

Generated: 2026-06-15T13:20:44.408Z
Status: `innovation_dependency_preflight_runner_guard_passed`

## Summary

- Run status: innovation_dependency_preflight_run_completed
- Available groups: 5/7
- Passed checks: 12/14
- Failures: 0
- Public-ready after check: 0

## Findings

- passed: `schema_version` - Run schema_version must be 0.1.
- passed: `run_completed` - Dependency preflight run must complete.
- passed: `availability_only` - Runner must be local-availability-check-only.
- passed: `whitelist_only` - Runner must use whitelisted checks only.
- passed: `no_installs` - Runner must not install dependencies.
- passed: `no_downloads` - Runner must not download models.
- passed: `no_tool_runs` - Runner must not run innovation tools.
- passed: `no_private_reads` - Runner must not read private content.
- passed: `public_ready_zero` - Runner must keep public-ready at 0.
- passed: `dependency_group_count` - Runner must cover at least seven dependency groups.
- passed: `check_count` - Runner must execute at least twelve local availability checks.
- passed: `failures_zero` - Runner structural failures must be 0.
- passed: `group_no_installs:docling` - docling must not install dependencies.
- passed: `group_no_downloads:docling` - docling must not download models.
- passed: `group_no_tool_runs:docling` - docling must not run tools.
- passed: `group_no_private_reads:docling` - docling must not read private content.
- passed: `group_public_ready_zero:docling` - docling must keep public-ready at 0.
- passed: `group_checks:docling` - docling must include checks.
- passed: `check_status:docling:pip_show:docling` - pip_show:docling must be passed or unavailable.
- passed: `check_no_install:docling:pip_show:docling` - pip_show:docling must not be an install/download/clone command.
- passed: `check_status:docling:python_import:docling` - python_import:docling must be passed or unavailable.
- passed: `check_no_install:docling:python_import:docling` - python_import:docling must not be an install/download/clone command.
- passed: `group_no_installs:markitdown` - markitdown must not install dependencies.
- passed: `group_no_downloads:markitdown` - markitdown must not download models.
- passed: `group_no_tool_runs:markitdown` - markitdown must not run tools.
- passed: `group_no_private_reads:markitdown` - markitdown must not read private content.
- passed: `group_public_ready_zero:markitdown` - markitdown must keep public-ready at 0.
- passed: `group_checks:markitdown` - markitdown must include checks.
- passed: `check_status:markitdown:pip_show:markitdown` - pip_show:markitdown must be passed or unavailable.
- passed: `check_no_install:markitdown:pip_show:markitdown` - pip_show:markitdown must not be an install/download/clone command.
- passed: `check_status:markitdown:python_import:markitdown` - python_import:markitdown must be passed or unavailable.
- passed: `check_no_install:markitdown:python_import:markitdown` - python_import:markitdown must not be an install/download/clone command.
- passed: `group_no_installs:ifcopenshell` - ifcopenshell must not install dependencies.
- passed: `group_no_downloads:ifcopenshell` - ifcopenshell must not download models.
- passed: `group_no_tool_runs:ifcopenshell` - ifcopenshell must not run tools.
- passed: `group_no_private_reads:ifcopenshell` - ifcopenshell must not read private content.
- passed: `group_public_ready_zero:ifcopenshell` - ifcopenshell must keep public-ready at 0.
- passed: `group_checks:ifcopenshell` - ifcopenshell must include checks.
- passed: `check_status:ifcopenshell:pip_show:ifcopenshell` - pip_show:ifcopenshell must be passed or unavailable.
- passed: `check_no_install:ifcopenshell:pip_show:ifcopenshell` - pip_show:ifcopenshell must not be an install/download/clone command.
- passed: `check_status:ifcopenshell:python_import:ifcopenshell` - python_import:ifcopenshell must be passed or unavailable.
- passed: `check_no_install:ifcopenshell:python_import:ifcopenshell` - python_import:ifcopenshell must not be an install/download/clone command.
- passed: `group_no_installs:qwen_embedding_reranker` - qwen_embedding_reranker must not install dependencies.
- passed: `group_no_downloads:qwen_embedding_reranker` - qwen_embedding_reranker must not download models.
- passed: `group_no_tool_runs:qwen_embedding_reranker` - qwen_embedding_reranker must not run tools.
- passed: `group_no_private_reads:qwen_embedding_reranker` - qwen_embedding_reranker must not read private content.
- passed: `group_public_ready_zero:qwen_embedding_reranker` - qwen_embedding_reranker must keep public-ready at 0.
- passed: `group_checks:qwen_embedding_reranker` - qwen_embedding_reranker must include checks.
- passed: `check_status:qwen_embedding_reranker:python_import:transformers` - python_import:transformers must be passed or unavailable.
- passed: `check_no_install:qwen_embedding_reranker:python_import:transformers` - python_import:transformers must not be an install/download/clone command.
- passed: `check_status:qwen_embedding_reranker:model_dir:qwen3-embedding` - model_dir:qwen3-embedding must be passed or unavailable.
- passed: `check_no_install:qwen_embedding_reranker:model_dir:qwen3-embedding` - model_dir:qwen3-embedding must not be an install/download/clone command.
- passed: `group_no_installs:deepseek_ocr` - deepseek_ocr must not install dependencies.
- passed: `group_no_downloads:deepseek_ocr` - deepseek_ocr must not download models.
- passed: `group_no_tool_runs:deepseek_ocr` - deepseek_ocr must not run tools.
- passed: `group_no_private_reads:deepseek_ocr` - deepseek_ocr must not read private content.
- passed: `group_public_ready_zero:deepseek_ocr` - deepseek_ocr must keep public-ready at 0.
- passed: `group_checks:deepseek_ocr` - deepseek_ocr must include checks.
- passed: `check_status:deepseek_ocr:python_import:torch_transformers` - python_import:torch_transformers must be passed or unavailable.
- passed: `check_no_install:deepseek_ocr:python_import:torch_transformers` - python_import:torch_transformers must not be an install/download/clone command.
- passed: `check_status:deepseek_ocr:model_dir:deepseek-ocr` - model_dir:deepseek-ocr must be passed or unavailable.
- passed: `check_no_install:deepseek_ocr:model_dir:deepseek-ocr` - model_dir:deepseek-ocr must not be an install/download/clone command.
- passed: `group_no_installs:topologicpy` - topologicpy must not install dependencies.
- passed: `group_no_downloads:topologicpy` - topologicpy must not download models.
- passed: `group_no_tool_runs:topologicpy` - topologicpy must not run tools.
- passed: `group_no_private_reads:topologicpy` - topologicpy must not read private content.
- passed: `group_public_ready_zero:topologicpy` - topologicpy must keep public-ready at 0.
- passed: `group_checks:topologicpy` - topologicpy must include checks.
- passed: `check_status:topologicpy:pip_show:topologicpy` - pip_show:topologicpy must be passed or unavailable.
- passed: `check_no_install:topologicpy:pip_show:topologicpy` - pip_show:topologicpy must not be an install/download/clone command.
- passed: `check_status:topologicpy:python_import:topologicpy` - python_import:topologicpy must be passed or unavailable.
- passed: `check_no_install:topologicpy:python_import:topologicpy` - python_import:topologicpy must not be an install/download/clone command.
- passed: `group_no_installs:speckle` - speckle must not install dependencies.
- passed: `group_no_downloads:speckle` - speckle must not download models.
- passed: `group_no_tool_runs:speckle` - speckle must not run tools.
- passed: `group_no_private_reads:speckle` - speckle must not read private content.
- passed: `group_public_ready_zero:speckle` - speckle must keep public-ready at 0.
- passed: `group_checks:speckle` - speckle must include checks.
- passed: `check_status:speckle:pip_show:specklepy` - pip_show:specklepy must be passed or unavailable.
- passed: `check_no_install:speckle:pip_show:specklepy` - pip_show:specklepy must not be an install/download/clone command.
- passed: `check_status:speckle:node_probe:speckle-contract-only` - node_probe:speckle-contract-only must be passed or unavailable.
- passed: `check_no_install:speckle:node_probe:speckle-contract-only` - node_probe:speckle-contract-only must not be an install/download/clone command.
