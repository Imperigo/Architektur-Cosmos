#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), 'kosmo-closeout-hygiene-'));

try {
  const handoff = join(tempRoot, 'bad-handoff.md');
  const memory = join(tempRoot, 'bad-memory.md');
  const out = join(tempRoot, 'report.json');
  const markdown = join(tempRoot, 'report.md');

  writeFileSync(handoff, [
    '# Bad Closeout',
    '',
    '## Status',
    '',
    '- Source-free queue checked.',
    '- public_ready: true',
    '- private inventory executed',
    '',
    '## Checks',
    '',
    '- none',
    '',
    '## Exact Staging',
    '',
    '- git add .',
    '',
    'Private PDFs and OCR are now public.'
  ].join('\n'));

  writeFileSync(memory, [
    '# Bad Memory',
    '',
    '## Status',
    '',
    '- public-ready: yes',
    '- local worker launched',
    '- embeddings created',
    '- private inventory ran',
    '- git add -A'
  ].join('\n'));

  const result = spawnSync('node', [
    resolve(root, 'scripts/kosmo-codex-closeout-hygiene-check.mjs'),
    '--handoff',
    handoff,
    '--memory',
    memory,
    '--out',
    out,
    '--markdown',
    markdown
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  let report = null;
  try {
    report = JSON.parse(readFileSync(out, 'utf8'));
  } catch {
    report = null;
  }
  const failedIds = new Set((report?.checks ?? [])
    .filter((check) => check.status === 'failed')
    .map((check) => check.id));
  const requiredFailures = [
    'handoff:public_ready_zero',
    'handoff:no_public_promotion',
    'handoff:no_private_inventory_execution',
    'handoff:no_broad_stage_command',
    'handoff:blocks_broad_stage',
    'memory:public_ready_zero',
    'memory:no_private_inventory_execution',
    'memory:no_training_activation',
    'memory:no_worker_launch_claim',
    'memory:no_broad_stage_command'
  ];
  const missingRequiredFailures = requiredFailures.filter((id) => !failedIds.has(id));
  const failedAsExpected = result.status !== 0
    && result.stdout.includes('codex_closeout_hygiene_check_failed')
    && missingRequiredFailures.length === 0;

  console.log('Kosmo Codex closeout hygiene negative smoke');
  console.log(`Status: ${failedAsExpected ? 'codex_closeout_hygiene_negative_smoke_passed' : 'codex_closeout_hygiene_negative_smoke_failed'}`);
  console.log(`Guard exit: ${result.status}`);

  if (!failedAsExpected) {
    if (missingRequiredFailures.length > 0) {
      console.error(`Missing required failure ids: ${missingRequiredFailures.join(', ')}`);
    }
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exitCode = 1;
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
