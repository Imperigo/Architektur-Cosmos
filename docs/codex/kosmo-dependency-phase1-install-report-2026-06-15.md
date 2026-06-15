# Kosmo Dependency Phase 1 Install Report

Generated: 2026-06-15T15:21:09+02:00
Status: `dependency_phase1_install_completed`

## Summary

- Environment: `/mnt/data/ArchitekturKosmos/tools/kosmo-python-tools/.venv`
- Python package installs: completed
- Model downloads: none
- Private reads: none
- Public-ready after install: 0

## Installed Packages

| Package | Version |
| --- | --- |
| `markitdown` | 0.1.6 |
| `docling` | 2.102.1 |
| `ifcopenshell` | 0.8.5 |
| `topologicpy` | 0.9.43 |
| `specklepy` | 3.0.8 |

## Supporting Packages Observed

| Package | Version |
| --- | --- |
| `torch` | 2.12.0 |
| `transformers` | 5.12.0 |

## Post-Install Preflight

- Dependency groups available: 5/7
- Passed checks: 12/14
- Runner guard: `innovation_dependency_preflight_runner_guard_passed`
- Remaining queue items: 2

## Remaining Queue

- `qwen_embedding_reranker`
- `deepseek_ocr`

## Next Actions

- Build fixture-only MarkItDown/Docling document smoke against synthetic test files.
- Build fixture-only IfcOpenShell entity smoke against synthetic IFC.
- Keep Qwen and DeepSeek as model-root gated items.
- Do not run OCR, embeddings or training on private sources before Source Root unlock.
