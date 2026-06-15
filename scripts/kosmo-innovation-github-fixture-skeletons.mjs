#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const planPath = resolve(root, args.plan || `data/kosmo-innovation-github-fixture-contract-plan-${dateStamp}.json`);
const matrixPath = resolve(root, args.matrix || `data/kosmo-innovation-github-promotion-matrix-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-fixture-skeletons-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-fixture-skeletons-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
  const writtenFiles = [];
  const failures = [];
  if (plan.status !== 'innovation_github_fixture_contract_plan_ready') {
    failures.push(`Contract plan not ready: ${plan.status}`);
  }
  if (matrix.status !== 'innovation_github_promotion_matrix_ready') {
    failures.push(`Promotion matrix not ready: ${matrix.status}`);
  }
  const promotionsByFixture = new Map((matrix.promotion_items || []).map((item) => [item.fixture_id, item]));

  for (const contract of plan.contract_plans || []) {
    const promotion = promotionsByFixture.get(contract.fixture_id);
    if (!promotion?.source_free_promotable) {
      failures.push(`Contract is not source-free promotable in promotion matrix: ${contract.fixture_id}`);
      continue;
    }
    const rootDir = resolve(root, contract.proposed_fixture_root);
    const manifest = fixtureManifest(contract, promotion);
    await mkdir(rootDir, { recursive: true });
    await writeFile(resolve(rootDir, 'fixture-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(resolve(rootDir, 'README.md'), fixtureReadme(contract, manifest));
    writtenFiles.push(relative(root, resolve(rootDir, 'fixture-manifest.json')));
    writtenFiles.push(relative(root, resolve(rootDir, 'README.md')));
  }

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_github_fixture_skeletons_ready' : 'innovation_github_fixture_skeletons_needs_review',
    policy: {
      skeletons_only: true,
      synthetic_fixture_only: true,
      github_repositories_are_source_refs_only: true,
      copies_github_code: false,
      copies_readme_text: false,
      clones_repositories_now: false,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_discovered_code_now: false,
      reads_private_content: false,
      writes_public_files: false,
      public_ready_after_skeletons: 0,
      note: 'Skeletons are generated from contract metadata only. They do not copy repository code, README prose, private sources or worker outputs.'
    },
    source_refs: [relative(root, planPath), relative(root, matrixPath)],
    summary: {
      contract_plans: plan.contract_plans?.length ?? 0,
      matrix_promotable: matrix.summary?.promotable_source_free ?? null,
      directories: plan.contract_plans?.length ?? 0,
      files_written: writtenFiles.length,
      executable_now: 0,
      failures: failures.length,
      public_ready_after_skeletons: 0
    },
    written_files: writtenFiles,
    next_actions: [
      'Generate synthetic payload JSON for at most one GitHub fixture per lane.',
      'Keep all GitHub-derived fixtures source-free until an overseer reviews adapter value.',
      'Do not clone, install, download or run discovered repositories from this skeleton batch.'
    ],
    failures
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub fixture skeletons');
  console.log(`Status: ${report.status}`);
  console.log(`Directories: ${report.summary.directories}`);
  console.log(`Files written: ${report.summary.files_written}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function fixtureManifest(contract, promotion) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    contract_id: contract.id,
    fixture_id: contract.fixture_id,
    source_repo: contract.source_repo,
    source_url: contract.source_url,
    source_repo_is_reference_only: true,
    source_lane: contract.source_lane,
    lane: contract.target_lane,
    promotion: {
      matrix_id: promotion.id,
      source_free_promotable: promotion.source_free_promotable,
      promotion_decision: promotion.promotion_decision,
      training_eval_lane: promotion.training_eval_lane,
      ontology_bindings: promotion.ontology_bindings,
      local_worker_allowed_now: promotion.local_worker_allowed_now,
      private_content_allowed: promotion.private_content_allowed,
      public_ready_after_item: promotion.public_ready_after_item
    },
    status: 'github_signal_fixture_skeleton_only',
    policy: {
      synthetic_fixture_only: true,
      github_reference_only: true,
      copied_github_code: false,
      copied_readme_text: false,
      private_content: false,
      install_required_now: false,
      tool_run_required_now: false,
      public_ready_after_fixture: 0
    },
    allowed_inputs: contract.allowed_inputs || [],
    expected_outputs: contract.expected_outputs || [],
    fixtures: fixtureSpecsFor(contract).map((fixture) => ({
      ...fixture,
      status: 'payload_pending',
      private_content: false,
      generated_or_public_safe: true,
      expected_payload_path: `payloads/${fixture.id}.fixture.json`
    })),
    acceptance: acceptanceFor(contract),
    guard_requirements: contract.guard_requirements || [],
    forbidden_inputs: [
      'private source roots',
      'private PDFs/books/scans/images',
      'raw README text copied from GitHub',
      'GitHub repository source files',
      'repository clones',
      'dependency installs',
      'model downloads',
      'local worker private outputs',
      'public-ready or rights-cleared claims'
    ],
    allowed_outputs: [
      'fixture manifest JSON',
      'synthetic payload JSON',
      'fixture smoke report JSON/Markdown',
      'review-only handoff notes'
    ]
  };
}

