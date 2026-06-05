#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/governance/orbit-github-imperigo-gate.contract.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitGitHubImperigoGate.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-github-imperigo-gate.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-github-imperigo-gate.generated.md');

const requiredOwnerGo = [
  'git_push_main',
  'github_pr_or_issue_mutation',
  'cloudflare_live_deploy_claim',
  'external_ci_or_secret_access'
];

const requiredBlocked = [
  'git_push_without_owner_go',
  'github_pr_create',
  'github_issue_mutation',
  'gh_auth_or_secret_read',
  'cloudflare_deploy_action',
  'external_ci_mutation',
  'live_claim_without_smoke',
  'cost_job',
  'dependency_install_without_go'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`GitHub Imperigo gate contract not found: ${contractPath}`);

  const contract = readJson(contractPath);
  const componentSource = existsSync(componentPath) ? readFileSync(componentPath, 'utf8') : '';
  const routeSource = existsSync(routePath) ? readFileSync(routePath, 'utf8') : '';
  const sectionIndexSource = existsSync(sectionIndexPath) ? readFileSync(sectionIndexPath, 'utf8') : '';
  const report = buildReport({ contract, componentSource, routeSource, sectionIndexSource });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit GitHub Imperigo gate check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'github_imperigo_gate_passed') process.exit(1);
}

function buildReport({ contract, componentSource, routeSource, sectionIndexSource }) {
  const localAutonomy = asArray(contract.local_autonomy);
  const ownerGo = asArray(contract.owner_go_required);
  const ownerGoIds = new Set(ownerGo.map((item) => item.id));
  const blockedToday = asArray(contract.blocked_today);
  const protocol = contract.imperigo_fire_protocol || {};
  const checks = [
    check('contract_file_exists', 'GitHub Imperigo gate contract exists.', existsSync(contractPath)),
    check('status_ready', 'GitHub Imperigo gate is ready.', contract.status === 'github_imperigo_gate_ready'),
    check('mode_static_review_only', 'GitHub Imperigo gate is static review-only.', contract.mode === 'static_review_only'),
    check('source_goal_terms_present', 'Source goal terms are preserved.', asArray(contract.source_goal_terms).includes('GitHub Imperigo') && asArray(contract.source_goal_terms).includes('Fire Intervall alle 5min')),
    check('local_autonomy_present', 'Local autonomous actions are explicit and local-only.', localAutonomy.length >= 3 && localAutonomy.every((item) => item.allowed === true && asArray(item.examples).length >= 2)),
    check('owner_go_required_present', 'Owner-Go required actions cover push, GitHub mutation, live claim and external CI/secrets.', requiredOwnerGo.every((id) => ownerGoIds.has(id))),
    check('imperigo_protocol_present', 'Imperigo fire protocol keeps 5-minute interval and midnight Zurich boundary.', protocol.interval_minutes === 5 && String(protocol.until_local_time || '').includes('24:00') && protocol.requires_time_check === true && protocol.requires_summary === true && protocol.requires_memory_update === true),
    check('publish_evidence_required', 'Publish evidence requires owner go, Git health, TypeScript, ESLint, build, static smoke and live smoke.', asArray(contract.publish_evidence_required).length >= 7),
    check('blocked_today_present', 'Blocked actions prevent GitHub, deploy, secret, CI, live and cost side effects.', requiredBlocked.every((id) => blockedToday.includes(id))),
    check('next_actions_present', 'Next actions are explicit.', asArray(contract.next_actions).length >= 4),
    check('component_imports_contract', 'Component imports the GitHub Imperigo gate contract.', componentSource.includes('orbit-github-imperigo-gate.contract.json')),
    check('component_renders_gate_copy', 'Component renders GitHub Imperigo gate copy.', componentSource.includes('GitHub Imperigo Gate') && componentSource.includes('Owner-Go') && componentSource.includes('5-Minuten-Fire')),
    check('component_renders_safety_copy', 'Component renders safety boundaries.', componentSource.includes('kein Push') && componentSource.includes('kein Deploy') && componentSource.includes('keine GitHub-Mutation') && componentSource.includes('keine Secrets')),
    check('route_imports_component', 'Orbit route imports the GitHub Imperigo gate component.', routeSource.includes('OrbitGitHubImperigoGate')),
    check('route_anchors_gate', 'Orbit route renders github-imperigo-gate anchor.', routeSource.includes('id="github-imperigo-gate"')),
    check('section_index_links_gate', 'Section index links to GitHub Imperigo gate.', sectionIndexSource.includes('#github-imperigo-gate'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-github-imperigo-gate-check',
    status: failed.length ? 'github_imperigo_gate_blocked' : 'github_imperigo_gate_passed',
    contract_file: relative(root, contractPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      local_autonomy_count: localAutonomy.length,
      owner_go_required_count: ownerGo.length,
      blocked_today_count: blockedToday.length,
      publish_evidence_count: asArray(contract.publish_evidence_required).length
    },
    checks,
    next_actions: failed.length ? failed.map((item) => `Fix failed GitHub Imperigo gate check: ${item.id}`) : contract.next_actions
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
    '# KosmoOrbit GitHub Imperigo Gate Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static review-only check for the GitHub/Imperigo automation boundary. It does not push, create PRs, mutate GitHub, deploy, read secrets, spend money or call external CI.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- local autonomy lanes: ${report.summary.local_autonomy_count}`,
    `- owner-go gates: ${report.summary.owner_go_required_count}`,
    `- blocked today: ${report.summary.blocked_today_count}`,
    `- publish evidence requirements: ${report.summary.publish_evidence_count}`,
    '',
    '## Checks',
    '',
    '| Check | Status | Meaning |',
    '| --- | --- | --- |'
  ];

  report.checks.forEach((item) => {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`);
  });

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
