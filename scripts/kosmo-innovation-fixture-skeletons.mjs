#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const contractsPath = resolve(root, args.contracts || `data/kosmo-innovation-fixture-contracts-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-fixture-skeletons-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-fixture-skeletons-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const contractsReport = JSON.parse(await readFile(contractsPath, 'utf8'));
  const writtenFiles = [];
  const failures = [];
  if (contractsReport.status !== 'innovation_fixture_contracts_ready') {
    failures.push(`Contracts not ready: ${contractsReport.status}`);
  }

  for (const contract of contractsReport.contracts || []) {
    const rootDir = resolve(root, contract.output_root);
    const manifest = fixtureManifest(contract);
    const readme = fixtureReadme(contract, manifest);
    await mkdir(rootDir, { recursive: true });
    await writeFile(resolve(rootDir, 'fixture-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(resolve(rootDir, 'README.md'), readme);
    writtenFiles.push(relative(root, resolve(rootDir, 'fixture-manifest.json')));
    writtenFiles.push(relative(root, resolve(rootDir, 'README.md')));
  }

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_fixture_skeletons_ready' : 'innovation_fixture_skeletons_needs_review',
    policy: {
      skeletons_only: true,
      generated_or_public_safe_only: true,
      installs_tools_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      runs_private_ocr: false,
      runs_embeddings_on_private_content: false,
      runs_training: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_skeletons: 0,
      note: 'Skeletons contain only generated/public-safe manifests and README files. They are not tool outputs and do not include private content.'
    },
    source_refs: [relative(root, contractsPath)],
    summary: {
      contracts: contractsReport.contracts?.length ?? 0,
      directories: contractsReport.contracts?.length ?? 0,
      files_written: writtenFiles.length,
      executable_now: 0,
      failures: failures.length,
      public_ready_after_skeletons: 0
    },
    written_files: writtenFiles,
    next_actions: [
      'Add generated fixture payload files for the highest-priority contracts.',
      'Run isolated tool smoke checks only after dependency policy review.',
      'Keep all private source roots blocked until explicit Source Root gates pass.'
    ],
    failures
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation fixture skeletons');
  console.log(`Status: ${report.status}`);
  console.log(`Directories: ${report.summary.directories}`);
  console.log(`Files written: ${report.summary.files_written}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function fixtureManifest(contract) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    contract_id: contract.id,
    candidate_id: contract.candidate_id,
    lane: contract.lane,
    status: 'fixture_skeleton_only',
    policy: {
      generated_or_public_safe_only: true,
      private_content: false,
      install_required_now: false,
      tool_run_required_now: false,
      public_ready_after_fixture: 0
    },
    fixtures: (contract.fixtures || []).map((fixture) => ({
      id: fixture.id,
      description: fixture.description,
      status: 'payload_pending',
      private_content: false,
      generated_or_public_safe: true,
      expected_payload_path: `payloads/${fixture.id}.fixture.json`
    })),
    acceptance: contract.acceptance || [],
    forbidden_inputs: contract.forbidden_inputs || [],
    allowed_outputs: contract.allowed_outputs || []
  };
}

function fixtureReadme(contract, manifest) {
  const lines = [];
  lines.push(`# ${contract.id}`);
  lines.push('');
  lines.push(`Candidate: \`${contract.candidate_id}\``);
  lines.push(`Lane: \`${contract.lane}\``);
  lines.push('');
  lines.push('This directory is a generated/public-safe fixture skeleton only.');
  lines.push('');
  lines.push('## Fixtures');
  lines.push('');
  for (const fixture of manifest.fixtures) {
    lines.push(`- \`${fixture.id}\`: ${fixture.description}`);
  }
  lines.push('');
  lines.push('## Guard');
  lines.push('');
  lines.push('- No private source roots.');
  lines.push('- No private PDFs, books, scans, images or worker outputs.');
  lines.push('- No tool install or tool execution in this skeleton step.');
  lines.push('- `public_ready` remains false/0.');
  lines.push('');
  return lines.join('\n');
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Fixture Skeletons');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Contracts: ${report.summary.contracts}`);
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
