#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const workspacePath = resolve(root, args.workspace || 'examples/kosmo-orbit/workspace.demo.json');
const workspaceRoot = dirname(workspacePath);
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
  }
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(workspacePath)) throw new Error(`KosmoOrbit workspace not found: ${workspacePath}`);
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
  const workspaceStatus = readOptionalJson(resolve(workspaceRoot, 'review/orbit-status-report.generated.json'));
  const projectInspector = readOptionalJson(resolve(projectRoot, 'orbit/project-inspector.generated.json'));
  const designHandoff = readOptionalJson(resolve(projectRoot, 'orbit/design-handoff-preview.generated.json'));
  const designPanel = readOptionalJson(resolve(projectRoot, 'orbit/design-handoff-ui-panel.generated.json'));
  const designPrototype = readOptionalJson(resolve(projectRoot, 'orbit/design-handoff-ui-prototype.generated.json'));
  const designUiSmoke = readOptionalJson(resolve(projectRoot, 'orbit/design-handoff-ui-smoke.generated.json'));
  const roleVariants = readOptionalJson(resolve(projectRoot, 'orbit/role-ui-variants.generated.json'));
  const roleUiSmoke = readOptionalJson(resolve(projectRoot, 'orbit/role-ui-smoke.generated.json'));

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
      role_ui_smoke_check_count: roleUiSmoke?.summary?.check_count ?? null
    },
    outputs: {
      full_review_json: relative(root, outputJsonPath),
      full_review_markdown: relative(root, outputMdPath),
      workspace_status_markdown: relative(root, resolve(workspaceRoot, 'review/orbit-status-report.generated.md')),
      project_inspector_markdown: relative(root, resolve(projectRoot, 'orbit/project-inspector.generated.md')),
      design_handoff_markdown: relative(root, resolve(projectRoot, 'orbit/design-handoff-preview.generated.md')),
      design_ui_panel_markdown: relative(root, resolve(projectRoot, 'orbit/design-handoff-ui-panel.generated.md')),
      design_ui_prototype_html: relative(root, resolve(projectRoot, 'orbit/design-handoff-ui-prototype.generated.html')),
      design_ui_smoke_markdown: relative(root, resolve(projectRoot, 'orbit/design-handoff-ui-smoke.generated.md')),
      role_variants_markdown: relative(root, resolve(projectRoot, 'orbit/role-ui-variants.generated.md')),
      role_ui_smoke_markdown: relative(root, resolve(projectRoot, 'orbit/role-ui-smoke.generated.md'))
    },
    steps: stepRows,
    next_actions: nextActions({ failedSteps, workspaceStatus, projectInspector, designHandoff, designPanel, designPrototype, designUiSmoke, roleVariants, roleUiSmoke })
  };
}

function nextActions({ failedSteps, workspaceStatus, projectInspector, designHandoff, designPanel, designPrototype, designUiSmoke, roleVariants, roleUiSmoke }) {
  const actions = [];
  if (failedSteps.length) {
    failedSteps.forEach((step) => actions.push(`Review failed step: ${step.label}`));
    return actions;
  }
  if (designPanel?.panel?.state === 'review_only') {
    actions.push('Implement the first local/static Orbit UI prototype from the generated KosmoDesign panel spec.');
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
