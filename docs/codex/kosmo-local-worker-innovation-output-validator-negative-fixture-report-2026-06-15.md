# Kosmo Local Worker Innovation Output Validator

Generated: 2026-06-15T17:06:56.109Z
Status: `local_worker_innovation_output_validator_needs_review`

## Summary

- Expected outputs: 5
- Present outputs: 5
- Parsed outputs: 5
- Missing outputs: 0
- Invalid JSON outputs: 0
- Required fields missing total: 0
- Policy mismatches: 5
- Training lane mismatches: 5
- Ontology binding mismatches: 5
- Forbidden term hits: 5
- Body copy allowed: no
- Repo conversion allowed now: 0
- Public-ready after validation: 0
- Failures: 4

## Files

| Task | Status | Bytes | JSON | Missing fields | Policy | Training | Ontology |
| --- | --- | ---: | --- | ---: | --- | --- | --- |
| `github-innovation-kosmo_prepare-sii-sc22mc-docfusion-signal-fixture` | present | 1173 | yes | 0 | no | no | no |
| `github-innovation-kosmo_asset-lee-agi-3d-model-base-signal-fixture` | present | 1170 | yes | 0 | no | no | no |
| `github-innovation-worker_integration-lfniederauer-blender-agentic-bonsai-sketcher-mcp-signal-fixture` | present | 1211 | yes | 0 | no | no | no |
| `github-innovation-kosmo_prepare-cherry1113-ocr-nlp-based-architectural-specification-document-key-information-retrieval-system-signal-fixture` | present | 1247 | yes | 0 | no | no | no |
| `github-innovation-worker_integration-mac999-bim-llm-code-agent-signal-fixture` | present | 1188 | yes | 0 | no | no | no |

## Hard Stops

- Do not copy worker output bodies into Git.
- Do not copy local-worker recommendation text into Git.
- Do not execute local workers from this validator.
- Do not promote training rows from validator output.
- Do not convert worker output into repo artifacts.
- Do not mark public-ready.

## Next Actions

- Review validator failures with Codex/Claude before any further use.
- Do not copy worker output bodies into repo artifacts.
- Keep repo conversion and public-ready blocked.

## Failures

- 5 worker outputs have policy mismatches.
- 5 worker outputs have training lane mismatches.
- 5 worker outputs have ontology binding mismatches.
- 5 forbidden term hits detected.
