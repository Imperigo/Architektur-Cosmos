#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const templateDate = args.templateDate || '2026-06-13';
const templatePath = resolve(root, args.template || `data/kosmo-local-worker-task-pack-${templateDate}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-task-pack-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-task-pack-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const template = JSON.parse(await readFile(templatePath, 'utf8'));
  const taskPack = refreshTaskPack(template);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(taskPack, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(taskPack));

  console.log('Kosmo local worker task pack refresh');
  console.log(`Status: ${taskPack.status}`);
  console.log(`Tasks: ${taskPack.summary.tasks}`);
  console.log(`Updated refs: ${taskPack.summary.updated_refs}`);
  console.log(`Output paths reused: ${taskPack.summary.reused_existing_output_paths}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function refreshTaskPack(template) {
  const metadataInventoryRefs = [
    `data/kosmo-private-metadata-inventory-runner-${dateStamp}.json`,
    `data/kosmo-private-metadata-inventory-fixture-smoke-${dateStamp}.json`,
    `data/kosmo-private-metadata-inventory-check-${dateStamp}.json`,
    `docs/codex/kosmo-private-metadata-inventory-check-${dateStamp}.md`
  ].filter((ref) => existsSync(resolve(root, ref)));
  const tasks = (template.tasks || []).map((task) => {
    const inputRefs = ensureRefs((task.input_refs || []).map((ref) => refreshDatedRef(ref)), metadataInventoryRefs);
    return {
      ...task,
      input_refs: inputRefs,
      output_path: args.newOutputs ? String(task.output_path || '').replaceAll(templateDate, dateStamp) : task.output_path
    };
  });
  const updatedRefs = countUpdatedRefs(template.tasks || [], tasks);
  return {
    ...template,
    created_at: new Date().toISOString(),
    status: 'ready_for_local_review',
    title: `Kosmo Local Worker Task Pack ${dateStamp}`,
    source_package_ref: refreshDatedRef(template.source_package_ref),
    status_refs: {
      ...refreshRefsObject(template.status_refs || {}),
      private_metadata_inventory_runner: `data/kosmo-private-metadata-inventory-runner-${dateStamp}.json`,
      private_metadata_inventory_fixture_smoke: `data/kosmo-private-metadata-inventory-fixture-smoke-${dateStamp}.json`,
      private_metadata_inventory_check: `data/kosmo-private-metadata-inventory-check-${dateStamp}.json`
    },
    metadata_inventory_guard_refs: metadataInventoryRefs,
    output_root: args.newOutputs
      ? String(template.output_root || '').replaceAll(templateDate, dateStamp)
      : template.output_root,
    refresh_policy: {
      source_template: relative(root, templatePath),
      refreshed_for_date: dateStamp,
      metadata_only: true,
      reads_private_content: false,
      copies_private_content: false,
      starts_models: false,
      reuses_existing_output_paths: !args.newOutputs,
      public_ready_after_refresh: 0
    },
    summary: {
      tasks: tasks.length,
      updated_refs: updatedRefs,
      metadata_inventory_guard_refs: metadataInventoryRefs.length,
      reused_existing_output_paths: !args.newOutputs,
      public_ready_after_refresh: 0
    },
    tasks
  };
}

function refreshRefsObject(refs) {
  return Object.fromEntries(Object.entries(refs).map(([key, value]) => [key, refreshDatedRef(value)]));
}

function ensureRefs(refs, additions) {
  return [...new Set([...refs, ...additions])];
}

function refreshDatedRef(value) {
  if (typeof value !== 'string' || !value.includes(templateDate)) return value;
  const candidate = value.replaceAll(templateDate, dateStamp);
  return existsSync(resolve(root, candidate)) ? candidate : value;
}

function countUpdatedRefs(beforeTasks, afterTasks) {
  let count = 0;
  for (let index = 0; index < afterTasks.length; index += 1) {
    const beforeRefs = beforeTasks[index]?.input_refs || [];
    const afterRefs = afterTasks[index]?.input_refs || [];
    for (let refIndex = 0; refIndex < afterRefs.length; refIndex += 1) {
      if (beforeRefs[refIndex] !== afterRefs[refIndex]) count += 1;
    }
  }
  return count;
}

function renderMarkdown(taskPack) {
  const lines = [];
  lines.push('# Kosmo Local Worker Task Pack');
  lines.push('');
  lines.push(`Created: ${taskPack.created_at}`);
  lines.push(`Status: \`${taskPack.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Target worker: ${taskPack.target_worker}`);
  lines.push(`- Tasks: ${taskPack.summary.tasks}`);
  lines.push(`- Updated refs: ${taskPack.summary.updated_refs}`);
  lines.push(`- Metadata inventory guard refs: ${taskPack.summary.metadata_inventory_guard_refs}`);
  lines.push(`- Reuses existing output paths: ${taskPack.summary.reused_existing_output_paths ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after refresh: ${taskPack.summary.public_ready_after_refresh}`);
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  lines.push(`- Metadata-only: ${taskPack.refresh_policy.metadata_only ? 'yes' : 'no'}`);
  lines.push(`- Reads private content: ${taskPack.refresh_policy.reads_private_content ? 'yes' : 'no'}`);
  lines.push(`- Starts models: ${taskPack.refresh_policy.starts_models ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Tasks');
  lines.push('');
  lines.push('| Priority | Task | Lane | Output |');
  lines.push('| ---: | --- | --- | --- |');
  for (const task of taskPack.tasks || []) {
    lines.push(`| ${task.priority} | \`${task.task_id}\` | ${task.lane} | \`${escapePipe(task.output_path)}\` |`);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  lines.push('- Run `npm run kosmo:local-worker-output-review`.');
  lines.push('- Run `npm run kosmo:local-worker-launch-queue`.');
  lines.push('- Run `npm run kosmo:local-worker-output-conversion-plan`.');
  lines.push('- Keep all outputs private/review-only until owner, source-root, provenance and rights gates pass.');
  lines.push('');
  return `${lines.join('\n')}`;
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
