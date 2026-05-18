#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const publicDisplayStatuses = new Set(['own_work', 'public_domain', 'licensed']);
const linkOnlyStatuses = new Set(['needs_permission', 'unknown']);

const sourceRegistry = [
  {
    name: 'Wikimedia Commons',
    url: 'https://commons.wikimedia.org/',
    use: 'Images, drawings and scans with per-file licenses such as CC0, public domain, CC BY or CC BY-SA.',
    policy: 'Check every file page and store author, license, source URL and attribution before public display.'
  },
  {
    name: 'Europeana',
    url: 'https://www.europeana.eu/',
    use: 'European cultural heritage metadata and media with rights statements.',
    policy: 'Use the rights field; public display only when the record is public domain or clearly reusable.'
  },
  {
    name: 'Library of Congress',
    url: 'https://www.loc.gov/',
    use: 'Historic photographs, maps, drawings and documents with rights advisories.',
    policy: 'Prefer records marked no known restrictions or public domain; keep uncertain records as links.'
  },
  {
    name: 'Rijksmuseum',
    url: 'https://www.rijksmuseum.nl/',
    use: 'Open collection images and metadata, useful for historical art/architecture references.',
    policy: 'Use only records with open/public image rights and store attribution metadata.'
  },
  {
    name: 'Internet Archive / Open Library',
    url: 'https://archive.org/',
    use: 'Books and scans for research/source trails.',
    policy: 'Do not republish protected scans; use links and structured notes unless rights are open.'
  },
  {
    name: 'Official institution pages',
    url: 'https://www.villa-savoye.fr/',
    use: 'Primary source trail and factual verification.',
    policy: 'Treat images/plans as link-only unless the page grants a reusable license.'
  }
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const slug = args.entry || args.slug;
  if (!slug) throw new Error('Usage: npm run archive:rights-gate -- --entry villa-savoye');

  const captureRoot = path.join(root, 'out/archive-captures', slug);
  const assetPath = path.join(captureRoot, 'asset-candidates.json');
  const sourcePath = path.join(captureRoot, 'source-candidates.json');
  const fallbackEntry = await loadEntry(slug);

  const assetCandidates = existsSync(assetPath)
    ? JSON.parse(await readFile(assetPath, 'utf8'))
    : (fallbackEntry?.asset_candidates ?? []);
  const sourceCandidates = existsSync(sourcePath)
    ? JSON.parse(await readFile(sourcePath, 'utf8'))
    : (fallbackEntry?.source_candidates ?? []);

  const rows = assetCandidates.map((asset) => classifyAsset(asset));
  const sources = sourceCandidates.map((source) => classifySource(source));
  const summary = {
    assets: rows.length,
    public_display: rows.filter((row) => row.decision === 'public_display').length,
    link_only: rows.filter((row) => row.decision === 'link_only').length,
    private_review: rows.filter((row) => row.decision === 'private_review').length,
    blocked_upload: rows.filter((row) => row.decision === 'blocked_upload').length,
    sources: sources.length,
    reusable_sources: sources.filter((source) => source.decision === 'source_trail_reusable').length,
    link_only_sources: sources.filter((source) => source.decision === 'link_only_source').length
  };

  const report = {
    generated_at: new Date().toISOString(),
    upload_allowed: false,
    slug,
    title: fallbackEntry?.title ?? slug,
    rule: 'Only own_work, public_domain and explicitly licensed assets may be publicly displayed. Unclear assets stay as source links and private metadata.',
    summary,
    assets: rows,
    sources,
    recommended_public_source_registry: sourceRegistry,
    safe_publication_policy: [
      'Create the entry even when all visual assets are blocked.',
      'Show own_work, public_domain and licensed assets only after attribution metadata is present.',
      'For Afasia, books, magazines and protected architecture websites: store title, author, URL, page reference and notes; do not republish images or scans without permission.',
      'Use generated placeholders or own diagrammatic reconstructions when visual rights are unclear.',
      'For Gaussian splats, use own or explicitly licensed video/photo frames.'
    ]
  };

  const outputRoot = path.join(root, 'out/archive-rights', slug);
  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, 'rights-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outputRoot, 'rights-report.md'), markdownReport(report), 'utf8');

  console.log('Architecture Cosmos rights gate');
  console.log(`Entry: ${report.title} (${slug})`);
  console.log(`Assets: ${summary.assets}`);
  console.log(`Public display: ${summary.public_display}`);
  console.log(`Link only: ${summary.link_only}`);
  console.log(`Private review: ${summary.private_review}`);
  console.log(`Blocked upload: ${summary.blocked_upload}`);
  console.log(`Report: ${path.relative(root, path.join(outputRoot, 'rights-report.json'))}`);
  console.log('Upload mode: RIGHTS REPORT ONLY. No file was uploaded or published.');
}

