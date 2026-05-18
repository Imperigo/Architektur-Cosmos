#!/usr/bin/env node

import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultStorageLimitBytes = 10 * 1024 * 1024 * 1024;
const mediaSlots = ['exterior', 'interior', 'section', 'plan'];
const modelTypes = ['low', 'full', 'structure', 'tectonic', 'site'];
const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedDocumentExtensions = new Set(['.pdf', '.txt', '.md', '.csv', '.json', '.url', '.webloc']);
const allowedDrawingExtensions = new Set(['.svg', '.pdf']);
const allowedModelExtensions = new Set(['.glb', '.gltf', '.usdz', '.obj', '.fbx', '.blend', '.pla', '.pln']);
const rightsStatuses = new Set(['needs_permission', 'private_research', 'licensed', 'public_domain', 'own_work']);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const title = readArg('--title');
  const input = readArg('--input') ?? 'archive-inbox/untitled-entry';
  const style = readArg('--style') ?? 'modern_architecture';
  const type = readArg('--type') ?? 'building';
  const year = Number.parseInt(readArg('--year') ?? '2025', 10);
  const copyright = readArg('--copyright') ?? 'needs_permission';
  const sourceUrl = readArg('--source-url') ?? '';
  const storageLimitBytes = Number.parseInt(readArg('--storage-limit-mb') ?? '', 10) > 0
    ? Number.parseInt(readArg('--storage-limit-mb'), 10) * 1024 * 1024
    : defaultStorageLimitBytes;

  const errors = [];
  if (!title) errors.push('--title is required');
  if (!rightsStatuses.has(copyright)) errors.push('--copyright must be needs_permission, private_research, licensed, public_domain, or own_work');
  if (!Number.isFinite(year)) errors.push('--year must be a finite number when provided');

  if (errors.length > 0) {
    console.error('Architecture Cosmos capture');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  const slug = slugify(title);
  const inputRoot = resolve(rootDir, input);
  const intakeRoot = resolve(rootDir, 'archive-intake', slug);
  const captureRoot = resolve(rootDir, 'out/archive-captures', slug);
  await ensureDirectory(inputRoot);
  await ensureIntakeFolders(intakeRoot);
  await mkdir(captureRoot, { recursive: true });

  const inputFiles = await scanTree(inputRoot);
  const intakeFiles = await scanTree(intakeRoot);
  const localStorageBytes = await localPrivateStorageBytes();
  const overBudget = localStorageBytes > storageLimitBytes;
  const files = [...inputFiles, ...intakeFiles];
  const sourceCandidates = buildSourceCandidates({ files, sourceUrl, copyright });
  const assetCandidates = buildAssetCandidates({ files, slug, copyright });
  const entry = buildEntryDraft({
    title,
    slug,
    type,
    style,
    year,
    copyright,
    sourceUrl,
    sourceCandidates,
    assetCandidates,
    localStorageBytes,
    storageLimitBytes
  });
  const assetManifest = buildAssetManifest({ slug, title, intakeRoot, assetCandidates, copyright });
  const manifest = buildCaptureManifest({ title, slug, inputRoot, intakeRoot, files, sourceCandidates, assetCandidates, entry, overBudget, localStorageBytes, storageLimitBytes });

  const entryPath = join(captureRoot, 'entry-draft.json');
  const sourcePath = join(captureRoot, 'source-candidates.json');
  const assetPath = join(captureRoot, 'asset-candidates.json');
  const assetManifestPath = join(captureRoot, 'asset-manifest.json');
  const manifestPath = join(captureRoot, 'capture-manifest.json');
  await writeJson(entryPath, entry);
  await writeJson(sourcePath, sourceCandidates);
  await writeJson(assetPath, assetCandidates);
  await writeJson(assetManifestPath, assetManifest);
  await writeJson(manifestPath, manifest);

  console.log('Architecture Cosmos local capture');
  console.log(`Title: ${title}`);
  console.log(`Slug: ${slug}`);
  console.log(`Inbox: ${relative(rootDir, inputRoot)}`);
  console.log(`Intake: ${relative(rootDir, intakeRoot)}`);
  console.log(`Capture package: ${relative(rootDir, captureRoot)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Source candidates: ${sourceCandidates.length}`);
  console.log(`Asset candidates: ${assetCandidates.length}`);
  console.log(`Local private storage: ${formatBytes(localStorageBytes)} / ${formatBytes(storageLimitBytes)}`);
  console.log(`Wormhole status: ${entry.ingestion_status.stage}`);
  console.log('Upload mode: LOCAL CAPTURE ONLY. No Cloudflare, R2, D1, or public upload was touched.');

  if (overBudget) {
    console.error(`\nBlocked: local private storage exceeds ${formatBytes(storageLimitBytes)}.`);
    process.exitCode = 1;
  }
}

