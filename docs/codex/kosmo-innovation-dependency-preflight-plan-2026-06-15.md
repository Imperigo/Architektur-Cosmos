# Kosmo Innovation Dependency Preflight Plan

Generated: 2026-06-15T12:44:29.433Z
Status: `innovation_dependency_preflight_plan_ready`

## Summary

- Dependency groups: 7
- Command templates: 14
- Executable now: 0
- Public-ready after plan: 0

## Dependency Groups

| Group | Runtime | Commands | Allowed Now |
| --- | --- | ---: | --- |
| `docling` | python | 2 | no |
| `markitdown` | python | 2 | no |
| `ifcopenshell` | python | 2 | no |
| `qwen_embedding_reranker` | model_or_python | 2 | no |
| `deepseek_ocr` | model_or_python | 2 | no |
| `topologicpy` | python | 2 | no |
| `speckle` | python_or_node | 2 | no |

## Execution Sequence After Gate

- Run preflight commands in an isolated local environment.
- Record versions and availability only; do not process private source files.
- Run fixture-only smoke scripts after dependencies are present.
- Escalate before any model download, private OCR, private embedding or training run.
