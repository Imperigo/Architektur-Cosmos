#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const explorerFiles = [
  'components/public/PublicReferenceExplorer.tsx',
  'components/public/PublicAssetExplorer.tsx'
];

const cssFile = 'app/claude-design.css';

const blockedPatterns = [
  { id: 'hard_text_color', pattern: /\btext-\[#/g, detail: 'Use semantic public text classes instead of hard-coded text colors.' },
  { id: 'arbitrary_text_size', pattern: /\btext-\[/g, detail: 'Use public card/index type classes instead of arbitrary text sizes.' },
  { id: 'arbitrary_tracking', pattern: /\btracking-\[/g, detail: 'Use public mono/meta classes instead of arbitrary tracking.' },
  { id: 'ad_hoc_leading', pattern: /\bleading-(?:tight|\d|\[)/g, detail: 'Use public card/index line-height classes instead of local leading utilities.' },
  { id: 'ad_hoc_font_weight', pattern: /\bfont-semibold\b/g, detail: 'Use public card/index weight classes instead of local font-weight utilities.' },
  { id: 'ad_hoc_uppercase', pattern: /\buppercase\b/g, detail: 'Use public mono/meta classes instead of local uppercase utilities.' },
  { id: 'hard_accent_color', pattern: /\b(?:bg|hover:bg|border|text)-\[#/g, detail: 'Use local explorer accent variables instead of hard-coded accent utilities.' }
];

const requiredCssClasses = [
  'public-card-meta',
  'public-explorer-card',
  'public-reference-media-frame',
  'public-asset-media-frame',
  'public-card-title',
  'public-card-summary',
  'public-card-location',
  'public-card-credit',
  'public-card-provenance',
  'public-index-table',
  'public-index-head',
  'public-index-row',
  'public-index-accent',
  'public-index-title',
  'public-index-body',
  'public-index-meta',
  'public-index-value',
  'public-load-more-row',
  'public-load-more-count',
  'public-progress-track',
  'public-progress-fill'
];

const findings = [];

for (const file of explorerFiles) {
  const source = readFileSync(file, 'utf8');
  for (const rule of blockedPatterns) {
    const matches = [...source.matchAll(rule.pattern)];
    for (const match of matches) {
      findings.push({
        id: `${file}:${rule.id}`,
        file,
        line: lineNumberForIndex(source, match.index ?? 0),
        match: match[0],
        detail: rule.detail
      });
    }
  }
}

const cssSource = readFileSync(cssFile, 'utf8');
for (const className of requiredCssClasses) {
  if (!cssSource.includes(`.${className}`)) {
    findings.push({
      id: `${cssFile}:missing:${className}`,
      file: cssFile,
      line: null,
      match: className,
      detail: `Missing required public explorer CSS class .${className}.`
    });
  }
}

const summary = {
  status: findings.length === 0 ? 'passed' : 'failed',
  checked_files: explorerFiles.length,
  required_css_classes: requiredCssClasses.length,
  findings
};

console.log(JSON.stringify(summary, null, 2));
if (findings.length > 0) process.exit(1);

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split('\n').length;
}
