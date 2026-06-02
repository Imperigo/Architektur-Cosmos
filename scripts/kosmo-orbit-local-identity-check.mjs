#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/identity/orbit-local-identity.contract.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitLocalIdentityContract.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-local-identity.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-local-identity.generated.md');

const requiredProfileClasses = [
  'owner_identity',
  'infrastructure_identity',
  'project_identity',
  'design_identity',
  'learning_identity'
];

const requiredBlocked = [
  'real_login',
  'account_creation',
  'password_storage',
  'permission_mutation',
  'profile_persistence',
  'session_cookie',
  'personal_data_write',
  'hidden_tracking',
  'learning_score_write',
  'external_directory_sync',
  'cloud_identity_provider',
  'automatic_approval'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Local identity contract not found: ${contractPath}`);
  if (!existsSync(componentPath)) throw new Error(`Local identity component not found: ${componentPath}`);

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

  console.log('KosmoOrbit local identity check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'local_identity_contract_passed') process.exit(1);
}

function buildReport({ contract, componentSource, routeSource, sectionIndexSource }) {
  const profileClasses = asArray(contract.profile_classes);
  const profileClassIds = new Set(profileClasses.map((profileClass) => profileClass.id));
  const sessionBoundaries = asArray(contract.session_boundaries);
  const blockedCapabilities = asArray(contract.blocked_capabilities);
  const checks = [
    check('contract_file_exists', 'Local identity contract file exists.', existsSync(contractPath)),
    check('status_ready', 'Local identity contract status is ready.', contract.status === 'local_identity_contract_ready'),
    check('mode_static_review_only', 'Local identity contract is static review-only.', contract.mode === 'static_review_only'),
    check('principles_present', 'Identity principles are explicit.', asArray(contract.identity_principles).length >= 4),
    check('required_profile_classes_present', 'All required profile classes are present.', requiredProfileClasses.every((id) => profileClassIds.has(id))),
    check('profile_classes_have_gates_and_privacy', 'Every profile class has roles, future scope, preview scope, human gate and privacy requirement.', profileClasses.every((profileClass) => asArray(profileClass.role_ids).length > 0 && asArray(profileClass.allowed_future_scope).length > 0 && asArray(profileClass.today_preview_scope).length > 0 && profileClass.required_human_gate && profileClass.privacy_requirement)),
    check('session_boundaries_present', 'Preview, decision and learning session boundaries are present.', ['preview_session', 'decision_session', 'learning_session'].every((id) => sessionBoundaries.some((boundary) => boundary.id === id))),
    check('session_boundaries_block_writes', 'Session boundaries block persistence, signatures, scores or sync today.', sessionBoundaries.every((boundary) => asArray(boundary.blocked_today).length >= 3)),
    check('blocked_capabilities_present', 'All sensitive identity capabilities are blocked today.', requiredBlocked.every((item) => blockedCapabilities.includes(item))),
    check('promotion_requirements_present', 'Promotion requirements are explicit.', asArray(contract.promotion_requirements).length >= 6),
    check('component_imports_contract', 'Component imports the local identity contract.', componentSource.includes('orbit-local-identity.contract.json')),
    check('component_renders_identity_copy', 'Component renders local identity boundary copy.', componentSource.includes('Local Identity Boundary') && componentSource.includes('Was spaeter Profil, Auth und Session wird')),
    check('component_renders_safety_boundary', 'Component states logins, accounts, passwords, persistence, cookies, personal writes and external identity providers are blocked.', componentSource.includes('keine Logins') && componentSource.includes('keine Accounts') && componentSource.includes('keine Passwoerter') && componentSource.includes('keine Profilpersistenz') && componentSource.includes('keine Session-Cookies') && componentSource.includes('keine personenbezogenen Writes') && componentSource.includes('kein externer Identity Provider')),
    check('route_imports_local_identity', 'Orbit route imports the local identity component.', routeSource.includes('OrbitLocalIdentityContract')),
    check('route_anchors_local_identity', 'Orbit route renders a local-identity anchor.', routeSource.includes('id="local-identity"')),
    check('section_index_links_local_identity', 'Section index links to local identity.', sectionIndexSource.includes('#local-identity'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-local-identity-check',
    status: failed.length ? 'local_identity_contract_blocked' : 'local_identity_contract_passed',
    contract_file: relative(root, contractPath),
    component_file: relative(root, componentPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      principle_count: asArray(contract.identity_principles).length,
      profile_class_count: profileClasses.length,
      session_boundary_count: sessionBoundaries.length,
      blocked_capability_count: blockedCapabilities.length,
      promotion_requirement_count: asArray(contract.promotion_requirements).length
    },
    profile_classes: profileClasses.map((profileClass) => ({
      id: profileClass.id,
      role_count: asArray(profileClass.role_ids).length,
      future_scope_count: asArray(profileClass.allowed_future_scope).length,
      preview_scope_count: asArray(profileClass.today_preview_scope).length,
      required_human_gate: profileClass.required_human_gate
    })),
    session_boundaries: sessionBoundaries.map((boundary) => ({
      id: boundary.id,
      blocked_today_count: asArray(boundary.blocked_today).length
    })),
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed local identity check: ${item.id}`)
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
    '# KosmoOrbit Local Identity Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static review-only check for future local identity, profiles and sessions. It validates local JSON and React source only; it does not create accounts, store passwords, persist profiles, write sessions, mutate permissions, sync external identity providers or approve decisions.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- principles: ${report.summary.principle_count}`,
    `- profile classes: ${report.summary.profile_class_count}`,
    `- session boundaries: ${report.summary.session_boundary_count}`,
    `- blocked capabilities: ${report.summary.blocked_capability_count}`,
    `- promotion requirements: ${report.summary.promotion_requirement_count}`,
    '',
    '## Profile Classes',
    '',
    '| Class | Roles | Future Scope | Preview Scope | Human Gate |',
    '| --- | ---: | ---: | ---: | --- |'
  ];

  report.profile_classes.forEach((profileClass) => {
    lines.push(`| \`${profileClass.id}\` | ${profileClass.role_count} | ${profileClass.future_scope_count} | ${profileClass.preview_scope_count} | ${escapePipe(profileClass.required_human_gate)} |`);
  });

  lines.push('', '## Session Boundaries', '', '| Boundary | Blocked Today |', '| --- | ---: |');
  report.session_boundaries.forEach((boundary) => {
    lines.push(`| \`${boundary.id}\` | ${boundary.blocked_today_count} |`);
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
