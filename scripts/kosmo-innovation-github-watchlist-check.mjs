#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const watchlistPath = resolve(root, args.watchlist || `data/kosmo-innovation-github-watchlist-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-watchlist-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-watchlist-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const watchlist = JSON.parse(await readFile(watchlistPath, 'utf8'));
  const findings = checkWatchlist(watchlist);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_github_watchlist_guard_passed' : 'innovation_github_watchlist_guard_failed',
    policy: {
      validates_watchlist_only: true,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, watchlistPath)],
    summary: {
      watchlist_status: watchlist.status,
      candidates: watchlist.candidates?.length ?? null,
      live_probe_succeeded: watchlist.summary?.live_probe_succeeded ?? null,
      live_probe_fallback: watchlist.summary?.live_probe_fallback ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub watchlist check');
  console.log(`Status: ${report.status}`);
  console.log(`Candidates: ${report.summary.candidates}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkWatchlist(watchlist) {
  const findings = [];
  expect(watchlist.schema_version === '0.1', findings, 'schema_version', 'Watchlist schema_version must be 0.1.');
  expect(watchlist.status === 'innovation_github_watchlist_ready', findings, 'watchlist_ready', 'Watchlist must be ready.');
  expect(watchlist.policy?.watchlist_only === true, findings, 'watchlist_only', 'Watchlist must be watchlist-only.');
  expect(watchlist.policy?.installs_dependencies_now === false, findings, 'no_installs', 'Watchlist must not install dependencies.');
  expect(watchlist.policy?.downloads_models_now === false, findings, 'no_downloads', 'Watchlist must not download models.');
  expect(watchlist.policy?.runs_tools_now === false, findings, 'no_tool_runs', 'Watchlist must not run tools.');
  expect(watchlist.policy?.reads_private_content === false, findings, 'no_private_reads', 'Watchlist must not read private content.');
  expect(watchlist.policy?.public_ready_after_watchlist === 0, findings, 'public_ready_zero', 'Watchlist must keep public-ready at 0.');
  expect(watchlist.live_probe?.attempted === true, findings, 'live_probe_attempted', 'Watchlist must attempt live GitHub metadata probes.');
  expect(Number.isInteger(watchlist.summary?.live_probe_succeeded), findings, 'live_probe_succeeded_count', 'Watchlist must report live probe success count.');
  expect(Number.isInteger(watchlist.summary?.live_probe_fallback), findings, 'live_probe_fallback_count', 'Watchlist must report live probe fallback count.');
  expect((watchlist.candidates || []).length >= 7, findings, 'candidate_count', 'Watchlist must include at least seven candidates.');
  ['microsoft/markitdown', 'docling-project/docling', 'IfcOpenShell/IfcOpenShell', 'QwenLM/Qwen3-Embedding'].forEach((repo) => {
    expect((watchlist.candidates || []).some((item) => item.repo === repo), findings, `required_repo:${repo}`, `Watchlist must include ${repo}.`);
  });
  for (const item of watchlist.candidates || []) {
    expect(item.source_type === 'primary_github_repository', findings, `primary_source:${item.repo}`, `${item.repo} must be a primary GitHub source.`);
    expect(['live_gh_repo_view', 'static_seed_fallback'].includes(item.source_observation), findings, `source_observation:${item.repo}`, `${item.repo} must declare live or fallback observation.`);
    expect(/^https:\/\/github\.com\//.test(item.url), findings, `github_url:${item.repo}`, `${item.repo} must use a GitHub URL.`);
    expect(item.install_or_download_now === false, findings, `no_execute:${item.repo}`, `${item.repo} must not install/download now.`);
    expect(item.private_content_allowed === false, findings, `no_private:${item.repo}`, `${item.repo} must not allow private content.`);
    expect(item.public_ready_after_candidate === 0, findings, `public_ready_zero:${item.repo}`, `${item.repo} must keep public-ready at 0.`);
  }
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Watchlist Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Watchlist status: ${report.summary.watchlist_status}`);
  lines.push(`- Candidates: ${report.summary.candidates}`);
  lines.push(`- Live probe succeeded: ${report.summary.live_probe_succeeded}`);
  lines.push(`- Live probe fallback: ${report.summary.live_probe_fallback}`);
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
