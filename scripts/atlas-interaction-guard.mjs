import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const files = {
  radialAtlas: 'components/atlas/RadialAtlas.tsx',
  detailCard: 'components/atlas/ProjectDetailCard.tsx',
  mediaGrid: 'components/atlas/ProjectMediaGrid.tsx',
  node: 'components/atlas/SemanticEntryNode.tsx',
  css: 'app/globals.css'
};

const checks = [
  {
    id: 'dossier-title-opens-detail-page',
    file: files.detailCard,
    patterns: ['const detailHref = `/atlas/${entry.slug}/`', 'className="dossier-title-link"', 'Eintrag öffnen: ${entry.title}']
  },
  {
    id: 'dossier-media-opens-detail-page',
    file: files.mediaGrid,
    patterns: ['detailHref', 'className="dossier-media-link"', 'Eintrag öffnen: ${(mediaItem?.label ?? type)}']
  },
  {
    id: 'dossier-filter-chips-call-atlas-filter',
    file: files.detailCard,
    patterns: ['className="dossier-filter-chip"', 'onSelectFilter(filter)', 'Filter aktivieren: ${filter.label}']
  },
  {
    id: 'atlas-filter-from-dossier-closes-popup',
    file: files.radialAtlas,
    patterns: ['function activateFilterFromDossier', 'setShowRelations(true)', 'closeDossier();']
  },
  {
    id: 'filter-button-can-pin-panel',
    file: files.radialAtlas,
    patterns: ['const [isPinnedOpen, setIsPinnedOpen]', 'setIsPinnedOpen((current) => !current)', 'filter-access-pinned']
  },
  {
    id: 'filter-panel-closes-only-outside',
    file: files.radialAtlas,
    patterns: ['closeOnOutsidePointer', 'root.contains(event.target as Node)', "window.addEventListener('pointerdown', closeOnOutsidePointer"]
  },
  {
    id: 'entry-node-stops-pan-before-click',
    file: files.node,
    patterns: ['data-entry-node="true"', 'onPointerDown={(event) =>', 'event.stopPropagation();']
  },
  {
    id: 'entry-node-click-delegates-to-atlas-nearest-node',
    file: files.node,
    patterns: ['data-entry-node="true"', "onKeyDown={(event) =>"],
    forbiddenPatterns: ['onSelect(event);']
  },
  {
    id: 'dossier-hover-reacts-to-crosshair',
    file: files.css,
    patterns: ['.dossier-reactive-textblock:hover text', '.dossier-filter-chip:hover text', '.dossier-archive-metric:hover text']
  },
  {
    id: 'native-cursor-hidden-for-dossier-actions',
    file: files.css,
    patterns: ['.dossier-title-link,', '.dossier-filter-chip', 'cursor: none;']
  }
];

async function main() {
  const cache = new Map();
  const results = [];

  for (const check of checks) {
    const source = await readFileCached(cache, check.file);
    const missing = check.patterns.filter((pattern) => !source.includes(pattern));
    const forbidden = (check.forbiddenPatterns ?? []).filter((pattern) => source.includes(pattern));
    results.push({
      id: check.id,
      file: check.file,
      status: missing.length || forbidden.length ? 'fail' : 'pass',
      missing,
      forbidden
    });
  }

  const failed = results.filter((result) => result.status === 'fail');
  console.log('Architecture Cosmos atlas interaction guard');
  console.log(`Checks: ${results.length - failed.length}/${results.length}`);

  if (failed.length) {
    for (const item of failed) {
      console.log(`FAIL ${item.id} (${item.file})`);
      item.missing.forEach((pattern) => console.log(`  missing: ${pattern}`));
      item.forbidden.forEach((pattern) => console.log(`  forbidden: ${pattern}`));
    }
    process.exitCode = 1;
  }
}

async function readFileCached(cache, relativePath) {
  if (!cache.has(relativePath)) {
    cache.set(relativePath, await fs.readFile(path.join(root, relativePath), 'utf8'));
  }
  return cache.get(relativePath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
