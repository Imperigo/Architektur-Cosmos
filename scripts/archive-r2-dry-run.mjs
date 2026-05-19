#!/usr/bin/env node

import { stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import entries from '../data/mock-entries.json' with { type: 'json' };

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicLayout = hasFlag('--public-layout');
const bucket =
  readArg('--bucket') ??
  process.env.ARCHITECTURE_COSMOS_R2_BUCKET ??
  (publicLayout ? 'cosmos-assets' : 'architecture-cosmos-assets-preview');
const mediaTypes = new Set(['exterior', 'interior', 'section', 'plan']);
const publicImageTypes = new Set(['hero', 'hero@1200', 'hero@600', 'gallery', 'gallery@1200', 'gallery@600']);
const modelTypes = new Set(['full_model', 'structure_model', 'facade_model', 'interior_model', 'site_model', 'mass_model', 'low_model']);
const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedModelExtensions = new Set(['.glb', '.gltf', '.usdz', '.obj', '.fbx']);
const maxImageBytes = 8 * 1024 * 1024;
const maxModelBytes = 8 * 1024 * 1024;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const entryId = readArg('--entry');
  const fileArg = readArg('--file');
  const type = readArg('--type');
  const copyright = readArg('--copyright') ?? 'needs_permission';

  const errors = [];
  if (!entryId) errors.push('--entry is required');
  if (!fileArg) errors.push('--file is required');
  if (!type) errors.push('--type is required');
  if (type && !isSupportedType(type)) {
    errors.push(`--type must be exterior, interior, section, plan, hero, gallery, a responsive image variant, or a *_model type. Received: ${type}`);
  }

  const entry = entries.find((candidate) => candidate.id === entryId || candidate.slug === entryId);
  if (!entry) errors.push(`Entry not found: ${entryId}`);
  if (entry && !entry.database_profile) errors.push(`Entry is not a database pilot yet: ${entry.id}`);

  const filePath = fileArg ? resolve(rootDir, fileArg) : null;
  const fileInfo = filePath ? await readFileInfo(filePath, errors) : null;

  if (fileInfo && isImageType(type)) validateImageLike(fileInfo, errors);
  if (fileInfo && isModelType(type)) validateModelLike(fileInfo, errors);
  if (!['needs_permission', 'private_research', 'licensed', 'public_domain', 'own_work'].includes(copyright)) {
    errors.push('--copyright must be needs_permission, private_research, licensed, public_domain, or own_work');
  }
  if (copyright === 'needs_permission' || copyright === 'private_research') {
    errors.push(`Upload blocked: copyright status is ${copyright}. Keep as source reference/private research until rights are clear.`);
  }

  const key = entry && type ? plannedKey(entry, type, fileInfo?.extension ?? '') : null;

  console.log('Architecture Cosmos R2 dry run');
  console.log(`Bucket: ${bucket}`);
  console.log(`Layout: ${publicLayout ? 'public blender asset layout' : 'legacy preview intake layout'}`);
  console.log(`Entry: ${entry?.id ?? entryId ?? 'missing'}`);
  console.log(`Type: ${type ?? 'missing'}`);
  console.log(`File: ${filePath ?? 'missing'}`);
  if (fileInfo) console.log(`Size: ${fileInfo.bytes} bytes`);
  if (key) console.log(`Planned R2 key: ${key}`);
  console.log('Upload mode: DRY RUN ONLY');

  if (errors.length > 0) {
    console.error(`\nBlocked (${errors.length}):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log('\nDry run passed. No file was uploaded.');
  console.log('Next step would require an explicit upload script and another confirmation gate.');
}

async function readFileInfo(filePath, errors) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      errors.push(`Path is not a file: ${filePath}`);
      return null;
    }
    return {
      bytes: info.size,
      extension: extname(filePath).toLowerCase()
    };
  } catch {
    errors.push(`File does not exist: ${filePath}`);
    return null;
  }
}

function validateImageLike(fileInfo, errors) {
  if (!allowedImageExtensions.has(fileInfo.extension)) {
    errors.push(`Image media must be one of ${[...allowedImageExtensions].join(', ')}. Received: ${fileInfo.extension || 'none'}`);
  }
  if (fileInfo.bytes > maxImageBytes) {
    errors.push(`Image exceeds ${maxImageBytes} bytes dry-run limit.`);
  }
}

function validateModelLike(fileInfo, errors) {
  if (!allowedModelExtensions.has(fileInfo.extension)) {
    errors.push(`Model file must be one of ${[...allowedModelExtensions].join(', ')}. Received: ${fileInfo.extension || 'none'}`);
  }
  if (fileInfo.bytes > maxModelBytes) {
    errors.push(`Model exceeds ${maxModelBytes} bytes preview limit.`);
  }
}

function plannedKey(entry, type, extension) {
  if (publicLayout) {
    if (isImageType(type)) return plannedPublicImageKey(entry, type);
    if (isModelType(type)) return plannedPublicModelKey(entry, type, extension);
  }

  const prefix = entry.database_profile?.r2_prefix ?? `entries/${entry.slug}`;
  if (isImageType(type)) {
    const suffix = extension || '.jpg';
    return `${prefix}/media/${type}-01${suffix}`;
  }
  return `${prefix}/models/${type.replace(/_model$/, '')}${extension || '.glb'}`;
}

function plannedPublicImageKey(entry, type) {
  if (type.startsWith('gallery')) {
    const suffix = type.replace('gallery', '') || '';
    return `images/${entry.id}/gallery_1${suffix}.webp`;
  }
  if (type.startsWith('hero')) {
    const suffix = type.replace('hero', '') || '';
    return `images/${entry.id}/hero${suffix}.webp`;
  }
  return `images/${entry.id}/${type}.webp`;
}

function plannedPublicModelKey(entry, type, extension) {
  const modelName = type.replace(/_model$/, '');
  if (modelName.startsWith('material:')) {
    return `models/${entry.id}/materials/${modelName.replace('material:', '')}${extension || '.glb'}`;
  }
  return `models/${entry.id}/${modelName}${extension || '.glb'}`;
}

function isSupportedType(type) {
  return isImageType(type) || isModelType(type);
}

function isImageType(type) {
  if (!type) return false;
  return mediaTypes.has(type) || publicImageTypes.has(type);
}

function isModelType(type) {
  if (!type) return false;
  return modelTypes.has(type) || type.endsWith('_model') || type.startsWith('material:');
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
