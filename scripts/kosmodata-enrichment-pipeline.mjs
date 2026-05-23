#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entriesPath = path.join(root, 'data/mock-entries.json');
const seedsPath = path.join(root, 'data/kosmodata-enrichment-seeds.json');
const outRoot = path.join(root, 'out/kosmodata-enrichment');
const mediaTypes = ['exterior', 'interior', 'section', 'plan'];
const publicMediaLicenses = new Set(['public_domain', 'cc0', 'cc_by', 'cc_by_sa', 'own_work', 'licensed']);
const allowedAnalysisTypes = new Set([
  'structure',
  'tectonics',
  'spatial_order',
  'material_system',
  'circulation',
  'typology',
  'urban_context',
  'landscape_system',
  'filter_classification',
  'source_reconstruction'
]);
const allowedModelTypes = new Set(['full_model', 'low_poly_model', 'structure_model', 'tectonic_model', 'site_model', 'mass_model']);
const allowedReviewStatus = new Set(['draft', 'reviewed', 'verified', 'needs_source']);

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const command = args._[0] || 'review';
  if (command === 'review') {
    await createReview();
    return;
  }
  if (command === 'promote') {
    await promoteReview();
    return;
  }
  throw new Error('Usage: npm run kosmodata:enrich -- --entry crystal-palace OR npm run kosmodata:promote -- --entry crystal-palace --confirm');
}

async function createReview() {
  const slug = args.entry || args.slug;
  if (!slug) throw new Error('Missing --entry {slug}');

  const entries = await readJson(entriesPath);
  const entry = entries.find((item) => item.slug === slug || item.id === slug);
  if (!entry) throw new Error(`No entry found for "${slug}".`);

  const seeds = await readJson(seedsPath, {});
  const seed = seeds.entries?.[entry.slug] || seeds.entries?.[entry.id] || null;
  const proposedEntry = buildProposedEntry(entry, seed);
  const review = buildReview({ entry, proposedEntry, seed });

  const reviewDir = path.join(outRoot, entry.slug);
  const intakeDir = path.join(root, 'archive-intake', entry.slug, 'enrichment');
  await Promise.all([reviewDir, intakeDir].map((directory) => mkdir(directory, { recursive: true })));

  await writeJson(path.join(reviewDir, 'enrichment-review.json'), review);
  await writeFile(path.join(reviewDir, 'enrichment-review.md'), renderReviewMarkdown(review), 'utf8');
  await writeJson(path.join(intakeDir, 'enrichment-review.json'), review);
  await writeJson(path.join(intakeDir, 'proposed-entry.json'), proposedEntry);

  console.log('KosmoData enrichment review');
  console.log(`Entry: ${entry.title} (${entry.slug})`);
  console.log(`Seed: ${seed ? 'found' : 'missing'}`);
  console.log(`Readiness: ${review.promotion.readiness}`);
  console.log(`Blockers: ${review.promotion.blockers.length}`);
  console.log('Wrote:');
  console.log(`- out/kosmodata-enrichment/${entry.slug}/enrichment-review.md`);
  console.log(`- archive-intake/${entry.slug}/enrichment/proposed-entry.json`);

  if (review.promotion.blockers.length) {
    console.log('');
    console.log('Promotion blocked until:');
    review.promotion.blockers.forEach((blocker) => console.log(`- ${blocker}`));
  }
}

