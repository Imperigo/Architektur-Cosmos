#!/usr/bin/env node

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
  const slug = args.entry || args.slug;
  if (!slug) throw new Error('Usage: npm run cosmos:model-generate -- --entry villa-savoye');

  const entry = await loadEntry(slug);
  if (!entry) throw new Error(`No entry found for "${slug}".`);

  const intakeRoot = path.join(root, 'archive-intake', entry.slug);
  const automationDir = path.join(intakeRoot, 'automation');
  const modelsDir = path.join(intakeRoot, 'models');
  await Promise.all([automationDir, modelsDir].map((directory) => mkdir(directory, { recursive: true })));

  const steps = [];
  steps.push(runStep('model-plan', ['run', 'archive:model-plan', '--', '--entry', entry.slug]));

  const template = chooseTemplate(entry);
  if (template.can_generate) {
    steps.push(runStep('procedural-model', ['run', 'archive:model-generate', '--', '--entry', entry.slug]));
  } else {
    await writeJson(path.join(modelsDir, 'model-generation-review.json'), buildGenerationReview(entry, template));
  }

  const modelToolRun = {
    tool_id: 'model_generate',
    entry_id: entry.id,
    slug: entry.slug,
    generated_at: new Date().toISOString(),
    status: template.can_generate ? 'model_plan_and_glb_generated' : 'model_plan_generated_needs_template_review',
    template,
    writes_public_database: false,
    uploads_assets: false,
    public_use_allowed: false,
    outputs: {
      model_package: `archive-intake/${entry.slug}/models/model-package.manifest.json`,
      geometry_profile: template.can_generate ? `archive-intake/${entry.slug}/analysis/generated-geometry-profile.json` : `archive-intake/${entry.slug}/models/model-generation-review.json`,
      blender_profile: `archive-intake/${entry.slug}/automation/blender-import-profile.json`,
      archicad_profile: `archive-intake/${entry.slug}/automation/archicad-exchange-profile.json`
    },
    steps,
    next_review: [
      'Review generated layer names against the Blender/ArchiCAD layer contract.',
      'Do not publish generated geometry until source basis, proportions and rights status are checked.',
      'Add a project-specific procedural template when plan and section evidence is sufficient.'
    ]
  };

  await writeJson(path.join(automationDir, 'model-tool-run.json'), modelToolRun);

  console.log('Architecture Cosmos 3D model tool');
  console.log(`Entry: ${entry.title} (${entry.slug})`);
  console.log(`Status: ${modelToolRun.status}`);
  console.log(`Template: ${template.id}`);
  console.log('Wrote:');
  console.log(`- archive-intake/${entry.slug}/automation/model-tool-run.json`);
  if (!template.can_generate) console.log(`- archive-intake/${entry.slug}/models/model-generation-review.json`);
  console.log('');
  console.log('No upload was performed. Public release requires review.');
}

async function loadEntry(slug) {
  const entries = JSON.parse(await readFile(path.join(root, 'data/mock-entries.json'), 'utf8'));
  return entries.find((entry) => entry.slug === slug || entry.id === slug);
}

function runStep(name, npmArgs) {
  const command = process.env.npm_execpath ? process.execPath : 'npm';
  const args = process.env.npm_execpath ? [process.env.npm_execpath, ...npmArgs] : npmArgs;
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (result.status !== 0) {
    throw new Error(`${name} failed:\n${result.stdout}\n${result.stderr}`);
  }

  return {
    name,
    command: `npm ${npmArgs.join(' ')}`,
    status: 'passed',
    output_excerpt: cleanOutput(result.stdout).slice(-1200)
  };
}

function chooseTemplate(entry) {
  if (entry.slug === 'villa-savoye') {
    return {
      id: 'modern_villa_frame',
      can_generate: true,
      reason: 'Villa Savoye has the first reviewed procedural massing template.',
      layer_contract: ['site', 'mass', 'structure', 'facade', 'circulation', 'materials']
    };
  }

  const suggested = entry.entry_type === 'landscape_project' || entry.entry_type === 'infrastructure'
    ? 'linear_landscape_infrastructure'
    : hasAny(entry, ['courtyard', 'hof', 'monastery', 'kloster', 'care'])
      ? 'courtyard_institution'
      : entry.year_start < 1500
        ? 'archaeological_or_pre_modern_mass'
        : 'generic_analytical_mass';

  return {
    id: suggested,
    can_generate: false,
    reason: 'A project-specific procedural template is not reviewed yet. Model planning was generated instead.',
    layer_contract: ['site', 'mass', 'structure', 'facade', 'interior', 'tectonic', 'materials']
  };
}

function buildGenerationReview(entry, template) {
  return {
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    generated_at: new Date().toISOString(),
    generator: 'cosmos-generate-model',
    status: 'needs_project_specific_template',
    template_candidate: template,
    public_use_allowed: false,
    review_status: 'needs_source_review',
    recommended_layers: template.layer_contract.map((layer) => ({
      layer,
      target_glb: `archive-intake/${entry.slug}/models/${layer}.glb`,
      review_status: 'planned',
      source_basis: sourceBasis(entry)
    })),
    required_inputs_before_geometry: [
      'reviewed plan or vector-plan graph',
      'reviewed section or massing evidence',
      'material/structure analysis layer',
      'rights-safe public/private release decision'
    ],
    note: 'The tool deliberately avoids generating plausible-looking geometry when the source basis is not strong enough.'
  };
}

function hasAny(entry, needles) {
  const haystack = [entry.title, entry.short_description, entry.full_description, ...(entry.themes ?? []), ...(entry.vibes ?? [])].join(' ').toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

function sourceBasis(entry) {
  const sources = [
    entry.source_url,
    ...(entry.source_documents ?? []),
    ...(entry.source_candidates ?? []).map((source) => source.title || source.url)
  ].filter(Boolean);
  return sources.length ? sources.slice(0, 5).join(' | ') : 'entry metadata only; needs source review';
}

function cleanOutput(value) {
  return String(value).replace(/\s+\n/g, '\n').trim();
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

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
