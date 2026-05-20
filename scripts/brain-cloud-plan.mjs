#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const outputDir = resolve(rootDir, 'out/brain-review', today);

const requiredFiles = [
  'docs/architecture-cosmos-brain.md',
  'docs/cloud-brain-architecture.md',
  'docs/obsidian-integration.md',
  'docs/benutzerhandbuch-projektvision.md',
  'data/brain-rules.json',
  'schema/architecture-cosmos-brain-d1.sql',
  'src/worker.ts',
  'wrangler.jsonc',
  'scripts/brain-cloud-export.mjs',
  'scripts/brain-api-smoke.mjs',
  'scripts/obsidian-export.mjs'
];

const requiredSchemaTables = [
  'brain_runs',
  'brain_tasks',
  'brain_approvals',
  'brain_errors',
  'brain_reports',
  'brain_obsidian_exports'
];

const requiredWorkerRoutes = [
  '/api/brain/status',
  '/api/brain/latest-report',
  '/api/brain/activation',
  '/api/brain/tasks'
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const checks = [];

  for (const file of requiredFiles) {
    checks.push(await fileCheck(file));
  }

  const schema = await readText('schema/architecture-cosmos-brain-d1.sql');
  for (const table of requiredSchemaTables) {
    checks.push({
      id: `schema-table-${table}`,
      label: `Brain schema contains ${table}`,
      status: schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`) ? 'pass' : 'fail'
    });
  }

  const worker = await readText('src/worker.ts');
  for (const route of requiredWorkerRoutes) {
    checks.push({
      id: `worker-route-${route}`,
      label: `Worker exposes ${route}`,
      status: worker.includes(route) ? 'pass' : 'fail'
    });
  }

  const rules = JSON.parse(await readText('data/brain-rules.json'));
  const approvalChecks = [
    'committing',
    'pushing',
    'publishing',
    'cloud_resource_creation',
    'database_write',
    'r2_upload',
    'email_send'
  ];

  for (const gate of approvalChecks) {
    checks.push({
      id: `approval-gate-${gate}`,
      label: `Approval gate for ${gate}`,
      status: rules.autonomy?.must_ask_before?.includes(gate) ? 'pass' : 'fail'
    });
  }

  const report = buildReport(checks);
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'brain-cloud-plan.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDir, 'brain-cloud-plan.md'), renderMarkdown(report), 'utf8');

  console.log('Architecture Cosmos Cloud Brain Plan');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.total} passed`);
  console.log(`Output: ${relativeToRoot(outputDir)}`);

  if (report.status !== 'ready') {
    process.exitCode = 1;
  }
}

async function fileCheck(file) {
  try {
    const text = await readText(file);
    return {
      id: `file-${file}`,
      label: `Required file: ${file}`,
      status: text.trim().length > 0 ? 'pass' : 'fail'
    };
  } catch {
    return {
      id: `file-${file}`,
      label: `Required file: ${file}`,
      status: 'fail'
    };
  }
}

async function readText(file) {
  return readFile(resolve(rootDir, file), 'utf8');
}

function buildReport(checks) {
  const failed = checks.filter((check) => check.status !== 'pass');
  const status = failed.length === 0 ? 'ready' : 'needs_work';

  return {
    generated_at: new Date().toISOString(),
    status,
    writes_database: false,
    publishes: false,
    approval_required_before_cloud_activation: true,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length
    },
    recommended_architecture: {
      runtime: 'Cloudflare Worker Cron',
      state: 'Dedicated D1 database: architecture-cosmos-brain',
      first_endpoints: ['/api/brain/status', '/api/brain/latest-report', '/api/brain/tasks'],
      approval_model: 'owner approval required before execute/publish/cloud writes',
      obsidian_role: 'private knowledge vault and review surface, not public asset storage'
    },
    checks,
    next_steps: [
      'Review docs/cloud-brain-architecture.md.',
      'Decide whether to create a dedicated D1 database architecture-cosmos-brain.',
      'Implement read-only /api/brain/status before enabling Cron writes.',
      'Keep Obsidian as a private review/export layer until sync rules are explicit.'
    ]
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Cloud Brain V2 Readiness Plan',
    '',
    `Generated: ${report.generated_at}`,
    `Status: ${report.status}`,
    '',
    '## Summary',
    '',
    `- Checks: ${report.summary.passed}/${report.summary.total} passed`,
    `- Writes database: ${report.writes_database}`,
    `- Publishes: ${report.publishes}`,
    `- Approval required before cloud activation: ${report.approval_required_before_cloud_activation}`,
    '',
    '## Recommended Architecture',
    '',
    `- Runtime: ${report.recommended_architecture.runtime}`,
    `- State: ${report.recommended_architecture.state}`,
    `- First endpoints: ${report.recommended_architecture.first_endpoints.join(', ')}`,
    `- Approval model: ${report.recommended_architecture.approval_model}`,
    `- Obsidian role: ${report.recommended_architecture.obsidian_role}`,
    '',
    '## Checks',
    ''
  ];

  for (const check of report.checks) {
    lines.push(`- ${check.status === 'pass' ? 'PASS' : 'FAIL'}: ${check.label}`);
  }

  lines.push('', '## Next Steps', '');
  for (const step of report.next_steps) {
    lines.push(`- ${step}`);
  }

  return `${lines.join('\n')}\n`;
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
