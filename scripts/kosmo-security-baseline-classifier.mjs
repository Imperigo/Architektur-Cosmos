#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path, { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-security-baseline-classifier-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-security-baseline-classifier-${dateStamp}.md`);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ignoredDirs = new Set(['.git', '.next', '.venv-kosmo-ifc', 'node_modules', 'out', 'archive-inbox', 'archive-intake']);
const textExtensions = new Set(['.css', '.csv', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.svg', '.ts', '.tsx', '.txt', '.xml', '.yml', '.yaml']);

const personalPatterns = [
  new RegExp(['and', 'rin'].join(''), 'i'),
  new RegExp(['bau', 'mann'].join(''), 'i'),
  new RegExp(`${['and', 'rin'].join('')}99`, 'i'),
  new RegExp(`${['and', 'rin'].join('')}\\.bau`, 'i'),
  new RegExp(`architekturkosmos\\.${['and', 'rin'].join('')}`, 'i'),
  new RegExp(`made by ${['and', 'rin'].join('')}`, 'i')
];

const secretPatterns = [
  { label: 'Cloudflare API token', pattern: /cf[a-z0-9]{2}_[a-z0-9_-]{30,}/i },
  { label: 'OpenAI-style key', pattern: /sk-[a-z0-9_-]{32,}/i },
  { label: 'GitHub token', pattern: /gh[pousr]_[a-z0-9_]{30,}/i },
  { label: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/ },
  { label: 'Private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ }
];

const rules = [
  rule('source_root_artifacts', ['data/kosmo-source-root-*', 'docs/codex/kosmo-source-root-*', 'examples/kosmo-references/provenance/source-root-*'], 'private_repo_allowed'),
  rule('onedrive_sync_artifacts', ['data/kosmo-onedrive-sync-error-summary-*', 'docs/codex/kosmo-onedrive-sync-error-summary-*'], 'private_repo_allowed'),
  rule('owner_review_artifacts', ['data/kosmo-owner-*', 'docs/codex/kosmo-owner-*'], 'private_repo_allowed'),
  rule('private_library_diagnostics', ['data/kosmoreferences-private-library-*', 'docs/codex/kosmoreferences-private-library-*'], 'private_repo_allowed'),
  rule('generated_orbit_reviews', ['examples/kosmo-orbit/review/*'], 'generated_review_allowed'),
  rule('local_context_scripts', ['scripts/kosmo-source-root-locator.mjs', 'scripts/kosmo-storage-mount-snapshot.mjs', 'scripts/kosmo-private-library-diagnostic.mjs', 'scripts/kosmo-onedrive-sync-error-summary.mjs'], 'script_context_allowed')
].map((item) => ({ ...item, regexes: item.path_globs.map(globToRegex) }));

const files = listTextFiles(repoRoot);
const personalMatches = [];
const secretMatches = [];

for (const file of files) {
  const lines = readFileSync(file.absolutePath, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (personalPatterns.some((pattern) => pattern.test(line))) {
      const classification = classify(file.relativePath);
      personalMatches.push({
        path: file.relativePath,
        line: index + 1,
        category: classification.category,
        rule: classification.rule
      });
    }
    for (const secret of secretPatterns) {
      if (secret.pattern.test(line)) {
        secretMatches.push({ path: file.relativePath, line: index + 1, label: secret.label, category: 'secret_never_allowed' });
      }
    }
  });
}

const byCategory = countBy(personalMatches, 'category');
const byRule = countBy(personalMatches, 'rule');
const topFiles = [...countByPath(personalMatches).entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([file, count]) => ({ file, count }));

const report = {
  schema_version: '0.1',
  generated_at: new Date().toISOString(),
  status: 'security_baseline_classifier_ready',
  policy: {
    classifier_only: true,
    suppresses_findings_now: false,
    modifies_security_check_now: false,
    secrets_never_allowed: true,
    redacts_identifier_values_in_output: true,
    public_ready_after_classifier: 0
  },
  summary: {
    files_scanned: files.length,
    personal_identifier_findings: personalMatches.length,
    secret_findings: secretMatches.length,
    unclassified_personal_findings: personalMatches.filter((item) => item.category === 'must_redact').length,
    public_ready_after_classifier: 0
  },
  category_counts: byCategory,
  rule_counts: byRule,
  top_files: topFiles,
  secret_summary: {
    count: secretMatches.length,
    labels: [...new Set(secretMatches.map((item) => item.label))]
  },
  next_actions: [
    'Review must_redact counts before enabling any suppression.',
    'Create config baseline only for reviewed private_repo_allowed/generated/script-context groups.',
    'Keep secret findings hard-failing regardless of baseline.'
  ]
};

await mkdir(dirname(outputJson), { recursive: true });
await mkdir(dirname(outputMd), { recursive: true });
await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(outputMd, renderMarkdown(report));

console.log('Kosmo security baseline classifier');
console.log(`Status: ${report.status}`);
console.log(`Personal findings: ${report.summary.personal_identifier_findings}`);
console.log(`Secret findings: ${report.summary.secret_findings}`);
console.log(`Unclassified personal findings: ${report.summary.unclassified_personal_findings}`);
console.log(`Wrote: ${relative(root, outputMd)}`);

function listTextFiles(directory) {
  const files = [];
  walk(directory);
  return files;

  function walk(currentDirectory) {
    for (const item of readdirSync(currentDirectory)) {
      if (ignoredDirs.has(item)) continue;
      const absolutePath = path.join(currentDirectory, item);
      const relativePath = path.relative(repoRoot, absolutePath);
      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      if (!stats.isFile() || stats.size > 1024 * 1024) continue;
      if (textExtensions.has(path.extname(item)) || item === 'SECURITY') files.push({ absolutePath, relativePath });
    }
  }
}

function classify(relativePath) {
  for (const item of rules) {
    if (item.regexes.some((regex) => regex.test(relativePath))) return { category: item.category, rule: item.id };
  }
  return { category: 'must_redact', rule: 'unclassified' };
}

function countBy(items, key) {
  return Object.fromEntries([...items.reduce((map, item) => map.set(item[key], (map.get(item[key]) || 0) + 1), new Map()).entries()].sort());
}

function countByPath(items) {
  return items.reduce((map, item) => map.set(item.path, (map.get(item.path) || 0) + 1), new Map());
}

function rule(id, pathGlobs, category) {
  return { id, path_globs: pathGlobs, category };
}

function globToRegex(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Security Baseline Classifier');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Files scanned: ${report.summary.files_scanned}`);
  lines.push(`- Personal identifier findings: ${report.summary.personal_identifier_findings}`);
  lines.push(`- Secret findings: ${report.summary.secret_findings}`);
  lines.push(`- Unclassified personal findings: ${report.summary.unclassified_personal_findings}`);
  lines.push(`- Public-ready after classifier: ${report.summary.public_ready_after_classifier}`);
  lines.push('');
  lines.push('## Category Counts');
  lines.push('');
  Object.entries(report.category_counts).forEach(([key, value]) => lines.push(`- \`${key}\`: ${value}`));
  lines.push('');
  lines.push('## Top Files By Count');
  lines.push('');
  report.top_files.forEach((item) => lines.push(`- \`${item.file}\`: ${item.count}`));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((item) => lines.push(`- ${item}`));
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
