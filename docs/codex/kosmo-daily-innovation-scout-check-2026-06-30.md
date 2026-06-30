# Kosmo Daily Innovation Scout Check

Generated: 2026-06-30T06:46:30.209Z
Status: `daily_innovation_scout_guard_passed`

## Summary

- Scout status: daily_innovation_scout_ready
- Candidates: 9
- Failures: 0
- Public-ready after check: 0

## Findings

- passed: `schema_version` - Scout schema_version must be 0.1.
- passed: `scout_status_ready` - Scout status must be ready.
- passed: `scout_only` - Scout must be scout-only.
- passed: `no_installs` - Scout must not install tools.
- passed: `no_clones` - Scout must not clone repositories.
- passed: `no_private_reads` - Scout must not read private content.
- passed: `no_private_ocr` - Scout must not run private OCR.
- passed: `no_private_embeddings` - Scout must not run private embeddings.
- passed: `no_training` - Scout must not run training.
- passed: `public_ready_zero` - Scout public-ready must remain 0.
- passed: `candidate_count` - Scout must include at least eight candidates.
- passed: `candidate_present:markitdown` - Scout must include markitdown.
- passed: `candidate_present:docling` - Scout must include docling.
- passed: `candidate_present:qwen3_embedding_reranker` - Scout must include qwen3_embedding_reranker.
- passed: `candidate_present:ifcopenshell` - Scout must include ifcopenshell.
- passed: `source_url:markitdown` - Candidate markitdown must include a source URL.
- passed: `primary_source:markitdown` - Candidate markitdown must use a primary source.
- passed: `install_now_false:markitdown` - Candidate markitdown must not install now.
- passed: `private_content_false:markitdown` - Candidate markitdown must not allow private content now.
- passed: `priority_range:markitdown` - Candidate markitdown priority must be 1-5.
- passed: `source_url:docling` - Candidate docling must include a source URL.
- passed: `primary_source:docling` - Candidate docling must use a primary source.
- passed: `install_now_false:docling` - Candidate docling must not install now.
- passed: `private_content_false:docling` - Candidate docling must not allow private content now.
- passed: `priority_range:docling` - Candidate docling priority must be 1-5.
- passed: `source_url:deepseek_ocr` - Candidate deepseek_ocr must include a source URL.
- passed: `primary_source:deepseek_ocr` - Candidate deepseek_ocr must use a primary source.
- passed: `install_now_false:deepseek_ocr` - Candidate deepseek_ocr must not install now.
- passed: `private_content_false:deepseek_ocr` - Candidate deepseek_ocr must not allow private content now.
- passed: `priority_range:deepseek_ocr` - Candidate deepseek_ocr priority must be 1-5.
- passed: `source_url:qwen3_embedding_reranker` - Candidate qwen3_embedding_reranker must include a source URL.
- passed: `primary_source:qwen3_embedding_reranker` - Candidate qwen3_embedding_reranker must use a primary source.
- passed: `install_now_false:qwen3_embedding_reranker` - Candidate qwen3_embedding_reranker must not install now.
- passed: `private_content_false:qwen3_embedding_reranker` - Candidate qwen3_embedding_reranker must not allow private content now.
- passed: `priority_range:qwen3_embedding_reranker` - Candidate qwen3_embedding_reranker priority must be 1-5.
- passed: `source_url:qwen3_vl_embedding` - Candidate qwen3_vl_embedding must include a source URL.
- passed: `primary_source:qwen3_vl_embedding` - Candidate qwen3_vl_embedding must use a primary source.
- passed: `install_now_false:qwen3_vl_embedding` - Candidate qwen3_vl_embedding must not install now.
- passed: `private_content_false:qwen3_vl_embedding` - Candidate qwen3_vl_embedding must not allow private content now.
- passed: `priority_range:qwen3_vl_embedding` - Candidate qwen3_vl_embedding priority must be 1-5.
- passed: `source_url:ifcopenshell` - Candidate ifcopenshell must include a source URL.
- passed: `primary_source:ifcopenshell` - Candidate ifcopenshell must use a primary source.
- passed: `install_now_false:ifcopenshell` - Candidate ifcopenshell must not install now.
- passed: `private_content_false:ifcopenshell` - Candidate ifcopenshell must not allow private content now.
- passed: `priority_range:ifcopenshell` - Candidate ifcopenshell priority must be 1-5.
- passed: `source_url:topologicpy` - Candidate topologicpy must include a source URL.
- passed: `primary_source:topologicpy` - Candidate topologicpy must use a primary source.
- passed: `install_now_false:topologicpy` - Candidate topologicpy must not install now.
- passed: `private_content_false:topologicpy` - Candidate topologicpy must not allow private content now.
- passed: `priority_range:topologicpy` - Candidate topologicpy priority must be 1-5.
- passed: `source_url:speckle` - Candidate speckle must include a source URL.
- passed: `primary_source:speckle` - Candidate speckle must use a primary source.
- passed: `install_now_false:speckle` - Candidate speckle must not install now.
- passed: `private_content_false:speckle` - Candidate speckle must not allow private content now.
- passed: `priority_range:speckle` - Candidate speckle priority must be 1-5.
- passed: `source_url:paper2poster` - Candidate paper2poster must include a source URL.
- passed: `primary_source:paper2poster` - Candidate paper2poster must use a primary source.
- passed: `install_now_false:paper2poster` - Candidate paper2poster must not install now.
- passed: `private_content_false:paper2poster` - Candidate paper2poster must not allow private content now.
- passed: `priority_range:paper2poster` - Candidate paper2poster priority must be 1-5.
- passed: `private_gate_sequence` - Recommended sequence must include private gate.

## Next Actions

- Use the scout to prioritize source-free fixture contracts.
- Do not install or clone candidates during this block.
- Refresh the scout when owner unlocks Source Root or when a tool becomes immediately actionable.
