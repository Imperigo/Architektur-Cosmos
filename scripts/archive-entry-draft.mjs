#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultDraftPath = resolve(rootDir, 'data/entry-draft-template.json');
const defaultOutputPath = resolve(rootDir, 'out/entry-draft-preview.json');

const entryTypes = new Set(['building', 'urban_plan', 'landscape_project', 'text', 'theory', 'map', 'infrastructure', 'object', 'event']);
const styleSectors = new Set([
  'classical_architecture',
  'pre_modern_architecture',
  'modern_architecture',
  'postwar_modern_architecture',
  'sustainable_architecture',
  'vernacular_architecture'
]);
const mediaTypes = ['exterior', 'interior', 'section', 'plan'];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const draftPath = resolve(rootDir, readArg('--input') ?? 'data/entry-draft-template.json');
  const outputPath = resolve(rootDir, readArg('--output') ?? 'out/entry-draft-preview.json');
  const draft = JSON.parse(await readFile(draftPath || defaultDraftPath, 'utf8'));
  const result = validateDraft(draft);

  printResult(result, draftPath);

  if (result.errors.length > 0) {
    process.exitCode = 1;
    return;
  }

  const normalized = normalizeDraft(draft);
  await mkdir(dirname(outputPath || defaultOutputPath), { recursive: true });
  await writeFile(outputPath || defaultOutputPath, `${JSON.stringify(normalized, null, 2)}\n`);
  console.log(`\nWrote draft preview: ${relativeToRoot(outputPath || defaultOutputPath)}`);
}

function validateDraft(entry) {
  const errors = [];
  const warnings = [];

  requireString(errors, entry.id, 'id');
  requireString(errors, entry.slug, 'slug');
  requireString(errors, entry.title, 'title');
  requireNumber(errors, entry.year_start, 'year_start');
  requireArray(errors, entry.authors, 'authors');
  requireArray(errors, entry.themes, 'themes');
  requireString(errors, entry.short_description, 'short_description');
  requireString(errors, entry.one_sentence, 'one_sentence');
  requireString(errors, entry.full_description, 'full_description');

  if (!entryTypes.has(entry.entry_type)) errors.push(`entry_type must be one of: ${[...entryTypes].join(', ')}`);
  if (!styleSectors.has(entry.style_sector)) errors.push(`style_sector must be one of: ${[...styleSectors].join(', ')}`);
  if (!Array.isArray(entry.media)) errors.push('media must be an array');

  const media = Array.isArray(entry.media) ? entry.media : [];
  const seenMedia = new Set(media.map((item) => item.type));

  for (const type of mediaTypes) {
    if (!seenMedia.has(type)) errors.push(`missing required media slot: ${type}`);
  }

  media.forEach((item, index) => {
    if (!mediaTypes.includes(item.type)) errors.push(`media[${index}].type is invalid: ${item.type}`);
    requireString(errors, item.label, `media[${index}].label`);
    requireString(errors, item.placeholder, `media[${index}].placeholder`);
  });

  if (!entry.database_profile) {
    warnings.push('database_profile missing; preview will generate one.');
  } else if (entry.database_profile.r2_prefix !== `entries/${entry.slug}`) {
    warnings.push(`database_profile.r2_prefix should usually be entries/${entry.slug}`);
  }

  if ((entry.database_tags ?? []).length < 5) {
    warnings.push('fewer than five database_tags; mature entries should have richer classification.');
  }

  return { errors, warnings };
}

function normalizeDraft(entry) {
  const r2Prefix = entry.database_profile?.r2_prefix ?? `entries/${entry.slug}`;
  const media = mediaTypes.map((type) => {
    const existing = entry.media.find((item) => item.type === type);
    return {
      type,
      label: existing?.label ?? `${type} placeholder`,
      placeholder: existing?.placeholder ?? `${type} media slot planned.`,
      credit: existing?.credit ?? 'placeholder',
      r2_key: `${r2Prefix}/media/${type}-01.placeholder.json`,
      copyright_status: existing?.url ? 'needs_permission' : 'placeholder'
    };
  });

  return {
    entry: {
      ...entry,
      source_quality: entry.source_quality ?? 'draft',
      media,
      database_profile: {
        status: entry.database_profile?.status ?? 'draft',
        r2_prefix: r2Prefix,
        source_count: Math.max(1, entry.source_documents?.length ?? 0),
        media_count: media.length,
        model_count: entry.model_assets?.length ?? 0,
        analysis_count: entry.analysis_layers?.length ?? 0,
        tag_count: entry.database_tags?.length ?? 0
      }
    },
    r2_manifest_preview: {
      bucket: 'architecture-cosmos-assets-preview',
      prefix: r2Prefix,
      upload_allowed: false,
      reason: 'Draft preview only. Real uploads require media policy review and explicit upload workflow.',
      objects: media.map((item) => ({
        key: item.r2_key,
        kind: 'media',
        status: item.copyright_status
      }))
    }
  };
}

function printResult(result, draftPath) {
  console.log('Architecture Cosmos entry draft validation');
  console.log(`Input: ${relativeToRoot(draftPath)}`);

  if (result.warnings.length > 0) {
    console.log(`\nWarnings (${result.warnings.length}):`);
    result.warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (result.errors.length > 0) {
    console.error(`\nErrors (${result.errors.length}):`);
    result.errors.forEach((error) => console.error(`- ${error}`));
    return;
  }

  console.log('\nDraft validation passed.');
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
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

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
