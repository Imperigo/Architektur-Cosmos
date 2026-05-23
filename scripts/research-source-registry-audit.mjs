#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = resolve(rootDir, 'data/research-source-registry.json');
const outputDir = resolve(rootDir, 'out/research-source-registry');

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  const report = auditRegistry(registry);
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'source-registry-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDir, 'source-registry-audit.md'), renderMarkdown(report), 'utf8');

  console.log('Architecture Cosmos research source registry audit');
  console.log(`Sources: ${report.summary.sources}`);
  console.log(`Agents: ${Object.entries(report.summary.by_agent).map(([agent, count]) => `${agent}=${count}`).join(', ')}`);
  console.log(`Automation-ready: ${report.summary.automation_ready}`);
  console.log(`Warnings: ${report.warnings.length}`);
  console.log('Report: out/research-source-registry/source-registry-audit.md');

  if (report.errors.length > 0) {
    for (const error of report.errors) console.error(`ERROR: ${error}`);
    process.exitCode = 1;
  }
}

function auditRegistry(registry) {
  const sources = registry.sources ?? [];
  const ids = new Set();
  const duplicateIds = new Set();
  const byAgent = countBy(sources, (source) => source.agent ?? 'unknown');
  const byReliability = countBy(sources, (source) => source.reliability ?? 'unknown');
  const byRightsMode = countBy(sources, (source) => source.rights_mode ?? 'unknown');
  const byAutomationMode = countBy(sources, (source) => source.automation_mode ?? 'unknown');
  const byBookmarkOrigin = countBy(sources, (source) => source.bookmark_origin ?? 'unknown');
  const publicCandidateSources = sources.filter((source) => isPublicCandidate(source));
  const privateOnlySources = sources.filter((source) => isPrivateOnly(source));
  const automationReadySources = sources.filter((source) => /query|api/i.test(source.automation_mode ?? ''));
  const primarySources = sources.filter((source) => source.reliability === 'primary' || source.reliability === 'high');
  const errors = [];
  const warnings = [];

  for (const source of sources) {
    if (!source.id) errors.push('Source without id.');
    if (ids.has(source.id)) duplicateIds.add(source.id);
    ids.add(source.id);

    if (!source.url || !/^https:\/\//.test(source.url)) {
      warnings.push(`${source.id}: source URL should use https.`);
    }

    if (/mail\.google\.com|token=|localhost|127\.0\.0\.1/i.test(source.url ?? '')) {
      errors.push(`${source.id}: unsafe or private URL detected.`);
    }

    if (!source.notes || source.notes.length < 24) {
      warnings.push(`${source.id}: notes are too thin for reliable Brain use.`);
    }

    if (source.bookmark_origin === 'opera' && source.automation_mode?.includes('api')) {
      warnings.push(`${source.id}: Opera-discovered source should not be API-enabled without manual review.`);
    }

    if (source.source_type === 'social_media_hint' && source.automation_mode !== 'manual_hint_only') {
      warnings.push(`${source.id}: social media must remain manual hint only.`);
    }
  }

  for (const duplicateId of duplicateIds) {
    errors.push(`Duplicate source id: ${duplicateId}`);
  }

  for (const agent of registry.agents ?? []) {
    if (!byAgent[agent.id]) {
      warnings.push(`Agent ${agent.id} has no source entries.`);
    }
  }

  return {
    generated_at: new Date().toISOString(),
    mode: 'local_review_only',
    writes_database: false,
    summary: {
      sources: sources.length,
      agents: (registry.agents ?? []).length,
      by_agent: byAgent,
      by_reliability: byReliability,
      by_rights_mode: byRightsMode,
      by_automation_mode: byAutomationMode,
      by_bookmark_origin: byBookmarkOrigin,
      automation_ready: automationReadySources.length,
      public_candidate_sources: publicCandidateSources.length,
      private_or_link_only_sources: privateOnlySources.length,
      primary_or_high_reliability_sources: primarySources.length
    },
    policy: registry.policy,
    recommended_next_actions: nextActions({ sources, automationReadySources, privateOnlySources, primarySources }),
    warnings,
    errors,
    source_cards: sources.map(sourceCard)
  };
}

