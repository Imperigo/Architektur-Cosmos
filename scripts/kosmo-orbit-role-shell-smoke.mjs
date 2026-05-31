#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const prototypeHtmlPath = resolve(projectRoot, args.html || 'orbit/role-shell-prototype.generated.html');
const prototypeManifestPath = resolve(projectRoot, args.manifest || 'orbit/role-shell-prototype.generated.json');
const outputJsonPath = resolve(projectRoot, args.output || 'orbit/role-shell-smoke.generated.json');
const outputMdPath = resolve(projectRoot, args.markdown || 'orbit/role-shell-smoke.generated.md');

const roleLabels = [
  'Chef / Owner Admin',
  'IT / KI Spezialist',
  'Projektleiter Architekt',
  'Entwurfsarchitekt',
  'Zeichner EFZ',
  'Praktikant',
  'Lehrling',
  'Schnupperstift'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(prototypeHtmlPath)) throw new Error(`KosmoOrbit role shell HTML not found: ${prototypeHtmlPath}`);
  if (!existsSync(prototypeManifestPath)) throw new Error(`KosmoOrbit role shell manifest not found: ${prototypeManifestPath}`);

  const html = readFileSync(prototypeHtmlPath, 'utf8');
  const manifest = readJson(prototypeManifestPath);
  const report = buildReport({ html, manifest });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit role shell smoke');
  console.log(`HTML: ${relative(root, prototypeHtmlPath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.summary.failed_checks > 0) process.exit(1);
}

function buildReport({ html, manifest }) {
  const checks = [
    check('html_exists', 'Role shell HTML exists.', existsSync(prototypeHtmlPath)),
    check('manifest_ready', 'Role shell manifest is ready.', manifest.status === 'role_shell_prototype_ready'),
    check('title_visible', 'Role-aware Orbit Shell title is visible.', html.includes('Role-Aware Orbit Shell')),
    check('all_role_labels_visible', 'All eight office roles are visible.', roleLabels.every((label) => html.includes(label))),
    check('role_card_count', 'Eight role cards are rendered.', countMatches(html, 'class="role-card"') === 8),
    check('role_button_count', 'Eight role buttons are rendered.', countMatches(html, 'class="role-button"') === 8),
    check('generate_design_blocked_everywhere', 'Generate Design is blocked on all role cards.', countMatches(html, 'data-enabled="false">Generate Design</div>') === 8),
    check('role_state_visible', 'Role-state panel is visible.', html.includes('Role State') && html.includes('active: owner_admin') && html.includes('selected: owner_admin')),
    check('active_project_visible', 'Active project from role state is visible.', html.includes('project: kosmo-demo-001') && html.includes('Active Project')),
    check('visible_modules_visible', 'Visible modules from role state are visible.', html.includes('Visible Modules') && html.includes('kosmo-design') && html.includes('kosmo-zentrale')),
    check('blocked_actions_visible', 'Blocked actions from role state are visible.', html.includes('Blocked Actions') && html.includes('Publish Public') && html.includes('Start Cloud Job')),
    check('static_safety_copy_visible', 'Static safety copy is visible.', html.includes('Static HTML only. No auth runtime, no user data writes, no network calls')),
    check('no_script_tags', 'Role shell has no script tags.', !/<script\b/i.test(html)),
    check('no_external_assets', 'Role shell has no external assets or network URLs.', !/(https?:\/\/|\/\/)/i.test(html)),
    check('manifest_no_generation', 'Manifest keeps generation-capable roles at zero.', manifest.summary?.generation_capable_count === 0),
    check('manifest_smoke_passed', 'Manifest references a passed role UI smoke.', manifest.summary?.smoke_status === 'role_ui_smoke_passed'),
    check('manifest_role_state_present', 'Manifest references the role-state contract.', manifest.source_role_state === 'examples/kosmo-orbit/role-state.demo.json' && manifest.summary?.blocked_action_count === 3)
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-role-shell-smoke',
    prototype_html: relative(root, prototypeHtmlPath),
    prototype_manifest: relative(root, prototypeManifestPath),
    status: failed.length ? 'role_shell_smoke_failed' : 'role_shell_smoke_passed',
    policy: {
      static_html_only: true,
      no_auth_runtime: true,
      no_user_data_write: true,
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
      role_count: roleLabels.length,
      role_card_count: countMatches(html, 'class="role-card"'),
      role_button_count: countMatches(html, 'class="role-button"'),
      blocked_generation_action_count: countMatches(html, 'data-enabled="false">Generate Design</div>'),
      visible_module_count: manifest.summary?.visible_module_count ?? null,
      blocked_action_count: manifest.summary?.blocked_action_count ?? null
    },
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed role shell smoke check: ${item.id}`)
      : [
          'Keep this smoke check in the Orbit full review before changing the role shell prototype.',
          'Use the role shell as the local visual reference for a future role-aware app route.',
          'Add real interaction only after local auth and role state contracts are explicit.'
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
    '# KosmoOrbit Role Shell Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `HTML: \`${report.prototype_html}\``,
    '',
    'Review-only smoke. This check reads static files only and does not create users, call external URLs, open Blender, generate geometry or upload files.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- failed checks: ${report.summary.failed_checks}`,
    `- role cards: ${report.summary.role_card_count}`,
    `- role buttons: ${report.summary.role_button_count}`,
    `- blocked generation actions: ${report.summary.blocked_generation_action_count}`,
    `- visible modules: ${report.summary.visible_module_count}`,
    `- blocked actions: ${report.summary.blocked_action_count}`,
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

function countMatches(value, needle) {
  return String(value).split(needle).length - 1;
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
