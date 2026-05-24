#!/usr/bin/env node

import { existsSync, statSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const outputRoot = resolve(rootDir, 'out/brain-model-promote', today);
const manifestPath = resolve(rootDir, 'data/public-model-previews.json');
const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  const slug = args.entry || args.slug;
  if (!slug) throw new Error('Usage: npm run brain:promote-model -- --entry villa-savoye --confirm-public-model');

  await mkdir(outputRoot, { recursive: true });
  const entries = JSON.parse(await readFile(resolve(rootDir, 'data/mock-entries.json'), 'utf8'));
  const entry = entries.find((item) => item.slug === slug || item.id === slug);
  if (!entry) throw new Error(`No entry found for "${slug}".`);

  const source = resolve(rootDir, 'archive-intake', entry.slug, 'models/low.glb');
  const geometryProfile = resolve(rootDir, 'archive-intake', entry.slug, 'analysis/generated-geometry-profile.json');
  const toolRunPath = resolve(rootDir, 'archive-intake', entry.slug, 'automation/model-tool-run.json');
  const targetRelative = `public/archive-models/${entry.slug}/low.glb`;
  const target = resolve(rootDir, targetRelative);
  const confirmed = Boolean(args['confirm-public-model']);

  const checks = [
    checkFile('local_review_glb', source),
    checkFile('geometry_profile', geometryProfile),
    checkFile('model_tool_run', toolRunPath)
  ];
  const glbCheck = existsSync(source) ? await validateGlb(source) : { id: 'glb_header', status: 'failed', message: 'Missing GLB source.' };
  checks.push(glbCheck);

  let toolRun = null;
  if (existsSync(toolRunPath)) toolRun = JSON.parse(await readFile(toolRunPath, 'utf8'));
  checks.push(checkToolRun(toolRun));

  const failed = checks.filter((check) => check.status !== 'passed');
  const report = {
    generated_at: new Date().toISOString(),
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    mode: confirmed ? 'promote_public_preview' : 'dry_run_review_only',
    writes_public_files: confirmed,
    writes_public_manifest: confirmed,
    uploads_assets: false,
    writes_d1_or_r2: false,
    source: relative(source),
    target: targetRelative,
    checks,
    status: failed.length ? 'blocked' : confirmed ? 'promoted' : 'ready_for_owner_confirmation',
    next_action: failed.length
      ? 'Fix failed checks before public preview promotion.'
      : confirmed
        ? 'Run build and review the entry page 3D viewer.'
        : 'Re-run with --confirm-public-model after owner review.'
  };

  if (failed.length) {
    await writeReport(report);
    printReport(report);
    process.exitCode = 1;
    return;
  }

  if (confirmed) {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    await upsertManifest(entry, toolRun, targetRelative);
  }

  await writeReport(report);
  printReport(report);
}

async function validateGlb(filePath) {
  const buffer = await readFile(filePath);
  const magic = buffer.subarray(0, 4).toString('utf8');
  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);
  if (magic !== 'glTF') {
    return { id: 'glb_header', status: 'failed', message: `Expected glTF magic, got ${magic}.` };
  }
  if (version !== 2) {
    return { id: 'glb_header', status: 'failed', message: `Expected GLB v2, got v${version}.` };
  }
  if (declaredLength !== buffer.length) {
    return { id: 'glb_header', status: 'failed', message: `Declared length ${declaredLength} differs from file size ${buffer.length}.` };
  }
  return { id: 'glb_header', status: 'passed', message: `Valid GLB v2, ${buffer.length} bytes.` };
}

function checkFile(id, filePath) {
  if (!existsSync(filePath)) return { id, status: 'failed', message: `Missing ${relative(filePath)}.` };
  return { id, status: 'passed', message: `${relative(filePath)} exists (${statSync(filePath).size} bytes).` };
}

function checkToolRun(toolRun) {
  if (!toolRun) return { id: 'tool_run_status', status: 'failed', message: 'Missing model-tool-run.json.' };
  if (toolRun.status !== 'model_plan_and_glb_generated') {
    return { id: 'tool_run_status', status: 'failed', message: `Unexpected tool status: ${toolRun.status}.` };
  }
  return { id: 'tool_run_status', status: 'passed', message: `Template ${toolRun.template?.id ?? 'unknown'} generated a review GLB.` };
}

async function upsertManifest(entry, toolRun, targetRelative) {
  const manifest = existsSync(manifestPath)
    ? JSON.parse(await readFile(manifestPath, 'utf8'))
    : { version: 1, models: [] };
  const models = Array.isArray(manifest.models) ? manifest.models : [];
  const next = {
    slug: entry.slug,
    title: entry.title,
    url: `/${targetRelative.replace(/^public\//, '')}`,
    source_path: targetRelative,
    status: 'public_preview_glb',
    template_id: toolRun?.template?.id ?? 'unknown',
    promoted_at: new Date().toISOString(),
    license: 'generated_diagrammatic_model',
    public_display_status: 'owner_approved_public_preview',
    caveat: 'Diagrammatisches Architecture-Cosmos-Studienmodell, keine vermessene Rekonstruktion.'
  };
  const withoutEntry = models.filter((item) => item.slug !== entry.slug);
  withoutEntry.push(next);
  withoutEntry.sort((a, b) => a.slug.localeCompare(b.slug));
  await writeFile(manifestPath, `${JSON.stringify({ ...manifest, version: 1, models: withoutEntry }, null, 2)}\n`, 'utf8');
}

async function writeReport(report) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await writeFile(resolve(outputRoot, `brain-model-promote-${timestamp}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'latest.md'), renderMarkdown(report), 'utf8');
}

function renderMarkdown(report) {
  const lines = [
    '# Brain Model Promote',
    '',
    `Generated: ${report.generated_at}`,
    `Entry: ${report.title} (\`${report.slug}\`)`,
    `Mode: \`${report.mode}\``,
    `Status: \`${report.status}\``,
    '',
    '## Checks',
    ''
  ];
  for (const check of report.checks) lines.push(`- ${check.status === 'passed' ? 'PASS' : 'FAIL'} / ${check.id}: ${check.message}`);
  lines.push('', '## Safety', '');
  lines.push(`- Writes public files: ${report.writes_public_files}`);
  lines.push(`- Writes public manifest: ${report.writes_public_manifest}`);
  lines.push('- Uploads R2: false');
  lines.push('- Writes D1: false');
  lines.push('', `Next: ${report.next_action}`, '');
  return `${lines.join('\n')}\n`;
}

function printReport(report) {
  console.log('Architecture Cosmos Brain Model Promote');
  console.log(`Entry: ${report.title} (${report.slug})`);
  console.log(`Mode: ${report.mode}`);
  console.log(`Status: ${report.status}`);
  console.log(`Report: out/brain-model-promote/${today}/latest.md`);
}

function relative(filePath) {
  return filePath.replace(`${rootDir}/`, '');
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
