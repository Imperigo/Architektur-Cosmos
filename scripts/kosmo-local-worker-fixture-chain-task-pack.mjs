#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-fixture-chain-task-pack-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-fixture-chain-task-pack-${dateStamp}.md`);

const refs = {
  prepareAdapterReport: 'examples/kosmo-prepare/phase1-adapter-fixture/prepare-phase1-adapter-report.json',
  sourcePackage: `examples/kosmo-references/source-packages/kosmo-prepare-phase1-adapter-fixture-${dateStamp}/source-package.json`,
  sourcePackageCheck: `data/kosmo-prepare-phase1-source-package-contract-check-${dateStamp}.json`,
  assetLibrary: 'examples/kosmo-assets/kosmo-prepare-phase1-fixture/library.json',
  assetContractCheck: `data/kosmo-asset-prepare-phase1-fixture-contract-check-${dateStamp}.json`,
  orbitBridge: `data/kosmo-orbit-status-bridge-${dateStamp}.json`,
  workerBoundary: `data/kosmo-worker-boundary-pack-check-${dateStamp}.json`
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pack = buildPack();
  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(pack, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(pack));

  console.log('Kosmo local worker fixture chain task pack');
  console.log(`Status: ${pack.status}`);
  console.log(`Tasks: ${pack.summary.tasks}`);
  console.log(`Executable now: ${pack.summary.executable_now}`);
  console.log(`Missing refs: ${pack.summary.missing_refs}`);
  console.log(`Public-ready after pack: ${pack.summary.public_ready_after_pack}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (pack.summary.missing_refs > 0) process.exitCode = 1;
}

function buildPack() {
  const sourceRefs = Object.values(refs);
  const missingRefs = sourceRefs.filter((ref) => !existsSync(resolve(root, ref)));
  const outputRoot = '/mnt/data/ArchitekturKosmos/KosmoZentrale/worker_packets/kosmo-fixture-chain-2026-06-15';
  const tasks = [
    {
      task_id: 'fixture-chain-source-package-summary',
      priority: 1,
      lane: 'kosmoprepare-kosmoreferences',
      runner_safe: true,
      execute_now: false,
      input_refs: [
        refs.prepareAdapterReport,
        refs.sourcePackage,
        refs.sourcePackageCheck,
        refs.workerBoundary
      ],
      output_path: `${outputRoot}/fixture-chain-source-package-summary.review.json`,
      objective: 'Summarize the synthetic KosmoPrepare source package for overseer review without adding new facts or reading private content.',
      acceptance: [
        'Reports package_id, sources, artifacts, review gates and public-ready=0.',
        'Flags any missing guard or non-review-only policy as blocker.',
        'Does not quote or transform private content because no private inputs are present.'
      ]
    },
    {
      task_id: 'fixture-chain-asset-candidate-review',
      priority: 2,
      lane: 'kosmoasset',
      runner_safe: true,
      execute_now: false,
      input_refs: [
        refs.assetLibrary,
        refs.assetContractCheck,
        refs.workerBoundary
      ],
      output_path: `${outputRoot}/fixture-chain-asset-candidate-review.review.json`,
      objective: 'Review the two synthetic KosmoAsset fixture candidates and propose metadata improvements only.',
      acceptance: [
        'Keeps every asset local_only and public_use_allowed=false.',
        'Separates material profile from structural component profile.',
        'No texture generation, geometry generation, upload, public publication or rights promotion.'
      ]
    },
    {
      task_id: 'fixture-chain-orbit-card-brief',
      priority: 3,
      lane: 'kosmoorbit-overseer',
      runner_safe: true,
      execute_now: false,
      input_refs: [
        refs.orbitBridge,
        refs.sourcePackageCheck,
        refs.assetContractCheck,
        refs.workerBoundary
      ],
      output_path: `${outputRoot}/fixture-chain-orbit-card-brief.review.json`,
      objective: 'Prepare a short local-worker-readable brief explaining the Orbit fixture-chain card and remaining blockers.',
      acceptance: [
        'Mentions the card id prepare-references-asset-fixture-chain.',
        'Keeps Source Root and owner gates blocked.',
        'Does not recommend executing private ingestion, OCR, embeddings, training, Git or cloud writes.'
      ]
    }
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: missingRefs.length === 0
      ? 'local_worker_fixture_chain_task_pack_ready'
      : 'local_worker_fixture_chain_task_pack_missing_refs',
    policy: {
      review_only: true,
      fixture_only: true,
      reads_private_content: false,
      copies_private_content: false,
      starts_models: false,
      executes_workers_now: false,
      writes_repo_outputs_from_workers: false,
      public_ready_after_pack: 0
    },
    source_refs: sourceRefs,
    summary: {
      tasks: tasks.length,
      executable_now: tasks.filter((task) => task.execute_now === true).length,
      runner_safe_tasks: tasks.filter((task) => task.runner_safe === true).length,
      missing_refs: missingRefs.length,
      public_ready_after_pack: 0
    },
    missing_refs: missingRefs,
    tasks,
    forbidden_actions: [
      'Do not read private source folders, PDFs, scans, OCR text, OneDrive libraries or archive roots.',
      'Do not generate embeddings or training data.',
      'Do not convert worker output into repo data automatically.',
      'Do not mark assets or references public-ready.',
      'Do not run Git or cloud writes from the local worker.'
    ],
    next_actions: [
      'Use this task pack only after an overseer explicitly starts a local fixture-only worker run.',
      'Review local worker outputs manually before any repo conversion.',
      'Keep private Source Root work blocked until owner confirmation.'
    ]
  };
}

function renderMarkdown(pack) {
  const lines = [];
  lines.push('# Kosmo Local Worker Fixture Chain Task Pack');
  lines.push('');
  lines.push(`Generated: ${pack.generated_at}`);
  lines.push(`Status: \`${pack.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Tasks: ${pack.summary.tasks}`);
  lines.push(`- Runner-safe tasks: ${pack.summary.runner_safe_tasks}`);
  lines.push(`- Executable now: ${pack.summary.executable_now}`);
  lines.push(`- Missing refs: ${pack.summary.missing_refs}`);
  lines.push(`- Public-ready after pack: ${pack.summary.public_ready_after_pack}`);
  lines.push('');
  lines.push('## Tasks');
  lines.push('');
  lines.push('| Priority | Task | Lane | Execute now | Output |');
  lines.push('| ---: | --- | --- | --- | --- |');
  pack.tasks.forEach((task) => {
    lines.push(`| ${task.priority} | \`${task.task_id}\` | ${task.lane} | ${task.execute_now ? 'yes' : 'no'} | \`${escapePipe(task.output_path)}\` |`);
  });
  lines.push('');
  lines.push('## Forbidden Actions');
  lines.push('');
  pack.forbidden_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  pack.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return lines.join('\n');
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
