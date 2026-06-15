# Kosmo Dependency Install Batch Brief

Generated: 2026-06-15T13:18:06.189Z
Status: `dependency_install_batch_brief_ready`

## Summary

- Phase 1 package count: 5
- Phase 2 model count: 1
- Phase 3 model count: 1
- Executable now: 0
- Public-ready after brief: 0

## Phases

### phase_1_python_package_env

- Status: `ready_for_separate_execution`
- Purpose: Enable fixture-only KosmoPrepare and geometry smoke tests.
- Executes now: false
- Environment root: `/mnt/data/ArchitekturKosmos/tools/kosmo-python-tools`

| Item | Type | Risk | Source |
| --- | --- | --- | --- |
| `markitdown` | python_package | low | [microsoft/markitdown](https://github.com/microsoft/markitdown) |
| `docling` | python_package | medium | [docling-project/docling](https://github.com/docling-project/docling) |
| `ifcopenshell` | python_package | medium | [IfcOpenShell/IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) |
| `topologicpy` | python_package | medium | [wassimj/topologicpy](https://github.com/wassimj/topologicpy) |
| `speckle` | python_package | low | [specklesystems/specklepy](https://github.com/specklesystems/specklepy) |

### phase_2_embedding_model_root

- Status: `blocked_until_model_root_decision`
- Purpose: Prepare retrieval/RAG foundation for KosmoReferences.
- Executes now: false
- Model root: `/mnt/data/ArchitekturKosmos/Models`

| Item | Type | Risk | Source |
| --- | --- | --- | --- |
| `qwen_embedding_reranker` | model_download | high | [QwenLM/Qwen3-Embedding](https://github.com/QwenLM/Qwen3-Embedding) |

### phase_3_ocr_model_root

- Status: `blocked_until_source_root_and_ocr_gate`
- Purpose: Prepare local OCR experiments for scanned architecture sources.
- Executes now: false
- Model root: `/mnt/data/ArchitekturKosmos/Models`

| Item | Type | Risk | Source |
| --- | --- | --- | --- |
| `deepseek_ocr` | model_download | high | [deepseek-ai/DeepSeek-OCR](https://github.com/deepseek-ai/DeepSeek-OCR) |

## Recommended Next Command Batch

- Create isolated Python environment under /mnt/data/ArchitekturKosmos/tools/kosmo-python-tools.
- Install phase_1 Python packages there only.
- Record exact versions and rerun dependency preflight runner.
- Do not download models in the Python package phase.
- Do not process private content in any install validation.
