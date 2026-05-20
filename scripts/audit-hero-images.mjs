#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ENTRIES_PATH = path.join(ROOT, 'data/mock-entries.json');
const OUT_DIR = path.join(ROOT, 'out');
const REPORT_PATH = path.join(OUT_DIR, 'hero-image-audit.json');

const BLOCKED_LICENSES = new Set([
  '',
  'unknown',
  'needs_permission',
  'private_research',
  'private',
  'personal_only',
  'all_rights_reserved',
  'copyrighted'
]);

const entries = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf8'));
const heroByUrl = new Map();
const missingHero = [];
const blockedLicense = [];
const missingAttribution = [];

for (const entry of entries) {
  const hero = (entry.media ?? []).find((media) => media.type === 'exterior' && media.url);

  if (!hero) {
    missingHero.push({ id: entry.id, title: entry.title });
    continue;
  }

  const urlEntries = heroByUrl.get(hero.url) ?? [];
  urlEntries.push({ id: entry.id, title: entry.title });
  heroByUrl.set(hero.url, urlEntries);

  const license = String(hero.license ?? '').trim().toLowerCase();
  if (BLOCKED_LICENSES.has(license)) {
    blockedLicense.push({
      id: entry.id,
      title: entry.title,
      url: hero.url,
      license: hero.license ?? ''
    });
  }

  if (!hero.source_url || !hero.credit) {
    missingAttribution.push({
      id: entry.id,
      title: entry.title,
      url: hero.url,
      hasSourceUrl: Boolean(hero.source_url),
      hasCredit: Boolean(hero.credit)
    });
  }
}

const duplicateHeroUrls = [...heroByUrl.entries()]
  .filter(([, urlEntries]) => urlEntries.length > 1)
  .map(([url, urlEntries]) => ({ url, entries: urlEntries }));

const report = {
  generated_at: new Date().toISOString(),
  entries: entries.length,
  hero_images: heroByUrl.size,
  coverage_percent: Math.round((heroByUrl.size / entries.length) * 1000) / 10,
  missing_hero: missingHero,
  duplicate_hero_urls: duplicateHeroUrls,
  blocked_or_unknown_licenses: blockedLicense,
  missing_attribution: missingAttribution
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log('Architecture Cosmos hero image audit');
console.log(`Entries: ${report.entries}`);
console.log(`Hero images: ${report.hero_images} (${report.coverage_percent}%)`);
console.log(`Missing hero images: ${missingHero.length}`);
console.log(`Duplicate hero URLs: ${duplicateHeroUrls.length}`);
console.log(`Blocked/unknown public licenses: ${blockedLicense.length}`);
console.log(`Missing attribution/source: ${missingAttribution.length}`);
console.log(`Wrote ${path.relative(ROOT, REPORT_PATH)}`);

if (duplicateHeroUrls.length > 0 || blockedLicense.length > 0 || missingAttribution.length > 0) {
  process.exitCode = 1;
}
