# Kosmo Innovation GitHub Watchlist

Generated: 2026-06-16T17:44:36.676Z
Status: `innovation_github_watchlist_ready`
Observation method: live gh repo view against seeded primary GitHub repositories with static fallback only on probe failure

## Summary

- Candidates: 9
- High fit: 4
- Medium fit: 4
- Research-only: 2
- Live probe succeeded: 9
- Live probe fallback: 0
- Executable now: 0
- Public-ready after watchlist: 0

## Candidates

| Priority | Repo | Lane | Type | Fit | Updated | Stars | Observation |
| ---: | --- | --- | --- | --- | --- | ---: | --- |
| 1 | [microsoft/markitdown](https://github.com/microsoft/markitdown) | document_conversion | python_package | high | 2026-06-16T17:44:29Z | 154584 | live_gh_repo_view |
| 2 | [docling-project/docling](https://github.com/docling-project/docling) | document_understanding | python_package | high | 2026-06-16T17:35:52Z | 61685 | live_gh_repo_view |
| 3 | [IfcOpenShell/IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) | ifc_geometry | python_package | high | 2026-06-16T11:35:07Z | 2568 | live_gh_repo_view |
| 4 | [QwenLM/Qwen3-Embedding](https://github.com/QwenLM/Qwen3-Embedding) | retrieval_embeddings | model_or_python | high | 2026-06-15T21:55:09Z | 1958 | live_gh_repo_view |
| 5 | [deepseek-ai/DeepSeek-OCR](https://github.com/deepseek-ai/DeepSeek-OCR) | ocr | model_or_python | medium | 2026-06-16T16:29:35Z | 23294 | live_gh_repo_view |
| 6 | [wassimj/topologicpy](https://github.com/wassimj/topologicpy) | spatial_topology | python_package | medium | 2026-06-15T06:14:14Z | 242 | live_gh_repo_view |
| 7 | [specklesystems/specklepy](https://github.com/specklesystems/specklepy) | connector_boundary | python_package | medium | 2026-06-15T06:17:38Z | 134 | live_gh_repo_view |
| 8 | [docling-project/docling-mcp](https://github.com/docling-project/docling-mcp) | worker_integration | research_only | medium | 2026-06-15T07:35:21Z | 657 | live_gh_repo_view |
| 9 | [deepseek-ai/DeepSeek-OCR-2](https://github.com/deepseek-ai/DeepSeek-OCR-2) | future_ocr_research | research_only | low | 2026-06-16T16:29:39Z | 2966 | live_gh_repo_view |

## Recommended Next Moves

- Keep MarkItDown and Docling as the first KosmoPrepare fixture-only package experiments.
- Keep IfcOpenShell as the first geometry/IFC package experiment.
- Keep Qwen3-Embedding as the first retrieval model candidate, but only after model-root decision.
- Keep DeepSeek-OCR behind Source Root and OCR-specific redaction gates.
- Track Docling MCP as a worker-integration idea, not a production dependency yet.
