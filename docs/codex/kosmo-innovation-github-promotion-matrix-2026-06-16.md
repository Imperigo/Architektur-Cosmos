# Kosmo Innovation GitHub Promotion Matrix

Generated: 2026-06-16T17:46:38.039Z
Status: `innovation_github_promotion_matrix_ready`

## Summary

- Review queue items: 7
- Scanned items: 7
- Contract plans: 5
- Promotable source-free: 5
- Held items: 2
- Target lanes: 3
- Training lanes linked: 3
- Next batch mode: source_free_innovation_and_guarding
- Executable now: 0
- Public-ready after matrix: 0

## Promotion Items

| ID | Source | Lane | Fixture | Training Lane | Decision |
| --- | --- | --- | --- | --- | --- |
| `promotion-01` | [SII-sc22mc/DocFusion](https://github.com/SII-sc22mc/DocFusion) | kosmo_prepare | `kosmo_prepare-sii-sc22mc-docfusion-signal-fixture` | source_extraction_review | promote_to_synthetic_document_fixture_contract |
| `promotion-02` | [lee-agi/3d_model_base](https://github.com/lee-agi/3d_model_base) | kosmo_asset | `kosmo_asset-lee-agi-3d-model-base-signal-fixture` | asset_candidate_review | promote_to_synthetic_asset_retrieval_fixture_contract |
| `promotion-03` | [lfniederauer/blender-agentic-bonsai-sketcher-mcp](https://github.com/lfniederauer/blender-agentic-bonsai-sketcher-mcp) | worker_integration | `worker_integration-lfniederauer-blender-agentic-bonsai-sketcher-mcp-signal-fixture` | worker_output_review | promote_to_worker_boundary_fixture_contract |
| `promotion-04` | [cherry1113/OCR-NLP-Based-Architectural-Specification-Document-Key-Information-Retrieval-System](https://github.com/cherry1113/OCR-NLP-Based-Architectural-Specification-Document-Key-Information-Retrieval-System) | kosmo_prepare | `kosmo_prepare-cherry1113-ocr-nlp-based-architectural-specification-document-key-information-retrieval-system-signal-fixture` | source_extraction_review | promote_to_synthetic_document_fixture_contract |
| `promotion-05` | [mac999/BIM_LLM_code_agent](https://github.com/mac999/BIM_LLM_code_agent) | worker_integration | `worker_integration-mac999-bim-llm-code-agent-signal-fixture` | worker_output_review | promote_to_worker_boundary_fixture_contract |

## Held Items

- [yanghairui/3DRetrieval](https://github.com/yanghairui/3DRetrieval): hold_for_more_public_signal_or_owner_review
- [HamidKiavarz/BIM-LLM](https://github.com/HamidKiavarz/BIM-LLM): hold_for_more_public_signal_or_owner_review

## Next Source-Free Sequence

- `npm run kosmo:innovation-github-fixture-skeletons`
- `npm run kosmo:innovation-github-fixture-skeletons-check`
- `npm run kosmo:innovation-github-fixture-payloads`
- `npm run kosmo:innovation-github-fixture-payloads-check`
- `npm run kosmo:innovation-github-fixture-payload-smoke`
- `npm run kosmo:innovation-github-fixture-payload-smoke-check`
- `npm run kosmo:training-eval-review-queue-plan`
- `npm run kosmo:training-eval-review-queue-plan-check`
- `npm run kosmo:architecture-ontology-seed`
- `npm run kosmo:architecture-ontology-seed-check`

## Hard Stops

- Do not clone public GitHub repositories from this matrix.
- Do not copy GitHub source code, README prose, datasets, models or assets.
- Do not create private-derived training rows before Source Root, provenance and rights gates pass.
- Do not install dependencies or download models from this matrix.
- Do not mark any promotion item public-ready.
