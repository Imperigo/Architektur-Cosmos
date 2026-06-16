# Kosmo Innovation GitHub Worker Adapter Boundary Contract

Generated: 2026-06-16T17:46:40.537Z
Status: `innovation_github_worker_adapter_boundary_contract_ready`

## Summary

- Selected fixture: `worker_integration-mac999-bim-llm-code-agent-signal-fixture`
- Selected source repo: mac999/BIM_LLM_code_agent
- Signal score: 5
- Allowed command shapes: 3
- Blocked actions: 18
- Runtime enabled now: 0
- Adapter files written now: 0
- Public-ready after contract: 0
- Failures: 0

## Allowed Command Shapes

- `parse_synthetic_fixture_manifest`: synthetic_fixture_manifest_v0 -> worker_review_gate_report_v0, executable now no
- `summarize_generated_ifc_rag_trace`: generated_ifc_rag_trace_stub_v0 -> bim_rag_signal_summary_v0, executable now no
- `validate_worker_output_metadata`: local_worker_output_metadata_only_v0 -> overseer_review_decision_candidate_v0, executable now no

## Required Review Gates

- `synthetic_fixture_only_gate`
- `no_private_content_gate`
- `no_github_code_or_readme_copy_gate`
- `runtime_scope_guard`
- `human_overseer_review_gate`
- `separate_launch_apply_guard`

## Hard Stops

- This contract never clones GitHub repositories.
- This contract never installs dependencies or downloads models.
- This contract never runs discovered code.
- This contract never reads private Source Root, OneDrive or archive-library content.
- This contract never copies GitHub code or README text into Git.
- This contract never writes runtime adapter files or executes local workers.
- This contract never promotes training rows or public-ready state.
