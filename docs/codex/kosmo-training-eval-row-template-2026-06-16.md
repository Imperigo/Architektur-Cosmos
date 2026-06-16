# Kosmo Training Eval Row Template

Generated: 2026-06-16T05:26:46.136Z
Status: `training_eval_row_template_ready`

## Summary

- Templates: 6
- Required fields: 10
- Suites from rubric: 6
- Criteria from rubric: 24
- Writes eval rows now: 0
- Writes training data now: 0
- Public-ready after template: 0

## Templates

- `source_grounding_provenance`: 10 required fields, public-ready 0
- `architectural_analysis_depth`: 10 required fields, public-ready 0
- `asset_schema_quality`: 10 required fields, public-ready 0
- `retrieval_answer_quality`: 10 required fields, public-ready 0
- `local_worker_output_review`: 10 required fields, public-ready 0
- `kosmo_architecture_identity`: 10 required fields, public-ready 0

## Hard Stops

- Do not place private source text into eval rows.
- Do not place OCR/PDF bodies into eval rows.
- Do not place local worker output bodies into eval rows.
- Do not create embeddings or fine-tunes from templates.
- Keep public_ready false.
