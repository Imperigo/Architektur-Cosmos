#!/usr/bin/env node

import { spawn } from 'node:child_process';

const dateStamp = new Date().toISOString().slice(0, 10);
const args = [
  'scripts/kosmo-private-metadata-inventory-runner.mjs',
  '--fixture',
  'true',
  '--fixtureRoot',
  'examples/kosmo-references/private-metadata-inventory-fixture',
  '--out',
  `data/kosmo-private-metadata-inventory-fixture-smoke-${dateStamp}.json`,
  '--markdown',
  `docs/codex/kosmo-private-metadata-inventory-fixture-smoke-${dateStamp}.md`
];

const child = spawn(process.execPath, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});

child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
