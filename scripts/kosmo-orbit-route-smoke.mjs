#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const specPath = resolve(root, args.spec || 'examples/kosmo-orbit/review/orbit-app-route-spec.generated.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-route-smoke.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-route-smoke.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(routePath)) throw new Error(`KosmoOrbit route file not found: ${routePath}`);
  if (!existsSync(specPath)) throw new Error(`KosmoOrbit app route spec not found: ${specPath}`);

  const source = readFileSync(routePath, 'utf8');
  const spec = readJson(specPath);
  const report = buildReport({ source, spec });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit route smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_route_smoke_passed') process.exit(1);
}

function buildReport({ source, spec }) {
  const forbiddenPatterns = [
    { id: 'no_use_server', pattern: /['"]use server['"]/ },
    { id: 'no_next_server', pattern: /from ['"]next\/server['"]/ },
    { id: 'no_fetch', pattern: /\bfetch\s*\(/ },
    { id: 'no_cookies', pattern: /\bcookies\s*\(/ },
    { id: 'no_headers', pattern: /\bheaders\s*\(/ },
    { id: 'no_redirect', pattern: /\bredirect\s*\(/ }
  ];

  const checks = [
    check('route_file_exists', 'app/orbit/page.tsx exists.', existsSync(routePath)),
    check('spec_ready', 'App route spec is ready.', spec.status === 'orbit_app_route_spec_ready'),
    check('spec_sees_implemented_route', 'App route spec sees the route as implemented static preview.', spec.route_spec?.status === 'implemented_static_preview'),
    check('imports_route_spec', 'Route imports the local route spec JSON.', source.includes('orbit-app-route-spec.generated.json')),
    check('imports_role_state', 'Route imports the local role state JSON.', source.includes('role-state.demo.json')),
    check('imports_role_variants', 'Route imports the local role variants JSON.', source.includes('role-ui-variants.generated.json')),
    check('imports_shell_manifest', 'Route imports the local shell manifest JSON.', source.includes('role-shell-prototype.generated.json')),
    check('uses_force_static', 'Route declares force-static rendering.', source.includes("dynamic = 'force-static'") || source.includes('dynamic = "force-static"')),
    check('shows_kosmo_orbit', 'Route renders KosmoOrbit heading.', source.includes('KosmoOrbit')),
    check('shows_demo_path', 'Route renders the 3-minute human demo path.', source.includes('3-Minuten-Demo') && source.includes('demoSteps')),
    check('shows_design_review_mode', 'Route renders KosmoDesign Review Mode handoff copy.', source.includes('KosmoDesign Review Mode')),
    check('shows_role_explanations', 'Route renders role explanations from variants.', source.includes('variant.explanation')),
    check('shows_blocked_actions', 'Route renders blocked action labels from role state.', source.includes('Blockierte Aktionen') && source.includes('roleState.blocked_actions.map')),
    check('shows_review_only_copy', 'Route keeps review-only safety copy visible.', source.includes('review-only') || source.includes('Review')),
    ...forbiddenPatterns.map((item) => check(item.id, `Forbidden pattern is absent: ${item.id}.`, !item.pattern.test(source)))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-route-smoke',
    status: failed.length ? 'orbit_route_smoke_blocked' : 'orbit_route_smoke_passed',
    route_file: relative(root, routePath),
    spec_file: relative(root, specPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length
    },
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed KosmoOrbit route smoke check: ${item.id}`)
      : [
          'Keep /orbit static-export-safe until a local Orbit runtime exists.',
          'Do not add public navigation to /orbit before a human review approves the preview.',
          'Use this route as the first visible KosmoOrbit cockpit for role and gate review.'
        ]
  };
}

function check(id, label, passed) {
  return {
    id,
    label,
    status: passed ? 'passed' : 'failed'
  };
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Route Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Route: \`${report.route_file}\``,
    '',
    'Static route smoke for the first `/orbit` preview. This check rejects server-only patterns, network calls, cookies, headers and redirects.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    '',
    '## Checks',
    '',
    '| Check | Status | Meaning |',
    '| --- | --- | --- |'
  ];

  for (const item of report.checks) {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`);
  }

  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
