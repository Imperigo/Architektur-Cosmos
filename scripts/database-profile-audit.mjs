#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'out', 'database-profile-audit');
const REPORT_PATH = path.join(OUT_DIR, 'profile-audit.json');
const MD_PATH = path.join(OUT_DIR, 'profile-audit.md');

const entries = JSON.parse(await readFile(path.join(ROOT, 'data/mock-entries.json'), 'utf8'));

const report = buildReport(entries);
await mkdir(OUT_DIR, { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(MD_PATH, renderMarkdown(report));

console.log('Architecture Cosmos database profile audit');
console.log(`Entries: ${report.summary.entries}`);
console.log(`Profiles: ${report.summary.profiled} (${report.summary.profile_coverage_percent}%)`);
console.log(`Suggested next batch: ${report.next_batch.map((entry) => entry.id).join(', ')}`);
console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);

function buildReport(items) {
  const profiled = items.filter((entry) => entry.database_profile);
  const missing = items.filter((entry) => !entry.database_profile).map(scoreEntry).sort((a, b) => b.score - a.score || b.source_count - a.source_count || a.year_start - b.year_start);
  const rightsBlocked = items.filter((entry) => hasRightsBlocked(entry)).map((entry) => ({ id: entry.id, title: entry.title }));

  return {
    generated_at: new Date().toISOString(),
    summary: {
      entries: items.length,
      profiled: profiled.length,
      missing: missing.length,
      profile_coverage_percent: round((profiled.length / items.length) * 100),
      rights_blocked_or_private: rightsBlocked.length
    },
    next_batch: missing.slice(0, 12),
    rights_blocked: rightsBlocked,
    missing_profiles: missing
  };
}

function scoreEntry(entry) {
  const sourceCount = sourceCountFor(entry);
  const mediaWithPublicUrl = (entry.media ?? []).filter((media) => Boolean(media.url) && ['public_domain', 'cc_by', 'cc_by_sa', 'own_work'].includes(media.license)).length;
  const analysisCount = entry.analysis_layers?.length ?? 0;
  const modelCount = modelCountFor(entry);
  const hasHero = mediaWithPublicUrl > 0;
  const isPilotType = ['building', 'landscape_project', 'urban_plan', 'infrastructure'].includes(entry.entry_type);
  const rightsPenalty = hasRightsBlocked(entry) ? 8 : 0;
  const score = sourceCount * 7 + mediaWithPublicUrl * 4 + analysisCount * 5 + modelCount * 4 + (hasHero ? 8 : 0) + (isPilotType ? 4 : 0) - rightsPenalty;

  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    year_start: entry.year_start,
    entry_type: entry.entry_type,
    style_sector: entry.style_sector,
    score,
    source_count: sourceCount,
    public_media_count: mediaWithPublicUrl,
    analysis_count: analysisCount,
    model_count: modelCount,
    has_public_hero: hasHero,
    rights_blocked: hasRightsBlocked(entry),
    suggested_profile: {
      status: sourceCount >= 3 && !hasRightsBlocked(entry) ? 'reviewed' : 'draft',
      r2_prefix: `entries/${entry.slug}`,
      source_count: sourceCount,
      media_count: entry.media?.length ?? 0,
      model_count: modelCount,
      analysis_count: analysisCount,
      tag_count: entry.database_tags?.length ?? entry.themes?.length ?? 0
    }
  };
}

function sourceCountFor(entry) {
  return [
    entry.source_url,
    ...(entry.source_documents ?? []),
    ...(entry.source_candidates ?? []),
    ...(entry.source_assets ?? [])
  ].filter(Boolean).length;
}

function modelCountFor(entry) {
  return [
    ...(entry.model_assets ?? []),
    ...(entry.model_3d?.parts ?? []),
    ...(entry.model_packages ?? []),
    ...(entry.splat_assets ?? [])
  ].filter(Boolean).length;
}

function hasRightsBlocked(entry) {
  const privateMedia = (entry.media ?? []).some((media) => media.license === 'personal_only' || media.license === 'all_rights_reserved');
  const privateAssets = (entry.asset_candidates ?? []).some((asset) => asset.rights_status === 'private_research' || asset.rights_status === 'needs_permission' || asset.public_display_allowed === false);
  const privateSources = (entry.source_candidates ?? []).some((source) => source.rights_status === 'private_research' || source.rights_status === 'needs_permission');
  return privateMedia || privateAssets || privateSources;
}

function renderMarkdown(report) {
  const lines = [
    '# Database Profile Audit',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Summary',
    '',
    `- Entries: ${report.summary.entries}`,
    `- Profiled: ${report.summary.profiled} (${report.summary.profile_coverage_percent}%)`,
    `- Missing profiles: ${report.summary.missing}`,
    `- Rights-blocked/private: ${report.summary.rights_blocked_or_private}`,
    '',
    '## Suggested Next Batch',
    ''
  ];

  report.next_batch.forEach((entry, index) => {
    lines.push(`${index + 1}. **${entry.title}** / \`${entry.id}\``);
    lines.push(`   - score ${entry.score}; sources ${entry.source_count}; public media ${entry.public_media_count}; analysis ${entry.analysis_count}; models ${entry.model_count}`);
    lines.push(`   - suggested status: \`${entry.suggested_profile.status}\``);
  });

  lines.push('', '## Rule', '');
  lines.push('Backfill profiles from high-score, public-safe entries first. Rights-blocked entries can receive metadata profiles, but public media/model display stays off until reviewed.');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function round(value) {
  return Math.round(value * 10) / 10;
}
