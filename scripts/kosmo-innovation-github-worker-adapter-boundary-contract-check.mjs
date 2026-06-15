#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const contractPath = resolve(root, args.contract || `data/kosmo-innovation-github-worker-adapter-boundary-contract-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-adapter-boundary-contract-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-adapter-boundary-contract-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const contract = JSON.parse(await readFile(contractPath, 'utf8'));
  const checks = buildChecks(contract);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_adapter_boundary_contract_guard_passed'
      : 'innovation_github_worker_adapter_boundary_contract_guard_failed',
    policy: {
      validates_contract_only: true,
      reads_private_content_now: false,
      writes_runtime_adapter_now: false,
      executes_local_workers_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, contractPath)],
    summary: {
      contract_status: contract.status,
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      selected_fixture_id: contract.summary?.selected_fixture_id || null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub worker adapter boundary contract check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Fixture: ${report.summary.selected_fixture_id}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(contract) {
  const hardStops = (contract.hard_stops || []).join(' ').toLowerCase();
  const sourceRefs = (contract.source_refs || []).join(' ');
  const boundary = contract.adapter_boundary_contract || {};
  const commands = boundary.allowed_command_shapes || [];
  return [
    check('status_ready', contract.status === 'innovation_github_worker_adapter_boundary_contract_ready', contract.status),
    check('policy_contract_only', contract.policy?.contract_only === true, contract.policy?.contract_only),
    check('policy_source_free', contract.policy?.source_free === true && contract.policy?.synthetic_fixture_only === true, JSON.stringify(contract.policy)),
    check('policy_no_code_readme_copy', contract.policy?.copies_github_code_now === false && contract.policy?.copies_readme_text_now === false, JSON.stringify(contract.policy)),
    check('policy_no_clone_install_download', contract.policy?.clones_repositories_now === false && contract.policy?.installs_dependencies_now === false && contract.policy?.downloads_models_now === false, JSON.stringify(contract.policy)),
    check('policy_no_run_private', contract.policy?.runs_discovered_code_now === false && contract.policy?.reads_private_content_now === false, JSON.stringify(contract.policy)),
    check('policy_no_runtime_worker_model', contract.policy?.writes_runtime_adapter_now === false && contract.policy?.executes_local_workers_now === false && contract.policy?.starts_models_now === false, JSON.stringify(contract.policy)),
    check('policy_no_training_public', contract.policy?.promotes_training_rows_now === false && contract.policy?.public_ready_after_contract === 0, JSON.stringify(contract.policy)),
    check('contract_count', contract.summary?.adapter_boundary_contracts === 1, contract.summary?.adapter_boundary_contracts),
    check('selected_mac999_fixture', contract.summary?.selected_fixture_id === 'worker_integration-mac999-bim-llm-code-agent-signal-fixture', contract.summary?.selected_fixture_id),
    check('signal_score_high', contract.summary?.signal_score >= 5, contract.summary?.signal_score),
    check('allowed_command_shapes_min', commands.length >= 3 && contract.summary?.allowed_command_shapes === commands.length, commands.length),
    check('commands_not_executable', commands.every((command) => command.executable_now === false && command.network_allowed === false && command.private_content_allowed === false), JSON.stringify(commands)),
    check('expected_output_fields_present', (boundary.expected_output_fields || []).includes('public_ready') && (boundary.expected_output_fields || []).includes('blocked_actions_hit'), (boundary.expected_output_fields || []).join(',')),
    check('required_review_gates', (boundary.required_review_gates || []).includes('separate_launch_apply_guard') && (boundary.required_review_gates || []).includes('human_overseer_review_gate'), (boundary.required_review_gates || []).join(',')),
    check('blocked_actions_present', (boundary.blocked_actions || []).includes('clone_repository') && (boundary.blocked_actions || []).includes('execute_local_worker') && (boundary.blocked_actions || []).includes('filesystem_private_scan'), (boundary.blocked_actions || []).join(',')),
    check('promotion_rules_block_runtime', boundary.promotion_rules?.may_create_runtime_adapter_later === false && boundary.promotion_rules?.may_execute_local_worker_later === false, JSON.stringify(boundary.promotion_rules)),
    check('runtime_zero', contract.summary?.runtime_enabled_now === 0 && contract.summary?.adapter_files_written_now === 0 && contract.summary?.local_workers_executed_now === 0, JSON.stringify(contract.summary)),
    check('training_public_zero', contract.summary?.training_rows_promoted_now === 0 && contract.summary?.public_ready_after_contract === 0, JSON.stringify(contract.summary)),
    check('source_refs_complete', sourceRefs.includes('signal-bridge') && sourceRefs.includes('fixture-manifest') && sourceRefs.includes('synthetic_command_boundary') && sourceRefs.includes('synthetic_runtime_risk_matrix'), sourceRefs),
    check('hard_stop_no_clone', hardStops.includes('never clones'), hardStops),
    check('hard_stop_no_install_download', hardStops.includes('installs dependencies') && hardStops.includes('downloads models'), hardStops),
    check('hard_stop_no_run', hardStops.includes('never runs discovered code'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_no_copy', hardStops.includes('never copies github code') && hardStops.includes('readme text'), hardStops),
    check('hard_stop_no_runtime_worker', hardStops.includes('runtime adapter') && hardStops.includes('local workers'), hardStops),
    check('hard_stop_no_training_public', hardStops.includes('training rows') && hardStops.includes('public-ready'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Worker Adapter Boundary Contract Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Contract status: ${report.summary.contract_status}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Selected fixture: \`${report.summary.selected_fixture_id}\``);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((checkItem) => {
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${String(checkItem.evidence ?? '-')}`);
  });
  lines.push('');
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
