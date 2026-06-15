#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const dryRun = args.dryRun || `data/kosmo-owner-unlock-exact-reply-preview-${dateStamp}.json`;
const outputJson = args.out || `data/kosmo-owner-unlock-exact-reply-preview-check-${dateStamp}.json`;
const outputMd = args.markdown || `docs/codex/kosmo-owner-unlock-exact-reply-preview-check-${dateStamp}.md`;

const run = spawnSync(process.execPath, [
  'scripts/kosmo-owner-unlock-answer-dry-run-check.mjs',
  '--dryRun',
  dryRun,
  '--out',
  outputJson,
  '--markdown',
  outputMd
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: 'inherit'
});

process.exitCode = run.status ?? 1;

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
