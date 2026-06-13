#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const queuePath = resolve(root, args.queue || `data/kosmo-human-decision-queue-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-human-decision-owner-batches-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-human-decision-owner-batches-${dateStamp}.md`);

const batchDefinitions = [
  {
    id: 'batch-a-villa-savoye-image-candidates',
    label: 'Batch A: Villa Savoye Image Candidates',
    intent: 'Decide whether any Villa Savoye image candidate should enter a deeper source/credit review.',
    groups: ['villa-savoye-public-image-candidates'],
    recommended_stance: [
      'If no public preview is needed now, leave all three blocked.',
      'If a preview is needed, open a separate source-basis review before any public-ready change.'
    ]
  },
  {
    id: 'batch-b-villa-savoye-derived-files',
    label: 'Batch B: Villa Savoye Derived Files',
    intent: 'Keep generated or derived Villa Savoye files from becoming public-facing without source-basis review.',
    groups: ['villa-savoye-blocked-derived-files'],
    recommended_stance: [
      'Record `keep_blocked` unless the owner explicitly starts a source-basis review for this batch.'
    ]
  },
  {
    id: 'batch-c-model-promotion-confirmation',
    label: 'Batch C: Model Promotion Confirmation',
    intent: 'Prevent diagrammatic massing/model studies from being presented as measured or source-complete architecture models.',
    groups: ['model-promotion-owner-confirmation'],
    recommended_stance: [
      'Defer promotion until a separate model-quality and source-confidence review exists.'
    ]
  },
  {
    id: 'batch-d-sogn-benedetg-source-gap',
    label: 'Batch D: Sogn Benedetg Source Gap',
    intent: 'Keep the Sogn Benedetg lane honest until the larger private library roots are visible.',
    groups: ['sogn-benedetg-source-gap'],
    recommended_stance: [
      'Keep open until the large OneDrive/book/ETH/HSLU library can be indexed or mounted.'
    ]
  },
  {
    id: 'batch-e-kosmoasset-human-reviews',
    label: 'Batch E: KosmoAsset Human Reviews',
    intent: 'Review local-only study assets for Blender, DXF, web and future ArchiCAD workflows without public promotion.',
    lane: 'KosmoAsset',
    recommended_stance: [
      'Use `needs-review` until a named reviewer has opened the local files.',
      'Use `block-public` for anything that should remain private/local even after local approval.'
    ]
  }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const queue = JSON.parse(await readFile(queuePath, 'utf8'));
  const batches = buildBatches(queue.items || []);
  const openItems = batches.reduce((total, batch) => total + batch.items.filter((item) => item.status === 'open').length, 0);
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: openItems > 0 ? 'owner_decision_batches_open' : 'owner_decision_batches_clear',
    policy: {
      records_decisions: false,
      public_writes_allowed: false,
      public_ready_after_batches: 0,
      note: 'This report groups pending human decisions for review only. It does not apply decisions, approve assets, promote media, upload files or write public manifests.'
    },
    source_paths: {
      human_decision_queue: relative(root, queuePath)
    },
    summary: {
      total_batches: batches.length,
      batches_with_open_items: batches.filter((batch) => batch.open_items > 0).length,
      total_items: batches.reduce((total, batch) => total + batch.items.length, 0),
      open_items: openItems,
      public_ready_after_batches: 0,
      safe_defaults: countBy(batches.flatMap((batch) => batch.items.map((item) => item.safe_default)))
    },
    batches,
    worker_protocol: [
      'Present one batch at a time to the owner or reviewer.',
      'Never convert this report into decisions directly.',
      'After a reference decision edit, run `npm run kosmo:owner-decision-session-check`.',
      'After an asset decision edit, run `npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json`.',
      'After any human-decision update, run `npm run kosmo:data-lane-sweep`.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo human decision owner batches');
  console.log(`Status: ${report.status}`);
  console.log(`Batches: ${report.summary.batches_with_open_items}/${report.summary.total_batches} open`);
  console.log(`Items: ${report.summary.open_items}/${report.summary.total_items} open`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildBatches(items) {
  const assigned = new Set();
  const batches = batchDefinitions.map((definition) => {
    const batchItems = items.filter((item) => {
      const matchesGroup = definition.groups?.includes(item.group);
      const matchesLane = definition.lane && item.lane === definition.lane;
      if (!matchesGroup && !matchesLane) return false;
      assigned.add(item.id);
      return true;
    });
    return buildBatch(definition, batchItems);
  });

  const unassigned = items.filter((item) => !assigned.has(item.id));
  if (unassigned.length > 0) {
    batches.push(buildBatch({
      id: 'batch-z-unassigned',
      label: 'Batch Z: Unassigned Decisions',
      intent: 'Catch-all for queue items not yet mapped to an owner batch.',
      recommended_stance: ['Keep blocked or needs-review until this batch is explicitly classified.']
    }, unassigned));
  }

  return batches;
}

function buildBatch(definition, items) {
  return {
    id: definition.id,
    label: definition.label,
    intent: definition.intent,
    status: items.some((item) => item.status === 'open') ? 'open' : 'clear',
    open_items: items.filter((item) => item.status === 'open').length,
    total_items: items.length,
    safe_defaults: countBy(items.map((item) => item.safe_default)),
    recommended_stance: definition.recommended_stance,
    items: items.map((item) => ({
      id: item.id,
      lane: item.lane,
      group: item.group,
      title: item.title,
      status: item.status,
      prompt: item.prompt,
      source_path: item.source_path,
      safe_default: item.safe_default,
      allowed_decisions: item.allowed_decisions || [],
      public_ready_after_decision: Boolean(item.public_ready_after_decision),
      command_hint: item.command_hint
    }))
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Human Decision Owner Batches');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('This document turns the open Kosmo Human Decision Queue into small owner-review batches. It does not apply decisions, approve public display, promote models, write public manifests, upload assets or mark anything public-ready.');
  lines.push('');
  lines.push('Source queue:');
  lines.push('');
  lines.push(`- \`${report.source_paths.human_decision_queue}\``);
  lines.push('');
  lines.push('Current guardrail:');
  lines.push('');
  lines.push(`- Open items: ${report.summary.open_items}/${report.summary.total_items}`);
  lines.push(`- Public-ready after batches: ${report.summary.public_ready_after_batches}`);
  lines.push('- Safe defaults remain binding until a named human decision is recorded and the checks pass.');

  for (const batch of report.batches) {
    lines.push('');
    lines.push(`## ${batch.label}`);
    lines.push('');
    lines.push(`Intent: ${batch.intent}`);
    lines.push('');
    lines.push(`Status: \`${batch.status}\``);
    lines.push(`Open items: ${batch.open_items}/${batch.total_items}`);
    lines.push(`Safe defaults: ${formatCounts(batch.safe_defaults)}`);
    lines.push('');
    lines.push('Items:');
    lines.push('');
    lines.push('| Lane | Item | Path | Safe default | Allowed owner direction |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const item of batch.items) {
      lines.push(`| ${escapePipe(item.lane)} | ${escapePipe(item.title)} | ${item.source_path ? `\`${escapePipe(item.source_path)}\`` : 'none'} | \`${escapePipe(item.safe_default)}\` | ${escapePipe(ownerDirection(item))} |`);
    }
    lines.push('');
    lines.push('Recommended review stance:');
    lines.push('');
    for (const stance of batch.recommended_stance) lines.push(`- ${stance}`);
  }

  lines.push('');
  lines.push('## Worker Protocol');
  lines.push('');
  report.worker_protocol.forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`);
  });
  lines.push('');
  lines.push('## Current Recommendation');
  lines.push('');
  lines.push('Use this order:');
  lines.push('');
  report.batches
    .filter((batch) => batch.total_items > 0)
    .forEach((batch, index) => lines.push(`${index + 1}. ${batch.label.replace(/^Batch [A-Z]: /, '')}.`));
  return `${lines.join('\n')}\n`;
}

function ownerDirection(item) {
  if (item.safe_default === 'keep_blocked') return 'keep blocked or open separate source-basis review';
  if (item.safe_default === 'needs-review') return 'keep needs-review until a named human reviewer inspects local files';
  if (item.group === 'model-promotion-owner-confirmation') return 'defer promotion or open separate model-quality/source review';
  if (item.group === 'sogn-benedetg-source-gap') return 'keep source gap open or point workers to the private source root';
  return 'keep blocked, request more source context, or approve only after explicit rights review';
}

function formatCounts(counts) {
  const entries = Object.entries(counts || {});
  if (entries.length === 0) return 'none';
  return entries.map(([key, value]) => `\`${key}\` ${value}`).join(', ');
}

function countBy(values) {
  return values.reduce((acc, value) => {
    const key = value || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
