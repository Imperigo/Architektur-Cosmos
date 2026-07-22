#!/usr/bin/env node

import { publicLeakMatches } from './public-leak-patterns.mjs';

const cases = [
  ['/mnt/data/ArchitekturKosmos/Assets/private.pdf', '/\\/mnt\\//i'],
  ['/home/andrin-baumann/.codex/state.json', '/\\/home\\//i'],
  ['/Users/andrin-baumann/ArchitectureCosmos/private.pdf', '/\\/users\\//i'],
  ['/Volumes/Archive/ArchitectureCosmos/private.pdf', '/\\/volumes\\//i'],
  ['C:\\Users\\andrin-baumann\\ArchitectureCosmos\\private.pdf', '/\\b[a-z]:\\/(?:users|mnt|home|onedrive|architekturkosmos)\\//i'],
  ['file:///Users/andrin-baumann/ArchitectureCosmos/private.pdf', '/file:\\/\\/\\//i'],
  ['source-root decision payload', '/source[-_\\s]?root/i'],
  ['source root decision payload', '/source[-_\\s]?root/i'],
  ['source_root decision payload', '/source[-_\\s]?root/i'],
  ['private-library source note', '/private[-_\\s]?library/i'],
  ['private library source note', '/private[-_\\s]?library/i'],
  ['private_library source note', '/private[-_\\s]?library/i'],
  ['OneDrive/11 AI Workflow/internal.pdf', '/onedrive/i'],
  ['archiv/ArchitekturKosmos/Assets/private-scan.jpg', '/archiv\\/architekturkosmos\\/assets/i'],
  ['_overseer/intake/inbox/handoff.md', '/_overseer/i'],
  ['.claude/settings.local.json', '/\\.claude/i'],
  ['.codex/session.json', '/\\.codex/i'],
  ['owner inbox routing note', '/owner[-_\\s]?inbox/i'],
  ['owner_inbox/routing.json', '/owner[-_\\s]?inbox/i'],
  ['intake inbox handoff note', '/intake[-_\\s]?inbox/i'],
  ['intake_inbox/handoff.json', '/intake[-_\\s]?inbox/i'],
  ['codex memory checkpoint', '/codex[-_\\s]?memory/i'],
  ['09 Codex Memory/checkpoint.md', '/09[-_\\s]?codex[-_\\s]?memory/i'],
  ['worker logs should stay local', '/worker[-_\\s]?logs?/i'],
  ['worker-output/raw-response.json', '/worker[-_\\s]?outputs?/i'],
  ['protected-source.pdf', '/\\.pdf($|\\?)/i'],
  ['archive-intake/out/raw.json', '/archive-intake/i'],
  ['raw-archive/one-off-export.json', '/(?:raw[-_\\s]?archive|archive[-_\\s]?raw)/i'],
  ['private-scan-page-001.jpg', '/(?:private|source)[-_\\s]?scans?/i'],
  ['scan transcript page text', '/(?:ocr|scan)[-_\\s]?transcripts?/i'],
  ['OCR extracted page text', '/\\bocr\\b/i'],
  ['%2Fmnt%2Fdata%2FArchitekturKosmos%2FAssets%2Fprivate.pdf', '/\\/mnt\\//i'],
  ['%252Fhome%252Fandrin-baumann%252F.codex%252Fstate.json', '/\\/home\\//i'],
  ['source%2Droot%20decision%20payload', '/source[-_\\s]?root/i'],
  ['OneDrive%2F11%20AI%20Workflow%2Finternal.pdf', '/onedrive/i'],
  ['worker%2Doutputs%2Fraw-response.json', '/worker[-_\\s]?outputs?/i'],
  ['&#47;home&#47;andrin-baumann&#47;.codex&#47;state.json', '/\\/home\\//i'],
  ['file&#58;&#47;&#47;&#47;Users&#47;andrin-baumann&#47;ArchitectureCosmos&#47;private.pdf', '/\\/users\\//i'],
  ['archive&#45;intake&#47;out&#47;raw.json', '/archive-intake/i'],
  ['C:\\mnt\\data\\ArchitekturKosmos\\Assets\\private.pdf', '/\\/mnt\\//i']
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
