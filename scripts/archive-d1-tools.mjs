#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entriesPath = resolve(rootDir, 'data/mock-entries.json');
const relationsPath = resolve(rootDir, 'data/relations.json');
const defaultOutputPath = resolve(rootDir, 'out/archive-d1-import.sql');

const entryTypes = new Set(['building', 'urban_plan', 'landscape_project', 'text', 'theory', 'map', 'infrastructure', 'object', 'event']);
const styleSectors = new Set([
  'classical_architecture',
  'pre_modern_architecture',
  'modern_architecture',
  'postwar_modern_architecture',
  'sustainable_architecture',
  'vernacular_architecture'
]);
const relationTypes = new Set([
  'influences',
  'responds_to',
  'shares_theme',
  'same_author',
  'same_place',
  'typological_reference',
  'structural_reference',
  'material_reference',
  'source_connection',
  'context'
]);
const mediaTypes = new Set(['exterior', 'interior', 'section', 'plan']);
const modelTypes = new Set(['full_model', 'low_poly_model', 'structure_model', 'tectonic_model', 'site_model', 'mass_model']);
const analysisTypes = new Set([
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
const reviewStatuses = new Set(['draft', 'reviewed', 'verified', 'needs_source']);

async function main() {
  const command = process.argv[2] ?? 'validate';
  const outputPath = readOutputArg() ?? defaultOutputPath;
  const data = await loadArchiveData();

  if (command === 'validate') {
    const result = validateArchiveData(data);
    printValidation(result);
    process.exitCode = result.errors.length > 0 ? 1 : 0;
    return;
  }

  if (command === 'export-sql') {
    const result = validateArchiveData(data);
    printValidation(result);

    if (result.errors.length > 0) {
      console.error('\nExport blocked because validation has errors.');
      process.exitCode = 1;
      return;
    }

    const sql = buildD1ImportSql(data);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, sql);
    console.log(`\nWrote D1 import preview: ${relativeToRoot(outputPath)}`);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error('Use: node scripts/archive-d1-tools.mjs validate');
  console.error(' or: node scripts/archive-d1-tools.mjs export-sql --output out/archive-d1-import.sql');
  process.exitCode = 1;
}

async function loadArchiveData() {
  const [entries, relations] = await Promise.all([
    readJson(entriesPath),
    readJson(relationsPath)
  ]);
  return { entries, relations };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function validateArchiveData({ entries, relations }) {
  const errors = [];
  const warnings = [];
  const entryIds = new Set();
  const slugs = new Set();

  entries.forEach((entry, index) => {
    const label = entry.id || `entry[${index}]`;

    requireString(errors, entry.id, `${label}: id`);
    requireString(errors, entry.slug, `${label}: slug`);
    requireString(errors, entry.title, `${label}: title`);
    requireNumber(errors, entry.year_start, `${label}: year_start`);
    requireArray(errors, entry.authors, `${label}: authors`);
    requireArray(errors, entry.themes, `${label}: themes`);
    requireString(errors, entry.short_description, `${label}: short_description`);
    requireString(errors, entry.one_sentence, `${label}: one_sentence`);
    requireString(errors, entry.full_description, `${label}: full_description`);
    requireString(errors, entry.source_quality, `${label}: source_quality`);

    if (entry.id && entryIds.has(entry.id)) errors.push(`${label}: duplicate entry id`);
    if (entry.id) entryIds.add(entry.id);

    if (entry.slug && slugs.has(entry.slug)) errors.push(`${label}: duplicate slug "${entry.slug}"`);
    if (entry.slug) slugs.add(entry.slug);

    if (!entryTypes.has(entry.entry_type)) errors.push(`${label}: invalid entry_type "${entry.entry_type}"`);
    if (!styleSectors.has(entry.style_sector)) errors.push(`${label}: invalid style_sector "${entry.style_sector}"`);

    if (entry.year_end !== undefined && entry.year_end !== null && typeof entry.year_end !== 'number') {
      errors.push(`${label}: year_end must be a number when present`);
    }

    validateMedia(entry, label, errors, warnings);
    validateModels(entry, label, errors);
    validateAnalysis(entry, label, errors);
    validateDatabaseProfile(entry, label, errors);
  });

  relations.forEach((relation, index) => {
    const label = relation.id || `relation[${index}]`;
    requireString(errors, relation.id, `${label}: id`);
    requireString(errors, relation.source_entry_id, `${label}: source_entry_id`);
    requireString(errors, relation.target_entry_id, `${label}: target_entry_id`);
    requireString(errors, relation.description, `${label}: description`);

    if (!relationTypes.has(relation.relation_type)) errors.push(`${label}: invalid relation_type "${relation.relation_type}"`);
    if (!entryIds.has(relation.source_entry_id)) errors.push(`${label}: missing source entry "${relation.source_entry_id}"`);
    if (!entryIds.has(relation.target_entry_id)) errors.push(`${label}: missing target entry "${relation.target_entry_id}"`);
    if (relation.source_entry_id === relation.target_entry_id) errors.push(`${label}: source and target must differ`);
  });

  return {
    errors,
    warnings,
    stats: {
      entries: entries.length,
      relations: relations.length,
      media: entries.reduce((sum, entry) => sum + (entry.media?.length ?? 0), 0),
      models: entries.reduce((sum, entry) => sum + (entry.model_assets?.length ?? 0), 0),
      analysis: entries.reduce((sum, entry) => sum + (entry.analysis_layers?.length ?? 0), 0),
      tags: collectTags(entries).length
    }
  };
}

function validateMedia(entry, label, errors, warnings) {
  if (!Array.isArray(entry.media)) {
    errors.push(`${label}: media must be an array`);
    return;
  }

  const seenTypes = new Set();
  entry.media.forEach((media, mediaIndex) => {
    const mediaLabel = `${label}: media[${mediaIndex}]`;
    if (!mediaTypes.has(media.type)) errors.push(`${mediaLabel}: invalid media type "${media.type}"`);
    requireString(errors, media.label, `${mediaLabel}: label`);
    requireString(errors, media.placeholder, `${mediaLabel}: placeholder`);
    if (seenTypes.has(media.type)) warnings.push(`${label}: duplicate MVP media type "${media.type}"`);
    seenTypes.add(media.type);
  });

  for (const type of mediaTypes) {
    if (!seenTypes.has(type)) warnings.push(`${label}: missing MVP media slot "${type}"`);
  }
}

function validateModels(entry, label, errors) {
  if (entry.model_assets === undefined) return;
  if (!Array.isArray(entry.model_assets)) {
    errors.push(`${label}: model_assets must be an array`);
    return;
  }

  entry.model_assets.forEach((model, index) => {
    const modelLabel = `${label}: model_assets[${index}]`;
    if (!modelTypes.has(model.model_type)) errors.push(`${modelLabel}: invalid model_type "${model.model_type}"`);
    if (!reviewStatuses.has(model.review_status)) errors.push(`${modelLabel}: invalid review_status "${model.review_status}"`);
    requireString(errors, model.title, `${modelLabel}: title`);
    requireString(errors, model.r2_key, `${modelLabel}: r2_key`);
    if (model.confidence_score !== undefined && (typeof model.confidence_score !== 'number' || model.confidence_score < 0 || model.confidence_score > 1)) {
      errors.push(`${modelLabel}: confidence_score must be between 0 and 1`);
    }
  });
}

function validateAnalysis(entry, label, errors) {
  if (entry.analysis_layers === undefined) return;
  if (!Array.isArray(entry.analysis_layers)) {
    errors.push(`${label}: analysis_layers must be an array`);
    return;
  }

  entry.analysis_layers.forEach((analysis, index) => {
    const analysisLabel = `${label}: analysis_layers[${index}]`;
    if (!analysisTypes.has(analysis.analysis_type)) errors.push(`${analysisLabel}: invalid analysis_type "${analysis.analysis_type}"`);
    if (!reviewStatuses.has(analysis.review_status)) errors.push(`${analysisLabel}: invalid review_status "${analysis.review_status}"`);
    requireString(errors, analysis.summary, `${analysisLabel}: summary`);
  });
}

function validateDatabaseProfile(entry, label, errors) {
  if (entry.database_profile === undefined) return;
  const profile = entry.database_profile;
  if (!['draft', 'reviewed', 'published', 'needs_sources'].includes(profile.status)) {
    errors.push(`${label}: database_profile has invalid status "${profile.status}"`);
  }
  requireString(errors, profile.r2_prefix, `${label}: database_profile.r2_prefix`);
}

function buildD1ImportSql({ entries, relations }) {
  const lines = [
    '-- Architecture Cosmos D1 import preview',
    '-- Generated from data/mock-entries.json and data/relations.json.',
    '-- This file is local output only. Review before applying to Cloudflare D1.',
    'PRAGMA foreign_keys = ON;',
    'BEGIN TRANSACTION;'
  ];

  const sourceIdsByEntry = new Map();
  const tags = collectTags(entries);

  entries.forEach((entry) => {
    lines.push(insertStatement('entries', {
      id: entry.id,
      slug: entry.slug,
      title: entry.title,
      entry_type: entry.entry_type,
      year_start: entry.year_start,
      year_end: entry.year_end ?? null,
      authors_json: JSON.stringify(entry.authors ?? []),
      city: entry.city ?? null,
      country: entry.country ?? null,
      latitude: null,
      longitude: null,
      style_sector: entry.style_sector,
      short_description: entry.short_description ?? '',
      one_sentence: entry.one_sentence ?? '',
      full_description: entry.full_description ?? '',
      source_quality: entry.source_quality ?? 'unknown',
      lecture_cluster_json: JSON.stringify(entry.lecture_cluster ?? []),
      status: entry.database_profile?.status ?? 'draft'
    }));

    const sourceIds = buildSourceRows(entry).map((source) => {
      lines.push(insertStatement('entry_sources', source));
      return source.id;
    });
    sourceIdsByEntry.set(entry.id, sourceIds);
  });

  entries.forEach((entry) => {
    const primarySourceId = sourceIdsByEntry.get(entry.id)?.[0] ?? null;
    buildMediaRows(entry, primarySourceId).forEach((media) => lines.push(insertStatement('entry_media', media)));
    buildModelRows(entry, primarySourceId).forEach((model) => lines.push(insertStatement('entry_models', model)));
    buildAnalysisRows(entry).forEach((analysis) => lines.push(insertStatement('entry_analysis', analysis)));
  });

  tags.forEach((tag) => lines.push(insertStatement('tags', tag)));
  entries.forEach((entry) => {
    entryTagsForEntry(entry).forEach((tag) => {
      lines.push(insertStatement('entry_tags', {
        entry_id: entry.id,
        tag_id: tag.id,
        confidence_score: tag.confidence,
        source_id: sourceIdsByEntry.get(entry.id)?.[0] ?? null
      }));
    });

    const prefix = entry.database_profile?.r2_prefix;
    if (prefix) {
      lines.push(insertStatement('asset_manifests', {
        id: `${entry.id}-asset-manifest`,
        entry_id: entry.id,
        manifest_type: 'source_package',
        r2_prefix: prefix,
        manifest_json: JSON.stringify({
          media: entry.media?.length ?? 0,
          source_assets: entry.source_assets?.length ?? 0,
          models: entry.model_assets?.length ?? 0,
          analysis_files: entry.analysis_layers?.length ?? 0,
          status: 'planned_r2_package'
        })
      }));
    }
  });

  relations.forEach((relation) => {
    lines.push(insertStatement('entry_relations', {
      id: relation.id,
      source_entry_id: relation.source_entry_id,
      target_entry_id: relation.target_entry_id,
      relation_type: relation.relation_type,
      strength: relation.strength ?? 0.5,
      description: relation.description ?? '',
      source_id: null
    }));
  });

  lines.push('COMMIT;', '');
  return lines.join('\n');
}

function buildSourceRows(entry) {
  const rows = [];

  if (entry.source_url) {
    rows.push({
      id: `${entry.id}-source-web`,
      entry_id: entry.id,
      source_type: 'website',
      title: sourceTitle(entry),
      author: null,
      url: entry.source_url,
      document_name: null,
      page_reference: null,
      reliability_level: reliabilityFromEntry(entry),
      notes: `Imported from source_url for ${entry.title}.`
    });
  }

  (entry.source_documents ?? []).forEach((documentName, index) => {
    rows.push({
      id: `${entry.id}-source-document-${index + 1}`,
      entry_id: entry.id,
      source_type: 'lecture_pdf',
      title: documentName,
      author: null,
      url: null,
      document_name: documentName,
      page_reference: null,
      reliability_level: 'lecture_reference',
      notes: `Imported from source_documents for ${entry.title}.`
    });
  });

  if (rows.length === 0) {
    rows.push({
      id: `${entry.id}-source-unverified`,
      entry_id: entry.id,
      source_type: 'other',
      title: `${entry.title} source placeholder`,
      author: null,
      url: null,
      document_name: null,
      page_reference: null,
      reliability_level: 'unverified',
      notes: 'Placeholder source generated for database consistency.'
    });
  }

  return rows;
}

function buildMediaRows(entry, primarySourceId) {
  return (entry.media ?? []).map((media, index) => ({
    id: `${entry.id}-media-${media.type}-${index + 1}`,
    entry_id: entry.id,
    source_id: primarySourceId,
    media_type: media.type,
    title: media.label ?? media.type,
    caption: media.placeholder ?? '',
    r2_key: media.url ? r2KeyFromUrl(entry, media.url, media.type, index + 1) : null,
    external_url: media.url ?? null,
    credit: media.credit ?? null,
    copyright_status: media.url ? 'needs_permission' : 'placeholder',
    sort_order: index + 1
  }));
}

function buildModelRows(entry, primarySourceId) {
  return (entry.model_assets ?? []).map((model, index) => ({
    id: `${entry.id}-model-${model.model_type}-${index + 1}`,
    entry_id: entry.id,
    source_id: primarySourceId,
    model_type: model.model_type,
    title: model.title,
    r2_key: model.r2_key,
    format: model.format,
    lod_level: model.lod_level,
    source_basis: model.source_basis,
    generation_method: model.generation_method,
    review_status: model.review_status,
    confidence_score: model.confidence_score ?? null,
    file_size_bytes: null
  }));
}

function buildAnalysisRows(entry) {
  return (entry.analysis_layers ?? []).map((analysis, index) => ({
    id: `${entry.id}-analysis-${analysis.analysis_type}-${index + 1}`,
    entry_id: entry.id,
    analysis_type: analysis.analysis_type,
    summary: analysis.summary,
    data_json: analysis.data ? JSON.stringify(analysis.data) : null,
    r2_key: analysis.r2_key ?? null,
    review_status: analysis.review_status
  }));
}

function collectTags(entries) {
  const byId = new Map();

  entries.forEach((entry) => {
    entryTagsForEntry(entry).forEach((tag) => {
      if (!byId.has(tag.id)) {
        byId.set(tag.id, {
          id: tag.id,
          label: tag.label,
          tag_group: tag.group,
          description: ''
        });
      }
    });
  });

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function entryTagsForEntry(entry) {
  const tags = [
    tagFromValue(entry.style_sector, 'style', 1),
    ...(entry.lecture_cluster ?? []).map((value) => tagFromValue(value, 'course', 0.86)),
    ...(entry.themes ?? []).map((value) => tagFromValue(value, inferTagGroup(value), 0.76)),
    ...(entry.database_tags ?? []).map((value) => tagFromDatabaseTag(value))
  ];

  const byId = new Map();
  tags.forEach((tag) => {
    const existing = byId.get(tag.id);
    if (!existing || tag.confidence > existing.confidence) byId.set(tag.id, tag);
  });

  return [...byId.values()];
}

function tagFromDatabaseTag(raw) {
  const [maybeGroup, ...rest] = String(raw).split(':');
  const hasGroup = rest.length > 0;
  const group = hasGroup ? normalizeTagGroup(maybeGroup) : 'theme';
  const value = hasGroup ? rest.join(':') : raw;
  return tagFromValue(value, group, 0.92);
}

function tagFromValue(value, group, confidence) {
  const label = toTitleLabel(value);
  return {
    id: `tag-${group}-${slugify(value)}`,
    label,
    group,
    confidence
  };
}

function inferTagGroup(value) {
  const normalized = String(value).toLowerCase();
  if (normalized.includes('structure') || normalized.includes('tectonic') || normalized.includes('canopy') || normalized.includes('core')) return 'structure';
  if (normalized.includes('material') || normalized.includes('glass') || normalized.includes('concrete') || normalized.includes('timber')) return 'material';
  if (normalized.includes('source') || normalized.includes('afasia')) return 'source';
  if (normalized.includes('model') || normalized.includes('analysis')) return 'analysis';
  return 'theme';
}

function normalizeTagGroup(value) {
  if (['style', 'typology', 'theme', 'course', 'source', 'structure', 'material', 'period', 'region', 'analysis'].includes(value)) {
    return value;
  }
  if (value === 'spatial' || value === 'landscape') return 'theme';
  return 'theme';
}

function sourceTitle(entry) {
  if (entry.source_url?.includes('afasia')) return `Afasia source for ${entry.title}`;
  return `Web source for ${entry.title}`;
}

function reliabilityFromEntry(entry) {
  const quality = String(entry.source_quality ?? '').toLowerCase();
  if (quality.includes('verified')) return 'verified';
  if (quality.includes('primary')) return 'primary_source';
  if (quality.includes('afasia') || quality.includes('web')) return 'secondary_source';
  if ((entry.source_documents ?? []).length > 0) return 'lecture_reference';
  return 'unverified';
}

function r2KeyFromUrl(entry, url, type, index) {
  const extension = String(url).split('?')[0].split('.').pop()?.toLowerCase();
  const safeExtension = extension && extension.length <= 5 ? extension : 'jpg';
  return `entries/${entry.slug}/media/${type}-${String(index).padStart(2, '0')}.${safeExtension}`;
}

function insertStatement(table, values) {
  const columns = Object.keys(values);
  const sqlValues = columns.map((column) => sqlValue(values[column]));
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${sqlValues.join(', ')});`;
}

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function requireString(errors, value, label) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${label} is required`);
}

function requireNumber(errors, value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) errors.push(`${label} must be a finite number`);
}

function requireArray(errors, value, label) {
  if (!Array.isArray(value)) errors.push(`${label} must be an array`);
}

function printValidation(result) {
  console.log('Architecture Cosmos archive validation');
  console.log(`Entries: ${result.stats.entries}`);
  console.log(`Relations: ${result.stats.relations}`);
  console.log(`Media rows: ${result.stats.media}`);
  console.log(`Model rows: ${result.stats.models}`);
  console.log(`Analysis rows: ${result.stats.analysis}`);
  console.log(`Tags: ${result.stats.tags}`);

  if (result.warnings.length > 0) {
    console.log(`\nWarnings (${result.warnings.length}):`);
    result.warnings.slice(0, 40).forEach((warning) => console.log(`- ${warning}`));
    if (result.warnings.length > 40) console.log(`- ... ${result.warnings.length - 40} more warnings`);
  }

  if (result.errors.length > 0) {
    console.error(`\nErrors (${result.errors.length}):`);
    result.errors.slice(0, 80).forEach((error) => console.error(`- ${error}`));
    if (result.errors.length > 80) console.error(`- ... ${result.errors.length - 80} more errors`);
    return;
  }

  console.log('\nValidation passed.');
}

function readOutputArg() {
  const index = process.argv.indexOf('--output');
  if (index === -1) return null;
  const value = process.argv[index + 1];
  return value ? resolve(rootDir, value) : null;
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
}

function toTitleLabel(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
