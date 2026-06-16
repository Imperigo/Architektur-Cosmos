# Kosmo Local Worker Innovation Conversion Apply Guard Check

Generated: 2026-06-16T05:28:11.973Z
Status: `local_worker_innovation_conversion_apply_guard_guard_passed`

## Summary

- Checks: 31/31
- Failures: 0
- Guard status: local_worker_innovation_conversion_apply_guard_ready
- Mode: waiting_for_positive_review_decisions
- Apply allowed after guard: no
- Public-ready after check: 0

## Checks

- passed: `status_ready` - local_worker_innovation_conversion_apply_guard_ready
- passed: `mode_guarded` - waiting_for_positive_review_decisions
- passed: `policy_guard_only` - true
- passed: `policy_no_apply_now` - false
- passed: `policy_no_conversion_now` - false
- passed: `policy_no_private_reads` - false
- passed: `policy_no_worker_execution` - false
- passed: `policy_no_model_start` - false
- passed: `policy_no_body_copy` - {"guard_only":true,"applies_conversion_now":false,"executes_conversions_now":false,"reads_private_sources_now":false,"executes_local_workers_now":false,"starts_models_now":false,"copies_worker_output_body_now":false,"copies_worker_recommendation_text_now":false,"writes_repo_derivatives_now":false,"promotes_training_rows_now":false,"public_ready_after_guard":0}
- passed: `policy_no_repo_derivatives` - false
- passed: `policy_no_training` - false
- passed: `public_ready_zero` - 0
- passed: `conversions_zero` - 0
- passed: `repo_outputs_zero` - 0
- passed: `training_zero` - 0
- passed: `body_copy_zero` - {"mode":"waiting_for_positive_review_decisions","answer_present":false,"exact_reply_valid":false,"eligible_candidates":0,"apply_allowed_after_guard":false,"conversions_executed_now":0,"repo_outputs_written_now":0,"training_rows_promoted_now":0,"worker_output_bodies_copied_now":0,"worker_recommendation_text_copied_now":0,"public_ready_after_guard":0,"readiness_failures":0,"reply_failures":0,"failures":0}
- passed: `apply_flag_consistent` - false/false
- passed: `waiting_positive_has_no_apply` - false
- passed: `ready_requires_exact_reply` - waiting_for_positive_review_decisions
- passed: `required_choice` - local_worker_conversion_plan_choice=approve_separate_conversion_apply_later candidate_task_id=<task_id> confirmed_human_overseer_decision=yes confirmed_validator_guard_passed=yes confirmed_no_private_content=yes confirmed_no_worker_body_copy=yes confirmed_public_ready_false=yes note=Nur separaten Conversion-Apply-Guard vorbereiten, keine direkte Uebernahme.
- passed: `required_candidate` - local_worker_conversion_plan_choice=approve_separate_conversion_apply_later candidate_task_id=<task_id> confirmed_human_overseer_decision=yes confirmed_validator_guard_passed=yes confirmed_no_private_content=yes confirmed_no_worker_body_copy=yes confirmed_public_ready_false=yes note=Nur separaten Conversion-Apply-Guard vorbereiten, keine direkte Uebernahme.
- passed: `required_human_overseer` - local_worker_conversion_plan_choice=approve_separate_conversion_apply_later candidate_task_id=<task_id> confirmed_human_overseer_decision=yes confirmed_validator_guard_passed=yes confirmed_no_private_content=yes confirmed_no_worker_body_copy=yes confirmed_public_ready_false=yes note=Nur separaten Conversion-Apply-Guard vorbereiten, keine direkte Uebernahme.
- passed: `required_validator` - local_worker_conversion_plan_choice=approve_separate_conversion_apply_later candidate_task_id=<task_id> confirmed_human_overseer_decision=yes confirmed_validator_guard_passed=yes confirmed_no_private_content=yes confirmed_no_worker_body_copy=yes confirmed_public_ready_false=yes note=Nur separaten Conversion-Apply-Guard vorbereiten, keine direkte Uebernahme.
- passed: `required_no_private` - local_worker_conversion_plan_choice=approve_separate_conversion_apply_later candidate_task_id=<task_id> confirmed_human_overseer_decision=yes confirmed_validator_guard_passed=yes confirmed_no_private_content=yes confirmed_no_worker_body_copy=yes confirmed_public_ready_false=yes note=Nur separaten Conversion-Apply-Guard vorbereiten, keine direkte Uebernahme.
- passed: `required_no_body_copy` - local_worker_conversion_plan_choice=approve_separate_conversion_apply_later candidate_task_id=<task_id> confirmed_human_overseer_decision=yes confirmed_validator_guard_passed=yes confirmed_no_private_content=yes confirmed_no_worker_body_copy=yes confirmed_public_ready_false=yes note=Nur separaten Conversion-Apply-Guard vorbereiten, keine direkte Uebernahme.
- passed: `required_public_false` - local_worker_conversion_plan_choice=approve_separate_conversion_apply_later candidate_task_id=<task_id> confirmed_human_overseer_decision=yes confirmed_validator_guard_passed=yes confirmed_no_private_content=yes confirmed_no_worker_body_copy=yes confirmed_public_ready_false=yes note=Nur separaten Conversion-Apply-Guard vorbereiten, keine direkte Uebernahme.
- passed: `hard_stop_no_conversion` - this guard never executes conversions. this guard never writes repo derivatives. this guard never copies worker output bodies or recommendation text into git. this guard never promotes training rows. this guard never marks public-ready. this guard never reads private source root, onedrive or archive-library content.
- passed: `hard_stop_no_repo_derivatives` - this guard never executes conversions. this guard never writes repo derivatives. this guard never copies worker output bodies or recommendation text into git. this guard never promotes training rows. this guard never marks public-ready. this guard never reads private source root, onedrive or archive-library content.
- passed: `hard_stop_no_body_copy` - this guard never executes conversions. this guard never writes repo derivatives. this guard never copies worker output bodies or recommendation text into git. this guard never promotes training rows. this guard never marks public-ready. this guard never reads private source root, onedrive or archive-library content.
- passed: `hard_stop_no_training_public` - this guard never executes conversions. this guard never writes repo derivatives. this guard never copies worker output bodies or recommendation text into git. this guard never promotes training rows. this guard never marks public-ready. this guard never reads private source root, onedrive or archive-library content.
- passed: `hard_stop_no_private` - this guard never executes conversions. this guard never writes repo derivatives. this guard never copies worker output bodies or recommendation text into git. this guard never promotes training rows. this guard never marks public-ready. this guard never reads private source root, onedrive or archive-library content.
