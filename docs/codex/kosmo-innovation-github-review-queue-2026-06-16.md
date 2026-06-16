# Kosmo Innovation GitHub Review Queue

Generated: 2026-06-16T17:45:41.627Z
Status: `innovation_github_review_queue_ready`

## Summary

- Discovery candidates: 23
- Review items: 7
- High priority items: 5
- Lanes: 4
- Execute now: 0
- Public-ready after queue: 0

## Review Items

| ID | Repo | Lane | Priority | Safe action |
| --- | --- | --- | --- | --- |
| `github-review-01` | [SII-sc22mc/DocFusion](https://github.com/SII-sc22mc/DocFusion) | kosmo_prepare | high | Summarize public README/API surface for a synthetic document-layout or OCR fixture contract. |
| `github-review-02` | [yanghairui/3DRetrieval](https://github.com/yanghairui/3DRetrieval) | kosmo_asset | high | Extract public method categories for 3D similarity/retrieval taxonomy only. |
| `github-review-03` | [lee-agi/3d_model_base](https://github.com/lee-agi/3d_model_base) | kosmo_asset | high | Extract public method categories for 3D similarity/retrieval taxonomy only. |
| `github-review-04` | [lfniederauer/blender-agentic-bonsai-sketcher-mcp](https://github.com/lfniederauer/blender-agentic-bonsai-sketcher-mcp) | ifc_reasoning | high | Summarize public README command boundary for future IfcOpenShell/Bonsai worker adapter review. |
| `github-review-05` | [cherry1113/OCR-NLP-Based-Architectural-Specification-Document-Key-Information-Retrieval-System](https://github.com/cherry1113/OCR-NLP-Based-Architectural-Specification-Document-Key-Information-Retrieval-System) | kosmo_prepare | high | Summarize public README/API surface for a synthetic document-layout or OCR fixture contract. |
| `github-review-06` | [mac999/BIM_LLM_code_agent](https://github.com/mac999/BIM_LLM_code_agent) | bim_rag_workers | medium | Extract public RAG/graph concepts for local worker task-spec inspiration only. |
| `github-review-07` | [HamidKiavarz/BIM-LLM](https://github.com/HamidKiavarz/BIM-LLM) | bim_rag_workers | medium | Extract public RAG/graph concepts for local worker task-spec inspiration only. |

## Lane Review Order

- `kosmo_prepare`: First inspect public README/API shape for document conversion, OCR and layout parsing fixture ideas.
- `ifc_reasoning`: Inspect public README only for Bonsai/IfcOpenShell/MCP command-boundary ideas.
- `worker_integration`: Keep any MCP/agent pattern behind local runtime and owner gates.
- `kosmo_asset`: Inspect retrieval repos for feature taxonomy and evaluation metrics, not implementation adoption.
- `bim_rag_workers`: Inspect RAG/graph ideas for future local worker task specs only.

## Hard Stops

- Do not clone repositories during review queue generation.
- Do not install dependencies or download models from discovered repositories.
- Do not run discovered code.
- Do not process private ArchitekturKosmos sources while evaluating public GitHub candidates.
- Do not mark any candidate public-ready or production-ready without human/overseer review.
