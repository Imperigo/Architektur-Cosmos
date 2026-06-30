# Kosmo Innovation GitHub Watchlist

Generated: 2026-06-30T06:38:57.891Z
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
| 1 | [microsoft/markitdown](https://github.com/microsoft/markitdown) | document_conversion | python_package | high | 2026-06-30T06:37:54Z | 161386 | live_gh_repo_view |
| 2 | [docling-project/docling](https://github.com/docling-project/docling) | document_understanding | python_package | high | 2026-06-30T06:36:06Z | 62374 | live_gh_repo_view |
| 3 | [IfcOpenShell/IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) | ifc_geometry | python_package | high | 2026-06-29T19:29:26Z | 2580 | live_gh_repo_view |
| 4 | [QwenLM/Qwen3-Embedding](https://github.com/QwenLM/Qwen3-Embedding) | retrieval_embeddings | model_or_python | high | 2026-06-29T13:48:46Z | 1962 | live_gh_repo_view |
| 5 | [deepseek-ai/DeepSeek-OCR](https://github.com/deepseek-ai/DeepSeek-OCR) | ocr | model_or_python | medium | 2026-06-30T05:46:23Z | 23477 | live_gh_repo_view |
| 6 | [wassimj/topologicpy](https://github.com/wassimj/topologicpy) | spatial_topology | python_package | medium | 2026-06-28T17:52:24Z | 247 | live_gh_repo_view |
| 7 | [specklesystems/specklepy](https://github.com/specklesystems/specklepy) | connector_boundary | python_package | medium | 2026-06-24T10:25:40Z | 135 | live_gh_repo_view |
| 8 | [docling-project/docling-mcp](https://github.com/docling-project/docling-mcp) | worker_integration | research_only | medium | 2026-06-29T09:30:58Z | 674 | live_gh_repo_view |
| 9 | [deepseek-ai/DeepSeek-OCR-2](https://github.com/deepseek-ai/DeepSeek-OCR-2) | future_ocr_research | research_only | low | 2026-06-30T03:32:33Z | 3082 | live_gh_repo_view |

## Recommended Next Moves

- Keep MarkItDown and Docling as the first KosmoPrepare fixture-only package experiments.
- Keep IfcOpenShell as the first geometry/IFC package experiment.
- Keep Qwen3-Embedding as the first retrieval model candidate, but only after model-root decision.
- Keep DeepSeek-OCR behind Source Root and OCR-specific redaction gates.
- Track Docling MCP as a worker-integration idea, not a production dependency yet.
