#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const variantsPath = resolve(projectRoot, args.variants || 'orbit/role-ui-variants.generated.json');
const outputJsonPath = resolve(projectRoot, args.output || 'orbit/role-ui-smoke.generated.json');
const outputMdPath = resolve(projectRoot, args.markdown || 'orbit/role-ui-smoke.generated.md');

const requiredRoleIds = [
  'owner_admin',
  'it_ai_admin',
  'project_lead_architect',
  'design_architect',
  'drafter_efz',
  'intern',
  'apprentice',
  'trial_user'
];

const learningRoleIds = ['intern', 'apprentice', 'trial_user'];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(variantsPath)) throw new Error(`KosmoOrbit role variants not found: ${variantsPath}`);

  const variantsReport = readJson(variantsPath);
  const report = buildReport(variantsReport);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit role UI smoke');
  console.log(`Project: ${report.project?.name || 'unknown'}`);
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.summary.failed_checks > 0) process.exit(1);
}

function buildReport(variantsReport) {
  const variants = Array.isArray(variantsReport.variants) ? variantsReport.variants : [];
  const roleIds = new Set(variants.map((variant) => variant.role?.id).filter(Boolean));
  const byRole = new Map(variants.map((variant) => [variant.role?.id, variant]));
  const checks = [
    check('source_status_ready', 'Role variants report is ready.', variantsReport.status === 'role_ui_variants_ready'),
    check('variant_count', 'Exactly eight office role variants exist.', variantsReport.summary?.variant_count === 8 && variants.length === 8),
    check('required_roles_present', 'All required KosmoOrbit office roles exist.', requiredRoleIds.every((roleId) => roleIds.has(roleId))),
    check('generation_summary_blocked', 'No role is generation-capable in the summary.', variantsReport.summary?.generation_capable_count === 0),
    check('generation_disabled_everywhere', 'Every role keeps design generation disabled.', variants.every((variant) => variant.panel_state?.generation_enabled === false && variant.permissions?.can_request_design_generation === false)),
    check('owner_admin_public_approval', 'Owner admin can approve public gates.', byRole.get('owner_admin')?.permissions?.can_approve_public === true),
    check('design_architect_review_access', 'Entwurfsarchitekt can open design review context.', byRole.get('design_architect')?.permissions?.can_open_design_review === true),
    check('drafter_review_blocked', 'Zeichner EFZ stays blocked from design review opening.', byRole.get('drafter_efz')?.permissions?.can_open_design_review === false),
    check('trial_user_read_only', 'Schnupperstift remains read-only.', byRole.get('trial_user')?.permissions?.read_only === true),
    check('learning_roles_supported', 'Praktikant, Lehrling and Schnupperstift have learning support.', learningRoleIds.every((roleId) => byRole.get(roleId)?.learning_support?.enabled === true)),
    check('visible_sections_present', 'Every variant has visible UI sections.', variants.every((variant) => Array.isArray(variant.visible_sections) && variant.visible_sections.length > 0)),
    check('warnings_present', 'Every variant keeps at least one warning visible.', variants.every((variant) => Array.isArray(variant.warnings) && variant.warnings.length > 0))
  ];

  const failedChecks = checks.filter((item) => item.status !== 'passed');
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-role-ui-smoke',
    variants_path: relative(root, variantsPath),
    status: failedChecks.length ? 'role_ui_smoke_failed' : 'role_ui_smoke_passed',
    policy: {
      review_only: true,
      no_auth_runtime: true,
      no_user_data_write: true,
      no_blender_launch: true,
      no_geometry_generation: true
    },
    project: variantsReport.project || null,
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failedChecks.length,
      variant_count: variants.length,
      required_role_count: requiredRoleIds.length,
      generation_capable_count: variants.filter((variant) => variant.permissions?.can_request_design_generation).length,
      learning_variant_count: variants.filter((variant) => variant.learning_support?.enabled).length
    },
    checks,
    next_actions: failedChecks.length
      ? failedChecks.map((item) => `Fix failed role UI smoke check: ${item.id}`)
      : [
          'Keep this smoke check in the Orbit full review before changing role permissions.',
          'Use the role variants as a safe input for the first role-aware KosmoOrbit app screen.',
          'Do not enable design generation until context and human-review gates are approved.'
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

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Role UI Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Project: \`${report.project?.name || 'unknown'}\``,
    '',
    'Review-only role guard. This does not create users, write auth data, open Blender or generate geometry.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- variants: ${report.summary.variant_count}`,
    `- required roles: ${report.summary.required_role_count}`,
    `- generation-capable roles: ${report.summary.generation_capable_count}`,
    `- learning variants: ${report.summary.learning_variant_count}`,
    '',
    '## Checks',
    '',
    '| Check | Status | Meaning |',
    '| --- | --- | --- |'
  ];

  for (const item of report.checks) {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`);
  }

  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
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
