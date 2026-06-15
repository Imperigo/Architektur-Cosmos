#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  boundaryContract: resolve(root, args.contract || `data/kosmo-innovation-github-worker-adapter-boundary-contract-${dateStamp}.json`),
  boundaryContractCheck: resolve(root, args.contractCheck || `data/kosmo-innovation-github-worker-adapter-boundary-contract-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-adapter-boundary-negative-fixtures-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-adapter-boundary-negative-fixtures-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const report = buildReport(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub worker adapter boundary negative fixtures');
  console.log(`Status: ${report.status}`);
  console.log(`Negative fixtures: ${report.summary.negative_fixtures}`);
  console.log(`Expected blocked: ${report.summary.expected_blocked}`);
  console.log(`Runtime executed now: ${report.summary.runtime_executed_now}`);
  console.log(`Public-ready after fixtures: ${report.summary.public_ready_after_fixtures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport(reports) {
  const failures = [];
  if (reports.boundaryContract.status !== 'innovation_github_worker_adapter_boundary_contract_ready') {
    failures.push(`Boundary contract not ready: ${reports.boundaryContract.status}`);
  }
  if (reports.boundaryContractCheck.status !== 'innovation_github_worker_adapter_boundary_contract_guard_passed') {
    failures.push(`Boundary contract check not passed: ${reports.boundaryContractCheck.status}`);
  }

  const contract = reports.boundaryContract.adapter_boundary_contract || {};
  const fixtures = [
    negativeFixture({
      id: 'private_path_placeholder_input',
      category: 'private_path',
      simulated_payload: {
        input_path: '<PRIVATE_SOURCE_ROOT>/architecture-books/protected-reference.pdf',
        requested_command_shape: 'parse_synthetic_fixture_manifest',
        private_content_allowed: true
      },
      expected_block_reasons: ['private_path_detected', 'private_content_flag_true']
    }),
    negativeFixture({
      id: 'runtime_clone_command',
      category: 'runtime_command',
      simulated_payload: {
        requested_command: 'git clone https://example.invalid/repo.git',
        requested_command_shape: 'summarize_generated_ifc_rag_trace',
        network_allowed: true
      },
      expected_block_reasons: ['clone_repository', 'network_access', 'unexpected_executable_command']
    }),
    negativeFixture({
      id: 'dependency_install_command',
      category: 'runtime_command',
      simulated_payload: {
        requested_command: 'pip install unreviewed-bim-package',
        requested_command_shape: 'summarize_generated_ifc_rag_trace'
      },
      expected_block_reasons: ['install_dependencies', 'unexpected_executable_command']
    }),
    negativeFixture({
      id: 'copied_readme_text_claim',
      category: 'readme_or_code_copy',
      simulated_payload: {
        copied_readme_text_now: true,
        source_repo_is_reference_only: false,
        requested_command_shape: 'validate_worker_output_metadata'
      },
      expected_block_reasons: ['copy_readme_text', 'source_repo_reference_only_violation']
    }),
    negativeFixture({
      id: 'copied_github_code_claim',
      category: 'readme_or_code_copy',
      simulated_payload: {
        copied_github_code_now: true,
        file_origin: 'github_source_file',
        requested_command_shape: 'validate_worker_output_metadata'
      },
      expected_block_reasons: ['copy_github_code', 'github_source_file_detected']
    }),
    negativeFixture({
      id: 'public_ready_false_positive',
      category: 'public_ready_false_positive',
      simulated_payload: {
        public_ready: true,
        rights_state: 'unknown',
        requested_command_shape: 'validate_worker_output_metadata'
      },
      expected_block_reasons: ['promote_public_ready', 'rights_state_unknown']
    }),
    negativeFixture({
      id: 'training_promotion_request',
      category: 'training_promotion',
      simulated_payload: {
        promote_training_row: true,
        training_lane: 'worker_output_review',
        human_overseer_review_gate: false
      },
      expected_block_reasons: ['promote_training_row', 'missing_human_overseer_review_gate']
    }),
    negativeFixture({
      id: 'missing_launch_apply_guard',
      category: 'review_gate_missing',
      simulated_payload: {
        runtime_adapter_requested: true,
        separate_launch_apply_guard: false,
        requested_command_shape: 'summarize_generated_ifc_rag_trace'
      },
      expected_block_reasons: ['write_runtime_adapter', 'execute_local_worker', 'missing_separate_launch_apply_guard']
    })
  ];

  const blockedActions = new Set(contract.blocked_actions || []);
  const allowedCommandIds = new Set((contract.allowed_command_shapes || []).map((command) => command.id));
  const categories = new Set(fixtures.map((fixture) => fixture.category));

  fixtures.forEach((fixture) => {
    if (fixture.expected_status !== 'blocked') failures.push(`Fixture ${fixture.id} must expect blocked status.`);
    if (!fixture.synthetic_only) failures.push(`Fixture ${fixture.id} must be synthetic only.`);
    if (fixture.simulated_payload?.requested_command_shape && !allowedCommandIds.has(fixture.simulated_payload.requested_command_shape)) {
      failures.push(`Fixture ${fixture.id} uses unknown command shape.`);
    }
  });

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_adapter_boundary_negative_fixtures_ready'
      : 'innovation_github_worker_adapter_boundary_negative_fixtures_needs_review',
    policy: {
      negative_fixtures_only: true,
      synthetic_payloads_only: true,
      reads_private_content_now: false,
      copies_github_code_now: false,
      copies_readme_text_now: false,
      clones_repositories_now: false,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_discovered_code_now: false,
      writes_runtime_adapter_now: false,
      executes_local_workers_now: false,
      promotes_training_rows_now: false,
      public_ready_after_fixtures: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      selected_fixture_id: reports.boundaryContract.summary?.selected_fixture_id || null,
      negative_fixtures: fixtures.length,
      expected_blocked: fixtures.filter((fixture) => fixture.expected_status === 'blocked').length,
      categories: categories.size,
      contract_blocked_actions: blockedActions.size,
      runtime_executed_now: 0,
      adapter_files_written_now: 0,
      local_workers_executed_now: 0,
      training_rows_promoted_now: 0,
      public_ready_after_fixtures: 0,
      failures: failures.length
    },
    required_categories: [
      'private_path',
      'runtime_command',
      'readme_or_code_copy',
      'public_ready_false_positive',
      'training_promotion',
      'review_gate_missing'
    ],
    negative_fixtures: fixtures,
    next_actions: [
      'Use these cases to harden future runtime adapter review before any implementation.',
      'Keep all negative fixture payloads synthetic and metadata-only.',
      'Do not convert this fixture pack into runtime execution without a separate apply guard.'
    ],
    hard_stops: [
      'These negative fixtures never read private Source Root, OneDrive or archive-library content.',
      'These negative fixtures never clone repositories, install dependencies or download models.',
      'These negative fixtures never run discovered code or local workers.',
      'These negative fixtures never copy GitHub code or README text into Git.',
      'These negative fixtures never write runtime adapter files.',
      'These negative fixtures never promote training rows or public-ready state.'
    ],
    failures
  };
}

function negativeFixture({ id, category, simulated_payload, expected_block_reasons }) {
  return {
    id,
    category,
    synthetic_only: true,
    copied_private_content_now: false,
    copied_github_code_now: false,
    copied_readme_text_now: false,
    executed_now: false,
    expected_status: 'blocked',
    simulated_payload,
    expected_block_reasons,
    public_ready_after_fixture: 0
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Worker Adapter Boundary Negative Fixtures');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Selected fixture: \`${report.summary.selected_fixture_id}\``);
  lines.push(`- Negative fixtures: ${report.summary.negative_fixtures}`);
  lines.push(`- Expected blocked: ${report.summary.expected_blocked}`);
  lines.push(`- Categories: ${report.summary.categories}`);
  lines.push(`- Runtime executed now: ${report.summary.runtime_executed_now}`);
  lines.push(`- Adapter files written now: ${report.summary.adapter_files_written_now}`);
  lines.push(`- Public-ready after fixtures: ${report.summary.public_ready_after_fixtures}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Negative Fixtures');
  lines.push('');
  report.negative_fixtures.forEach((fixture) => {
    lines.push(`- \`${fixture.id}\`: ${fixture.category}, expected ${fixture.expected_status}, reasons ${fixture.expected_block_reasons.join(', ')}`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (report.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    report.failures.forEach((failure) => lines.push(`- ${failure}`));
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
