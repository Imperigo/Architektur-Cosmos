#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const roleStatePath = resolve(root, args.state || 'examples/kosmo-orbit/role-state.demo.json');
const roleStateCheckPath = resolve(root, args.check || 'examples/kosmo-orbit/review/orbit-role-state-check.generated.json');
const roleStateSmokePath = resolve(root, args.stateSmoke || 'examples/kosmo-orbit/review/orbit-role-state-smoke.generated.json');
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const shellManifestPath = resolve(projectRoot, args.shell || 'orbit/role-shell-prototype.generated.json');
const shellSmokePath = resolve(projectRoot, args.shellSmoke || 'orbit/role-shell-smoke.generated.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-role-state-handoff.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-role-state-handoff.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  for (const pathname of [roleStatePath, roleStateCheckPath, roleStateSmokePath, shellManifestPath, shellSmokePath]) {
    if (!existsSync(pathname)) throw new Error(`Required KosmoOrbit handoff input not found: ${pathname}`);
  }

  const roleState = readJson(roleStatePath);
  const roleStateCheck = readJson(roleStateCheckPath);
  const roleStateSmoke = readJson(roleStateSmokePath);
  const shellManifest = readJson(shellManifestPath);
  const shellSmoke = readJson(shellSmokePath);
  const report = buildReport({ roleState, roleStateCheck, roleStateSmoke, shellManifest, shellSmoke });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit role state handoff');
  console.log(`Status: ${report.status}`);
  console.log(`Handoff items: ${report.summary.handoff_item_count}`);
  console.log(`Blocked actions: ${report.summary.blocked_action_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'role_state_handoff_ready') process.exit(1);
}

function buildReport({ roleState, roleStateCheck, roleStateSmoke, shellManifest, shellSmoke }) {
  const visibleModules = asArray(roleState.visible_modules);
  const blockedActions = asArray(roleState.blocked_actions);
  const checks = [
    check('role_state_check_passed', 'Role state check passed.', roleStateCheck.status === 'role_state_check_passed'),
    check('role_state_smoke_passed', 'Role state smoke passed.', roleStateSmoke.status === 'role_state_smoke_passed'),
    check('role_shell_ready', 'Role shell prototype is ready.', shellManifest.status === 'role_shell_prototype_ready'),
    check('role_shell_smoke_passed', 'Role shell smoke passed.', shellSmoke.status === 'role_shell_smoke_passed'),
    check('same_active_role', 'Role shell active role matches role state.', shellManifest.role_state?.active_role_id === roleState.session?.active_role_id),
    check('same_selected_role', 'Role shell selected role matches role state.', shellManifest.role_state?.selected_role_id === roleState.role_preview?.selected_role_id),
    check('same_active_project', 'Role shell active project matches role state.', shellManifest.role_state?.active_project_id === roleState.active_project?.project_id),
    check('visible_modules_preserved', 'Visible module count is preserved in shell manifest.', shellManifest.summary?.visible_module_count === visibleModules.length),
    check('blocked_actions_preserved', 'Blocked action count is preserved in shell manifest.', shellManifest.summary?.blocked_action_count === blockedActions.length),
    check('review_only_preserved', 'Review-only policy is preserved.', shellManifest.role_state?.review_only === true && roleState.interaction_policy?.review_only === true)
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-role-state-handoff',
    status: failed.length ? 'role_state_handoff_blocked' : 'role_state_handoff_ready',
    inputs: {
      role_state: relative(root, roleStatePath),
      role_state_check: relative(root, roleStateCheckPath),
      role_state_smoke: relative(root, roleStateSmokePath),
      shell_manifest: relative(root, shellManifestPath),
      shell_smoke: relative(root, shellSmokePath)
    },
    policy: {
      review_only: true,
      no_auth_runtime: true,
      no_user_data_write: true,
      no_network_calls: true,
      no_uploads: true,
      no_public_publish: true,
      no_design_generation: true
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      handoff_item_count: 6,
      active_role_id: roleState.session?.active_role_id || null,
      selected_role_id: roleState.role_preview?.selected_role_id || null,
      active_project_id: roleState.active_project?.project_id || null,
      visible_module_count: visibleModules.length,
      blocked_action_count: blockedActions.length
    },
    handoff_items: [
      {
        id: 'session-role',
        label: 'Session role state',
        app_use: 'Drive the displayed active role and preview role in a future local Orbit app route.',
        source: relative(root, roleStatePath)
      },
      {
        id: 'active-project',
        label: 'Active project binding',
        app_use: 'Load the selected project package without introducing network or backend reads.',
        source: roleState.active_project?.package_path || null
      },
      {
        id: 'visible-modules',
        label: 'Visible module policy',
        app_use: 'Render primary, available and summary-only modules from data instead of hardcoded UI branches.',
        source: relative(root, roleStatePath)
      },
      {
        id: 'blocked-actions',
        label: 'Blocked action policy',
        app_use: 'Keep dangerous actions visible but disabled with gate reasons.',
        source: relative(root, roleStatePath)
      },
      {
        id: 'role-shell-reference',
        label: 'Role shell visual reference',
        app_use: 'Use the generated HTML shell as the visual baseline before a Next route exists.',
        source: shellManifest.html_output || null
      },
      {
        id: 'smoke-gates',
        label: 'Smoke gates',
        app_use: 'Run role state and role shell smokes before interaction or routing changes.',
        source: relative(root, shellSmokePath)
      }
    ],
    visible_modules: visibleModules,
    blocked_actions: blockedActions,
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed role-state handoff check: ${item.id}`)
      : [
          'Use this handoff as the contract for the first local/static KosmoOrbit role-state app route.',
          'Keep the next route static and data-read-only until auth/runtime decisions are explicit.',
          'Do not enable generation, publish, uploads or external network actions from this handoff.'
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
    '# KosmoOrbit Role State Handoff',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Review-only handoff from checked role state to the static role shell. This does not create auth, write user data, call networks, open Blender, generate geometry, upload files or publish.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- active role: \`${report.summary.active_role_id}\``,
    `- selected role: \`${report.summary.selected_role_id}\``,
    `- active project: \`${report.summary.active_project_id}\``,
    `- visible modules: ${report.summary.visible_module_count}`,
    `- blocked actions: ${report.summary.blocked_action_count}`,
    '',
    '## Handoff Items',
    '',
    '| Item | App Use | Source |',
    '| --- | --- | --- |'
  ];

  for (const item of report.handoff_items) {
    lines.push(`| ${escapePipe(item.label)} | ${escapePipe(item.app_use)} | \`${item.source || 'unknown'}\` |`);
  }

  lines.push('', '## Blocked Actions', '', '| Action | Gate | Reason |', '| --- | --- | --- |');
  for (const action of report.blocked_actions) {
    lines.push(`| ${escapePipe(action.label)} | \`${action.gate_id}\` | ${escapePipe(action.reason)} |`);
  }

  lines.push('', '## Checks', '', '| Check | Status | Meaning |', '| --- | --- | --- |');
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
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
