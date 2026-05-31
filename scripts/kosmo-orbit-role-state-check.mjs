#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const workspacePath = resolve(root, args.workspace || 'examples/kosmo-orbit/workspace.demo.json');
const roleStatePath = resolve(root, args.state || 'examples/kosmo-orbit/role-state.demo.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-role-state-check.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-role-state-check.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(workspacePath)) throw new Error(`KosmoOrbit workspace not found: ${workspacePath}`);
  if (!existsSync(roleStatePath)) throw new Error(`KosmoOrbit role state not found: ${roleStatePath}`);

  const workspace = readJson(workspacePath);
  const roleState = readJson(roleStatePath);
  const report = buildReport({ workspace, roleState });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit role state check');
  console.log(`State: ${relative(root, roleStatePath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.summary.failed_checks > 0) process.exit(1);
}

function buildReport({ workspace, roleState }) {
  const roleIds = new Set(asArray(workspace.roles).map((role) => role.id));
  const toolIds = new Set(asArray(workspace.tools).map((tool) => tool.id));
  const projectIds = new Set(asArray(workspace.projects).map((project) => project.id));
  const gateIds = new Set(asArray(workspace.gates).map((gate) => gate.id));
  const visibleModules = asArray(roleState.visible_modules);
  const blockedActions = asArray(roleState.blocked_actions);
  const availableRoleIds = asArray(roleState.role_preview?.available_role_ids);

  const checks = [
    check('schema_version', 'Role state schema version is supported.', roleState.schema_version === '0.1'),
    check('active_user_matches_workspace', 'Role state user matches workspace current user.', roleState.session?.user_id === workspace.current_user?.id),
    check('active_role_exists', 'Active role exists in workspace roles.', roleIds.has(roleState.session?.active_role_id)),
    check('selected_role_exists', 'Selected preview role exists in workspace roles.', roleIds.has(roleState.role_preview?.selected_role_id)),
    check('default_role_exists', 'Default preview role exists in workspace roles.', roleIds.has(roleState.role_preview?.default_role_id)),
    check('available_roles_exist', 'Every available preview role exists in workspace roles.', availableRoleIds.length > 0 && availableRoleIds.every((roleId) => roleIds.has(roleId))),
    check('project_exists', 'Active project exists in workspace projects.', projectIds.has(roleState.active_project?.project_id)),
    check('package_path_exists', 'Active project package path exists locally.', roleState.active_project?.package_path && existsSync(resolve(root, roleState.active_project.package_path))),
    check('review_only_policy', 'Role state remains review-only.', roleState.interaction_policy?.review_only === true),
    check('no_user_write', 'Role state does not allow user writes.', roleState.interaction_policy?.allow_user_write === false),
    check('no_design_generation', 'Role state does not allow design generation.', roleState.interaction_policy?.allow_design_generation === false),
    check('no_public_publish', 'Role state does not allow public publish.', roleState.interaction_policy?.allow_public_publish === false),
    check('no_external_network', 'Role state does not allow external network access.', roleState.interaction_policy?.allow_external_network === false),
    check('visible_modules_reference_tools', 'Every visible module references a known tool.', visibleModules.length > 0 && visibleModules.every((module) => toolIds.has(module.tool_id))),
    check('primary_design_module_visible', 'KosmoDesign is the primary visible module for this demo state.', visibleModules.some((module) => module.tool_id === 'kosmo-design' && module.visibility === 'primary')),
    check('blocked_actions_reference_gates', 'Every blocked action references a known gate.', blockedActions.length > 0 && blockedActions.every((action) => gateIds.has(action.gate_id))),
    check('generate_design_blocked', 'Generate Design remains explicitly blocked.', blockedActions.some((action) => action.id === 'generate-design')),
    check('publish_public_blocked', 'Public publish remains explicitly blocked.', blockedActions.some((action) => action.id === 'publish-public'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-role-state-check',
    workspace_path: relative(root, workspacePath),
    role_state_path: relative(root, roleStatePath),
    status: failed.length ? 'role_state_check_failed' : 'role_state_check_passed',
    policy: {
      review_only: true,
      no_auth_runtime: true,
      no_user_data_write: true,
      no_design_generation: true,
      no_public_publish: true,
      no_external_network: true
    },
    state: {
      id: roleState.state?.id || null,
      mode: roleState.state?.mode || null,
      active_role_id: roleState.session?.active_role_id || null,
      selected_role_id: roleState.role_preview?.selected_role_id || null,
      active_project_id: roleState.active_project?.project_id || null
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      available_role_count: availableRoleIds.length,
      visible_module_count: visibleModules.length,
      blocked_action_count: blockedActions.length,
      primary_module_count: visibleModules.filter((module) => module.visibility === 'primary').length
    },
    checks,
    visible_modules: visibleModules,
    blocked_actions: blockedActions,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed role state check: ${item.id}`)
      : [
          'Use this role state as the data contract for the next role-aware Orbit prototype pass.',
          'Keep this check in the full review before adding real interaction or routing.',
          'Do not treat this role state as auth; it is a local UI contract only.'
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
    '# KosmoOrbit Role State Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Role state: \`${report.role_state_path}\``,
    '',
    'Review-only role-state check. This validates a local UI state contract and does not create users, write auth data, call networks, open Blender or generate geometry.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- active role: \`${report.state.active_role_id}\``,
    `- selected role: \`${report.state.selected_role_id}\``,
    `- active project: \`${report.state.active_project_id}\``,
    `- available roles: ${report.summary.available_role_count}`,
    `- visible modules: ${report.summary.visible_module_count}`,
    `- blocked actions: ${report.summary.blocked_action_count}`,
    '',
    '## Visible Modules',
    '',
    '| Tool | Visibility | Reason |',
    '| --- | --- | --- |'
  ];

  for (const module of report.visible_modules) {
    lines.push(`| \`${module.tool_id}\` | \`${module.visibility}\` | ${escapePipe(module.reason)} |`);
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
