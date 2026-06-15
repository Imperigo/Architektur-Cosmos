#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-watchlist-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-watchlist-${dateStamp}.md`);

const execFileAsync = promisify(execFile);

const seeds = [
  seed(1, 'microsoft/markitdown', 'Python tool for converting files and office documents to Markdown.', 'document_conversion', 'python_package', 'high'),
  seed(2, 'docling-project/docling', 'Get your documents ready for gen AI.', 'document_understanding', 'python_package', 'high'),
  seed(3, 'IfcOpenShell/IfcOpenShell', 'Open source IFC library and geometry engine.', 'ifc_geometry', 'python_package', 'high'),
  seed(4, 'QwenLM/Qwen3-Embedding', 'Qwen embedding model repository.', 'retrieval_embeddings', 'model_or_python', 'high'),
  seed(5, 'deepseek-ai/DeepSeek-OCR', 'Contexts Optical Compression.', 'ocr', 'model_or_python', 'medium'),
  seed(6, 'wassimj/topologicpy', 'Python bindings for topologic.', 'spatial_topology', 'python_package', 'medium'),
  seed(7, 'specklesystems/specklepy', 'Python SDK.', 'connector_boundary', 'python_package', 'medium'),
  seed(8, 'docling-project/docling-mcp', 'Making Docling agentic through MCP.', 'worker_integration', 'research_only', 'medium'),
  seed(9, 'deepseek-ai/DeepSeek-OCR-2', 'Visual Causal Flow.', 'future_ocr_research', 'research_only', 'low')
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const observed = await Promise.all(seeds.map((item) => observeCandidate(item)));
  const candidates = observed.map(({ item, github }) => candidate(item, github));
  const liveProbe = {
    attempted: true,
    succeeded: observed.filter((item) => item.github?.source_observation === 'live_gh_repo_view').length,
    fallback: observed.filter((item) => item.github?.source_observation !== 'live_gh_repo_view').length
  };

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'innovation_github_watchlist_ready',
    observation_method: 'live gh repo view against seeded primary GitHub repositories with static fallback only on probe failure',
    policy: {
      watchlist_only: true,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      public_ready_after_watchlist: 0
    },
    summary: {
      candidates: candidates.length,
      high_fit: candidates.filter((item) => item.kosmo_fit === 'high').length,
      medium_fit: candidates.filter((item) => item.kosmo_fit === 'medium').length,
      research_only: candidates.filter((item) => item.adoption_type === 'research_only').length,
      live_probe_succeeded: liveProbe.succeeded,
      live_probe_fallback: liveProbe.fallback,
      executable_now: 0,
      public_ready_after_watchlist: 0
    },
    live_probe: liveProbe,
    candidates,
    recommended_next_moves: [
      'Keep MarkItDown and Docling as the first KosmoPrepare fixture-only package experiments.',
      'Keep IfcOpenShell as the first geometry/IFC package experiment.',
      'Keep Qwen3-Embedding as the first retrieval model candidate, but only after model-root decision.',
      'Keep DeepSeek-OCR behind Source Root and OCR-specific redaction gates.',
      'Track Docling MCP as a worker-integration idea, not a production dependency yet.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub watchlist');
  console.log(`Status: ${report.status}`);
  console.log(`Candidates: ${report.summary.candidates}`);
  console.log(`Live probe: ${report.summary.live_probe_succeeded}/${report.summary.candidates}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function observeCandidate(item) {
  try {
    const { stdout } = await execFileAsync('gh', [
      'repo',
      'view',
      item.repo,
      '--json',
      'description,nameWithOwner,url,stargazerCount,updatedAt,latestRelease'
    ], { cwd: root, timeout: 20000, maxBuffer: 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    return { item, github: { ...parsed, source_observation: 'live_gh_repo_view' } };
  } catch (error) {
    return {
      item,
      github: {
        description: item.description,
        nameWithOwner: item.repo,
        url: `https://github.com/${item.repo}`,
        stargazerCount: null,
        updatedAt: null,
        latestRelease: null,
        source_observation: 'static_seed_fallback',
        fallback_reason: error.message.split('\n')[0]
      }
    };
  }
}

function seed(priority, repo, description, lane, adoptionType, kosmoFit) {
  return { priority, repo, description, lane, adoptionType, kosmoFit };
}

function candidate(seedItem, github) {
  return {
    priority: seedItem.priority,
    repo: github.nameWithOwner || seedItem.repo,
    url: github.url || `https://github.com/${seedItem.repo}`,
    description: github.description || seedItem.description,
    stars_observed: github.stargazerCount,
    updated_at_observed: github.updatedAt,
    latest_release_observed: github.latestRelease?.tagName || null,
    latest_release_published_at: github.latestRelease?.publishedAt || null,
    source_observation: github.source_observation,
    lane: seedItem.lane,
    adoption_type: seedItem.adoptionType,
    kosmo_fit: seedItem.kosmoFit,
    source_type: 'primary_github_repository',
    install_or_download_now: false,
    private_content_allowed: false,
    public_ready_after_candidate: 0
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Watchlist');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push(`Observation method: ${report.observation_method}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Candidates: ${report.summary.candidates}`);
  lines.push(`- High fit: ${report.summary.high_fit}`);
  lines.push(`- Medium fit: ${report.summary.medium_fit}`);
  lines.push(`- Research-only: ${report.summary.research_only}`);
  lines.push(`- Live probe succeeded: ${report.summary.live_probe_succeeded}`);
  lines.push(`- Live probe fallback: ${report.summary.live_probe_fallback}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Public-ready after watchlist: ${report.summary.public_ready_after_watchlist}`);
  lines.push('');
  lines.push('## Candidates');
  lines.push('');
  lines.push('| Priority | Repo | Lane | Type | Fit | Updated | Stars | Observation |');
  lines.push('| ---: | --- | --- | --- | --- | --- | ---: | --- |');
  for (const item of report.candidates) {
    lines.push(`| ${item.priority} | [${item.repo}](${item.url}) | ${item.lane} | ${item.adoption_type} | ${item.kosmo_fit} | ${item.updated_at_observed || '-'} | ${item.stars_observed ?? '-'} | ${item.source_observation} |`);
  }
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
