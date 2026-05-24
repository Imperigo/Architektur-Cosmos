#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const outputRoot = resolve(rootDir, 'out/brain-model-batch', today);
const args = parseArgs(process.argv.slice(2));
const execute = Boolean(args.execute);
const limit = Number(args.limit ?? 5);

const pilotSlugs = [
  'villa-savoye',
  'alterszentrum-kloster-ingenbohl',
  'habitat-67',
  'narkomfin-housing',
  'euralille-metropole',
  'leutschenpark'
];

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const entries = JSON.parse(await readFile(resolve(rootDir, 'data/mock-entries.json'), 'utf8'));
  const selected = selectEntries(entries);
  const results = [];

  if (execute) {
    for (const entry of selected) {
      const result = runNpm(['run', 'cosmos:model-generate', '--', '--entry', entry.slug]);
      results.push({
        slug: entry.slug,
        title: entry.title,
        status: result.status,
        command: `npm run cosmos:model-generate -- --entry ${entry.slug}`,
        stdout_tail: tail(result.stdout),
        stderr_tail: tail(result.stderr)
      });
      if (result.status !== 'passed') break;
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: execute ? 'execute_model_review_batch' : 'plan_model_review_batch',
    writes_public_mock_data: false,
    uploads_assets: false,
    writes_d1_or_r2: false,
    selected_count: selected.length,
    passed_count: results.filter((item) => item.status === 'passed').length,
    failed_count: results.filter((item) => item.status !== 'passed').length,
    selected: selected.map((entry) => ({
      slug: entry.slug,
      title: entry.title,
      has_model_assets: (entry.model_assets?.length ?? 0) > 0,
      model_assets_count: entry.model_assets?.length ?? 0
    })),
    results,
    safety: [
      'Runs local model planning/generation only through cosmos:model-generate.',
      'Does not copy GLBs into public/, upload assets, write D1/R2 or update data/mock-entries.json.',
      'Only entries with reviewed procedural templates generate GLB geometry; others receive model review plans.',
      'All generated artifacts remain local review output under archive-intake and out.'
    ]
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await writeFile(resolve(outputRoot, `brain-model-batch-${timestamp}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'latest.md'), renderMarkdown(report), 'utf8');

  console.log('Architecture Cosmos Brain Model Batch');
  console.log(`Mode: ${report.mode}`);
  console.log(`Selected: ${report.selected_count}`);
  console.log(`Passed: ${report.passed_count}`);
  console.log(`Failed: ${report.failed_count}`);
  console.log('Report: out/brain-model-batch/' + today + '/latest.md');

  if (report.failed_count > 0) process.exitCode = 1;
}

function selectEntries(entries) {
  const wanted = args.entry
    ? String(args.entry).split(',').map((item) => item.trim()).filter(Boolean)
    : pilotSlugs;
  const selected = wanted
    .map((slug) => entries.find((entry) => entry.slug === slug || entry.id === slug))
    .filter(Boolean);
  if (Number.isFinite(limit) && limit > 0 && !args.entry) return selected.slice(0, limit);
  return selected;
}

function runNpm(commandArgs) {
  const result = spawnSync('npm', commandArgs, {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
  return {
    status: result.status === 0 ? 'passed' : 'failed',
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function tail(value) {
  return String(value || '').split('\n').slice(-24).join('\n').trim();
}

function renderMarkdown(report) {
  const lines = [
    '# Brain Model Batch',
    '',
    `Generated: ${report.generated_at}`,
    `Mode: \`${report.mode}\``,
    '',
    '## Selected',
    '',
    ...report.selected.map((item) => `- ${item.title} (\`${item.slug}\`) — model assets: ${item.model_assets_count}`),
    '',
    '## Results',
    ''
  ];

  if (!report.results.length) {
    lines.push('Plan only. Re-run with `--execute` to create local review output.', '');
  } else {
    for (const result of report.results) {
      lines.push(`- **${result.title}** (\`${result.slug}\`): ${result.status}`);
    }
    lines.push('');
  }

  lines.push('## Safety', '');
  for (const item of report.safety) lines.push(`- ${item}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : true;
    if (next && !next.startsWith('--')) index += 1;
  }
  return parsed;
}
