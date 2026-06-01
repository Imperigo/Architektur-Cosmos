#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const workspacePath = resolve(root, args.workspace || 'examples/kosmo-orbit/workspace.demo.json');
const workspaceRoot = dirname(workspacePath);
const roleStatePath = resolve(root, args.state || 'examples/kosmo-orbit/role-state.demo.json');
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const outputJsonPath = resolve(workspaceRoot, args.output || 'review/orbit-full-review.generated.json');
const outputMdPath = resolve(workspaceRoot, args.markdown || 'review/orbit-full-review.generated.md');

const steps = [
  {
    id: 'workspace_check',
    label: 'Workspace Check',
    script: 'kosmo:orbit-check',
    args: ['--workspace', relative(root, workspacePath)],
    report: null
  },
  {
    id: 'role_state_check',
    label: 'Role State Check',
    script: 'kosmo:orbit-role-state-check',
    args: [
      '--workspace',
      relative(root, workspacePath),
      '--state',
      relative(root, roleStatePath)
    ],
    report: resolve(workspaceRoot, 'review/orbit-role-state-check.generated.json')
  },
  {
    id: 'role_state_smoke',
    label: 'Role State Smoke',
    script: 'kosmo:orbit-role-state-smoke',
    args: [
      '--state',
      relative(root, roleStatePath),
      '--schema',
      'schema/kosmo-orbit-role-state.schema.json'
    ],
    report: resolve(workspaceRoot, 'review/orbit-role-state-smoke.generated.json')
  },
  {
    id: 'workspace_status',
    label: 'Workspace Status',
    script: 'kosmo:orbit-status',
    args: ['--workspace', relative(root, workspacePath)],
    report: resolve(workspaceRoot, 'review/orbit-status-report.generated.json')
  },
  {
    id: 'project_inspector',
    label: 'Project Package Inspector',
    script: 'kosmo:orbit-project-inspector',
    args: ['--project', relative(root, projectRoot)],
    report: resolve(projectRoot, 'orbit/project-inspector.generated.json')
  },
  {
    id: 'design_handoff',
    label: 'KosmoDesign Handoff Preview',
    script: 'kosmo:orbit-design-handoff',
    args: [
      '--project',
      relative(root, projectRoot),
      '--workspaceReport',
      relative(root, resolve(workspaceRoot, 'review/orbit-status-report.generated.json')),
      '--projectInspector',
      relative(root, resolve(projectRoot, 'orbit/project-inspector.generated.json'))
    ],
    report: resolve(projectRoot, 'orbit/design-handoff-preview.generated.json')
  },
  {
    id: 'design_ui_panel',
    label: 'KosmoDesign UI Panel Spec',
    script: 'kosmo:orbit-design-ui-panel',
    args: [
      '--project',
      relative(root, projectRoot),
      '--handoff',
      'orbit/design-handoff-preview.generated.json'
    ],
    report: resolve(projectRoot, 'orbit/design-handoff-ui-panel.generated.json')
  },
  {
    id: 'design_ui_prototype',
    label: 'KosmoDesign Static UI Prototype',
    script: 'kosmo:orbit-design-ui-prototype',
    args: [
      '--project',
      relative(root, projectRoot),
      '--panel',
      'orbit/design-handoff-ui-panel.generated.json'
    ],
    report: resolve(projectRoot, 'orbit/design-handoff-ui-prototype.generated.json')
  },
  {
    id: 'design_ui_smoke',
    label: 'KosmoDesign UI Smoke',
    script: 'kosmo:orbit-design-ui-smoke',
    args: [
      '--project',
      relative(root, projectRoot),
      '--html',
      'orbit/design-handoff-ui-prototype.generated.html',
      '--manifest',
      'orbit/design-handoff-ui-prototype.generated.json'
    ],
    report: resolve(projectRoot, 'orbit/design-handoff-ui-smoke.generated.json')
  },
  {
    id: 'role_ui_variants',
    label: 'Role UI Variants',
    script: 'kosmo:orbit-role-variants',
    args: [
      '--workspace',
      relative(root, workspacePath),
      '--project',
      relative(root, projectRoot),
      '--panel',
      'orbit/design-handoff-ui-panel.generated.json'
    ],
    report: resolve(projectRoot, 'orbit/role-ui-variants.generated.json')
  },
  {
    id: 'role_ui_smoke',
    label: 'Role UI Smoke',
    script: 'kosmo:orbit-role-smoke',
    args: [
      '--project',
      relative(root, projectRoot),
      '--variants',
      'orbit/role-ui-variants.generated.json'
    ],
    report: resolve(projectRoot, 'orbit/role-ui-smoke.generated.json')
  },
  {
    id: 'role_shell_prototype',
    label: 'Role Shell Prototype',
    script: 'kosmo:orbit-role-shell-prototype',
    args: [
      '--project',
      relative(root, projectRoot),
      '--variants',
      'orbit/role-ui-variants.generated.json',
      '--smoke',
      'orbit/role-ui-smoke.generated.json',
      '--state',
      relative(root, roleStatePath)
    ],
    report: resolve(projectRoot, 'orbit/role-shell-prototype.generated.json')
  },
  {
    id: 'role_shell_smoke',
    label: 'Role Shell Smoke',
    script: 'kosmo:orbit-role-shell-smoke',
    args: [
      '--project',
      relative(root, projectRoot),
      '--html',
      'orbit/role-shell-prototype.generated.html',
      '--manifest',
      'orbit/role-shell-prototype.generated.json'
    ],
    report: resolve(projectRoot, 'orbit/role-shell-smoke.generated.json')
  },
  {
    id: 'role_state_handoff',
    label: 'Role State Handoff',
    script: 'kosmo:orbit-role-state-handoff',
    args: [
      '--state',
      relative(root, roleStatePath),
      '--check',
      relative(root, resolve(workspaceRoot, 'review/orbit-role-state-check.generated.json')),
      '--stateSmoke',
      relative(root, resolve(workspaceRoot, 'review/orbit-role-state-smoke.generated.json')),
      '--project',
      relative(root, projectRoot),
      '--shell',
      'orbit/role-shell-prototype.generated.json',
      '--shellSmoke',
      'orbit/role-shell-smoke.generated.json'
    ],
    report: resolve(workspaceRoot, 'review/orbit-role-state-handoff.generated.json')
  },
  {
    id: 'app_route_spec',
    label: 'Orbit App Route Spec',
    script: 'kosmo:orbit-app-route-spec',
    args: [
      '--handoff',
      relative(root, resolve(workspaceRoot, 'review/orbit-role-state-handoff.generated.json')),
      '--state',
      relative(root, roleStatePath),
      '--project',
      relative(root, projectRoot),
      '--shell',
      'orbit/role-shell-prototype.generated.json'
    ],
    report: resolve(workspaceRoot, 'review/orbit-app-route-spec.generated.json')
  },
  {
    id: 'health_readiness',
    label: 'Health Readiness Contract',
    script: 'kosmo:orbit-health-readiness',
    args: [
      '--contract',
      'examples/kosmo-orbit/health/health-readiness.contract.json'
    ],
    report: resolve(workspaceRoot, 'review/orbit-health-readiness.generated.json')
  },
  {
    id: 'command_contract',
    label: 'Orbit Command Contract',
    script: 'kosmo:orbit-command-contract',
    args: [
      '--contract',
      'examples/kosmo-orbit/commands/orbit-command.contract.json'
    ],
    report: resolve(workspaceRoot, 'review/orbit-command-contract.generated.json')
  },
  {
    id: 'audit_trail',
    label: 'Orbit Audit Trail Contract',
    script: 'kosmo:orbit-audit-trail',
    args: [
      '--contract',
      'examples/kosmo-orbit/audit/orbit-audit-trail.contract.json'
    ],
    report: resolve(workspaceRoot, 'review/orbit-audit-trail.generated.json')
  },
  {
    id: 'office_routine',
    label: 'Orbit Office Routine Contract',
    script: 'kosmo:orbit-office-routine',
    args: [
      '--contract',
      'examples/kosmo-orbit/routines/orbit-office-routine.contract.json'
    ],
    report: resolve(workspaceRoot, 'review/orbit-office-routine.generated.json')
  },
  {
    id: 'pilot_session',
    label: 'Orbit Pilot Session Template',
    script: 'kosmo:orbit-pilot-session',
    args: [
      '--session',
      'examples/kosmo-orbit/pilot/orbit-office-pilot-session.demo.json',
      '--schema',
      'schema/kosmo-orbit-pilot-session.schema.json'
    ],
    report: resolve(workspaceRoot, 'review/orbit-pilot-session.generated.json')
  },
  {
    id: 'pilot_measurement_kit',
    label: 'Orbit Pilot Measurement Kit',
    script: 'kosmo:orbit-pilot-kit',
    args: [
      '--kit',
      'examples/kosmo-orbit/pilot/orbit-office-pilot-measurement-kit.demo.json',
      '--schema',
      'schema/kosmo-orbit-pilot-measurement-kit.schema.json'
    ],
    report: resolve(workspaceRoot, 'review/orbit-pilot-measurement-kit.generated.json')
  },
  {
    id: 'pilot_result_draft',
    label: 'Orbit Pilot Result Draft',
    script: 'kosmo:orbit-pilot-result',
    args: [
      '--draft',
      'examples/kosmo-orbit/pilot/orbit-office-pilot-result-draft.demo.json',
      '--schema',
      'schema/kosmo-orbit-pilot-result-draft.schema.json'
    ],
    report: resolve(workspaceRoot, 'review/orbit-pilot-result-draft.generated.json')
  },
  {
    id: 'orbit_route_smoke',
    label: 'Orbit Route Smoke',
    script: 'kosmo:orbit-route-smoke',
    args: [
      '--route',
      'app/orbit/page.tsx',
      '--spec',
      relative(root, resolve(workspaceRoot, 'review/orbit-app-route-spec.generated.json'))
    ],
    report: resolve(workspaceRoot, 'review/orbit-route-smoke.generated.json')
  }
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(workspacePath)) throw new Error(`KosmoOrbit workspace not found: ${workspacePath}`);
  if (!existsSync(roleStatePath)) throw new Error(`KosmoOrbit role state not found: ${roleStatePath}`);
  if (!existsSync(projectRoot)) throw new Error(`Kosmo project root not found: ${projectRoot}`);

  const stepRows = [];
  for (const step of steps) {
    const row = runStep(step);
    stepRows.push(row);
    if (row.status !== 'passed' && !args['continue-on-failure']) break;
  }

  const report = buildReport(stepRows);
  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit full review');
  console.log(`Workspace: ${relative(root, workspacePath)}`);
  console.log(`Project: ${relative(root, projectRoot)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Steps: ${report.summary.passed_steps}/${report.summary.step_count} passed`);
  console.log(`Panel state: ${report.summary.design_panel_state || 'unknown'}`);
  console.log(`Design open mode: ${report.summary.design_open_mode || 'unknown'}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.summary.failed_steps > 0) process.exit(1);
}

function runStep(step) {
  const command = ['npm', 'run', step.script, '--', ...step.args];
  const result = spawnSync(command[0], command.slice(1), {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 16
  });
  const report = step.report && existsSync(step.report) ? readJson(step.report) : null;

  return {
    id: step.id,
    label: step.label,
    command: command.join(' '),
    status: result.status === 0 ? 'passed' : 'failed',
    exit_code: result.status,
    report_path: step.report ? relative(root, step.report) : null,
    report_exists: Boolean(report),
    report_status: report?.status || null,
    stdout_tail: tail(result.stdout),
    stderr_tail: tail(result.stderr)
  };
}

function buildReport(stepRows) {
  const failedSteps = stepRows.filter((step) => step.status !== 'passed');
  const roleStateCheck = readOptionalJson(resolve(workspaceRoot, 'review/orbit-role-state-check.generated.json'));
  const roleStateSmoke = readOptionalJson(resolve(workspaceRoot, 'review/orbit-role-state-smoke.generated.json'));
  const roleStateHandoff = readOptionalJson(resolve(workspaceRoot, 'review/orbit-role-state-handoff.generated.json'));
  const appRouteSpec = readOptionalJson(resolve(workspaceRoot, 'review/orbit-app-route-spec.generated.json'));
  const healthReadiness = readOptionalJson(resolve(workspaceRoot, 'review/orbit-health-readiness.generated.json'));
  const commandContract = readOptionalJson(resolve(workspaceRoot, 'review/orbit-command-contract.generated.json'));
  const auditTrail = readOptionalJson(resolve(workspaceRoot, 'review/orbit-audit-trail.generated.json'));
  const officeRoutine = readOptionalJson(resolve(workspaceRoot, 'review/orbit-office-routine.generated.json'));
  const pilotSession = readOptionalJson(resolve(workspaceRoot, 'review/orbit-pilot-session.generated.json'));
  const pilotMeasurementKit = readOptionalJson(resolve(workspaceRoot, 'review/orbit-pilot-measurement-kit.generated.json'));
  const pilotResultDraft = readOptionalJson(resolve(workspaceRoot, 'review/orbit-pilot-result-draft.generated.json'));
  const orbitRouteSmoke = readOptionalJson(resolve(workspaceRoot, 'review/orbit-route-smoke.generated.json'));
  const workspaceStatus = readOptionalJson(resolve(workspaceRoot, 'review/orbit-status-report.generated.json'));
  const projectInspector = readOptionalJson(resolve(projectRoot, 'orbit/project-inspector.generated.json'));
  const designHandoff = readOptionalJson(resolve(projectRoot, 'orbit/design-handoff-preview.generated.json'));
  const designPanel = readOptionalJson(resolve(projectRoot, 'orbit/design-handoff-ui-panel.generated.json'));
  const designPrototype = readOptionalJson(resolve(projectRoot, 'orbit/design-handoff-ui-prototype.generated.json'));
  const designUiSmoke = readOptionalJson(resolve(projectRoot, 'orbit/design-handoff-ui-smoke.generated.json'));
  const roleVariants = readOptionalJson(resolve(projectRoot, 'orbit/role-ui-variants.generated.json'));
  const roleUiSmoke = readOptionalJson(resolve(projectRoot, 'orbit/role-ui-smoke.generated.json'));
  const roleShellPrototype = readOptionalJson(resolve(projectRoot, 'orbit/role-shell-prototype.generated.json'));
  const roleShellSmoke = readOptionalJson(resolve(projectRoot, 'orbit/role-shell-smoke.generated.json'));

  const status = failedSteps.length
    ? 'orbit_full_review_failed'
    : designPanel?.panel?.state === 'review_only'
      ? 'orbit_full_review_ready_for_review_mode'
      : designPanel?.panel?.state === 'ready_for_design_generation'
        ? 'orbit_full_review_ready_for_design_generation'
        : 'orbit_full_review_passed';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-full-review',
    workspace_path: relative(root, workspacePath),
    project_root: relative(root, projectRoot),
    status,
    policy: {
      review_only: true,
      no_uploads: true,
      no_public_publish: true,
      no_external_accounts: true,
      no_costs: true,
      no_blender_launch: true,
      no_geometry_generation: true
    },
    summary: {
      step_count: stepRows.length,
      passed_steps: stepRows.filter((step) => step.status === 'passed').length,
      failed_steps: failedSteps.length,
      role_state_status: roleStateCheck?.status || null,
      role_state_active_role: roleStateCheck?.state?.active_role_id || null,
      role_state_selected_role: roleStateCheck?.state?.selected_role_id || null,
      role_state_visible_module_count: roleStateCheck?.summary?.visible_module_count ?? null,
      role_state_blocked_action_count: roleStateCheck?.summary?.blocked_action_count ?? null,
      role_state_smoke_status: roleStateSmoke?.status || null,
      role_state_smoke_passed_checks: roleStateSmoke?.summary?.passed_checks ?? null,
      role_state_smoke_check_count: roleStateSmoke?.summary?.check_count ?? null,
      role_state_handoff_status: roleStateHandoff?.status || null,
      role_state_handoff_items: roleStateHandoff?.summary?.handoff_item_count ?? null,
      app_route_spec_status: appRouteSpec?.status || null,
      app_route_spec_sections: appRouteSpec?.summary?.section_count ?? null,
      health_readiness_status: healthReadiness?.status || null,
      health_readiness_passed_checks: healthReadiness?.summary?.passed_checks ?? null,
      health_readiness_check_count: healthReadiness?.summary?.check_count ?? null,
      health_readiness_channel_count: healthReadiness?.summary?.channel_count ?? null,
      command_contract_status: commandContract?.status || null,
      command_contract_passed_checks: commandContract?.summary?.passed_checks ?? null,
      command_contract_check_count: commandContract?.summary?.check_count ?? null,
      command_contract_command_count: commandContract?.summary?.command_count ?? null,
      command_contract_blocked_count: commandContract?.summary?.blocked_command_count ?? null,
      audit_trail_status: auditTrail?.status || null,
      audit_trail_passed_checks: auditTrail?.summary?.passed_checks ?? null,
      audit_trail_check_count: auditTrail?.summary?.check_count ?? null,
      audit_trail_event_count: auditTrail?.summary?.event_count ?? null,
      audit_trail_writing_count: auditTrail?.summary?.writing_event_count ?? null,
      office_routine_status: officeRoutine?.status || null,
      office_routine_passed_checks: officeRoutine?.summary?.passed_checks ?? null,
      office_routine_check_count: officeRoutine?.summary?.check_count ?? null,
      office_routine_count: officeRoutine?.summary?.routine_count ?? null,
      office_routine_blocked_count: officeRoutine?.summary?.blocked_action_count ?? null,
      pilot_session_status: pilotSession?.status || null,
      pilot_session_passed_checks: pilotSession?.summary?.passed_checks ?? null,
      pilot_session_check_count: pilotSession?.summary?.check_count ?? null,
      pilot_session_measurement_points: pilotSession?.summary?.measurement_point_count ?? null,
      pilot_measurement_kit_status: pilotMeasurementKit?.status || null,
      pilot_measurement_kit_passed_checks: pilotMeasurementKit?.summary?.passed_checks ?? null,
      pilot_measurement_kit_check_count: pilotMeasurementKit?.summary?.check_count ?? null,
      pilot_measurement_kit_cards: pilotMeasurementKit?.summary?.measurement_card_count ?? null,
      pilot_measurement_kit_evidence_links: pilotMeasurementKit?.summary?.evidence_link_count ?? null,
      pilot_result_draft_status: pilotResultDraft?.status || null,
      pilot_result_draft_passed_checks: pilotResultDraft?.summary?.passed_checks ?? null,
      pilot_result_draft_check_count: pilotResultDraft?.summary?.check_count ?? null,
      pilot_result_draft_slots: pilotResultDraft?.summary?.result_slot_count ?? null,
      pilot_result_draft_empty_slots: pilotResultDraft?.summary?.empty_result_slot_count ?? null,
      orbit_route_smoke_status: orbitRouteSmoke?.status || null,
      orbit_route_smoke_passed_checks: orbitRouteSmoke?.summary?.passed_checks ?? null,
      orbit_route_smoke_check_count: orbitRouteSmoke?.summary?.check_count ?? null,
      workspace_status: workspaceStatus?.status || null,
      project_status: projectInspector?.status || null,
      project_artifact_count: projectInspector?.summary?.artifact_count ?? null,
      project_review_artifact_count: projectInspector?.summary?.review_artifact_count ?? null,
      design_handoff_status: designHandoff?.status || null,
      design_open_mode: designHandoff?.handoff?.recommended_open_mode || null,
      design_generation_allowed: designHandoff?.handoff?.design_generation_allowed === true,
      design_blocker_count: designHandoff?.blockers?.length ?? null,
      design_panel_state: designPanel?.panel?.state || null,
      primary_action: designPanel?.actions?.primary?.label || null,
      primary_action_enabled: designPanel?.actions?.primary?.enabled === true,
      design_ui_prototype_status: designPrototype?.status || null,
      design_ui_prototype_html: designPrototype?.html_output || null,
      design_ui_smoke_status: designUiSmoke?.status || null,
      design_ui_smoke_passed_checks: designUiSmoke?.summary?.passed_checks ?? null,
      design_ui_smoke_check_count: designUiSmoke?.summary?.check_count ?? null,
      role_variant_status: roleVariants?.status || null,
      role_variant_count: roleVariants?.summary?.variant_count ?? null,
      role_design_capable_count: roleVariants?.summary?.design_capable_count ?? null,
      role_ui_smoke_status: roleUiSmoke?.status || null,
      role_ui_smoke_passed_checks: roleUiSmoke?.summary?.passed_checks ?? null,
      role_ui_smoke_check_count: roleUiSmoke?.summary?.check_count ?? null,
      role_shell_prototype_status: roleShellPrototype?.status || null,
      role_shell_prototype_html: roleShellPrototype?.html_output || null,
      role_shell_smoke_status: roleShellSmoke?.status || null,
      role_shell_smoke_passed_checks: roleShellSmoke?.summary?.passed_checks ?? null,
      role_shell_smoke_check_count: roleShellSmoke?.summary?.check_count ?? null
    },
    outputs: {
      full_review_json: relative(root, outputJsonPath),
      full_review_markdown: relative(root, outputMdPath),
      role_state_check_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-role-state-check.generated.md')),
      role_state_smoke_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-role-state-smoke.generated.md')),
      role_state_handoff_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-role-state-handoff.generated.md')),
      app_route_spec_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-app-route-spec.generated.md')),
      health_readiness_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-health-readiness.generated.md')),
      command_contract_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-command-contract.generated.md')),
      audit_trail_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-audit-trail.generated.md')),
      office_routine_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-office-routine.generated.md')),
      pilot_session_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-pilot-session.generated.md')),
      pilot_measurement_kit_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-pilot-measurement-kit.generated.md')),
      pilot_result_draft_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-pilot-result-draft.generated.md')),
      orbit_route_smoke_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-route-smoke.generated.md')),
      workspace_status_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-status-report.generated.md')),
      project_inspector_markdown: relative(root, resolve(projectRoot, 'orbit/project-inspector.generated.md')),
      design_handoff_markdown: relative(root, resolve(projectRoot, 'orbit/design-handoff-preview.generated.md')),
      design_ui_panel_markdown: relative(root, resolve(projectRoot, 'orbit/design-handoff-ui-panel.generated.md')),
      design_ui_prototype_html: relative(root, resolve(projectRoot, 'orbit/design-handoff-ui-prototype.generated.html')),
      design_ui_smoke_markdown: relative(root, resolve(projectRoot, 'orbit/design-handoff-ui-smoke.generated.md')),
      role_variants_markdown: relative(root, resolve(projectRoot, 'orbit/role-ui-variants.generated.md')),
      role_ui_smoke_markdown: relative(root, resolve(projectRoot, 'orbit/role-ui-smoke.generated.md')),
      role_shell_prototype_html: relative(root, resolve(projectRoot, 'orbit/role-shell-prototype.generated.html')),
      role_shell_smoke_markdown: relative(root, resolve(projectRoot, 'orbit/role-shell-smoke.generated.md'))
    },
    steps: stepRows,
    next_actions: nextActions({ failedSteps, roleStateCheck, roleStateSmoke, roleStateHandoff, appRouteSpec, healthReadiness, commandContract, auditTrail, pilotSession, pilotMeasurementKit, pilotResultDraft, orbitRouteSmoke, workspaceStatus, projectInspector, designHandoff, designPanel, designPrototype, designUiSmoke, roleVariants, roleUiSmoke, roleShellPrototype, roleShellSmoke })
  };
}

function nextActions({ failedSteps, roleStateCheck, roleStateSmoke, roleStateHandoff, appRouteSpec, healthReadiness, commandContract, auditTrail, pilotSession, pilotMeasurementKit, pilotResultDraft, orbitRouteSmoke, workspaceStatus, projectInspector, designHandoff, designPanel, designPrototype, designUiSmoke, roleVariants, roleUiSmoke, roleShellPrototype, roleShellSmoke }) {
  const actions = [];
  if (failedSteps.length) {
    failedSteps.forEach((step) => actions.push(`Review failed step: ${step.label}`));
    return actions;
  }
  if (designPanel?.panel?.state === 'review_only') {
    actions.push('Implement the first local/static Orbit UI prototype from the generated KosmoDesign panel spec.');
  }
  if (roleStateCheck?.status === 'role_state_check_passed') {
    actions.push('Use the checked role state contract before adding real role switching or app routing.');
  }
  if (roleStateSmoke?.status === 'role_state_smoke_passed') {
    actions.push('Keep the role state smoke in the Orbit full review before adding role-state interaction.');
  }
  if (roleStateHandoff?.status === 'role_state_handoff_ready') {
    actions.push('Use the role state handoff as the next contract before implementing a static Orbit app route.');
  }
  if (appRouteSpec?.status === 'orbit_app_route_spec_ready') {
    actions.push('Use the Orbit app route spec before changing app/orbit/page.tsx.');
  }
  if (healthReadiness?.status === 'health_readiness_contract_passed') {
    actions.push('Keep the Health Readiness contract read-only until a local runtime adapter is approved.');
  }
  if (commandContract?.status === 'orbit_command_contract_passed') {
    actions.push('Keep the Command Contract static until command schemas, logs and rollback behavior are approved.');
  }
  if (auditTrail?.status === 'orbit_audit_trail_contract_passed') {
    actions.push('Keep the Audit Trail static until persistence, retention and privacy rules are approved.');
  }
  if (pilotSession?.status === 'orbit_pilot_session_template_ready') {
    actions.push('Use the pilot session template for a real office pilot only after anonymising project inputs.');
  }
  if (pilotMeasurementKit?.status === 'orbit_pilot_measurement_kit_ready') {
    actions.push('Use the pilot measurement kit to structure the first office pilot without claiming savings before human data exists.');
  }
  if (pilotResultDraft?.status === 'orbit_pilot_result_draft_template_ready') {
    actions.push('Use the pilot result draft only after a human office pilot creates evidence-backed observations.');
  }
  if (orbitRouteSmoke?.status === 'orbit_route_smoke_passed') {
    actions.push('Keep the Orbit route smoke in the full review before promoting /orbit in public navigation.');
  }
  if (designHandoff?.context?.blocked_input_count > 0) {
    actions.push('Resolve or explicitly reject blocked context inputs before allowing design generation.');
  }
  if (projectInspector?.summary?.review_artifact_count > 0) {
    actions.push('Keep generated project artifacts local until human review closes design/draw/viz evidence.');
  }
  if (workspaceStatus?.summary?.blocked_gate_count > 0) {
    actions.push('Keep public, rights and publish gates visible as blocked in the Orbit shell.');
  }
  if (designPrototype?.status === 'ui_prototype_ready') {
    actions.push('Use the generated static HTML prototype as the visual reference for the first KosmoOrbit app screen.');
  }
  if (designUiSmoke?.status === 'ui_smoke_passed') {
    actions.push('Keep the UI smoke in the Orbit full review before any UI handoff or prototype change.');
  }
  if (roleVariants?.status === 'role_ui_variants_ready') {
    actions.push('Use the generated role variants to drive the next KosmoOrbit UI prototype pass.');
  }
  if (roleUiSmoke?.status === 'role_ui_smoke_passed') {
    actions.push('Keep the role UI smoke in the Orbit full review before changing role permissions or learning modes.');
  }
  if (roleShellPrototype?.status === 'role_shell_prototype_ready') {
    actions.push('Use the generated role shell prototype as the visual reference for the first role-aware KosmoOrbit app screen.');
  }
  if (roleShellSmoke?.status === 'role_shell_smoke_passed') {
    actions.push('Keep the role shell smoke in the Orbit full review before adding interaction or real app routing.');
  }
  if (!actions.length) actions.push('KosmoOrbit full review is ready for the next implementation step.');
  return actions;
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Full Review',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Workspace: \`${report.workspace_path}\``,
    `Project: \`${report.project_root}\``,
    '',
    'Review-only. This full review does not open Blender, generate geometry, publish data, upload files, access external accounts or spend money.',
    '',
    '## Summary',
    '',
    `- steps: ${report.summary.passed_steps}/${report.summary.step_count} passed`,
    `- role state: \`${report.summary.role_state_status}\``,
    `- role state active role: \`${report.summary.role_state_active_role}\``,
    `- role state selected role: \`${report.summary.role_state_selected_role}\``,
    `- role state visible modules: ${report.summary.role_state_visible_module_count}`,
    `- role state blocked actions: ${report.summary.role_state_blocked_action_count}`,
    `- role state smoke: \`${report.summary.role_state_smoke_status}\``,
    `- role state smoke checks: ${report.summary.role_state_smoke_passed_checks}/${report.summary.role_state_smoke_check_count}`,
    `- role state handoff: \`${report.summary.role_state_handoff_status}\``,
    `- role state handoff items: ${report.summary.role_state_handoff_items}`,
    `- app route spec: \`${report.summary.app_route_spec_status}\``,
    `- app route spec sections: ${report.summary.app_route_spec_sections}`,
    `- health readiness: \`${report.summary.health_readiness_status}\``,
    `- health readiness checks: ${report.summary.health_readiness_passed_checks}/${report.summary.health_readiness_check_count}`,
    `- health readiness channels: ${report.summary.health_readiness_channel_count}`,
    `- command contract: \`${report.summary.command_contract_status}\``,
    `- command contract checks: ${report.summary.command_contract_passed_checks}/${report.summary.command_contract_check_count}`,
    `- command contract commands: ${report.summary.command_contract_command_count}`,
    `- command contract blocked: ${report.summary.command_contract_blocked_count}`,
    `- audit trail: \`${report.summary.audit_trail_status}\``,
    `- audit trail checks: ${report.summary.audit_trail_passed_checks}/${report.summary.audit_trail_check_count}`,
    `- audit trail events: ${report.summary.audit_trail_event_count}`,
    `- audit trail writes: ${report.summary.audit_trail_writing_count}`,
    `- office routine: \`${report.summary.office_routine_status}\``,
    `- office routine checks: ${report.summary.office_routine_passed_checks}/${report.summary.office_routine_check_count}`,
    `- office routine moments: ${report.summary.office_routine_count}`,
    `- office routine blocked actions: ${report.summary.office_routine_blocked_count}`,
    `- pilot session: \`${report.summary.pilot_session_status}\``,
    `- pilot session checks: ${report.summary.pilot_session_passed_checks}/${report.summary.pilot_session_check_count}`,
    `- pilot session measurement points: ${report.summary.pilot_session_measurement_points}`,
    `- pilot measurement kit: \`${report.summary.pilot_measurement_kit_status}\``,
    `- pilot measurement kit checks: ${report.summary.pilot_measurement_kit_passed_checks}/${report.summary.pilot_measurement_kit_check_count}`,
    `- pilot measurement kit cards: ${report.summary.pilot_measurement_kit_cards}`,
    `- pilot measurement kit evidence links: ${report.summary.pilot_measurement_kit_evidence_links}`,
    `- pilot result draft: \`${report.summary.pilot_result_draft_status}\``,
    `- pilot result draft checks: ${report.summary.pilot_result_draft_passed_checks}/${report.summary.pilot_result_draft_check_count}`,
    `- pilot result draft slots: ${report.summary.pilot_result_draft_slots}`,
    `- pilot result draft empty slots: ${report.summary.pilot_result_draft_empty_slots}`,
    `- orbit route smoke: \`${report.summary.orbit_route_smoke_status}\``,
    `- orbit route smoke checks: ${report.summary.orbit_route_smoke_passed_checks}/${report.summary.orbit_route_smoke_check_count}`,
    `- workspace status: \`${report.summary.workspace_status}\``,
    `- project status: \`${report.summary.project_status}\``,
    `- project artifacts: ${report.summary.project_artifact_count}`,
    `- review artifacts: ${report.summary.project_review_artifact_count}`,
    `- design handoff: \`${report.summary.design_handoff_status}\``,
    `- design open mode: \`${report.summary.design_open_mode}\``,
    `- design generation allowed: ${report.summary.design_generation_allowed ? 'yes' : 'no'}`,
    `- design blockers: ${report.summary.design_blocker_count}`,
    `- design panel state: \`${report.summary.design_panel_state}\``,
    `- primary action: ${report.summary.primary_action || '-'}`,
    `- primary action enabled: ${report.summary.primary_action_enabled ? 'yes' : 'no'}`,
    `- UI prototype: \`${report.summary.design_ui_prototype_status}\``,
    `- UI prototype HTML: \`${report.summary.design_ui_prototype_html}\``,
    `- UI smoke: \`${report.summary.design_ui_smoke_status}\``,
    `- UI smoke checks: ${report.summary.design_ui_smoke_passed_checks}/${report.summary.design_ui_smoke_check_count}`,
    `- role variants: \`${report.summary.role_variant_status}\``,
    `- role variant count: ${report.summary.role_variant_count}`,
    `- design-capable roles: ${report.summary.role_design_capable_count}`,
    `- role UI smoke: \`${report.summary.role_ui_smoke_status}\``,
    `- role UI smoke checks: ${report.summary.role_ui_smoke_passed_checks}/${report.summary.role_ui_smoke_check_count}`,
    `- role shell prototype: \`${report.summary.role_shell_prototype_status}\``,
    `- role shell prototype HTML: \`${report.summary.role_shell_prototype_html}\``,
    `- role shell smoke: \`${report.summary.role_shell_smoke_status}\``,
    `- role shell smoke checks: ${report.summary.role_shell_smoke_passed_checks}/${report.summary.role_shell_smoke_check_count}`,
    '',
    '## Steps',
    '',
    '| Step | Status | Report |',
    '| --- | --- | --- |'
  ];

  for (const step of report.steps) {
    lines.push(`| ${escapePipe(step.label)} | \`${step.status}\` | ${step.report_path ? `\`${step.report_path}\`` : '-'} |`);
  }

  lines.push('', '## Outputs', '');
  Object.entries(report.outputs).forEach(([label, pathname]) => {
    lines.push(`- ${label}: \`${pathname}\``);
  });

  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function readOptionalJson(pathname) {
  if (!existsSync(pathname)) return null;
  return readJson(pathname);
}

function tail(value) {
  return String(value || '').trim().split('\n').slice(-8).join('\n');
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
