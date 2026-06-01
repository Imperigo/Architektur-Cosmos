#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const kitPath = resolve(root, args.kit || 'examples/kosmo-orbit/pilot/orbit-office-pilot-measurement-kit.demo.json');
const schemaPath = resolve(root, args.schema || 'schema/kosmo-orbit-pilot-measurement-kit.schema.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-pilot-measurement-kit.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-pilot-measurement-kit.generated.md');

const requiredSafetyFlags = [
  'no_customer_data',
  'anonymized_or_demo_inputs_only',
  'no_uploads',
  'no_costs',
  'no_design_generation',
  'no_external_accounts',
  'no_public_publish',
  'no_push_without_owner_go',
  'no_real_result_claims'
];
const requiredPhaseIds = ['baseline', 'evidence_capture', 'role_round', 'decision'];
const requiredMeasurementIds = [
  'orientation_time',
  'blocker_visibility',
  'role_fit',
  'design_handoff_clarity',
  'repeatability'
];
const requiredEvidenceTargets = [
  '/orbit/#pilotmessung',
  '/orbit/#pilotplan',
  '/orbit/#pilot-session',
  'docs/kosmo-orbit-office-pilot-plan-2026-06-01.md'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const failures = [];
  const warnings = [];

  if (!existsSync(schemaPath)) failures.push(`Missing schema: ${relative(root, schemaPath)}`);
  if (!existsSync(kitPath)) failures.push(`Missing pilot measurement kit: ${relative(root, kitPath)}`);

  const kit = existsSync(kitPath) ? readJson(kitPath, failures) : null;
  if (kit) checkKit(kit, failures, warnings);

  const checks = buildChecks(kit, failures, warnings);
  const failedChecks = checks.filter((check) => check.status !== 'passed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-pilot-measurement-kit-check',
    status: failedChecks.length ? 'orbit_pilot_measurement_kit_blocked' : 'orbit_pilot_measurement_kit_ready',
    kit_file: relative(root, kitPath),
    schema_file: relative(root, schemaPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((check) => check.status === 'passed').length,
      failed_checks: failedChecks.length,
      warning_count: warnings.length,
      phase_count: asArray(kit?.phases).length,
      measurement_card_count: asArray(kit?.measurement_cards).length,
      evidence_link_count: asArray(kit?.evidence_links).length
    },
    checks,
    warnings,
    next_actions: failedChecks.length
      ? failedChecks.map((check) => `Fix failed pilot measurement kit check: ${check.id}`)
      : [
          'Use the kit only with demo or anonymized project input.',
          'Keep all values null until a human office pilot records observations.',
          'Treat the kit as evidence structure, not as proof of time or cost savings.'
        ]
  };

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit pilot measurement kit check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (failedChecks.length) process.exit(1);
}

