#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const briefPath = resolve(root, args.brief || `data/kosmo-dependency-install-batch-brief-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-dependency-install-batch-brief-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-dependency-install-batch-brief-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const brief = JSON.parse(await readFile(briefPath, 'utf8'));
  const findings = checkBrief(brief);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'dependency_install_batch_brief_guard_passed' : 'dependency_install_batch_brief_guard_failed',
    policy: {
      validates_decision_brief_only: true,
      installs_dependencies_now: false,
      downloads_models_now: false,
      reads_private_content: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, briefPath)],
    summary: {
      brief_status: brief.status,
      phases: brief.phases?.length ?? null,
      phase_1_package_count: brief.summary?.phase_1_package_count ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo dependency install batch brief check');
  console.log(`Status: ${report.status}`);
  console.log(`Phases: ${report.summary.phases}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkBrief(brief) {
  const findings = [];
  expect(brief.schema_version === '0.1', findings, 'schema_version', 'Brief schema_version must be 0.1.');
  expect(brief.status === 'dependency_install_batch_brief_ready', findings, 'brief_ready', 'Brief must be ready.');
  expect(brief.policy?.decision_brief_only === true, findings, 'decision_brief_only', 'Brief must be decision-brief-only.');
  expect(brief.policy?.installs_dependencies_now === false, findings, 'no_installs', 'Brief must not install dependencies.');
  expect(brief.policy?.downloads_models_now === false, findings, 'no_model_downloads', 'Brief must not download models.');
  expect(brief.policy?.runs_tools_now === false, findings, 'no_tool_runs', 'Brief must not run tools.');
  expect(brief.policy?.reads_private_content === false, findings, 'no_private_reads', 'Brief must not read private content.');
  expect(brief.policy?.public_ready_after_brief === 0, findings, 'public_ready_zero', 'Brief must keep public-ready at 0.');
  expect((brief.phases || []).length === 3, findings, 'phase_count', 'Brief must include three phases.');
  expect(brief.summary?.phase_1_package_count >= 5, findings, 'phase_1_packages', 'Phase 1 must include the package candidates.');
  for (const phase of brief.phases || []) {
    expect(phase.executes_now === false, findings, `phase_not_executing:${phase.id}`, `${phase.id} must not execute now.`);
    expect(phase.reads_private_content === false, findings, `phase_no_private_reads:${phase.id}`, `${phase.id} must not read private content.`);
    for (const item of phase.packages || []) {
      expect(item.executes_now === false, findings, `item_not_executing:${item.id}`, `${item.id} must not execute now.`);
      expect(item.public_ready_after_item === 0, findings, `item_public_ready_zero:${item.id}`, `${item.id} must keep public-ready at 0.`);
      if (item.install_type === 'model_download') {
        expect(item.requires_model_root_decision === true, findings, `model_root_gate:${item.id}`, `${item.id} must require model root decision.`);
      }
      if (item.id === 'deepseek_ocr') {
        expect(item.blocked_until_source_root_unlock === true, findings, 'ocr_source_root_gate', 'DeepSeek OCR must stay source-root gated.');
      }
    }
  }
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Dependency Install Batch Brief Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Brief status: ${report.summary.brief_status}`);
  lines.push(`- Phases: ${report.summary.phases}`);
  lines.push(`- Phase 1 package count: ${report.summary.phase_1_package_count}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`));
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
