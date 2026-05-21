#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

const files = [
  'components/atlas/RadialAtlas.tsx',
  'components/atlas/ProjectSearch.tsx',
  'components/atlas/ProjectDetailCard.tsx',
  'app/atlas/[slug]/page.tsx',
  'app/archive/page.tsx'
];

const terms = [
  'Generate', 'Search projects', 'Open', 'Close', 'Current Entry', 'Pilot Entry',
  'Create browser entry', 'Source URL', 'Source docs', 'Full description', 'One sentence',
  'Short text', 'Public domain', 'Private research', 'Needs rights', 'Own work', 'Load sample',
  'Analyze image', 'Drop image here', 'Select files', 'Clear staged files', 'What happens next',
  'Knowledge Graph', 'Storage', 'Sources', 'Entries', 'Relations', 'Media', 'Analysis',
  'Developer session', 'Public-safe archive', 'Drop source package'
];

const allow = ['Architecture Cosmos', 'Brain', 'D1', 'R2', 'GLB', 'Afasia', 'BestSwiss', 'ETH', 'Dev', 'URL', 'JSON', 'API', '3D'];

function visibleFragments(line) {
  const fragments = [];
  const stringPattern = /(['"`])((?:(?!\1).)*?[A-Za-z][\s\S]*?)\1/g;
  let match;
  while ((match = stringPattern.exec(line))) {
    const value = match[2];
    if (/^[./@\w-]+$/.test(value)) continue;
    if (value.includes('${') || value.includes('#') || value.includes('=>') || value.includes('className')) continue;
    fragments.push(value);
  }

  const jsxTextPattern = />\s*([^<>{}]*[A-Za-z][^<>{}]*)\s*</g;
  while ((match = jsxTextPattern.exec(line))) fragments.push(match[1]);
  return fragments;
}

const findings = [];
for (const file of files) {
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    for (const fragment of visibleFragments(line)) {
      for (const term of terms) {
        if (!fragment.includes(term)) continue;
        if (allow.some((item) => fragment.includes(item))) continue;
        findings.push(`${relative(process.cwd(), file)}:${index + 1}: ${term} -> ${fragment.trim().slice(0, 96)}`);
      }
    }
  });
}

if (findings.length) {
  console.error('UI translation guard found English interface fragments:');
  console.error(findings.slice(0, 80).join('\n'));
  if (findings.length > 80) console.error(`...and ${findings.length - 80} more`);
  process.exit(1);
}

console.log('UI translation guard passed: no configured English UI fragments found.');
