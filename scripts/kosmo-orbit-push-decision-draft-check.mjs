#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/governance/orbit-push-decision-draft.contract.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitPushDecisionDraft.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-push-decision-draft.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-push-decision-draft.generated.md');

const requiredPositive = ['route_smoke', 'full_review', 'autonomous_loop_ledger', 'github_imperigo_gate'];
const requiredBlocking = ['typescript_no_emit', 'eslint', 'next_static_build', 'static_export_smoke'];
const requiredBlocked = [
  'git_push',
  'github_pr_create',
  'github_issue_mutation',
  'cloudflare_deploy_claim',
  'external_ci_mutation',
  'secret_read',
  'live_claim',
  'dependency_install',
  'cost_job'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Push decision draft contract not found: ${contractPath}`);

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

  console.log('KosmoOrbit push decision draft check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'push_decision_draft_passed') process.exit(1);
}

function buildReport({ contract, componentSource, routeSource, sectionIndexSource }) {
  const positiveIds = new Set(asArray(contract.current_positive_evidence).map((item) => item.id));
  const blockingIds = new Set(asArray(contract.blocking_evidence).map((item) => item.id));
  const blockedToday = asArray(contract.blocked_today);
  const checklist = asArray(contract.owner_go_checklist);
  const checks = [
    check('contract_file_exists', 'Push decision draft contract exists.', existsSync(contractPath)),
    check('status_ready', 'Push decision draft is ready.', contract.status === 'push_decision_draft_ready'),
    check('mode_static_review_only', 'Push decision draft is static review-only.', contract.mode === 'static_review_only'),
    check('decision_holds_local', 'Decision recommends holding local and not pushing now.', contract.decision_state?.recommended_decision_now === 'hold_local' && contract.decision_state?.push_ready_now === false && contract.decision_state?.owner_go_required === true),
    check('positive_evidence_present', 'Positive evidence includes route smoke, full review, loop ledger and GitHub Imperigo gate.', requiredPositive.every((id) => positiveIds.has(id))),
    check('blocking_evidence_present', 'Blocking evidence includes TypeScript, ESLint, Next build and static export smoke.', requiredBlocking.every((id) => blockingIds.has(id))),
    check('owner_go_checklist_present', 'Owner-Go checklist covers Git, TypeScript, ESLint, build, static smoke and live smoke.', checklist.length >= 7 && checklist.some((item) => item.includes('TypeScript')) && checklist.some((item) => item.includes('ESLint')) && checklist.some((item) => item.includes('Next Static Build'))),
    check('prepared_summary_present', 'Prepared summary includes commit scope, risk note and release note.', Boolean(contract.prepared_summary?.draft_commit_scope && contract.prepared_summary?.draft_risk_note && contract.prepared_summary?.draft_release_note)),
    check('blocked_today_present', 'Blocked today covers push, GitHub mutation, deploy claims, secrets, dependencies and costs.', requiredBlocked.every((id) => blockedToday.includes(id))),
    check('next_actions_present', 'Next actions are explicit.', asArray(contract.next_actions).length >= 4),
    check('component_imports_contract', 'Component imports the push decision draft contract.', componentSource.includes('orbit-push-decision-draft.contract.json')),
    check('component_renders_decision_copy', 'Component renders push decision draft copy.', componentSource.includes('Push Decision Draft') && componentSource.includes('hold_local') && componentSource.includes('Owner-Go')),
    check('component_renders_safety_copy', 'Component renders no-push/deploy safety copy.', componentSource.includes('kein Push') && componentSource.includes('kein Deploy') && componentSource.includes('keine GitHub-Mutation') && componentSource.includes('keine Secrets')),
    check('route_imports_component', 'Orbit route imports the push decision draft component.', routeSource.includes('OrbitPushDecisionDraft')),
    check('route_anchors_draft', 'Orbit route renders push-decision-draft anchor.', routeSource.includes('id="push-decision-draft"')),
    check('section_index_links_draft', 'Section index links to push decision draft.', sectionIndexSource.includes('#push-decision-draft'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-push-decision-draft-check',
    status: failed.length ? 'push_decision_draft_blocked' : 'push_decision_draft_passed',
    contract_file: relative(root, contractPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      positive_evidence_count: positiveIds.size,
      blocking_evidence_count: blockingIds.size,
      owner_go_checklist_count: checklist.length,
      blocked_today_count: blockedToday.length
    },
    checks,
    next_actions: failed.length ? failed.map((item) => `Fix failed push decision draft check: ${item.id}`) : contract.next_actions
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
    '# KosmoOrbit Push Decision Draft Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static review-only check for a local push decision draft. It does not push, deploy, create PRs, mutate GitHub, read secrets, install dependencies or spend money.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- positive evidence: ${report.summary.positive_evidence_count}`,
    `- blocking evidence: ${report.summary.blocking_evidence_count}`,
    `- owner-go checklist: ${report.summary.owner_go_checklist_count}`,
    `- blocked today: ${report.summary.blocked_today_count}`,
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
