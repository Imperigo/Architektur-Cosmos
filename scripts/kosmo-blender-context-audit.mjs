#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = parseArgs(process.argv.slice(2));

const blenderBin = resolveBlenderBin();
const projectRoot = resolveProjectRoot(args.project || 'examples/kosmo-projects/kosmo-demo-001');
const planPath = resolve(projectRoot, args.plan || 'design/blender-context-import.generated.json');
const smokePath = resolve(projectRoot, args['smoke-json'] || 'design/blender-context-import.smoke.json');
const blendPath = resolveBlendPath();
const auditScript = resolve(root, 'scripts/kosmo_blender_context_audit.py');
const summaryJson = args['summary-json']
  ? resolve(args['summary-json'])
  : resolve(projectRoot, 'design/blender-context-import.audit.json');

if (!existsSync(blenderBin)) {
  console.error(`Blender binary not found: ${blenderBin}`);
  process.exit(1);
}
if (!existsSync(planPath)) {
  console.error(`Blender context import plan not found: ${planPath}`);
  console.error('Run npm run kosmo:blender-context-import -- --project <project_path> first.');
  process.exit(1);
}
if (!existsSync(blendPath)) {
  console.error(`Blend file not found: ${blendPath}`);
  console.error('Run npm run kosmo:blender-context-smoke -- --project <project_path> --output-blend <blend_path> first.');
  process.exit(1);
}
if (!existsSync(auditScript)) {
  console.error(`Blender audit script not found: ${auditScript}`);
  process.exit(1);
}

const blenderArgs = [
  '--factory-startup',
  '--background',
  '--python',
  auditScript,
  '--',
  '--blend',
  blendPath,
  '--plan',
  planPath,
  '--summary-json',
  summaryJson
];

console.log('Kosmo Blender context audit');
console.log(`Blender: ${blenderBin}`);
console.log(`Project: ${relative(root, projectRoot)}`);
console.log(`Blend: ${relative(root, blendPath)}`);
console.log(`Plan: ${relative(root, planPath)}`);
console.log(`Summary: ${relative(root, summaryJson)}`);
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

function resolveBlendPath() {
  if (args.blend) return resolve(args.blend);
  if (existsSync(smokePath)) {
    const smoke = safeReadJson(smokePath);
    if (smoke?.output_blend) return resolve(smoke.output_blend);
  }
  return resolve(projectRoot, 'viz/previews/blender-context-import-smoke.blend');
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

function safeReadJson(pathname) {
  try {
    return JSON.parse(readFileSync(pathname, 'utf8'));
  } catch {
    return null;
  }
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
