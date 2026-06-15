#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const fixtureId = args.fixtureId || 'worker_integration-mac999-bim-llm-code-agent-signal-fixture';

const refs = {
  signalBridge: resolve(root, args.signalBridge || `data/kosmo-innovation-github-worker-integration-signal-bridge-${dateStamp}.json`),
  signalBridgeCheck: resolve(root, args.signalBridgeCheck || `data/kosmo-innovation-github-worker-integration-signal-bridge-check-${dateStamp}.json`),
  fixtureManifest: resolve(root, args.fixtureManifest || `examples/kosmo-innovation-fixtures/${fixtureId}/fixture-manifest.json`),
  commandBoundaryPayload: resolve(root, args.commandBoundaryPayload || `examples/kosmo-innovation-fixtures/${fixtureId}/payloads/synthetic_command_boundary.fixture.json`),
  runtimeRiskPayload: resolve(root, args.runtimeRiskPayload || `examples/kosmo-innovation-fixtures/${fixtureId}/payloads/synthetic_runtime_risk_matrix.fixture.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-adapter-boundary-contract-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-adapter-boundary-contract-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const contract = buildContract(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(contract, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(contract));

  console.log('Kosmo innovation GitHub worker adapter boundary contract');
  console.log(`Status: ${contract.status}`);
  console.log(`Adapter contracts: ${contract.summary.adapter_boundary_contracts}`);
  console.log(`Allowed command shapes: ${contract.summary.allowed_command_shapes}`);
  console.log(`Runtime enabled now: ${contract.summary.runtime_enabled_now}`);
  console.log(`Public-ready after contract: ${contract.summary.public_ready_after_contract}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildContract(reports) {
  const failures = [];
  if (reports.signalBridge.status !== 'innovation_github_worker_integration_signal_bridge_ready') failures.push(`Signal bridge not ready: ${reports.signalBridge.status}`);
  if (reports.signalBridgeCheck.status !== 'innovation_github_worker_integration_signal_bridge_guard_passed') failures.push(`Signal bridge check not passed: ${reports.signalBridgeCheck.status}`);
  if (reports.fixtureManifest.fixture_id !== fixtureId) failures.push(`Fixture manifest mismatch: ${reports.fixtureManifest.fixture_id}`);
  if (reports.commandBoundaryPayload.policy?.copied_github_code !== false) failures.push('Command boundary payload must not copy GitHub code.');
  if (reports.runtimeRiskPayload.policy?.copied_readme_text !== false) failures.push('Runtime risk payload must not copy README text.');

  const selected = reports.signalBridge.candidate_bridges?.find((candidate) => candidate.fixture_id === fixtureId) ||
    reports.signalBridge.candidate_bridges?.[0] || null;
  if (!selected) failures.push('No selected worker integration candidate found.');

  const blockedActions = unique([
    ...(selected?.blocked_actions || []),
    ...(reports.runtimeRiskPayload.content?.blocked_actions || []),
    'network_access',
    'filesystem_private_scan',
    'write_runtime_adapter',
    'execute_local_worker',
    'promote_training_row'
  ]);

  const allowedCommandShapes = [
    {
      id: 'parse_synthetic_fixture_manifest',
      input_schema: 'synthetic_fixture_manifest_v0',
      output_schema: 'worker_review_gate_report_v0',
      network_allowed: false,
      private_content_allowed: false,
      executable_now: false
    },
    {
      id: 'summarize_generated_ifc_rag_trace',
      input_schema: 'generated_ifc_rag_trace_stub_v0',
      output_schema: 'bim_rag_signal_summary_v0',
      network_allowed: false,
      private_content_allowed: false,
      executable_now: false
    },
    {
      id: 'validate_worker_output_metadata',
      input_schema: 'local_worker_output_metadata_only_v0',
      output_schema: 'overseer_review_decision_candidate_v0',
      network_allowed: false,
      private_content_allowed: false,
      executable_now: false
    }
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_adapter_boundary_contract_ready'
      : 'innovation_github_worker_adapter_boundary_contract_needs_review',
    policy: {
      contract_only: true,
      source_free: true,
      synthetic_fixture_only: true,
      copies_github_code_now: false,
      copies_readme_text_now: false,
      clones_repositories_now: false,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_discovered_code_now: false,
      reads_private_content_now: false,
      writes_runtime_adapter_now: false,
      executes_local_workers_now: false,
      starts_models_now: false,
      promotes_training_rows_now: false,
      public_ready_after_contract: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      adapter_boundary_contracts: selected ? 1 : 0,
      selected_fixture_id: fixtureId,
      selected_source_repo: selected?.source_repo || null,
      signal_score: selected?.signal_score ?? null,
      allowed_command_shapes: allowedCommandShapes.length,
      blocked_actions: blockedActions.length,
      required_review_gates: 6,
      runtime_enabled_now: 0,
      adapter_files_written_now: 0,
      local_workers_executed_now: 0,
      training_rows_promoted_now: 0,
      public_ready_after_contract: 0,
      failures: failures.length
    },
    adapter_boundary_contract: {
      id: 'worker_integration_mac999_bim_llm_code_agent_boundary',
      source_repo: selected?.source_repo || reports.fixtureManifest.source_repo,
      source_url: selected?.source_url || reports.fixtureManifest.source_url,
      source_repo_is_reference_only: true,
      fixture_id: fixtureId,
      target_lane: 'worker_integration',
      future_capabilities: selected?.mapped_future_capabilities || [],
      allowed_command_shapes: allowedCommandShapes,
      expected_output_fields: [
        'status',
        'source_fixture_id',
        'provenance_state',
        'rights_state',
        'runtime_actions_requested',
        'blocked_actions_hit',
        'review_findings',
        'public_ready'
      ],
      required_review_gates: [
        'synthetic_fixture_only_gate',
        'no_private_content_gate',
        'no_github_code_or_readme_copy_gate',
        'runtime_scope_guard',
        'human_overseer_review_gate',
        'separate_launch_apply_guard'
      ],
      blocked_actions: blockedActions,
      promotion_rules: {
        may_create_runtime_adapter_later: false,
        may_execute_local_worker_later: false,
        requires_separate_runtime_batch: true,
        requires_dependency_install_batch_if_tools_needed: true,
        requires_source_root_gate_for_private_inputs: true,
        public_ready_after_contract: 0
      }
    },
    next_actions: [
      'Use this contract to shape a future local-worker adapter review, not a runtime adapter.',
      'Add negative fixtures before any runtime implementation is proposed.',
      'Keep mac999/BIM_LLM_code_agent as a source URL and metadata signal only.'
    ],
    hard_stops: [
      'This contract never clones GitHub repositories.',
      'This contract never installs dependencies or downloads models.',
      'This contract never runs discovered code.',
      'This contract never reads private Source Root, OneDrive or archive-library content.',
      'This contract never copies GitHub code or README text into Git.',
      'This contract never writes runtime adapter files or executes local workers.',
      'This contract never promotes training rows or public-ready state.'
    ],
    failures
  };
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(contract) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Worker Adapter Boundary Contract');
  lines.push('');
  lines.push(`Generated: ${contract.generated_at}`);
  lines.push(`Status: \`${contract.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Selected fixture: \`${contract.summary.selected_fixture_id}\``);
  lines.push(`- Selected source repo: ${contract.summary.selected_source_repo}`);
  lines.push(`- Signal score: ${contract.summary.signal_score}`);
  lines.push(`- Allowed command shapes: ${contract.summary.allowed_command_shapes}`);
  lines.push(`- Blocked actions: ${contract.summary.blocked_actions}`);
  lines.push(`- Runtime enabled now: ${contract.summary.runtime_enabled_now}`);
  lines.push(`- Adapter files written now: ${contract.summary.adapter_files_written_now}`);
  lines.push(`- Public-ready after contract: ${contract.summary.public_ready_after_contract}`);
  lines.push(`- Failures: ${contract.summary.failures}`);
  lines.push('');
  lines.push('## Allowed Command Shapes');
  lines.push('');
  contract.adapter_boundary_contract.allowed_command_shapes.forEach((command) => {
    lines.push(`- \`${command.id}\`: ${command.input_schema} -> ${command.output_schema}, executable now ${command.executable_now ? 'yes' : 'no'}`);
  });
  lines.push('');
  lines.push('## Required Review Gates');
  lines.push('');
  contract.adapter_boundary_contract.required_review_gates.forEach((gate) => lines.push(`- \`${gate}\``));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  contract.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (contract.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    contract.failures.forEach((failure) => lines.push(`- ${failure}`));
    lines.push('');
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
