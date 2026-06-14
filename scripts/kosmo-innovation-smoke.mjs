#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const planPath = resolve(root, args.plan || `data/kosmo-innovation-lane-plan-${dateStamp}.json`);
const smokeRoot = resolve(root, args.smokeRoot || `examples/kosmo-innovation-smoke-${dateStamp}`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-smoke-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-smoke-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const fixture = await writeFixture();
  const checks = [
    await markitdownSmoke({ plan, fixture }),
    await ocrSmoke({ plan }),
    await embeddingContractSmoke({ plan, fixture }),
    await ifcOpenShellSmoke({ plan }),
    await paper2PosterContractSmoke({ plan, fixture })
  ];
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_smoke_passed_review_only' : 'innovation_smoke_failed',
    policy: {
      public_safe_fixtures_only: true,
      installs_tools: false,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_smoke: 0,
      note: 'This smoke uses generated synthetic fixtures and local tool probes only. Missing optional tools are skipped, not installed.'
    },
    source_refs: [relative(root, planPath)],
    fixture: {
      root: relative(root, smokeRoot),
      note: relative(root, fixture.notePath),
      manifest: relative(root, fixture.manifestPath)
    },
    summary: {
      checks: checks.length,
      passed: checks.filter((check) => check.status === 'passed').length,
      skipped: checks.filter((check) => check.status.startsWith('skipped')).length,
      failures: failures.length,
      public_ready_after_smoke: 0
    },
    checks,
    next_actions: [
      'Install missing tools only in isolated environments when owner confirms the lane.',
      'Keep private source OCR, conversion and embeddings blocked until source-root gates pass.',
      'Use the generated layout and embedding contracts as the next implementation targets for KosmoPrepare/KosmoPublish.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks} passed, ${report.summary.skipped} skipped`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.status !== 'innovation_smoke_passed_review_only') process.exitCode = 1;
}

async function writeFixture() {
  const fixtureDir = resolve(smokeRoot, 'fixtures');
  await mkdir(fixtureDir, { recursive: true });
  const notePath = resolve(fixtureDir, 'public-safe-architecture-note.txt');
  const manifestPath = resolve(fixtureDir, 'fixture-manifest.json');
  const note = [
    'Kosmo public-safe synthetic fixture.',
    'Pilot references: Villa Savoye, Kapelle Sogn Benedetg, Frauenkloster Ingenbohl.',
    'This text is generated for tool smoke testing and contains no private source excerpt.'
  ].join('\n');
  const manifest = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    public_safe_fixture: true,
    private_content_included: false,
    copied_private_files: false,
    files: [
      {
        path: relative(root, notePath),
        kind: 'synthetic_text',
        allowed_uses: ['tool_smoke', 'embedding_contract', 'layout_contract']
      }
    ]
  };
  await writeFile(notePath, `${note}\n`);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { notePath, manifestPath, note };
}

async function markitdownSmoke({ plan, fixture }) {
  const probe = plan.probes?.markitdown_cli;
  if (probe?.status !== 'available') return skipped('markitdown_prepare_m2', 'skipped_missing_tool', 'markitdown CLI is not installed.');
  const outputPath = resolve(smokeRoot, 'markitdown-output.md');
  const result = spawnSync(probe.executable || 'markitdown', [fixture.notePath], { encoding: 'utf8', timeout: 30000 });
  if (result.status !== 0) return failed('markitdown_prepare_m2', `markitdown failed: ${result.stderr || result.stdout || 'no output'}`);
  await writeFile(outputPath, String(result.stdout || '').trim() + '\n');
  return passed('markitdown_prepare_m2', `Converted synthetic fixture to ${relative(root, outputPath)}.`);
}

async function ocrSmoke({ plan }) {
  const probe = plan.probes?.tesseract_cli;
  if (probe?.status !== 'available') return skipped('local_ocr_scanned_sources', 'skipped_missing_tool', 'tesseract CLI is not installed.');
  return skipped('local_ocr_scanned_sources', 'skipped_no_image_fixture', 'OCR tool exists, but no generated image fixture is part of this metadata-only smoke yet.');
}

async function embeddingContractSmoke({ fixture }) {
  const text = await readFile(fixture.notePath, 'utf8');
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const vector = deterministicVector(tokens.join(' '), 12);
  const outputPath = resolve(smokeRoot, 'embedding-contract.generated.json');
  const contract = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'embedding_contract_public_safe',
    model_route: 'deterministic-smoke-vector',
    intended_future_model: 'qwen-local-embedding-or-reranker',
    source_path: relative(root, fixture.notePath),
    public_safe_fixture: true,
    private_content_included: false,
    vector_dimensions: vector.length,
    vector,
    metadata_fields: ['pilot_id', 'title', 'own_written_summary', 'rights_state']
  };
  await writeFile(outputPath, `${JSON.stringify(contract, null, 2)}\n`);
  return passed('qwen_embedding_rag', `Wrote public-safe embedding contract ${relative(root, outputPath)}.`);
}

async function ifcOpenShellSmoke({ plan }) {
  const probe = plan.probes?.ifcopenshell_import;
  if (probe?.status !== 'available') return skipped('ifcopenshell_geometry_lane', 'skipped_missing_python_module', 'ifcopenshell is not importable in the current Python environment.');
  return passed('ifcopenshell_geometry_lane', 'ifcopenshell import probe is available; use existing demo IFC for the next geometry smoke.');
}

async function paper2PosterContractSmoke({ fixture }) {
  const outputPath = resolve(smokeRoot, 'publish-layout-contract.generated.json');
  const contract = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'publish_layout_contract_public_safe',
    inspiration: 'paper2poster_layout_reasoning',
    source_fixture: relative(root, fixture.notePath),
    public_safe_fixture: true,
    private_content_included: false,
    board: {
      format: 'A1-landscape-review-only',
      sections: [
        { id: 'project_identity', title: 'Project Identity', media_slots: 0 },
        { id: 'typology_structure_material', title: 'Typology / Structure / Material', media_slots: 3 },
        { id: 'evidence_gaps', title: 'Evidence Gaps', media_slots: 0 },
        { id: 'asset_candidates', title: 'Asset Candidates', media_slots: 3 }
      ]
    },
    promotion_gate: 'No media slot may be populated from private or unclear-rights files before provenance review.'
  };
  await writeFile(outputPath, `${JSON.stringify(contract, null, 2)}\n`);
  return passed('paper2poster_publish_lane', `Wrote public-safe layout contract ${relative(root, outputPath)}.`);
}

function deterministicVector(input, dimensions) {
  const hash = createHash('sha256').update(input).digest();
  return Array.from({ length: dimensions }, (_, index) => Number(((hash[index] / 255) * 2 - 1).toFixed(6)));
}

function passed(id, evidence) {
  return { id, status: 'passed', evidence };
}

function skipped(id, status, evidence) {
  return { id, status, evidence };
}

function failed(id, evidence) {
  return { id, status: 'failed', evidence };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Smoke');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.checks}`);
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Skipped: ${report.summary.skipped}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after smoke: ${report.summary.public_ready_after_smoke}`);
  lines.push(`- Fixture root: \`${report.fixture.root}\``);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  lines.push('| Lane | Status | Evidence |');
  lines.push('| --- | --- | --- |');
  report.checks.forEach((check) => {
    lines.push(`| \`${check.id}\` | ${check.status} | ${escapePipe(check.evidence)} |`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
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
