#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const files = {
  atlas: 'components/atlas/RadialAtlas.tsx',
  search: 'components/atlas/ProjectSearch.tsx',
  css: 'app/globals.css'
};

const checks = [
  {
    id: 'database-desktop-top-left',
    file: files.atlas,
    patterns: [
      'function DatabaseAccess({ isOpen, onToggle }',
      'const x = ui.isCoarsePointer ? 34 : 28;',
      'const y = ui.isCoarsePointer ? 82 : 50;',
      'aria-label="KosmoData öffnen"'
    ]
  },
  {
    id: 'database-panel-is-html-overlay',
    file: files.atlas,
    patterns: [
      '<DatabaseArchivePanel',
      'renderMode="html"',
      'onDismiss={closeDatabasePanel}',
      'onReturnToHub={returnToModuleHub}'
    ]
  },
  {
    id: 'search-and-dev-hide-while-database-open',
    file: files.atlas,
    patterns: [
      "{introState === 'idle' && !showDatabasePanel ? (",
      '<ProjectSearch entries={allEntries} developerMode={developerMode} onDeveloperModeChange={updateDeveloperMode} />'
    ]
  },
  {
    id: 'filter-access-is-right-bottom-and-non-mobile',
    file: files.atlas,
    patterns: [
      "{introState === 'idle' && !showDatabasePanel && !ui.isCoarsePointer ? (",
      '<FilterAccess',
      'onSelectSourceLens={(lensId) =>',
      'onToggleRelations={() =>'
    ]
  },
  {
    id: 'filter-panel-hover-pin-and-outside-close',
    file: files.atlas,
    patterns: [
      'const [isHoverOpen, setIsHoverOpen]',
      'const [isPinnedOpen, setIsPinnedOpen]',
      'const closeOnOutsidePointer = (event: globalThis.PointerEvent) =>',
      'setIsPinnedOpen((current) => !current)',
      "window.addEventListener('pointerdown', closeOnOutsidePointer"
    ]
  },
  {
    id: 'mobile-uses-separate-database-and-touch-hud',
    file: files.atlas,
    patterns: [
      'function MobileDatabaseAccess({ onToggle }',
      'className="mobile-database-trigger cosmos-trigger"',
      '<MobileAtlasHud',
      'Pinch zoomt · Doppeltipp setzt Lupe'
    ]
  },
  {
    id: 'global-crosshair-renders-over-intro-and-panels',
    file: files.atlas,
    patterns: [
      'window.addEventListener(\'pointermove\', updateScreenCursor, { capture: true, passive: true });',
      '{cursorVisible ? <ScreenCosmosCursor cursorRef={screenCursorRef} isDossierOpen={Boolean(selectedEntry)} isOverlayOpen={showDatabasePanel || introState !== \'idle\'} /> : null}',
      'function ScreenCosmosCursor({ cursorRef, isDossierOpen, isOverlayOpen }'
    ]
  },
  {
    id: 'native-browser-zoom-bypasses-native-overlays-only',
    file: files.atlas,
    patterns: [
      'if (isNativeOverlayTarget(event.target)) return;',
      "window.addEventListener('wheel', preventBrowserWheel, { capture: true, passive: false });",
      "window.addEventListener('touchmove', preventBrowserTouch, { capture: true, passive: false });"
    ]
  },
  {
    id: 'search-and-dev-use-shared-trigger-system',
    file: files.search,
    patterns: [
      'className="project-search-trigger cosmos-trigger"',
      'data-ui-action="search"',
      'className={`project-dev-trigger cosmos-trigger ${isDeveloperMode ? \'project-dev-trigger-active\' : \'\'}`}',
      'window.addEventListener(\'pointerdown\', handleWindowPointerDown, true)'
    ]
  },
  {
    id: 'filter-css-position-and-shared-trigger-size',
    file: files.css,
    patterns: [
      '.filter-access {\n  position: fixed;\n  right: max(var(--ui-safe-edge), env(safe-area-inset-right));',
      'bottom: max(calc(var(--ui-safe-edge) + 18px), calc(env(safe-area-inset-bottom) + 18px));',
      '.filter-access-trigger {',
      'width: var(--ui-trigger-min-w);',
      'height: var(--ui-trigger-h);'
    ]
  },
  {
    id: 'search-css-position-and-shared-trigger-size',
    file: files.css,
    patterns: [
      '.project-search {',
      'right: max(var(--ui-safe-edge), env(safe-area-inset-right));',
      'top: var(--cosmos-hud-top);',
      '.project-search .project-search-trigger,\n.project-search .project-dev-trigger,',
      'width: var(--ui-trigger-min-w);',
      'height: var(--ui-trigger-h);'
    ]
  },
  {
    id: 'crosshair-css-desktop-and-touch-rules',
    file: files.css,
    patterns: [
      '.screen-cosmos-cursor {',
      '.screen-cosmos-cursor-overlay .screen-cosmos-cursor-ring',
      '.cosmos-touch-web .screen-cosmos-cursor',
      '.cosmos-moving .screen-cosmos-cursor'
    ]
  },
  {
    id: 'brain-and-lenses-not-prominent-kosmodata-hud',
    file: files.atlas,
    forbiddenPatterns: [
      '<BrainStatusWidget',
      '<LensControl',
      '<LensAccess'
    ]
  }
];

async function main() {
  const cache = new Map();
  const results = [];

  for (const check of checks) {
    const source = await readFileCached(cache, check.file);
    const missing = (check.patterns ?? []).filter((pattern) => !source.includes(pattern));
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
  console.log('Architecture Cosmos KosmoData HUD guard');
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
