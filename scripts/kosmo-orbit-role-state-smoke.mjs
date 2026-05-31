#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const statePath = resolve(root, args.state || 'examples/kosmo-orbit/role-state.demo.json');
const schemaPath = resolve(root, args.schema || 'schema/kosmo-orbit-role-state.schema.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-role-state-smoke.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-role-state-smoke.generated.md');

const allowedRoles = [
  'owner_admin',
  'it_ai_admin',
  'project_lead_architect',
  'design_architect',
  'drafter_efz',
  'intern',
  'apprentice',
  'trial_user'
];

const allowedVisibility = ['primary', 'available', 'summary_only', 'hidden'];
const requiredPolicy = {
  review_only: true,
  allow_user_write: false,
  allow_design_generation: false,
  allow_public_publish: false,
  allow_external_network: false
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(statePath)) throw new Error(`KosmoOrbit role state not found: ${statePath}`);
  if (!existsSync(schemaPath)) throw new Error(`KosmoOrbit role-state schema not found: ${schemaPath}`);

  const state = readJson(statePath);
  const schema = readJson(schemaPath);
  const report = buildReport({ state, schema });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit role state smoke');
  console.log(`State: ${relative(root, statePath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.summary.failed_checks > 0) process.exit(1);
}

function buildReport({ state, schema }) {
  const availableRoles = asArray(state.role_preview?.available_role_ids);
  const visibleModules = asArray(state.visible_modules);
  const blockedActions = asArray(state.blocked_actions);
  const requiredKeys = [
    'schema_version',
    'state',
    'session',
    'active_project',
    'role_preview',
    'interaction_policy',
    'visible_modules',
    'blocked_actions'
  ];

  const checks = [
    check('state_file_exists', 'Role-state JSON exists.', existsSync(statePath)),
    check('schema_file_exists', 'Role-state schema exists.', existsSync(schemaPath)),
    check('schema_version', 'Role-state version is 0.1.', state.schema_version === '0.1' && schema.properties?.schema_version?.const === '0.1'),
    check('required_top_level_keys', 'All required top-level keys are present.', requiredKeys.every((key) => Object.hasOwn(state, key))),
    check('review_only_policy', 'Interaction policy remains review-only.', Object.entries(requiredPolicy).every(([key, expected]) => state.interaction_policy?.[key] === expected)),
    check('active_role_available', 'Active role is included in available roles.', availableRoles.includes(state.session?.active_role_id)),
    check('selected_role_available', 'Selected preview role is included in available roles.', availableRoles.includes(state.role_preview?.selected_role_id)),
    check('default_role_available', 'Default preview role is included in available roles.', availableRoles.includes(state.role_preview?.default_role_id)),
    check('known_role_ids_only', 'Every available role id is known.', availableRoles.length > 0 && availableRoles.every((role) => allowedRoles.includes(role))),
    check('project_package_path_local', 'Active project points at a local project package path.', typeof state.active_project?.package_path === 'string' && !/^(https?:)?\/\//i.test(state.active_project.package_path)),
    check('visible_modules_have_reasons', 'Every visible module has a valid visibility and reason.', visibleModules.length > 0 && visibleModules.every((module) => module.tool_id && allowedVisibility.includes(module.visibility) && String(module.reason || '').length >= 12)),
    check('kosmo_design_primary', 'KosmoDesign is the primary visible module in this demo state.', visibleModules.some((module) => module.tool_id === 'kosmo-design' && module.visibility === 'primary')),
    check('blocked_actions_have_gates', 'Every blocked action has a gate id and reason.', blockedActions.length >= 3 && blockedActions.every((action) => action.id && action.gate_id && String(action.reason || '').length >= 12)),
    check('generation_blocked', 'Generate Design is explicitly blocked.', blockedActions.some((action) => action.id === 'generate-design') && state.interaction_policy?.allow_design_generation === false),
    check('publish_blocked', 'Public publishing is explicitly blocked.', blockedActions.some((action) => action.id === 'publish-public') && state.interaction_policy?.allow_public_publish === false),
    check('no_external_network', 'External network access is blocked.', state.interaction_policy?.allow_external_network === false)
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-role-state-smoke',
    role_state: relative(root, statePath),
    schema: relative(root, schemaPath),
    status: failed.length ? 'role_state_smoke_failed' : 'role_state_smoke_passed',
    policy: {
      static_review_only: true,
      no_auth_runtime: true,
      no_user_data_write: true,
      no_network_calls: true,
      no_uploads: true,
      no_public_publish: true
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      available_role_count: availableRoles.length,
      visible_module_count: visibleModules.length,
      blocked_action_count: blockedActions.length,
      active_role_id: state.session?.active_role_id || null,
      selected_role_id: state.role_preview?.selected_role_id || null,
      active_project_id: state.active_project?.project_id || null
    },
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed role-state smoke check: ${item.id}`)
      : [
          'Use this role-state contract as the safe local state input for the next KosmoOrbit UI shell pass.',
          'Keep this state review-only until real auth and role storage are explicitly designed.',
          'Do not wire role state to public writes, uploads, network jobs or generation actions without approval gates.'
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
    '# KosmoOrbit Role State Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Role state: \`${report.role_state}\``,
    `Schema: \`${report.schema}\``,
    '',
    'Review-only smoke. This validates the local role-state contract without auth, user writes, network calls, uploads or public publishing.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- failed checks: ${report.summary.failed_checks}`,
    `- available roles: ${report.summary.available_role_count}`,
    `- visible modules: ${report.summary.visible_module_count}`,
    `- blocked actions: ${report.summary.blocked_action_count}`,
    `- active role: \`${report.summary.active_role_id}\``,
    `- active project: \`${report.summary.active_project_id}\``,
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
