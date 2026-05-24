#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const confirmed = Boolean(args['confirm-autopush']) || process.env.ARCHITECTURE_COSMOS_BRAIN_AUTOPUSH === '1';
const message = String(args.message || 'Brain autopush update');
const remote = String(args.remote || 'origin');
const branch = String(args.branch || 'main');
const timeoutMs = Number(args['timeout-ms'] || process.env.BRAIN_AUTOPUSH_TIMEOUT_MS || 1000 * 60 * 10);

main();

function main() {
  if (!confirmed) {
    fail('Refusing Brain autopush. Re-run with --confirm-autopush or set ARCHITECTURE_COSMOS_BRAIN_AUTOPUSH=1.');
  }

  ensureOnBranch(branch);
  const statusBefore = gitStatus();
  const changedFiles = parseStatusFiles(statusBefore.stdout);
  assertSafeFiles(changedFiles);

  runChecked('security:check', ['npm', 'run', 'security:check']);
  runChecked('lint', ['npm', 'run', 'lint']);
  runChecked('build', ['npm', 'run', 'build']);

  const statusAfterChecks = gitStatus();
  const filesAfterChecks = parseStatusFiles(statusAfterChecks.stdout);
  assertSafeFiles(filesAfterChecks);

  if (filesAfterChecks.length > 0) {
    stageFiles(filesAfterChecks);
    const staged = runGit(['diff', '--cached', '--quiet'], { allowFailure: true });
    if (staged.status !== 0) {
      runChecked('git commit', ['git', 'commit', '-m', message]);
    }
  }

  const ahead = commitsAhead(remote, branch);
  if (ahead <= 0) {
    console.log('Architecture Cosmos Brain Autopush');
    console.log('No commits ahead of remote. Nothing to push.');
    return;
  }

  runChecked('git push', ['git', 'push', remote, branch]);
  console.log('Architecture Cosmos Brain Autopush');
  console.log(`Pushed ${ahead} commit(s) to ${remote}/${branch}.`);
}

function ensureOnBranch(expectedBranch) {
  const current = runGit(['branch', '--show-current']).stdout.trim();
  if (current !== expectedBranch) {
    fail(`Refusing Brain autopush from branch "${current}". Expected "${expectedBranch}".`);
  }
}

function gitStatus() {
  return runGit(['status', '--porcelain=v1']);
}

function parseStatusFiles(statusOutput) {
  return statusOutput
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(3);
      return rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath;
    });
}

function assertSafeFiles(files) {
  const unsafe = files.filter((file) => isUnsafePath(file));
  if (unsafe.length > 0) {
    fail(`Refusing to stage/push unsafe local files:\n${unsafe.map((file) => `- ${file}`).join('\n')}`);
  }
}

function isUnsafePath(file) {
  const normalized = file.replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('..')) return true;
  if (normalized.startsWith('archive-inbox/')) return true;
  if (normalized.startsWith('archive-intake/')) return true;
  if (normalized.startsWith('out/')) return true;
  if (normalized.startsWith('.next/')) return true;
  if (normalized.startsWith('node_modules/')) return true;
  if (normalized.startsWith('.wrangler/')) return true;
  if (normalized === '.env' || normalized.startsWith('.env.')) return true;
  if (normalized.includes('/.env')) return true;
  return false;
}

function stageFiles(files) {
  if (files.length === 0) return;
  runChecked('git add', ['git', 'add', '--', ...files]);
}

function commitsAhead(remoteName, branchName) {
  const result = runGit(['rev-list', '--count', `${remoteName}/${branchName}..HEAD`]);
  return Number(result.stdout.trim() || 0);
}

function runGit(argsList, options = {}) {
  return run(['git', ...argsList], options);
}

function runChecked(label, command) {
  console.log(`Brain autopush gate: ${label}`);
  const result = run(command);
  if (result.status !== 0) {
    const reason = result.signal ? ` (${result.signal})` : '';
    fail(`${label} failed${reason}\n${tail(result.stdout)}\n${tail(result.stderr)}`);
  }
  return result;
}

function run(command, options = {}) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 32,
    timeout: timeoutMs
  });
  if (result.error && !options.allowFailure) fail(result.error.message);
  return result;
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
  return lines.slice(-20).join('\n');
}

function fail(messageText) {
  console.error(messageText);
  process.exit(1);
}
