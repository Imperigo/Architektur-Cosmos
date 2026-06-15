#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const skeletonsPath = resolve(root, args.skeletons || `data/kosmo-innovation-github-fixture-skeletons-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-fixture-payloads-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-fixture-payloads-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const skeletons = JSON.parse(await readFile(skeletonsPath, 'utf8'));
  const writtenPayloads = [];
  const failures = [];
  if (skeletons.status !== 'innovation_github_fixture_skeletons_ready') {
    failures.push(`Skeletons not ready: ${skeletons.status}`);
  }

  const manifestPaths = (skeletons.written_files || []).filter((file) => file.endsWith('/fixture-manifest.json'));
  for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(await readFile(resolve(root, manifestPath), 'utf8'));
    const contractRoot = dirname(resolve(root, manifestPath));
    for (const fixture of manifest.fixtures || []) {
      const payloadPath = resolve(contractRoot, fixture.expected_payload_path);
      const payload = buildPayload({ manifest, fixture });
      await mkdir(dirname(payloadPath), { recursive: true });
      await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`);
      writtenPayloads.push(relative(root, payloadPath));
    }
  }

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_github_fixture_payloads_ready' : 'innovation_github_fixture_payloads_needs_review',
    policy: {
      generated_payloads_only: true,
      synthetic_fixture_only: true,
      github_repositories_are_source_refs_only: true,
      copies_github_code: false,
      copies_readme_text: false,
      clones_repositories_now: false,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_discovered_code_now: false,
      reads_private_content: false,
      runs_private_ocr: false,
      runs_embeddings_on_private_content: false,
      runs_training: false,
      writes_public_files: false,
      public_ready_after_payloads: 0,
      note: 'Payloads are generated JSON fixtures only and contain no copied GitHub content or private project sources.'
    },
    source_refs: [relative(root, skeletonsPath)],
    summary: {
      manifests: manifestPaths.length,
      payloads_written: writtenPayloads.length,
      executable_now: 0,
      failures: failures.length,
      public_ready_after_payloads: 0
    },
    written_payloads: writtenPayloads,
    next_actions: [
      'Add payload smoke reader for GitHub-signal fixture payload shape.',
      'Only after smoke checks pass, wire payload steps into the day-batch loop.',
      'Keep all real adapters behind separate dependency/install and overseer review gates.'
    ],
    failures
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub fixture payloads');
  console.log(`Status: ${report.status}`);
  console.log(`Manifests: ${report.summary.manifests}`);
  console.log(`Payloads written: ${report.summary.payloads_written}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildPayload({ manifest, fixture }) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'generated_github_signal_fixture_payload',
    contract_id: manifest.contract_id,
    fixture_id: fixture.id,
    fixture_root_id: manifest.fixture_id,
    lane: manifest.lane,
    source_repo: manifest.source_repo,
    source_url: manifest.source_url,
    source_repo_is_reference_only: true,
    promotion: manifest.promotion || null,
    policy: {
      private_content: false,
      generated_or_public_safe: true,
      copied_github_code: false,
      copied_readme_text: false,
      tool_output: false,
      public_ready: false,
      public_ready_after_payload: 0
    },
    description: fixture.description,
    content: contentFor(manifest, fixture),
    expected_review: {
      provenance_state: 'generated_fixture',
      rights_state: 'public_safe_synthetic',
      repository_review_required_before_adapter_work: true,
      human_review_required_before_training: true,
      training_eval_lane: manifest.promotion?.training_eval_lane || null,
      ontology_bindings_present: Boolean((manifest.promotion?.ontology_bindings?.entities || []).length && (manifest.promotion?.ontology_bindings?.relations || []).length),
      allowed_for_private_gate_testing: false
    }
  };
}

function contentFor(manifest, fixture) {
  if (manifest.lane === 'kosmo_prepare') return prepareContent(fixture.id);
  if (manifest.lane === 'kosmo_asset') return assetContent(fixture.id);
  if (manifest.lane === 'worker_integration') return workerContent(fixture.id);
  return {
    type: 'github_signal_research_fixture',
    review_questions: ['Does this public project suggest a safe local adapter contract?', 'Which runtime actions must remain blocked?']
  };
}

function prepareContent(fixtureId) {
  if (fixtureId === 'synthetic_layout_expectation') {
    return {
      type: 'document_layout_expectation',
      blocks: [
        { id: 'title', kind: 'heading', required: true },
        { id: 'drawing-index', kind: 'table', required_columns: ['drawing_id', 'scale', 'status'] },
        { id: 'ocr-uncertainty', kind: 'review_matrix', required: true }
      ],
      expected_markdown_headings: ['Project Metadata', 'Plan Inventory', 'Material Notes', 'Review Gate']
    };
  }
  return {
    type: 'synthetic_architecture_document_manifest',
    project_stub: 'generated-reference-pilot',
    pages: [
      { page: 1, labels: ['PROJECT', 'SITE', 'SCALE'], has_table: true, has_image_placeholder: true },
      { page: 2, labels: ['PLAN', 'SECTION', 'MATERIAL'], has_table: false, has_image_placeholder: true }
    ],
    extraction_targets: ['title', 'architect', 'year', 'plan_labels', 'material_terms', 'uncertain_tokens']
  };
}

function assetContent(fixtureId) {
  if (fixtureId === 'synthetic_similarity_query') {
    return {
      type: 'asset_similarity_query_fixture',
      queries: [
        {
          id: 'q-timber-structure',
          text: 'Find generated assets with timber rhythm, structural bay metadata and facade texture tags.',
          expected_feature_hits: ['material:timber', 'structure:bay_rhythm', 'texture:vertical_grain']
        }
      ],
      scoring_fields: ['feature_overlap', 'provenance_state', 'geometry_stub_match']
    };
  }
  return {
    type: 'synthetic_asset_manifest',
    assets: [
      {
        id: 'generated-wall-panel-01',
        kind: 'facade_element',
        geometry_stub: 'rectangular_panel_with_opening',
        materials: ['timber', 'mineral_finish'],
        dimensions_m: [2.4, 3.1, 0.18],
        provenance_state: 'generated_fixture'
      },
      {
        id: 'generated-column-grid-01',
        kind: 'structure_principle',
        geometry_stub: 'regular_column_grid',
        materials: ['concrete'],
        dimensions_m: [6, 6, 3],
        provenance_state: 'generated_fixture'
      }
    ]
  };
}

function workerContent(fixtureId) {
  if (fixtureId === 'synthetic_runtime_risk_matrix') {
    return {
      type: 'runtime_risk_matrix',
      blocked_actions: ['network_clone', 'dependency_install', 'private_file_read', 'unreviewed_code_execution', 'public_asset_export'],
      required_overseer_checks: ['input_contract', 'output_schema', 'rights_state', 'runtime_scope'],
      escalation_on: ['missing provenance', 'private path detected', 'unexpected executable command']
    };
  }
  return {
    type: 'local_worker_command_boundary',
    allowed_commands: [
      {
        id: 'parse_synthetic_manifest',
        input_schema: 'generated_fixture_manifest',
        output_schema: 'review_gate_report',
        network_allowed: false,
        private_content_allowed: false
      }
    ],
    expected_json_output: {
      status: 'review_only',
      findings: [],
      public_ready: false
    }
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Fixture Payloads');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Manifests: ${report.summary.manifests}`);
  lines.push(`- Payloads written: ${report.summary.payloads_written}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Public-ready after payloads: ${report.summary.public_ready_after_payloads}`);
  lines.push('');
  lines.push('## Written Payloads');
  lines.push('');
  report.written_payloads.forEach((file) => lines.push(`- \`${file}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
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
