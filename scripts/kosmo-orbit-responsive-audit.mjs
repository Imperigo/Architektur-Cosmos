#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const orbitDir = resolve(root, args.dir || 'app/orbit');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-responsive-audit.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-responsive-audit.generated.md');

const files = [
  'page.tsx',
  'OrbitSectionIndex.tsx',
  'OrbitRoleSwitcher.tsx',
  'OrbitDemoReviewPath.tsx',
  'OrbitProjectDashboard.tsx',
  'OrbitDesignHandoffPanel.tsx',
  'OrbitPresenterBrief.tsx',
  'OrbitWorkflowDelta.tsx',
  'OrbitPilotMeasurement.tsx',
  'OrbitPilotRunbook.tsx',
  'OrbitPilotSessionTemplate.tsx',
  'OrbitProgressMap.tsx',
  'OrbitVisionBridge.tsx',
  'OrbitInstallationTopology.tsx',
  'OrbitHealthReadiness.tsx',
  'OrbitRiskRegister.tsx',
  'OrbitCommandContract.tsx',
  'OrbitAuditTrail.tsx',
  'OrbitDemoReadiness.tsx',
  'OrbitPublishReadiness.tsx',
  'OrbitDemoQuestions.tsx',
  'OrbitReviewDecisionDraft.tsx',
  'OrbitRuntimeBoundary.tsx',
  'OrbitRuntimeContract.tsx',
  'OrbitQualityEvidence.tsx',
  'OrbitWorkstationPriorities.tsx',
  'OrbitWorkstationProfileContract.tsx',
  'OrbitLocalIdentityContract.tsx',
  'OrbitDataGovernanceContract.tsx',
  'OrbitOfficeMemoryReadiness.tsx',
  'OrbitLocalStorageDecisionDraft.tsx',
  'OrbitDeleteExportRestoreDrill.tsx',
  'OrbitLearningMode.tsx',
  'OrbitPermissionMatrix.tsx',
  'OrbitOfficeRoutine.tsx'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const sources = readSources();
  const report = buildReport(sources);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit responsive audit');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_responsive_audit_passed') process.exit(1);
}

function readSources() {
  const entries = {};
  for (const file of files) {
    const absolutePath = resolve(orbitDir, file);
    entries[file] = existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
  }
  return entries;
}

