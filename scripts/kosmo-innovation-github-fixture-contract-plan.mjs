#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const scanPath = resolve(root, args.scan || `data/kosmo-innovation-github-readme-signal-scan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-fixture-contract-plan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-fixture-contract-plan-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const scan = JSON.parse(await readFile(scanPath, 'utf8'));
  const contractPlans = (scan.scanned_items || [])
    .filter((item) => item.signal_score >= 3)
    .map((item, index) => contractPlan(item, index));

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'innovation_github_fixture_contract_plan_ready',
    policy: {
      plan_only: true,
      synthetic_fixture_only: true,
      copies_github_code: false,
      stores_raw_readme_content: false,
      clones_repositories_now: false,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_discovered_code_now: false,
      reads_private_content: false,
      public_ready_after_plan: 0
    },
    source_refs: [relative(root, scanPath)],
    summary: {
      scanned_items: scan.summary?.scanned_items ?? null,
      high_signal_items: scan.summary?.high_signal_items ?? null,
      contract_plans: contractPlans.length,
      kosmo_prepare_plans: contractPlans.filter((item) => item.target_lane === 'kosmo_prepare').length,
      kosmo_asset_plans: contractPlans.filter((item) => item.target_lane === 'kosmo_asset').length,
      worker_integration_plans: contractPlans.filter((item) => item.target_lane === 'worker_integration').length,
      executable_now: 0,
      public_ready_after_plan: 0
    },
    contract_plans: contractPlans,
    next_safe_actions: [
      'Turn at most one contract plan per lane into a synthetic fixture skeleton in a separate review-only batch.',
      'Keep GitHub repositories as inspiration/source URLs only; do not copy code, data, README text or assets.',
      'Run fixture payload checks before connecting any plan to local workers.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub fixture contract plan');
  console.log(`Status: ${report.status}`);
  console.log(`Contract plans: ${report.summary.contract_plans}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function contractPlan(item, index) {
  const targetLane = targetLaneFor(item);
  const fixtureId = `${targetLane}-${slugify(item.repo)}-signal-fixture`;
  return {
    id: `github-fixture-plan-${String(index + 1).padStart(2, '0')}`,
    source_repo: item.repo,
    source_url: item.url,
    source_lane: item.lane,
    target_lane: targetLane,
    fixture_id: fixtureId,
    proposed_fixture_root: `examples/kosmo-innovation-fixtures/${fixtureId}/`,
    signal_score: item.signal_score,
    keyword_groups: Object.entries(item.keyword_hits || {})
      .filter(([, hits]) => Array.isArray(hits) && hits.length > 0)
      .map(([id, hits]) => ({ id, hits })),
    contract_goal: contractGoalFor(item, targetLane),
    allowed_inputs: allowedInputsFor(targetLane),
    expected_outputs: expectedOutputsFor(targetLane),
    guard_requirements: [
      'synthetic inputs only',
      'no GitHub code copied',
      'no README text copied',
      'no repository clone',
      'no dependency install',
      'no model download',
      'no private content',
      'human/overseer review before worker execution'
    ],
    execute_now: false,
    public_ready_after_plan: 0
  };
}

function targetLaneFor(item) {
  if (item.lane === 'kosmo_prepare') return 'kosmo_prepare';
  if (item.lane === 'kosmo_asset') return 'kosmo_asset';
  if (item.lane === 'ifc_reasoning' || item.lane === 'bim_rag_workers') return 'worker_integration';
  return 'innovation_research';
}

function contractGoalFor(item, targetLane) {
  if (targetLane === 'kosmo_prepare') return 'Define a synthetic document/OCR/layout parsing fixture contract inspired by public metadata signals.';
  if (targetLane === 'kosmo_asset') return 'Define a synthetic 3D retrieval or similarity-taxonomy fixture contract for KosmoAsset.';
  if (targetLane === 'worker_integration') return 'Define a command-boundary fixture for BIM/IFC/RAG worker orchestration without runtime execution.';
  return 'Define a source-free research fixture contract.';
}

function allowedInputsFor(targetLane) {
  if (targetLane === 'kosmo_prepare') return ['synthetic_pdf_manifest', 'generated_scan_stub', 'expected_layout_schema'];
  if (targetLane === 'kosmo_asset') return ['synthetic_asset_manifest', 'generated_geometry_stub', 'similarity_query_schema'];
  if (targetLane === 'worker_integration') return ['synthetic_command_registry', 'worker_boundary_matrix', 'expected_json_output_schema'];
  return ['synthetic_manifest', 'expected_output_schema'];
}

function expectedOutputsFor(targetLane) {
  if (targetLane === 'kosmo_prepare') return ['markdown_or_layout_manifest', 'ocr_signal_matrix', 'review_gate_report'];
  if (targetLane === 'kosmo_asset') return ['asset_feature_taxonomy', 'retrieval_eval_stub', 'review_gate_report'];
  if (targetLane === 'worker_integration') return ['command_contract', 'runtime_risk_matrix', 'review_gate_report'];
  return ['review_gate_report'];
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Fixture Contract Plan');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Scanned items: ${report.summary.scanned_items}`);
  lines.push(`- High-signal items: ${report.summary.high_signal_items}`);
  lines.push(`- Contract plans: ${report.summary.contract_plans}`);
  lines.push(`- KosmoPrepare plans: ${report.summary.kosmo_prepare_plans}`);
  lines.push(`- KosmoAsset plans: ${report.summary.kosmo_asset_plans}`);
  lines.push(`- Worker integration plans: ${report.summary.worker_integration_plans}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Public-ready after plan: ${report.summary.public_ready_after_plan}`);
  lines.push('');
  lines.push('## Contract Plans');
  lines.push('');
  lines.push('| ID | Source | Target | Fixture Root | Execute |');
  lines.push('| --- | --- | --- | --- | --- |');
  report.contract_plans.forEach((item) => {
    lines.push(`| \`${item.id}\` | [${item.source_repo}](${item.source_url}) | ${item.target_lane} | \`${item.proposed_fixture_root}\` | ${item.execute_now} |`);
  });
  lines.push('');
  lines.push('## Next Safe Actions');
  lines.push('');
  report.next_safe_actions.forEach((item) => lines.push(`- ${item}`));
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
