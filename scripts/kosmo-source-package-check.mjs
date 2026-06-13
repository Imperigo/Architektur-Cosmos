#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultPackage = 'examples/kosmo-references/source-packages/codex-markitdown-smoke-2026-06-13/source-package.json';
const requiredGates = new Set([
  'source_integrity',
  'rights',
  'text_quality',
  'layout_quality',
  'entry_mapping',
  'asset_mapping',
  'public_private_split'
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const packagePath = resolve(rootDir, readArg('--package') ?? defaultPackage);
  const outputDir = resolve(rootDir, readArg('--out') ?? join(dirname(relative(rootDir, packagePath)), 'review'));
  const strictArtifacts = hasFlag('--strict-artifacts');
  const manifest = JSON.parse(await readFile(packagePath, 'utf8'));
  const result = await checkPackage(manifest, packagePath, { strictArtifacts });

  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'source-package-check.generated.json'), `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(join(outputDir, 'source-package-check.generated.md'), renderMarkdown(result));

  console.log('KosmoReferences source package check');
  console.log(`Package: ${relative(rootDir, packagePath)}`);
  console.log(`Status: ${result.status}`);
  console.log(`Sources: ${result.summary.sources}`);
  console.log(`Artifacts: ${result.summary.extraction_artifacts}`);
  console.log(`Candidates: ${result.summary.candidate_projects}`);
  console.log(`Failures: ${result.failures.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  console.log(`Wrote: ${relative(rootDir, join(outputDir, 'source-package-check.generated.md'))}`);

  if (result.failures.length > 0) {
    process.exitCode = 1;
  }
}

async function checkPackage(manifest, packagePath, options) {
  const failures = [];
  const warnings = [];
  const checks = [];

  requireValue(manifest.schema_version === '0.1', failures, 'schema_version must be 0.1');
  requireText(manifest.package_id, failures, 'package_id is required');
  requireText(manifest.title, failures, 'title is required');
  requireText(manifest.status, failures, 'status is required');
  requireText(manifest.rights_scope, failures, 'rights_scope is required');
  requireText(manifest.source_kind, failures, 'source_kind is required');
  requireArray(manifest.sources, failures, 'sources must be an array');
  requireArray(manifest.extraction_artifacts, failures, 'extraction_artifacts must be an array');
  requireArray(manifest.candidate_projects, failures, 'candidate_projects must be an array');
  requireArray(manifest.review_gates, failures, 'review_gates must be an array');

  if (manifest.public_policy) {
    if (manifest.public_policy.source_files_public === true && manifest.rights_scope !== 'public_candidate') {
      failures.push('source_files_public=true requires rights_scope=public_candidate');
    }
    if (manifest.public_policy.extracted_text_public === true && manifest.rights_scope === 'private_research') {
      failures.push('private_research package cannot expose extracted_text_public=true');
    }
  } else {
    failures.push('public_policy is required');
  }

  const sourceIds = new Set();
  for (const source of manifest.sources ?? []) {
    validateId(source.id, failures, `source id ${source.id ?? '<missing>'}`);
    if (sourceIds.has(source.id)) failures.push(`duplicate source id: ${source.id}`);
    sourceIds.add(source.id);
    requireText(source.path, failures, `source ${source.id} path is required`);
    requireHash(source.sha256, failures, `source ${source.id} sha256 must be a SHA-256 hex digest`);
    requireInteger(source.bytes, failures, `source ${source.id} bytes must be an integer`);

    const fileResult = await verifyFile(source.path, source.sha256, source.bytes);
    checks.push({
      kind: 'source',
      id: source.id,
      path: source.path,
      ...fileResult
    });
    if (fileResult.status === 'missing') {
      failures.push(`source file missing: ${source.id} -> ${source.path}`);
    } else if (fileResult.status === 'hash_mismatch' || fileResult.status === 'size_mismatch') {
      failures.push(`source integrity failed: ${source.id} -> ${fileResult.status}`);
    }
  }

  const artifactIds = new Set();
  for (const artifact of manifest.extraction_artifacts ?? []) {
    validateId(artifact.id, failures, `artifact id ${artifact.id ?? '<missing>'}`);
    if (artifactIds.has(artifact.id)) failures.push(`duplicate artifact id: ${artifact.id}`);
    artifactIds.add(artifact.id);
    if (!sourceIds.has(artifact.source_id)) failures.push(`artifact ${artifact.id} references unknown source_id: ${artifact.source_id}`);
    requireText(artifact.path, failures, `artifact ${artifact.id} path is required`);
    requireHash(artifact.sha256, failures, `artifact ${artifact.id} sha256 must be a SHA-256 hex digest`);
    requireInteger(artifact.bytes, failures, `artifact ${artifact.id} bytes must be an integer`);

    const fileResult = await verifyFile(artifact.path, artifact.sha256, artifact.bytes);
    checks.push({
      kind: 'artifact',
      id: artifact.id,
      path: artifact.path,
      ...fileResult
    });
    if (fileResult.status === 'missing') {
      const message = `artifact file missing: ${artifact.id} -> ${artifact.path}`;
      if (options.strictArtifacts) failures.push(message);
      else warnings.push(message);
    } else if (fileResult.status === 'hash_mismatch' || fileResult.status === 'size_mismatch') {
      failures.push(`artifact integrity failed: ${artifact.id} -> ${fileResult.status}`);
    }
  }

  for (const candidate of manifest.candidate_projects ?? []) {
    validateId(candidate.id, failures, `candidate id ${candidate.id ?? '<missing>'}`);
    requireText(candidate.title, failures, `candidate ${candidate.id} title is required`);
    if (typeof candidate.confidence !== 'number' || candidate.confidence < 0 || candidate.confidence > 1) {
      failures.push(`candidate ${candidate.id} confidence must be between 0 and 1`);
    }
    if (!Array.isArray(candidate.evidence) || candidate.evidence.length === 0) {
      warnings.push(`candidate ${candidate.id} should include evidence`);
    }
  }

  const gateIds = new Set();
  for (const gate of manifest.review_gates ?? []) {
    gateIds.add(gate.id);
    if (!requiredGates.has(gate.id)) failures.push(`unknown review gate: ${gate.id}`);
    requireText(gate.status, failures, `gate ${gate.id} status is required`);
    requireText(gate.notes, failures, `gate ${gate.id} notes are required`);
  }
  for (const gate of requiredGates) {
    if (!gateIds.has(gate)) warnings.push(`missing recommended review gate: ${gate}`);
  }

  if (manifest.rights_scope === 'private_research' && manifest.public_policy?.derived_summary_public !== true) {
    warnings.push('private_research package usually should allow derived_summary_public=true for own-written summaries');
  }

  const status = failures.length > 0 ? 'failed' : warnings.length > 0 ? 'passed_with_warnings' : 'passed';
  return {
    checked_at: new Date().toISOString(),
    package_path: relative(rootDir, packagePath),
    package_id: manifest.package_id,
    title: manifest.title,
    status,
    summary: {
      sources: manifest.sources?.length ?? 0,
      extraction_artifacts: manifest.extraction_artifacts?.length ?? 0,
      candidate_projects: manifest.candidate_projects?.length ?? 0,
      review_gates: manifest.review_gates?.length ?? 0
    },
    checks,
    failures,
    warnings
  };
}

async function verifyFile(rawPath, expectedHash, expectedBytes) {
  const filePath = resolvePackagePath(rawPath);
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return { status: 'missing', resolved_path: filePath };
    const buffer = await readFile(filePath);
    const actualHash = createHash('sha256').update(buffer).digest('hex');
    if (actualHash !== expectedHash) {
      return { status: 'hash_mismatch', resolved_path: filePath, expected_sha256: expectedHash, actual_sha256: actualHash, expected_bytes: expectedBytes, actual_bytes: info.size };
    }
    if (info.size !== expectedBytes) {
      return { status: 'size_mismatch', resolved_path: filePath, expected_sha256: expectedHash, actual_sha256: actualHash, expected_bytes: expectedBytes, actual_bytes: info.size };
    }
    return { status: 'pass', resolved_path: filePath, expected_sha256: expectedHash, actual_sha256: actualHash, expected_bytes: expectedBytes, actual_bytes: info.size };
  } catch {
    return { status: 'missing', resolved_path: filePath, expected_sha256: expectedHash, expected_bytes: expectedBytes };
  }
}

