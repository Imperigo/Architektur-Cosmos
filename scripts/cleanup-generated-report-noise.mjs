#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

const changedFiles = git(['diff', '--name-only'])
  .split('\n')
  .map((file) => file.trim())
  .filter(Boolean)
  .filter(isGeneratedReport);

const restored = [];
const kept = [];

for (const file of changedFiles) {
  const head = readHead(file);
  if (!head) {
    kept.push({ file, reason: 'not tracked in HEAD' });
    continue;
  }

  const current = readFileSync(file, 'utf8');
  if (normalizeReport(head) !== normalizeReport(current)) {
    kept.push({ file, reason: 'semantic diff' });
    continue;
  }

  if (!dryRun) writeFileSync(file, head, 'utf8');
  restored.push(file);
}

console.log('Generated report cleanup');
console.log(`Mode: ${dryRun ? 'dry-run' : 'restore'}`);
console.log(`Changed generated reports: ${changedFiles.length}`);
console.log(`Restored timestamp-only reports: ${restored.length}`);
console.log(`Kept semantic reports: ${kept.length}`);

if (restored.length) {
  console.log('\nRestored');
  restored.forEach((file) => console.log(`- ${file}`));
}

if (kept.length) {
  console.log('\nKept');
  kept.forEach((item) => console.log(`- ${item.file} (${item.reason})`));
}

function isGeneratedReport(file) {
  return file.includes('.generated.') && (file.endsWith('.json') || file.endsWith('.md'));
}

function readHead(file) {
  try {
    return git(['show', `HEAD:${file}`], 1024 * 1024 * 64);
  } catch {
    return null;
  }
}

function git(args, maxBuffer = 1024 * 1024 * 16) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer
  });
}

function normalizeReport(text) {
  return text
    .replace(/"generated_at": "[^"]+"/g, '"generated_at": "<generated_at>"')
    .replace(/"checked_at": "[^"]+"/g, '"checked_at": "<checked_at>"')
    .replace(/"created_at": "[^"]+"/g, '"created_at": "<created_at>"')
    .replace(/"updated_at": "[^"]+"/g, '"updated_at": "<updated_at>"')
    .replace(/"certificate_id": "[^"]+"/g, '"certificate_id": "<certificate_id>"')
    .replace(/^Generated: .+$/gm, 'Generated: <generated_at>')
    .replace(/^Checked: .+$/gm, 'Checked: <checked_at>');
}
