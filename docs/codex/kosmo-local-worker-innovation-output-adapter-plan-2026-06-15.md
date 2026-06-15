# Kosmo Local Worker Innovation Output Adapter Plan

Generated: 2026-06-15T17:01:12.485Z
Status: `local_worker_innovation_output_adapter_plan_ready`

## Summary

- Adapters: 5
- Source smoke expected outputs: 5
- Smoke guard failures: 0
- Lanes: 3
- Training lanes: 3
- Metadata capture fields: 11
- Body copy allowed: no
- Repo conversion allowed now: 0
- Public-ready after plan: 0
- Failures: 0

## Adapters

| Adapter | Lane | Training lane | Read mode | Body to Git |
| --- | --- | --- | --- | --- |
| `adapter-github-innovation-kosmo_prepare-sii-sc22mc-docfusion-signal-fixture` | kosmo_prepare | source_extraction_review | json_schema_and_metadata_only | no |
| `adapter-github-innovation-kosmo_asset-lee-agi-3d-model-base-signal-fixture` | kosmo_asset | asset_candidate_review | json_schema_and_metadata_only | no |
| `adapter-github-innovation-worker_integration-lfniederauer-blender-agentic-bonsai-sketcher-mcp-signal-fixture` | worker_integration | worker_output_review | json_schema_and_metadata_only | no |
| `adapter-github-innovation-kosmo_prepare-cherry1113-ocr-nlp-based-architectural-specification-document-key-information-retrieval-system-signal-fixture` | kosmo_prepare | source_extraction_review | json_schema_and_metadata_only | no |
| `adapter-github-innovation-worker_integration-mac999-bim-llm-code-agent-signal-fixture` | worker_integration | worker_output_review | json_schema_and_metadata_only | no |

## Next Actions

- Implement a future metadata-only validator only after an actual local-worker fixture run exists.
- Validator output may store booleans, counts, ids and missing-field lists, but not worker body text.
- Keep Output Contract Review and human/overseer review before any repo conversion.
- Keep Source Root and private content blocked until exact owner unlock is present.

## Failures

- None.