async function loadEntry(slug) {
  const entriesPath = path.join(root, 'data/mock-entries.json');
  if (!existsSync(entriesPath)) return null;
  const entries = JSON.parse(await readFile(entriesPath, 'utf8'));
  return entries.find((entry) => entry.slug === slug || entry.id === slug) ?? null;
}

function classifyAsset(asset) {
  const status = asset.rights_status ?? asset.copyright_status ?? 'unknown';
  const localPath = asset.local_path ?? asset.source_path ?? '';
  const sourceUrl = asset.source_url ?? asset.url ?? '';
  const hasAttribution = Boolean(asset.credit || asset.source_url || asset.url || asset.title);
  let decision = 'private_review';
  let public_display_allowed = false;
  let reason = 'Rights are not clear enough for public display.';

  if (status === 'own_work') {
    decision = 'public_display';
    public_display_allowed = true;
    reason = 'Own work may be displayed.';
  } else if (status === 'public_domain' && hasAttribution) {
    decision = 'public_display';
    public_display_allowed = true;
    reason = 'Public domain asset may be displayed when source metadata is retained.';
  } else if (status === 'licensed' && (asset.credit || asset.source_url || asset.license_url)) {
    decision = 'public_display';
    public_display_allowed = true;
    reason = 'Licensed asset may be displayed because credit/source/license metadata is present.';
  } else if (status === 'licensed') {
    decision = 'private_review';
    reason = 'Bulk licensed status needs file-level credit/source/license metadata before public display.';
  } else if (linkOnlyStatuses.has(status)) {
    decision = 'link_only';
    reason = 'Keep as metadata/source link; do not display the file publicly.';
  }

  if (asset.public_display_allowed === false || status === 'needs_permission') {
    public_display_allowed = false;
    decision = 'link_only';
  }

  if (!localPath && !sourceUrl) {
    decision = 'private_review';
    public_display_allowed = false;
    reason = 'No local path or source URL found; keep for review only.';
  }

  return {
    title: asset.title ?? asset.original_name ?? 'Untitled asset',
    kind: asset.kind ?? asset.slot ?? 'unknown',
    media_slot: asset.media_slot ?? asset.slot ?? null,
    rights_status: status,
    local_path: localPath || null,
    source_url: sourceUrl || null,
    planned_r2_key: asset.planned_r2_key ?? null,
    decision,
    public_display_allowed,
    reason
  };
}

function classifySource(source) {
  const status = source.rights_status ?? 'unknown';
  const reusable = publicDisplayStatuses.has(status);
  return {
    title: source.title ?? source.url ?? 'Untitled source',
    source_type: source.source_type ?? 'other',
    url: source.url ?? null,
    local_path: source.local_path ?? null,
    rights_status: status,
    reliability_level: source.reliability_level ?? 'unverified',
    decision: reusable ? 'source_trail_reusable' : 'link_only_source',
    note: reusable
      ? 'Source may be used in the source trail; each contained asset still needs file-level media review.'
      : 'Use as citation/link/metadata; do not republish protected media from this source.'
  };
}

function markdownReport(report) {
  return `# ${report.title} / Rights Gate

## Summary
- Assets: ${report.summary.assets}
- Public display: ${report.summary.public_display}
- Link only: ${report.summary.link_only}
- Private review: ${report.summary.private_review}
- Blocked upload: ${report.summary.blocked_upload}
- Sources: ${report.summary.sources}

## Rule
${report.rule}

## Asset Decisions
${report.assets.map((asset) => `- ${asset.decision}: ${asset.title} (${asset.rights_status}) - ${asset.reason}`).join('\n') || '- No assets.'}

## Source Decisions
${report.sources.map((source) => `- ${source.decision}: ${source.title} (${source.rights_status})`).join('\n') || '- No sources.'}

## Safe Policy
${report.safe_publication_policy.map((item) => `- ${item}`).join('\n')}
`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : true;
    if (next && !next.startsWith('--')) index += 1;
  }
  return parsed;
}
