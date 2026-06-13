#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const registryPath = resolve(root, readArg('--registry') ?? 'data/kosmoreferences-registry.json');
const provenancePath = resolve(root, readArg('--provenance') ?? 'examples/kosmo-references/provenance/review/provenance-check.generated.json');
const sourcePackagesRoot = resolve(root, readArg('--source-packages-root') ?? 'examples/kosmo-references/source-packages');
const privateLibraryPath = resolve(root, readArg('--private-library') ?? 'data/kosmoreferences-private-library-diagnostic-2026-06-13.json');
const modelBridgePath = resolve(root, readArg('--model-bridge') ?? 'examples/kosmo-references/provenance/model-provenance-bridge-2026-06-13.json');
const modelPromotionPath = resolve(root, readArg('--model-promotion') ?? 'examples/kosmo-references/provenance/model-promotion-dry-run-2026-06-13.json');
const ownerReviewPath = resolve(root, readArg('--owner-review') ?? 'examples/kosmo-references/provenance/owner-review-decision-pack-2026-06-13-review/owner-review-decision-check.generated.json');
const outputPath = resolve(root, readArg('--out') ?? 'data/kosmoreferences-data-lane-status.json');
const markdownPath = outputPath.replace(/\.json$/, '.md');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const registry = readJson(registryPath);
  const provenance = readJson(provenancePath);
  const linkReports = readSourceLinkReports(sourcePackagesRoot);
  const status = buildStatus(registry, provenance, {
    linkReports,
    privateLibrary: readOptionalJson(privateLibraryPath),
    modelBridge: readOptionalJson(modelBridgePath),
    modelPromotion: readOptionalJson(modelPromotionPath),
    ownerReview: readOptionalJson(ownerReviewPath)
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(status, null, 2)}\n`);
  await writeFile(markdownPath, renderMarkdown(status));

  console.log('KosmoReferences data-lane status card');
  console.log(`Registry: ${relative(root, registryPath)}`);
  console.log(`Provenance: ${relative(root, provenancePath)}`);
  console.log(`Status: ${status.status}`);
  console.log(`Pilots: ${status.summary.pilots}`);
  console.log(`Source packages: ${status.summary.source_packages}`);
  console.log(`Source links: ${status.summary.source_links_reachable}/${status.summary.source_links}`);
  console.log(`Entry drafts: ${status.summary.entry_drafts}`);
  console.log(`Public-ready assets: ${status.summary.public_ready_assets}`);
  console.log(`Blocked public promotions: ${status.summary.blocked_public_promotions}`);
  console.log(`Owner review: ${status.extended_checks.owner_review.status}`);
  console.log(`Private library: ${status.extended_checks.private_library.status}`);
  console.log(`Wrote: ${relative(root, outputPath)}`);
}

function buildStatus(registry, provenance, extra) {
  const sourcePackageById = new Map((registry.source_packages ?? []).map((item) => [item.id, item]));
  const entryById = new Map((registry.entry_drafts ?? []).map((item) => [item.id, item]));
  const provenanceEntryById = new Map((provenance.entry_drafts ?? []).map((item) => [item.id, item]));
  const linkReportByPackageId = new Map(extra.linkReports.map((item) => [item.package_id, item]));
  const sourceLinkSummary = summarizeSourceLinks(extra.linkReports);
  const privateLibrary = summarizePrivateLibrary(extra.privateLibrary);
  const modelReview = summarizeModelReview(extra.modelBridge);
  const modelPromotion = summarizeModelPromotion(extra.modelPromotion);
  const ownerReview = summarizeOwnerReview(extra.ownerReview);

  const pilots = (registry.reference_pilots ?? []).map((pilot) => {
    const entry = entryById.get(pilot.id);
    const sourcePackage = entry ? sourcePackageById.get(entry.source_package_id) : null;
    const provenanceEntry = provenanceEntryById.get(pilot.id);
    const linkReport = sourcePackage ? linkReportByPackageId.get(sourcePackage.id) : null;
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
        check_status: sourcePackage.check_status,
        links: linkReport ? {
          status: linkReport.status,
          reachable: linkReport.summary?.reachable ?? 0,
          total: linkReport.summary?.links ?? 0,
          warnings: linkReport.summary?.warnings ?? 0
        } : null
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
      provenance: relative(root, provenancePath),
      source_packages_root: relative(root, sourcePackagesRoot),
      private_library: relative(root, privateLibraryPath),
      model_bridge: relative(root, modelBridgePath),
      model_promotion: relative(root, modelPromotionPath),
      owner_review: relative(root, ownerReviewPath)
    },
    summary: {
      pilots: pilots.length,
      source_packages: registry.source_packages?.length ?? 0,
      source_links: sourceLinkSummary.links,
      source_links_reachable: sourceLinkSummary.reachable,
      source_link_warnings: sourceLinkSummary.warnings,
      entry_drafts: registry.entry_drafts?.length ?? 0,
      asset_libraries: registry.asset_libraries?.length ?? 0,
      library_assets: provenance.summary?.library_assets ?? 0,
      public_ready_assets: provenance.summary?.public_ready_assets ?? 0,
      blocked_public_promotions: provenance.summary?.blocked_public_promotions ?? 0,
      private_library_status: privateLibrary.status,
      private_library_book_like_files: privateLibrary.book_like_files,
      model_review_average: modelReview.average_score,
      owner_review_decision_items: ownerReview.decision_items,
      owner_review_public_ready_now: ownerReview.public_ready_now
    },
    checks: {
      registry: 'passed',
      provenance: provenance.status,
      failures: provenance.summary?.failures ?? 0,
      warnings: provenance.summary?.warnings ?? 0
    },
    extended_checks: {
      source_links: sourceLinkSummary,
      private_library: privateLibrary,
      model_review: modelReview,
      model_promotion: modelPromotion,
      owner_review: ownerReview
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
  lines.push(`- Source links reachable: ${status.summary.source_links_reachable}/${status.summary.source_links}`);
  lines.push(`- Entry drafts: ${status.summary.entry_drafts}`);
  lines.push(`- Asset libraries: ${status.summary.asset_libraries}`);
  lines.push(`- Library assets: ${status.summary.library_assets}`);
  lines.push(`- Public-ready assets: ${status.summary.public_ready_assets}`);
  lines.push(`- Blocked public promotions: ${status.summary.blocked_public_promotions}`);
  lines.push(`- Private library: ${status.summary.private_library_status} (${status.summary.private_library_book_like_files} book-like files visible)`);
  lines.push(`- Model review average: ${status.summary.model_review_average}`);
  lines.push(`- Owner-review decisions: ${status.summary.owner_review_decision_items}`);
  lines.push(`- Owner-review public-ready now: ${status.summary.owner_review_public_ready_now}`);
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

function readOptionalJson(path) {
  return existsSync(path) ? readJson(path) : null;
}

function readSourceLinkReports(start) {
  if (!existsSync(start)) return [];
  return collectFiles(start)
    .filter((path) => path.endsWith('/source-package-link-check.generated.json'))
    .map(readJson);
}

function collectFiles(start) {
  const files = [];
  const stack = [start];
  while (stack.length > 0) {
    const current = stack.pop();
    let info;
    try {
      info = statSync(current);
    } catch {
      continue;
    }
    if (info.isDirectory()) {
      for (const entry of readdirSync(current)) stack.push(`${current}/${entry}`);
    } else if (info.isFile()) {
      files.push(current);
    }
  }
  return files;
}

function summarizeSourceLinks(reports) {
  const summary = reports.reduce((acc, item) => {
    acc.reports += 1;
    acc.links += item.summary?.links ?? 0;
    acc.reachable += item.summary?.reachable ?? 0;
    acc.warnings += item.summary?.warnings ?? 0;
    if (item.status !== 'passed') acc.failed_reports += 1;
    return acc;
  }, { reports: 0, links: 0, reachable: 0, warnings: 0, failed_reports: 0 });
  return {
    ...summary,
    status: summary.failed_reports === 0 ? 'passed' : 'needs_review',
    copied_content: false
  };
}

function summarizePrivateLibrary(report) {
  return {
    status: report?.status ?? 'missing_report',
    roots: report?.summary?.roots ?? 0,
    existing_roots: report?.summary?.existing_roots ?? 0,
    own_mount_roots: report?.summary?.own_mount_roots ?? 0,
    book_like_files: report?.summary?.book_like_files ?? 0,
    target_filename_matches: report?.summary?.target_filename_matches ?? 0,
    archive_mount_visible: report?.summary?.archive_mount_visible ?? false,
    copied_private_content: report?.policy?.copied_private_content ?? false
  };
}

function summarizeModelReview(report) {
  return {
    status: report?.status ?? 'missing_report',
    reviewed: report?.summary?.reviewed ?? 0,
    ready_for_promote_review: report?.summary?.ready_for_promote_review ?? 0,
    average_score: report?.summary?.average_score ?? null,
    public_ready: report?.policy?.public_ready ?? false
  };
}

function summarizeModelPromotion(report) {
  return {
    status: report?.status ?? 'missing_report',
    entries: report?.summary?.entries ?? 0,
    ready_for_owner_confirmation: report?.summary?.ready_for_owner_confirmation ?? 0,
    public_promoted: report?.summary?.public_promoted ?? 0,
    failed_checks: report?.summary?.failed_checks ?? 0,
    writes_public_files: report?.policy?.writes_public_files ?? false
  };
}

function summarizeOwnerReview(report) {
  return {
    status: report?.status ?? 'missing_report',
    decision_groups: report?.summary?.decision_groups ?? 0,
    decision_items: report?.summary?.decision_items ?? 0,
    public_ready_now: report?.summary?.public_ready_now ?? 0,
    confirm_commands_after_review: report?.summary?.confirm_commands_after_review ?? 0,
    failures: report?.summary?.failures ?? 0,
    warnings: report?.summary?.warnings ?? 0,
    auto_promote_allowed: report?.policy?.auto_promote_allowed ?? false
  };
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
