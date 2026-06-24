#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const scanRoots = [
  'app',
  'components',
  'lib/public-kosmo.ts'
];

const ignoredDirectories = new Set([
  '.git',
  '.next',
  'node_modules',
  'out'
]);

const checkedExtensions = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx'
]);

const bannedPhrases = [
  {
    phrase: 'CLICK TO OPEN',
    replacement: 'ÖFFNEN',
    reason: 'English command copy appears inside the public atlas cards.'
  },
  {
    phrase: 'DATENBANK PILOT',
    replacement: 'REFERENZPILOT',
    reason: 'The public site should describe architecture dossiers, not database internals.'
  },
  {
    phrase: 'ARCHIVPROFIL',
    replacement: 'DOSSIERSTAND',
    reason: 'Dossierstand is clearer for public reference readiness.'
  },
  {
    phrase: '3D / ANALYSE',
    replacement: 'MODELL UND ANALYSE',
    reason: 'Slash labels read like development shorthand.'
  },
  {
    phrase: 'FILTER AKTIVIEREN',
    replacement: 'VERKNÜPFEN',
    reason: 'The card action connects topics and references, not only filter state.'
  },
  {
    phrase: 'Assetbestand',
    replacement: 'Geprüfte öffentliche Assets',
    reason: 'The assets page title should explain the public review boundary.'
  },
  {
    phrase: 'Nur Metadaten',
    replacement: 'Metadaten ohne Rohdatei',
    reason: 'Public copy should make the raw-file boundary explicit.'
  },
  {
    phrase: 'Afasia Source Pull',
    replacement: 'Afasia-Quellenstand',
    reason: 'Source-pull wording exposes ingestion workflow language.'
  },
  {
    phrase: 'geplante Layer offen',
    replacement: 'Modellgruppen offen',
    reason: 'Layer is a production term; Modellgruppen is clearer in the public UI.'
  },
  {
    phrase: 'KI-Referenzpilot',
    replacement: 'Referenzaufbau',
    reason: 'The public atlas should describe the architectural dossier, not the AI process.'
  },
  {
    phrase: 'Wurmloch-Status',
    replacement: 'Erfassung',
    reason: 'Internal metaphors should not appear as status copy on public pages.'
  }
];

const findings = [];
const scannedFiles = [];

for (const scanRoot of scanRoots) {
  const absoluteRoot = resolve(root, scanRoot);
  if (!existsSync(absoluteRoot)) continue;
  scanPath(absoluteRoot);
}

const summary = {
  status: findings.length === 0 ? 'passed' : 'failed',
  scanned_files: scannedFiles.length,
  banned_phrase_count: bannedPhrases.length,
  findings
};

console.log(JSON.stringify(summary, null, 2));
if (findings.length > 0) process.exit(1);

function scanPath(path) {
  const stats = statSync(path);
  if (stats.isDirectory()) {
    const name = path.split('/').at(-1);
    if (ignoredDirectories.has(name)) return;
    for (const child of readdirSync(path).sort()) scanPath(join(path, child));
    return;
  }

  if (!stats.isFile() || !shouldCheck(path)) return;

  const source = readFileSync(path, 'utf8');
  const relativePath = relative(root, path);
  scannedFiles.push(relativePath);

  for (const banned of bannedPhrases) {
    const index = source.indexOf(banned.phrase);
    if (index === -1) continue;

    const line = source.slice(0, index).split('\n').length;
    findings.push({
      file: relativePath,
      line,
      phrase: banned.phrase,
      replacement: banned.replacement,
      reason: banned.reason
    });
  }
}

function shouldCheck(path) {
  return checkedExtensions.has(extensionOf(path));
}

function extensionOf(path) {
  const filename = path.split('/').at(-1) ?? '';
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot) : '';
}
