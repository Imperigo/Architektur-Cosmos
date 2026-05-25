#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const projectRoot = resolve(readArg('--project') ?? 'examples/kosmo-projects/kosmo-demo-001');
const schemaPath = resolve(readArg('--schema') ?? 'schema/kosmo-project-package.schema.json');
const manifestPath = join(projectRoot, 'kosmo.project.json');
const failures = [];
const warnings = [];

main();

function main() {
  console.log('Kosmo project package check');
  console.log(`Project: ${relative(process.cwd(), projectRoot)}`);
  console.log(`Schema: ${relative(process.cwd(), schemaPath)}`);

  const schema = readJson(schemaPath);
  const manifest = readJson(manifestPath);

  if (!schema) failures.push('Schema could not be parsed.');
  if (!manifest) failures.push('Manifest could not be parsed.');
  if (!schema || !manifest) return finish();

  checkManifest(manifest);
  checkPackagePaths(manifest);
  checkArtifacts('inputs', manifest.inputs ?? []);
  checkArtifacts('outputs', manifest.outputs ?? []);
  checkJsonFiles(projectRoot);
  checkJsonlFiles(projectRoot);

  return finish();
}

function checkManifest(manifest) {
  const required = [
    'schema_version',
    'project_id',
    'name',
    'created_at',
    'risk_level',
    'site',
    'modules',
    'package_paths',
    'review_gates'
  ];

  for (const key of required) {
    if (!(key in manifest)) failures.push(`Manifest missing required key: ${key}`);
  }

  if (manifest.schema_version !== '0.1') {
    failures.push(`Manifest schema_version must be "0.1", got "${manifest.schema_version}"`);
  }

  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(manifest.project_id ?? '')) {
    failures.push(`Manifest project_id is not a Kosmo slug: ${manifest.project_id}`);
  }

  const modules = ['prepare', 'data', 'orbit', 'design', 'draw', 'viz', 'publish', 'zentrale'];
  for (const moduleName of modules) {
    const state = manifest.modules?.[moduleName];
    if (!state) failures.push(`Manifest missing module state: ${moduleName}`);
    else if (!['pending', 'in_progress', 'review_ready', 'approved', 'blocked', 'skipped'].includes(state.status)) {
      failures.push(`Invalid status for module ${moduleName}: ${state.status}`);
    }
  }

  const gates = ['public_release', 'external_upload', 'client_delivery', 'paid_cloud_job'];
  for (const gate of gates) {
    const state = manifest.review_gates?.[gate];
    if (!state) failures.push(`Manifest missing review gate: ${gate}`);
    else if (!['disabled', 'requires_human_approval', 'approved'].includes(state.mode)) {
      failures.push(`Invalid review gate mode for ${gate}: ${state.mode}`);
    }
  }
}

function checkPackagePaths(manifest) {
  for (const [label, folder] of Object.entries(manifest.package_paths ?? {})) {
    if (!isSafeRelativePath(folder)) {
      failures.push(`Unsafe package path for ${label}: ${folder}`);
      continue;
    }
    const fullPath = join(projectRoot, folder);
    if (!existsSync(fullPath)) failures.push(`Package path does not exist for ${label}: ${folder}`);
    else if (!statSync(fullPath).isDirectory()) failures.push(`Package path is not a directory for ${label}: ${folder}`);
  }
}

function checkArtifacts(kind, artifacts) {
  if (!Array.isArray(artifacts)) {
    failures.push(`Manifest ${kind} must be an array.`);
    return;
  }

  for (const artifact of artifacts) {
    if (!artifact?.path || !isSafeRelativePath(artifact.path)) {
      failures.push(`Unsafe or missing ${kind} artifact path: ${artifact?.path}`);
      continue;
    }
    const fullPath = join(projectRoot, artifact.path);
    if (!existsSync(fullPath)) failures.push(`${kind} artifact is missing: ${artifact.path}`);
  }
}

function checkJsonFiles(root) {
  for (const file of walk(root)) {
    if (!file.endsWith('.json')) continue;
    readJson(file);
  }
}

function checkJsonlFiles(root) {
  for (const file of walk(root)) {
    if (!file.endsWith('.jsonl')) continue;
    const lines = readFileSync(file, 'utf8').split('\n').filter((line) => line.trim().length > 0);
    lines.forEach((line, index) => {
      try {
        JSON.parse(line);
      } catch (error) {
        failures.push(`${relative(process.cwd(), file)}:${index + 1} invalid JSONL: ${error.message}`);
      }
    });
  }
}

function readJson(pathname) {
  try {
    return JSON.parse(readFileSync(pathname, 'utf8'));
  } catch (error) {
    failures.push(`${relative(process.cwd(), pathname)} invalid JSON: ${error.message}`);
    return null;
  }
}

function walk(root) {
  const results = [];
  for (const name of readdirSync(root)) {
    const pathname = join(root, name);
    const stats = statSync(pathname);
    if (stats.isDirectory()) results.push(...walk(pathname));
    else results.push(pathname);
  }
  return results;
}

function isSafeRelativePath(value) {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('/') && !value.startsWith('..') && !/^[A-Za-z]:/.test(value);
}

function finish() {
  if (warnings.length) {
    console.log('\nWarnings:');
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (failures.length) {
    console.error('\nPackage check failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log('\nPackage check passed.');
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