async function promoteReview() {
  const slug = args.entry || args.slug;
  if (!slug) throw new Error('Missing --entry {slug}');
  if (!args.confirm) throw new Error('Promotion writes data/mock-entries.json. Re-run with --confirm after owner review.');

  const entries = await readJson(entriesPath);
  const index = entries.findIndex((item) => item.slug === slug || item.id === slug);
  if (index === -1) throw new Error(`No entry found for "${slug}".`);
  const entry = entries[index];

  const proposedPath = path.join(root, 'archive-intake', entry.slug, 'enrichment', 'proposed-entry.json');
  const proposedEntry = await readJson(proposedPath);
  const review = buildReview({ entry, proposedEntry, seed: { id: entry.slug, source: 'existing-review-pack' } });
  if (review.promotion.blockers.length) {
    throw new Error(`Promotion blocked:\n- ${review.promotion.blockers.join('\n- ')}`);
  }

  entries[index] = proposedEntry;
  await writeJson(entriesPath, entries);

  const promotion = {
    entry_id: entry.id,
    slug: entry.slug,
    promoted_at: new Date().toISOString(),
    writes_public_mock_data: true,
    uploads_assets: false,
    writes_d1_or_r2: false,
    source_review_required_before_publish: false,
    review_summary: review.promotion
  };
  const intakeDir = path.join(root, 'archive-intake', entry.slug, 'enrichment');
  await writeJson(path.join(intakeDir, 'promotion-report.json'), promotion);

  console.log('KosmoData enrichment promoted');
  console.log(`Entry: ${proposedEntry.title} (${proposedEntry.slug})`);
  console.log('Wrote: data/mock-entries.json');
  console.log(`Report: archive-intake/${entry.slug}/enrichment/promotion-report.json`);
}

function buildProposedEntry(entry, seed) {
  const patch = seed?.entry_patch || {};
  const proposed = deepMerge(entry, patch);
  proposed.id = entry.id;
  proposed.slug = entry.slug;
  proposed.media = normalizeMedia(proposed.media, entry.title);
  proposed.source_candidates = normalizeSources([
    ...(entry.source_url ? [{ source_type: 'source_url', title: `${entry.title} source URL`, url: entry.source_url, reliability_level: 'existing_entry_source', rights_status: 'link_only' }] : []),
    ...(entry.source_candidates || []),
    ...(patch.source_candidates || [])
  ]);
  proposed.database_profile = buildDatabaseProfile(proposed, seed);
  proposed.ingestion_status = {
    ...(entry.ingestion_status || {}),
    stage: 'needs_review',
    source_status: proposed.source_candidates.length >= 3 ? 'reviewed' : 'candidate',
    asset_status: heroIsPublicSafe(proposed) ? 'ready' : 'candidate',
    model_status: proposed.model_assets?.length ? 'planned' : 'none',
    updated_at: new Date().toISOString()
  };
  return proposed;
}

function buildDatabaseProfile(entry, seed) {
  const profile = entry.database_profile || {};
  return {
    status: seed ? 'reviewed' : 'draft',
    r2_prefix: profile.r2_prefix || `entries/${entry.slug}`,
    source_count: entry.source_candidates?.length || 0,
    media_count: entry.media?.length || 0,
    model_count: entry.model_assets?.length || 0,
    analysis_count: entry.analysis_layers?.length || 0,
    tag_count: entry.database_tags?.length || 0,
    rights_summary: profile.rights_summary || rightsSummary(entry),
    updated_at: new Date().toISOString()
  };
}

function buildReview({ entry, proposedEntry, seed }) {
  const validation = validateProposedEntry(proposedEntry);
  const rights = buildRightsReport(proposedEntry);
  const sourceTrail = proposedEntry.source_candidates || [];
  const changes = summarizeChanges(entry, proposedEntry);
  const blockers = [
    ...validation.errors,
    ...rights.blockers,
    ...(seed ? [] : ['No enrichment seed found. Create a source-backed seed before promoting.'])
  ];
  const warnings = [
    ...validation.warnings,
    ...rights.warnings,
    ...(sourceTrail.length < 3 ? ['Less than 3 source candidates; keep as draft unless manually reviewed.'] : [])
  ];

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    tool: 'kosmodata-enrichment-pipeline',
    mode: 'review_first',
    writes_public_database: false,
    uploads_assets: false,
    writes_d1_or_r2: false,
    entry: {
      id: entry.id,
      slug: entry.slug,
      before_title: entry.title,
      proposed_title: proposedEntry.title
    },
    source_trail: sourceTrail,
    changes,
    rights_report: rights,
    validation,
    promotion: {
      readiness: blockers.length ? 'blocked' : 'ready_for_owner_review',
      blockers,
      warnings,
      next_command: blockers.length ? null : `npm run kosmodata:promote -- --entry ${entry.slug} --confirm`
    },
    outputs: {
      proposed_entry: `archive-intake/${entry.slug}/enrichment/proposed-entry.json`,
      review_json: `out/kosmodata-enrichment/${entry.slug}/enrichment-review.json`,
      review_md: `out/kosmodata-enrichment/${entry.slug}/enrichment-review.md`
    }
  };
}

