#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const cardPath = resolve(root, args.card || `data/kosmo-owner-unlock-fast-reply-card-${dateStamp}.json`);
const outputJson = args.out || `data/kosmo-owner-unlock-exact-reply-preview-${dateStamp}.json`;
const outputMd = args.markdown || `docs/codex/kosmo-owner-unlock-exact-reply-preview-${dateStamp}.md`;
const runId = args.runId || `exact-reply-preview-${dateStamp}`;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const card = JSON.parse(await readFile(cardPath, 'utf8'));
  const replyLines = card.recommended_reply_if_exact_root_is_true || [];
  if (card.status !== 'owner_unlock_fast_reply_card_ready') {
    throw new Error(`Fast reply card not ready: ${card.status}`);
  }
  if (replyLines.length === 0) throw new Error('Fast reply card has no recommended exact reply.');

  const answer = replyLines.join('; ');
  const run = spawnSync(process.execPath, [
    'scripts/kosmo-owner-unlock-answer-dry-run.mjs',
    '--answer',
    answer,
    '--runId',
    runId,
    '--out',
    outputJson,
    '--markdown',
    outputMd
  ], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit'
  });

  process.exitCode = run.status ?? 1;
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