function resolvePackagePath(rawPath) {
  if (isAbsolute(rawPath)) return rawPath;
  return resolve(rootDir, rawPath);
}

function renderMarkdown(result) {
  const lines = [];
  lines.push('# KosmoReferences Source Package Check');
  lines.push('');
  lines.push(`Generated: ${result.checked_at}`);
  lines.push(`Package: \`${result.package_path}\``);
  lines.push(`Status: \`${result.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Sources: ${result.summary.sources}`);
  lines.push(`- Extraction artifacts: ${result.summary.extraction_artifacts}`);
  lines.push(`- Candidate projects: ${result.summary.candidate_projects}`);
  lines.push(`- Review gates: ${result.summary.review_gates}`);
  lines.push(`- Failures: ${result.failures.length}`);
  lines.push(`- Warnings: ${result.warnings.length}`);
  lines.push('');
  lines.push('## File Checks');
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

function validateId(value, failures, label) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{2,120}$/.test(value)) {
    failures.push(`${label} must match ^[a-z0-9][a-z0-9-]{2,120}$`);
  }
}

function requireValue(condition, failures, message) {
  if (!condition) failures.push(message);
}

function requireText(value, failures, message) {
  if (typeof value !== 'string' || value.trim() === '') failures.push(message);
}

function requireArray(value, failures, message) {
  if (!Array.isArray(value)) failures.push(message);
}

function requireHash(value, failures, message) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) failures.push(message);
}

function requireInteger(value, failures, message) {
  if (!Number.isInteger(value) || value < 0) failures.push(message);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}
