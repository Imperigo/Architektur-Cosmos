#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const registryPath = resolve(root, readArg('--registry') ?? 'data/kosmoreferences-registry.json');
const outputDir = resolve(root, readArg('--out') ?? 'out/kosmoreferences-registry');
const outputJson = resolve(outputDir, 'registry-check.generated.json');
const outputMd = resolve(outputDir, 'registry-check.generated.md');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const registry = readJson(registryPath);
  const result = checkRegistry(registry);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(result));

  console.log('KosmoReferences registry check');
  console.log(`Registry: ${relative(root, registryPath)}`);
  console.log(`Status: ${result.status}`);
  console.log(`Source packages: ${result.summary.source_packages}`);
  console.log(`Entry drafts: ${result.summary.entry_drafts}`);
  console.log(`Asset libraries: ${result.summary.asset_libraries}`);
  console.log(`Failures: ${result.failures.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (result.failures.length > 0) {
    process.exitCode = 1;
  }
}

function checkRegistry(registry) {
  const failures = [];
  const warnings = [];
  const checks = [];

  if (registry.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${registry.schema_version}`);
  requireArray(registry.source_packages, failures, 'source_packages must be an array');
  requireArray(registry.entry_drafts, failures, 'entry_drafts must be an array');
  requireArray(registry.asset_libraries, failures, 'asset_libraries must be an array');
  requireArray(registry.reference_pilots, failures, 'reference_pilots must be an array');

  const sourcePackageIds = new Set();
  for (const item of registry.source_packages ?? []) {
    validateRegistryItem(item, 'source_package', failures);
    if (sourcePackageIds.has(item.id)) failures.push(`duplicate source package id: ${item.id}`);
    sourcePackageIds.add(item.id);

    const manifest = readLinkedJson(item.path, checks, failures, 'source_package', item.id);
    const report = readLinkedJson(markdownReportToJsonPath(item.review_report), checks, warnings, 'source_package_report', item.id, { optionalJson: true });
    if (manifest) {
      if (manifest.package_id !== item.id) failures.push(`source package registry id mismatch: ${item.id} != ${manifest.package_id}`);
      if (manifest.status !== item.status) warnings.push(`source package status mismatch for ${item.id}: registry=${item.status}, manifest=${manifest.status}`);
      if (manifest.rights_scope !== item.rights_scope) failures.push(`source package rights_scope mismatch for ${item.id}`);
      if (manifest.source_kind !== item.source_kind) failures.push(`source package source_kind mismatch for ${item.id}`);
      if (manifest.public_policy?.source_files_public === true || manifest.public_policy?.extracted_text_public === true) {
        failures.push(`source package ${item.id} exposes source files or extracted text publicly`);
      }
    }
    if (report && report.status !== item.check_status) failures.push(`source package check_status mismatch for ${item.id}: registry=${item.check_status}, report=${report.status}`);
    if (item.check_status !== 'passed') failures.push(`source package ${item.id} is not passed`);
  }

  const draftIds = new Set();
  for (const item of registry.entry_drafts ?? []) {
    validateRegistryItem(item, 'entry_draft', failures);
    if (draftIds.has(item.id)) failures.push(`duplicate entry draft id: ${item.id}`);
    draftIds.add(item.id);
    if (!sourcePackageIds.has(item.source_package_id)) failures.push(`entry draft ${item.id} references unknown source_package_id: ${item.source_package_id}`);
    if (item.public_ready === true) failures.push(`entry draft ${item.id} must not be public_ready in this review-only registry`);

    const draft = readLinkedJson(item.path, checks, failures, 'entry_draft', item.id);
    if (draft) {
      if (draft.id !== item.id) failures.push(`entry draft registry id mismatch: ${item.id} != ${draft.id}`);
      if (draft.slug !== item.id) warnings.push(`entry draft ${item.id} slug differs from id: ${draft.slug}`);
      if (draft.source_package_ref && !pathEndsWithSourcePackage(draft.source_package_ref, item.source_package_id)) {
        warnings.push(`entry draft ${item.id} source_package_ref does not visibly match source_package_id`);
      }
      const mediaCredits = Array.isArray(draft.media) ? draft.media.map((media) => media.credit || '') : [];
      if (mediaCredits.some((credit) => !/review|placeholder|generated|link_only|private/i.test(credit))) {
        warnings.push(`entry draft ${item.id} has media credits that may need rights review`);
      }
    }
  }

  const assetLibraryIds = new Set();
  for (const item of registry.asset_libraries ?? []) {
    validateRegistryItem(item, 'asset_library', failures);
    if (assetLibraryIds.has(item.id)) failures.push(`duplicate asset library id: ${item.id}`);
    assetLibraryIds.add(item.id);

    const library = readLinkedJson(item.path, checks, failures, 'asset_library', item.id);
    const report = readLinkedJson(markdownReportToJsonPath(item.review_report), checks, warnings, 'asset_library_report', item.id, { optionalJson: true });
    if (library) {
      if (library.library_id !== item.id) failures.push(`asset library registry id mismatch: ${item.id} != ${library.library_id}`);
      if (library.status !== item.status) warnings.push(`asset library status mismatch for ${item.id}: registry=${item.status}, manifest=${library.status}`);
      if (library.storage_policy?.uploads_allowed === true) failures.push(`asset library ${item.id} allows uploads`);
      const publicAssets = (library.assets ?? []).filter((asset) => asset.public_use_allowed === true);
      if (publicAssets.length > 0 && library.rights_scope !== 'public_candidate') failures.push(`asset library ${item.id} has public assets outside public_candidate scope`);
    }
    if (report && report.status !== item.check_status) failures.push(`asset library check_status mismatch for ${item.id}: registry=${item.check_status}, report=${report.status}`);
    if (item.check_status !== 'passed') failures.push(`asset library ${item.id} is not passed`);
  }

  for (const pilot of registry.reference_pilots ?? []) {
    if (!pilot.id || !pilot.status || !pilot.registry_role) failures.push(`reference pilot is missing id/status/registry_role`);
    if (pilot.id === 'kapelle-sogn-benedetg' && !draftIds.has('kapelle-sogn-benedetg')) {
      failures.push('kapelle-sogn-benedetg pilot has no matching entry draft');
    }
  }

  const status = failures.length > 0 ? 'failed' : warnings.length > 0 ? 'passed_with_warnings' : 'passed';
  return {
    checked_at: new Date().toISOString(),
    registry_path: relative(root, registryPath),
    status,
    summary: {
      source_packages: registry.source_packages?.length ?? 0,
      entry_drafts: registry.entry_drafts?.length ?? 0,
      asset_libraries: registry.asset_libraries?.length ?? 0,
      reference_pilots: registry.reference_pilots?.length ?? 0,
      checks: checks.length,
      failures: failures.length,
      warnings: warnings.length
    },
    checks,
    failures,
    warnings
  };
}