async function ensureIntakeFolders(intakeRoot) {
  await Promise.all([...mediaSlots, 'models', 'sources', 'analysis'].map((folder) => mkdir(join(intakeRoot, folder), { recursive: true })));
}

async function ensureDirectory(path) {
  await mkdir(path, { recursive: true });
}

async function scanTree(root) {
  const files = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const info = await stat(fullPath);
      files.push({
        path: fullPath,
        relative_path: relative(rootDir, fullPath),
        name: entry.name,
        extension: extname(entry.name).toLowerCase(),
        bytes: info.size
      });
    }
  }
  await walk(root);
  return files.sort((a, b) => a.relative_path.localeCompare(b.relative_path));
}

async function localPrivateStorageBytes() {
  let total = 0;
  for (const folder of ['archive-inbox', 'archive-intake']) {
    const folderPath = resolve(rootDir, folder);
    try {
      const files = await scanTree(folderPath);
      total += files.reduce((sum, file) => sum + file.bytes, 0);
    } catch {
      // Missing private folders count as zero.
    }
  }
  return total;
}

function buildSourceCandidates({ files, sourceUrl, copyright }) {
  const candidates = [];
  if (sourceUrl) {
    candidates.push({
      source_type: 'website',
      title: sourceUrl,
      url: sourceUrl,
      reliability_level: 'unverified',
      rights_status: copyright,
      notes: 'User-provided source URL captured locally.'
    });
  }
  for (const file of files) {
    if (!allowedDocumentExtensions.has(file.extension)) continue;
    candidates.push({
      source_type: file.extension === '.pdf' ? 'lecture_pdf' : 'other',
      title: file.name,
      local_path: file.relative_path,
      reliability_level: 'unverified',
      rights_status: copyright,
      notes: 'Local source candidate from archive-inbox/archive-intake.'
    });
  }
  return candidates;
}

function buildAssetCandidates({ files, slug, copyright }) {
  return files
    .filter((file) => allowedImageExtensions.has(file.extension) || allowedDrawingExtensions.has(file.extension) || allowedModelExtensions.has(file.extension))
    .map((file, index) => {
      const isModel = allowedModelExtensions.has(file.extension);
      const mediaType = inferMediaType(file);
      const modelType = inferModelType(file);
      return {
        kind: isModel ? 'model' : assetKindFromMediaType(mediaType),
        media_slot: isModel ? undefined : mediaType,
        title: file.name,
        local_path: file.relative_path,
        planned_r2_key: isModel
          ? `entries/${slug}/models/${modelType}${normalizeModelExtension(file.extension)}`
          : `entries/${slug}/media/${mediaType}-${String(index + 1).padStart(2, '0')}${file.extension}`,
        rights_status: copyright,
        public_display_allowed: ['own_work', 'licensed', 'public_domain'].includes(copyright),
        bytes: file.bytes
      };
    });
}

