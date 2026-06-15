#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-daily-innovation-scout-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-daily-innovation-scout-${dateStamp}.md`);

const candidates = [
  {
    id: 'markitdown',
    name: 'Microsoft MarkItDown',
    source_url: 'https://github.com/microsoft/markitdown',
    source_type: 'primary_github',
    lane: 'kosmo_prepare',
    fit: 'Convert common office/web/document formats into Markdown for later LLM-safe processing.',
    next_action: 'prepare_isolated_fixture_only',
    install_now: false,
    private_content_allowed_now: false,
    risk: 'Architecture books and PDFs may contain copyrighted text; only use fixtures until Source Root and rights rules are explicit.',
    priority: 4
  },
  {
    id: 'docling',
    name: 'Docling',
    source_url: 'https://github.com/docling-project/docling',
    source_type: 'primary_github',
    lane: 'kosmo_prepare',
    fit: 'Structured PDF/DOCX/PPTX/image/HTML conversion with layout-aware outputs for later KosmoReferences ingestion.',
    next_action: 'prepare_isolated_fixture_only',
    install_now: false,
    private_content_allowed_now: false,
    risk: 'High value for scanned architecture sources, but must stay fixture-only before private library unlock.',
    priority: 5
  },
  {
    id: 'deepseek_ocr',
    name: 'DeepSeek-OCR / DeepSeek-OCR2',
    source_url: 'https://github.com/deepseek-ai/DeepSeek-OCR/',
    source_type: 'primary_github',
    lane: 'kosmo_prepare_ocr',
    fit: 'Local OCR research line for scans, drawings and mixed document pages.',
    next_action: 'benchmark_on_public_fixture_after_manual_review',
    install_now: false,
    private_content_allowed_now: false,
    risk: 'OCR can hallucinate plausible text; outputs need provenance, confidence and human review before training.',
    priority: 3
  },
  {
    id: 'qwen3_embedding_reranker',
    name: 'Qwen3 Embedding and Reranker',
    source_url: 'https://github.com/QwenLM/Qwen3-Embedding',
    source_type: 'primary_github',
    lane: 'kosmo_rag',
    fit: 'Multilingual embedding and reranking foundation for KosmoReferences/KosmoAsset retrieval.',
    next_action: 'design_public_fixture_eval_before_private_index',
    install_now: false,
    private_content_allowed_now: false,
    risk: 'Do not embed private library content until Source Root, rights scope and deletion/export rules are active.',
    priority: 5
  },
  {
    id: 'qwen3_vl_embedding',
    name: 'Qwen3-VL Embedding',
    source_url: 'https://github.com/QwenLM/Qwen3-VL-Embedding',
    source_type: 'primary_github',
    lane: 'kosmo_multimodal_rag',
    fit: 'Future image/screenshot/video retrieval path for plans, facades, material photos and rendered assets.',
    next_action: 'track_for_public_visual_fixture_eval',
    install_now: false,
    private_content_allowed_now: false,
    risk: 'Visual retrieval over private scans and photos must be deletion-safe and never exported unchecked.',
    priority: 4
  },
  {
    id: 'ifcopenshell',
    name: 'IfcOpenShell',
    source_url: 'https://github.com/IfcOpenShell/IfcOpenShell',
    source_type: 'primary_github',
    lane: 'kosmoasset_geometry',
    fit: 'IFC parsing, geometry and BIM metadata bridge for future reference-to-asset and structural analysis workflows.',
    next_action: 'build_source_free_ifc_fixture_contract',
    install_now: false,
    private_content_allowed_now: false,
    risk: 'Geometry imports can expose private project structure; use generated/public IFC fixtures first.',
    priority: 5
  },
  {
    id: 'topologicpy',
    name: 'TopologicPy',
    source_url: 'https://github.com/wassimj/topologicpy',
    source_type: 'primary_github',
    lane: 'kosmo_spatial_reasoning',
    fit: 'Spatial topology, graphs and semantic 3D reasoning for architectural analysis and future Kosmo specialist training.',
    next_action: 'prepare_graph_schema_mapping',
    install_now: false,
    private_content_allowed_now: false,
    risk: 'Keep graph fixtures synthetic/public until private reference provenance is settled.',
    priority: 4
  },
  {
    id: 'speckle',
    name: 'Speckle',
    source_url: 'https://github.com/specklesystems',
    source_type: 'primary_github_org',
    lane: 'kosmo_interoperability',
    fit: 'AEC data hub/connectors pattern for exchanging design data across tools without locking Kosmo into one authoring app.',
    next_action: 'track_connector_contracts_only',
    install_now: false,
    private_content_allowed_now: false,
    risk: 'Cloud/data sharing must stay disabled until project privacy and account boundaries are explicit.',
    priority: 3
  },
  {
    id: 'paper2poster',
    name: 'Paper2Poster',
    source_url: 'https://github.com/paper2poster/paper2poster',
    source_type: 'primary_github',
    lane: 'kosmopublish',
    fit: 'Multi-agent layout and evaluation ideas for KosmoPublish reference sheets, posters and architecture project summaries.',
    next_action: 'extract_process_pattern_only',
    install_now: false,
    private_content_allowed_now: false,
    risk: 'Use as process inspiration; do not feed private papers/books into external publishing flows.',
    priority: 3
  }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'daily_innovation_scout_ready',
    policy: {
      scout_only: true,
      installs_tools_now: false,
      clones_repositories_now: false,
      reads_private_content: false,
      runs_private_ocr: false,
      runs_embeddings_on_private_content: false,
      runs_training: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_scout: 0,
      note: 'This scout records current innovation candidates and guarded next actions. It does not install, clone, ingest or run private data.'
    },
    summary: {
      candidates: candidates.length,
      primary_sources: candidates.filter((candidate) => candidate.source_type.startsWith('primary')).length,
      install_now_count: candidates.filter((candidate) => candidate.install_now).length,
      private_content_allowed_now_count: candidates.filter((candidate) => candidate.private_content_allowed_now).length,
      highest_priority_candidates: candidates.filter((candidate) => candidate.priority >= 5).map((candidate) => candidate.id),
      public_ready_after_scout: 0
    },
    candidates,
    recommended_sequence: [
      {
        order: 1,
        id: 'fixture_contracts',
        action: 'Create public/synthetic fixture contracts for Docling, IfcOpenShell and Qwen retrieval before installing anything.'
      },
      {
        order: 2,
        id: 'private_gate',
        action: 'Wait for explicit Source Root and owner/risk gates before applying OCR, embeddings or conversion to private libraries.'
      },
      {
        order: 3,
        id: 'orbit_visibility',
        action: 'Expose selected innovation candidates in Orbit as roadmap items, not active tools.'
      }
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo daily innovation scout');
  console.log(`Status: ${report.status}`);
  console.log(`Candidates: ${report.summary.candidates}`);
  console.log(`Install now: ${report.summary.install_now_count}`);
  console.log(`Private content allowed now: ${report.summary.private_content_allowed_now_count}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Daily Innovation Scout');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Candidates: ${report.summary.candidates}`);
  lines.push(`- Primary sources: ${report.summary.primary_sources}`);
  lines.push(`- Install now: ${report.summary.install_now_count}`);
  lines.push(`- Private content allowed now: ${report.summary.private_content_allowed_now_count}`);
  lines.push(`- Highest priority: ${report.summary.highest_priority_candidates.join(', ')}`);
  lines.push(`- Public-ready after scout: ${report.summary.public_ready_after_scout}`);
  lines.push('');
  lines.push('## Candidates');
  lines.push('');
  lines.push('| Priority | Candidate | Lane | Next Action | Source |');
  lines.push('| ---: | --- | --- | --- | --- |');
  for (const candidate of report.candidates) {
    lines.push(`| ${candidate.priority} | ${candidate.name} | ${candidate.lane} | ${candidate.next_action} | ${candidate.source_url} |`);
  }
  lines.push('');
  lines.push('## Guard Notes');
  lines.push('');
  for (const candidate of report.candidates) {
    lines.push(`- ${candidate.id}: ${candidate.risk}`);
  }
  lines.push('');
  lines.push('## Recommended Sequence');
  lines.push('');
  for (const item of report.recommended_sequence) {
    lines.push(`${item.order}. ${item.action}`);
  }
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
