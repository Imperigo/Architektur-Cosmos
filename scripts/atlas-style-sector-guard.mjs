import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entriesPath = path.join(repoRoot, 'data/mock-entries.json');
const wormholeLayoutPath = path.join(repoRoot, 'lib/wormhole-layout.ts');
const styleSectorsPath = path.join(repoRoot, 'components/atlas/StyleSectors.tsx');
const radialTextPath = path.join(repoRoot, 'components/atlas/RadialText.tsx');

const styleSectors = [
  { id: 'classical_architecture', startAngle: 300, endAngle: 360 },
  { id: 'pre_modern_architecture', startAngle: 0, endAngle: 62 },
  { id: 'modern_architecture', startAngle: 62, endAngle: 126 },
  { id: 'postwar_modern_architecture', startAngle: 126, endAngle: 188 },
  { id: 'sustainable_architecture', startAngle: 188, endAngle: 246 },
  { id: 'vernacular_architecture', startAngle: 246, endAngle: 300 }
];

const failures = [];
const entries = JSON.parse(await readFile(entriesPath, 'utf8'));
const wormholeLayout = await readFile(wormholeLayoutPath, 'utf8');
const styleSectorsSource = await readFile(styleSectorsPath, 'utf8');
const radialTextSource = await readFile(radialTextPath, 'utf8');

for (const entry of entries) {
  const sector = styleSectors.find((item) => item.id === entry.style_sector);
  if (!sector) {
    failures.push(`${entry.id}: unknown style sector ${entry.style_sector}`);
    continue;
  }

  const angle = angleInSector(entry.id, sector);
  if (!isAngleInSector(angle, sector, 0.01)) {
    failures.push(`${entry.id}: angle ${angle.toFixed(2)} escapes ${sector.id}`);
  }
}

if (!wormholeLayout.includes('angleInSector(entry, sector) + tubeTwist(worldPosition)')) {
  failures.push('wormhole entry layout must use angleInSector(entry, sector) before tubeTwist(worldPosition).');
}

if (/\bentryAngleOffset\s*\(/.test(wormholeLayout)) {
  failures.push('wormhole entry layout must not use free entryAngleOffset; it can push entries into neighbouring style sectors.');
}

if (!styleSectorsSource.includes('style-sector-depth-band')) {
  failures.push('StyleSectors should render depth bands so style color fields follow the tunnel instead of one flat sector wedge.');
}

if (!radialTextSource.includes('centerNeedsFlip') || !radialTextSource.includes('visibleLetters') || !radialTextSource.includes('[...letters].reverse()')) {
  failures.push('RadialLetterText should flip glyph placement on the far side so radial labels stay readable instead of mirrored.');
}

if (failures.length > 0) {
  console.error('Atlas style-sector guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Atlas style-sector guard passed.');
console.log(`Entries checked: ${entries.length}`);

function angleInSector(id, sector) {
  const span = sectorSpan(sector);
  const offset = ((stableHash(id) % 100) / 100 - 0.5) * Math.min(span * 0.52, 30);
  return normalizeAngle(sectorMidAngle(sector) + offset);
}

function isAngleInSector(angle, sector, margin = 0) {
  const normalizedAngle = normalizeAngle(angle);
  const start = normalizeAngle(sector.startAngle - margin);
  const end = normalizeAngle(sector.endAngle + margin);

  if (start > end) return normalizedAngle >= start || normalizedAngle <= end;
  return normalizedAngle >= start && normalizedAngle <= end;
}

function sectorMidAngle(sector) {
  if (sector.startAngle > sector.endAngle) {
    return ((sector.startAngle + sector.endAngle + 360) / 2) % 360;
  }

  return (sector.startAngle + sector.endAngle) / 2;
}

function sectorSpan(sector) {
  return sector.startAngle > sector.endAngle
    ? sector.endAngle + 360 - sector.startAngle
    : sector.endAngle - sector.startAngle;
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function stableHash(input) {
  let hash = 0;
  for (const char of input) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  }
  return hash;
}
