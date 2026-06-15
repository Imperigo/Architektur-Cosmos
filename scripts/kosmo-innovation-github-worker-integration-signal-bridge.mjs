#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  readmeSignalScan: resolve(root, args.readmeSignalScan || `data/kosmo-innovation-github-readme-signal-scan-${dateStamp}.json`),
  fixtureContractPlan: resolve(root, args.fixtureContractPlan || `data/kosmo-innovation-github-fixture-contract-plan-${dateStamp}.json`),
  fixturePayloadSmoke: resolve(root, args.fixturePayloadSmoke || `data/kosmo-innovation-github-fixture-payload-smoke-${dateStamp}.json`),
  todayLoopPlan: resolve(root, args.todayLoopPlan || `data/kosmo-today-loop-plan-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-integration-signal-bridge-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-integration-signal-bridge-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const bridge = buildBridge(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(bridge, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(bridge));

  console.log('Kosmo innovation GitHub worker integration signal bridge');
  console.log(`Status: ${bridge.status}`);
  console.log(`Candidates: ${bridge.summary.worker_integration_candidates}`);
  console.log(`Top signal score: ${bridge.summary.top_signal_score}`);
  console.log(`Executable now: ${bridge.summary.executable_now}`);
  console.log(`Public-ready after bridge: ${bridge.summary.public_ready_after_bridge}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildBridge(reports) {
  const failures = [];
  if (reports.readmeSignalScan.status !== 'innovation_github_readme_signal_scan_ready') failures.push(`README signal scan not ready: ${reports.readmeSignalScan.status}`);
  if (reports.fixtureContractPlan.status !== 'innovation_github_fixture_contract_plan_ready') failures.push(`Fixture contract plan not ready: ${reports.fixtureContractPlan.status}`);
  if (reports.fixturePayloadSmoke.status !== 'innovation_github_fixture_payload_smoke_passed') failures.push(`Fixture payload smoke not passed: ${reports.fixturePayloadSmoke.status}`);

  const readmeByRepo = new Map((reports.readmeSignalScan.scanned_items || []).map((item) => [item.repo, item]));
  const workerPlans = (reports.fixtureContractPlan.contract_plans || [])
    .filter((plan) => plan.target_lane === 'worker_integration')
    .sort((left, right) => Number(right.signal_score || 0) - Number(left.signal_score || 0))
    .map((plan, index) => {
      const scan = readmeByRepo.get(plan.source_repo) || {};
      return {
        id: `worker-integration-signal-${String(index + 1).padStart(2, '0')}`,
        source_repo: plan.source_repo,
        source_url: plan.source_url,
        fixture_id: plan.fixture_id,
        signal_score: plan.signal_score,
        source_lane: plan.source_lane,
        target_lane: plan.target_lane,
        readme_available: scan.readme?.available === true,
        copied_readme_text_now: false,
        copied_github_code_now: false,
        mapped_future_capabilities: [
          'local_worker_command_boundary',
          'bim_ifc_runtime_scope_guard',
          'rag_graph_retrieval_contract_review'
        ],
        next_safe_actions: [
          'Create a source-free command-boundary adapter contract.',
          'Map allowed local worker input/output JSON only.',
          'Keep clone/install/run/model-download actions blocked until separate reviewed runtime batch.'
        ],
        blocked_actions: [
          'clone_repository',
          'install_dependencies',
          'download_models',
          'run_discovered_code',
          'read_private_content',
          'copy_readme_text',
          'copy_github_code',
          'promote_public_ready'
        ],
        public_ready_after_candidate: 0
      };
    });

  const topSignalScore = Math.max(0, ...workerPlans.map((plan) => Number(plan.signal_score || 0)));
  const ready = failures.length === 0;

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: ready
      ? 'innovation_github_worker_integration_signal_bridge_ready'
      : 'innovation_github_worker_integration_signal_bridge_needs_review',
    policy: {
      bridge_only: true,
      metadata_only: true,
      public_repo_signals_only: true,
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
      public_ready_after_bridge: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      worker_integration_candidates: workerPlans.length,
      top_signal_score: topSignalScore,
      high_signal_candidates: workerPlans.filter((plan) => Number(plan.signal_score || 0) >= 4).length,
      today_loop_blocks: reports.todayLoopPlan.work_blocks?.length ?? null,
      executable_now: 0,
      adapter_contracts_written_now: 0,
      runtime_commands_enabled_now: 0,
      training_rows_promoted_now: 0,
      public_ready_after_bridge: 0,
      failures: failures.length
    },
    candidate_bridges: workerPlans,
    recommended_next_contract: workerPlans[0]
      ? {
          source_repo: workerPlans[0].source_repo,
          fixture_id: workerPlans[0].fixture_id,
          reason: 'Highest public metadata signal for BIM/RAG/IFC local worker command-boundary design.',
          contract_goal: 'Define a source-free adapter boundary before any runtime implementation.'
        }
      : null,
    hard_stops: [
      'This bridge never clones GitHub repositories.',
      'This bridge never installs dependencies or downloads models.',
      'This bridge never runs discovered code.',
      'This bridge never reads private Source Root, OneDrive or archive-library content.',
      'This bridge never copies GitHub code or README text into Git.',
      'This bridge never enables runtime adapters, local workers, training rows or public-ready state.'
    ],
    failures
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(bridge) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Worker Integration Signal Bridge');
  lines.push('');
  lines.push(`Generated: ${bridge.generated_at}`);
  lines.push(`Status: \`${bridge.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Worker integration candidates: ${bridge.summary.worker_integration_candidates}`);
  lines.push(`- Top signal score: ${bridge.summary.top_signal_score}`);
  lines.push(`- High signal candidates: ${bridge.summary.high_signal_candidates}`);
  lines.push(`- Executable now: ${bridge.summary.executable_now}`);
  lines.push(`- Adapter contracts written now: ${bridge.summary.adapter_contracts_written_now}`);
  lines.push(`- Public-ready after bridge: ${bridge.summary.public_ready_after_bridge}`);
  lines.push(`- Failures: ${bridge.summary.failures}`);
  lines.push('');
  lines.push('## Candidate Bridges');
  lines.push('');
  if (bridge.candidate_bridges.length === 0) lines.push('- None.');
  else {
    bridge.candidate_bridges.forEach((candidate) => {
      lines.push(`- \`${candidate.id}\`: ${candidate.source_repo}, signal ${candidate.signal_score}, fixture \`${candidate.fixture_id}\``);
    });
  }
  lines.push('');
  lines.push('## Recommended Next Contract');
  lines.push('');
  if (bridge.recommended_next_contract) {
    lines.push(`- Source repo: ${bridge.recommended_next_contract.source_repo}`);
    lines.push(`- Fixture: \`${bridge.recommended_next_contract.fixture_id}\``);
    lines.push(`- Goal: ${bridge.recommended_next_contract.contract_goal}`);
  } else {
    lines.push('- None.');
  }
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  bridge.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (bridge.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    bridge.failures.forEach((failure) => lines.push(`- ${failure}`));
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
