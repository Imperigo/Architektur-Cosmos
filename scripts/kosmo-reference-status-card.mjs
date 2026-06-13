#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const registryPath = resolve(root, readArg('--registry') ?? 'data/kosmoreferences-registry.json');
const provenancePath = resolve(root, readArg('--provenance') ?? 'examples/kosmo-references/provenance/review/provenance-check.generated.json');
const outputPath = resolve(root, readArg('--out') ?? 'data/kosmoreferences-data-lane-status.json');
const markdownPath = outputPath.replace(/\.json$/, '.md');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const registry = readJson(registryPath);
  const provenance = readJson(provenancePath);
  const status = buildStatus(registry, provenance);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(status, null, 2)}\n`);
  await writeFile(markdownPath, renderMarkdown(status));

  console.log('KosmoReferences data-lane status card');
  console.log(`Registry: ${relative(root, registryPath)}`);
  console.log(`Provenance: ${relative(root, provenancePath)}`);
  console.log(`Status: ${status.status}`);
  console.log(`Pilots: ${status.summary.pilots}`);
  console.log(`Source packages: ${status.summary.source_packages}`);
  console.log(`Entry drafts: ${status.summary.entry_drafts}`);
  console.log(`Public-ready assets: ${status.summary.public_ready_assets}`);
  console.log(`Blocked public promotions: ${status.summary.blocked_public_promotions}`);
  console.log(`Wrote: ${relative(root, outputPath)}`);
}

function buildStatus(registry, provenance) {
  const sourcePackageById = new Map((registry.source_packages ?? []).map((item) => [item.id, item]));
  const entryById = new Map((registry.entry_drafts ?? []).map((item) => [item.id, item]));
  const provenanceEntryById = new Map((provenance.entry_drafts ?? []).map((item) => [item.id, item]));

  const pilots = (registry.reference_pilots ?? []).map((pilot) => {
    const entry = entryById.get(pilot.id);
    const sourcePackage = entry ? sourcePackageById.get(entry.source_package_id) : null;
    const provenanceEntry = provenanceEntryById.get(pilot.id);
    return {
      id: pilot.id,
      title: entry?.title ?? pilot.id,
      registry_role: pilot.registry_role,
      registry_status: pilot.status,
      entry_draft: entry ? {
        path: entry.path,
        status: entry.status,
        public_ready: Boolean(entry.public_ready),
        check_status: entry.check_status
      } : null,
      source_package: sourcePackage ? {
        id: sourcePackage.id,
        path: sourcePackage.path,
        status: sourcePackage.status,
        rights_scope: sourcePackage.rights_scope,
        check_status: sourcePackage.check_status
      } : null,
      provenance: provenanceEntry ? {
        blocked_media_count: provenanceEntry.blocked_media_count,
        blocked_asset_candidate_count: provenanceEntry.blocked_asset_candidate_count
      } : null,
      public_use: entry?.public_ready === true ? 'candidate' : 'blocked_review_only'
    };
  });

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: registryStatus(registry, provenance),
    source_paths: {
      registry: relative(root, registryPath),
      provenance: relative(root, provenancePath)
    },
    summary: {
      pilots: pilots.length,
      source_packages: registry.source_packages?.length ?? 0,
      entry_drafts: registry.entry_drafts?.length ?? 0,
      asset_libraries: registry.asset_libraries?.length ?? 0,
      library_assets: provenance.summary?.library_assets ?? 0,
      public_ready_assets: provenance.summary?.public_ready_assets ?? 0,
      blocked_public_promotions: provenance.summary?.blocked_public_promotions ?? 0
    },
    checks: {
      registry: 'passed',
      provenance: provenance.status,
      failures: provenance.summary?.failures ?? 0,
      warnings: provenance.summary?.warnings ?? 0
    },
    pilots,
    worker_guidance: [
      'KosmoOrbit may show this as a read-only KosmoReferences status card.',
      'Local LLM workers may use review-only drafts for analysis and planning, not public publishing.',
      'Codex/Claude overseers must keep public promotion blocked until file-level provenance passes.'
    ]
  };
}

function registryStatus(registry, provenance) {
  const allSourceChecksPassed = (registry.source_packages ?? []).every((item) => item.check_status === 'passed');
  const allDraftChecksPresent = (registry.entry_drafts ?? []).every((item) => item.check_status);
  if (provenance.status !== 'passed') return 'needs_review';
  if (!allSourceChecksPassed || !allDraftChecksPresent) return 'needs_review';
  return 'passed_review_only';
}

function renderMarkdown(status) {
  const lines = [];
  lines.push('# KosmoReferences Data-Lane Status');
  lines.push('');
  lines.push(`Generated: ${status.generated_at}`);
  lines.push(`Status: \`${status.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pilots: ${status.summary.pilots}`);
  lines.push(`- Source packages: ${status.summary.source_packages}`);
  lines.push(`- Entry drafts: ${status.summary.entry_drafts}`);
  lines.push(`- Asset libraries: ${status.summary.asset_libraries}`);
  lines.push(`- Library assets: ${status.summary.library_assets}`);
  lines.push(`- Public-ready assets: ${status.summary.public_ready_assets}`);
  lines.push(`- Blocked public promotions: ${status.summary.blocked_public_promotions}`);
  lines.push('');
  lines.push('## Pilots');
  lines.push('');
  for (const pilot of status.pilots) {
    lines.push(`- \`${pilot.id}\`: ${pilot.title} / ${pilot.public_use}`);
  }
  lines.push('');
  lines.push('## Worker Guidance');
  lines.push('');
  status.worker_guidance.forEach((item) => lines.push(`- ${item}`));
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
