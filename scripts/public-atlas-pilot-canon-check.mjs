#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const file = 'app/atlas/[slug]/page.tsx';
const source = readFileSync(file, 'utf8');

const functionChecks = [
  {
    name: 'PublicPilotSection',
    required: ['PublicSplitSection', 'PublicCardGrid', 'PublicInfoCard'],
    blocked: [
      { id: 'legacy_entry_study_card', pattern: /\bentry-study-card\b/g, detail: 'Use public card primitives in the public pilot section.' },
      { id: 'hard_text_color', pattern: /\btext-\[#/g, detail: 'Use public primitive typography instead of hard-coded text colors.' },
      { id: 'arbitrary_text_size', pattern: /\btext-\[/g, detail: 'Use public primitive typography instead of arbitrary text sizes.' },
      { id: 'arbitrary_tracking', pattern: /\btracking-\[/g, detail: 'Use public primitive meta text instead of arbitrary tracking.' },
      { id: 'hard_panel_surface', pattern: /\bbg-\[#/g, detail: 'Use public primitive surfaces instead of hard-coded panel colors.' },
      { id: 'legacy_border', pattern: /\bborder-white\/14\b/g, detail: 'Use public primitive borders in the public pilot section.' }
    ]
  },
  {
    name: 'ModelAnalysisSection',
    required: ['PublicSplitSection', 'PublicCardGrid', 'PublicMetricCard', 'PublicInfoCard'],
    blocked: [
      { id: 'legacy_entry_study_card', pattern: /\bentry-study-card\b/g, detail: 'Use public primitives in the model analysis status section.' },
      { id: 'hard_text_color', pattern: /\btext-\[#/g, detail: 'Use public primitive typography instead of hard-coded text colors.' },
      { id: 'arbitrary_text_size', pattern: /\btext-\[/g, detail: 'Use public primitive typography instead of arbitrary text sizes.' },
      { id: 'arbitrary_tracking', pattern: /\btracking-\[/g, detail: 'Use public primitive meta text instead of arbitrary tracking.' },
      { id: 'hard_panel_surface', pattern: /\bbg-\[#/g, detail: 'Use public primitive surfaces instead of hard-coded panel colors.' },
      { id: 'legacy_border', pattern: /\bborder-white\/14\b/g, detail: 'Use public primitive borders in the model analysis status section.' }
    ]
  }
];

const findings = [];

for (const check of functionChecks) {
  const body = extractFunctionBody(source, check.name);
  if (!body) {
    findings.push({
      id: `${file}:${check.name}:missing`,
      file,
      line: null,
      match: check.name,
      detail: `Could not find function ${check.name}.`
    });
    continue;
  }

  for (const required of check.required) {
    if (!body.includes(required)) {
      findings.push({
        id: `${file}:${check.name}:missing:${required}`,
        file,
        line: lineNumberForIndex(source, source.indexOf(`function ${check.name}`)),
        match: required,
        detail: `${check.name} must use ${required}.`
      });
    }
  }

  for (const rule of check.blocked) {
    const matches = [...body.matchAll(rule.pattern)];
    for (const match of matches) {
      const absoluteIndex = source.indexOf(body) + (match.index ?? 0);
      findings.push({
        id: `${file}:${check.name}:${rule.id}`,
        file,
        line: lineNumberForIndex(source, absoluteIndex),
        match: match[0],
        detail: rule.detail
      });
    }
  }
}

const summary = {
  status: findings.length === 0 ? 'passed' : 'failed',
  checked_file: file,
  checked_functions: functionChecks.map((check) => check.name),
  findings
};

console.log(JSON.stringify(summary, null, 2));
if (findings.length > 0) process.exit(1);

function extractFunctionBody(text, name) {
  const start = text.indexOf(`function ${name}`);
  if (start === -1) return null;
  const nextFunction = text.indexOf('\nfunction ', start + `function ${name}`.length);
  return text.slice(start, nextFunction === -1 ? text.length : nextFunction);
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split('\n').length;
}
