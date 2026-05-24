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
  if (!slug) throw new Error('Usage: npm run cosmos:entry-build -- --entry villa-savoye --mode review');
  const mode = args.mode || 'review';
  if (mode !== 'review') throw new Error('Only --mode review is supported. These tools never publish automatically.');

  const entry = await loadEntry(slug);
  if (!entry) throw new Error(`No entry found for "${slug}".`);

  const outputDir = path.join(root, 'out/cosmos-entry-build', entry.slug);
  const intakeReviewDir = path.join(root, 'archive-intake', entry.slug, 'review');
  await Promise.all([outputDir, intakeReviewDir].map((directory) => mkdir(directory, { recursive: true })));

  const steps = [
    runStep('plan_generate', ['run', 'cosmos:plan-generate', '--', '--entry', entry.slug]),
    runStep('model_generate', ['run', 'cosmos:model-generate', '--', '--entry', entry.slug]),
    runStep('text_generate', ['run', 'cosmos:text-generate', '--', '--entry', entry.slug])
  ];

  const review = {
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    generated_at: new Date().toISOString(),
    mode,
    status: 'local_review_pack_generated',
    writes_public_database: false,
    uploads_assets: false,
    approval_required_before_apply: true,
    steps,
    outputs: {
      vector_plan_graph: `archive-intake/${entry.slug}/analysis/vector-plan-graph.json`,
      model_tool_run: `archive-intake/${entry.slug}/automation/model-tool-run.json`,
      architecture_text: `out/text-review/${entry.slug}/architecture-text.json`
    },
    next_review: [
      'Open the plan SVG and check diagram quality.',
      'Open generated GLB where available and inspect layer names.',
      'Read architecture text and approve only source-backed claims.',
      'Run archive validation before any later data promotion.'
    ]
  };

  await writeJson(path.join(outputDir, 'entry-build-review.json'), review);
  await writeFile(path.join(outputDir, 'entry-build-review.md'), renderMarkdown(review), 'utf8');
  await writeJson(path.join(intakeReviewDir, 'entry-build-review.json'), review);
  await writeFile(path.join(intakeReviewDir, 'entry-build-review.md'), renderMarkdown(review), 'utf8');

  console.log('Architecture Cosmos entry build review');
  console.log(`Entry: ${entry.title} (${entry.slug})`);
  console.log(`Steps: ${steps.length}`);
  console.log('Wrote:');
  console.log(`- out/cosmos-entry-build/${entry.slug}/entry-build-review.json`);
  console.log(`- out/cosmos-entry-build/${entry.slug}/entry-build-review.md`);
  console.log(`- archive-intake/${entry.slug}/review/entry-build-review.json`);
  console.log(`- archive-intake/${entry.slug}/review/entry-build-review.md`);
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
  if (result.status !== 0) throw new Error(`${name} failed:\n${result.stdout}\n${result.stderr}`);
  return {
    name,
    command: `npm ${npmArgs.join(' ')}`,
    status: 'passed',
    output_excerpt: String(result.stdout).trim().slice(-1400)
  };
}

function renderMarkdown(review) {
  const lines = [
    `# ${review.title} / Cosmos Entry Build Review`,
    '',
    `Generated: ${review.generated_at}`,
    `Mode: \`${review.mode}\``,
    `Writes public database: \`${review.writes_public_database}\``,
    '',
    '## Steps',
    ''
  ];
  review.steps.forEach((step, index) => {
    lines.push(`${index + 1}. **${step.name}** — \`${step.status}\``);
    lines.push(`   - ${step.command}`);
  });
  lines.push('', '## Outputs', '');
  Object.entries(review.outputs).forEach(([key, value]) => lines.push(`- ${key}: \`${value}\``));
  lines.push('', '## Next Review', '');
  review.next_review.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
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
