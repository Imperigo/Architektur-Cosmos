# Kosmo Daily Innovation Scout

Generated: 2026-06-15T04:54:16.252Z
Status: `daily_innovation_scout_ready`

## Summary

- Candidates: 9
- Primary sources: 9
- Install now: 0
- Private content allowed now: 0
- Highest priority: docling, qwen3_embedding_reranker, ifcopenshell
- Public-ready after scout: 0

## Candidates

| Priority | Candidate | Lane | Next Action | Source |
| ---: | --- | --- | --- | --- |
| 4 | Microsoft MarkItDown | kosmo_prepare | prepare_isolated_fixture_only | https://github.com/microsoft/markitdown |
| 5 | Docling | kosmo_prepare | prepare_isolated_fixture_only | https://github.com/docling-project/docling |
| 3 | DeepSeek-OCR / DeepSeek-OCR2 | kosmo_prepare_ocr | benchmark_on_public_fixture_after_manual_review | https://github.com/deepseek-ai/DeepSeek-OCR/ |
| 5 | Qwen3 Embedding and Reranker | kosmo_rag | design_public_fixture_eval_before_private_index | https://github.com/QwenLM/Qwen3-Embedding |
| 4 | Qwen3-VL Embedding | kosmo_multimodal_rag | track_for_public_visual_fixture_eval | https://github.com/QwenLM/Qwen3-VL-Embedding |
| 5 | IfcOpenShell | kosmoasset_geometry | build_source_free_ifc_fixture_contract | https://github.com/IfcOpenShell/IfcOpenShell |
| 4 | TopologicPy | kosmo_spatial_reasoning | prepare_graph_schema_mapping | https://github.com/wassimj/topologicpy |
| 3 | Speckle | kosmo_interoperability | track_connector_contracts_only | https://github.com/specklesystems |
| 3 | Paper2Poster | kosmopublish | extract_process_pattern_only | https://github.com/paper2poster/paper2poster |

## Guard Notes

- markitdown: Architecture books and PDFs may contain copyrighted text; only use fixtures until Source Root and rights rules are explicit.
- docling: High value for scanned architecture sources, but must stay fixture-only before private library unlock.
- deepseek_ocr: OCR can hallucinate plausible text; outputs need provenance, confidence and human review before training.
- qwen3_embedding_reranker: Do not embed private library content until Source Root, rights scope and deletion/export rules are active.
- qwen3_vl_embedding: Visual retrieval over private scans and photos must be deletion-safe and never exported unchecked.
- ifcopenshell: Geometry imports can expose private project structure; use generated/public IFC fixtures first.
- topologicpy: Keep graph fixtures synthetic/public until private reference provenance is settled.
- speckle: Cloud/data sharing must stay disabled until project privacy and account boundaries are explicit.
- paper2poster: Use as process inspiration; do not feed private papers/books into external publishing flows.

## Recommended Sequence

1. Create public/synthetic fixture contracts for Docling, IfcOpenShell and Qwen retrieval before installing anything.
2. Wait for explicit Source Root and owner/risk gates before applying OCR, embeddings or conversion to private libraries.
3. Expose selected innovation candidates in Orbit as roadmap items, not active tools.
