#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const registryPath = resolve(root, readArg('--registry') ?? 'data/kosmoreferences-registry.json');
const outputDir = resolve(root, readArg('--out') ?? 'examples/kosmo-references/provenance/review');
const outputJson = resolve(outputDir, 'provenance-check.generated.json');
const outputMd = resolve(outputDir, 'provenance-check.generated.md');

const publicSafeRights = new Set(['own_work', 'licensed', 'public_domain']);
const reviewRights = new Set([
  'link_only',
  'private_research',
  'needs_permission',
  'needs_review',
  'generated_needs_review',
  'derived_asset_review_required',
  'file_level_review_required',
  'review_only'
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const registry = readJson(registryPath);
  const result = checkProvenance(registry);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(result));

  console.log('KosmoReferences provenance check');
  console.log(`Registry: ${relative(root, registryPath)}`);
  console.log(`Status: ${result.status}`);
  console.log(`Entry drafts: ${result.summary.entry_drafts}`);
  console.log(`Asset libraries: ${result.summary.asset_libraries}`);
  console.log(`Public-ready assets: ${result.summary.public_ready_assets}`);
  console.log(`Blocked public promotions: ${result.summary.blocked_public_promotions}`);
  console.log(`Failures: ${result.failures.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (result.failures.length > 0) process.exitCode = 1;
}

function checkProvenance(registry) {
  const failures = [];
  const warnings = [];
  const entryRows = [];
  const assetRows = [];

  for (const item of registry.entry_drafts ?? []) {
    const draft = readLinkedJson(item.path, failures, 'entry_draft', item.id);
    if (!draft) continue;
    const mediaRows = (draft.media ?? []).map((media) => classifyMedia(draft, media));
    const assetCandidateRows = (draft.asset_candidates ?? []).map((asset) => classifyDraftAsset(draft, asset));
    const hasPublicMedia = mediaRows.some((row) => row.public_ready);
    const hasPublicAssetCandidate = assetCandidateRows.some((row) => row.public_ready);

    if (item.public_ready === true) {
      failures.push(`entry draft ${item.id} is marked public_ready in provenance check`);
    }
    if (hasPublicMedia || hasPublicAssetCandidate) {
      warnings.push(`entry draft ${item.id} contains public-ready media/assets; verify this is intentional`);
    }

    entryRows.push({
      id: item.id,
      title: item.title,
      path: item.path,
      public_ready: Boolean(item.public_ready),
      source_package_id: item.source_package_id ?? null,
      media: mediaRows,
      asset_candidates: assetCandidateRows,
      blocked_media_count: mediaRows.filter((row) => row.public_blocked).length,
      blocked_asset_candidate_count: assetCandidateRows.filter((row) => row.public_blocked).length
    });
  }

  for (const item of registry.asset_libraries ?? []) {
    const library = readLinkedJson(item.path, failures, 'asset_library', item.id);
    if (!library) continue;
    if (library.storage_policy?.uploads_allowed === true) failures.push(`asset library ${item.id} allows uploads`);
    if (library.storage_policy?.public_assets_allowed === true) failures.push(`asset library ${item.id} allows public assets`);

    for (const asset of library.assets ?? []) {
      const row = classifyLibraryAsset(item, asset);
      assetRows.push(row);
      if (row.public_use_allowed && !row.public_safe_rights) {
        failures.push(`asset ${asset.id} is public_use_allowed with rights_status=${asset.rights_status}`);
      }
      if (row.local_file_missing.length > 0) {
        failures.push(`asset ${asset.id} has missing local file(s): ${row.local_file_missing.join(', ')}`);
      }
    }
  }

  const publicReadyAssets = assetRows.filter((row) => row.public_ready).length;
  const blockedPublicPromotions = [
    ...entryRows.flatMap((entry) => entry.media).filter((row) => row.public_blocked),
    ...entryRows.flatMap((entry) => entry.asset_candidates).filter((row) => row.public_blocked),
    ...assetRows.filter((row) => row.public_blocked)
  ].length;

  const status = failures.length > 0 ? 'failed' : warnings.length > 0 ? 'passed_with_warnings' : 'passed';
  return {
    checked_at: new Date().toISOString(),
    registry_path: relative(root, registryPath),
    status,
    policy: {
      public_safe_rights: [...publicSafeRights],
      review_rights: [...reviewRights],
      rule: 'Public promotion requires public_safe rights, file-level provenance and explicit public flag.'
    },
    summary: {
      entry_drafts: entryRows.length,
      asset_libraries: registry.asset_libraries?.length ?? 0,
      library_assets: assetRows.length,
      public_ready_assets: publicReadyAssets,
      blocked_public_promotions: blockedPublicPromotions,
      failures: failures.length,
      warnings: warnings.length
    },
    entry_drafts: entryRows,
    library_assets: assetRows,
    failures,
    warnings,
    next_actions: [
      'Keep all review-only drafts out of public publishing until file-level rights are verified.',
      'Run separate provenance review before promoting Villa Savoye local media, plan vectors or GLB models.',
      'Use this report as a KosmoOrbit read-only rights/provenance status card.'
    ]
  };
}

function classifyMedia(draft, media) {
  const credit = String(media.credit ?? 'unknown');
  const status = inferRightsStatus(credit, media.copyright_status);
  const publicReady = publicSafeRights.has(status) && Boolean(media.public_display_allowed);
  return {
    entry_id: draft.id,
    type: media.type ?? null,
    label: media.label ?? null,
    rights_status: status,
    credit,
    public_ready: publicReady,
    public_blocked: !publicReady,
    reason: publicReady ? 'public-safe rights and public flag present' : 'review-only, link-only or missing public-safe file-level rights'
  };
}

function classifyDraftAsset(draft, asset) {
  const status = inferRightsStatus(asset.rights_status, asset.license);
  const publicReady = publicSafeRights.has(status) && asset.public_display_allowed === true;
  return {
    entry_id: draft.id,
    title: asset.title ?? null,
    kind: asset.kind ?? null,
    rights_status: status,
    planned_r2_key: asset.planned_r2_key ?? null,
    public_ready: publicReady,
    public_blocked: !publicReady,
    reason: publicReady ? 'public-safe rights and public flag present' : 'not public-safe; keep as review-only candidate'
  };
}

function classifyLibraryAsset(libraryItem, asset) {
  const publicSafe = publicSafeRights.has(asset.rights_status);
  const publicReady = asset.public_use_allowed === true && publicSafe;
  const localFileMissing = [];
  const formats = (asset.formats ?? []).map((format) => {
    const filePath = format.path ? resolve(dirname(resolve(root, libraryItem.path)), format.path) : null;
    const exists = filePath ? existsSync(filePath) : false;
    if (format.status === 'exists' && !exists) localFileMissing.push(format.path);
    return {
      format: format.format ?? null,
      status: format.status ?? null,
      path: format.path ?? null,
      planned_r2_key: format.planned_r2_key ?? null,
      exists
    };
  });

  return {
    library_id: libraryItem.id,
    id: asset.id,
    title: asset.title,
    source_entry_id: asset.source_entry_id ?? null,
    rights_status: asset.rights_status ?? 'unknown',
    license: asset.license ?? null,
    review_status: asset.review_status ?? null,
    public_use_allowed: Boolean(asset.public_use_allowed),
    local_only: Boolean(asset.local_only),
    public_safe_rights: publicSafe,
    public_ready: publicReady,
    public_blocked: !publicReady,
    local_file_missing: localFileMissing,
    formats,
    reason: publicReady ? 'asset has public-safe rights and public flag' : 'asset is local-review-only or lacks public-safe file-level rights'
  };
}

function inferRightsStatus(...values) {
  const text = values.filter(Boolean).join(' ').toLowerCase();
  if (/own_work/.test(text)) return 'own_work';
  if (/public_domain/.test(text)) return 'public_domain';
  if (/\blicensed\b/.test(text)) return 'licensed';
  if (/derived_asset_review_required/.test(text)) return 'derived_asset_review_required';
  if (/file_level_review_required/.test(text)) return 'file_level_review_required';
  if (/generated/.test(text)) return 'generated_needs_review';
  if (/private/.test(text)) return 'private_research';
  if (/link_only/.test(text)) return 'link_only';
  if (/permission/.test(text)) return 'needs_permission';
  return 'unknown';
}

function readLinkedJson(path, failures, kind, id) {
  if (!path) {
    failures.push(`${kind} missing path for ${id}`);
    return null;
  }
  const resolved = resolve(root, path);
  if (!existsSync(resolved)) {
    failures.push(`${kind} path missing for ${id}: ${path}`);
    return null;
  }
  return readJson(resolved);
}

function renderMarkdown(result) {
  const lines = [];
  lines.push('# KosmoReferences Provenance Check');
  lines.push('');
  lines.push(`Generated: ${result.checked_at}`);
  lines.push(`Registry: \`${result.registry_path}\``);
  lines.push(`Status: \`${result.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Entry drafts: ${result.summary.entry_drafts}`);
  lines.push(`- Asset libraries: ${result.summary.asset_libraries}`);
  lines.push(`- Library assets: ${result.summary.library_assets}`);
  lines.push(`- Public-ready assets: ${result.summary.public_ready_assets}`);
  lines.push(`- Blocked public promotions: ${result.summary.blocked_public_promotions}`);
  lines.push(`- Failures: ${result.summary.failures}`);
  lines.push(`- Warnings: ${result.summary.warnings}`);
  lines.push('');
  lines.push('## Entry Drafts');
  lines.push('');
  for (const entry of result.entry_drafts) {
    lines.push(`- \`${entry.id}\`: media blocked ${entry.blocked_media_count}, asset candidates blocked ${entry.blocked_asset_candidate_count}`);
  }
  lines.push('');
  lines.push('## Library Assets');
  lines.push('');
  for (const asset of result.library_assets) {
    lines.push(`- \`${asset.id}\`: ${asset.public_ready ? 'public_ready' : 'blocked'} (${asset.rights_status}; ${asset.reason})`);
  }
  if (result.failures.length > 0) {
    lines.push('');
    lines.push('## Failures');
    lines.push('');
    result.failures.forEach((failure) => lines.push(`- ${failure}`));
  }
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('## Warnings');
    lines.push('');
    result.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  result.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
