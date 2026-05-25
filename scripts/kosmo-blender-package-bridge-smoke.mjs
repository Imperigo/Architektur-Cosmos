#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = parseArgs(process.argv.slice(2));

const blenderBin = resolveBlenderBin();
const project = resolve(args.project || 'examples/kosmo-projects/kosmo-demo-001/kosmo.project.json');
const addonCode = resolveAddonCode();
const pythonScript = resolve('scripts/kosmo_blender_package_bridge_smoke.py');
const outputBlend = args['output-blend'] ? resolve(args['output-blend']) : '';
const expectedRooms = String(args['expected-rooms'] || '3');
const expectContext = Boolean(args['expect-context']);

if (!existsSync(blenderBin)) {
  console.error(`Blender binary not found: ${blenderBin}`);
  process.exit(1);
}
if (!existsSync(project)) {
  console.error(`Kosmo project manifest not found: ${project}`);
  process.exit(1);
}
if (!existsSync(addonCode)) {
  console.error(`KosmoDraw addon code folder not found: ${addonCode}`);
  process.exit(1);
}
if (!existsSync(pythonScript)) {
  console.error(`Blender smoke script not found: ${pythonScript}`);
  process.exit(1);
}

const blenderArgs = [
  '--factory-startup',
  '--background',
  '--python',
  pythonScript,
  '--',
  '--addon-code',
  addonCode,
  '--project',
  project,
  '--expected-rooms',
  expectedRooms
];

if (outputBlend) blenderArgs.push('--output-blend', outputBlend);
if (expectContext) blenderArgs.push('--expect-context');

console.log('Kosmo Blender package bridge smoke');
console.log(`Blender: ${blenderBin}`);
console.log(`Project: ${relative(root, project)}`);
console.log(`Addon code: ${relative(root, addonCode)}`);
if (outputBlend) console.log(`Output blend: ${relative(root, outputBlend)}`);
if (expectContext) console.log('Expect context: yes');
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

function resolveBlenderBin() {
  const candidates = [
    process.env.BLENDER_BIN,
    'blender',
    '/Applications/Blender.app/Contents/MacOS/Blender',
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

function resolveAddonCode() {
  const candidates = [
    args['addon-code'],
    process.env.KOSMO_DRAW_ADDON_CODE,
    '../KosmoDraw/code',
    process.env.HOME
      ? `${process.env.HOME}/Documents/Claude/Projects/KosmoDraw/code`
      : ''
  ].filter(Boolean);

  for (const candidate of candidates) {
    const pathname = resolve(candidate);
    if (existsSync(pathname)) return pathname;
  }
  return resolve(candidates[0] || '../KosmoDraw/code');
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
