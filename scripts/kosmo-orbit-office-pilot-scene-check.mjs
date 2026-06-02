#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const scenePath = resolve(root, args.scene || 'examples/kosmo-orbit/pilot/orbit-office-pilot-scene.demo.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-office-pilot-scene.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-office-pilot-scene.generated.md');

const requiredSafetyFlags = [
  'no_customer_data_upload',
  'no_cloud',
  'no_geometry_or_plan_writes',
  'no_design_generation',
  'no_auth_runtime',
  'no_user_writes',
  'no_unproven_time_or_cost_claims',
  'no_push_without_owner_go'
];
const requiredStepIds = ['start', 'review', 'roles', 'decision'];
const requiredDecisionOutcomes = ['needs_more_evidence', 'continue_local_pilot', 'pause', 'blocked'];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const failures = [];
  const scene = existsSync(scenePath) ? readJson(scenePath, failures) : null;
  if (!existsSync(scenePath)) failures.push(`Missing office pilot scene: ${relative(root, scenePath)}`);
  if (scene) validateScene(scene, failures);

  const checks = buildChecks(scene, failures);
  const failedChecks = checks.filter((check) => check.status !== 'passed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-office-pilot-scene-check',
    status: failedChecks.length ? 'orbit_office_pilot_scene_blocked' : 'orbit_office_pilot_scene_ready',
    scene_file: relative(root, scenePath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((check) => check.status === 'passed').length,
      failed_checks: failedChecks.length,
      step_count: Array.isArray(scene?.steps) ? scene.steps.length : 0,
      role_count: Array.isArray(scene?.roles) ? scene.roles.length : 0,
      evidence_question_count: Array.isArray(scene?.evidence_questions) ? scene.evidence_questions.length : 0
    },
    checks,
    failures,
    next_actions: failedChecks.length
      ? failedChecks.map((check) => `Fix failed office pilot scene check: ${check.id}`)
      : [
          'Use the scene as a local explanation contract for the first office pilot.',
          'Keep the decision not_run_yet until a human pilot is actually run.',
          'Do not claim savings, generation or certification from this template.'
        ]
  };

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit office pilot scene check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (failedChecks.length) process.exit(1);
}

function validateScene(scene, failures) {
  if (scene.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${scene.schema_version}`);
  if (scene.scene?.mode !== 'local_review_only') failures.push('Office pilot scene must stay local_review_only.');
  if (scene.scene?.tag !== 'local-office-pilot-review-only') failures.push('Office pilot scene tag must remain local-office-pilot-review-only.');

  requiredSafetyFlags.forEach((flag) => {
    if (scene.safety?.[flag] !== true) failures.push(`Missing required safety flag: ${flag}`);
  });

  requiredStepIds.forEach((id) => {
    if (!asArray(scene.steps).some((step) => step.id === id)) failures.push(`Missing office pilot step: ${id}`);
  });

  if (asArray(scene.roles).length < 4) failures.push('Office pilot scene should cover at least four office roles.');
  if (asArray(scene.evidence_questions).length < 4) failures.push('Office pilot scene should keep at least four evidence questions.');
  if (scene.decision?.status !== 'not_run_yet') failures.push('Office pilot scene decision must stay not_run_yet.');
  if (scene.decision?.human_reviewer) failures.push('Demo office pilot scene must not contain a human reviewer name.');
  requiredDecisionOutcomes.forEach((outcome) => {
    if (!asArray(scene.decision?.allowed_outcomes).includes(outcome)) failures.push(`Missing allowed decision outcome: ${outcome}`);
  });
}

function buildChecks(scene, failures) {
  return [
    check('scene_file_exists', 'Office pilot scene JSON exists.', existsSync(scenePath)),
    check('json_parsed', 'Office pilot scene JSON parsed successfully.', Boolean(scene)),
    check('schema_version', 'Office pilot scene uses schema version 0.1.', scene?.schema_version === '0.1'),
    check('local_review_only', 'Office pilot scene stays local review only.', scene?.scene?.mode === 'local_review_only'),
    check('tag_review_only', 'Office pilot scene uses the review-only tag.', scene?.scene?.tag === 'local-office-pilot-review-only'),
    check('safety_flags', 'All required office pilot safety flags are true.', requiredSafetyFlags.every((flag) => scene?.safety?.[flag] === true)),
    check('steps_complete', 'Office pilot scene has start, review, roles and decision steps.', requiredStepIds.every((id) => asArray(scene?.steps).some((step) => step.id === id))),
    check('roles_complete', 'Office pilot scene covers at least four office roles.', asArray(scene?.roles).length >= 4),
    check('evidence_questions_complete', 'Office pilot scene keeps at least four evidence questions.', asArray(scene?.evidence_questions).length >= 4),
    check('decision_not_run_yet', 'Office pilot scene does not claim a completed pilot.', scene?.decision?.status === 'not_run_yet'),
    check('no_human_reviewer', 'Demo office pilot scene contains no human reviewer name.', !scene?.decision?.human_reviewer),
    check('allowed_outcomes', 'Office pilot scene has all allowed human outcomes.', requiredDecisionOutcomes.every((outcome) => asArray(scene?.decision?.allowed_outcomes).includes(outcome))),
    check('no_failures', 'No blocking validation failures were collected.', failures.length === 0)
  ];
}

function check(id, label, passed) {
  return { id, label, status: passed ? 'passed' : 'failed' };
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
    '# KosmoOrbit Office Pilot Scene Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Scene: \`${report.scene_file}\``,
    '',
    'Checks the local office pilot scene contract. It does not run a pilot, store customer data, upload files, push, deploy or claim savings.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- steps: ${report.summary.step_count}`,
    `- roles: ${report.summary.role_count}`,
    `- evidence questions: ${report.summary.evidence_question_count}`,
    '',
    '## Checks',
    '',
    '| Check | Status | Meaning |',
    '| --- | --- | --- |'
  ];

  report.checks.forEach((item) => {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`);
  });

  lines.push('', '## Failures', '');
  if (report.failures.length === 0) {
    lines.push('- none');
  } else {
    report.failures.forEach((failure) => lines.push(`- ${failure}`));
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
