import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'out');
const REPORT_PATH = path.join(OUT_DIR, 'ui-audit.json');

const files = {
  css: 'app/globals.css',
  atlas: 'components/atlas/RadialAtlas.tsx',
  search: 'components/atlas/ProjectSearch.tsx',
  modelViewer: 'components/atlas/EntryModelViewer.tsx',
  entryPage: 'app/atlas/[slug]/page.tsx'
};

const requiredCssTokens = [
  '--ui-safe-edge',
  '--ui-hit-min',
  '--ui-trigger-h',
  '--ui-trigger-min-w',
  '--ui-panel-max-w',
  '--ui-panel-max-h',
  '--ui-font-control',
  '--ui-font-body',
  '--ui-font-label'
];

const requiredCssClasses = [
  '.cosmos-panel',
  '.cosmos-trigger',
  '.cosmos-scroll-panel',
  '.cosmos-text-safe',
  '.database-mobile-overlay',
  '.entry-model-controls'
];

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const sources = {};
  for (const [key, relativePath] of Object.entries(files)) {
    sources[key] = await readFile(path.join(ROOT, relativePath), 'utf8');
  }

  const checks = [
    ...requiredCssTokens.map((token) => checkIncludes(sources.css, token, `CSS token ${token}`)),
    ...requiredCssClasses.map((className) => checkIncludes(sources.css, className, `CSS class ${className}`)),
    checkIncludes(sources.css, '@media (max-width: 760px), (pointer: coarse)', 'mobile/coarse media query'),
    checkIncludes(sources.css, 'overflow-wrap: anywhere', 'global text overflow guard'),
    checkIncludes(sources.css, '.database-draft .grid-cols-4', 'mobile database grid collapse'),
    checkIncludes(sources.css, '.entry-model-controls .grid', 'mobile 3D controls grid rule'),
    checkIncludes(sources.css, '.entry-page header .entry-link', 'mobile entry header touch rule'),
    checkIncludes(sources.entryPage, "shortLabel: 'Quelle'", 'entry archive radar uses readable Quelle label'),
    checkIncludes(sources.entryPage, "shortLabel: 'Medien'", 'entry archive radar uses readable Medien label'),
    checkIncludes(sources.entryPage, "shortLabel: 'Netz'", 'entry archive radar uses readable Netz label'),
    checkIncludes(sources.entryPage, "shortLabel: '3D'", 'entry archive radar uses readable 3D label'),
    checkIncludes(sources.entryPage, "shortLabel: 'Analyse'", 'entry archive radar uses readable Analyse label'),
    checkIncludes(sources.entryPage, "shortLabel: 'Text'", 'entry archive radar uses readable Text label'),
    checkIncludes(sources.css, '.kosmo-asset-shell {\n    display: block;', 'mobile KosmoAsset shell uses document flow'),
    checkIncludes(sources.css, '.kosmo-asset-library,\n  .kosmo-asset-grid,\n  .kosmo-asset-inspector {\n    min-height: auto;', 'mobile KosmoAsset cards cannot collapse into inspector'),
    checkIncludes(sources.atlas, "renderMode?: 'svg' | 'html'", 'Database panel supports HTML render mode'),
    checkIncludes(sources.atlas, "renderMode=\"html\"", 'Mobile database uses HTML overlay'),
    checkIncludes(sources.search, 'project-search-trigger cosmos-trigger', 'Search trigger uses shared trigger class'),
    checkIncludes(sources.search, 'project-dev-trigger cosmos-trigger', 'Developer trigger uses shared trigger class'),
    checkIncludes(sources.modelViewer, 'detectViewerQuality', '3D viewer has device quality detection')
  ];

  const warnings = [
    ...findTinyFontSizes(sources.css, files.css),
    ...findTinyFontSizes(sources.atlas, files.atlas),
    ...findUnboundedNowrap(sources.css, files.css)
  ];

  const failed = checks.filter((check) => check.status !== 'pass');
  const report = {
    generated_at: new Date().toISOString(),
    status: failed.length ? 'fail' : 'pass',
    summary: {
      checks: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      warnings: warnings.length
    },
    checks,
    warnings
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log('Architecture Cosmos UI audit');
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);

  if (failed.length) {
    failed.forEach((check) => console.error(`FAIL: ${check.label}`));
    process.exit(1);
  }
}

function checkIncludes(source, needle, label) {
  return {
    label,
    status: source.includes(needle) ? 'pass' : 'fail'
  };
}

function findTinyFontSizes(source, file) {
  const warnings = [];
  const lines = source.split('\n');
  const patterns = [
    /font-size\s*:\s*([0-9.]+)px/g,
    /fontSize\s*[=:]\s*["']?([0-9.]+)px/g,
    /text-\[([0-9.]+)px\]/g
  ];

  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const size = Number(match[1]);
        if (Number.isFinite(size) && size < 8) {
          warnings.push({
            type: 'tiny-font',
            file,
            line: index + 1,
            value: `${size}px`,
            note: 'Tiny SVG/meta text may be intentional, but do not use it for touch UI or readable panel content.'
          });
        }
      }
    }
  });

  return warnings.slice(0, 40);
}

function findUnboundedNowrap(source, file) {
  const warnings = [];
  const lines = source.split('\n');

  lines.forEach((line, index) => {
    if (!line.includes('white-space: nowrap')) return;

    const nearby = lines.slice(Math.max(0, index - 4), Math.min(lines.length, index + 5)).join('\n');
    const hasOverflowGuard = nearby.includes('overflow: hidden') || nearby.includes('text-overflow') || nearby.includes('overflow-wrap: normal');
    if (!hasOverflowGuard) {
      warnings.push({
        type: 'nowrap-without-local-overflow-guard',
        file,
        line: index + 1,
        note: 'Nowrap text should usually have overflow handling or be limited to decorative/meta UI.'
      });
    }
  });

  return warnings;
}
