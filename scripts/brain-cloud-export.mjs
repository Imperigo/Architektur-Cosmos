#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const outputDir = resolve(rootDir, 'out/brain-review', today);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const review = await readLatestJson('brain-review.json');
  const doctor = await readLatestJson('brain-doctor.json', false);
  const cloudPlan = await readLatestJson('brain-cloud-plan.json', false);

  const state = buildState({ review, doctor, cloudPlan });
  const sql = renderSql(state);

  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'brain-cloud-state.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDir, 'brain-cloud-seed.sql'), sql, 'utf8');

  console.log('Architecture Cosmos Brain Cloud Export');
  console.log(`Run: ${state.run.id}`);
  console.log(`Tasks: ${state.tasks.length}`);
  console.log(`Reports: ${state.reports.length}`);
  console.log(`Output: ${relativeToRoot(outputDir)}`);
  console.log('Writes database: false');
}

async function readLatestJson(name, required = true) {
  const path = resolve(outputDir, name);
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    if (!required) return null;
    throw new Error(`Missing ${relativeToRoot(path)}. Run npm run brain:review first.`);
  }
}

function buildState({ review, doctor, cloudPlan }) {
  const generatedAt = new Date().toISOString();
  const runId = `cloud-plan-${today}`;
  const topTasks = (review.tasks ?? []).slice(0, 50);
  const reports = [
    {
      id: `report-review-${today}`,
      run_id: runId,
      report_type: 'daily',
      title: 'Architecture Cosmos Brain Review',
      summary: `${review.summary.entries} entries, ${review.tasks.length} open tasks, ${review.summary.broken_relations} broken relations.`,
      markdown: renderReviewMarkdown(review),
      data_json: review,
      public_safe: false
    }
  ];

  if (doctor) {
    reports.push({
      id: `report-doctor-${today}`,
      run_id: runId,
      report_type: 'doctor',
      title: 'Architecture Cosmos Brain Doctor',
      summary: `${doctor.summary?.passed ?? 0}/${doctor.summary?.total ?? 0} checks passed.`,
      markdown: renderDoctorMarkdown(doctor),
      data_json: doctor,
      public_safe: false
    });
  }

  if (cloudPlan) {
    reports.push({
      id: `report-cloud-plan-${today}`,
      run_id: runId,
      report_type: 'cloud_status',
      title: 'Cloud Brain V2 Readiness Plan',
      summary: `${cloudPlan.summary.passed}/${cloudPlan.summary.total} checks passed. Status: ${cloudPlan.status}.`,
      markdown: renderCloudPlanMarkdown(cloudPlan),
      data_json: cloudPlan,
      public_safe: false
    });
  }

  return {
    generated_at: generatedAt,
    writes_database: false,
    publishes: false,
    run: {
      id: runId,
      mode: review.mode ?? 'autonomous_review',
      trigger_type: 'manual',
      status: 'needs_approval',
      started_at: generatedAt,
      finished_at: generatedAt,
      summary: 'Prepared Cloud Brain D1 seed preview from local Brain reports.',
      checks_json: doctor?.checks ?? [],
      retry_count: doctor?.self_healing_retries ?? 0,
      writes_repository: 0,
      writes_database: 0,
      publishes: 0
    },
    tasks: topTasks.map((task) => ({
      id: task.id,
      run_id: runId,
      scope: task.scope,
      kind: task.kind,
      title: task.title,
      body: task.body,
      priority: task.priority,
      risk_level: riskLevelFor(task),
      approval_required: task.approval_required ? 1 : 0,
      status: 'open',
      target_entry_id: task.entry_id,
      suggested_action_json: {
        entry_slug: task.entry_slug,
        entry_title: task.entry_title
      },
      tests_json: ['npm run brain:doctor']
    })),
    reports,
    obsidian_exports: [
      {
        id: `obsidian-brain-report-${today}`,
        run_id: runId,
        vault_target: 'Architecture Cosmos Vault',
        export_type: 'brain_report',
        file_path: `04 Brain Reports/${today} Brain Review.md`,
        status: 'planned',
        notes: 'Local Obsidian export preview only. No sync or upload.'
      }
    ]
  };
}

function riskLevelFor(task) {
  if (task.kind === 'rights' || task.kind === 'integrity') return 'high';
  if (task.kind === 'security') return 'critical';
  if (task.kind === 'relations') return 'low';
  return 'medium';
}

function renderSql(state) {
  const lines = [
    '-- Architecture Cosmos Brain D1 seed preview',
    '-- Generated locally. Do not apply to remote D1 without owner approval.',
    'PRAGMA foreign_keys = ON;',
    '',
    insert('brain_runs', state.run),
    ''
  ];

  for (const task of state.tasks) {
    lines.push(insert('brain_tasks', task));
  }

  lines.push('');
  for (const report of state.reports) {
    lines.push(insert('brain_reports', {
      ...report,
      data_json: JSON.stringify(report.data_json)
    }));
  }

  lines.push('');
  for (const exportItem of state.obsidian_exports) {
    lines.push(insert('brain_obsidian_exports', exportItem));
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

function insert(table, row) {
  const keys = Object.keys(row);
  const values = keys.map((key) => sqlValue(row[key]));
  return `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${values.join(', ')});`;
}

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') return quoteSql(JSON.stringify(value));
  return quoteSql(String(value));
}

function quoteSql(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function renderReviewMarkdown(review) {
  return [
    '# Architecture Cosmos Brain Review',
    '',
    `Generated: ${review.generated_at}`,
    '',
    `Entries: ${review.summary.entries}`,
    `Relations: ${review.summary.relations}`,
    `Open tasks: ${review.tasks.length}`,
    '',
    '## Top Tasks',
    ...review.tasks.slice(0, 10).map((task) => `- ${task.priority}: ${task.title}`)
  ].join('\n');
}

function renderDoctorMarkdown(doctor) {
  return [
    '# Architecture Cosmos Brain Doctor',
    '',
    `Generated: ${doctor.generated_at}`,
    '',
    `Passed: ${doctor.summary?.passed ?? 0}/${doctor.summary?.total ?? 0}`,
    `Failed: ${doctor.summary?.failed ?? 0}`
  ].join('\n');
}

function renderCloudPlanMarkdown(plan) {
  return [
    '# Cloud Brain V2 Readiness Plan',
    '',
    `Generated: ${plan.generated_at}`,
    `Status: ${plan.status}`,
    '',
    `Checks: ${plan.summary.passed}/${plan.summary.total}`
  ].join('\n');
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
