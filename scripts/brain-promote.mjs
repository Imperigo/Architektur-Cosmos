#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const args = parseArgs(process.argv.slice(2));
const execute = Boolean(args.execute);
const confirmed = Boolean(args['confirm-promote']);
const autopush = Boolean(args.autopush || args.publish);
const limit = Number(args.limit ?? 5);
const outputRoot = resolve(rootDir, 'out/brain-promote', today);
const entriesPath = resolve(rootDir, 'data/mock-entries.json');
const intakeRoot = resolve(rootDir, 'archive-intake');

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const entries = await readJson(entriesPath);
  const candidates = await findCandidates(entries);
  const selected = candidates.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 5);
  const checks = selected.map((candidate) => runPromotionCheck(candidate.slug));
  const ready = checks.filter((check) => check.status === 'ready');
  const blocked = checks.filter((check) => check.status !== 'ready');
  const promoted = [];

  if (execute && !confirmed) {
    throw new Error('Promotion writes data/mock-entries.json. Re-run with --confirm-promote after owner review.');
  }

  if (execute) {
    for (const check of ready) {
      const result = runPromotion(check.slug);
      promoted.push(result);
      if (result.status !== 'promoted') break;
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: execute ? 'execute_promotions' : 'plan_promotions',
    writes_public_mock_data: execute,
    uploads_assets: false,
    writes_d1_or_r2: false,
    commits_or_pushes: false,
    selected_count: selected.length,
    ready_count: ready.length,
    blocked_count: blocked.length,
    promoted_count: promoted.filter((item) => item.status === 'promoted').length,
    candidates: checks,
    promoted,
    safety: [
      'Promotes only reviewed local proposed-entry.json data into data/mock-entries.json.',
      'Does not upload assets, write D1/R2, publish private files or stage archive-intake/out.',
      'Each candidate must pass kosmodata:promote --dry-run before execution.',
      'Use --autopush --confirm-autopush only after gates pass and owner approves production deploy.'
    ]
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = resolve(outputRoot, `brain-promote-${timestamp}.json`);
  const mdPath = resolve(outputRoot, `brain-promote-${timestamp}.md`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, renderMarkdown(report), 'utf8');
  await writeFile(resolve(outputRoot, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'latest.md'), renderMarkdown(report), 'utf8');

  console.log('Architecture Cosmos Brain Promote');
  console.log(`Mode: ${report.mode}`);
  console.log(`Selected: ${report.selected_count}`);
  console.log(`Ready: ${report.ready_count}`);
  console.log(`Blocked: ${report.blocked_count}`);
  console.log(`Promoted: ${report.promoted_count}`);
  console.log(`Report: ${relativeToRoot(jsonPath)}`);

  const failedPromotion = promoted.find((item) => item.status !== 'promoted');
  if (failedPromotion) {
    console.log(`Stopped after failed promotion: ${failedPromotion.slug}`);
    process.exitCode = 1;
    return;
  }

  if (execute && autopush && report.promoted_count > 0) {
    const pushArgs = ['run', 'brain:autopush', '--', '--message', `Promote ${report.promoted_count} Brain-reviewed entries`];
    if (args['confirm-autopush']) pushArgs.push('--confirm-autopush');
    const push = runStep('brain-autopush', pushArgs);
    console.log(`Autopush: ${push.status}`);
    if (push.status !== 'passed') {
      console.log(push.stderr_tail || push.stdout_tail);
      process.exitCode = 1;
    }
  }
}

async function findCandidates(entries) {
  const wanted = new Set(
    args.entry
      ? String(args.entry).split(',').map((item) => item.trim()).filter(Boolean)
      : []
  );
  const dirs = await readdir(intakeRoot, { withFileTypes: true }).catch(() => []);
  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const candidates = [];
  for (const dir of dirs.filter((item) => item.isDirectory())) {
    const slug = dir.name;
    if (wanted.size && !wanted.has(slug) && !wanted.has(bySlug.get(slug)?.id)) continue;
    const entry = bySlug.get(slug);
    if (!entry) continue;
    const proposedPath = resolve(intakeRoot, slug, 'enrichment/proposed-entry.json');
    const proposed = await readJson(proposedPath, null);
    if (!proposed) continue;
    const changeScore = scoreChanges(entry, proposed);
    if (changeScore <= 0 && !args.includeUnchanged) continue;
    candidates.push({
      slug,
      id: entry.id,
      title: entry.title,
      change_score: changeScore,
      proposed_path: relativeToRoot(proposedPath)
    });
  }
  return candidates.sort((a, b) => b.change_score - a.change_score || a.title.localeCompare(b.title));
}

function scoreChanges(entry, proposed) {
  const fields = [
    'source_quality',
    'short_description',
    'one_sentence',
    'full_description',
    'source_candidates',
    'architecture_text',
    'geo',
    'materials',
    'program',
    'context',
    'database_tags',
    'model_assets',
    'analysis_layers',
    'database_profile'
  ];
  return fields.filter((field) => JSON.stringify(entry[field]) !== JSON.stringify(proposed[field])).length;
}

function runPromotionCheck(slug) {
  const result = runStep('promotion-dry-run', ['run', 'kosmodata:promote', '--', '--entry', slug, '--dry-run']);
  return {
    slug,
    status: result.status === 'passed' ? 'ready' : 'blocked',
    command: result.command,
    stdout_tail: result.stdout_tail,
    stderr_tail: result.stderr_tail
  };
}

function runPromotion(slug) {
  const result = runStep('promotion', ['run', 'kosmodata:promote', '--', '--entry', slug, '--confirm']);
  return {
    slug,
    status: result.status === 'passed' ? 'promoted' : 'failed',
    command: result.command,
    stdout_tail: result.stdout_tail,
    stderr_tail: result.stderr_tail
  };
}

function runStep(id, npmArgs) {
  const result = spawnSync('npm', npmArgs, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 16
  });
  return {
    id,
    command: `npm ${npmArgs.join(' ')}`,
    status: result.status === 0 ? 'passed' : 'failed',
    exit_code: result.status,
    stdout_tail: tail(result.stdout),
    stderr_tail: tail(result.stderr)
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Architecture Cosmos Brain Promote',
    '',
    `Generated: ${report.generated_at}`,
    `Mode: \`${report.mode}\``,
    `Writes public mock data: \`${report.writes_public_mock_data}\``,
    `Uploads assets: \`${report.uploads_assets}\``,
    `Writes D1/R2: \`${report.writes_d1_or_r2}\``,
    '',
    '## Summary',
    '',
    `- Selected: ${report.selected_count}`,
    `- Ready: ${report.ready_count}`,
    `- Blocked: ${report.blocked_count}`,
    `- Promoted: ${report.promoted_count}`,
    '',
    '## Candidates',
    ''
  ];
  report.candidates.forEach((candidate, index) => {
    lines.push(`${index + 1}. \`${candidate.slug}\` — ${candidate.status}`);
    if (candidate.stderr_tail) lines.push(`   - ${candidate.stderr_tail.split('\n').join('\n   - ')}`);
  });
  if (report.promoted.length) {
    lines.push('', '## Promoted', '');
    report.promoted.forEach((item, index) => lines.push(`${index + 1}. \`${item.slug}\` — ${item.status}`));
  }
  lines.push('', '## Safety', '');
  report.safety.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (fallback !== undefined && error.code === 'ENOENT') return fallback;
    throw error;
  }
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

function tail(value = '') {
  const lines = value.trim().split('\n').filter(Boolean);
  return lines.slice(-12).join('\n');
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
