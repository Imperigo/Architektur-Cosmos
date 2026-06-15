#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-watchlist-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-watchlist-${dateStamp}.md`);

const candidates = [
  candidate(1, 'microsoft/markitdown', 'https://github.com/microsoft/markitdown', 'Python tool for converting files and office documents to Markdown.', 153797, '2026-06-15T12:52:12Z', 'document_conversion', 'python_package', 'high'),
  candidate(2, 'docling-project/docling', 'https://github.com/docling-project/docling', 'Get your documents ready for gen AI.', 61603, '2026-06-15T12:45:55Z', 'document_understanding', 'python_package', 'high'),
  candidate(3, 'IfcOpenShell/IfcOpenShell', 'https://github.com/IfcOpenShell/IfcOpenShell', 'Open source IFC library and geometry engine.', 2568, '2026-06-15T08:23:22Z', 'ifc_geometry', 'python_package', 'high'),
  candidate(4, 'QwenLM/Qwen3-Embedding', 'https://github.com/QwenLM/Qwen3-Embedding', 'Qwen embedding model repository.', 1957, '2026-06-15T10:41:04Z', 'retrieval_embeddings', 'model_or_python', 'high'),
  candidate(5, 'deepseek-ai/DeepSeek-OCR', 'https://github.com/deepseek-ai/DeepSeek-OCR', 'Contexts Optical Compression.', 23287, '2026-06-15T12:48:00Z', 'ocr', 'model_or_python', 'medium'),
  candidate(6, 'wassimj/topologicpy', 'https://github.com/wassimj/topologicpy', 'Python bindings for topologic.', 242, '2026-06-15T06:14:14Z', 'spatial_topology', 'python_package', 'medium'),
  candidate(7, 'specklesystems/specklepy', 'https://github.com/specklesystems/specklepy', 'Python SDK.', 134, '2026-06-15T06:17:38Z', 'connector_boundary', 'python_package', 'medium'),
  candidate(8, 'docling-project/docling-mcp', 'https://github.com/docling-project/docling-mcp', 'Making Docling agentic through MCP.', 657, '2026-06-15T07:35:21Z', 'worker_integration', 'research_only', 'medium'),
  candidate(9, 'deepseek-ai/DeepSeek-OCR-2', 'https://github.com/deepseek-ai/DeepSeek-OCR-2', 'Visual Causal Flow.', 2965, '2026-06-15T09:15:14Z', 'future_ocr_research', 'research_only', 'low')
];

const report = {
  schema_version: '0.1',
  generated_at: new Date().toISOString(),
  status: 'innovation_github_watchlist_ready',
  observation_method: 'gh search repos and gh repo view against primary GitHub repositories',
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
    executable_now: 0,
    public_ready_after_watchlist: 0
  },
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
console.log(`Executable now: ${report.summary.executable_now}`);
console.log(`Wrote: ${relative(root, outputMd)}`);

function candidate(priority, repo, url, description, stars, updatedAt, lane, adoptionType, kosmoFit) {
  return {
    priority,
    repo,
    url,
    description,
    stars_observed: stars,
    updated_at_observed: updatedAt,
    lane,
    adoption_type: adoptionType,
    kosmo_fit: kosmoFit,
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
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Public-ready after watchlist: ${report.summary.public_ready_after_watchlist}`);
  lines.push('');
  lines.push('## Candidates');
  lines.push('');
  lines.push('| Priority | Repo | Lane | Type | Fit | Updated | Stars |');
  lines.push('| ---: | --- | --- | --- | --- | --- | ---: |');
  for (const item of report.candidates) {
    lines.push(`| ${item.priority} | [${item.repo}](${item.url}) | ${item.lane} | ${item.adoption_type} | ${item.kosmo_fit} | ${item.updated_at_observed} | ${item.stars_observed} |`);
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