function validateProposedEntry(entry) {
  const errors = [];
  const warnings = [];
  ['id', 'slug', 'title', 'entry_type', 'style_sector', 'short_description', 'one_sentence', 'full_description', 'source_quality'].forEach((field) => {
    if (!entry[field]) errors.push(`Missing required field: ${field}`);
  });
  if (!Array.isArray(entry.authors) || !entry.authors.length) errors.push('authors must be a non-empty array');
  if (!Array.isArray(entry.themes) || entry.themes.length < 3) warnings.push('themes should include at least 3 filters');
  if (!Number.isFinite(entry.year_start)) errors.push('year_start must be a number');
  if (!Array.isArray(entry.media) || entry.media.length !== 4) errors.push('media must contain exactly 4 MVP slots');
  for (const type of mediaTypes) {
    if (!entry.media?.some((item) => item.type === type)) errors.push(`media missing ${type} slot`);
  }
  if (entry.media?.[0]?.url && !publicMediaLicenses.has(entry.media[0].license)) {
    errors.push(`hero media license is not public-safe: ${entry.media[0].license || 'missing'}`);
  }
  for (const [index, model] of (entry.model_assets || []).entries()) {
    if (!allowedModelTypes.has(model.model_type)) errors.push(`model_assets[${index}] invalid model_type "${model.model_type}"`);
    if (!allowedReviewStatus.has(model.review_status)) errors.push(`model_assets[${index}] invalid review_status "${model.review_status}"`);
    if (!model.r2_key) errors.push(`model_assets[${index}] missing r2_key`);
  }
  for (const [index, layer] of (entry.analysis_layers || []).entries()) {
    if (!allowedAnalysisTypes.has(layer.analysis_type)) errors.push(`analysis_layers[${index}] invalid analysis_type "${layer.analysis_type}"`);
    if (!layer.summary) errors.push(`analysis_layers[${index}] missing summary`);
    if (!allowedReviewStatus.has(layer.review_status)) errors.push(`analysis_layers[${index}] invalid review_status "${layer.review_status}"`);
  }
  if (!entry.architecture_text?.chapters || entry.architecture_text.chapters.length < 8) {
    warnings.push('architecture_text should contain the full Architecture Cosmos question framework');
  }
  if (!entry.database_profile) warnings.push('database_profile missing');
  return { passed: errors.length === 0, errors, warnings };
}

function buildRightsReport(entry) {
  const blockers = [];
  const warnings = [];
  const media = (entry.media || []).map((item) => {
    const public_display_allowed = !item.url || publicMediaLicenses.has(item.license);
    if (item.url && !public_display_allowed) blockers.push(`${item.type} media has blocked/unknown license: ${item.license || 'missing'}`);
    if (item.url && (!item.source_url || !item.credit)) warnings.push(`${item.type} media should include source_url and credit`);
    return {
      type: item.type,
      has_url: Boolean(item.url),
      license: item.license || 'none',
      public_display_allowed,
      source_url: item.source_url || null,
      credit: item.credit || null
    };
  });
  return {
    public_text_allowed: true,
    public_media_allowed: blockers.length === 0,
    media,
    blockers,
    warnings,
    note: rightsSummary(entry)
  };
}

function rightsSummary(entry) {
  const hero = entry.media?.[0];
  if (hero?.url && publicMediaLicenses.has(hero.license)) {
    return `Public text and metadata are allowed; hero media is public-safe with attribution (${hero.license}); exact plans, protected photos and models remain review-only until rights are cleared.`;
  }
  return 'Public text and metadata are allowed; visual assets remain link-only/private until rights are cleared.';
}

