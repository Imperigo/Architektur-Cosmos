#!/usr/bin/env node

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputPath = resolve(root, args.out || `data/kosmoreferences-nightly-gate-${dateStamp}.json`);
const markdownPath = resolve(root, args.markdownOut || `docs/codex/kosmoreferences-nightly-gate-${dateStamp}.md`);
const sourcePackagesRoot = resolve(root, args.sourcePackagesRoot || 'examples/kosmo-references/source-packages');
const timeoutMs = Number(args.timeoutMs || 120000);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sourcePackages = await findSourcePackages(sourcePackagesRoot);
  const webSourcePackages = sourcePackages.filter((item) => item.web_links > 0);
  const steps = buildSteps(webSourcePackages);
  const results = [];
  const startedAt = new Date();

  for (const step of steps) {
    const result = await runStep(step);
    results.push(result);
    if (result.exit_code !== 0 && step.required) break;
  }

  const statusCard = await readOptionalJson(resolve(root, 'data/kosmoreferences-data-lane-status.json'));
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: results.every((result) => result.exit_code === 0) ? 'passed_review_only' : 'failed',
    policy: {
      public_writes_allowed: false,
      public_ready_required: 0,
      copied_source_content: false,
      note: 'Nightly gate orchestrates metadata/provenance/readiness checks only. It does not promote media, copy source content, or write public-ready manifests.'
    },
    summary: {
      duration_ms: Date.now() - startedAt.getTime(),
      steps: results.length,
      passed_steps: results.filter((result) => result.exit_code === 0).length,
      failed_steps: results.filter((result) => result.exit_code !== 0).length,
      source_packages: sourcePackages.length,
      web_source_packages: webSourcePackages.length,
      public_ready_assets: statusCard?.summary?.public_ready_assets ?? null,
      blocked_public_promotions: statusCard?.summary?.blocked_public_promotions ?? null,
      owner_decision_session_status: statusCard?.summary?.owner_decision_session_status ?? null,
      owner_decision_session_selected: statusCard?.summary?.owner_decision_session_selected ?? null,
      owner_decision_session_pending: statusCard?.summary?.owner_decision_session_pending ?? null,
      private_library_status: statusCard?.summary?.private_library_status ?? null,
      local_worker_status: statusCard?.summary?.local_worker_status ?? null,
      local_worker_model: statusCard?.summary?.local_worker_model ?? null
    },
    source_packages: sourcePackages,
    steps: results,
    next_actions: nextActions(results, statusCard)
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await mkdir(dirname(markdownPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, renderMarkdown(report));

  console.log('KosmoReferences nightly gate');
  console.log(`Status: ${report.status}`);
  console.log(`Steps: ${report.summary.passed_steps}/${report.summary.steps} passed`);
  console.log(`Source packages with links: ${report.summary.web_source_packages}`);
  console.log(`Public-ready assets: ${report.summary.public_ready_assets}`);
  console.log(`Owner session: ${report.summary.owner_decision_session_status}`);
  console.log(`Wrote: ${relative(root, outputPath)}`);

  if (report.status !== 'passed_review_only') process.exitCode = 1;
}

function buildSteps(webSourcePackages) {
  const steps = [
    npmStep('references-registry-check', ['run', 'kosmo:references-registry-check']),
    npmStep('references-provenance-check', ['run', 'kosmo:references-provenance-check'])
  ];

  for (const item of webSourcePackages) {
    steps.push(npmStep(`source-package-link-check:${item.package_id || item.path}`, [
      'run',
      'kosmo:source-package-link-check',
      '--',
      '--package',
      item.path
    ]));
  }

  steps.push(
    npmStep('owner-review-decision-check', [
      'run',
      'kosmo:owner-review-decision-check',
      '--',
      '--out',
      'examples/kosmo-references/provenance/owner-review-decision-pack-2026-06-13-review'
    ]),
    npmStep('owner-decision-session-check', ['run', 'kosmo:owner-decision-session-check']),
    npmStep('private-library-diagnostic', ['run', 'kosmo:private-library-diagnostic']),
    npmStep('local-worker-ollama-smoke', ['run', 'kosmo:local-worker-ollama-smoke']),
    npmStep('references-status-card', ['run', 'kosmo:references-status-card'])
  );

  return steps;
}

function npmStep(id, npmArgs) {
  return {
    id,
    command: 'npm',
    args: npmArgs,
    required: true,
    timeout_ms: timeoutMs
  };
}

