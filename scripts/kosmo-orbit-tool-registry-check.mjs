#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const workspacePath = resolve(root, args.workspace || 'examples/kosmo-orbit/workspace.demo.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitToolRegistry.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-tool-registry.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-tool-registry.generated.md');

const requiredTools = [
  'kosmo-data',
  'kosmo-asset',
  'kosmo-design',
  'kosmo-prepare',
  'kosmo-draw',
  'kosmo-viz',
  'kosmo-publish',
  'kosmo-zentrale'
];

const blockedGateTypes = new Set(['publish_gate', 'cost_gate']);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(workspacePath)) throw new Error(`KosmoOrbit workspace not found: ${workspacePath}`);
  if (!existsSync(componentPath)) throw new Error(`KosmoOrbit tool registry component not found: ${componentPath}`);

  const workspace = readJson(workspacePath);
  const componentSource = readFileSync(componentPath, 'utf8');
  const routeSource = existsSync(routePath) ? readFileSync(routePath, 'utf8') : '';
  const sectionIndexSource = existsSync(sectionIndexPath) ? readFileSync(sectionIndexPath, 'utf8') : '';
  const report = buildReport({ workspace, componentSource, routeSource, sectionIndexSource });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit tool registry check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_tool_registry_ready') process.exit(1);
}

function buildReport({ workspace, componentSource, routeSource, sectionIndexSource }) {
  const tools = asArray(workspace.tools);
  const roles = asArray(workspace.roles);
  const gates = asArray(workspace.gates);
  const toolIds = new Set(tools.map((tool) => tool.id));
  const roleIds = new Set(roles.map((role) => role.id));
  const gatesByTool = groupBy(gates, (gate) => gate.tool_id);
  const riskyGateApprovals = gates.filter((gate) => blockedGateTypes.has(gate.type) && gate.status !== 'blocked' && gate.status !== 'local_only');

  const checks = [
    check('workspace_has_core_tools', 'Workspace lists all eight Architecture Kosmos tools.', requiredTools.every((toolId) => toolIds.has(toolId))),
    check('workspace_has_role_profiles', 'Workspace covers the expected office role profiles.', ['owner_admin', 'it_ai_admin', 'project_lead_architect', 'design_architect', 'drafter_efz', 'intern', 'apprentice', 'trial_user'].every((roleId) => roleIds.has(roleId))),
    check('every_tool_has_role_gate_copy', 'Every tool has roles, gates and descriptive copy.', tools.every((tool) => tool.name && tool.description && asArray(tool.primary_roles).length > 0 && asArray(tool.gates).length > 0)),
    check('tool_gates_resolve', 'Every tool gate resolves to a workspace gate.', tools.every((tool) => asArray(tool.gates).every((gateId) => gates.some((gate) => gate.id === gateId)))),
    check('zentrale_is_external', 'KosmoZentrale stays external until local runtime integration exists.', tools.some((tool) => tool.id === 'kosmo-zentrale' && tool.status === 'external')),
    check('design_has_handoff_target', 'KosmoDesign has an explicit handoff target.', tools.some((tool) => tool.id === 'kosmo-design' && tool.handoff_target)),
    check('publish_and_cost_gates_blocked', 'Publish and cost gates are blocked or local-only.', riskyGateApprovals.length === 0),
    check('component_imports_workspace_contract', 'Component imports the local workspace contract.', componentSource.includes('workspace.demo.json')),
    check('component_renders_tool_orchestration', 'Component renders KosmoOrbit as Tool-Orchestrierung.', componentSource.includes('Tool-Orchestrierung') && componentSource.includes('Software-Zentrale')),
    check('component_renders_safety_boundary', 'Component states no launches, model starts, uploads, costs or public release.', componentSource.includes('Keine Tool-Launches') && componentSource.includes('keine Modellstarts') && componentSource.includes('keine Uploads') && componentSource.includes('keine Kostenjobs') && componentSource.includes('keine Public-Freigabe')),
    check('route_imports_tool_registry', 'Orbit route imports the tool registry component.', routeSource.includes('OrbitToolRegistry')),
    check('route_anchors_tool_registry', 'Orbit route renders a tool-registry anchor.', routeSource.includes('id="tool-registry"')),
    check('section_index_links_tool_registry', 'Section index links to the tool registry.', sectionIndexSource.includes('#tool-registry'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-tool-registry-check',
    status: failed.length ? 'orbit_tool_registry_blocked' : 'orbit_tool_registry_ready',
    workspace_path: relative(root, workspacePath),
    component_path: relative(root, componentPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      tool_count: tools.length,
      role_count: roles.length,
      gate_count: gates.length,
      active_or_prototype_tool_count: tools.filter((tool) => tool.status === 'active' || tool.status === 'prototype').length,
      blocked_or_review_gate_count: gates.filter((gate) => gate.status === 'blocked' || gate.status === 'needs_review').length
    },
    tools: tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      status: tool.status,
      category: tool.category,
      primary_roles: asArray(tool.primary_roles),
      declared_gate_count: asArray(tool.gates).length,
      workspace_gate_count: asArray(gatesByTool[tool.id]).length
    })),
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed tool registry check: ${item.id}`)
      : [
          'Use this registry as the next KosmoOrbit module-orchestration contract.',
          'Keep tool launches, model starts, uploads, costs and public release blocked until a local runtime is explicitly approved.'
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

function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item) || 'unknown';
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Tool Registry Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Workspace: \`${report.workspace_path}\``,
    '',
    'Review-only check for the visible KosmoOrbit tool registry. It validates local JSON and React source only; it does not launch tools, start models, upload, publish, call external accounts or spend money.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- tools: ${report.summary.tool_count}`,
    `- roles: ${report.summary.role_count}`,
    `- gates: ${report.summary.gate_count}`,
    `- active/prototype tools: ${report.summary.active_or_prototype_tool_count}`,
    `- blocked/review gates: ${report.summary.blocked_or_review_gate_count}`,
    '',
    '## Tools',
    '',
    '| Tool | Status | Roles | Declared Gates | Workspace Gates |',
    '| --- | --- | --- | --- | --- |'
  ];

  report.tools.forEach((tool) => {
    lines.push(`| \`${tool.id}\` | \`${tool.status}\` | ${tool.primary_roles.length} | ${tool.declared_gate_count} | ${tool.workspace_gate_count} |`);
  });

  lines.push('', '## Checks', '', '| Check | Status | Meaning |', '| --- | --- | --- |');
  report.checks.forEach((item) => lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`));
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