function summarizeChanges(before, after) {
  const keys = ['title', 'source_quality', 'themes', 'short_description', 'one_sentence', 'full_description', 'media', 'source_candidates', 'architecture_text', 'geo', 'materials', 'program', 'context', 'database_tags', 'model_assets', 'analysis_layers', 'database_profile'];
  return keys
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({
      field: key,
      before: summarizeValue(before[key]),
      after: summarizeValue(after[key])
    }));
}

function summarizeValue(value) {
  if (Array.isArray(value)) return `${value.length} items`;
  if (value && typeof value === 'object') return `${Object.keys(value).length} fields`;
  if (typeof value === 'string') return value.length > 120 ? `${value.slice(0, 117)}...` : value;
  return value ?? null;
}

function normalizeMedia(media, title) {
  const slots = new Map((media || []).map((item) => [item.type, item]));
  return mediaTypes.map((type) => ({
    type,
    label: slots.get(type)?.label || defaultMediaLabel(type),
    placeholder: slots.get(type)?.placeholder || `${defaultMediaLabel(type)} / ${title}`,
    ...slots.get(type)
  }));
}

function normalizeSources(sources) {
  const seen = new Set();
  return sources
    .filter(Boolean)
    .filter((source) => source.url || source.title)
    .map((source) => ({
      source_type: source.source_type || 'source',
      title: source.title || source.url,
      url: source.url,
      reliability_level: source.reliability_level || 'needs_review',
      rights_status: source.rights_status || 'link_only',
      notes: source.notes || ''
    }))
    .filter((source) => {
      const key = source.url || source.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function heroIsPublicSafe(entry) {
  const hero = entry.media?.find((item) => item.type === 'exterior');
  return Boolean(hero?.url && publicMediaLicenses.has(hero.license));
}

function renderReviewMarkdown(review) {
  const lines = [
    `# ${review.entry.proposed_title} / KosmoData Enrichment Review`,
    '',
    `Generated: ${review.generated_at}`,
    `Readiness: \`${review.promotion.readiness}\``,
    `Writes public database: \`${review.writes_public_database}\``,
    '',
    '## Promotion',
    ''
  ];
  if (review.promotion.blockers.length) {
    lines.push('Blocked by:');
    review.promotion.blockers.forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push(`Ready command: \`${review.promotion.next_command}\``);
  }
  if (review.promotion.warnings.length) {
    lines.push('', 'Warnings:');
    review.promotion.warnings.forEach((item) => lines.push(`- ${item}`));
  }
  lines.push('', '## Sources', '');
  review.source_trail.forEach((source) => lines.push(`- ${source.title}${source.url ? ` — ${source.url}` : ''} (${source.reliability_level}, ${source.rights_status})`));
  lines.push('', '## Changes', '');
  review.changes.forEach((change) => lines.push(`- \`${change.field}\`: ${change.before} -> ${change.after}`));
  lines.push('', '## Rights', '');
  review.rights_report.media.forEach((item) => lines.push(`- ${item.type}: ${item.license}, public display ${item.public_display_allowed ? 'yes' : 'no'}`));
  lines.push('', '## Outputs', '');
  Object.entries(review.outputs).forEach(([key, value]) => lines.push(`- ${key}: \`${value}\``));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function deepMerge(base, patch) {
  if (Array.isArray(patch)) return patch;
  if (!patch || typeof patch !== 'object') return patch === undefined ? base : patch;
  const result = Array.isArray(base) ? [...base] : { ...(base || {}) };
  for (const [key, value] of Object.entries(patch)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(result[key], value)
      : value;
  }
  return result;
}

function defaultMediaLabel(type) {
  return {
    exterior: 'Außenansicht',
    interior: 'Innenraum',
    section: 'Schnitt',
    plan: 'Grundriss'
  }[type];
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (fallback !== null && error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      parsed._.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : true;
    if (next && !next.startsWith('--')) index += 1;
  }
  return parsed;
}
