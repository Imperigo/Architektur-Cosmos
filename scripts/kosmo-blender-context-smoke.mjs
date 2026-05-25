#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = parseArgs(process.argv.slice(2));

const blenderBin = resolveBlenderBin();
const projectRoot = resolveProjectRoot(args.project || 'examples/kosmo-projects/kosmo-demo-001');
const blenderScript = resolve(projectRoot, args.script || 'design/blender-context-import.generated.py');
const outputBlend = args['output-blend'] ? resolve(args['output-blend']) : '';
const summaryJson = args['summary-json']
  ? resolve(args['summary-json'])
  : resolve(projectRoot, 'design/blender-context-import.smoke.json');

if (!existsSync(blenderBin)) {
  console.error(`Blender binary not found: ${blenderBin}`);
  process.exit(1);
}
if (!existsSync(blenderScript)) {
  console.error(`Blender context script not found: ${blenderScript}`);
  console.error('Run npm run kosmo:blender-context-import -- --project <project_path> first.');
  process.exit(1);
}

const blenderArgs = [
  '--factory-startup',
  '--background',
  '--python',
  blenderScript,
  '--',
  '--summary-json',
  summaryJson
];

if (outputBlend) blenderArgs.push('--output-blend', outputBlend);

console.log('Kosmo Blender context smoke');
console.log(`Blender: ${blenderBin}`);
console.log(`Project: ${relative(root, projectRoot)}`);
console.log(`Script: ${relative(root, blenderScript)}`);
console.log(`Summary: ${relative(root, summaryJson)}`);
if (outputBlend) console.log(`Output blend: ${relative(root, outputBlend)}`);
console.log('');

const result = spawnSync(blenderBin, blenderArgs, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env }
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 0);

function resolveProjectRoot(projectArg) {
  const pathname = resolve(projectArg);
  if (pathname.endsWith('kosmo.project.json')) return dirname(pathname);
  return pathname;
}

function resolveBlenderBin() {
  const candidates = [
    process.env.BLENDER_BIN,
    'blender',
    '/Applications/Blender.app/Contents/MacOS/Blender',
    process.env.HOME
      ? `${process.env.HOME}/Applications/Blender.app/Contents/MacOS/Blender`
      : '',
    process.env.HOME
      ? `${process.env.HOME}/Library/Application Support/Steam/steamapps/common/Blender/Blender.app/Contents/MacOS/Blender`
      : ''
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'blender') {
      const found = spawnSync('zsh', ['-lc', 'command -v blender'], { encoding: 'utf8' });
      const pathname = found.stdout.trim();
      if (pathname) return pathname;
      continue;
    }
    if (existsSync(candidate)) return candidate;
  }

  return candidates[0] || 'blender';
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}
