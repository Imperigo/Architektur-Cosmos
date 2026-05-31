#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const handoffPath = resolve(root, args.handoff || 'examples/kosmo-orbit/review/orbit-role-state-handoff.generated.json');
const roleStatePath = resolve(root, args.state || 'examples/kosmo-orbit/role-state.demo.json');
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const shellManifestPath = resolve(projectRoot, args.shell || 'orbit/role-shell-prototype.generated.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-app-route-spec.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-app-route-spec.generated.md');
const routeFilePath = resolve(root, 'app/orbit/page.tsx');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  for (const pathname of [handoffPath, roleStatePath, shellManifestPath]) {
    if (!existsSync(pathname)) throw new Error(`Required KosmoOrbit route-spec input not found: ${pathname}`);
  }

  const handoff = readJson(handoffPath);
  const roleState = readJson(roleStatePath);
  const shellManifest = readJson(shellManifestPath);
  const report = buildReport({ handoff, roleState, shellManifest });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit app route spec');
  console.log(`Status: ${report.status}`);
  console.log(`Sections: ${report.summary.section_count}`);
  console.log(`Disabled actions: ${report.summary.disabled_action_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_app_route_spec_ready') process.exit(1);
}

function buildReport({ handoff, roleState, shellManifest }) {
  const visibleModules = asArray(roleState.visible_modules);
  const blockedActions = asArray(roleState.blocked_actions);
  const sections = [
    {
      id: 'orbit-header',
      label: 'Orbit Header',
      source: 'role_state',
      content: ['active role', 'selected preview role', 'active project', 'review-only status']
    },
    {
      id: 'module-visibility',
      label: 'Module Visibility',
      source: 'role_state.visible_modules',
      content: visibleModules.map((module) => `${module.tool_id}:${module.visibility}`)
    },
    {
      id: 'blocked-actions',
      label: 'Blocked Actions',
      source: 'role_state.blocked_actions',
      content: blockedActions.map((action) => `${action.id}:${action.gate_id}`)
    },
    {
      id: 'role-shell-reference',
      label: 'Role Shell Reference',
      source: 'shell_manifest',
      content: [shellManifest.html_output || 'unknown']
    },
    {
      id: 'safety-copy',
      label: 'Safety Copy',
      source: 'handoff.policy',
      content: ['no auth runtime', 'no user writes', 'no network calls', 'no generation', 'no publish']
    }
  ];

  const checks = [
    check('handoff_ready', 'Role-state handoff is ready.', handoff.status === 'role_state_handoff_ready'),
    check('shell_ready', 'Role shell manifest is ready.', shellManifest.status === 'role_shell_prototype_ready'),
    check('role_state_review_only', 'Role state remains review-only.', roleState.interaction_policy?.review_only === true),
    check('route_is_static_preview', 'Orbit route is absent or remains a static preview page.', routeIsStaticPreview()),
    check('visible_modules_available', 'Visible modules are present.', visibleModules.length >= 8),
    check('blocked_actions_available', 'Blocked actions are present.', blockedActions.length >= 3),
    check('generation_blocked', 'Generate Design remains blocked.', blockedActions.some((action) => action.id === 'generate-design') && roleState.interaction_policy?.allow_design_generation === false),
    check('publish_blocked', 'Publish Public remains blocked.', blockedActions.some((action) => action.id === 'publish-public') && roleState.interaction_policy?.allow_public_publish === false),
    check('network_blocked', 'External network access remains blocked.', roleState.interaction_policy?.allow_external_network === false),
    check('shell_matches_state_project', 'Shell manifest matches active project.', shellManifest.role_state?.active_project_id === roleState.active_project?.project_id)
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-app-route-spec',
    status: failed.length ? 'orbit_app_route_spec_blocked' : 'orbit_app_route_spec_ready',
    inputs: {
      handoff: relative(root, handoffPath),
      role_state: relative(root, roleStatePath),
      shell_manifest: relative(root, shellManifestPath)
    },
    route_spec: {
      proposed_path: '/orbit',
      implementation_file: 'app/orbit/page.tsx',
      route_type: 'static_export_safe',
      data_mode: 'local_static_imports_only',
      write_mode: 'none',
      interaction_mode: 'preview_only',
      status: existsSync(routeFilePath) ? 'implemented_static_preview' : 'not_implemented'
    },
    policy: {
      review_only: true,
      no_api_routes: true,
      no_server_actions: true,
      no_middleware: true,
      no_auth_runtime: true,
      no_user_data_write: true,
      no_network_calls: true,
      no_uploads: true,
      no_public_publish: true,
      no_design_generation: true,
      no_wrangler_change: true
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      section_count: sections.length,
      visible_module_count: visibleModules.length,
      disabled_action_count: blockedActions.length,
      active_role_id: roleState.session?.active_role_id || null,
      selected_role_id: roleState.role_preview?.selected_role_id || null,
      active_project_id: roleState.active_project?.project_id || null
    },
    sections,
    disabled_actions: blockedActions.map((action) => ({
      id: action.id,
      label: action.label,
      gate_id: action.gate_id,
      reason: action.reason,
      display: 'visible_disabled'
    })),
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed Orbit app route spec check: ${item.id}`)
      : [
          existsSync(routeFilePath)
            ? 'Keep app/orbit/page.tsx aligned with this static route contract.'
            : 'Use this spec as the implementation contract before creating app/orbit/page.tsx.',
          'Keep the Orbit route static-export-safe and driven by local JSON imports.',
          'Keep a route smoke before any public navigation points at /orbit.'
        ]
  };
}

function routeIsStaticPreview() {
  if (!existsSync(routeFilePath)) return true;
  const source = readFileSync(routeFilePath, 'utf8');
  const blockedPatterns = [
    /['"]use server['"]/,
    /from ['"]next\/server['"]/,
    /redirect\s*\(/,
    /fetch\s*\(/,
    /cookies\s*\(/,
    /headers\s*\(/
  ];
  return !blockedPatterns.some((pattern) => pattern.test(source));
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
    '# KosmoOrbit App Route Spec',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Proposed path: \`${report.route_spec.proposed_path}\``,
    `Implementation file: \`${report.route_spec.implementation_file}\``,
    `Implementation status: \`${report.route_spec.status}\``,
    '',
    'Review-only route specification for the static `/orbit` preview. The route contract allows local JSON imports only and rejects API routes, auth runtime, server actions, middleware, network calls, uploads, publish actions and design generation.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- sections: ${report.summary.section_count}`,
    `- visible modules: ${report.summary.visible_module_count}`,
    `- disabled actions: ${report.summary.disabled_action_count}`,
    `- active role: \`${report.summary.active_role_id}\``,
    `- active project: \`${report.summary.active_project_id}\``,
    '',
    '## Sections',
    '',
    '| Section | Source | Content |',
    '| --- | --- | --- |'
  ];

  for (const section of report.sections) {
    lines.push(`| ${escapePipe(section.label)} | \`${section.source}\` | ${escapePipe(section.content.join(', '))} |`);
  }

  lines.push('', '## Disabled Actions', '', '| Action | Gate | Display | Reason |', '| --- | --- | --- | --- |');
  for (const action of report.disabled_actions) {
    lines.push(`| ${escapePipe(action.label)} | \`${action.gate_id}\` | \`${action.display}\` | ${escapePipe(action.reason)} |`);
  }

  lines.push('', '## Checks', '', '| Check | Status | Meaning |', '| --- | --- | --- |');
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
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
