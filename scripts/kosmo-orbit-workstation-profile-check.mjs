#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/workstations/orbit-workstation-profile.contract.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitWorkstationProfileContract.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-workstation-profile.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-workstation-profile.generated.md');

const requiredRoles = [
  'owner_admin',
  'it_ai_admin',
  'project_lead_architect',
  'design_architect',
  'drafter_efz',
  'intern',
  'apprentice',
  'trial_user'
];

const requiredSafety = [
  'no_auth_runtime',
  'no_user_account_writes',
  'no_profile_persistence',
  'no_model_starts',
  'no_tool_launches',
  'no_filesystem_scans',
  'no_project_writes',
  'no_uploads',
  'no_external_accounts',
  'no_public_publish',
  'no_cost_jobs',
  'owner_go_required_for_live'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Workstation profile contract not found: ${contractPath}`);
  if (!existsSync(componentPath)) throw new Error(`Workstation profile component not found: ${componentPath}`);

  const contract = readJson(contractPath);
  const componentSource = readFileSync(componentPath, 'utf8');
  const routeSource = existsSync(routePath) ? readFileSync(routePath, 'utf8') : '';
  const sectionIndexSource = existsSync(sectionIndexPath) ? readFileSync(sectionIndexPath, 'utf8') : '';
  const report = buildReport({ contract, componentSource, routeSource, sectionIndexSource });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit workstation profile check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'workstation_profile_contract_passed') process.exit(1);
}

function buildReport({ contract, componentSource, routeSource, sectionIndexSource }) {
  const profiles = asArray(contract.profiles);
  const roleIds = new Set(profiles.map((profile) => profile.role_id));
  const blockedActions = profiles.flatMap((profile) => asArray(profile.blocked_actions));
  const learningProfiles = profiles.filter((profile) => ['intern', 'apprentice', 'trial_user'].includes(profile.role_id));
  const checks = [
    check('contract_file_exists', 'Workstation profile contract file exists.', existsSync(contractPath)),
    check('status_ready', 'Workstation profile contract status is ready.', contract.status === 'workstation_profile_contract_ready'),
    check('mode_static_review_only', 'Workstation profile contract is static review-only.', contract.mode === 'static_review_only'),
    check('required_roles_present', 'Contract covers all expected office roles.', requiredRoles.every((roleId) => roleIds.has(roleId))),
    check('profile_count', 'Contract defines at least eight workstation profiles.', profiles.length >= 8),
    check('all_profiles_have_startup_contract', 'Every profile has station type, startup surface, focus, modules, safe actions, blocked actions and human gate.', profiles.every((profile) => profile.station_type && profile.startup_surface && profile.primary_focus && asArray(profile.visible_modules).length > 0 && asArray(profile.safe_actions).length >= 2 && asArray(profile.blocked_actions).length >= 2 && profile.human_gate)),
    check('learning_profiles_are_guided', 'Learning and observer profiles stay guided or observer depth.', learningProfiles.every((profile) => ['guided', 'learning', 'observer'].includes(profile.interface_depth))),
    check('safety_flags_present', 'All workstation safety flags are present and true.', requiredSafety.every((key) => contract.global_policy?.[key] === true)),
    check('blocks_sensitive_actions', 'Workstation profiles block runtime, write, upload, publish and external actions.', ['tool_launch', 'project_write', 'public_publish', 'external_account_sync', 'customer_upload'].every((action) => blockedActions.includes(action))),
    check('has_escalation_rules', 'Contract includes explicit escalation rules.', asArray(contract.escalation_rules).length >= 4),
    check('component_imports_contract', 'Component imports the local workstation profile contract.', componentSource.includes('orbit-workstation-profile.contract.json')),
    check('component_renders_workstation_copy', 'Component renders workstation profile copy.', componentSource.includes('Workstation Profile Contract') && componentSource.includes('Wie KosmoOrbit je Arbeitsplatz startet')),
    check('component_renders_safety_boundary', 'Component states no accounts, user writes, persistence or auth runtime.', componentSource.includes('keine Accounts') && componentSource.includes('keine User-Writes') && componentSource.includes('keine Persistenz') && componentSource.includes('keine echte Auth-Runtime')),
    check('route_imports_workstation_profile', 'Orbit route imports the workstation profile component.', routeSource.includes('OrbitWorkstationProfileContract')),
    check('route_anchors_workstation_profile', 'Orbit route renders a workstation-profile anchor.', routeSource.includes('id="workstation-profile"')),
    check('section_index_links_workstation_profile', 'Section index links to workstation profiles.', sectionIndexSource.includes('#workstation-profile'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-workstation-profile-check',
    status: failed.length ? 'workstation_profile_contract_blocked' : 'workstation_profile_contract_passed',
    contract_file: relative(root, contractPath),
    component_file: relative(root, componentPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      profile_count: profiles.length,
      learning_profile_count: learningProfiles.length,
      safety_flag_count: requiredSafety.filter((key) => contract.global_policy?.[key] === true).length,
      escalation_rule_count: asArray(contract.escalation_rules).length
    },
    profiles: profiles.map((profile) => ({
      id: profile.id,
      role_id: profile.role_id,
      station_type: profile.station_type,
      interface_depth: profile.interface_depth,
      visible_module_count: asArray(profile.visible_modules).length,
      blocked_action_count: asArray(profile.blocked_actions).length,
      human_gate: profile.human_gate
    })),
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed workstation profile check: ${item.id}`)
      : contract.next_actions
  };
}

function check(id, label, passed) {
  return {
    id,
    label,
    status: passed ? 'passed' : 'failed'
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Workstation Profile Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static review-only check for the future role-specific KosmoOrbit workstation profiles. It validates local JSON and React source only; it does not create accounts, persist user profiles, start models, launch tools, upload, publish, access external accounts or spend money.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- profiles: ${report.summary.profile_count}`,
    `- learning profiles: ${report.summary.learning_profile_count}`,
    `- safety flags: ${report.summary.safety_flag_count}/${requiredSafety.length}`,
    `- escalation rules: ${report.summary.escalation_rule_count}`,
    '',
    '## Profiles',
    '',
    '| Profile | Role | Station | Depth | Modules | Blocked | Human Gate |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  ];

  report.profiles.forEach((profile) => {
    lines.push(`| \`${profile.id}\` | \`${profile.role_id}\` | ${escapePipe(profile.station_type)} | ${escapePipe(profile.interface_depth)} | ${profile.visible_module_count} | ${profile.blocked_action_count} | ${escapePipe(profile.human_gate)} |`);
  });

  lines.push('', '## Checks', '', '| Check | Status | Meaning |', '| --- | --- | --- |');
  report.checks.forEach((item) => lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`));
  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}