function buildEntryDraft({ title, slug, type, style, year, copyright, sourceUrl, sourceCandidates, assetCandidates, localStorageBytes, storageLimitBytes }) {
  const sourceStatus = sourceCandidates.length > 0 ? 'candidate' : 'none';
  const assetStatus = assetCandidates.length > 0
    ? ['own_work', 'licensed', 'public_domain'].includes(copyright) ? 'ready' : copyright === 'private_research' ? 'candidate' : 'rights_blocked'
    : 'none';
  const modelStatus = assetCandidates.some((asset) => asset.kind === 'model') ? 'manual_ready' : 'planned';
  const stage = sourceStatus === 'candidate' && assetStatus !== 'rights_blocked' ? 'ready_for_wormhole' : 'needs_review';

  return {
    id: slug,
    slug,
    title,
    entry_type: type,
    year_start: year,
    year_end: null,
    authors: ['Unknown author'],
    city: '',
    country: '',
    style_sector: style,
    lecture_cluster: ['local_capture'],
    themes: ['needs-review', 'ai-reference-archive'],
    short_description: `${title} was captured as a local Architecture Cosmos archive candidate.`,
    one_sentence: `${title} is staged as an Architecture Cosmos reference object for source review, media slots, 3D model packages and filterable analysis layers.`,
    full_description: `${title} is part of the local capture workflow. The object still needs source verification, rights review, material/structure/tectonic analysis, relation mapping and optional Blender/ArchiCAD model preparation before publication.`,
    source_quality: sourceStatus === 'candidate' ? 'captured_unverified' : 'needs_source',
    source_documents: sourceCandidates.map((source) => source.title),
    source_url: sourceUrl,
    media: mediaSlots.map((slot) => ({
      type: slot,
      label: `${capitalize(slot)} placeholder`,
      placeholder: `${capitalize(slot)} media slot planned for ${title}.`,
      credit: copyright
    })),
    source_candidates: sourceCandidates,
    asset_candidates: assetCandidates,
    model_packages: buildModelPackages(slug),
    analysis_layers: buildAnalysisLayers(slug),
    analysis_observations: buildAnalysisObservations(),
    ingestion_status: {
      stage,
      source_status: sourceStatus,
      asset_status: assetStatus,
      model_status: modelStatus,
      local_storage_bytes: localStorageBytes,
      local_storage_limit_bytes: storageLimitBytes,
      updated_at: new Date().toISOString()
    },
    database_tags: buildDatabaseTags({ type, style, copyright }),
    database_profile: {
      status: 'draft',
      r2_prefix: `entries/${slug}`,
      source_count: sourceCandidates.length,
      media_count: mediaSlots.length,
      model_count: 5,
      analysis_count: 5,
      tag_count: buildDatabaseTags({ type, style, copyright }).length
    }
  };
}

function buildModelPackages(slug) {
  return [
    {
      package_type: 'reference_model',
      status: 'planned',
      planned_paths: modelTypes.map((type) => `entries/${slug}/models/${type}.glb`),
      notes: 'Reference model package for web preview, Blender import and later ArchiCAD handoff.'
    },
    {
      package_type: 'blender_package',
      status: 'planned',
      planned_paths: [`entries/${slug}/models/source.blend`, `entries/${slug}/analysis/blender-query-profile.json`],
      notes: 'Future bridge for Claude-in-Blender reference retrieval.'
    },
    {
      package_type: 'archicad_package',
      status: 'planned',
      planned_paths: [`entries/${slug}/models/source.pla`, `entries/${slug}/models/source.ifc`],
      notes: 'Future ArchiCAD refinement/export package.'
    }
  ];
}

function buildAnalysisLayers(slug) {
  return [
    { analysis_type: 'structure', summary: 'Structure layer planned for model and source review.', r2_key: `entries/${slug}/analysis/structure.json`, review_status: 'draft' },
    { analysis_type: 'tectonics', summary: 'Tectonic assembly layer planned for construction and joint logic.', r2_key: `entries/${slug}/analysis/tectonics.json`, review_status: 'draft' },
    { analysis_type: 'material_system', summary: 'Material classification layer planned for filters such as wood, concrete, stone, glass and steel.', r2_key: `entries/${slug}/analysis/materials.json`, review_status: 'draft' },
    { analysis_type: 'typology', summary: 'Typology layer planned for reference retrieval and comparison.', r2_key: `entries/${slug}/analysis/typology.json`, review_status: 'draft' },
    { analysis_type: 'filter_classification', summary: 'Filter layer planned for wormhole, database and Blender query use.', r2_key: `entries/${slug}/analysis/filter-classification.json`, review_status: 'draft' }
  ];
}

function buildAnalysisObservations() {
  return [
    { analysis_type: 'material_tag', label: 'material:needs-review', source: 'manual', confidence_score: 0 },
    { analysis_type: 'roof_form', label: 'roof:needs-review', source: 'manual', confidence_score: 0 },
    { analysis_type: 'structure', label: 'structure:needs-review', source: 'manual', confidence_score: 0 },
    { analysis_type: 'tectonics', label: 'tectonics:needs-review', source: 'manual', confidence_score: 0 },
    { analysis_type: 'blender_query', label: 'blender-reference:planned', source: 'manual', confidence_score: 0 }
  ];
}

function buildDatabaseTags({ type, style, copyright }) {
  return [
    'source:local-capture',
    `typology:${type.replace(/_/g, '-')}`,
    `style:${style.replace(/_/g, '-')}`,
    `rights:${copyright.replace(/_/g, '-')}`,
    'material:needs-review',
    'roof:needs-review',
    'structure:needs-review',
    'tectonics:needs-review',
    'analysis:needs-review',
    'workflow:ready-for-blender-bridge'
  ];
}