function checkKit(kit, failures, warnings) {
  if (kit.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${kit.schema_version}`);
  if (kit.kit?.status !== 'template_ready') failures.push('Pilot measurement kit must stay template_ready until a real office pilot runs.');
  if (kit.kit?.mode !== 'local_review_only') failures.push('Pilot measurement kit mode must stay local_review_only.');
  if (kit.kit?.project_package && !existsSync(resolve(root, kit.kit.project_package))) {
    failures.push(`Project package does not exist: ${kit.kit.project_package}`);
  }

  for (const flag of requiredSafetyFlags) {
    if (kit.safety?.[flag] !== true) failures.push(`Missing required safety flag: ${flag}`);
  }

  for (const phaseId of requiredPhaseIds) {
    if (!asArray(kit.phases).some((phase) => phase.id === phaseId)) failures.push(`Missing pilot phase: ${phaseId}`);
  }

  for (const measurementId of requiredMeasurementIds) {
    const card = asArray(kit.measurement_cards).find((item) => item.id === measurementId);
    if (!card) {
      failures.push(`Missing measurement card: ${measurementId}`);
      continue;
    }
    if (card.before_value !== null || card.after_value !== null || card.human_note !== null) {
      warnings.push(`${measurementId} contains values or notes; verify these come from a human office pilot before sharing.`);
    }
    if (!card.target_evidence) failures.push(`Measurement card has no target_evidence: ${measurementId}`);
  }

  for (const target of requiredEvidenceTargets) {
    if (!asArray(kit.evidence_links).some((link) => link.target === target)) failures.push(`Missing evidence target: ${target}`);
  }

  if (kit.scoring?.status !== 'not_scored') failures.push('Pilot measurement kit scoring must stay not_scored until a human pilot runs.');
  if (kit.decision?.status !== 'not_run_yet') warnings.push('Pilot measurement kit decision is no longer not_run_yet; verify human evidence.');
  if (kit.decision?.selected_option !== null) warnings.push('Pilot measurement kit contains a selected option; verify this is a human decision.');
  if (kit.decision?.human_reviewer !== null) warnings.push('Pilot measurement kit contains a human reviewer; check privacy before sharing.');
}

function buildChecks(kit, failures, warnings) {
  return [
    check('schema_exists', 'Pilot measurement kit schema exists.', existsSync(schemaPath)),
    check('kit_exists', 'Pilot measurement kit template exists.', existsSync(kitPath)),
    check('no_parse_failures', 'Pilot measurement kit JSON parsed successfully.', !failures.some((failure) => failure.includes('Could not parse JSON'))),
    check('schema_version', 'Pilot measurement kit uses schema version 0.1.', kit?.schema_version === '0.1'),
    check('template_ready', 'Pilot measurement kit is a template, not a completed claim.', kit?.kit?.status === 'template_ready'),
    check('local_review_only', 'Pilot measurement kit stays local review only.', kit?.kit?.mode === 'local_review_only'),
    check('project_package_exists', 'Referenced demo project package exists.', Boolean(kit?.kit?.project_package && existsSync(resolve(root, kit.kit.project_package)))),
    check('safety_flags', 'All required safety flags are true.', requiredSafetyFlags.every((flag) => kit?.safety?.[flag] === true)),
    check('phase_set_complete', 'Pilot kit has baseline, evidence, role and decision phases.', requiredPhaseIds.every((id) => asArray(kit?.phases).some((phase) => phase.id === id))),
    check('measurement_cards_complete', 'Pilot kit has all required measurement cards.', requiredMeasurementIds.every((id) => asArray(kit?.measurement_cards).some((card) => card.id === id))),
    check('measurement_values_empty', 'Pilot kit measurement values are empty until a real pilot runs.', asArray(kit?.measurement_cards).every((card) => card.before_value === null && card.after_value === null && card.human_note === null)),
    check('measurement_targets_present', 'Each measurement card references a visible evidence target.', asArray(kit?.measurement_cards).every((card) => typeof card.target_evidence === 'string' && card.target_evidence.length > 0)),
    check('evidence_links_complete', 'Pilot kit links to visible panels and office pilot plan.', requiredEvidenceTargets.every((target) => asArray(kit?.evidence_links).some((link) => link.target === target))),
    check('scoring_not_claimed', 'Pilot kit scoring is not claimed yet.', kit?.scoring?.status === 'not_scored'),
    check('decision_not_run_yet', 'Pilot kit decision is not claimed yet.', kit?.decision?.status === 'not_run_yet'),
    check('no_selected_option', 'Pilot kit has no selected option before human review.', kit?.decision?.selected_option === null),
    check('no_human_reviewer_in_template', 'Pilot kit template contains no human reviewer name.', kit?.decision?.human_reviewer === null),
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
    '# KosmoOrbit Pilot Measurement Kit Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Kit: \`${report.kit_file}\``,
    '',
    'Checks the local office pilot measurement kit. It keeps all values empty until a human records observations and does not claim time, quality or cost improvements.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- phases: ${report.summary.phase_count}`,
    `- measurement cards: ${report.summary.measurement_card_count}`,
    `- evidence links: ${report.summary.evidence_link_count}`,
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
