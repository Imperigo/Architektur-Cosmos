#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const dayBatchPath = resolve(root, args.dayBatch || `data/kosmo-day-batch-loop-${dateStamp}.json`);
const blockerPath = resolve(root, args.blocker || `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-lane-plan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-lane-plan-${dateStamp}.md`);
const knownToolPaths = {
  markitdown: process.env.KOSMO_MARKITDOWN_BIN || '/mnt/data/ArchitekturKosmos/tools/markitdown-venv/bin/markitdown'
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const dayBatch = await readOptionalJson(dayBatchPath);
  const blocker = await readOptionalJson(blockerPath);
  const probes = runProbes();
  const plan = buildPlan({ dayBatch, blocker, probes });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(plan));

  console.log('Kosmo innovation lane plan');
  console.log(`Status: ${plan.status}`);
  console.log(`Lanes: ${plan.summary.lanes}`);
  console.log(`Ready now: ${plan.summary.ready_now}`);
  console.log(`Blocked by source root: ${plan.summary.blocked_by_source_root}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildPlan({ dayBatch, blocker, probes }) {
  const sourceRootBlocked = blocker?.summary?.private_diagnostic_allowed !== true;
  const lanes = [
    {
      id: 'markitdown_prepare_m2',
      name: 'MarkItDown for KosmoPrepare M2',
      intent: 'Convert allowed documents into Markdown for downstream metadata extraction and review packs.',
      tool_probe: 'markitdown_cli',
      current_tool_state: probes.markitdown_cli.status,
      allowed_now: [
        'run public/synthetic smoke conversions',
        'draft Markdown field contract',
        'compare output structure against KosmoPrepare package import expectations'
      ],
      blocked_until: sourceRootBlocked
        ? ['real source root recorded before private book/PDF conversion']
        : ['owner confirms pilot-first private metadata inventory scope'],
      first_smoke: 'Create a tiny synthetic public-domain text/PDF fixture and verify Markdown output contains no private content.',
      promotion_gate: 'No private Markdown enters Git; private outputs stay under KosmoZentrale private inventory paths.'
    },
    {
      id: 'local_ocr_scanned_sources',
      name: 'Local OCR for Scanned Architecture Sources',
      intent: 'Evaluate OCR fallback for scanned plans/books after source-root and rights gates.',
      tool_probe: 'tesseract_cli',
      current_tool_state: probes.tesseract_cli.status,
      allowed_now: [
        'document OCR contract and forbidden fields',
        'run OCR only on synthetic/public fixture images',
        'define confidence and redaction checks before any private use'
      ],
      blocked_until: ['source-root decision passes', 'owner authorizes private OCR scope', 'private output path outside Git exists'],
      first_smoke: 'Use one generated/public image fixture with a short text label; write only metadata and confidence summary.',
      promotion_gate: 'OCR text from private scans is never committed; only owner-approved summaries may enter review packs.'
    },
    {
      id: 'qwen_embedding_rag',
      name: 'Qwen Embeddings/Reranking for KosmoReferences RAG',
      intent: 'Prepare local semantic search over reviewed project metadata, not raw private PDFs.',
      tool_probe: 'ollama_list',
      current_tool_state: probes.ollama_list.status,
      allowed_now: [
        'index public/review-only metadata fields',
        'define embedding manifest schema',
        'benchmark retrieval on the three pilot package summaries'
      ],
      blocked_until: sourceRootBlocked ? ['private source root and pilot metadata inventory pass'] : [],
      first_smoke: 'Embed only pilot IDs, titles and own-written summaries; verify no source excerpts are present.',
      promotion_gate: 'Embedding corpus manifest must prove source class, rights state and no raw private text.'
    },
    {
      id: 'ifcopenshell_geometry_lane',
      name: 'IfcOpenShell Geometry/Structure Lane',
      intent: 'Use IFC parsing as the future bridge from reference/project packages to model-layer reasoning.',
      tool_probe: 'ifcopenshell_import',
      current_tool_state: probes.ifcopenshell_import.status,
      allowed_now: [
        'run existing IFC demo/project checks',
        'define structure/material/level extraction targets',
        'keep generated geometry review-only'
      ],
      blocked_until: ['private source-dependent geometry remains blocked until provenance is known'],
      first_smoke: 'Run semantic proof on existing demo IFC only, then connect output to pilot evidence gaps.',
      promotion_gate: 'No derived model asset becomes public-ready without file-level provenance and human review.'
    },
    {
      id: 'paper2poster_publish_lane',
      name: 'Paper2Poster Logic for KosmoPublish',
      intent: 'Borrow paper-to-poster planning as a layout reasoning pattern for architectural boards and review packs.',
      tool_probe: 'python_cli',
      current_tool_state: probes.python_cli.status,
      allowed_now: [
        'draft layout-planner contract',
        'map pilot reference evidence into poster sections',
        'use summaries and placeholders only'
      ],
      blocked_until: ['actual image/plan placement waits for rights and provenance review'],
      first_smoke: 'Generate a layout JSON skeleton for Villa/Sogn/Ingenbohl with empty media slots.',
      promotion_gate: 'KosmoPublish exports remain review-only until media rights are resolved.'
    }
  ];
  const readyNow = lanes.filter((lane) => lane.allowed_now.length > 0).length;
  const blockedBySourceRoot = lanes.filter((lane) => lane.blocked_until.some((item) => item.includes('source root') || item.includes('source-root'))).length;

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'innovation_lane_metadata_plan_ready',
    policy: {
      metadata_only: true,
      installs_tools: false,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_plan: 0,
      note: 'This plan probes local tool availability and defines guarded innovation lanes. It does not install tools, read private sources or run OCR/extraction on private content.'
    },
    source_refs: [
      relative(root, dayBatchPath),
      relative(root, blockerPath)
    ],
    summary: {
      day_batch_status: dayBatch?.status || null,
      source_root_blocker_status: blocker?.status || null,
      private_diagnostic_allowed: blocker?.summary?.private_diagnostic_allowed === true,
      lanes: lanes.length,
      ready_now: readyNow,
      blocked_by_source_root: blockedBySourceRoot,
      public_ready_after_plan: 0
    },
    probes,
    lanes,
    next_actions: [
      'Run public/synthetic smoke tests only for MarkItDown, OCR and embeddings.',
      'Use existing IFC demo assets for geometry experiments.',
      'Keep private source-dependent innovation work blocked until source-root decision passes.',
      'After smoke tests, add per-lane guards before any worker or local LLM can run the tools autonomously.'
    ]
  };
}

function runProbes() {
  return {
    python_cli: probe('python3', ['--version']),
    markitdown_cli: probeCandidates([
      ['markitdown', ['--version']],
      [knownToolPaths.markitdown, ['--version']]
    ]),
    tesseract_cli: probe('tesseract', ['--version']),
    ollama_list: probe('ollama', ['list']),
    ifcopenshell_import: probe('python3', ['-c', 'import ifcopenshell; print(ifcopenshell.version)'])
  };
}

function probeCandidates(candidates) {
  const results = candidates.map(([command, commandArgs]) => probe(command, commandArgs));
  const available = results.find((result) => result.status === 'available');
  if (available) return { ...available, candidates };
  return { ...results[0], candidates, fallback_results: results.slice(1) };
}

function probe(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  return {
    command: [command, ...args].join(' '),
    executable: command,
    args,
    status: result.status === 0 ? 'available' : result.error?.code === 'ENOENT' ? 'missing' : 'not_ready',
    exit_code: result.status ?? null,
    output_excerpt: output.length > 500 ? output.slice(0, 500) : output
  };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(plan) {
  const lines = [];
  lines.push('# Kosmo Innovation Lane Plan');
  lines.push('');
  lines.push(`Generated: ${plan.generated_at}`);
  lines.push(`Status: \`${plan.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Day batch: ${plan.summary.day_batch_status}`);
  lines.push(`- Source-root blocker: ${plan.summary.source_root_blocker_status}`);
  lines.push(`- Private diagnostic allowed: ${plan.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Lanes: ${plan.summary.lanes}`);
  lines.push(`- Ready now: ${plan.summary.ready_now}`);
  lines.push(`- Blocked by source root: ${plan.summary.blocked_by_source_root}`);
  lines.push(`- Public-ready after plan: ${plan.summary.public_ready_after_plan}`);
  lines.push('');
  lines.push('## Tool Probes');
  lines.push('');
  lines.push('| Probe | Status | Command |');
  lines.push('| --- | --- | --- |');
  Object.entries(plan.probes).forEach(([id, probeResult]) => {
    lines.push(`| \`${id}\` | ${probeResult.status} | \`${escapePipe(probeResult.command)}\` |`);
  });
  lines.push('');
  lines.push('## Lanes');
  for (const lane of plan.lanes) {
    lines.push('');
    lines.push(`### ${lane.name}`);
    lines.push('');
    lines.push(`- ID: \`${lane.id}\``);
    lines.push(`- Tool state: ${lane.current_tool_state}`);
    lines.push(`- Intent: ${lane.intent}`);
    lines.push(`- First smoke: ${lane.first_smoke}`);
    lines.push(`- Promotion gate: ${lane.promotion_gate}`);
    lines.push(`- Blocked until: ${lane.blocked_until.length ? lane.blocked_until.join('; ') : 'none'}`);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  plan.next_actions.forEach((action) => lines.push(`- ${action}`));
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
