#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const contractsPath = resolve(root, args.contracts || `data/kosmo-innovation-fixture-contracts-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-fixture-contracts-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-fixture-contracts-check-${dateStamp}.md`);

const requiredContracts = new Set([
  'docling_public_pdf_fixture',
  'markitdown_office_fixture',
  'qwen3_retrieval_fixture',
  'ifcopenshell_geometry_fixture'
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const contracts = JSON.parse(await readFile(contractsPath, 'utf8'));
  const findings = checkContracts(contracts);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_fixture_contracts_guard_passed' : 'innovation_fixture_contracts_guard_failed',
    policy: {
      validates_contracts_only: true,
      installs_tools_now: false,
      reads_private_content: false,
      runs_private_ocr: false,
      runs_embeddings_on_private_content: false,
      writes_public_files: false,
      public_ready_after_check: 0,
      note: 'This guard validates fixture contracts only. It does not install tools or create fixtures.'
    },
    source_refs: [relative(root, contractsPath)],
    summary: {
      contracts_status: contracts.status,
      contracts: contracts.contracts?.length ?? 0,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Create generated fixture skeletons for the highest-priority contracts.',
          'Run tool-specific smoke only after dependency policy review.',
          'Keep private source roots, OCR and embeddings blocked until explicit Source Root gates pass.'
        ]
      : [
          'Fix innovation fixture contract guard failures.',
          'Rerun npm run kosmo:innovation-fixture-contracts and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation fixture contracts check');
  console.log(`Status: ${report.status}`);
  console.log(`Contracts: ${report.summary.contracts}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkContracts(report) {
  const findings = [];
  const contracts = report.contracts || [];
  const ids = new Set(contracts.map((item) => item.id));
  expect(report.schema_version === '0.1', findings, 'schema_version', 'Contracts schema_version must be 0.1.');
  expect(report.status === 'innovation_fixture_contracts_ready', findings, 'contracts_ready', 'Contracts report must be ready.');
  expect(report.policy?.fixture_contracts_only === true, findings, 'fixture_contracts_only', 'Report must be fixture-contracts-only.');
  expect(report.policy?.installs_tools_now === false, findings, 'no_installs', 'Report must not install tools.');
  expect(report.policy?.clones_repositories_now === false, findings, 'no_clones', 'Report must not clone repositories.');
  expect(report.policy?.reads_private_content === false, findings, 'no_private_reads', 'Report must not read private content.');
  expect(report.policy?.runs_private_ocr === false, findings, 'no_private_ocr', 'Report must not run private OCR.');
  expect(report.policy?.runs_embeddings_on_private_content === false, findings, 'no_private_embeddings', 'Report must not run private embeddings.');
  expect(report.policy?.runs_training === false, findings, 'no_training', 'Report must not run training.');
  expect(report.policy?.public_ready_after_contracts === 0, findings, 'public_ready_zero', 'Report must keep public-ready at 0.');
  expect(contracts.length >= 8, findings, 'contract_count', 'Report must include at least eight contracts.');
  for (const id of requiredContracts) {
    expect(ids.has(id), findings, `required_contract:${id}`, `Required contract missing: ${id}.`);
  }
  for (const item of contracts) {
    expect(item.scout_candidate_present === true, findings, `scout_candidate_present:${item.id}`, `${item.id} must map to a scout candidate.`);
    expect(item.install_now === false, findings, `install_now_false:${item.id}`, `${item.id} must not install now.`);
    expect(item.private_content_allowed_now === false, findings, `private_content_false:${item.id}`, `${item.id} must not allow private content now.`);
    expect(item.executable_now === false, findings, `executable_false:${item.id}`, `${item.id} must not be executable now.`);
    expect(item.public_ready_after_contract === 0, findings, `public_ready_zero:${item.id}`, `${item.id} must keep public-ready at 0.`);
    expect(String(item.output_root || '').startsWith('examples/kosmo-innovation-fixtures/'), findings, `output_root_safe:${item.id}`, `${item.id} output root must stay under examples/kosmo-innovation-fixtures.`);
    expect((item.fixtures || []).length >= 2, findings, `fixtures_min:${item.id}`, `${item.id} must define at least two fixtures.`);
    for (const fixture of item.fixtures || []) {
      expect(fixture.private_content === false, findings, `fixture_no_private:${item.id}:${fixture.id}`, `${fixture.id} must not use private content.`);
      expect(fixture.generated_or_public_safe === true, findings, `fixture_public_safe:${item.id}:${fixture.id}`, `${fixture.id} must be generated or public-safe.`);
    }
    const forbidden = (item.forbidden_inputs || []).join(' ').toLowerCase();
    expect(forbidden.includes('/mnt/archiv') && forbidden.includes('private'), findings, `forbidden_private_roots:${item.id}`, `${item.id} must explicitly forbid private roots.`);
  }
  expect(report.summary?.executable_now === 0, findings, 'summary_executable_zero', 'Summary executable_now must be 0.');
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Fixture Contracts Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Contracts status: ${report.summary.contracts_status}`);
  lines.push(`- Contracts: ${report.summary.contracts}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => {
    lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`);
  });
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
