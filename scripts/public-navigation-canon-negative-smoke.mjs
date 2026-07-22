#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-navigation-canon-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);
const headerPath = resolve(root, 'components/public/PublicSiteHeader.tsx');

const cases = [
  {
    id: 'duplicate_href',
    mutate: (source) => source.replace("href: '/orbit/'", "href: '/atlas/'"),
    expectedFailures: ['header:duplicate_href:/atlas/', 'header:required_core_link:/orbit/']
  },
  {
    id: 'private_source_href',
    mutate: (source) => source.replace("href: '/orbit/'", "href: '/source-root/'"),
    expectedFailures: [
      'header:required_core_link:/orbit/',
      'header:item:orbit:route_manifest',
      'header:item:orbit:href_private_pattern',
      'header:item:orbit:blocked_surface'
    ]
  },
  {
    id: 'missing_public_area_type',
    mutate: (source) => source.replace("id: 'orbit' as const", "id: 'review' as const"),
    expectedFailures: ['header:item:review:public_area']
  },
  {
    id: 'missing_label',
    mutate: (source) => source.replace("label: 'Status'", "label: ''"),
    expectedFailures: ['header:item:orbit:label']
  }
];

try {
  runSmoke();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  if (!keepTemp) rmSync(tempRoot, { recursive: true, force: true });
}

function runSmoke() {
  rmSync(tempRoot, { recursive: true, force: true });
  mkdirSync(tempRoot, { recursive: true });

  const baseSource = readFileSync(headerPath, 'utf8');
  const results = cases.map((testCase) => runCase(testCase, baseSource));
  const summary = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    checked_cases: results.length,
    cases: results
  };

  console.log(JSON.stringify(summary, null, 2));
}

function runCase(testCase, baseSource) {
  const syntheticHeaderPath = resolve(tempRoot, `${testCase.id}.PublicSiteHeader.tsx`);
  writeFileSync(syntheticHeaderPath, testCase.mutate(baseSource), 'utf8');

  const result = spawnSync(
    process.execPath,
    ['scripts/public-navigation-canon-check.mjs', '--header', syntheticHeaderPath],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (result.status === 0) {
    throw new Error(`Expected public-navigation-canon-check to fail for synthetic case ${testCase.id}.`);
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Expected JSON output from public-navigation-canon-check for ${testCase.id}. stderr: ${
        result.stderr || error.message
      }`
    );
  }

  const failedIds = new Set((report.failed_findings || []).map((failure) => failure.id));
  const missingFailures = testCase.expectedFailures.filter((id) => !failedIds.has(id));
  if (missingFailures.length > 0) {
    throw new Error(`Navigation negative smoke ${testCase.id} missed failures: ${missingFailures.join(', ')}`);
  }

  return {
    id: testCase.id,
    synthetic_header_path: keepTemp ? relative(root, syntheticHeaderPath) : null,
    expected_failed_checks: testCase.expectedFailures,
    observed_failed_checks: [...failedIds].sort()
  };
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (index + 1 < argv.length && next && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
