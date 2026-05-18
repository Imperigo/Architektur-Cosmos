#!/usr/bin/env node

import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import entries from '../data/mock-entries.json' with { type: 'json' };

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bucket = 'architecture-cosmos-assets-preview';
const mediaTypes = ['exterior', 'interior', 'section', 'plan'];
const mediaTypeSet = new Set(mediaTypes);
const modelFolder = 'models';
const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedDrawingExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.pdf']);
const allowedModelExtensions = new Set(['.glb', '.gltf', '.usdz', '.obj', '.fbx']);
const maxImageBytes = 8 * 1024 * 1024;
const maxModelBytes = 8 * 1024 * 1024;
const copyrightStatuses = new Set(['needs_permission', 'private_research', 'licensed', 'public_domain', 'own_work']);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const entryId = readArg('--entry');
  const intakeRoot = resolve(rootDir, readArg('--input') ?? 'archive-intake');
  const outputRoot = resolve(rootDir, readArg('--output-dir') ?? 'out/asset-manifests');
  const copyright = readArg('--copyright') ?? 'needs_permission';

  const errors = [];
  if (!entryId) errors.push('--entry is required');
  if (!copyrightStatuses.has(copyright)) {
    errors.push('--copyright must be needs_permission, private_research, licensed, public_domain, or own_work');
  }

  const entry = entries.find((candidate) => candidate.id === entryId || candidate.slug === entryId);
  if (!entry) errors.push(`Entry not found: ${entryId}`);
  if (entry && !entry.database_profile) errors.push(`Entry is not a database pilot yet: ${entry.id}`);

  if (errors.length > 0) {
    console.error('Architecture Cosmos asset manifest');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  const entryRoot = join(intakeRoot, entry.slug);
  const directories = [...mediaTypes, modelFolder].map((folder) => join(entryRoot, folder));
  const directoriesCreated = [];
  for (const directory of directories) {
    const created = await ensureDirectory(directory);
    if (created) directoriesCreated.push(relative(rootDir, directory));
  }

  const files = [];
  for (const folder of mediaTypes) {
    files.push(...await scanFolder({ entry, folder, entryRoot, copyright }));
  }
  files.push(...await scanFolder({ entry, folder: modelFolder, entryRoot, copyright }));

  const missingSlots = mediaTypes.filter((type) => !files.some((file) => file.slot === type && file.valid));
  const blocked = files.filter((file) => file.status.startsWith('blocked'));
  const ready = files.filter((file) => file.status === 'dry_run_ready');
  const manifest = {
    generated_at: new Date().toISOString(),
    upload_mode: 'dry_run_manifest_only',
    upload_allowed: false,
    bucket,
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    intake_root: relative(rootDir, entryRoot),
    expected_slots: [...mediaTypes, modelFolder],
    summary: {
      files: files.length,
      dry_run_ready: ready.length,
      blocked: blocked.length,
      missing_media_slots: missingSlots,
      directories_created: directoriesCreated
    },
    files
  };

  await mkdir(outputRoot, { recursive: true });
  const outputPath = join(outputRoot, `${entry.slug}.json`);
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log('Architecture Cosmos asset intake manifest');
  console.log(`Entry: ${entry.title} (${entry.id})`);
  console.log(`Intake folder: ${relative(rootDir, entryRoot)}`);
  console.log(`Manifest: ${relative(rootDir, outputPath)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Dry-run ready: ${ready.length}`);
  console.log(`Blocked: ${blocked.length}`);
  console.log(`Missing media slots: ${missingSlots.length > 0 ? missingSlots.join(', ') : 'none'}`);
  console.log('Upload mode: DRY RUN MANIFEST ONLY. No file was uploaded.');
}

async function ensureDirectory(directory) {
  try {
    await stat(directory);
    return false;
  } catch {
    await mkdir(directory, { recursive: true });
    return true;
  }
}

async function scanFolder({ entry, folder, entryRoot, copyright }) {
  const folderPath = join(entryRoot, folder);
  const names = await readdir(folderPath);
  const visibleNames = names.filter((name) => !name.startsWith('.')).sort((a, b) => a.localeCompare(b));
  const rows = [];

  for (let index = 0; index < visibleNames.length; index += 1) {
    const name = visibleNames[index];
    const path = join(folderPath, name);
    const info = await stat(path);
    if (!info.isFile()) continue;

    const extension = extname(name).toLowerCase();
    const isModel = folder === modelFolder;
    const type = isModel ? modelTypeFromName(name) : folder;
    const checks = isModel
      ? validateModelLike(extension, info.size)
      : validateMediaLike(folder, extension, info.size);
    const status = statusForChecks(checks, copyright);

    rows.push({
      source_path: relative(rootDir, path),
      original_name: name,
      slot: isModel ? 'model' : folder,
      type,
      bytes: info.size,
      extension,
      copyright,
      status,
      valid: status === 'dry_run_ready',
      planned_r2_key: plannedKey(entry, folder, type, extension, index + 1),
      checks
    });
  }

  return rows;
}

function validateImageLike(extension, bytes) {
  const checks = [];
  if (!allowedImageExtensions.has(extension)) {
    checks.push(`invalid_extension:${extension || 'none'}`);
  }
  if (bytes > maxImageBytes) {
    checks.push(`too_large:${bytes}>${maxImageBytes}`);
  }
  return checks;
}

function validateMediaLike(folder, extension, bytes) {
  if (folder === 'plan' || folder === 'section') {
    const checks = [];
    if (!allowedDrawingExtensions.has(extension)) {
      checks.push(`invalid_extension:${extension || 'none'}`);
    }
    if (bytes > maxImageBytes) {
      checks.push(`too_large:${bytes}>${maxImageBytes}`);
    }
    return checks;
  }
  return validateImageLike(extension, bytes);
}

function validateModelLike(extension, bytes) {
  const checks = [];
  if (!allowedModelExtensions.has(extension)) {
    checks.push(`invalid_extension:${extension || 'none'}`);
  }
  if (bytes > maxModelBytes) {
    checks.push(`too_large:${bytes}>${maxModelBytes}`);
  }
  return checks;
}

function statusForChecks(checks, copyright) {
  if (copyright === 'needs_permission' || copyright === 'private_research') return 'blocked_rights';
  if (checks.some((check) => check.startsWith('invalid_extension'))) return 'blocked_invalid_type';
  if (checks.some((check) => check.startsWith('too_large'))) return 'blocked_too_large';
  return 'dry_run_ready';
}

function plannedKey(entry, folder, type, extension, index) {
  const prefix = entry.database_profile?.r2_prefix ?? `entries/${entry.slug}`;
  if (mediaTypeSet.has(folder)) {
    return `${prefix}/media/${folder}-${String(index).padStart(2, '0')}${extension || '.jpg'}`;
  }
  return `${prefix}/models/${safeFileStem(type)}${extension || '.glb'}`;
}

function modelTypeFromName(name) {
  const stem = name.replace(/\.[^.]+$/, '').toLowerCase();
  if (stem.includes('structure')) return 'structure';
  if (stem.includes('tectonic')) return 'tectonic';
  if (stem.includes('site')) return 'site';
  if (stem.includes('full')) return 'full';
  if (stem.includes('mass')) return 'mass';
  if (stem.includes('low')) return 'low';
  return safeFileStem(stem);
}

function safeFileStem(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
