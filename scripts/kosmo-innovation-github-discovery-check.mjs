#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const discoveryPath = resolve(root, args.discovery || `data/kosmo-innovation-github-discovery-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-discovery-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-discovery-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const discovery = JSON.parse(await readFile(discoveryPath, 'utf8'));
  const findings = checkDiscovery(discovery);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_github_discovery_guard_passed' : 'innovation_github_discovery_guard_failed',
    policy: {
      validates_discovery_only: true,
      reads_private_content: false,
      installs_or_downloads: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, discoveryPath)],
    summary: {
      discovery_status: discovery.status,
      queries: discovery.summary?.queries ?? null,
      lanes_with_results: discovery.summary?.lanes_with_results ?? null,
      candidates: discovery.summary?.unique_candidates ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub discovery check');
  console.log(`Status: ${report.status}`);
  console.log(`Queries: ${report.summary.queries}`);
  console.log(`Candidates: ${report.summary.candidates}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkDiscovery(discovery) {
  const findings = [];
  expect(discovery.schema_version === '0.1', findings, 'schema_version', 'Discovery schema_version must be 0.1.');
  expect(discovery.status === 'innovation_github_discovery_ready', findings, 'discovery_ready', 'Discovery must be ready.');
  expect(discovery.policy?.discovery_only === true, findings, 'discovery_only', 'Discovery must be discovery-only.');
  expect(discovery.policy?.installs_dependencies_now === false, findings, 'no_installs', 'Discovery must not install dependencies.');
  expect(discovery.policy?.downloads_models_now === false, findings, 'no_downloads', 'Discovery must not download models.');
  expect(discovery.policy?.runs_tools_now === false, findings, 'no_tool_runs', 'Discovery must not run discovered tools.');
  expect(discovery.policy?.reads_private_content === false, findings, 'no_private_reads', 'Discovery must not read private content.');
  expect(discovery.policy?.public_ready_after_discovery === 0, findings, 'public_ready_zero', 'Discovery must keep public-ready at 0.');
  expect((discovery.searches || []).length >= 10, findings, 'query_count', 'Discovery must include at least ten search queries.');
  expect(Number.isInteger(discovery.summary?.queries_with_results), findings, 'queries_with_results_count', 'Discovery must report queries with results.');
  expect(Number.isInteger(discovery.summary?.lanes_with_results), findings, 'lanes_with_results_count', 'Discovery must report lanes with results.');
  ['bim_rag_workers', 'ifc_reasoning', 'kosmo_prepare', 'kosmo_asset', 'worker_integration'].forEach((lane) => {
    expect((discovery.searches || []).some((search) => search.lane === lane), findings, `lane_query:${lane}`, `Discovery must include a query for ${lane}.`);
  });
  for (const candidate of discovery.candidates || []) {
    expect(candidate.source_type === 'primary_github_repository', findings, `primary_source:${candidate.repo}`, `${candidate.repo} must be a primary GitHub repository.`);
    expect(/^https:\/\/github\.com\//.test(candidate.url), findings, `github_url:${candidate.repo}`, `${candidate.repo} must use a GitHub URL.`);
    expect(candidate.install_or_download_now === false, findings, `no_execute:${candidate.repo}`, `${candidate.repo} must not install/download now.`);
    expect(candidate.private_content_allowed === false, findings, `no_private:${candidate.repo}`, `${candidate.repo} must not allow private content.`);
    expect(candidate.public_ready_after_candidate === 0, findings, `public_ready_zero:${candidate.repo}`, `${candidate.repo} must keep public-ready at 0.`);
  }
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Discovery Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Discovery status: ${report.summary.discovery_status}`);
  lines.push(`- Queries: ${report.summary.queries}`);
  lines.push(`- Lanes with results: ${report.summary.lanes_with_results}`);
  lines.push(`- Candidates: ${report.summary.candidates}`);
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
