#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const skeletonsPath = resolve(root, args.skeletons || `data/kosmo-innovation-fixture-skeletons-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-fixture-skeletons-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-fixture-skeletons-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const skeletons = JSON.parse(await readFile(skeletonsPath, 'utf8'));
  const findings = await checkSkeletons(skeletons);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_fixture_skeletons_guard_passed' : 'innovation_fixture_skeletons_guard_failed',
    policy: {
      validates_skeletons_only: true,
      installs_tools_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      writes_public_files: false,
      public_ready_after_check: 0,
      note: 'This guard validates generated fixture skeleton manifests and README files only.'
    },
    source_refs: [relative(root, skeletonsPath)],
    summary: {
      skeletons_status: skeletons.status,
      files_checked: skeletons.written_files?.length ?? 0,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Generate payload fixtures for Docling, MarkItDown, Qwen and IfcOpenShell first.',
          'Keep tool execution in isolated smoke scripts and do not use private files.',
          'Update Orbit/Handoff after payload contracts are ready.'
        ]
      : [
          'Fix skeleton guard failures.',
          'Rerun npm run kosmo:innovation-fixture-skeletons and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation fixture skeletons check');
  console.log(`Status: ${report.status}`);
  console.log(`Files checked: ${report.summary.files_checked}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

async function checkSkeletons(report) {
  const findings = [];
  expect(report.schema_version === '0.1', findings, 'schema_version', 'Skeleton report schema_version must be 0.1.');
  expect(report.status === 'innovation_fixture_skeletons_ready', findings, 'skeletons_ready', 'Skeleton report must be ready.');
  expect(report.policy?.skeletons_only === true, findings, 'skeletons_only', 'Report must be skeletons-only.');
  expect(report.policy?.generated_or_public_safe_only === true, findings, 'generated_public_safe_only', 'Report must be generated/public-safe only.');
  expect(report.policy?.installs_tools_now === false, findings, 'no_installs', 'Report must not install tools.');
  expect(report.policy?.runs_tools_now === false, findings, 'no_tool_runs', 'Report must not run tools.');
  expect(report.policy?.reads_private_content === false, findings, 'no_private_reads', 'Report must not read private content.');
  expect(report.policy?.public_ready_after_skeletons === 0, findings, 'public_ready_zero', 'Report must keep public-ready at 0.');
  expect((report.written_files || []).length >= 18, findings, 'written_file_count', 'Report must write at least two files per fixture contract.');
  for (const file of report.written_files || []) {
    expect(file.startsWith('examples/kosmo-innovation-fixtures/'), findings, `file_root:${file}`, `${file} must stay under examples/kosmo-innovation-fixtures.`);
    expect(await exists(resolve(root, file)), findings, `file_exists:${file}`, `${file} must exist.`);
    if (file.endsWith('fixture-manifest.json')) {
      const manifest = JSON.parse(await readFile(resolve(root, file), 'utf8'));
      expect(manifest.status === 'fixture_skeleton_only', findings, `manifest_status:${file}`, `${file} must be fixture_skeleton_only.`);
      expect(manifest.policy?.private_content === false, findings, `manifest_no_private:${file}`, `${file} must declare no private content.`);
      expect(manifest.policy?.tool_run_required_now === false, findings, `manifest_no_tool_run:${file}`, `${file} must not require tool run now.`);
      expect(manifest.policy?.public_ready_after_fixture === 0, findings, `manifest_public_ready_zero:${file}`, `${file} must keep public-ready at 0.`);
      expect((manifest.fixtures || []).every((fixture) => fixture.private_content === false), findings, `manifest_fixture_no_private:${file}`, `${file} fixtures must be non-private.`);
    }
  }
  return findings;
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Fixture Skeletons Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Skeletons status: ${report.summary.skeletons_status}`);
  lines.push(`- Files checked: ${report.summary.files_checked}`);
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
