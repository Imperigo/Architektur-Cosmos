#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const roadmapPath = resolve(root, args.roadmap || `data/kosmo-vision-completion-roadmap-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-vision-completion-roadmap-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-vision-completion-roadmap-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const roadmap = await readJson(roadmapPath);
  const checks = buildChecks(roadmap);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'vision_completion_roadmap_guard_passed'
      : 'vision_completion_roadmap_guard_failed',
    policy: {
      validates_roadmap_only: true,
      reads_private_content: false,
      records_owner_decisions: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, roadmapPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      warnings: 0,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo vision completion roadmap check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(roadmap) {
  const phaseById = new Map((roadmap.phases || []).map((phase) => [phase.id, phase]));
  const phaseOne = phaseById.get('phase_1_owner_unlock');
  const phaseSix = phaseById.get('phase_6_kosmo_training_memory');
  return [
    check('status_ready', roadmap.status === 'vision_completion_roadmap_ready', roadmap.status),
    check('policy_review_only', roadmap.policy?.review_only === true, roadmap.policy?.review_only),
    check('policy_plan_only', roadmap.policy?.strategic_plan_only === true, roadmap.policy?.strategic_plan_only),
    check('policy_no_private_reads', roadmap.policy?.reads_private_content === false, roadmap.policy?.reads_private_content),
    check('policy_no_decisions', roadmap.policy?.records_owner_decisions === false, roadmap.policy?.records_owner_decisions),
    check('policy_no_inventory_now', roadmap.policy?.runs_private_inventory_now === false, roadmap.policy?.runs_private_inventory_now),
    check('public_ready_zero', roadmap.summary?.public_ready_after_roadmap === 0, roadmap.summary?.public_ready_after_roadmap),
    check('six_phases', roadmap.summary?.phases === 6, roadmap.summary?.phases),
    check('owner_unlock_checkpoint_11_components', roadmap.summary?.owner_unlock_components_ready === 11 && roadmap.summary?.owner_unlock_components === 11, `${roadmap.summary?.owner_unlock_components_ready}/${roadmap.summary?.owner_unlock_components}`),
    check('owner_unlock_checkpoint_113_guards', roadmap.summary?.owner_unlock_guard_checks_passed === 113 && roadmap.summary?.owner_unlock_guard_checks === 113, `${roadmap.summary?.owner_unlock_guard_checks_passed}/${roadmap.summary?.owner_unlock_guard_checks}`),
    check('owner_unlock_handoff_current', roadmap.summary?.owner_unlock_latest_handoff_max >= 187, roadmap.summary?.owner_unlock_latest_handoff_max),
    check('source_free_tasks_zero', roadmap.summary?.source_free_codex_tasks_remaining === 0, roadmap.summary?.source_free_codex_tasks_remaining),
    check('phase_1_status_uses_dry_run', phaseOne?.status === 'dry_run_pipeline_ready_blocked_by_owner_reply', phaseOne?.status),
    check('phase_1_gate_dry_run', (phaseOne?.gates || []).includes('owner_unlock_answer_dry_run'), (phaseOne?.gates || []).join(',')),
    check('phase_1_codex_now_mentions_dry_run', (phaseOne?.codex_now || []).join(' ').includes('owner-unlock-answer-dry-run'), (phaseOne?.codex_now || []).join(' ')),
    check('training_templates_ready', roadmap.summary?.training_eval_templates === 6 && roadmap.summary?.training_eval_required_fields === 10, `${roadmap.summary?.training_eval_templates}/${roadmap.summary?.training_eval_required_fields}`),
    check('training_review_queue_ready', roadmap.summary?.training_review_lanes === 5 && roadmap.summary?.training_review_queue_states === 6, `${roadmap.summary?.training_review_lanes}/${roadmap.summary?.training_review_queue_states}`),
    check('ontology_seed_ready', roadmap.summary?.ontology_entity_types === 8 && roadmap.summary?.ontology_relation_types === 10 && roadmap.summary?.ontology_facet_groups === 6, `${roadmap.summary?.ontology_entity_types}/${roadmap.summary?.ontology_relation_types}/${roadmap.summary?.ontology_facet_groups}`),
    check('phase_6_status_training_scaffold', phaseSix?.status === 'training_scaffold_ready_blocked_by_verified_data', phaseSix?.status),
    check('phase_6_mentions_owner_training_gate', (phaseSix?.gates || []).includes('owner training gate'), (phaseSix?.gates || []).join(',')),
    check('phase_6_blocks_queue_eval_embedding_finetune', (phaseSix?.codex_now || []).join(' ').includes('queue items, eval rows, embeddings and fine-tunes at 0'), (phaseSix?.codex_now || []).join(' ')),
    check('all_phases_public_ready_zero', (roadmap.phases || []).every((phase) => phase.public_ready_after_phase === 0), (roadmap.phases || []).filter((phase) => phase.public_ready_after_phase !== 0).map((phase) => phase.id).join(',')),
    check('tonight_batch_uses_unlock_prompt', (roadmap.tonight_batch || []).join(' ').includes('Owner Unlock Prompt'), (roadmap.tonight_batch || []).join(' ')),
    check('tonight_batch_blocks_training_execution', (roadmap.tonight_batch || []).join(' ').includes('no queue items, eval rows, embeddings or fine-tunes'), (roadmap.tonight_batch || []).join(' ')),
    check('tonight_batch_blocks_private_inventory', (roadmap.tonight_batch || []).join(' ').includes('Do not run private inventory'), (roadmap.tonight_batch || []).join(' '))
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Vision Completion Roadmap Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
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