async function runStep(step) {
  const startedAt = Date.now();
  const output = [];
  let timedOut = false;

  const exitCode = await new Promise((resolvePromise) => {
    const child = spawn(step.command, step.args, {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, step.timeout_ms);

    child.stdout.on('data', (chunk) => output.push(String(chunk)));
    child.stderr.on('data', (chunk) => output.push(String(chunk)));
    child.on('error', (error) => {
      clearTimeout(timer);
      output.push(error.message);
      resolvePromise(1);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise(timedOut ? 124 : code ?? 1);
    });
  });

  return {
    id: step.id,
    command: [step.command, ...step.args].join(' '),
    required: step.required,
    started_at: new Date(startedAt).toISOString(),
    duration_ms: Date.now() - startedAt,
    exit_code: exitCode,
    status: exitCode === 0 ? 'passed' : timedOut ? 'timed_out' : 'failed',
    output_excerpt: excerpt(output.join(''))
  };
}

async function findSourcePackages(start) {
  const paths = await collectFiles(start);
  const packages = [];
  for (const path of paths.filter((item) => item.endsWith('/source-package.json'))) {
    const manifest = await readOptionalJson(path);
    if (!manifest) continue;
    const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
    const webLinks = sources.filter((source) => source.file_type === 'web_link' || /^https?:\/\//i.test(source.path ?? ''));
    packages.push({
      path: relative(root, path),
      package_id: manifest.package_id ?? null,
      title: manifest.title ?? null,
      status: manifest.status ?? null,
      rights_scope: manifest.rights_scope ?? null,
      web_links: webLinks.length
    });
  }
  return packages.sort((a, b) => a.path.localeCompare(b.path));
}

async function collectFiles(start) {
  const files = [];
  let info;
  try {
    info = await stat(start);
  } catch {
    return files;
  }
  if (!info.isDirectory()) return [start];

  const entries = await readdir(start, { withFileTypes: true });
  for (const entry of entries) {
    const child = join(start, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(child));
    else files.push(child);
  }
  return files;
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function excerpt(value) {
  const normalized = value.replace(/\r/g, '').trim();
  if (normalized.length <= 1600) return normalized;
  return `${normalized.slice(0, 900)}\n...\n${normalized.slice(-600)}`;
}

function nextActions(results, statusCard) {
  const actions = [];
  const failed = results.filter((result) => result.exit_code !== 0);
  if (failed.length > 0) actions.push(`Fix failed nightly gate steps: ${failed.map((item) => item.id).join(', ')}.`);
  if ((statusCard?.summary?.owner_decision_session_pending ?? 0) > 0) {
    actions.push('Owner selects the pending review decisions before any public promotion preparation.');
  }
  if (statusCard?.summary?.public_ready_assets === 0) {
    actions.push('Keep all reference media review-only until explicit owner decisions and separate promotion checks pass.');
  }
  if (statusCard?.summary?.private_library_status !== 'passed') {
    actions.push('Mount or expose the private OneDrive/book library root before private-source matching can start.');
  }
  return actions.length > 0 ? actions : ['No blocking nightly gate action detected.'];
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoReferences Nightly Gate');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Steps passed: ${report.summary.passed_steps}/${report.summary.steps}`);
  lines.push(`- Duration: ${report.summary.duration_ms}ms`);
  lines.push(`- Source packages: ${report.summary.source_packages}`);
  lines.push(`- Web source packages: ${report.summary.web_source_packages}`);
  lines.push(`- Public-ready assets: ${report.summary.public_ready_assets}`);
  lines.push(`- Blocked public promotions: ${report.summary.blocked_public_promotions}`);
  lines.push(`- Owner decision session: ${report.summary.owner_decision_session_status} (${report.summary.owner_decision_session_selected} selected / ${report.summary.owner_decision_session_pending} pending)`);
  lines.push(`- Private library: ${report.summary.private_library_status}`);
  lines.push(`- Local worker: ${report.summary.local_worker_status} (${report.summary.local_worker_model})`);
  lines.push('');
  lines.push('## Steps');
  lines.push('');
  lines.push('| Step | Status | Duration |');
  lines.push('| --- | --- | ---: |');
  for (const result of report.steps) {
    lines.push(`| \`${result.id}\` | ${result.status} | ${result.duration_ms}ms |`);
  }
  lines.push('');
  lines.push('## Source Packages');
  lines.push('');
  for (const item of report.source_packages) {
    lines.push(`- \`${item.package_id || item.path}\`: ${item.web_links} web links / ${item.rights_scope || 'unknown rights scope'}`);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
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
