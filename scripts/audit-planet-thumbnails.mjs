#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'out');
const REPORT_PATH = path.join(OUT_DIR, 'planet-thumbnail-audit.json');
const blockedLicenses = new Set(['all_rights_reserved', 'needs_permission', 'private_research', 'personal_only', 'unknown']);

const entries = JSON.parse(await readFile(path.join(ROOT, 'data/mock-entries.json'), 'utf8'));
const componentSource = await readFile(path.join(ROOT, 'components/atlas/SemanticEntryNode.tsx'), 'utf8');

const rows = entries.map((entry) => {
  const media = primaryPublicMedia(entry);
  return {
    id: entry.id,
    title: entry.title,
    style_sector: entry.style_sector,
    thumbnail_url: media?.url ?? null,
    media_type: media?.type ?? null,
    license: media?.license ?? null
  };
});

const withThumbnail = rows.filter((row) => row.thumbnail_url);
const missing = rows.filter((row) => !row.thumbnail_url);
const duplicateUrls = duplicateValues(withThumbnail.map((row) => row.thumbnail_url));
const componentChecks = [
  {
    label: 'SemanticEntryNode imports primaryPublicMediaUrl',
    passed: componentSource.includes("import { primaryPublicMediaUrl } from '@/lib/media'")
  },
  {
    label: 'EntryThumbnail renders SVG image elements',
    passed: componentSource.includes('<image') && componentSource.includes('href={imageUrl}')
  },
  {
    label: 'Planet thumbnails use a circular clipPath',
    passed: componentSource.includes('<clipPath id={clipId}>') && componentSource.includes('clipPath={`url(#${clipId})`}')
  },
  {
    label: 'Image planets preserve the style accent ring',
    passed: componentSource.includes('stroke={accent}') && componentSource.includes('entry-planet-shade')
  }
];

const report = {
  generated_at: new Date().toISOString(),
  entries: entries.length,
  planet_thumbnails: withThumbnail.length,
  coverage_percent: round((withThumbnail.length / entries.length) * 100),
  duplicate_thumbnail_urls: duplicateUrls,
  component_checks: componentChecks,
  missing_thumbnails: missing.map(({ id, title }) => ({ id, title })),
  sample_thumbnails: withThumbnail.slice(0, 16)
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log('Architecture Cosmos planet thumbnail audit');
console.log(`Planet thumbnails: ${report.planet_thumbnails}/${report.entries} (${report.coverage_percent}%)`);
console.log(`Duplicate thumbnail URLs: ${duplicateUrls.length}`);
console.log(`Component checks: ${componentChecks.filter((check) => check.passed).length}/${componentChecks.length}`);
console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);

if (duplicateUrls.length || componentChecks.some((check) => !check.passed)) {
  process.exit(1);
}

function primaryPublicMedia(entry) {
  return entry.media.find((media) => media.type === 'exterior' && isPublicDisplayMedia(media))
    ?? entry.media.find((media) => isPublicDisplayMedia(media))
    ?? null;
}

function isPublicDisplayMedia(media) {
  return Boolean(media?.url && !blockedLicenses.has(String(media.license ?? '')));
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.filter(Boolean).forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
}

function round(value) {
  return Math.round(value * 10) / 10;
}
