#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const scoutPath = resolve(root, args.scout || `data/kosmo-daily-innovation-scout-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-fixture-contracts-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-fixture-contracts-${dateStamp}.md`);

const contractDefinitions = [
  contract('docling_public_pdf_fixture', 'docling', 'kosmo_prepare', [
    fixture('public_pdf', 'Tiny public-domain or generated architecture-style PDF with title, sections, table and image placeholder.'),
    fixture('generated_scan_png', 'Generated non-private page image with simple labels for OCR/layout smoke.')
  ], [
    'Markdown/JSON conversion preserves document hierarchy.',
    'No private text, scans, books or plans are used.',
    'Output records provenance and fixture-only status.'
  ]),
  contract('markitdown_office_fixture', 'markitdown', 'kosmo_prepare', [
    fixture('generated_docx', 'Synthetic brief with project metadata, material list and source table.'),
    fixture('generated_html', 'Synthetic reference page with links and captions.')
  ], [
    'Markdown output keeps headings, links and tables.',
    'No OneDrive or archive files are read.',
    'Conversion output is suitable for later KosmoReferences ingestion checks.'
  ]),
  contract('qwen3_retrieval_fixture', 'qwen3_embedding_reranker', 'kosmo_rag', [
    fixture('public_safe_reference_chunks', 'Small synthetic/public-safe chunks for Villa Savoye, Sogn Benedetg and Ingenbohl-style fields.'),
    fixture('query_set', 'Architecture questions covering material, structure, typology and rights uncertainty.')
  ], [
    'Embedding/rerank eval can run without private chunks.',
    'Expected answers require grounded retrieved context.',
    'No vector index is created from private content.'
  ]),
  contract('ifcopenshell_geometry_fixture', 'ifcopenshell', 'kosmoasset_geometry', [
    fixture('generated_ifc_stub', 'Minimal generated IFC with site, storey, wall, slab, opening and material names.'),
    fixture('expected_geometry_manifest', 'Expected entities, counts, unit system and semantic labels.')
  ], [
    'Parser extracts entity counts and basic relationships.',
    'Geometry output is metadata-only unless fixture geometry is generated.',
    'No private project IFC is opened.'
  ]),
  contract('deepseek_ocr_public_scan_fixture', 'deepseek_ocr', 'kosmo_prepare_ocr', [
    fixture('generated_plan_scan', 'Synthetic plan-like raster with room labels, scale note and title block.'),
    fixture('expected_ocr_manifest', 'Expected words, uncertainty rules and hallucination flags.')
  ], [
    'OCR output includes confidence/uncertainty fields.',
    'No OCR is run on private scans or books.',
    'Output is never training-ready without human review.'
  ]),
  contract('qwen3_vl_visual_retrieval_fixture', 'qwen3_vl_embedding', 'kosmo_multimodal_rag', [
    fixture('generated_facade_image_set', 'Synthetic/public-safe facade and material thumbnails.'),
    fixture('visual_query_set', 'Queries for facade rhythm, material signal and plan-image distinction.')
  ], [
    'Visual retrieval eval uses only generated/public-safe images.',
    'Image provenance is explicit.',
    'No private scan/photo embedding is generated.'
  ]),
  contract('topologicpy_spatial_graph_fixture', 'topologicpy', 'kosmo_spatial_reasoning', [
    fixture('synthetic_space_graph', 'Tiny room-node/edge graph with circulation, structure and adjacency labels.'),
    fixture('expected_topology_report', 'Expected graph metrics and architectural interpretation slots.')
  ], [
    'Topology output maps to Kosmo ontology entity/relation fields.',
    'No private plan geometry is inferred.',
    'Graph fixtures stay source-free.'
  ]),
  contract('paper2poster_publish_layout_fixture', 'paper2poster', 'kosmopublish', [
    fixture('synthetic_reference_summary', 'Public-safe project summary with images represented by placeholders.'),
    fixture('layout_scoring_manifest', 'Expected poster zones, hierarchy and review criteria.')
  ], [
    'Layout logic is captured as process pattern only.',
    'No external publishing flow receives private content.',
    'Output stays review-only.'
  ]),
  contract('speckle_connector_boundary_fixture', 'speckle', 'kosmo_interoperability', [
    fixture('connector_contract_stub', 'Synthetic AEC object exchange schema with project, model and asset ids.'),
    fixture('privacy_boundary_matrix', 'Allowed local-only and blocked cloud-sharing actions.')
  ], [
    'Connector contract separates local metadata from cloud write actions.',
    'No account/cloud upload is enabled.',
    'Private project exchange remains blocked until owner and tool policy review.'
  ])
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const scout = JSON.parse(await readFile(scoutPath, 'utf8'));
  const scoutById = new Map((scout.candidates || []).map((candidate) => [candidate.id, candidate]));
  const contracts = contractDefinitions.map((definition) => buildContract(definition, scoutById));
  const missingScoutCandidates = contracts.filter((item) => !item.scout_candidate_present).map((item) => item.candidate_id);
  const failures = [];
  if (scout.status !== 'daily_innovation_scout_ready') failures.push(`Scout not ready: ${scout.status}`);
  if (missingScoutCandidates.length > 0) failures.push(`Contracts reference missing scout candidates: ${missingScoutCandidates.join(', ')}`);

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_fixture_contracts_ready' : 'innovation_fixture_contracts_needs_review',
    policy: {
      fixture_contracts_only: true,
      installs_tools_now: false,
      clones_repositories_now: false,
      reads_private_content: false,
      runs_private_ocr: false,
      runs_embeddings_on_private_content: false,
      runs_training: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_contracts: 0,
      note: 'Contracts define future isolated public/synthetic fixture tests only. They do not install tools, run models or open private files.'
    },
    source_refs: [relative(root, scoutPath)],
    summary: {
      contracts: contracts.length,
      fixture_inputs: contracts.reduce((sum, item) => sum + item.fixtures.length, 0),
      install_now_count: contracts.filter((item) => item.install_now).length,
      private_content_allowed_now_count: contracts.filter((item) => item.private_content_allowed_now).length,
      executable_now: 0,
      failures: failures.length,
      public_ready_after_contracts: 0
    },
    contracts,
    execution_sequence_after_manual_review: [
      'Create synthetic/public fixture files under examples/kosmo-innovation-fixtures/.',
      'Run each tool in an isolated local environment only after dependency policy review.',
      'Write only generated fixture outputs and metadata reports to Git.',
      'Keep all private library usage blocked until explicit Source Root and rights gates pass.'
    ],
    failures
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation fixture contracts');
  console.log(`Status: ${report.status}`);
  console.log(`Contracts: ${report.summary.contracts}`);
  console.log(`Fixture inputs: ${report.summary.fixture_inputs}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after contracts: ${report.summary.public_ready_after_contracts}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildContract(definition, scoutById) {
  const scoutCandidate = scoutById.get(definition.candidate_id);
  return {
    ...definition,
    scout_candidate_present: Boolean(scoutCandidate),
    source_url: scoutCandidate?.source_url || null,
    install_now: false,
    private_content_allowed_now: false,
    executable_now: false,
    output_root: `examples/kosmo-innovation-fixtures/${definition.id}`,
    allowed_outputs: [
      'fixture manifest JSON',
      'fixture smoke report JSON/Markdown',
      'generated public-safe fixture files'
    ],
    forbidden_inputs: [
      '/mnt/archiv private files',
      'OneDrive private library files',
      'private PDFs/books/scans/images',
      'local worker private outputs',
      'public-ready or rights-cleared claims'
    ],
    public_ready_after_contract: 0
  };
}

function contract(id, candidateId, lane, fixtures, acceptance) {
  return {
    id,
    candidate_id: candidateId,
    lane,
    fixtures,
    acceptance
  };
}

function fixture(id, description) {
  return { id, description, private_content: false, generated_or_public_safe: true };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Fixture Contracts');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Contracts: ${report.summary.contracts}`);
  lines.push(`- Fixture inputs: ${report.summary.fixture_inputs}`);
  lines.push(`- Install now: ${report.summary.install_now_count}`);
  lines.push(`- Private content allowed now: ${report.summary.private_content_allowed_now_count}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Public-ready after contracts: ${report.summary.public_ready_after_contracts}`);
  lines.push('');
  lines.push('## Contracts');
  lines.push('');
  lines.push('| Contract | Candidate | Lane | Fixtures | Output Root |');
  lines.push('| --- | --- | --- | ---: | --- |');
  for (const item of report.contracts) {
    lines.push(`| \`${item.id}\` | ${item.candidate_id} | ${item.lane} | ${item.fixtures.length} | \`${item.output_root}\` |`);
  }
  lines.push('');
  lines.push('## Execution Sequence After Manual Review');
  lines.push('');
  report.execution_sequence_after_manual_review.forEach((item) => lines.push(`- ${item}`));
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
