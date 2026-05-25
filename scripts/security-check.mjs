#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ignoredDirs = new Set([
  '.git',
  '.next',
  '.venv-kosmo-ifc',
  'node_modules',
  'out',
  'archive-inbox',
  'archive-intake'
]);

const textExtensions = new Set([
  '.css',
  '.csv',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yml',
  '.yaml'
]);

const personalPatterns = [
  new RegExp(['and', 'rin'].join(''), 'i'),
  new RegExp(['bau', 'mann'].join(''), 'i'),
  new RegExp(`${['and', 'rin'].join('')}99`, 'i'),
  new RegExp(`${['and', 'rin'].join('')}\\.bau`, 'i'),
  new RegExp(`architekturkosmos\\.${['and', 'rin'].join('')}`, 'i'),
  new RegExp(`made by ${['and', 'rin'].join('')}`, 'i')
];

const secretPatterns = [
  { label: 'Cloudflare API token', pattern: /cf[a-z0-9]{2}_[a-z0-9_-]{30,}/i },
  { label: 'OpenAI-style key', pattern: /sk-[a-z0-9_-]{32,}/i },
  { label: 'GitHub token', pattern: /gh[pousr]_[a-z0-9_]{30,}/i },
  { label: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/ },
  { label: 'Private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ }
];

const requiredHeaders = [
  'Strict-Transport-Security',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Cross-Origin-Opener-Policy',
  'Cross-Origin-Resource-Policy',
  'Content-Security-Policy'
];

const failures = [];
const warnings = [];

main();

function main() {
  console.log('Architecture Cosmos security check');

  const files = listTextFiles(repoRoot);
  checkPersonalExposure(files);
  checkSecrets(files);
  checkSecurityHeaders();
  checkSecurityTxt();
  runNpmAudit();

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (failures.length > 0) {
    console.error('\nSecurity check failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log('\nSecurity check passed.');
}

function listTextFiles(directory) {
  const files = [];

  walk(directory);
  return files;

  function walk(currentDirectory) {
    for (const item of readdirSync(currentDirectory)) {
      if (ignoredDirs.has(item)) continue;

      const absolutePath = path.join(currentDirectory, item);
      const relativePath = path.relative(repoRoot, absolutePath);
      const stats = statSync(absolutePath);

      if (stats.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (!stats.isFile()) continue;
      if (stats.size > 1024 * 1024) {
        warnings.push(`Skipped large file ${relativePath}`);
        continue;
      }

      if (textExtensions.has(path.extname(item)) || item === 'SECURITY') {
        files.push({ absolutePath, relativePath });
      }
    }
  }
}

function checkPersonalExposure(files) {
  const matches = findMatches(files, personalPatterns);
  matches.forEach((match) => {
    failures.push(`Personal identifier found in ${match.relativePath}:${match.lineNumber}`);
  });
}

function checkSecrets(files) {
  for (const file of files) {
    const content = readFileSync(file.absolutePath, 'utf8');

    secretPatterns.forEach(({ label, pattern }) => {
      if (pattern.test(content)) {
        failures.push(`${label} pattern found in ${file.relativePath}`);
      }
    });
  }
}

function checkSecurityHeaders() {
  const headersPath = path.join(repoRoot, 'public', '_headers');

  if (!existsSync(headersPath)) {
    failures.push('Missing public/_headers');
    return;
  }

  const headers = readFileSync(headersPath, 'utf8');

  requiredHeaders.forEach((header) => {
    if (!headers.includes(`${header}:`)) {
      failures.push(`Missing security header ${header} in public/_headers`);
    }
  });
}

function checkSecurityTxt() {
  const securityTxtPath = path.join(repoRoot, 'public', '.well-known', 'security.txt');

  if (!existsSync(securityTxtPath)) {
    failures.push('Missing public/.well-known/security.txt');
    return;
  }

  const securityTxt = readFileSync(securityTxtPath, 'utf8');
  ['Contact:', 'Policy:', 'Expires:'].forEach((field) => {
    if (!securityTxt.includes(field)) {
      failures.push(`Missing ${field} in public/.well-known/security.txt`);
    }
  });
}

function runNpmAudit() {
  const result = spawnSync('npm', ['audit', '--audit-level=moderate', '--omit=dev'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  if (result.error) {
    warnings.push(`npm audit skipped: ${result.error.message}`);
    return;
  }

  if (result.status !== 0) {
    failures.push('npm audit reported moderate or higher production vulnerabilities');
    if (result.stdout?.trim()) warnings.push(result.stdout.trim());
    if (result.stderr?.trim()) warnings.push(result.stderr.trim());
  }
}

function findMatches(files, patterns) {
  const matches = [];

  for (const file of files) {
    const lines = readFileSync(file.absolutePath, 'utf8').split(/\r?\n/);

    lines.forEach((line, index) => {
      patterns.forEach((pattern) => {
        if (pattern.test(line)) {
          matches.push({
            relativePath: file.relativePath,
            lineNumber: index + 1
          });
        }
      });
    });
  }

  return matches;
}
