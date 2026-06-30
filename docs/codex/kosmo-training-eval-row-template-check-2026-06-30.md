# Kosmo Training Eval Row Template Check

Generated: 2026-06-30T07:09:03.926Z
Status: `training_eval_row_template_guard_passed`

## Summary

- Checks: 22/22
- Failures: 0
- Warnings: 0
- Public-ready after check: 0

## Checks

- passed: `status_ready` - training_eval_row_template_ready
- passed: `policy_template_only` - true
- passed: `policy_no_eval_rows_now` - false
- passed: `policy_no_training_now` - false
- passed: `policy_no_embeddings_now` - false
- passed: `policy_no_fine_tuning_now` - false
- passed: `policy_no_private_reads` - false
- passed: `policy_no_private_storage` - false
- passed: `public_ready_zero` - 0
- passed: `six_templates` - 6
- passed: `ten_required_fields` - 10
- passed: `rubric_suites_six` - 6
- passed: `rubric_criteria_twenty_four` - 24
- passed: `all_templates_no_rows` - 
- passed: `all_templates_public_ready_zero` - 
- passed: `all_row_stubs_not_public_ready` - 
- passed: `forbidden_fields_present` - raw_private_text,worker_output_body
- passed: `hard_stop_no_private_text` - do not place private source text into eval rows. do not place ocr/pdf bodies into eval rows. do not place local worker output bodies into eval rows. do not create embeddings or fine-tunes from templates. keep public_ready false.
- passed: `hard_stop_no_ocr_pdf` - do not place private source text into eval rows. do not place ocr/pdf bodies into eval rows. do not place local worker output bodies into eval rows. do not create embeddings or fine-tunes from templates. keep public_ready false.
- passed: `hard_stop_no_worker_body` - do not place private source text into eval rows. do not place ocr/pdf bodies into eval rows. do not place local worker output bodies into eval rows. do not create embeddings or fine-tunes from templates. keep public_ready false.
- passed: `hard_stop_no_embedding_finetune` - do not place private source text into eval rows. do not place ocr/pdf bodies into eval rows. do not place local worker output bodies into eval rows. do not create embeddings or fine-tunes from templates. keep public_ready false.
- passed: `hard_stop_public_ready_false` - do not place private source text into eval rows. do not place ocr/pdf bodies into eval rows. do not place local worker output bodies into eval rows. do not create embeddings or fine-tunes from templates. keep public_ready false.
