#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-codex-loop-checkpoint-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-codex-loop-checkpoint-${dateStamp}.md`);

const artifactRefs = [
  ref('dependency_preflight_plan', `data/kosmo-innovation-dependency-preflight-plan-check-${dateStamp}.json`),
  ref('dependency_preflight_runner', `data/kosmo-innovation-dependency-preflight-runner-check-${dateStamp}.json`),
  ref('dependency_install_queue', `data/kosmo-innovation-dependency-install-queue-check-${dateStamp}.json`),
  ref('daily_loop_routine', `data/kosmo-codex-daily-loop-routine-check-${dateStamp}.json`),
  ref('github_watchlist', `data/kosmo-innovation-github-watchlist-check-${dateStamp}.json`)
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const artifacts = [];
  for (const artifact of artifactRefs) {
    artifacts.push(await readArtifact(artifact));
  }
  const missing = artifacts.filter((artifact) => artifact.status === 'missing');
  const failed = artifacts.filter((artifact) => artifact.guard_status && !artifact.guard_status.endsWith('_passed'));

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: missing.length === 0 && failed.length === 0 ? 'codex_loop_checkpoint_ready' : 'codex_loop_checkpoint_needs_review',
    policy: {
      checkpoint_only: true,
      runs_checks_now: false,
      installs_dependencies_now: false,
      downloads_models_now: false,
      reads_private_content: false,
      public_ready_after_checkpoint: 0
    },
    summary: {
      artifacts_expected: artifactRefs.length,
      artifacts_found: artifacts.filter((artifact) => artifact.status === 'found').length,
      missing_artifacts: missing.length,
      failed_guards: failed.length,
      public_ready_after_checkpoint: 0
    },
    artifacts,
    current_loop_state: [
      'Dependency lane has plan, local availability runner and install queue.',
      'GitHub innovation watchlist is captured as queue-only input.',
      'Daily Codex morning routine is recorded and guarded.',
      'Source Root remains the gate for private OCR, private embeddings, private training and source scans.',
      'Next autonomous work should stay fixture-only or queue-only unless an explicit install/download batch is started.'
    ],
    next_safe_blocks: [
      'Create dependency batch decision brief for the owner and Claude.',
      'Prepare fixture-only MarkItDown/Docling sample contracts without installing packages.',
      'Prepare IFC fixture acceptance criteria for IfcOpenShell before dependency install.',
      'Audit KosmoOrbit status display expectations against new handoffs.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo Codex loop checkpoint');
  console.log(`Status: ${report.status}`);
  console.log(`Artifacts found: ${report.summary.artifacts_found}/${report.summary.artifacts_expected}`);
  console.log(`Failed guards: ${report.summary.failed_guards}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.status !== 'codex_loop_checkpoint_ready') process.exitCode = 1;
}

async function readArtifact(artifact) {
  const path = resolve(root, artifact.path);
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'));
    return {
      ...artifact,
      status: 'found',
      guard_status: parsed.status,
      generated_at: parsed.generated_at,
      failures: parsed.summary?.failures ?? 0
    };
  } catch {
    return { ...artifact, status: 'missing' };
  }
}

function ref(id, path) {
  return { id, path };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Codex Loop Checkpoint');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Artifacts found: ${report.summary.artifacts_found}/${report.summary.artifacts_expected}`);
  lines.push(`- Missing artifacts: ${report.summary.missing_artifacts}`);
  lines.push(`- Failed guards: ${report.summary.failed_guards}`);
  lines.push(`- Public-ready after checkpoint: ${report.summary.public_ready_after_checkpoint}`);
  lines.push('');
  lines.push('## Artifacts');
  lines.push('');
  lines.push('| Artifact | Status | Guard | Failures |');
  lines.push('| --- | --- | --- | ---: |');
  for (const artifact of report.artifacts) {
    lines.push(`| \`${artifact.id}\` | ${artifact.status} | ${artifact.guard_status || 'n/a'} | ${artifact.failures ?? 'n/a'} |`);
  }
  lines.push('');
  lines.push('## Current Loop State');
  lines.push('');
  report.current_loop_state.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Next Safe Blocks');
  lines.push('');
  report.next_safe_blocks.forEach((item) => lines.push(`- ${item}`));
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
