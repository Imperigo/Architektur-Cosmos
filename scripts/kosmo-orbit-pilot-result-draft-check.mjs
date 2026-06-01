#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const draftPath = resolve(root, args.draft || 'examples/kosmo-orbit/pilot/orbit-office-pilot-result-draft.demo.json');
const schemaPath = resolve(root, args.schema || 'schema/kosmo-orbit-pilot-result-draft.schema.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-pilot-result-draft.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-pilot-result-draft.generated.md');

const requiredSafetyFlags = [
  'no_customer_data',
  'no_uploads',
  'no_costs',
  'no_design_generation',
  'no_external_accounts',
  'no_public_publish',
  'no_push_without_owner_go',
  'no_unverified_savings_claims'
];
const requiredResultMeasurements = [
  'orientation_time',
  'blocker_visibility',
  'role_fit',
  'design_handoff_clarity',
  'repeatability'
];
const requiredSources = [
  'examples/kosmo-orbit/pilot/orbit-office-pilot-measurement-kit.demo.json',
  'examples/kosmo-orbit/pilot/orbit-office-pilot-session.demo.json',
  'docs/kosmo-orbit-office-pilot-facilitator-checklist-2026-06-01.md',
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
  if (!existsSync(draftPath)) failures.push(`Missing pilot result draft: ${relative(root, draftPath)}`);

  const draft = existsSync(draftPath) ? readJson(draftPath, failures) : null;
  if (draft) checkDraft(draft, failures, warnings);

  const checks = buildChecks(draft, failures, warnings);
  const failedChecks = checks.filter((check) => check.status !== 'passed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-pilot-result-draft-check',
    status: failedChecks.length ? 'orbit_pilot_result_draft_blocked' : 'orbit_pilot_result_draft_template_ready',
    draft_file: relative(root, draftPath),
    schema_file: relative(root, schemaPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((check) => check.status === 'passed').length,
      failed_checks: failedChecks.length,
      warning_count: warnings.length,
      result_slot_count: asArray(draft?.result_slots).length,
      empty_result_slot_count: asArray(draft?.result_slots).filter((slot) => slot.value === null && slot.human_note === null && slot.evidence_ref === null).length,
      missing_source_count: asArray(draft?.evidence_review?.missing_sources).length
    },
    checks,
    warnings,
    next_actions: failedChecks.length
      ? failedChecks.map((check) => `Fix failed pilot result draft check: ${check.id}`)
      : [
          'Keep result values empty until a human office pilot records observations.',
          'Do not publish savings, quality or validation claims from this empty template.',
          'Use this draft only as the future landing place for reviewed pilot evidence.'
        ]
  };

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit pilot result draft check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (failedChecks.length) process.exit(1);
}

