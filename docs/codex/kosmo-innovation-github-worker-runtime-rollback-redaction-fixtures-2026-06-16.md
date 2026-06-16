# Kosmo Innovation GitHub Worker Runtime Rollback Redaction Fixtures

Generated: 2026-06-16T17:48:07.041Z
Status: `innovation_github_worker_runtime_rollback_redaction_fixtures_ready`

## Summary

- Selected fixture: `worker_integration-mac999-bim-llm-code-agent-signal-fixture`
- Fixture groups: 3
- Redaction rules: 5
- Rollback steps: 5
- Runtime executed now: 0
- Rollback executed now: 0
- Public-ready after fixtures: 0
- Failures: 0

## Fixture Groups

- `redacted_log_shape_fixture`: Define safe runtime log shape before any runtime exists.
- `rollback_manifest_shape_fixture`: Define reversible runtime-batch manifest shape.
- `post_rollback_evidence_fixture`: Define evidence expected after rollback without keeping private/runtime payloads.

## Rollback Steps

- `stop_runtime_processes`: Stop model/server/worker processes started by the separate runtime batch.
- `remove_generated_runtime_outputs`: Remove generated runtime outputs from the runtime output root, leaving only redacted metadata logs.
- `restore_pre_runtime_config`: Restore config snapshots captured before runtime start.
- `invalidate_unreviewed_worker_outputs`: Mark worker outputs invalid until overseer review passes.
- `rerun_readiness_without_execution`: Rerun readiness, negative fixtures and log-redaction checks after rollback.

## Hard Stops

- These fixtures never execute runtime or rollback commands.
- These fixtures never start models or local workers.
- These fixtures never read private Source Root, OneDrive or archive-library content.
- These fixtures never write runtime outputs or worker outputs.
- These fixtures never copy secret values, worker output bodies, GitHub code or README text.
- These fixtures never promote public-ready state.
