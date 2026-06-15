#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const scanPath = resolve(root, args.scan || `data/kosmo-innovation-github-readme-signal-scan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-readme-signal-scan-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-readme-signal-scan-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const scan = JSON.parse(await readFile(scanPath, 'utf8'));
  const findings = checkScan(scan);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_github_readme_signal_scan_guard_passed' : 'innovation_github_readme_signal_scan_guard_failed',
    policy: {
      validates_signal_scan_only: true,
      raw_readme_content_allowed_in_output: false,
      reads_private_content: false,
      installs_or_downloads: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, scanPath)],
    summary: {
      scan_status: scan.status,
      scanned_items: scan.summary?.scanned_items ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub README signal scan check');
  console.log(`Status: ${report.status}`);
  console.log(`Scanned items: ${report.summary.scanned_items}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkScan(scan) {
  const findings = [];
  expect(scan.schema_version === '0.1', findings, 'schema_version', 'Scan schema_version must be 0.1.');
  expect(scan.status === 'innovation_github_readme_signal_scan_ready', findings, 'scan_ready', 'Scan must be ready.');
  expect(scan.policy?.signal_scan_only === true, findings, 'signal_scan_only', 'Scan must be signal-only.');
  expect(scan.policy?.stores_raw_readme_content === false, findings, 'no_raw_readme', 'Scan must not store raw README content.');
  expect(scan.policy?.stores_readme_snippets === false, findings, 'no_readme_snippets', 'Scan must not store README snippets.');
  expect(scan.policy?.clones_repositories_now === false, findings, 'no_clone', 'Scan must not clone repositories.');
  expect(scan.policy?.installs_dependencies_now === false, findings, 'no_install', 'Scan must not install dependencies.');
  expect(scan.policy?.downloads_models_now === false, findings, 'no_download', 'Scan must not download models.');
  expect(scan.policy?.runs_discovered_code_now === false, findings, 'no_run_code', 'Scan must not run discovered code.');
  expect(scan.policy?.reads_private_content === false, findings, 'no_private_reads', 'Scan must not read private content.');
  expect(scan.policy?.public_ready_after_scan === 0, findings, 'public_ready_zero', 'Scan must keep public-ready at 0.');
  expect((scan.scanned_items || []).length >= 5, findings, 'scanned_item_count', 'Scan must include at least five scanned items.');
  for (const item of scan.scanned_items || []) {
    expect(item.readme?.raw_content_stored === false, findings, `raw_content_not_stored:${item.id}`, `${item.id} must not store raw README content.`);
    expect(item.readme?.snippets_stored === false, findings, `snippets_not_stored:${item.id}`, `${item.id} must not store README snippets.`);
    expect(item.allowed_now?.clone_repository === false, findings, `no_clone:${item.id}`, `${item.id} must forbid clone.`);
    expect(item.allowed_now?.install_dependencies === false, findings, `no_install:${item.id}`, `${item.id} must forbid install.`);
    expect(item.allowed_now?.download_models === false, findings, `no_download:${item.id}`, `${item.id} must forbid downloads.`);
    expect(item.allowed_now?.run_code === false, findings, `no_run:${item.id}`, `${item.id} must forbid running code.`);
    expect(item.allowed_now?.read_private_content === false, findings, `no_private:${item.id}`, `${item.id} must forbid private reads.`);
    expect(item.allowed_now?.promote_to_public === false, findings, `no_public:${item.id}`, `${item.id} must forbid public promotion.`);
    expect(!('content' in (item.readme || {})), findings, `no_content_field:${item.id}`, `${item.id} must not contain a README content field.`);
    expect(item.public_ready_after_item === 0, findings, `public_ready_zero:${item.id}`, `${item.id} must keep public-ready at 0.`);
  }
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub README Signal Scan Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Scan status: ${report.summary.scan_status}`);
  lines.push(`- Scanned items: ${report.summary.scanned_items}`);
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