function buildReport(sources) {
  const combined = Object.values(sources).join('\n');
  const minWidthGuardCount = countMatches(combined, /\bmin-w-0\b/g);
  const flexWrapCount = countMatches(combined, /\bflex-wrap\b/g);
  const responsiveGridCount = countMatches(combined, /\b(sm|md|lg|xl):grid-cols-/g);
  const checks = [
    check('all_orbit_files_present', 'All expected /orbit source files exist.', files.every((file) => sources[file].length > 0)),
    check('page_uses_safe_viewport_scroll', 'Page uses a stable viewport shell with internal scroll.', sources['page.tsx'].includes('h-dvh overflow-auto')),
    check('section_index_wraps', 'Demo navigation wraps and keeps touch-height links.', sources['OrbitSectionIndex.tsx'].includes('flex-wrap') && sources['OrbitSectionIndex.tsx'].includes('min-h-9')),
    check('text_width_guards_present', 'Orbit components use min-w-0 guards in dense panels.', minWidthGuardCount >= 18),
    check('wrapping_controls_present', 'Orbit components use flex-wrap for dense controls.', flexWrapCount >= 12),
    check('responsive_grids_present', 'Orbit components use breakpoint grids instead of fixed desktop-only columns.', responsiveGridCount >= 12),
    check('permission_matrix_responsive', 'Permission matrix collapses before the five-column desktop layout.', sources['OrbitPermissionMatrix.tsx'].includes('sm:grid-cols-2') && sources['OrbitPermissionMatrix.tsx'].includes('lg:grid-cols-5')),
    check('vision_bridge_responsive', 'Vision bridge uses responsive cards for the pipeline tracks.', sources['OrbitVisionBridge.tsx'].includes('md:grid-cols-2') && sources['OrbitVisionBridge.tsx'].includes('xl:grid-cols-5')),
    check('installation_topology_responsive', 'Installation topology uses responsive cards for the office system map.', sources['OrbitInstallationTopology.tsx'].includes('md:grid-cols-2') && sources['OrbitInstallationTopology.tsx'].includes('xl:grid-cols-3')),
    check('health_readiness_responsive', 'Health readiness uses responsive cards for local telemetry channels.', sources['OrbitHealthReadiness.tsx'].includes('md:grid-cols-2') && sources['OrbitHealthReadiness.tsx'].includes('xl:grid-cols-3')),
    check('risk_register_responsive', 'Risk register uses responsive cards for approval gates.', sources['OrbitRiskRegister.tsx'].includes('md:grid-cols-2') && sources['OrbitRiskRegister.tsx'].includes('xl:grid-cols-3')),
    check('command_contract_responsive', 'Command contract uses responsive cards for command intents.', sources['OrbitCommandContract.tsx'].includes('md:grid-cols-2') && sources['OrbitCommandContract.tsx'].includes('xl:grid-cols-3')),
    check('audit_trail_responsive', 'Audit trail uses responsive cards for trace events.', sources['OrbitAuditTrail.tsx'].includes('md:grid-cols-2') && sources['OrbitAuditTrail.tsx'].includes('xl:grid-cols-3')),
    check('design_handoff_responsive', 'KosmoDesign handoff panel uses responsive columns for role, model, blockers and context.', sources['OrbitDesignHandoffPanel.tsx'].includes('md:grid-cols-2') && sources['OrbitDesignHandoffPanel.tsx'].includes('xl:grid-cols')),
    check('office_routine_responsive', 'Office routine uses responsive cards for day phases and hard stops.', sources['OrbitOfficeRoutine.tsx'].includes('sm:grid-cols-2') && sources['OrbitOfficeRoutine.tsx'].includes('lg:grid-cols-3')),
    check('runtime_contract_responsive', 'Runtime contract uses responsive cards for the runtime stages.', sources['OrbitRuntimeContract.tsx'].includes('md:grid-cols-2') && sources['OrbitRuntimeContract.tsx'].includes('xl:grid-cols-5')),
    check('workstation_profile_responsive', 'Workstation profile contract uses responsive cards for profile and escalation layouts.', sources['OrbitWorkstationProfileContract.tsx'].includes('lg:grid-cols-2') && sources['OrbitWorkstationProfileContract.tsx'].includes('md:grid-cols-2')),
    check('local_identity_responsive', 'Local identity contract uses responsive cards for profile classes, sessions and promotion requirements.', sources['OrbitLocalIdentityContract.tsx'].includes('lg:grid-cols-[0.85fr_1.15fr]') && sources['OrbitLocalIdentityContract.tsx'].includes('xl:grid-cols-5') && sources['OrbitLocalIdentityContract.tsx'].includes('lg:grid-cols-3')),
    check('data_governance_responsive', 'Data governance contract uses responsive cards for domains, storage lanes and promotion requirements.', sources['OrbitDataGovernanceContract.tsx'].includes('lg:grid-cols-[0.85fr_1.15fr]') && sources['OrbitDataGovernanceContract.tsx'].includes('xl:grid-cols-5') && sources['OrbitDataGovernanceContract.tsx'].includes('lg:grid-cols-3')),
    check('office_memory_responsive', 'Office memory readiness uses responsive cards for lanes and readiness gates.', sources['OrbitOfficeMemoryReadiness.tsx'].includes('lg:grid-cols-[0.85fr_1.15fr]') && sources['OrbitOfficeMemoryReadiness.tsx'].includes('xl:grid-cols-5') && sources['OrbitOfficeMemoryReadiness.tsx'].includes('xl:grid-cols-4')),
    check('local_storage_decision_responsive', 'Local storage decision draft uses responsive cards for fields and allowed actions.', sources['OrbitLocalStorageDecisionDraft.tsx'].includes('lg:grid-cols-[0.9fr_1.1fr]') && sources['OrbitLocalStorageDecisionDraft.tsx'].includes('xl:grid-cols-3') && sources['OrbitLocalStorageDecisionDraft.tsx'].includes('lg:grid-cols-4')),
    check('delete_export_restore_responsive', 'Delete/export/restore drill uses responsive cards for scope, allowed actions and promotion requirements.', sources['OrbitDeleteExportRestoreDrill.tsx'].includes('lg:grid-cols-[0.9fr_1.1fr]') && sources['OrbitDeleteExportRestoreDrill.tsx'].includes('xl:grid-cols-4') && sources['OrbitDeleteExportRestoreDrill.tsx'].includes('lg:grid-cols-[0.85fr_1.15fr]')),
    check('progress_bars_have_stable_height', 'Progress map uses stable bar height and constrained width.', sources['OrbitProgressMap.tsx'].includes('h-2.5 overflow-hidden') && sources['OrbitProgressMap.tsx'].includes('style={{ width')),
    check('demo_readiness_uses_responsive_grid', 'Demo readiness summary uses responsive columns.', sources['OrbitDemoReadiness.tsx'].includes('md:grid-cols-3') && sources['OrbitDemoReadiness.tsx'].includes('lg:grid-cols')),
    check('publish_readiness_responsive', 'Publish readiness uses responsive columns for live gate statuses.', sources['OrbitPublishReadiness.tsx'].includes('md:grid-cols-2') && sources['OrbitPublishReadiness.tsx'].includes('xl:grid-cols-4')),
    check('workflow_delta_responsive', 'Workflow delta uses a responsive comparison grid.', sources['OrbitWorkflowDelta.tsx'].includes('lg:grid-cols') && sources['OrbitWorkflowDelta.tsx'].includes('md:grid-cols-3')),
    check('pilot_measurement_responsive', 'Pilot measurement uses responsive metric and rule grids.', sources['OrbitPilotMeasurement.tsx'].includes('lg:grid-cols-4') && sources['OrbitPilotMeasurement.tsx'].includes('md:grid-cols-2')),
    check('pilot_runbook_responsive', 'Pilot runbook uses responsive cards for timed steps, evidence and hard stops.', sources['OrbitPilotRunbook.tsx'].includes('xl:grid-cols-5') && sources['OrbitPilotRunbook.tsx'].includes('lg:grid-cols-[1fr_1fr]')),
    check('pilot_session_template_responsive', 'Pilot session template uses responsive columns for session and metric cards.', sources['OrbitPilotSessionTemplate.tsx'].includes('lg:grid-cols-[0.9fr_1.1fr]') && sources['OrbitPilotSessionTemplate.tsx'].includes('xl:grid-cols-5')),
    check('learning_mode_responsive', 'Learning mode uses responsive cards for learning profiles and tracks.', sources['OrbitLearningMode.tsx'].includes('lg:grid-cols-3') && sources['OrbitLearningMode.tsx'].includes('md:grid-cols-3')),
    check('badges_can_wrap_long_words', 'Long labels can break instead of overflowing pills.', combined.includes('break-words')),
    check('no_viewport_scaled_font', 'No /orbit source scales font size directly with viewport width.', !/text-\[[^\]]*vw|font-size\s*:\s*[^;]*vw/i.test(combined)),
    check('no_negative_letter_spacing', 'No /orbit source uses negative letter spacing.', !/tracking-\[-|letter-spacing\s*:\s*-/i.test(combined))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-responsive-audit',
    status: failed.length ? 'orbit_responsive_audit_blocked' : 'orbit_responsive_audit_passed',
    source_dir: relative(root, orbitDir),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      min_width_guard_count: minWidthGuardCount,
      flex_wrap_count: flexWrapCount,
      responsive_grid_count: responsiveGridCount
    },
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed KosmoOrbit responsive audit check: ${item.id}`)
      : [
          'Use this as a source-level guard before the real browser/mobile smoke.',
          'Do not treat this as a replacement for a visual browser check.'
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

function countMatches(value, pattern) {
  return Array.from(value.matchAll(pattern)).length;
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Responsive Audit',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Source: \`${report.source_dir}\``,
    '',
    'Source-level responsive guard for `/orbit`. This does not replace a visual browser/mobile smoke; it only catches layout-risk patterns before that step.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- min-w-0 guards: ${report.summary.min_width_guard_count}`,
    `- flex-wrap usages: ${report.summary.flex_wrap_count}`,
    `- responsive grid usages: ${report.summary.responsive_grid_count}`,
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
