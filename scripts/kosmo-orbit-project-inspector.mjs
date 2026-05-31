#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const manifestPath = resolve(projectRoot, args.manifest || 'kosmo.project.json');
const outputJsonPath = resolve(projectRoot, args.output || 'orbit/project-inspector.generated.json');
const outputMdPath = resolve(projectRoot, args.markdown || 'orbit/project-inspector.generated.md');

const moduleOrder = ['prepare', 'data', 'orbit', 'design', 'draw', 'viz', 'publish', 'zentrale'];
const safePublicRights = new Set(['public_safe']);
const reviewNeededRights = new Set(['generated_needs_review', 'unknown']);
const blockedRights = new Set(['blocked']);
const gateModeRank = {
  disabled: 0,
  requires_human_approval: 1,
  approved: 2
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(manifestPath)) throw new Error(`Kosmo project manifest not found: ${manifestPath}`);

  const manifest = readJson(manifestPath);
  const report = buildReport(manifest);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit project inspector generated');
  console.log(`Project: ${report.project.name}`);
  console.log(`Status: ${report.status}`);
  console.log(`Modules: ${report.summary.module_count}`);
  console.log(`Artifacts: ${report.summary.artifact_count}`);
  console.log(`Missing artifacts: ${report.summary.missing_artifact_count}`);
  console.log(`Review artifacts: ${report.summary.review_artifact_count}`);
  console.log(`Disabled gates: ${report.summary.disabled_gate_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.summary.missing_required_path_count > 0) process.exit(1);
}

function buildReport(manifest) {
  const packagePaths = inspectPackagePaths(manifest.package_paths || {});
  const inputRows = inspectArtifacts('input', manifest.inputs || []);
  const outputRows = inspectArtifacts('output', manifest.outputs || []);
  const artifacts = [...inputRows, ...outputRows];
  const modules = inspectModules(manifest, artifacts, packagePaths);
  const reviewGates = inspectReviewGates(manifest.review_gates || {});
  const missingArtifacts = artifacts.filter((artifact) => !artifact.exists);
  const reviewArtifacts = artifacts.filter((artifact) => artifact.needs_review);
  const blockedArtifacts = artifacts.filter((artifact) => artifact.blocked);
  const disabledGates = reviewGates.filter((gate) => gate.mode === 'disabled');
  const approvalGates = reviewGates.filter((gate) => gate.mode === 'requires_human_approval');
  const missingRequiredPaths = packagePaths.filter((item) => !item.exists || !item.is_directory);

  const summary = {
    module_count: modules.length,
    artifact_count: artifacts.length,
    input_count: inputRows.length,
    output_count: outputRows.length,
    missing_artifact_count: missingArtifacts.length,
    review_artifact_count: reviewArtifacts.length,
    blocked_artifact_count: blockedArtifacts.length,
    disabled_gate_count: disabledGates.length,
    approval_gate_count: approvalGates.length,
    missing_required_path_count: missingRequiredPaths.length,
    modules_by_status: countBy(modules.map((module) => module.status)),
    artifacts_by_rights: countBy(artifacts.map((artifact) => artifact.rights_status)),
    gates_by_mode: countBy(reviewGates.map((gate) => gate.mode))
  };

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-project-inspector',
    project_root: relative(root, projectRoot),
    manifest_path: relative(root, manifestPath),
    status: reportStatus({ summary, reviewGates }),
    policy: {
      review_only: true,
      no_uploads: true,
      no_public_publish: true,
      does_not_modify_project_package: true
    },
    project: {
      id: manifest.project_id || null,
      name: manifest.name || null,
      package_status: manifest.status || null,
      risk_level: manifest.risk_level || null,
      created_at: manifest.created_at || null,
      updated_at: manifest.updated_at || null,
      site: manifest.site || null
    },
    summary,
    package_paths: packagePaths,
    modules,
    artifacts,
    review_gates: reviewGates,
    next_actions: nextActions({ summary, modules, artifacts, reviewGates })
  };
}

function inspectPackagePaths(paths) {
  return Object.entries(paths).map(([id, pathname]) => {
    const safe = isSafeRelativePath(pathname);
    const absolute = safe ? join(projectRoot, pathname) : null;
    const exists = Boolean(absolute && existsSync(absolute));
    return {
      id,
      path: pathname,
      safe,
      exists,
      is_directory: Boolean(exists && statSync(absolute).isDirectory())
    };
  });
}

function inspectArtifacts(kind, artifacts) {
  return asArray(artifacts).map((artifact, index) => {
    const safe = isSafeRelativePath(artifact?.path);
    const absolute = safe ? join(projectRoot, artifact.path) : null;
    const exists = Boolean(absolute && existsSync(absolute));
    const stats = exists ? statSync(absolute) : null;
    return {
      id: `${kind}-${index + 1}`,
      kind,
      path: artifact?.path || null,
      safe,
      exists,
      bytes: stats?.isFile() ? stats.size : null,
      type: artifact?.type || null,
      module: artifact?.module || null,
      rights_status: artifact?.rights_status || 'unknown',
      needs_review: reviewNeededRights.has(artifact?.rights_status),
      public_safe: safePublicRights.has(artifact?.rights_status),
      blocked: blockedRights.has(artifact?.rights_status),
      description: artifact?.description || null
    };
  });
}

function inspectModules(manifest, artifacts, packagePaths) {
  return moduleOrder.map((id) => {
    const state = manifest.modules?.[id] || {};
    const moduleArtifacts = artifacts.filter((artifact) => artifact.module === id);
    const modulePath = packagePaths.find((item) => item.id === id || (id === 'prepare' && item.id === 'brief'));
    return {
      id,
      status: state.status || 'missing',
      owner: state.owner || null,
      summary: state.summary || null,
      last_run_at: state.last_run_at || null,
      package_path: modulePath?.path || null,
      package_path_exists: Boolean(modulePath?.exists && modulePath?.is_directory),
      artifact_count: moduleArtifacts.length,
      missing_artifact_count: moduleArtifacts.filter((artifact) => !artifact.exists).length,
      review_artifact_count: moduleArtifacts.filter((artifact) => artifact.needs_review).length,
      blocked_artifact_count: moduleArtifacts.filter((artifact) => artifact.blocked).length,
      readiness: moduleReadiness(state.status, moduleArtifacts)
    };
  });
}

function inspectReviewGates(gates) {
  return Object.entries(gates).map(([id, gate]) => ({
    id,
    mode: gate?.mode || 'missing',
    reason: gate?.reason || null,
    approved_by: gate?.approved_by || null,
    approved_at: gate?.approved_at || null,
    severity: gateSeverity(gate?.mode),
    rank: gateModeRank[gate?.mode] ?? -1
  }));
}

function moduleReadiness(status, artifacts) {
  if (status === 'blocked') return 'blocked';
  if (artifacts.some((artifact) => artifact.blocked)) return 'blocked_by_artifact';
  if (artifacts.some((artifact) => !artifact.exists)) return 'missing_artifacts';
  if (artifacts.some((artifact) => artifact.needs_review)) return 'review_required';
  if (status === 'approved') return 'approved';
  if (status === 'review_ready') return 'review_ready';
  if (status === 'in_progress') return 'in_progress';
  return status || 'unknown';
}

function gateSeverity(mode) {
  if (mode === 'disabled') return 'red';
  if (mode === 'requires_human_approval') return 'yellow';
  if (mode === 'approved') return 'green';
  return 'yellow';
}

function reportStatus({ summary, reviewGates }) {
  if (summary.missing_required_path_count > 0) return 'package_paths_missing';
  if (summary.missing_artifact_count > 0) return 'artifacts_missing';
  if (reviewGates.some((gate) => gate.id === 'public_release' && gate.mode === 'disabled')) return 'local_review_only';
  if (summary.review_artifact_count > 0 || summary.approval_gate_count > 0) return 'review_required';
  return 'ready';
}

function nextActions({ summary, modules, artifacts, reviewGates }) {
  const actions = [];
  if (summary.missing_required_path_count > 0) actions.push('Create or restore missing package folders before using this package downstream.');
  if (summary.missing_artifact_count > 0) actions.push('Regenerate or remove missing artifact references from kosmo.project.json.');
  if (artifacts.some((artifact) => artifact.rights_status === 'generated_needs_review')) {
    actions.push('Keep generated outputs local until human review records source, geometry, plan and visualization quality.');
  }
  if (modules.some((module) => module.id === 'design' && module.readiness === 'review_required')) {
    actions.push('Use KosmoOrbit to surface the design review gates before opening a KosmoDesign handoff.');
  }
  if (reviewGates.some((gate) => gate.id === 'public_release' && gate.mode === 'disabled')) {
    actions.push('Keep public release disabled; this package is a local review package, not a publishable client/public package.');
  }
  if (reviewGates.some((gate) => gate.id === 'paid_cloud_job' && gate.mode === 'requires_human_approval')) {
    actions.push('Require explicit approval before any paid cloud/GPU job is started from this project.');
  }
  if (!actions.length) actions.push('Project package is ready for a first Orbit UI inspector.');
  return actions;
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Project Package Inspector',
    '',
    `Project: \`${report.project.name}\``,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Risk level: \`${report.project.risk_level}\``,
    `Manifest: \`${report.manifest_path}\``,
    '',
    'Review-only. This inspector reads the project package and writes this report only. It does not start tools, upload files, publish data or approve gates.',
    '',
    '## Summary',
    '',
    `- modules: ${report.summary.module_count}`,
    `- artifacts: ${report.summary.artifact_count}`,
    `- inputs: ${report.summary.input_count}`,
    `- outputs: ${report.summary.output_count}`,
    `- missing artifacts: ${report.summary.missing_artifact_count}`,
    `- review artifacts: ${report.summary.review_artifact_count}`,
    `- disabled gates: ${report.summary.disabled_gate_count}`,
    `- approval gates: ${report.summary.approval_gate_count}`,
    '',
    '## Site',
    '',
    `- address: ${report.project.site?.address || '-'}`,
    `- locality: ${report.project.site?.locality || '-'}`,
    `- country: ${report.project.site?.country || '-'}`,
    `- coordinates: ${report.project.site?.latitude ?? '-'}, ${report.project.site?.longitude ?? '-'}`,
    '',
    '## Modules',
    '',
    '| Module | Status | Readiness | Owner | Artifacts | Review | Missing |',
    '| --- | --- | --- | --- | ---: | ---: | ---: |'
  ];

  for (const module of report.modules) {
    lines.push(`| ${module.id} | \`${module.status}\` | \`${module.readiness}\` | ${escapePipe(module.owner || '-')} | ${module.artifact_count} | ${module.review_artifact_count} | ${module.missing_artifact_count} |`);
  }

  lines.push('', '## Package Paths', '', '| Area | Path | Status |', '| --- | --- | --- |');
  for (const item of report.package_paths) {
    lines.push(`| ${item.id} | \`${item.path}\` | ${item.exists && item.is_directory ? 'ok' : 'missing'} |`);
  }

  lines.push('', '## Review Gates', '', '| Gate | Mode | Severity | Approved by | Reason |', '| --- | --- | --- | --- | --- |');
  for (const gate of report.review_gates) {
    lines.push(`| ${gate.id} | \`${gate.mode}\` | \`${gate.severity}\` | ${escapePipe(gate.approved_by || '-')} | ${escapePipe(gate.reason || '-')} |`);
  }

  lines.push('', '## Artifacts', '', '| Kind | Module | Path | Rights | Exists | Review |', '| --- | --- | --- | --- | --- | --- |');
  for (const artifact of report.artifacts) {
    lines.push(`| ${artifact.kind} | ${artifact.module || '-'} | \`${artifact.path}\` | \`${artifact.rights_status}\` | ${artifact.exists ? 'yes' : 'no'} | ${artifact.needs_review ? 'yes' : 'no'} |`);
  }

  lines.push('', '## Next Actions', '');
  for (const action of report.next_actions) lines.push(`- ${action}`);

  return `${lines.join('\n')}\n`;
}

function isSafeRelativePath(pathname) {
  return Boolean(pathname && !pathname.startsWith('/') && !pathname.match(/^[A-Za-z]:/) && !pathname.includes('..'));
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
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
