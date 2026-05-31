#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const workspacePath = resolve(root, args.workspace || 'examples/kosmo-orbit/workspace.demo.json');
const workspaceRoot = dirname(workspacePath);
const outputJsonPath = resolve(workspaceRoot, args.output || 'review/orbit-status-report.generated.json');
const outputMdPath = resolve(workspaceRoot, args.markdown || 'review/orbit-status-report.generated.md');

const statusRank = {
  blocked: 0,
  needs_review: 1,
  unknown: 2,
  local_only: 3,
  planned: 4,
  prototype: 5,
  external: 6,
  active: 7,
  ready: 8,
  approved_local: 9,
  approved_public: 10
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(workspacePath)) throw new Error(`KosmoOrbit workspace not found: ${workspacePath}`);

  const workspace = readJson(workspacePath);
  const report = buildReport(workspace);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit status report generated');
  console.log(`Workspace: ${report.workspace.name}`);
  console.log(`Status: ${report.status}`);
  console.log(`Tools: ${report.summary.tool_count}`);
  console.log(`Gates: ${report.summary.gate_count}`);
  console.log(`Blocked gates: ${report.summary.blocked_gate_count}`);
  console.log(`Needs review: ${report.summary.needs_review_gate_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function buildReport(workspace) {
  const roles = asArray(workspace.roles);
  const tools = asArray(workspace.tools);
  const projects = asArray(workspace.projects);
  const gates = asArray(workspace.gates);
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const gateById = new Map(gates.map((gate) => [gate.id, gate]));
  const currentRole = roleById.get(workspace.current_user?.role_id);
  const toolRows = tools.map((tool) => toolRow(tool, { roleById, gateById }));
  const projectRows = projects.map((project) => projectRow(project, { roleById, gates }));
  const gateRows = gates.map((gate) => gateRow(gate, { roleById, tools, projects }));
  const blockedGates = gateRows.filter((gate) => gate.status === 'blocked');
  const reviewGates = gateRows.filter((gate) => gate.status === 'needs_review' || gate.status === 'unknown');

  const summary = {
    role_count: roles.length,
    tool_count: toolRows.length,
    project_count: projectRows.length,
    gate_count: gateRows.length,
    blocked_gate_count: blockedGates.length,
    needs_review_gate_count: reviewGates.length,
    tools_by_status: countBy(toolRows.map((tool) => tool.status)),
    gates_by_status: countBy(gateRows.map((gate) => gate.status)),
    projects_by_status: countBy(projectRows.map((project) => project.status))
  };

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-status-report',
    workspace_path: relative(root, workspacePath),
    status: blockedGates.length ? 'orbit_blocked_gates_present' : reviewGates.length ? 'orbit_review_required' : 'orbit_ready',
    policy: {
      review_only: true,
      no_uploads: true,
      no_public_publish: true,
      no_external_accounts: true,
      no_costs: true
    },
    workspace: {
      id: workspace.workspace?.id || null,
      name: workspace.workspace?.name || null,
      mode: workspace.workspace?.mode || null,
      hardware_profile: workspace.workspace?.hardware_profile || null
    },
    current_user: {
      id: workspace.current_user?.id || null,
      name: workspace.current_user?.name || null,
      role_id: workspace.current_user?.role_id || null,
      role_label: currentRole?.label || null,
      ui_mode: currentRole?.ui_mode || null,
      permissions: asArray(currentRole?.permissions)
    },
    summary,
    roles: roles.map(roleRow),
    tools: toolRows,
    projects: projectRows,
    gates: gateRows,
    next_actions: nextActions({ blockedGates, reviewGates, toolRows, projectRows })
  };
}

function roleRow(role) {
  return {
    id: role.id,
    label: role.label,
    level: role.level,
    ui_mode: role.ui_mode,
    permission_count: asArray(role.permissions).length,
    description: role.description || null
  };
}

function toolRow(tool, { roleById, gateById }) {
  const gates = asArray(tool.gates).map((gateId) => gateById.get(gateId)).filter(Boolean);
  const worstGate = gates.sort((a, b) => (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99))[0] || null;
  return {
    id: tool.id,
    name: tool.name,
    category: tool.category,
    status: tool.status,
    readiness: toolReadiness(tool.status, worstGate?.status),
    primary_roles: asArray(tool.primary_roles).map((roleId) => ({
      id: roleId,
      label: roleById.get(roleId)?.label || roleId
    })),
    gates: gates.map((gate) => ({
      id: gate.id,
      type: gate.type,
      status: gate.status
    })),
    handoff_target: tool.handoff_target || null,
    description: tool.description || null
  };
}

function projectRow(project, { roleById, gates }) {
  const projectGates = gates.filter((gate) => gate.project_id === project.id);
  return {
    id: project.id,
    name: project.name,
    package_path: project.package_path,
    package_exists: Boolean(project.package_path && existsSync(resolve(root, project.package_path))),
    status: project.status,
    allowed_roles: asArray(project.allowed_roles).map((roleId) => ({
      id: roleId,
      label: roleById.get(roleId)?.label || roleId
    })),
    gates: projectGates.map((gate) => ({
      id: gate.id,
      type: gate.type,
      status: gate.status
    }))
  };
}

function gateRow(gate, { roleById, tools, projects }) {
  const tool = tools.find((candidate) => candidate.id === gate.tool_id);
  const project = projects.find((candidate) => candidate.id === gate.project_id);
  return {
    id: gate.id,
    type: gate.type,
    status: gate.status,
    owner_role: gate.owner_role,
    owner_label: roleById.get(gate.owner_role)?.label || gate.owner_role,
    tool_id: gate.tool_id || null,
    tool_name: tool?.name || null,
    project_id: gate.project_id || null,
    project_name: project?.name || null,
    severity: gateSeverity(gate),
    description: gate.description
  };
}

function toolReadiness(toolStatus, worstGateStatus) {
  if (worstGateStatus === 'blocked') return 'blocked_by_gate';
  if (worstGateStatus === 'needs_review' || worstGateStatus === 'unknown') return 'review_required';
  if (toolStatus === 'active') return 'available';
  if (toolStatus === 'prototype') return 'prototype';
  if (toolStatus === 'external') return 'external_runtime';
  return 'planned';
}

function gateSeverity(gate) {
  if (gate.status === 'blocked') return 'red';
  if (gate.status === 'needs_review' || gate.status === 'unknown') return 'yellow';
  if (gate.status === 'local_only') return 'blue';
  return 'green';
}

function nextActions({ blockedGates, reviewGates, toolRows, projectRows }) {
  const actions = [];
  if (blockedGates.length) {
    actions.push('Keep public promotion, uploads and unsafe routes blocked until owner/admin review clears the relevant gates.');
  }
  if (reviewGates.length) {
    actions.push('Resolve source, human-review, model-quality and security gates before using the project as a real production example.');
  }
  if (toolRows.some((tool) => tool.id === 'kosmo-design' && tool.status === 'planned')) {
    actions.push('Define the first KosmoDesign handoff screen: what Orbit opens, what Blender/KosmoDraw receives, and which role may trigger it.');
  }
  if (projectRows.some((project) => project.package_exists)) {
    actions.push('Use the existing demo project package as the first Orbit Project Package Inspector input.');
  }
  if (!actions.length) actions.push('Orbit workspace is ready for a first static UI prototype.');
  return actions;
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Status Report',
    '',
    `Workspace: \`${report.workspace.name}\``,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Mode: \`${report.workspace.mode}\``,
    `Hardware: \`${report.workspace.hardware_profile}\``,
    '',
    'Review-only. This report does not start tools, upload files, publish data, spend money or access external accounts.',
    '',
    '## Current User',
    '',
    `- name: ${report.current_user.name}`,
    `- role: ${report.current_user.role_label} (\`${report.current_user.role_id}\`)`,
    `- UI mode: \`${report.current_user.ui_mode}\``,
    `- permissions: ${report.current_user.permissions.map((permission) => `\`${permission}\``).join(', ')}`,
    '',
    '## Summary',
    '',
    `- roles: ${report.summary.role_count}`,
    `- tools: ${report.summary.tool_count}`,
    `- projects: ${report.summary.project_count}`,
    `- gates: ${report.summary.gate_count}`,
    `- blocked gates: ${report.summary.blocked_gate_count}`,
    `- review/unknown gates: ${report.summary.needs_review_gate_count}`,
    '',
    '## Tool Hub',
    '',
    '| Tool | Status | Readiness | Roles | Gates |',
    '| --- | --- | --- | --- | --- |'
  ];

  for (const tool of report.tools) {
    lines.push(`| ${escapePipe(tool.name)} | \`${tool.status}\` | \`${tool.readiness}\` | ${escapePipe(tool.primary_roles.map((role) => role.label).join(', '))} | ${escapePipe(gateSummary(tool.gates))} |`);
  }

  lines.push('', '## Projects', '', '| Project | Status | Package | Roles | Gates |', '| --- | --- | --- | --- | --- |');
  for (const project of report.projects) {
    lines.push(`| ${escapePipe(project.name)} | \`${project.status}\` | ${project.package_exists ? 'exists' : 'missing'} | ${escapePipe(project.allowed_roles.map((role) => role.label).join(', '))} | ${escapePipe(gateSummary(project.gates))} |`);
  }

  lines.push('', '## Gates', '', '| Gate | Type | Status | Owner | Tool | Project | Meaning |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const gate of report.gates) {
    lines.push(`| ${escapePipe(gate.id)} | \`${gate.type}\` | \`${gate.status}\` | ${escapePipe(gate.owner_label)} | ${escapePipe(gate.tool_name || '-')} | ${escapePipe(gate.project_name || '-')} | ${escapePipe(gate.description)} |`);
  }

  lines.push('', '## Role Modes', '', '| Role | Level | UI mode | Permissions |', '| --- | --- | --- | --- |');
  for (const role of report.roles) {
    lines.push(`| ${escapePipe(role.label)} | \`${role.level}\` | \`${role.ui_mode}\` | ${role.permission_count} |`);
  }

  lines.push('', '## Next Actions', '');
  for (const action of report.next_actions) lines.push(`- ${action}`);

  return `${lines.join('\n')}\n`;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function gateSummary(gates) {
  if (!gates.length) return '-';
  return gates.map((gate) => `${gate.id}:${gate.status}`).join(', ');
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
