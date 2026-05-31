#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const prototypeHtmlPath = resolve(projectRoot, args.html || 'orbit/design-handoff-ui-prototype.generated.html');
const prototypeManifestPath = resolve(projectRoot, args.manifest || 'orbit/design-handoff-ui-prototype.generated.json');
const outputJsonPath = resolve(projectRoot, args.output || 'orbit/design-handoff-ui-smoke.generated.json');
const outputMdPath = resolve(projectRoot, args.markdown || 'orbit/design-handoff-ui-smoke.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(prototypeHtmlPath)) throw new Error(`KosmoOrbit UI prototype HTML not found: ${prototypeHtmlPath}`);
  if (!existsSync(prototypeManifestPath)) throw new Error(`KosmoOrbit UI prototype manifest not found: ${prototypeManifestPath}`);

  const html = readFileSync(prototypeHtmlPath, 'utf8');
  const manifest = readJson(prototypeManifestPath);
  const report = buildReport({ html, manifest });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit KosmoDesign UI smoke');
  console.log(`HTML: ${relative(root, prototypeHtmlPath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.summary.failed_checks > 0) process.exit(1);
}

function buildReport({ html, manifest }) {
  const checks = [
    check('html_exists', existsSync(prototypeHtmlPath), 'Prototype HTML exists.'),
    check('manifest_ready', manifest.status === 'ui_prototype_ready', 'Prototype manifest is ready.'),
    check('title_visible', html.includes('KosmoDesign'), 'KosmoDesign title is visible.'),
    check('review_mode_visible', html.includes('context_review_only'), 'Review-only open mode is visible.'),
    check('primary_review_action_visible', html.includes('Open Review Mode'), 'Primary review action is visible.'),
    check('generate_design_visible', html.includes('Generate Design'), 'Generate Design action is visible.'),
    check('generate_design_disabled', /<button disabled>Generate Design<\/button>/.test(html), 'Generate Design is disabled.'),
    check('blocked_generation_reason_visible', html.includes('Design generation is blocked until context and human-review gates are approved.'), 'Blocked generation reason is visible.'),
    check('blockers_visible', html.includes('Context handoff does not approve design generation.'), 'Critical blocker is visible.'),
    check('guardrails_visible', html.includes('Do not run design generation unless context-selection has accepted_as_design_seed'), 'Critical guardrail is visible.'),
    check('no_network_scripts', !/<script\b/i.test(html), 'Prototype has no script tags.'),
    check('no_external_assets', !/(https?:\/\/|\/\/)/i.test(html), 'Prototype has no external assets or network URLs.')
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-design-ui-smoke',
    prototype_html: relative(root, prototypeHtmlPath),
    prototype_manifest: relative(root, prototypeManifestPath),
    status: failed.length ? 'ui_smoke_failed' : 'ui_smoke_passed',
    policy: {
      static_html_only: true,
      no_network_calls: true,
      no_blender_launch: true,
      no_geometry_generation: true,
      no_uploads: true,
      no_public_publish: true
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      blocker_count: manifest.smoke_expectations?.blocker_count ?? null,
      guardrail_count: manifest.smoke_expectations?.guardrail_count ?? null,
      primary_action_enabled: manifest.smoke_expectations?.primary_action_enabled === true,
      generation_enabled: manifest.smoke_expectations?.generation_enabled === true
    },
    checks,
    next_actions: failed.length
      ? ['Fix the failed UI smoke checks before using this prototype as Orbit visual reference.']
      : ['UI prototype is safe as a local visual reference for the first KosmoOrbit app screen.']
  };
}

function check(id, passed, label) {
  return {
    id,
    status: passed ? 'passed' : 'failed',
    label
  };
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit KosmoDesign UI Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `HTML: \`${report.prototype_html}\``,
    '',
    'Review-only smoke. This check reads static files only and does not open Blender, generate geometry, upload files or call external URLs.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- failed checks: ${report.summary.failed_checks}`,
    `- blocker count: ${report.summary.blocker_count}`,
    `- guardrail count: ${report.summary.guardrail_count}`,
    `- primary action enabled: ${report.summary.primary_action_enabled ? 'yes' : 'no'}`,
    `- generation enabled: ${report.summary.generation_enabled ? 'yes' : 'no'}`,
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