function sourceCard(source) {
  return {
    id: source.id,
    name: source.name,
    agent: source.agent,
    source_type: source.source_type,
    reliability: source.reliability,
    rights_mode: source.rights_mode,
    automation_mode: source.automation_mode,
    bookmark_origin: source.bookmark_origin,
    public_display_default: isPublicCandidate(source) ? 'possible_after_file_review' : 'no',
    brain_role: brainRole(source),
    url: source.url
  };
}

function brainRole(source) {
  if (source.reliability === 'primary') return 'primary project fact source';
  if (source.source_type?.includes('material') || source.source_type?.includes('timber')) return 'material and structure taxonomy source';
  if (source.rights_mode?.includes('private') || source.rights_mode?.includes('subscription')) return 'private review source only';
  if (source.automation_mode?.includes('query')) return 'query-pack discovery source';
  if (source.automation_mode?.includes('api')) return 'future API candidate';
  return 'manual review source';
}

function nextActions({ sources, automationReadySources, privateOnlySources, primarySources }) {
  const currentSources = sources.filter((source) => source.agent === 'current').length;
  const historicalSources = sources.filter((source) => source.agent === 'historical').length;
  return [
    historicalSources < currentSources
      ? 'Add more historical archive, ETH and public-domain source families before broad historical imports.'
      : 'Historical source coverage is strong enough for the next pilot research packs.',
    primarySources.length < Math.ceil(sources.length * 0.25)
      ? 'Add more office/foundation/institution primary sources for current projects.'
      : 'Primary/high reliability coverage is acceptable for controlled pilot work.',
    automationReadySources.length > 0
      ? 'Use database:research packs first; do not write entries until rights and quality review pass.'
      : 'No automation-ready source exists yet; keep discovery manual.',
    privateOnlySources.length > 0
      ? 'Keep private/subscription sources local or link-only; never render their media publicly.'
      : 'No private-only source detected.'
  ];
}

function isPublicCandidate(source) {
  return /file_level|record_level|rights_statement|official_metadata|odbl/i.test(source.rights_mode ?? '');
}

function isPrivateOnly(source) {
  return /private|subscription|link_only|permission|no_scraping/i.test(source.rights_mode ?? '');
}

function countBy(items, keyFn) {
  return items.reduce((accumulator, item) => {
    const key = keyFn(item);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function renderMarkdown(report) {
  const lines = [
    '# Architecture Cosmos Source Registry Audit',
    '',
    `Generated: ${report.generated_at}`,
    `Mode: \`${report.mode}\``,
    `Writes database: \`${report.writes_database}\``,
    '',
    '## Summary',
    '',
    `- Sources: ${report.summary.sources}`,
    `- Agents: ${report.summary.agents}`,
    `- Automation-ready sources: ${report.summary.automation_ready}`,
    `- Public-candidate sources: ${report.summary.public_candidate_sources}`,
    `- Private/link-only sources: ${report.summary.private_or_link_only_sources}`,
    `- Primary/high-reliability sources: ${report.summary.primary_or_high_reliability_sources}`,
    '',
    '## Distribution',
    '',
    '### By Agent',
    ...renderCounts(report.summary.by_agent),
    '',
    '### By Reliability',
    ...renderCounts(report.summary.by_reliability),
    '',
    '### By Rights Mode',
    ...renderCounts(report.summary.by_rights_mode),
    '',
    '### By Automation Mode',
    ...renderCounts(report.summary.by_automation_mode),
    '',
    '## Recommended Next Actions',
    '',
    ...report.recommended_next_actions.map((action) => `- ${action}`),
    '',
    '## Warnings',
    '',
    ...(report.warnings.length ? report.warnings.map((warning) => `- ${warning}`) : ['- None.']),
    '',
    '## Errors',
    '',
    ...(report.errors.length ? report.errors.map((error) => `- ${error}`) : ['- None.']),
    '',
    '## Source Cards',
    ''
  ];

  for (const source of report.source_cards) {
    lines.push(
      `### ${source.name}`,
      '',
      `- ID: \`${source.id}\``,
      `- Agent: \`${source.agent}\``,
      `- Type: \`${source.source_type}\``,
      `- Reliability: \`${source.reliability}\``,
      `- Rights: \`${source.rights_mode}\``,
      `- Automation: \`${source.automation_mode}\``,
      `- Brain role: ${source.brain_role}`,
      `- Public display default: \`${source.public_display_default}\``,
      `- URL: ${source.url}`,
      ''
    );
  }

  return `${lines.join('\n')}\n`;
}

function renderCounts(counts) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => `- \`${key}\`: ${value}`);
}
