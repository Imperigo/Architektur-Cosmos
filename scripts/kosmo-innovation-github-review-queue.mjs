#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const discoveryPath = resolve(root, args.discovery || `data/kosmo-innovation-github-discovery-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-review-queue-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-review-queue-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const discovery = JSON.parse(await readFile(discoveryPath, 'utf8'));
  const reviewItems = buildReviewItems(discovery.candidates || []);
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'innovation_github_review_queue_ready',
    policy: {
      review_queue_only: true,
      clones_repositories_now: false,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_discovered_code_now: false,
      reads_private_content: false,
      public_ready_after_queue: 0
    },
    source_refs: [relative(root, discoveryPath)],
    summary: {
      discovery_candidates: discovery.summary?.unique_candidates ?? null,
      review_items: reviewItems.length,
      high_priority_items: reviewItems.filter((item) => item.review_priority === 'high').length,
      lanes: new Set(reviewItems.map((item) => item.lane)).size,
      execute_now: 0,
      public_ready_after_queue: 0
    },
    review_items: reviewItems,
    lane_review_order: [
      laneOrder('kosmo_prepare', 'First inspect public README/API shape for document conversion, OCR and layout parsing fixture ideas.'),
      laneOrder('ifc_reasoning', 'Inspect public README only for Bonsai/IfcOpenShell/MCP command-boundary ideas.'),
      laneOrder('worker_integration', 'Keep any MCP/agent pattern behind local runtime and owner gates.'),
      laneOrder('kosmo_asset', 'Inspect retrieval repos for feature taxonomy and evaluation metrics, not implementation adoption.'),
      laneOrder('bim_rag_workers', 'Inspect RAG/graph ideas for future local worker task specs only.')
    ],
    hard_stops: [
      'Do not clone repositories during review queue generation.',
      'Do not install dependencies or download models from discovered repositories.',
      'Do not run discovered code.',
      'Do not process private ArchitekturKosmos sources while evaluating public GitHub candidates.',
      'Do not mark any candidate public-ready or production-ready without human/overseer review.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub review queue');
  console.log(`Status: ${report.status}`);
  console.log(`Review items: ${report.summary.review_items}`);
  console.log(`High priority: ${report.summary.high_priority_items}`);
  console.log(`Execute now: ${report.summary.execute_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReviewItems(candidates) {
  return candidates
    .filter((candidate) => candidate.review_priority !== 'low')
    .map((candidate, index) => ({
      id: `github-review-${String(index + 1).padStart(2, '0')}`,
      repo: candidate.repo,
      url: candidate.url,
      lane: candidate.lane,
      description: candidate.description,
      review_priority: candidate.review_priority,
      stars_observed: candidate.stars_observed,
      updated_at_observed: candidate.updated_at_observed,
      source_discovery_query_id: candidate.discovery_query_id,
      review_mode: 'public_metadata_and_readme_only',
      next_safe_action: nextAction(candidate),
      fixture_path_after_review: fixturePath(candidate),
      allowed_now: {
        inspect_public_repo_metadata: true,
        inspect_public_readme: true,
        create_source_free_fixture_contract: true,
        clone_repository: false,
        install_dependencies: false,
        download_models: false,
        run_code: false,
        read_private_content: false,
        promote_to_public: false
      },
      public_ready_after_item: 0
    }));
}

function nextAction(candidate) {
  if (candidate.lane === 'kosmo_prepare') return 'Summarize public README/API surface for a synthetic document-layout or OCR fixture contract.';
  if (candidate.lane === 'ifc_reasoning') return 'Summarize public README command boundary for future IfcOpenShell/Bonsai worker adapter review.';
  if (candidate.lane === 'kosmo_asset') return 'Extract public method categories for 3D similarity/retrieval taxonomy only.';
  if (candidate.lane === 'bim_rag_workers') return 'Extract public RAG/graph concepts for local worker task-spec inspiration only.';
  return 'Review public metadata and decide whether a source-free fixture contract is worth drafting.';
}

function fixturePath(candidate) {
  const slug = candidate.repo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `examples/kosmo-innovation-fixtures/github-review-${slug}/`;
}

function laneOrder(id, objective) {
  return { id, objective, execution_now: false };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Review Queue');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Discovery candidates: ${report.summary.discovery_candidates}`);
  lines.push(`- Review items: ${report.summary.review_items}`);
  lines.push(`- High priority items: ${report.summary.high_priority_items}`);
  lines.push(`- Lanes: ${report.summary.lanes}`);
  lines.push(`- Execute now: ${report.summary.execute_now}`);
  lines.push(`- Public-ready after queue: ${report.summary.public_ready_after_queue}`);
  lines.push('');
  lines.push('## Review Items');
  lines.push('');
  lines.push('| ID | Repo | Lane | Priority | Safe action |');
  lines.push('| --- | --- | --- | --- | --- |');
  report.review_items.forEach((item) => {
    lines.push(`| \`${item.id}\` | [${item.repo}](${item.url}) | ${item.lane} | ${item.review_priority} | ${item.next_safe_action} |`);
  });
  lines.push('');
  lines.push('## Lane Review Order');
  lines.push('');
  report.lane_review_order.forEach((item) => lines.push(`- \`${item.id}\`: ${item.objective}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
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
