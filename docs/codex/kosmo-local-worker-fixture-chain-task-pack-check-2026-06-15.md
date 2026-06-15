# Kosmo Local Worker Fixture Chain Task Pack Check

Generated: 2026-06-15T16:45:33.936Z
Status: `local_worker_fixture_chain_task_pack_guard_passed`

## Summary

- Pack status: local_worker_fixture_chain_task_pack_ready
- Tasks: 8
- Legacy fixture-chain tasks: 3
- GitHub innovation tasks: 5
- GitHub payload refs: 10
- Training lanes: 3
- Ontology entity types: 6
- Ontology relation types: 6
- Executable now: 0
- Missing refs: 0
- Failures: 0
- Public-ready after check: 0

## Findings

- passed: `schema_version` - Pack schema_version must be 0.1.
- passed: `pack_ready` - Task pack must be ready.
- passed: `review_only` - Task pack must be review-only.
- passed: `fixture_only` - Task pack must be fixture-only.
- passed: `no_private_reads` - Task pack must not read private content.
- passed: `no_private_copies` - Task pack must not copy private content.
- passed: `does_not_start_models` - Task pack must not start models by itself.
- passed: `does_not_execute_now` - Task pack must not execute workers now.
- passed: `no_repo_conversion` - Task pack must not write repo outputs from workers.
- passed: `public_ready_zero` - Task pack must keep public-ready at 0.
- passed: `no_missing_refs` - Task pack must have no missing input refs.
- passed: `no_executable_now` - No local worker task should execute now.
- passed: `eight_tasks` - Task pack must include three legacy fixture-chain tasks plus five GitHub innovation tasks.
- passed: `three_legacy_tasks` - Task pack must retain the three legacy fixture-chain tasks.
- passed: `five_github_innovation_tasks` - Task pack must include five source-free GitHub innovation tasks.
- passed: `ten_github_payload_refs` - Task pack must reference ten synthetic GitHub fixture payloads.
- passed: `training_lanes_present` - Task pack must carry at least three training eval lanes.
- passed: `ontology_entities_present` - Task pack must carry ontology entity bindings.
- passed: `ontology_relations_present` - Task pack must carry ontology relation bindings.
- passed: `all_runner_safe` - All fixture tasks must be runner-safe if explicitly started later.
- passed: `all_hold` - All fixture tasks must be hold/not execute now.
- passed: `github_worker_hold` - GitHub innovation tasks must hold local-worker execution.
- passed: `github_private_blocked` - GitHub innovation tasks must block private content.
- passed: `github_public_ready_zero` - GitHub innovation tasks must keep public-ready at 0.
- passed: `github_training_lane` - GitHub innovation tasks must carry training eval lanes.
- passed: `github_ontology_bindings` - GitHub innovation tasks must carry ontology bindings.
- passed: `github_payload_inputs` - GitHub innovation tasks must point to synthetic payload inputs.
- passed: `private_forbidden` - Forbidden actions must block private source reads.
- passed: `embedding_forbidden` - Forbidden actions must block embeddings/training.
- passed: `github_execution_forbidden` - Forbidden actions must block GitHub repo execution.