function validateRegistryItem(item, kind, failures) {
  for (const field of ['id', 'title', 'path', 'status', 'check_status', 'role']) {
    if (item[field] === undefined || item[field] === null || item[field] === '') failures.push(`${kind} missing ${field}`);
  }
  if (item.path && !existsSync(resolve(root, item.path))) failures.push(`${kind} path missing for ${item.id}: ${item.path}`);
  if (item.review_report && !existsSync(resolve(root, item.review_report))) failures.push(`${kind} review_report missing for ${item.id}: ${item.review_report}`);
}

function readLinkedJson(path, checks, issues, kind, id, options = {}) {
  if (!path) return null;
  const resolved = resolve(root, path);
  if (!existsSync(resolved)) {
    if (!options.optionalJson) issues.push(`${kind} JSON missing for ${id}: ${path}`);
    return null;
  }
  try {
    const json = readJson(resolved);
    checks.push({ kind, id, path, status: 'read_json' });
    return json;
  } catch (error) {
    issues.push(`${kind} JSON parse failed for ${id}: ${path}: ${error.message}`);
    return null;
  }
}

function markdownReportToJsonPath(markdownPath) {
  if (!markdownPath) return null;
  return markdownPath.replace(/\.md$/, '.json');
}

function pathEndsWithSourcePackage(path, sourcePackageId) {
  return path.includes(sourcePackageId) && path.endsWith('source-package.json');
}

function renderMarkdown(result) {
  const lines = [];
  lines.push('# KosmoReferences Registry Check');
  lines.push('');
  lines.push(`Generated: ${result.checked_at}`);
  lines.push(`Registry: \`${result.registry_path}\``);
  lines.push(`Status: \`${result.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Source packages: ${result.summary.source_packages}`);
  lines.push(`- Entry drafts: ${result.summary.entry_drafts}`);
  lines.push(`- Asset libraries: ${result.summary.asset_libraries}`);
  lines.push(`- Reference pilots: ${result.summary.reference_pilots}`);
  lines.push(`- Checks: ${result.summary.checks}`);
  lines.push(`- Failures: ${result.summary.failures}`);
  lines.push(`- Warnings: ${result.summary.warnings}`);
  lines.push('');
  lines.push('## Linked JSON Checks');
  lines.push('');
  for (const check of result.checks) {
    lines.push(`- \`${check.kind}:${check.id}\` -> \`${check.status}\``);
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
  return `${lines.join('\n')}\n`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function requireArray(value, failures, message) {
  if (!Array.isArray(value)) failures.push(message);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
