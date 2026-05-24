#!/usr/bin/env node

import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const outputRoot = resolve(rootDir, 'out/brain-model-status', today);
const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const entries = JSON.parse(await readFile(resolve(rootDir, 'data/mock-entries.json'), 'utf8'));
  const publicManifest = await loadPublicModelManifest();
  const selected = selectEntries(entries);
  const results = selected.map((entry) => modelStatusForEntry(entry, publicManifest));
  const summary = summarize(results);

  const report = {
    generated_at: new Date().toISOString(),
    writes_public_mock_data: false,
    uploads_assets: false,
    writes_d1_or_r2: false,
    summary,
    results,
    safety: [
      'R2 keys and assets.architekturkosmos.ch URLs are treated as planned targets unless a reachable/static file exists.',
      'Only files under public/archive-models are public website model previews.',
      'archive-intake models are local review artifacts and must not be presented as public-ready.',
      'Blender-ready requires a GLB plus layer/collection profiles, not only model_assets metadata.'
    ]
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await writeFile(resolve(outputRoot, `brain-model-status-${timestamp}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'latest.md'), renderMarkdown(report), 'utf8');

  console.log('Architecture Cosmos Brain Model Status');
  console.log(`Entries: ${results.length}`);
  console.log(`Public preview GLB: ${summary.public_preview_glb}`);
  console.log(`Public files missing manifest: ${summary.public_file_missing_manifest}`);
  console.log(`Local review GLB: ${summary.local_review_glb}`);
  console.log(`Planned only: ${summary.planned_only}`);
  console.log(`No model plan: ${summary.no_model_plan}`);
  console.log(`Blender-ready candidates: ${summary.blender_ready}`);
  console.log('Report: out/brain-model-status/' + today + '/latest.md');
}

function selectEntries(entries) {
  if (!args.entry) return entries;
  const wanted = new Set(String(args.entry).split(',').map((item) => item.trim()).filter(Boolean));
  return entries.filter((entry) => wanted.has(entry.slug) || wanted.has(entry.id));
}

async function loadPublicModelManifest() {
  const manifestPath = resolve(rootDir, 'data/public-model-previews.json');
  if (!existsSync(manifestPath)) return { version: 1, models: [] };
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

function modelStatusForEntry(entry, publicManifest) {
  const publicFiles = findExistingFiles([
    `public/archive-models/${entry.slug}/low.glb`,
    `public/archive-models/${entry.slug}/mass.glb`,
    `public/archive-models/${entry.slug}/full.glb`,
    `public/archive-models/${entry.slug}/structure.glb`,
    `public/archive-models/${entry.slug}/site.glb`
  ]);
  const localFiles = findExistingFiles([
    `archive-intake/${entry.slug}/models/low.glb`,
    `archive-intake/${entry.slug}/models/mass.glb`,
    `archive-intake/${entry.slug}/models/full.glb`,
    `archive-intake/${entry.slug}/models/structure.glb`,
    `archive-intake/${entry.slug}/models/site.glb`,
    `out/archive-models/${entry.slug}/low.glb`
  ]);
  const blenderProfile = fileInfo(`archive-intake/${entry.slug}/automation/blender-import-profile.json`);
  const archicadProfile = fileInfo(`archive-intake/${entry.slug}/automation/archicad-exchange-profile.json`);
  const packageManifest = fileInfo(`archive-intake/${entry.slug}/models/model-package.manifest.json`);
  const modelAssets = entry.model_assets ?? [];
  const model3dParts = entry.model_3d?.parts ?? [];
  const publicManifestEntry = (publicManifest.models ?? []).find((model) => model.slug === entry.slug) ?? null;
  const plannedTargets = [
    ...modelAssets.map((asset) => asset.r2_key).filter(Boolean),
    ...model3dParts.map((part) => part.r2_key || part.glb_url).filter(Boolean)
  ];

  const hasPublicPreview = publicFiles.length > 0;
  const publicWebsiteReady = hasPublicPreview && Boolean(publicManifestEntry);
  const hasLocalReview = localFiles.length > 0;
  const hasModelPlan = modelAssets.length > 0 || model3dParts.length > 0 || packageManifest.exists;
  const blenderReady = hasLocalReview && blenderProfile.exists && packageManifest.exists;
  const status = publicWebsiteReady
    ? 'public_preview_glb'
    : hasPublicPreview
      ? 'public_file_missing_manifest'
      : hasLocalReview
        ? 'local_review_glb'
        : hasModelPlan
          ? 'planned_only'
          : 'no_model_plan';

  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    status,
    public_preview_ready: hasPublicPreview,
    public_website_ready: publicWebsiteReady,
    public_manifest_entry: publicManifestEntry,
    local_review_ready: hasLocalReview,
    blender_ready: blenderReady,
    public_files: publicFiles,
    local_files: localFiles,
    model_assets_count: modelAssets.length,
    model_3d_parts_count: model3dParts.length,
    planned_targets_count: plannedTargets.length,
    inactive_asset_domain_refs: plannedTargets.filter((value) => String(value).includes('assets.architekturkosmos.ch')),
    package_manifest: packageManifest,
    blender_profile: blenderProfile,
    archicad_profile: archicadProfile,
    next_action: nextAction(status, blenderReady, packageManifest.exists)
  };
}

function nextAction(status, blenderReady, hasPackageManifest) {
  if (status === 'public_preview_glb' && blenderReady) return 'Review in website viewer and Blender, then decide whether to promote more layers.';
  if (status === 'public_preview_glb') return 'Add/refresh Blender import profile and layer manifest.';
  if (status === 'public_file_missing_manifest') return 'Register the public GLB in data/public-model-previews.json or remove the orphaned public file.';
  if (status === 'local_review_glb') return 'Review local GLB, then explicitly copy reviewed preview into public/archive-models if public-safe.';
  if (status === 'planned_only' && hasPackageManifest) return 'Review generated model package, then add a project-specific procedural template before GLB generation.';
  if (status === 'planned_only') return 'Run npm run cosmos:model-generate for a review model plan; add a project-specific template before GLB generation.';
  return 'Create model_assets via KosmoData enrichment before attempting geometry.';
}

function summarize(results) {
  return {
    public_preview_glb: results.filter((item) => item.status === 'public_preview_glb').length,
    public_file_missing_manifest: results.filter((item) => item.status === 'public_file_missing_manifest').length,
    local_review_glb: results.filter((item) => item.status === 'local_review_glb').length,
    planned_only: results.filter((item) => item.status === 'planned_only').length,
    no_model_plan: results.filter((item) => item.status === 'no_model_plan').length,
    blender_ready: results.filter((item) => item.blender_ready).length,
    inactive_asset_domain_refs: results.reduce((sum, item) => sum + item.inactive_asset_domain_refs.length, 0)
  };
}

function findExistingFiles(relativePaths) {
  return relativePaths.map(fileInfo).filter((item) => item.exists);
}

function fileInfo(relativePath) {
  const absolutePath = resolve(rootDir, relativePath);
  const exists = existsSync(absolutePath);
  return {
    path: relativePath,
    exists,
    size_bytes: exists ? statSync(absolutePath).size : 0
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Brain Model Status',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Summary',
    '',
    `- Public preview GLB: ${report.summary.public_preview_glb}`,
    `- Public files missing manifest: ${report.summary.public_file_missing_manifest}`,
    `- Local review GLB: ${report.summary.local_review_glb}`,
    `- Planned only: ${report.summary.planned_only}`,
    `- No model plan: ${report.summary.no_model_plan}`,
    `- Blender-ready candidates: ${report.summary.blender_ready}`,
    `- Inactive assets-domain refs: ${report.summary.inactive_asset_domain_refs}`,
    '',
    '## Entries',
    ''
  ];

  for (const item of report.results) {
    lines.push(`- **${item.title}** (\`${item.slug}\`): \`${item.status}\` — ${item.next_action}`);
  }

  lines.push('', '## Safety', '');
  for (const item of report.safety) lines.push(`- ${item}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
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
