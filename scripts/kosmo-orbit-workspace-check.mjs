#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const workspacePath = resolve(root, args.workspace || 'examples/kosmo-orbit/workspace.demo.json');

const allowedRoles = new Set([
  'owner_admin',
  'it_ai_admin',
  'project_lead_architect',
  'design_architect',
  'drafter_efz',
  'intern',
  'apprentice',
  'trial_user'
]);
const allowedTools = new Set([
  'kosmo-data',
  'kosmo-asset',
  'kosmo-design',
  'kosmo-prepare',
  'kosmo-draw',
  'kosmo-viz',
  'kosmo-publish',
  'kosmo-zentrale'
]);
const allowedGateTypes = new Set([
  'source_gate',
  'rights_gate',
  'human_review_gate',
  'model_quality_gate',
  'publish_gate',
  'cost_gate',
  'security_gate'
]);
const allowedStatuses = new Set([
  'ready',
  'needs_review',
  'blocked',
  'local_only',
  'approved_local',
  'approved_public',
  'unknown'
]);
const allowedToolStatuses = new Set(['planned', 'prototype', 'active', 'blocked', 'external']);
const riskyGateTypes = new Set(['publish_gate', 'cost_gate', 'security_gate']);

main();

function main() {
  if (!existsSync(workspacePath)) {
    fail([`KosmoOrbit workspace not found: ${workspacePath}`], []);
  }

  const failures = [];
  const warnings = [];
  const workspace = readJson(workspacePath, failures);
  if (!workspace) fail(failures, warnings);

  checkWorkspace(workspace, failures, warnings);

  const summary = buildSummary(workspace, failures, warnings);
  printSummary(summary);

  if (failures.length > 0) {
    process.exit(1);
  }
}

