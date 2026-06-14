# Kosmo Innovation Lane Plan

Generated: 2026-06-14T07:38:01.314Z
Status: `innovation_lane_metadata_plan_ready`

## Summary

- Day batch: day_batch_loop_passed_review_only
- Source-root blocker: source_root_blocker_still_active
- Private diagnostic allowed: no
- Lanes: 5
- Ready now: 5
- Blocked by source root: 3
- Public-ready after plan: 0

## Tool Probes

| Probe | Status | Command |
| --- | --- | --- |
| `python_cli` | available | `python3 --version` |
| `markitdown_cli` | available | `/mnt/data/ArchitekturKosmos/tools/markitdown-venv/bin/markitdown --version` |
| `tesseract_cli` | missing | `tesseract --version` |
| `ollama_list` | available | `ollama list` |
| `ifcopenshell_import` | available | `/mnt/data/ArchitekturKosmos/tools/ifcopenshell-venv/bin/python -c import ifcopenshell; print(ifcopenshell.version)` |

## Lanes

### MarkItDown for KosmoPrepare M2

- ID: `markitdown_prepare_m2`
- Tool state: available
- Intent: Convert allowed documents into Markdown for downstream metadata extraction and review packs.
- First smoke: Create a tiny synthetic public-domain text/PDF fixture and verify Markdown output contains no private content.
- Promotion gate: No private Markdown enters Git; private outputs stay under KosmoZentrale private inventory paths.
- Blocked until: real source root recorded before private book/PDF conversion

### Local OCR for Scanned Architecture Sources

- ID: `local_ocr_scanned_sources`
- Tool state: missing
- Intent: Evaluate OCR fallback for scanned plans/books after source-root and rights gates.
- First smoke: Use one generated/public image fixture with a short text label; write only metadata and confidence summary.
- Promotion gate: OCR text from private scans is never committed; only owner-approved summaries may enter review packs.
- Blocked until: source-root decision passes; owner authorizes private OCR scope; private output path outside Git exists

### Qwen Embeddings/Reranking for KosmoReferences RAG

- ID: `qwen_embedding_rag`
- Tool state: available
- Intent: Prepare local semantic search over reviewed project metadata, not raw private PDFs.
- First smoke: Embed only pilot IDs, titles and own-written summaries; verify no source excerpts are present.
- Promotion gate: Embedding corpus manifest must prove source class, rights state and no raw private text.
- Blocked until: private source root and pilot metadata inventory pass

### IfcOpenShell Geometry/Structure Lane

- ID: `ifcopenshell_geometry_lane`
- Tool state: available
- Intent: Use IFC parsing as the future bridge from reference/project packages to model-layer reasoning.
- First smoke: Run semantic proof on existing demo IFC only, then connect output to pilot evidence gaps.
- Promotion gate: No derived model asset becomes public-ready without file-level provenance and human review.
- Blocked until: private source-dependent geometry remains blocked until provenance is known

### Paper2Poster Logic for KosmoPublish

- ID: `paper2poster_publish_lane`
- Tool state: available
- Intent: Borrow paper-to-poster planning as a layout reasoning pattern for architectural boards and review packs.
- First smoke: Generate a layout JSON skeleton for Villa/Sogn/Ingenbohl with empty media slots.
- Promotion gate: KosmoPublish exports remain review-only until media rights are resolved.
- Blocked until: actual image/plan placement waits for rights and provenance review

## Next Actions

- Run public/synthetic smoke tests only for MarkItDown, OCR and embeddings.
- Use existing IFC demo assets for geometry experiments.
- Keep private source-dependent innovation work blocked until source-root decision passes.
- After smoke tests, add per-lane guards before any worker or local LLM can run the tools autonomously.