function fixtureSpecsFor(contract) {
  if (contract.target_lane === 'kosmo_prepare') {
    return [
      {
        id: 'synthetic_document_manifest',
        description: 'Generated architecture document manifest with sections, drawing labels and table placeholders.'
      },
      {
        id: 'synthetic_layout_expectation',
        description: 'Expected Markdown/layout schema for OCR and document-conversion adapter checks.'
      }
    ];
  }
  if (contract.target_lane === 'kosmo_asset') {
    return [
      {
        id: 'synthetic_asset_manifest',
        description: 'Generated 2D/3D asset metadata with material, geometry and provenance fields.'
      },
      {
        id: 'synthetic_similarity_query',
        description: 'Generated retrieval query and expected feature-taxonomy response for asset search checks.'
      }
    ];
  }
  if (contract.target_lane === 'worker_integration') {
    return [
      {
        id: 'synthetic_command_boundary',
        description: 'Generated command registry for local worker orchestration without runtime execution.'
      },
      {
        id: 'synthetic_runtime_risk_matrix',
        description: 'Expected risk and output-contract matrix for BIM/IFC/RAG worker handoff review.'
      }
    ];
  }
  return [
    {
      id: 'synthetic_research_manifest',
      description: 'Generated source-free research manifest for review-only innovation evaluation.'
    }
  ];
}

function acceptanceFor(contract) {
  const common = [
    'No private content, protected source files or worker outputs are used.',
    'No GitHub code, README prose or assets are copied into the fixture.',
    'Output keeps public_ready false/0 and requires overseer review before execution.'
  ];
  if (contract.target_lane === 'kosmo_prepare') {
    return [
      'Adapter shape can represent document hierarchy, OCR uncertainty and layout blocks.',
      ...common
    ];
  }
  if (contract.target_lane === 'kosmo_asset') {
    return [
      'Adapter shape can represent asset features, material tags and similarity queries.',
      ...common
    ];
  }
  if (contract.target_lane === 'worker_integration') {
    return [
      'Command boundary can represent allowed inputs, expected JSON outputs and blocked runtime actions.',
      ...common
    ];
  }
  return common;
}

function fixtureReadme(contract, manifest) {
  const lines = [];
  lines.push(`# ${contract.fixture_id}`);
  lines.push('');
  lines.push(`Source reference: [${contract.source_repo}](${contract.source_url})`);
  lines.push(`Lane: \`${contract.target_lane}\``);
  lines.push(`Promotion decision: \`${manifest.promotion.promotion_decision}\``);
  lines.push(`Training eval lane: \`${manifest.promotion.training_eval_lane}\``);
  lines.push('');
  lines.push('This directory is a synthetic GitHub-signal fixture skeleton only. The repository is used as a source reference, not as copied implementation material.');
  lines.push('');
  lines.push('## Fixtures');
  lines.push('');
  manifest.fixtures.forEach((fixture) => {
    lines.push(`- \`${fixture.id}\`: ${fixture.description}`);
  });
  lines.push('');
  lines.push('## Guard');
  lines.push('');
  lines.push('- No private source roots.');
  lines.push('- No GitHub code, README prose, assets or repository clones.');
  lines.push('- No dependency install, model download or discovered-code execution.');
  lines.push('- `public_ready` remains false/0.');
  lines.push('');
  return lines.join('\n');
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Fixture Skeletons');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Contract plans: ${report.summary.contract_plans}`);
  lines.push(`- Matrix promotable: ${report.summary.matrix_promotable}`);
  lines.push(`- Directories: ${report.summary.directories}`);
  lines.push(`- Files written: ${report.summary.files_written}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Public-ready after skeletons: ${report.summary.public_ready_after_skeletons}`);
  lines.push('');
  lines.push('## Written Files');
  lines.push('');
  report.written_files.forEach((file) => lines.push(`- \`${file}\``));
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
