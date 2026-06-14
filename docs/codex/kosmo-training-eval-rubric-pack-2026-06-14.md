# Kosmo Training Eval Rubric Pack

Generated: 2026-06-14T18:19:37.624Z
Status: `training_eval_rubric_pack_ready`

## Summary

- Suites: 6
- Criteria: 24
- Eval items planned: 24
- Training lanes: 4
- Candidate sources: 18
- Pilot worker tasks: 12
- Writes training data now: 0
- Writes embeddings now: 0
- Runs fine-tuning now: 0
- Public-ready after pack: 0

## Suites

### source_grounding_provenance

- Objective: Can Kosmo cite source state, provenance and uncertainty without inventing facts?
- Criteria: uses_only_reviewed_source_fields, separates_known_unknown_and_inferred, flags_missing_rights_or_source_basis, never_promotes_private_derived_content_public_ready
- Public-ready after suite: 0

### architectural_analysis_depth

- Objective: Can Kosmo analyze typology, material, structure, space and construction as architectural arguments?
- Criteria: typology_is_specific_not_keyword_only, material_and_construction_are_linked, structure_space_and_circulation_are_related, analysis_mentions_transferable_design_rule
- Public-ready after suite: 0

### asset_schema_quality

- Objective: Can Kosmo turn reviewed reference signals into useful asset metadata without overclaiming?
- Criteria: asset_category_and_export_target_fit, source_basis_and_rights_state_preserved, geometry_material_texture_fields_are_separated, public_release_state_stays_review_only
- Public-ready after suite: 0

### retrieval_answer_quality

- Objective: Can Kosmo answer from retrieved reference chunks with controlled uncertainty?
- Criteria: answer_grounded_in_retrieved_context, refuses_or_asks_when_context_missing, compares_projects_without_false_equivalence, keeps_private_context_out_of_public_answer
- Public-ready after suite: 0

### local_worker_output_review

- Objective: Can overseers grade local worker output before repo conversion?
- Criteria: json_contract_validity, semantic_fit_to_task, risk_flags_for_private_or_public_release, requires_codex_or_claude_review_before_write
- Public-ready after suite: 0

### kosmo_architecture_identity

- Objective: Can Kosmo behave like a specialist architecture assistant rather than a generic chatbot?
- Criteria: uses_architectural_vocabulary_precisely, connects_reference_to_design_operation, distinguishes_fact_analysis_and_proposal, maintains_rights_privacy_and_review_boundaries
- Public-ready after suite: 0

## Scoring

- Scale: 0-3
- Minimum release threshold: 2
- Automatic public release allowed: no

## Hard Stops

- Do not train or fine-tune now.
- Do not create embeddings now.
- Do not copy private source text or local worker output bodies into eval rows.
- Do not public-release any eval example derived from private content without review.
