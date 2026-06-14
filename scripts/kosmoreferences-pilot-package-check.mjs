#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const registryPath = resolve(root, args.registry || 'data/kosmoreferences-registry.json');
const outputJson = resolve(root, args.out || `data/kosmoreferences-pilot-package-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmoreferences-pilot-package-check-${dateStamp}.md`);

const requiredPilots = [
  'villa-savoye',
  'kapelle-sogn-benedetg',
  'alterszentrum-kloster-ingenbohl'
];

const requiredMediaSlots = ['exterior', 'interior', 'plan', 'section'];
const requiredAnalysisFamilies = ['structure', 'material', 'typology_or_spatial'];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const registry = await readJson(registryPath);
  const checks = [];
  const pilotReports = [];
  const entryById = new Map((registry.entry_drafts || []).map((entry) => [entry.id, entry]));
  const sourcePackageById = new Map((registry.source_packages || []).map((sourcePackage) => [sourcePackage.id, sourcePackage]));

  for (const pilotId of requiredPilots) {
    const registryEntry = entryById.get(pilotId);
    const draft = registryEntry?.path ? await readJsonIfExists(registryEntry.path) : null;
    const sourcePackageRegistry = registryEntry?.source_package_id ? sourcePackageById.get(registryEntry.source_package_id) : null;
    const sourcePackage = sourcePackageRegistry?.path ? await readJsonIfExists(sourcePackageRegistry.path) : null;
    const pilotChecks = [
      check(`registry_entry:${pilotId}`, Boolean(registryEntry), 'Pilot must exist in registry entry_drafts.'),
      check(`registry_public_ready_false:${pilotId}`, registryEntry?.public_ready === false, 'Registry entry must keep public_ready=false.'),
      check(`draft_exists:${pilotId}`, Boolean(draft), 'Entry draft JSON must exist.'),
      check(`source_package_exists:${pilotId}`, Boolean(sourcePackage), 'Linked source package JSON must exist.'),
      check(`source_package_link_only:${pilotId}`, sourcePackageIsLinkOnly(sourcePackage), 'Source package must keep source files and extracted text non-public.'),
      check(`media_slots:${pilotId}`, hasRequiredMediaSlots(draft), 'Draft must include exterior, interior, plan and section slots.'),
      check(`source_candidates:${pilotId}`, (draft?.source_candidates || []).length > 0, 'Draft must include source candidates.'),
      check(`source_candidates_link_only:${pilotId}`, allSourceCandidatesLinkOnly(draft), 'All source candidates must stay link-only.'),
      check(`asset_candidates:${pilotId}`, (draft?.asset_candidates || []).length > 0, 'Draft must include asset candidates.'),
      check(`asset_candidates_private:${pilotId}`, allAssetCandidatesBlocked(draft), 'All asset candidates must keep public_display_allowed=false.'),
      check(`model_slots:${pilotId}`, (draft?.model_packages || []).length > 0, 'Draft must include model package slots.'),
      check(`analysis_fields:${pilotId}`, hasRequiredAnalysisFamilies(draft), 'Draft must include structure, material and typology/spatial analysis coverage.'),
      check(`review_only_status:${pilotId}`, draft?.ingestion_status?.stage === 'review_only_draft', 'Draft ingestion stage must remain review_only_draft.')
    ];
    checks.push(...pilotChecks);
    pilotReports.push({
      id: pilotId,
      title: draft?.title || registryEntry?.title || pilotId,
      registry_path: registryEntry?.path || null,
      source_package_id: registryEntry?.source_package_id || null,
      source_package_path: sourcePackageRegistry?.path || null,
      status: pilotChecks.every((item) => item.status === 'passed') ? 'pilot_package_review_only_complete' : 'pilot_package_needs_review',
      media_slots: (draft?.media || []).map((slot) => slot.type).sort(),
      source_candidates: draft?.source_candidates?.length || 0,
      asset_candidates: draft?.asset_candidates?.length || 0,
      model_packages: draft?.model_packages?.length || 0,
      analysis_layers: (draft?.analysis_layers || []).map((layer) => layer.analysis_type),
      public_ready: false,
      checks: pilotChecks
    });
  }

  const failures = checks.filter((item) => item.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'pilot_packages_review_only_complete' : 'pilot_packages_need_review',
    policy: {
      metadata_only: true,
      reads_private_content: false,
      copies_private_content: false,
      public_ready_after_check: 0,
      note: 'This check validates repo-visible pilot package metadata only. It does not fetch pages, read private libraries, OCR PDFs, copy media or promote public assets.'
    },
    source_refs: [relative(root, registryPath)],
    summary: {
      required_pilots: requiredPilots.length,
      complete_pilots: pilotReports.filter((pilot) => pilot.status === 'pilot_package_review_only_complete').length,
      checks: checks.length,
      failures: failures.length,
      public_ready_after_check: 0
    },
    pilots: pilotReports,
    failures,
    next_actions: failures.length === 0
      ? [
          'Use these three pilot packages as the review-only KosmoReferences Day-2 baseline.',
          'Keep source-dependent assets blocked until source-root, provenance and rights gates pass.',
          'Use the pilot package check before Orbit status bridge or local-worker conversion decisions.'
        ]
      : [
          'Fix failed pilot package checks before treating the three pilots as complete.',
          'Rerun npm run kosmo:pilot-package-check and npm run kosmo:day-batch-loop.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('KosmoReferences pilot package check');
  console.log(`Status: ${report.status}`);
  console.log(`Pilots: ${report.summary.complete_pilots}/${report.summary.required_pilots}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function sourcePackageIsLinkOnly(sourcePackage) {
  if (!sourcePackage) return false;
  return sourcePackage.public_policy?.source_files_public === false
    && sourcePackage.public_policy?.extracted_text_public === false
    && (sourcePackage.sources || []).every((source) => source.rights_status === 'link_only');
}

function hasRequiredMediaSlots(draft) {
  const slots = new Set((draft?.media || []).map((slot) => slot.type));
  return requiredMediaSlots.every((slot) => slots.has(slot));
}

function allSourceCandidatesLinkOnly(draft) {
  return (draft?.source_candidates || []).every((source) => source.rights_status === 'link_only');
}

function allAssetCandidatesBlocked(draft) {
  return (draft?.asset_candidates || []).every((asset) => asset.public_display_allowed === false);
}

function hasRequiredAnalysisFamilies(draft) {
  const analysis = (draft?.analysis_layers || []).map((layer) => `${layer.analysis_type} ${layer.summary || ''}`.toLowerCase());
  return requiredAnalysisFamilies.every((family) => {
    if (family === 'typology_or_spatial') return analysis.some((item) => item.includes('typo') || item.includes('spatial') || item.includes('raum'));
    return analysis.some((item) => item.includes(family));
  });
}

function check(id, condition, message) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    message
  };
}

async function readJsonIfExists(path) {
  const resolved = resolve(root, path);
  if (!existsSync(resolved)) return null;
  return readJson(resolved);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoReferences Pilot Package Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pilots complete: ${report.summary.complete_pilots}/${report.summary.required_pilots}`);
  lines.push(`- Checks: ${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Pilots');
  lines.push('');
  lines.push('| Pilot | Status | Media | Sources | Assets | Models | Analysis |');
  lines.push('| --- | --- | --- | ---: | ---: | ---: | --- |');
  for (const pilot of report.pilots) {
    lines.push(`| ${pilot.title} | ${pilot.status} | ${pilot.media_slots.join(', ')} | ${pilot.source_candidates} | ${pilot.asset_candidates} | ${pilot.model_packages} | ${pilot.analysis_layers.join(', ')} |`);
  }
  if (report.failures.length > 0) {
    lines.push('');
    lines.push('## Failures');
    lines.push('');
    report.failures.forEach((failure) => lines.push(`- \`${failure.id}\`: ${failure.message}`));
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('All pilot packages remain review-only. This check does not approve public display or copy private source content.');
  lines.push('');
  return lines.join('\n');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
