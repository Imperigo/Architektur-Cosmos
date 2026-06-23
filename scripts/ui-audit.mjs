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
    checkIncludes(sources.css, '.mobile-atlas-dock {\n  display: flex;\n  flex-wrap: wrap;', 'mobile atlas filter dock wraps instead of overflowing horizontally'),
    checkIncludes(sources.css, '.mobile-atlas-dock button {\n  flex: 1 1 calc(25% - 7px);', 'mobile atlas filter buttons use responsive wrapped widths'),
    checkIncludes(sources.entryPage, "shortLabel: 'Quelle'", 'entry archive radar uses readable Quelle label'),
    checkIncludes(sources.entryPage, "shortLabel: 'Medien'", 'entry archive radar uses readable Medien label'),
    checkIncludes(sources.entryPage, "shortLabel: 'Netz'", 'entry archive radar uses readable Netz label'),
    checkIncludes(sources.entryPage, "shortLabel: '3D'", 'entry archive radar uses readable 3D label'),
    checkIncludes(sources.entryPage, "shortLabel: 'Analyse'", 'entry archive radar uses readable Analyse label'),
    checkIncludes(sources.entryPage, "shortLabel: 'Text'", 'entry archive radar uses readable Text label'),
    checkIncludes(sources.atlas, 'className="database-gold-action mb-2" href="/archive/" aria-label="Datenbank öffnen"', 'Database primary archive access remains a real link'),
    checkIncludes(sources.atlas, 'className="database-user-intake mb-3"', 'Database user intake remains a real button'),
    checkIncludes(sources.atlas, 'onPointerDown={activateIntakeTab}', 'Database user intake opens the intake tab'),
    checkIncludes(sources.atlas, 'hasFinePointer: !isCoarsePointer', 'narrow desktop keeps fine pointer cursor support'),
    checkIncludes(sources.atlas, "ui.hasFinePointer ? 'cosmos-fine-pointer' : 'cosmos-touch-web'", 'atlas distinguishes touch from narrow responsive layout'),
    checkIncludes(sources.css, '.cosmos-touch-web .screen-cosmos-cursor', 'custom cursor is hidden only for touch mode'),
    checkIncludes(sources.atlas, "aria-hidden={introState !== 'idle'}", 'background atlas SVG is hidden from assistive tech during intro/hub overlays'),
    checkIncludes(sources.atlas, "aria-label={introState === 'idle' ? 'KosmoData Wurmloch-Atlas' : undefined}", 'interactive atlas SVG has an idle-state label'),
    checkIncludes(sources.atlas, "isOverlayOpen={showDatabasePanel || introState !== 'idle'}", 'global crosshair remains active in intro and orbit overlays'),
    checkIncludes(sources.atlas, 'const hubRef = useRef<HTMLDivElement | null>(null);', 'Orbit hub stores a focus ref for keyboard dismissal'),
    checkIncludes(sources.atlas, 'hubRef.current?.focus({ preventScroll: true });', 'Orbit hub takes focus without scrolling when it opens'),
    checkIncludes(sources.atlas, 'tabIndex={-1}', 'Orbit hub can receive keyboard dismissal focus'),
    checkIncludes(sources.atlas, 'className="module-hub-orbit module-hub-orbit-a" aria-hidden="true"', 'Orbit decorative rings are hidden from screen readers'),
    checkIncludes(sources.atlas, 'className="module-hub-core" aria-hidden="true"', 'Orbit decorative center glyph is hidden from screen readers'),
    checkIncludes(sources.atlas, 'role="dialog"', 'Orbit module preview exposes dialog semantics'),
    checkIncludes(sources.atlas, 'aria-label={`${selectedModule.name} Modulvorschau`}', 'Orbit module preview has a module-specific label'),
    checkIncludes(sources.atlas, 'onClick={() => setSelectedModuleId(null)}', 'Orbit preview can be dismissed by clicking the empty hub area'),
    checkIncludes(sources.atlas, 'className="module-hub-preview-gate"', 'Orbit preview explains whether a module is active or planned'),
    checkIncludes(sources.css, '.module-hub-preview-gate', 'Orbit preview gate has dedicated styling'),
    checkIncludes(sources.css, '.module-hub-preview-gate,\n  .module-hub-preview-metrics {\n    grid-template-columns: 1fr;', 'mobile Orbit preview gate and metrics stack cleanly'),
    checkIncludes(sources.css, '.cosmos-perf-reduced .module-hub', 'reduced performance mode disables Orbit hub animation'),
    checkIncludes(sources.css, '.module-hub,\n  .module-hub-orbit,\n  .module-hub-preview,\n  .kosmo-asset-workspace,', 'prefers-reduced-motion disables Orbit/KosmoAsset shell animation'),
    checkIncludes(sources.atlas, "module.id === 'asset' ? { ...module, onClick: onOpenKosmoAsset }", 'KosmoAsset orbit station opens the asset workspace'),
    checkIncludes(sources.atlas, 'className="kosmo-asset-back" onClick={onReturnToHub} aria-label="Zurück zum Hauptmenü"', 'KosmoAsset workspace has a stable return button'),
    checkIncludes(sources.atlas, 'className="kosmo-asset-review-banner"', 'KosmoAsset inspector shows local/public review summary'),
    checkIncludes(sources.atlas, 'function assetReviewSummary', 'KosmoAsset inspector computes review summary from review gates'),
    checkIncludes(sources.css, '.kosmo-asset-review-banner', 'KosmoAsset review summary has dedicated styling'),
    checkIncludes(sources.atlas, 'className="kosmo-asset-card-gate"', 'KosmoAsset cards show public gate status before opening inspector'),
    checkIncludes(sources.atlas, 'className="kosmo-asset-card-status"', 'KosmoAsset cards show local review status before opening inspector'),
    checkIncludes(sources.css, '.kosmo-asset-card-gate', 'KosmoAsset card public gate badge has styling'),
    checkIncludes(sources.css, '.kosmo-asset-card-status', 'KosmoAsset card review badge has styling'),
    checkIncludes(sources.atlas, 'className="kosmo-asset-mode-strip"', 'KosmoAsset dashboard explains local review/public gate mode'),
    checkIncludes(sources.css, '.kosmo-asset-mode-strip', 'KosmoAsset dashboard mode strip has styling'),
    checkIncludes(sources.css, '.kosmo-asset-mode-strip {\n    grid-template-columns: 1fr;', 'mobile KosmoAsset mode strip stacks instead of squeezing columns'),
    checkIncludes(sources.css, '.kosmo-asset-shell {\n    display: block;', 'mobile KosmoAsset shell uses document flow'),
    checkIncludes(sources.css, '.kosmo-asset-library,\n  .kosmo-asset-grid,\n  .kosmo-asset-inspector {\n    min-height: auto;', 'mobile KosmoAsset cards cannot collapse into inspector'),
    checkIncludes(sources.atlas, 'const dossierScale = useLargeInterface ? 2.72 : 1.42;', 'mobile dossier card uses readable scale'),
    checkIncludes(sources.atlas, 'cardY: useLargeInterface ? 104', 'mobile dossier card is framed near top'),
    checkIncludes(sources.css, '.screen-cosmos-cursor-dossier {\n  opacity: 0;', 'Dossier hides custom cursor over readable text'),
    checkIncludes(sources.atlas, "renderMode?: 'svg' | 'html'", 'Database panel supports HTML render mode'),
    checkIncludes(sources.atlas, "renderMode=\"html\"", 'Mobile database uses HTML overlay'),
    checkIncludes(sources.search, 'project-search-trigger cosmos-trigger', 'Search trigger uses shared trigger class'),
    checkIncludes(sources.search, 'project-dev-trigger cosmos-trigger', 'Developer trigger uses shared trigger class'),
    checkIncludes(sources.modelViewer, 'detectViewerQuality', '3D viewer has device quality detection'),
    checkIncludes(sources.modelViewer, 'objectSemanticName(mesh)', '3D viewer reads mesh and parent node names'),
    checkIncludes(sources.modelViewer, "['tragwerk', 'structure', 'structural'", '3D viewer recognizes KosmoDraw structural layers'),
    checkIncludes(sources.modelViewer, "['fassade', 'facade', 'envelope'", '3D viewer recognizes KosmoDraw facade layers'),
    checkIncludes(sources.modelViewer, "['ausbau', 'interior', 'finish'", '3D viewer recognizes KosmoDraw interior layers'),
    checkIncludes(sources.modelViewer, "['hlkse', 'mep', 'haustechnik'", '3D viewer recognizes KosmoDraw services layers'),
    checkIncludes(sources.modelViewer, 'activeAnalysisLayers.map', '3D viewer only renders detected discipline controls'),
    checkIncludes(sources.modelViewer, 'activeMaterialLayers.map', '3D viewer only renders detected material controls'),
    checkIncludes(sources.modelViewer, 'KosmoDraw-kompatible Layerstruktur', '3D viewer exposes the KosmoDraw layer contract')
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
