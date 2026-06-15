#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const bridgePath = resolve(root, args.bridge || `data/kosmo-innovation-github-worker-integration-signal-bridge-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-integration-signal-bridge-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-integration-signal-bridge-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const bridge = JSON.parse(await readFile(bridgePath, 'utf8'));
  const checks = buildChecks(bridge);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_integration_signal_bridge_guard_passed'
      : 'innovation_github_worker_integration_signal_bridge_guard_failed',
    policy: {
      validates_bridge_only: true,
      reads_private_content_now: false,
      clones_or_installs_now: false,
      runs_discovered_code_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, bridgePath)],
    summary: {
      bridge_status: bridge.status,
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      candidates: bridge.summary?.worker_integration_candidates ?? null,
      top_signal_score: bridge.summary?.top_signal_score ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub worker integration signal bridge check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Candidates: ${report.summary.candidates}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(bridge) {
  const hardStops = (bridge.hard_stops || []).join(' ').toLowerCase();
  const sourceRefs = (bridge.source_refs || []).join(' ');
  return [
    check('status_ready', bridge.status === 'innovation_github_worker_integration_signal_bridge_ready', bridge.status),
    check('policy_bridge_only', bridge.policy?.bridge_only === true, bridge.policy?.bridge_only),
    check('policy_metadata_only', bridge.policy?.metadata_only === true, bridge.policy?.metadata_only),
    check('policy_public_repo_signals_only', bridge.policy?.public_repo_signals_only === true, bridge.policy?.public_repo_signals_only),
    check('policy_no_code_or_readme_copy', bridge.policy?.copies_github_code_now === false && bridge.policy?.copies_readme_text_now === false, JSON.stringify(bridge.policy)),
    check('policy_no_clone_install_download', bridge.policy?.clones_repositories_now === false && bridge.policy?.installs_dependencies_now === false && bridge.policy?.downloads_models_now === false, JSON.stringify(bridge.policy)),
    check('policy_no_run_private', bridge.policy?.runs_discovered_code_now === false && bridge.policy?.reads_private_content_now === false, JSON.stringify(bridge.policy)),
    check('policy_no_runtime_adapter_now', bridge.policy?.writes_runtime_adapter_now === false && bridge.policy?.executes_local_workers_now === false && bridge.policy?.starts_models_now === false, JSON.stringify(bridge.policy)),
    check('policy_no_training', bridge.policy?.promotes_training_rows_now === false, bridge.policy?.promotes_training_rows_now),
    check('public_ready_zero', bridge.policy?.public_ready_after_bridge === 0 && bridge.summary?.public_ready_after_bridge === 0, bridge.summary?.public_ready_after_bridge),
    check('candidate_count', bridge.summary?.worker_integration_candidates >= 2, bridge.summary?.worker_integration_candidates),
    check('high_signal_count', bridge.summary?.high_signal_candidates >= 2, bridge.summary?.high_signal_candidates),
    check('top_signal_score', bridge.summary?.top_signal_score >= 5, bridge.summary?.top_signal_score),
    check('executable_zero', bridge.summary?.executable_now === 0 && bridge.summary?.runtime_commands_enabled_now === 0, JSON.stringify(bridge.summary)),
    check('adapter_contracts_zero', bridge.summary?.adapter_contracts_written_now === 0, bridge.summary?.adapter_contracts_written_now),
    check('training_zero', bridge.summary?.training_rows_promoted_now === 0, bridge.summary?.training_rows_promoted_now),
    check('candidate_lanes_worker_integration', (bridge.candidate_bridges || []).every((candidate) => candidate.target_lane === 'worker_integration'), (bridge.candidate_bridges || []).map((candidate) => candidate.target_lane).join(',')),
    check('candidate_blocks_runtime', (bridge.candidate_bridges || []).every((candidate) => (candidate.blocked_actions || []).includes('run_discovered_code') && (candidate.blocked_actions || []).includes('install_dependencies')), 'blocked actions'),
    check('candidate_no_copy', (bridge.candidate_bridges || []).every((candidate) => candidate.copied_readme_text_now === false && candidate.copied_github_code_now === false), 'no copy flags'),
    check('recommended_next_contract_present', Boolean(bridge.recommended_next_contract?.fixture_id), bridge.recommended_next_contract?.fixture_id),
    check('source_refs_complete', sourceRefs.includes('readme-signal-scan') && sourceRefs.includes('fixture-contract-plan') && sourceRefs.includes('fixture-payload-smoke'), sourceRefs),
    check('hard_stop_no_clone', hardStops.includes('never clones'), hardStops),
    check('hard_stop_no_install_download', hardStops.includes('installs dependencies') && hardStops.includes('downloads models'), hardStops),
    check('hard_stop_no_run', hardStops.includes('never runs discovered code'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_no_copy', hardStops.includes('never copies github code') && hardStops.includes('readme text'), hardStops),
    check('hard_stop_no_runtime_public', hardStops.includes('runtime adapters') && hardStops.includes('public-ready'), hardStops)
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
  lines.push('# Kosmo Innovation GitHub Worker Integration Signal Bridge Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Bridge status: ${report.summary.bridge_status}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Candidates: ${report.summary.candidates}`);
  lines.push(`- Top signal score: ${report.summary.top_signal_score}`);
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
