#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-discovery-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-discovery-${dateStamp}.md`);

const queries = [
  query('bim_llm', 'BIM LLM', 'bim_rag_workers'),
  query('ifcopenshell_bim', 'ifcopenshell BIM', 'ifc_reasoning'),
  query('building_information_modeling_ai', 'building information modeling AI', 'bim_ai_experiments'),
  query('document_layout_analysis_ocr', 'document layout analysis OCR', 'kosmo_prepare'),
  query('architectural_specification_ocr', 'architectural specification OCR', 'kosmo_prepare'),
  query('architecture_rag_bim', 'architecture RAG BIM', 'reference_retrieval'),
  query('3d_model_retrieval', '3d model retrieval', 'kosmo_asset'),
  query('sketch_based_3d_retrieval', 'sketch based 3D retrieval', 'kosmo_asset'),
  query('blender_bim_mcp', 'Blender BIM MCP', 'worker_integration'),
  query('bonsai_ifcopenshell_mcp', 'Bonsai IfcOpenShell MCP', 'worker_integration')
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const searches = await Promise.all(queries.map((item) => runSearch(item)));
  const candidates = rankCandidates(searches.flatMap((search) => search.results));
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'innovation_github_discovery_ready',
    observation_method: 'gh search repos against public GitHub repository metadata',
    policy: {
      discovery_only: true,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      public_ready_after_discovery: 0
    },
    summary: {
      queries: searches.length,
      queries_with_results: searches.filter((search) => search.results.length > 0).length,
      raw_results: searches.reduce((sum, search) => sum + search.results.length, 0),
      unique_candidates: candidates.length,
      recommended_for_review: candidates.filter((candidate) => candidate.review_priority !== 'low').length,
      lanes_with_results: countLanesWithResults(searches),
      executable_now: 0,
      public_ready_after_discovery: 0
    },
    searches,
    candidates,
    recommended_next_moves: [
      'Review BIM/LLM candidates for architecture-specific RAG patterns, not for immediate adoption.',
      'Review IfcOpenShell/Bonsai/MCP candidates as worker-integration references before touching local Blender or IFC runtime.',
      'Review document-layout and architectural-specification OCR candidates only as public-safe fixture inspiration.',
      'Review 3D retrieval candidates for KosmoAsset similarity search ideas, not as production dependencies.',
      'Keep empty architecture-RAG searches as query feedback; refine search terms before installing anything.',
      'Promote only candidates that have clear primary repositories, recent activity and a source-free fixture path.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub discovery');
  console.log(`Status: ${report.status}`);
  console.log(`Queries with results: ${report.summary.queries_with_results}/${report.summary.queries}`);
  console.log(`Unique candidates: ${report.summary.unique_candidates}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function runSearch(item) {
  try {
    const { stdout } = await execFileAsync('gh', [
      'search',
      'repos',
      item.text,
      '--limit',
      String(args.limit || 10),
      '--json',
      'fullName,description,url,stargazersCount,updatedAt'
    ], { cwd: root, timeout: 20000, maxBuffer: 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    return {
      ...item,
      status: 'live_search_completed',
      results: parsed.map((result) => normalizeResult(result, item))
    };
  } catch (error) {
    return {
      ...item,
      status: 'live_search_failed',
      failure_reason: error.message.split('\n')[0],
      results: []
    };
  }
}

function normalizeResult(result, item) {
  return {
    repo: result.fullName,
    url: result.url,
    description: result.description || '',
    stars_observed: result.stargazersCount,
    updated_at_observed: result.updatedAt,
    discovery_query_id: item.id,
    lane: item.lane,
    source_type: 'primary_github_repository',
    install_or_download_now: false,
    private_content_allowed: false,
    public_ready_after_candidate: 0
  };
}

function rankCandidates(results) {
  const byRepo = new Map();
  for (const result of results) {
    if (!result.repo || byRepo.has(result.repo)) continue;
    byRepo.set(result.repo, {
      ...result,
      review_priority: priorityFor(result),
      next_action: 'human_or_overseer_review_before_fixture'
    });
  }
  return [...byRepo.values()].sort((left, right) => {
    const priorityDelta = priorityWeight(right.review_priority) - priorityWeight(left.review_priority);
    if (priorityDelta !== 0) return priorityDelta;
    return (right.stars_observed || 0) - (left.stars_observed || 0);
  });
}

function priorityFor(result) {
  const text = `${result.repo} ${result.description}`.toLowerCase();
  if (/ifcopenshell|bonsai|blender|architectural specification|document layout|3d model retrieval|sketch/.test(text) && /2026-/.test(result.updated_at_observed || '')) return 'high';
  if ((result.stars_observed || 0) >= 25 && /2026-/.test(result.updated_at_observed || '')) return 'medium';
  if (/2026-06/.test(result.updated_at_observed || '')) return 'medium';
  return 'low';
}

function priorityWeight(priority) {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function query(id, text, lane) {
  return { id, text, lane };
}

function countLanesWithResults(searches) {
  return new Set(searches.filter((search) => search.results.length > 0).map((search) => search.lane)).size;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Discovery');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push(`Observation method: ${report.observation_method}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Queries: ${report.summary.queries}`);
  lines.push(`- Queries with results: ${report.summary.queries_with_results}`);
  lines.push(`- Raw results: ${report.summary.raw_results}`);
  lines.push(`- Unique candidates: ${report.summary.unique_candidates}`);
  lines.push(`- Recommended for review: ${report.summary.recommended_for_review}`);
  lines.push(`- Lanes with results: ${report.summary.lanes_with_results}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Public-ready after discovery: ${report.summary.public_ready_after_discovery}`);
  lines.push('');
  lines.push('## Query Results');
  lines.push('');
  report.searches.forEach((search) => lines.push(`- \`${search.id}\`: ${search.status}, results ${search.results.length}`));
  lines.push('');
  lines.push('## Candidates');
  lines.push('');
  lines.push('| Priority | Repo | Lane | Updated | Stars | Review |');
  lines.push('| ---: | --- | --- | --- | ---: | --- |');
  report.candidates.forEach((candidate, index) => {
    lines.push(`| ${index + 1} | [${candidate.repo}](${candidate.url}) | ${candidate.lane} | ${candidate.updated_at_observed || '-'} | ${candidate.stars_observed ?? '-'} | ${candidate.review_priority} |`);
  });
  lines.push('');
  lines.push('## Recommended Next Moves');
  lines.push('');
  report.recommended_next_moves.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  return lines.join('\n');
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
