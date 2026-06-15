#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-codex-daily-loop-routine-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-codex-daily-loop-routine-${dateStamp}.md`);

const morningRoutine = [
  step('repo_state_scan', 'Git states in ArchitectureCosmos and KosmoOrbit, scoped dirty-file review, no unrelated resets.'),
  step('morning_routine_run', 'Execute the guarded morning evidence run: git fetch, handoff mirror check, Source Root status and next-batch routing.'),
  step('handoff_intake', 'Read latest Claude/KosmoOverseer inbox notes and compare against Codex-owned lane state.'),
  step('source_root_gate', 'Run or inspect Source Root gate status before any private OCR, embedding, training or source scan.'),
  step('orbit_health', 'Check KosmoOrbit handoff visibility and whether a status artifact needs mirroring.'),
  step('innovation_watch', 'Run seeded GitHub watchlist and query-based discovery before installing or downloading anything.'),
  step('priority_pick', 'Pick the highest-value safe block: guards, fixture-only experiments, handoff clarity, or bug cleanup.'),
  step('commit_push', 'Commit and push completed blocks with exact staging and a worker-facing handoff note.')
];

const todayLoop = [
  step('finish_dependency_lane', 'Dependency preflight plan, availability runner and install queue are the active safe innovation lane.'),
  step('prepare_install_batch_without_execution', 'Keep installs/downloads as explicit future batch with model-root and Source-Root gates.'),
  step('strengthen_worker_contracts', 'Improve Codex/Claude/KosmoOverseer handoff contracts whenever code changes touch shared boundaries.'),
  step('source_independent_progress', 'When Source Root is blocked, progress with fixtures, schemas, review-only contracts and Orbit status.'),
  step('cleanup_and_guarding', 'If no feature block is available, reduce ambiguity, add checks, and clean generated status docs safely.')
];

const report = {
  schema_version: '0.1',
  generated_at: new Date().toISOString(),
  status: 'codex_daily_loop_routine_ready',
  policy: {
    autonomous_loop_until_user_stop_or_budget: true,
    max_tick_minutes: 2,
    morning_execution_evidence_required: true,
    avoids_idle_wait: true,
    no_unrelated_reverts: true,
    no_private_processing_without_source_root_unlock: true,
    installs_downloads_require_explicit_batch: true,
    public_ready_after_routine: 0
  },
  morning_routine: morningRoutine,
  today_loop_priorities: todayLoop,
  escalation_rules: [
    'Ask the owner only for decisions that change private source processing, public release, credentials, destructive filesystem actions or large installs/downloads.',
    'If an exact Source Root is required, keep the structured unlock phrase requirement visible.',
    'If a worker artifact is changed, mirror a handoff to KosmoOrbit inbox.'
  ],
  fallback_work: [
    'Run fixture-only checks and improve their guards.',
    'Audit handoff consistency between ArchitectureCosmos and KosmoOrbit.',
    'Create review packets for owner decisions.',
    'Inspect trusted upstream docs or repos for relevant architecture-AI improvements, then add queue-only plans.',
    'Clean local generated artifacts only when they are Codex-owned and safely scoped.'
  ]
};

await mkdir(dirname(outputJson), { recursive: true });
await mkdir(dirname(outputMd), { recursive: true });
await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(outputMd, renderMarkdown(report));

console.log('Kosmo Codex daily loop routine');
console.log(`Status: ${report.status}`);
console.log(`Morning steps: ${report.morning_routine.length}`);
console.log(`Today priorities: ${report.today_loop_priorities.length}`);
console.log(`Wrote: ${relative(root, outputMd)}`);

function step(id, description) {
  return { id, description, status: 'active' };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Codex Daily Loop Routine');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  lines.push(`- Max tick minutes: ${report.policy.max_tick_minutes}`);
  lines.push(`- Morning execution evidence required: ${report.policy.morning_execution_evidence_required}`);
  lines.push(`- Avoids idle wait: ${report.policy.avoids_idle_wait}`);
  lines.push(`- Public-ready after routine: ${report.policy.public_ready_after_routine}`);
  lines.push(`- Installs/downloads require explicit batch: ${report.policy.installs_downloads_require_explicit_batch}`);
  lines.push('');
  lines.push('## Morning Routine');
  lines.push('');
  report.morning_routine.forEach((item, index) => lines.push(`${index + 1}. \`${item.id}\` - ${item.description}`));
  lines.push('');
  lines.push('## Today Loop Priorities');
  lines.push('');
  report.today_loop_priorities.forEach((item, index) => lines.push(`${index + 1}. \`${item.id}\` - ${item.description}`));
  lines.push('');
  lines.push('## Escalation Rules');
  lines.push('');
  report.escalation_rules.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Fallback Work');
  lines.push('');
  report.fallback_work.forEach((item) => lines.push(`- ${item}`));
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