function checkWorkspace(workspace, failures, warnings) {
  if (workspace.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${workspace.schema_version}`);
  if (!workspace.workspace?.id) failures.push('Missing workspace.id');
  if (!workspace.workspace?.name) failures.push('Missing workspace.name');
  if (!workspace.current_user?.role_id) failures.push('Missing current_user.role_id');

  const roles = asArray(workspace.roles);
  const tools = asArray(workspace.tools);
  const projects = asArray(workspace.projects);
  const gates = asArray(workspace.gates);

  if (roles.length === 0) failures.push('At least one role is required.');
  if (tools.length === 0) failures.push('At least one tool is required.');

  const roleIds = new Set();
  for (const [index, role] of roles.entries()) {
    const prefix = `roles[${index}]`;
    if (!role?.id) failures.push(`${prefix} missing id`);
    if (role?.id && roleIds.has(role.id)) failures.push(`Duplicate role id: ${role.id}`);
    if (role?.id) roleIds.add(role.id);
    if (role?.id && !allowedRoles.has(role.id)) failures.push(`${prefix} invalid id: ${role.id}`);
    if (!role?.label) failures.push(`${prefix} missing label`);
    if (!Array.isArray(role?.permissions)) failures.push(`${role?.id || prefix} permissions must be an array.`);
    if (!role?.ui_mode) warnings.push(`${role?.id || prefix} has no ui_mode.`);
  }

  if (workspace.current_user?.role_id && !roleIds.has(workspace.current_user.role_id)) {
    failures.push(`current_user.role_id is not defined in roles: ${workspace.current_user.role_id}`);
  }

  const toolIds = new Set();
  for (const [index, tool] of tools.entries()) {
    const prefix = `tools[${index}]`;
    if (!tool?.id) failures.push(`${prefix} missing id`);
    if (tool?.id && toolIds.has(tool.id)) failures.push(`Duplicate tool id: ${tool.id}`);
    if (tool?.id) toolIds.add(tool.id);
    if (tool?.id && !allowedTools.has(tool.id)) failures.push(`${prefix} invalid id: ${tool.id}`);
    if (tool?.status && !allowedToolStatuses.has(tool.status)) failures.push(`${tool.id || prefix} invalid status: ${tool.status}`);
    for (const roleId of asArray(tool?.primary_roles)) {
      if (!roleIds.has(roleId)) failures.push(`${tool.id || prefix} references unknown primary role: ${roleId}`);
    }
    if (tool?.id === 'kosmo-design' && !asArray(tool.primary_roles).includes('design_architect')) {
      warnings.push('kosmo-design should include design_architect as a primary role.');
    }
    if (tool?.id === 'kosmo-zentrale' && tool.status !== 'external') {
      warnings.push('kosmo-zentrale is expected to stay external until the local runtime is integrated.');
    }
  }

  const projectIds = new Set();
  for (const [index, project] of projects.entries()) {
    const prefix = `projects[${index}]`;
    if (!project?.id) failures.push(`${prefix} missing id`);
    if (project?.id && projectIds.has(project.id)) failures.push(`Duplicate project id: ${project.id}`);
    if (project?.id) projectIds.add(project.id);
    if (project?.status && !allowedStatuses.has(project.status)) failures.push(`${project.id || prefix} invalid status: ${project.status}`);
    if (project?.package_path && !existsSync(resolve(root, project.package_path))) {
      warnings.push(`${project.id || prefix} package_path does not exist yet: ${project.package_path}`);
    }
    for (const roleId of asArray(project?.allowed_roles)) {
      if (!roleIds.has(roleId)) failures.push(`${project.id || prefix} references unknown allowed role: ${roleId}`);
    }
  }

  const gateIds = new Set();
  for (const [index, gate] of gates.entries()) {
    const prefix = `gates[${index}]`;
    if (!gate?.id) failures.push(`${prefix} missing id`);
    if (gate?.id && gateIds.has(gate.id)) failures.push(`Duplicate gate id: ${gate.id}`);
    if (gate?.id) gateIds.add(gate.id);
    if (gate?.type && !allowedGateTypes.has(gate.type)) failures.push(`${gate.id || prefix} invalid type: ${gate.type}`);
    if (gate?.status && !allowedStatuses.has(gate.status)) failures.push(`${gate.id || prefix} invalid status: ${gate.status}`);
    if (gate?.owner_role && !roleIds.has(gate.owner_role)) failures.push(`${gate.id || prefix} references unknown owner_role: ${gate.owner_role}`);
    if (gate?.tool_id && !toolIds.has(gate.tool_id)) failures.push(`${gate.id || prefix} references unknown tool_id: ${gate.tool_id}`);
    if (gate?.project_id && !projectIds.has(gate.project_id)) warnings.push(`${gate.id || prefix} references unknown project_id: ${gate.project_id}`);
    if (riskyGateTypes.has(gate?.type) && gate.status === 'approved_public') {
      failures.push(`${gate.id || prefix} risky gate cannot be approved_public in local demo mode.`);
    }
    if (gate?.type === 'publish_gate' && gate.status !== 'blocked') {
      warnings.push(`${gate.id || prefix} publish gate should stay blocked in MVP local demo mode.`);
    }
  }

  for (const requiredTool of allowedTools) {
    if (!toolIds.has(requiredTool)) warnings.push(`Recommended tool missing from workspace: ${requiredTool}`);
  }
  for (const requiredGate of allowedGateTypes) {
    if (!gates.some((gate) => gate.type === requiredGate)) warnings.push(`Recommended gate type missing from workspace: ${requiredGate}`);
  }
}

function buildSummary(workspace, failures, warnings) {
  const roles = asArray(workspace.roles);
  const tools = asArray(workspace.tools);
  const projects = asArray(workspace.projects);
  const gates = asArray(workspace.gates);
  return {
    status: failures.length ? 'failed' : 'passed',
    workspace: workspace.workspace?.name || null,
    current_user: workspace.current_user?.name || null,
    current_role: workspace.current_user?.role_id || null,
    counts: {
      roles: roles.length,
      tools: tools.length,
      projects: projects.length,
      gates: gates.length,
      failures: failures.length,
      warnings: warnings.length
    },
    gates_by_status: countBy(gates.map((gate) => gate.status || 'unknown')),
    tools_by_status: countBy(tools.map((tool) => tool.status || 'unknown')),
    failures,
    warnings
  };
}

function printSummary(summary) {
  console.log('KosmoOrbit workspace check');
  console.log(`Workspace: ${summary.workspace || 'unknown'}`);
  console.log(`File: ${relative(root, workspacePath)}`);
  console.log(`Status: ${summary.status}`);
  console.log(`Roles: ${summary.counts.roles}`);
  console.log(`Tools: ${summary.counts.tools}`);
  console.log(`Projects: ${summary.counts.projects}`);
  console.log(`Gates: ${summary.counts.gates}`);
  console.log(`Failures: ${summary.counts.failures}`);
  console.log(`Warnings: ${summary.counts.warnings}`);
  if (summary.warnings.length) {
    console.log('\nWarnings:');
    for (const warning of summary.warnings) console.log(`- ${warning}`);
  }
  if (summary.failures.length) {
    console.log('\nFailures:');
    for (const failure of summary.failures) console.log(`- ${failure}`);
  }
}

function readJson(path, failures) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    failures.push(`Could not parse JSON ${path}: ${error.message}`);
    return null;
  }
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

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--workspace') parsed.workspace = argv[++index];
  }
  return parsed;
}

function fail(failures, warnings) {
  printSummary({
    status: 'failed',
    workspace: null,
    counts: { roles: 0, tools: 0, projects: 0, gates: 0, failures: failures.length, warnings: warnings.length },
    failures,
    warnings
  });
  process.exit(1);
}