function buildCaptureManifest({ title, slug, inputRoot, intakeRoot, files, sourceCandidates, assetCandidates, entry, overBudget, localStorageBytes, storageLimitBytes }) {
  return {
    generated_at: new Date().toISOString(),
    upload_allowed: false,
    upload_mode: 'local_capture_only',
    title,
    slug,
    input_root: relative(rootDir, inputRoot),
    intake_root: relative(rootDir, intakeRoot),
    storage: {
      local_private_bytes: localStorageBytes,
      local_private_limit_bytes: storageLimitBytes,
      over_budget: overBudget
    },
    summary: {
      files_scanned: files.length,
      source_candidates: sourceCandidates.length,
      asset_candidates: assetCandidates.length,
      public_asset_candidates: assetCandidates.filter((asset) => asset.public_display_allowed).length,
      ingestion_stage: entry.ingestion_status.stage,
      missing_fields: missingFields(entry)
    },
    planned_outputs: {
      entry_draft: `out/archive-captures/${slug}/entry-draft.json`,
      source_candidates: `out/archive-captures/${slug}/source-candidates.json`,
      asset_candidates: `out/archive-captures/${slug}/asset-candidates.json`,
      asset_manifest: `out/archive-captures/${slug}/asset-manifest.json`,
      capture_manifest: `out/archive-captures/${slug}/capture-manifest.json`,
      intake_manifest_command: `npm run archive:asset-manifest -- --entry ${slug}`
    }
  };
}

function buildAssetManifest({ slug, title, intakeRoot, assetCandidates, copyright }) {
  return {
    generated_at: new Date().toISOString(),
    upload_mode: 'local_capture_only',
    upload_allowed: false,
    bucket: 'architecture-cosmos-assets-preview',
    entry_id: slug,
    slug,
    title,
    intake_root: relative(rootDir, intakeRoot),
    expected_slots: [...mediaSlots, 'models', 'sources', 'analysis'],
    summary: {
      files: assetCandidates.length,
      public_display_allowed: assetCandidates.filter((asset) => asset.public_display_allowed).length,
      rights_blocked: assetCandidates.filter((asset) => !asset.public_display_allowed).length,
      missing_media_slots: mediaSlots.filter((slot) => !assetCandidates.some((asset) => asset.media_slot === slot)),
      copyright
    },
    files: assetCandidates.map((asset) => ({
      source_path: asset.local_path,
      original_name: asset.title,
      slot: asset.media_slot ?? asset.kind,
      type: asset.kind,
      bytes: asset.bytes,
      copyright: asset.rights_status,
      status: asset.public_display_allowed ? 'dry_run_ready' : 'blocked_rights',
      valid: asset.public_display_allowed,
      planned_r2_key: asset.planned_r2_key,
      checks: []
    }))
  };
}

function missingFields(entry) {
  const fields = [];
  if (!entry.authors.length || entry.authors[0] === 'Unknown author') fields.push('authors');
  if (!entry.city) fields.push('city');
  if (!entry.country) fields.push('country');
  if (entry.source_candidates.length === 0) fields.push('sources');
  if (entry.asset_candidates.length === 0) fields.push('assets');
  return fields;
}

function inferMediaType(file) {
  const path = file.relative_path.toLowerCase();
  if (path.includes('/section/') || path.includes('section') || path.includes('schnitt')) return 'section';
  if (path.includes('/plan/') || path.includes('plan') || path.includes('grundriss')) return 'plan';
  if (path.includes('interior') || path.includes('innen')) return 'interior';
  if (path.includes('exterior') || path.includes('aussen') || path.includes('facade')) return 'exterior';
  return allowedImageExtensions.has(file.extension) ? 'exterior' : 'other';
}

function assetKindFromMediaType(mediaType) {
  if (mediaType === 'plan') return 'plan';
  if (mediaType === 'section') return 'section';
  if (mediaType === 'other') return 'other';
  return 'image';
}

function inferModelType(file) {
  const path = file.relative_path.toLowerCase();
  if (path.includes('structure')) return 'structure';
  if (path.includes('tectonic')) return 'tectonic';
  if (path.includes('site')) return 'site';
  if (path.includes('full')) return 'full';
  if (path.includes('low')) return 'low';
  if (path.includes('mass')) return 'mass';
  return 'source';
}

function normalizeModelExtension(extension) {
  if (extension === '.blend' || extension === '.pla' || extension === '.pln') return extension;
  return extension || '.glb';
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled-entry';
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
