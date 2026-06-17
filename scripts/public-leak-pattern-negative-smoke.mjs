#!/usr/bin/env node

import { publicLeakMatches } from './public-leak-patterns.mjs';

const cases = [
  ['/mnt/data/ArchitekturKosmos/Assets/private.pdf', '/\\/mnt\\//i'],
  ['/home/andrin-baumann/.codex/state.json', '/\\/home\\//i'],
  ['source-root decision payload', '/source-root/i'],
  ['private-library source note', '/private-library/i'],
  ['OneDrive/11 AI Workflow/internal.pdf', '/onedrive/i'],
  ['archiv/ArchitekturKosmos/Assets/private-scan.jpg', '/archiv\\/architekturkosmos\\/assets/i'],
  ['_overseer/intake/inbox/handoff.md', '/_overseer/i'],
  ['.claude/settings.local.json', '/\\.claude/i'],
  ['.codex/session.json', '/\\.codex/i'],
  ['worker logs should stay local', '/worker[-_\\s]?logs?/i'],
  ['protected-source.pdf', '/\\.pdf($|\\?)/i'],
  ['archive-intake/out/raw.json', '/archive-intake/i'],
  ['OCR extracted page text', '/\\bocr\\b/i']
];

const findings = cases.map(([sample, expectedPattern]) => {
  const matches = publicLeakMatches(sample);
  return {
    sample,
    expected_pattern: expectedPattern,
    matches,
    passed: matches.includes(expectedPattern)
  };
});

const summary = {
  status: findings.every((finding) => finding.passed) ? 'passed' : 'failed',
  checked_cases: findings.length,
  findings
};

console.log(JSON.stringify(summary, null, 2));
if (summary.status !== 'passed') process.exit(1);
