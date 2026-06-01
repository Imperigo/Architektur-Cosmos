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
    missingHero.push(missingHeroReviewItem(entry));
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
  missing_hero_review: missingHero,
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
console.log(`Missing hero review priority: ${prioritySummary(missingHero)}`);
console.log(`Duplicate hero URLs: ${duplicateHeroUrls.length}`);
console.log(`Blocked/unknown public licenses: ${blockedLicense.length}`);
console.log(`Missing attribution/source: ${missingAttribution.length}`);
console.log(`Wrote ${path.relative(ROOT, REPORT_PATH)}`);

if (duplicateHeroUrls.length > 0 || blockedLicense.length > 0 || missingAttribution.length > 0) {
  process.exitCode = 1;
}

function missingHeroReviewItem(entry) {
  const sourceText = [
    ...(entry.source_documents ?? []),
    ...(entry.lecture_cluster ?? []),
    ...(entry.themes ?? [])
  ].join(' ').toLowerCase();
  const isPrivateOrCopyrightSensitive = /(afasia|private_research|book|buch|magazine|baunetz|swiss-architects|boltshauser|copyright)/.test(sourceText);
  const isTheoryOrText = ['text', 'theory'].includes(entry.entry_type);
  const isMapOrPlan = ['map', 'urban_plan'].includes(entry.entry_type);
  const likelyPublicDomain = Number(entry.year_start) <= 1928;
  const hasInstitutionalLead = /(unesco|monument|museum|library|archive|eth|global_urban_design|urban_history|theory_history)/.test(sourceText);

  let reviewPriority = 'p2_manual_rights_review';
  let recommendation = 'Find a project-specific public-safe image, then add url, source_url, credit and license.';

  if (isPrivateOrCopyrightSensitive) {
    reviewPriority = 'p3_private_or_link_only';
    recommendation = 'Keep media link-only until owner permission, own work or a clearly licensed source exists.';
  } else if (likelyPublicDomain && (isTheoryOrText || isMapOrPlan || hasInstitutionalLead)) {
    reviewPriority = 'p1_public_domain_candidate';
    recommendation = 'Search public-domain or institution-hosted scans/images first; use only with clear attribution and license.';
  } else if (hasInstitutionalLead) {
    reviewPriority = 'p1_institutional_source_candidate';
    recommendation = 'Search official institutional/project sources first; prefer open-license or own/generated media.';
  }

  return {
    id: entry.id,
    title: entry.title,
    year_start: entry.year_start,
    entry_type: entry.entry_type,
    style_sector: entry.style_sector,
    review_priority: reviewPriority,
    recommendation
  };
}

function prioritySummary(items) {
  const counts = items.reduce((acc, item) => {
    acc[item.review_priority] = (acc[item.review_priority] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([priority, count]) => `${priority}=${count}`)
    .join(', ');
}
