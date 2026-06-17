#!/usr/bin/env node

import { execSync, spawnSync } from 'node:child_process';

const args = parseArgs(process.argv.slice(2));
const baseUrl = String(args['base-url'] || 'http://127.0.0.1:3000').replace(/\/$/, '');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  assertNoConcurrentBuild();
  await assertServerReady(baseUrl);

  run('npm', ['run', 'public:kosmodraw-gate']);
  run('npm', ['run', 'public:route-content-smoke', '--', '--base-url', baseUrl]);
  run('npm', ['run', 'public:gate-check', '--', '--base-url', baseUrl]);
  run('npm', ['run', 'public:sitemap-route-leak-check', '--', '--base-url', baseUrl]);
}

function assertNoConcurrentBuild() {
  const processList = execSync('ps -eo pid=,args=', { encoding: 'utf8' });
  const blockers = processList
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      if (line.includes('scripts/public-demo-live-check.mjs')) return false;
      return /\bnext\s+build\b/.test(line) || /\bnpm\s+run\s+build\b/.test(line);
    });

  if (blockers.length > 0) {
    throw new Error(`Refusing live check while build is running:\n${blockers.join('\n')}\nRun build and live checks sequentially.`);
  }
}

async function assertServerReady(url) {
  let response;
  try {
    response = await fetch(`${url}/`);
  } catch (error) {
    throw new Error(`Public demo server is not reachable at ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    throw new Error(`Public demo server returned HTTP ${response.status} at ${url}/. Restart dev server before running the live check.`);
  }
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (index + 1 < argv.length && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
