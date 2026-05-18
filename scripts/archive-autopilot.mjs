#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const title = args.title;
  const input = args.input;
  const copyright = args.copyright ?? 'needs_permission';
  const style = args.style ?? 'modern_architecture';
  const type = args.type ?? 'building';
  const year = args.year ?? '2025';
  const sourceUrl = args['source-url'] ?? '';

  const errors = [];
  if (!title) errors.push('--title is required');
  if (!input) errors.push('--input is required, for example archive-inbox/villa-savoye');
  if (errors.length > 0) throw new Error(`Architecture Cosmos autopilot\n${errors.map((error) => `- ${error}`).join('\n')}`);

  const slug = slugify(title);
  const summaryRoot = path.join(root, 'out/archive-automation', slug);
  await mkdir(summaryRoot, { recursive: true });

  const steps = [];
  steps.push(runStep('capture', [
    'run',
    'archive:capture',
    '--',
    '--input',
    input,
    '--title',
    title,
    '--copyright',
    copyright,
    '--style',
    style,
    '--type',
    type,
    '--year',
    year,
    ...(sourceUrl ? ['--source-url', sourceUrl] : [])
  ]));

  const captureDraft = path.join(root, 'out/archive-captures', slug, 'entry-draft.json');
  steps.push(runStep('model-plan', ['run', 'archive:model-plan', '--', '--entry', slug, '--draft', path.relative(root, captureDraft)]));

  const manifestStep = await maybeRunBundledAssetManifest(slug, copyright);
  if (manifestStep) steps.push(manifestStep);

  if (slug === 'villa-savoye') {
    steps.push(runStep('model-generate', ['run', 'archive:model-generate', '--', '--entry', slug]));
  } else {
    steps.push({
      name: 'model-generate',
      status: 'skipped',
      command: 'npm run archive:model-generate',
      reason: 'procedural massing template currently exists only for villa-savoye'
    });
  }

  const captureManifestPath = path.join(root, 'out/archive-captures', slug, 'capture-manifest.json');
  const modelManifestPath = path.join(root, 'archive-intake', slug, 'models/model-package.manifest.json');
  const automationSummary = {
    generated_at: new Date().toISOString(),
    upload_allowed: false,
    upload_mode: 'local_autopilot_only',
    title,
    slug,
    input,
    copyright,
    steps,
    outputs: {
      capture_manifest: existsSync(captureManifestPath) ? path.relative(root, captureManifestPath) : null,
      entry_draft: existsSync(captureDraft) ? path.relative(root, captureDraft) : null,
      model_manifest: existsSync(modelManifestPath) ? path.relative(root, modelManifestPath) : null,
      automation_summary: `out/archive-automation/${slug}/run-summary.json`,
      next_actions: `out/archive-automation/${slug}/next-actions.md`
    },
    next_phase: nextPhase(slug, steps)
  };

  await writeFile(path.join(summaryRoot, 'run-summary.json'), `${JSON.stringify(automationSummary, null, 2)}\n`, 'utf8');
  await writeFile(path.join(summaryRoot, 'next-actions.md'), buildNextActions(automationSummary), 'utf8');

  console.log('Architecture Cosmos local archive autopilot');
  console.log(`Title: ${title}`);
  console.log(`Slug: ${slug}`);
  console.log(`Input: ${input}`);
  console.log(`Steps: ${steps.map((step) => `${step.name}:${step.status}`).join(' / ')}`);
  console.log(`Summary: ${path.relative(root, path.join(summaryRoot, 'run-summary.json'))}`);
  console.log('Upload mode: LOCAL ONLY. No D1, R2, Cloudflare or public write was performed.');

  const failed = steps.find((step) => step.status === 'failed');
  if (failed) process.exit(1);
}

async function maybeRunBundledAssetManifest(slug, copyright) {
  const entries = JSON.parse(await readFile(path.join(root, 'data/mock-entries.json'), 'utf8'));
  const entry = entries.find((candidate) => candidate.slug === slug || candidate.id === slug);
  if (!entry?.database_profile) {
    return {
      name: 'asset-manifest',
      status: 'skipped',
      command: 'npm run archive:asset-manifest',
      reason: 'entry is not yet a bundled database pilot; capture already wrote a local asset-manifest.json'
    };
  }

  return runStep('asset-manifest', ['run', 'archive:asset-manifest', '--', '--entry', slug, '--copyright', copyright]);
}

function runStep(name, npmArgs) {
  const command = `npm ${npmArgs.join(' ')}`;
  const result = spawnSync('npm', npmArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const status = result.status === 0 ? 'passed' : 'failed';
  if (result.stdout.trim()) console.log(result.stdout.trim());
  if (result.stderr.trim()) console.error(result.stderr.trim());

  return {
    name,
    status,
    command,
    exit_code: result.status,
    stdout_tail: tail(result.stdout),
    stderr_tail: tail(result.stderr)
  };
}

function buildNextActions(summary) {
  return `# ${summary.title} / Autopilot Next Actions

## Status
${summary.steps.map((step) => `- ${step.name}: ${step.status}${step.reason ? ` (${step.reason})` : ''}`).join('\n')}

## Generated outputs
${Object.entries(summary.outputs).map(([key, value]) => `- ${key}: ${value ?? 'not generated'}`).join('\n')}

## Recommended next phase
${summary.next_phase.map((item) => `- ${item}`).join('\n')}

## Safety
- This run was local only.
- No D1 write was performed.
- No R2 upload was performed.
- Review rights and source reliability before publishing any generated media or model.
`;
}

function nextPhase(slug, steps) {
  const failed = steps.filter((step) => step.status === 'failed');
  if (failed.length > 0) return failed.map((step) => `Fix failed step: ${step.name}`);
  if (slug === 'villa-savoye') {
    return [
      'Open archive-intake/villa-savoye/models/low.glb in Blender.',
      'Compare the diagrammatic massing to the plan/section assets.',
      'Split reviewed geometry into site, mass, structure, circulation and tectonic model layers.',
      'Prepare own/licensed video frames before Gaussian splat generation.'
    ];
  }
  return [
    'Review out/archive-captures/{slug}/entry-draft.json.',
    'Promote the entry into data/mock-entries.json once source and rights review pass.',
    'Create a procedural model template for this typology if no manual model exists.',
    'Prepare own/licensed video frames before Gaussian splat generation.'
  ];
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

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled-entry';
}

function tail(value) {
  const lines = value.trim().split('\n').filter(Boolean);
  return lines.slice(-8).join('\n');
}
