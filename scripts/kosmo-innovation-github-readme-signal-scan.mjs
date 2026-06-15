#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const queuePath = resolve(root, args.queue || `data/kosmo-innovation-github-review-queue-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-readme-signal-scan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-readme-signal-scan-${dateStamp}.md`);

const keywordGroups = [
  group('document_processing', ['pdf', 'ocr', 'layout', 'table', 'markdown', 'document']),
  group('ifc_bim', ['ifc', 'ifcopenshell', 'bim', 'bonsai', 'blender']),
  group('worker_integration', ['mcp', 'agent', 'api', 'http', 'docker']),
  group('retrieval', ['retrieval', 'embedding', 'rag', 'vector', 'graph', 'similarity']),
  group('runtime_risk', ['install', 'pip', 'conda', 'cuda', 'gpu', 'download'])
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const queue = JSON.parse(await readFile(queuePath, 'utf8'));
  const scanned = [];
  for (const item of queue.review_items || []) {
    scanned.push(await scanItem(item));
  }

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'innovation_github_readme_signal_scan_ready',
    policy: {
      signal_scan_only: true,
      stores_raw_readme_content: false,
      stores_readme_snippets: false,
      clones_repositories_now: false,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_discovered_code_now: false,
      reads_private_content: false,
      public_ready_after_scan: 0
    },
    source_refs: [relative(root, queuePath)],
    summary: {
      queue_items: queue.summary?.review_items ?? null,
      scanned_items: scanned.length,
      readme_available: scanned.filter((item) => item.readme.available).length,
      license_known: scanned.filter((item) => item.repository.license_spdx).length,
      high_signal_items: scanned.filter((item) => item.signal_score >= 3).length,
      execute_now: 0,
      public_ready_after_scan: 0
    },
    scanned_items: scanned,
    next_safe_actions: [
      'Use high-signal items to draft source-free fixture contracts only.',
      'Do not clone, install, download, or run any repository from this scan.',
      'If a README suggests heavy runtime requirements, keep it as a risk note until an explicit install batch exists.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub README signal scan');
  console.log(`Status: ${report.status}`);
  console.log(`Scanned: ${report.summary.scanned_items}`);
  console.log(`README available: ${report.summary.readme_available}`);
  console.log(`Execute now: ${report.summary.execute_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function scanItem(item) {
  const repository = await repoMetadata(item.repo);
  const readme = await readmeMetadataAndContent(item.repo);
  const keyword_hits = readme.content
    ? Object.fromEntries(keywordGroups.map((keywordGroup) => [keywordGroup.id, hitsFor(readme.content, keywordGroup.keywords)]))
    : Object.fromEntries(keywordGroups.map((keywordGroup) => [keywordGroup.id, []]));
  const signalScore = Object.values(keyword_hits).filter((hits) => hits.length > 0).length;

  return {
    id: item.id,
    repo: item.repo,
    url: item.url,
    lane: item.lane,
    review_priority: item.review_priority,
    repository,
    readme: {
      available: readme.available,
      html_url: readme.html_url,
      path: readme.path,
      size_bytes: readme.size_bytes,
      raw_content_stored: false,
      snippets_stored: false
    },
    keyword_hits,
    signal_score: signalScore,
    recommended_review_depth: signalScore >= 3 ? 'public_readme_review_next' : 'metadata_only_for_now',
    allowed_now: {
      inspect_public_readme: true,
      create_source_free_fixture_contract: signalScore >= 3,
      clone_repository: false,
      install_dependencies: false,
      download_models: false,
      run_code: false,
      read_private_content: false,
      promote_to_public: false
    },
    public_ready_after_item: 0
  };
}

async function repoMetadata(repo) {
  try {
    const { stdout } = await execFileAsync('gh', [
      'repo',
      'view',
      repo,
      '--json',
      'description,homepageUrl,licenseInfo,nameWithOwner,repositoryTopics,stargazerCount,updatedAt'
    ], { cwd: root, timeout: 20000, maxBuffer: 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    return {
      name_with_owner: parsed.nameWithOwner,
      description: parsed.description || '',
      homepage_url: parsed.homepageUrl || null,
      license_spdx: parsed.licenseInfo?.spdxId || null,
      topics: (parsed.repositoryTopics || []).map((topic) => topic.name).slice(0, 12),
      stars_observed: parsed.stargazerCount,
      updated_at_observed: parsed.updatedAt
    };
  } catch (error) {
    return {
      name_with_owner: repo,
      description: '',
      homepage_url: null,
      license_spdx: null,
      topics: [],
      stars_observed: null,
      updated_at_observed: null,
      metadata_error: error.message.split('\n')[0]
    };
  }
}

async function readmeMetadataAndContent(repo) {
  try {
    const { stdout } = await execFileAsync('gh', [
      'api',
      `repos/${repo}/readme`,
      '--jq',
      '{html_url,path,size,content,encoding}'
    ], { cwd: root, timeout: 20000, maxBuffer: 3 * 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    const content = parsed.encoding === 'base64'
      ? Buffer.from(String(parsed.content || ''), 'base64').toString('utf8')
      : '';
    return {
      available: true,
      html_url: parsed.html_url || null,
      path: parsed.path || null,
      size_bytes: parsed.size || null,
      content
    };
  } catch (error) {
    return {
      available: false,
      html_url: null,
      path: null,
      size_bytes: null,
      content: '',
      readme_error: error.message.split('\n')[0]
    };
  }
}

function hitsFor(content, keywords) {
  const lower = content.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword));
}

function group(id, keywords) {
  return { id, keywords };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub README Signal Scan');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Queue items: ${report.summary.queue_items}`);
  lines.push(`- Scanned items: ${report.summary.scanned_items}`);
  lines.push(`- README available: ${report.summary.readme_available}`);
  lines.push(`- License known: ${report.summary.license_known}`);
  lines.push(`- High-signal items: ${report.summary.high_signal_items}`);
  lines.push(`- Execute now: ${report.summary.execute_now}`);
  lines.push(`- Public-ready after scan: ${report.summary.public_ready_after_scan}`);
  lines.push('');
  lines.push('## Scanned Items');
  lines.push('');
  lines.push('| Repo | Lane | Priority | README | License | Signal | Next |');
  lines.push('| --- | --- | --- | --- | --- | ---: | --- |');
  report.scanned_items.forEach((item) => {
    lines.push(`| [${item.repo}](${item.url}) | ${item.lane} | ${item.review_priority} | ${item.readme.available ? 'yes' : 'no'} | ${item.repository.license_spdx || '-'} | ${item.signal_score} | ${item.recommended_review_depth} |`);
  });
  lines.push('');
  lines.push('## Next Safe Actions');
  lines.push('');
  report.next_safe_actions.forEach((item) => lines.push(`- ${item}`));
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
