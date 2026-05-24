#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const outputRoot = resolve(rootDir, 'out/brain-text-polish', today);
const args = parseArgs(process.argv.slice(2));
const execute = Boolean(args.execute);
const confirmed = Boolean(args['confirm-public-text']);
const limit = Number(args.limit ?? 8);

const recentBrainResearchSlugs = [
  'alhambra',
  'catalan-atlas',
  'versailles-gardens',
  'chandigarh',
  'brasilia',
  'vitruvius-de-architectura',
  'city-in-layers',
  'garden-cities-of-tomorrow',
  'broadacre-city',
  'athens-charter',
  'buerogebaeude-montecatini',
  'delirious-new-york',
  'euralille-metropole',
  'rural-studio-20k-house',
  'venice-biennale-architecture-2012',
  'hereford-mappa-mundi',
  'narkomfin-housing',
  'hufeisensiedlung',
  'habitat-67',
  'gas-works-park',
  'leutschenpark'
];

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  if (execute && !confirmed) {
    throw new Error('Writing polished texts into data/mock-entries.json requires --confirm-public-text.');
  }

  await mkdir(outputRoot, { recursive: true });
  const entries = JSON.parse(await readFile(resolve(rootDir, 'data/mock-entries.json'), 'utf8'));
  const selectedSlugs = selectSlugs(entries);
  const results = [];

  for (const slug of selectedSlugs) {
    const commandArgs = ['run', 'cosmos:text-generate', '--', '--entry', slug];
    if (execute) commandArgs.push('--apply', '--confirm-public-text');
    const result = runNpm(commandArgs);
    results.push({
      slug,
      status: result.status,
      command: `npm ${commandArgs.join(' ')}`,
      stdout_tail: tail(result.stdout),
      stderr_tail: tail(result.stderr)
    });
    if (result.status !== 'passed') break;
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: execute ? 'apply_public_text_polish' : 'review_text_polish',
    writes_public_mock_data: execute,
    uploads_assets: false,
    writes_d1_or_r2: false,
    selected_count: selectedSlugs.length,
    passed_count: results.filter((item) => item.status === 'passed').length,
    failed_count: results.filter((item) => item.status !== 'passed').length,
    selected_slugs: selectedSlugs,
    results,
    safety: [
      'Uses existing entry metadata, analysis layers and source trails only.',
      'Does not browse, upload assets, write D1/R2 or publish private files.',
      'Text remains German, question-led and public-safe; source-sensitive claims keep review metadata.',
      'Apply mode requires --execute --confirm-public-text.'
    ]
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await writeFile(resolve(outputRoot, `brain-text-polish-${timestamp}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'latest.md'), renderMarkdown(report), 'utf8');

  console.log('Architecture Cosmos Brain Text Polish');
  console.log(`Mode: ${report.mode}`);
  console.log(`Selected: ${report.selected_count}`);
  console.log(`Passed: ${report.passed_count}`);
  console.log(`Failed: ${report.failed_count}`);
  console.log('Report: out/brain-text-polish/' + today + '/latest.md');

  if (report.failed_count > 0) process.exitCode = 1;
}

function selectSlugs(entries) {
  const explicit = args.entry
    ? String(args.entry).split(',').map((item) => item.trim()).filter(Boolean)
    : [];
  const candidates = explicit.length ? explicit : recentBrainResearchSlugs;
  const known = new Set(entries.map((entry) => entry.slug));
  const selected = candidates.filter((slug) => known.has(slug));
  if (explicit.length) return selected;
  if (Number.isFinite(limit) && limit > 0) return selected.slice(0, limit);
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
  return String(value || '').split('\n').slice(-18).join('\n').trim();
}

function renderMarkdown(report) {
  const lines = [
    '# Brain Text Polish',
    '',
    `Generated: ${report.generated_at}`,
    `Mode: \`${report.mode}\``,
    `Writes public mock data: \`${report.writes_public_mock_data}\``,
    '',
    '## Selected Entries',
    '',
    ...report.selected_slugs.map((slug) => `- ${slug}`),
    '',
    '## Results',
    ''
  ];

  for (const result of report.results) {
    lines.push(`- **${result.slug}**: ${result.status}`);
  }

  lines.push('', '## Safety', '');
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