function checkDraft(draft, failures, warnings) {
  if (draft.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${draft.schema_version}`);
  if (draft.result_draft?.status !== 'not_recorded') failures.push('Pilot result draft must stay not_recorded until a human office pilot runs.');
  if (draft.result_draft?.mode !== 'local_review_only') failures.push('Pilot result draft mode must stay local_review_only.');
  if (draft.result_draft?.source_kit && !existsSync(resolve(root, draft.result_draft.source_kit))) {
    failures.push(`Source kit does not exist: ${draft.result_draft.source_kit}`);
  }
  if (draft.result_draft?.source_session && !existsSync(resolve(root, draft.result_draft.source_session))) {
    failures.push(`Source session does not exist: ${draft.result_draft.source_session}`);
  }

  for (const flag of requiredSafetyFlags) {
    if (draft.safety?.[flag] !== true) failures.push(`Missing required safety flag: ${flag}`);
  }

  for (const measurement of requiredResultMeasurements) {
    const slot = asArray(draft.result_slots).find((item) => item.source_measurement === measurement);
    if (!slot) {
      failures.push(`Missing result slot for measurement: ${measurement}`);
      continue;
    }
    if (slot.value !== null || slot.human_note !== null || slot.evidence_ref !== null) {
      warnings.push(`${slot.id || measurement} contains values or evidence; verify these come from a human office pilot before sharing.`);
    }
  }

  for (const source of requiredSources) {
    if (!asArray(draft.evidence_review?.required_sources).includes(source)) {
      failures.push(`Missing required evidence source: ${source}`);
    }
    if (!existsSync(resolve(root, source))) {
      failures.push(`Required evidence source file does not exist: ${source}`);
    }
  }

  if (draft.evidence_review?.status !== 'not_reviewed') failures.push('Pilot result evidence review must stay not_reviewed in the empty template.');
  if (!asArray(draft.evidence_review?.missing_sources).includes('human pilot notes')) {
    failures.push('Pilot result draft must still name human pilot notes as missing evidence.');
  }
  if (draft.publication?.status !== 'blocked') failures.push('Pilot result publication must stay blocked until reviewed evidence exists.');
  if (asArray(draft.publication?.allowed_public_claims).length !== 0) failures.push('Pilot result draft must not contain allowed public claims before evidence review.');
  if (draft.decision?.status !== 'not_run_yet') failures.push('Pilot result decision must stay not_run_yet.');
  if (draft.decision?.selected_option !== null || draft.decision?.human_reviewer !== null || draft.decision?.review_note !== null) {
    warnings.push('Pilot result draft contains decision values; verify privacy and human evidence before sharing.');
  }
}

function buildChecks(draft, failures, warnings) {
  return [
    check('schema_exists', 'Pilot result draft schema exists.', existsSync(schemaPath)),
    check('draft_exists', 'Pilot result draft template exists.', existsSync(draftPath)),
    check('no_parse_failures', 'Pilot result draft JSON parsed successfully.', !failures.some((failure) => failure.includes('Could not parse JSON'))),
    check('schema_version', 'Pilot result draft uses schema version 0.1.', draft?.schema_version === '0.1'),
    check('not_recorded', 'Pilot result draft is empty, not a completed result.', draft?.result_draft?.status === 'not_recorded'),
    check('local_review_only', 'Pilot result draft stays local review only.', draft?.result_draft?.mode === 'local_review_only'),
    check('source_kit_exists', 'Source pilot measurement kit exists.', Boolean(draft?.result_draft?.source_kit && existsSync(resolve(root, draft.result_draft.source_kit)))),
    check('source_session_exists', 'Source pilot session exists.', Boolean(draft?.result_draft?.source_session && existsSync(resolve(root, draft.result_draft.source_session)))),
    check('safety_flags', 'All required safety flags are true.', requiredSafetyFlags.every((flag) => draft?.safety?.[flag] === true)),
    check('result_slots_complete', 'Result slots cover all required measurements.', requiredResultMeasurements.every((measurement) => asArray(draft?.result_slots).some((slot) => slot.source_measurement === measurement))),
    check('result_slots_empty', 'All result slots are empty until a human pilot records evidence.', asArray(draft?.result_slots).every((slot) => slot.value === null && slot.human_note === null && slot.evidence_ref === null)),
    check('required_sources_listed', 'All required sources are listed for evidence review.', requiredSources.every((source) => asArray(draft?.evidence_review?.required_sources).includes(source))),
    check('required_sources_exist', 'All required source files exist locally.', requiredSources.every((source) => existsSync(resolve(root, source)))),
    check('evidence_not_reviewed', 'Evidence is not reviewed yet.', draft?.evidence_review?.status === 'not_reviewed'),
    check('human_notes_missing', 'Human pilot notes remain explicitly missing.', asArray(draft?.evidence_review?.missing_sources).includes('human pilot notes')),
    check('publication_blocked', 'Publication is blocked before real evidence exists.', draft?.publication?.status === 'blocked'),
    check('no_public_claims', 'No public claims are allowed from the empty template.', asArray(draft?.publication?.allowed_public_claims).length === 0),
    check('decision_not_run_yet', 'Pilot result decision is not claimed yet.', draft?.decision?.status === 'not_run_yet'),
    check('no_decision_values', 'Template contains no selected option, reviewer or review note.', draft?.decision?.selected_option === null && draft?.decision?.human_reviewer === null && draft?.decision?.review_note === null),
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
    '# KosmoOrbit Pilot Result Draft Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Draft: \`${report.draft_file}\``,
    '',
    'Checks the empty local result draft for a later human office pilot. It does not claim completed results, savings, quality improvements or public validation.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- result slots: ${report.summary.empty_result_slot_count}/${report.summary.result_slot_count} empty`,
    `- missing evidence sources: ${report.summary.missing_source_count}`,
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
