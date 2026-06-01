#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const sessionPath = resolve(root, args.session || 'examples/kosmo-orbit/pilot/orbit-office-pilot-session.demo.json');
const schemaPath = resolve(root, args.schema || 'schema/kosmo-orbit-pilot-session.schema.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-pilot-session.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-pilot-session.generated.md');

const allowedRoles = new Set([
  'owner_admin',
  'it_ai_admin',
  'project_lead_architect',
  'design_architect',
  'drafter_efz',
  'intern',
  'apprentice',
  'trial_user'
]);
const requiredStepIds = ['baseline', 'central_read', 'project_package_review', 'role_round', 'pilot_decision'];
const requiredMetricIds = ['orientation_time', 'blocker_count', 'open_questions', 'role_clarity', 'missing_inputs'];
const requiredSafetyFlags = ['no_customer_data', 'no_uploads', 'no_costs', 'no_design_generation', 'no_push_without_owner_go'];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const failures = [];
  const warnings = [];

  if (!existsSync(schemaPath)) failures.push(`Missing schema: ${relative(root, schemaPath)}`);
  if (!existsSync(sessionPath)) failures.push(`Missing pilot session: ${relative(root, sessionPath)}`);

  const session = existsSync(sessionPath) ? readJson(sessionPath, failures) : null;
  if (session) checkSession(session, failures, warnings);

  const checks = buildChecks(session, failures, warnings);
  const failedChecks = checks.filter((check) => check.status !== 'passed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-pilot-session-check',
    status: failedChecks.length ? 'orbit_pilot_session_blocked' : 'orbit_pilot_session_template_ready',
    session_file: relative(root, sessionPath),
    schema_file: relative(root, schemaPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((check) => check.status === 'passed').length,
      failed_checks: failedChecks.length,
      warning_count: warnings.length,
      role_count: Array.isArray(session?.roles) ? session.roles.length : 0,
      runbook_step_count: Array.isArray(session?.runbook_steps) ? session.runbook_steps.length : 0,
      measurement_point_count: Array.isArray(session?.measurement_points) ? session.measurement_points.length : 0
    },
    checks,
    warnings,
    next_actions: failedChecks.length
      ? failedChecks.map((check) => `Fix failed pilot session check: ${check.id}`)
      : [
          'Use this template for a real office pilot only after anonymising project inputs.',
          'Keep values null until a human records real pilot measurements.',
          'Do not treat planned pilot templates as proof of time or cost savings.'
        ]
  };

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit pilot session check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (failedChecks.length) process.exit(1);
}

function checkSession(session, failures, warnings) {
  if (session.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${session.schema_version}`);
  if (session.session?.status !== 'planned') warnings.push('Demo pilot session should stay planned until a real human pilot is run.');
  if (session.session?.mode !== 'local_review_only') failures.push('Pilot session mode must stay local_review_only.');
  if (session.session?.duration_minutes < 45 || session.session?.duration_minutes > 60) failures.push('Pilot duration must stay between 45 and 60 minutes.');
  if (session.session?.project_package && !existsSync(resolve(root, session.session.project_package))) {
    failures.push(`Project package does not exist: ${session.session.project_package}`);
  }

  for (const flag of requiredSafetyFlags) {
    if (session.safety?.[flag] !== true) failures.push(`Missing required safety flag: ${flag}`);
  }

  for (const role of asArray(session.roles)) {
    if (!allowedRoles.has(role)) failures.push(`Unknown role in pilot session: ${role}`);
  }

  for (const stepId of requiredStepIds) {
    if (!asArray(session.runbook_steps).some((step) => step.id === stepId)) failures.push(`Missing runbook step: ${stepId}`);
  }

  for (const metricId of requiredMetricIds) {
    const metric = asArray(session.measurement_points).find((item) => item.id === metricId);
    if (!metric) {
      failures.push(`Missing measurement point: ${metricId}`);
      continue;
    }
    if (metric.before_value !== null || metric.after_value !== null) {
      warnings.push(`${metricId} contains values; verify these are from a real human pilot before using them.`);
    }
  }

  if (session.decision?.status !== 'not_run_yet') {
    warnings.push('Decision status is no longer not_run_yet; verify human reviewer and evidence are present.');
  }
  if (session.decision?.human_reviewer) {
    warnings.push('Pilot session contains a human reviewer name; check privacy before sharing.');
  }
}

function buildChecks(session, failures, warnings) {
  return [
    check('schema_exists', 'Pilot session schema exists.', existsSync(schemaPath)),
    check('session_exists', 'Pilot session template exists.', existsSync(sessionPath)),
    check('no_parse_failures', 'Pilot session JSON parsed successfully.', !failures.some((failure) => failure.includes('Could not parse JSON'))),
    check('schema_version', 'Pilot session uses schema version 0.1.', session?.schema_version === '0.1'),
    check('local_review_only', 'Pilot session stays local review only.', session?.session?.mode === 'local_review_only'),
    check('planned_not_claimed', 'Demo pilot session is planned, not claimed as completed.', session?.session?.status === 'planned'),
    check('duration_guard', 'Pilot duration is 45 to 60 minutes.', session?.session?.duration_minutes >= 45 && session?.session?.duration_minutes <= 60),
    check('project_package_exists', 'Referenced demo project package exists.', Boolean(session?.session?.project_package && existsSync(resolve(root, session.session.project_package)))),
    check('safety_flags', 'All required safety flags are true.', requiredSafetyFlags.every((flag) => session?.safety?.[flag] === true)),
    check('roles_known', 'Pilot roles use known KosmoOrbit role ids.', asArray(session?.roles).length >= 3 && asArray(session?.roles).every((role) => allowedRoles.has(role))),
    check('runbook_complete', 'Pilot runbook has all five required steps.', requiredStepIds.every((id) => asArray(session?.runbook_steps).some((step) => step.id === id))),
    check('metrics_complete', 'Pilot measurement points cover all required metrics.', requiredMetricIds.every((id) => asArray(session?.measurement_points).some((metric) => metric.id === id))),
    check('metrics_are_empty_template', 'Demo measurement values are still empty until a real pilot runs.', asArray(session?.measurement_points).every((metric) => metric.before_value === null && metric.after_value === null)),
    check('decision_not_run_yet', 'Pilot decision is not claimed yet.', session?.decision?.status === 'not_run_yet'),
    check('no_human_reviewer_in_template', 'Demo template contains no human reviewer name.', !session?.decision?.human_reviewer),
    check('no_failures', 'No blocking validation failures were collected.', failures.length === 0),
    check('warnings_allowed', 'Warnings are informational only.', warnings.length >= 0)
  ];
}

function check(id, label, passed) {
  return {
    id,
    label,
    status: passed ? 'passed' : 'failed'
  };
}

function readJson(path, failures) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    failures.push(`Could not parse JSON ${relative(root, path)}: ${error.message}`);
    return null;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Pilot Session Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Session: \`${report.session_file}\``,
    '',
    'Checks the local office pilot template for safe measurement structure. It does not store real customer data, does not upload anything and does not claim completed pilot results.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- roles: ${report.summary.role_count}`,
    `- runbook steps: ${report.summary.runbook_step_count}`,
    `- measurement points: ${report.summary.measurement_point_count}`,
    '',
    '## Checks',
    '',
    '| Check | Status | Meaning |',
    '| --- | --- | --- |'
  ];

  report.checks.forEach((item) => {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`);
  });

  lines.push('', '## Warnings', '');
  if (report.warnings.length === 0) {
    lines.push('- none');
  } else {
    report.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
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
