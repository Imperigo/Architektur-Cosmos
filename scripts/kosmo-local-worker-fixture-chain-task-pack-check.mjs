#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const packPath = resolve(root, args.pack || `data/kosmo-local-worker-fixture-chain-task-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-fixture-chain-task-pack-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-fixture-chain-task-pack-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pack = JSON.parse(await readFile(packPath, 'utf8'));
  const findings = checkPack(pack);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_fixture_chain_task_pack_guard_passed'
      : 'local_worker_fixture_chain_task_pack_guard_failed',
    policy: {
      review_only: true,
      reads_private_content: false,
      starts_models: false,
      executes_workers_now: false,
      writes_repo_outputs_from_workers: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, packPath)],
    summary: {
      pack_status: pack.status,
      tasks: pack.tasks?.length ?? 0,
      legacy_fixture_chain_tasks: pack.summary?.legacy_fixture_chain_tasks ?? null,
      github_innovation_tasks: pack.summary?.github_innovation_tasks ?? null,
      github_payload_refs: pack.summary?.github_payload_refs ?? null,
      training_lanes: pack.summary?.training_lanes ?? null,
      ontology_entity_types: pack.summary?.ontology_entity_types ?? null,
      ontology_relation_types: pack.summary?.ontology_relation_types ?? null,
      executable_now: pack.summary?.executable_now ?? null,
      missing_refs: pack.summary?.missing_refs ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker fixture chain task pack check');
  console.log(`Status: ${report.status}`);
  console.log(`Tasks: ${report.summary.tasks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPack(pack) {
  const findings = [];
  expect(pack.schema_version === '0.1', findings, 'schema_version', 'Pack schema_version must be 0.1.');
  expect(pack.status === 'local_worker_fixture_chain_task_pack_ready', findings, 'pack_ready', 'Task pack must be ready.');
  expect(pack.policy?.review_only === true, findings, 'review_only', 'Task pack must be review-only.');
  expect(pack.policy?.fixture_only === true, findings, 'fixture_only', 'Task pack must be fixture-only.');
  expect(pack.policy?.reads_private_content === false, findings, 'no_private_reads', 'Task pack must not read private content.');
  expect(pack.policy?.copies_private_content === false, findings, 'no_private_copies', 'Task pack must not copy private content.');
  expect(pack.policy?.starts_models === false, findings, 'does_not_start_models', 'Task pack must not start models by itself.');
  expect(pack.policy?.executes_workers_now === false, findings, 'does_not_execute_now', 'Task pack must not execute workers now.');
  expect(pack.policy?.writes_repo_outputs_from_workers === false, findings, 'no_repo_conversion', 'Task pack must not write repo outputs from workers.');
  expect(pack.policy?.public_ready_after_pack === 0, findings, 'public_ready_zero', 'Task pack must keep public-ready at 0.');
  expect(pack.summary?.missing_refs === 0, findings, 'no_missing_refs', 'Task pack must have no missing input refs.');
  expect(pack.summary?.executable_now === 0, findings, 'no_executable_now', 'No local worker task should execute now.');
  expect(Array.isArray(pack.tasks) && pack.tasks.length === 8, findings, 'eight_tasks', 'Task pack must include three legacy fixture-chain tasks plus five GitHub innovation tasks.');
  expect(pack.summary?.legacy_fixture_chain_tasks === 3, findings, 'three_legacy_tasks', 'Task pack must retain the three legacy fixture-chain tasks.');
  expect(pack.summary?.github_innovation_tasks === 5, findings, 'five_github_innovation_tasks', 'Task pack must include five source-free GitHub innovation tasks.');
  expect(pack.summary?.github_payload_refs === 10, findings, 'ten_github_payload_refs', 'Task pack must reference ten synthetic GitHub fixture payloads.');
  expect(pack.summary?.training_lanes >= 3, findings, 'training_lanes_present', 'Task pack must carry at least three training eval lanes.');
  expect(pack.summary?.ontology_entity_types >= 3, findings, 'ontology_entities_present', 'Task pack must carry ontology entity bindings.');
  expect(pack.summary?.ontology_relation_types >= 3, findings, 'ontology_relations_present', 'Task pack must carry ontology relation bindings.');
  expect((pack.tasks || []).every((task) => task.runner_safe === true), findings, 'all_runner_safe', 'All fixture tasks must be runner-safe if explicitly started later.');
  expect((pack.tasks || []).every((task) => task.execute_now === false), findings, 'all_hold', 'All fixture tasks must be hold/not execute now.');
  expect((pack.tasks || []).filter((task) => task.task_id?.startsWith('github-innovation-')).every((task) => task.local_worker_allowed_now === false), findings, 'github_worker_hold', 'GitHub innovation tasks must hold local-worker execution.');
  expect((pack.tasks || []).filter((task) => task.task_id?.startsWith('github-innovation-')).every((task) => task.private_content_allowed === false), findings, 'github_private_blocked', 'GitHub innovation tasks must block private content.');
  expect((pack.tasks || []).filter((task) => task.task_id?.startsWith('github-innovation-')).every((task) => task.public_ready_after_task === 0), findings, 'github_public_ready_zero', 'GitHub innovation tasks must keep public-ready at 0.');
  expect((pack.tasks || []).filter((task) => task.task_id?.startsWith('github-innovation-')).every((task) => typeof task.training_eval_lane === 'string' && task.training_eval_lane.length > 0), findings, 'github_training_lane', 'GitHub innovation tasks must carry training eval lanes.');
  expect((pack.tasks || []).filter((task) => task.task_id?.startsWith('github-innovation-')).every((task) => Array.isArray(task.ontology_bindings?.entities) && task.ontology_bindings.entities.length > 0 && Array.isArray(task.ontology_bindings?.relations) && task.ontology_bindings.relations.length > 0), findings, 'github_ontology_bindings', 'GitHub innovation tasks must carry ontology bindings.');
  expect((pack.tasks || []).filter((task) => task.task_id?.startsWith('github-innovation-')).every((task) => (task.input_refs || []).some((ref) => ref.includes('/payloads/'))), findings, 'github_payload_inputs', 'GitHub innovation tasks must point to synthetic payload inputs.');
  expect((pack.forbidden_actions || []).some((action) => action.includes('Do not read private source folders')), findings, 'private_forbidden', 'Forbidden actions must block private source reads.');
  expect((pack.forbidden_actions || []).some((action) => action.includes('Do not generate embeddings')), findings, 'embedding_forbidden', 'Forbidden actions must block embeddings/training.');
  expect((pack.forbidden_actions || []).some((action) => action.includes('Do not run downloaded GitHub repositories')), findings, 'github_execution_forbidden', 'Forbidden actions must block GitHub repo execution.');
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Fixture Chain Task Pack Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pack status: ${report.summary.pack_status}`);
  lines.push(`- Tasks: ${report.summary.tasks}`);
  lines.push(`- Legacy fixture-chain tasks: ${report.summary.legacy_fixture_chain_tasks}`);
  lines.push(`- GitHub innovation tasks: ${report.summary.github_innovation_tasks}`);
  lines.push(`- GitHub payload refs: ${report.summary.github_payload_refs}`);
  lines.push(`- Training lanes: ${report.summary.training_lanes}`);
  lines.push(`- Ontology entity types: ${report.summary.ontology_entity_types}`);
  lines.push(`- Ontology relation types: ${report.summary.ontology_relation_types}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Missing refs: ${report.summary.missing_refs}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`));
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
