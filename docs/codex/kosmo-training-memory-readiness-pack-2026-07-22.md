# Kosmo Training Memory Readiness Pack

Generated: 2026-07-22T06:37:51.385Z
Status: `kosmo_training_memory_readiness_pack_ready`

## Summary

- Lanes: 4
- Candidate sources: 18
- Pilot sources: 3
- Asset sources: 6
- Worker contract sources: 9
- Executable now: 0
- Writes training data now: 0
- Writes embeddings now: 0
- Public-ready after pack: 0

## Lanes

### rag_corpus

- Description: Verified reference and asset summaries for retrieval; no raw private source text.
- Required gates: verified_provenance, rights_classification, chunk_schema_review
- Candidate sources: 9
- Executable now: no
- Public-ready after lane: 0

### eval_set

- Description: Architecture QA and classification evals derived from reviewed metadata and public-safe summaries.
- Required gates: answer_key_review, source_evidence_review, quality_rubric
- Candidate sources: 15
- Executable now: no
- Public-ready after lane: 0

### fine_tune_candidates

- Description: Future instruction examples from overseer-reviewed workflows only.
- Required gates: human_review, license_review, deduplication, quality_eval
- Candidate sources: 0
- Executable now: no
- Public-ready after lane: 0

### embedding_manifest

- Description: Embedding-ready manifest rows after RAG corpus gates; no embeddings generated now.
- Required gates: rag_corpus_ready, embedding_model_selection, privacy_guard
- Candidate sources: 9
- Executable now: no
- Public-ready after lane: 0

## Output Contract

- Future output root: private/KosmoTrainingMemory
- Git allowed now: no
- Allowed Git content after review: schemas, manifests without raw private text, eval rubrics, public-safe examples
- Disallowed Git content: private PDF text, OCR text, private image/plan contents, worker output bodies, license-unknown asset files

## Hard Stops

- Do not train or fine-tune on unverified private content.
- Do not create embeddings from private source contents before source-root, rights and privacy guards pass.
- Do not copy worker output bodies into training data.
- Do not put private OCR/PDF text, scans, images, plans or assets into Git.
- Prepare schemas and eval rubrics first; data rows come only after provenance and rights review.
- Keep public-ready at 0.

## Next Actions

- Draft schema rows only after pilot and asset intake guards pass with reviewed metadata.
- Use RAG before fine-tuning; keep eval rubrics mandatory for every training lane.
- Let local LLMs propose summaries only inside private output contracts, then overseer reviews.
- Use this pack as Phase 6 input once Phase 2-5 gates are actually passed.
