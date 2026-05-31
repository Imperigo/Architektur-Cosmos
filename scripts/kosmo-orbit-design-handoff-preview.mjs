#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const workspaceReportPath = resolve(root, args.workspaceReport || 'examples/kosmo-orbit/review/orbit-status-report.generated.json');
const projectInspectorPath = resolve(root, args.projectInspector || 'examples/kosmo-projects/kosmo-demo-001/orbit/project-inspector.generated.json');
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const contextHandoffPath = resolve(projectRoot, args.contextHandoff || 'design/context-handoff.generated.json');
const modelProfilePath = resolve(projectRoot, args.modelProfile || 'design/model-profile.json');
const outputJsonPath = resolve(projectRoot, args.output || 'orbit/design-handoff-preview.generated.json');
const outputMdPath = resolve(projectRoot, args.markdown || 'orbit/design-handoff-preview.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  for (const pathname of [workspaceReportPath, projectInspectorPath, contextHandoffPath, modelProfilePath]) {
    if (!existsSync(pathname)) throw new Error(`Required input missing: ${pathname}`);
  }

  const workspaceReport = readJson(workspaceReportPath);
  const projectInspector = readJson(projectInspectorPath);
  const contextHandoff = readJson(contextHandoffPath);
  const modelProfile = readJson(modelProfilePath);
  const preview = buildPreview({ workspaceReport, projectInspector, contextHandoff, modelProfile });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(preview, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(preview), 'utf8');

  console.log('KosmoOrbit KosmoDesign handoff preview generated');
  console.log(`Project: ${preview.project.name}`);
  console.log(`Mode: ${preview.handoff.mode}`);
  console.log(`Design generation allowed: ${preview.handoff.design_generation_allowed}`);
  console.log(`Blocked inputs: ${preview.context.blocked_input_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function buildPreview({ workspaceReport, projectInspector, contextHandoff, modelProfile }) {
  const currentUser = workspaceReport.current_user || {};
  const designTool = (workspaceReport.tools || []).find((tool) => tool.id === 'kosmo-design');
  const designModule = (projectInspector.modules || []).find((module) => module.id === 'design');
  const designArtifacts = (projectInspector.artifacts || []).filter((artifact) => artifact.module === 'design');
  const canUseDesign = hasPermission(currentUser.permissions, 'use_design') || hasPermission(currentUser.permissions, 'admin_all');
  const designGenerationAllowed = Boolean(contextHandoff.summary?.design_generation_allowed);
  const hasBlockedWorkspaceGate = (designTool?.gates || []).some((gate) => ['blocked', 'needs_review', 'unknown'].includes(gate.status));
  const hasReviewArtifacts = designArtifacts.some((artifact) => artifact.needs_review);
  const handoffMode = handoffModeFor({ canUseDesign, designGenerationAllowed, hasBlockedWorkspaceGate, hasReviewArtifacts });

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-design-handoff-preview',
    status: handoffMode === 'blocked' ? 'handoff_blocked' : handoffMode === 'design_generation' ? 'handoff_design_generation_ready' : 'handoff_review_only',
    policy: {
      review_only_by_default: true,
      does_not_open_blender: true,
      does_not_generate_geometry: true,
      does_not_approve_design_generation: true,
      no_uploads: true,
      no_public_publish: true
    },
    workspace: {
      name: workspaceReport.workspace?.name || null,
      mode: workspaceReport.workspace?.mode || null
    },
    current_user: {
      name: currentUser.name || null,
      role_id: currentUser.role_id || null,
      role_label: currentUser.role_label || null,
      ui_mode: currentUser.ui_mode || null,
      can_use_design: canUseDesign,
      permissions: currentUser.permissions || []
    },
    project: {
      id: projectInspector.project?.id || contextHandoff.project_id || null,
      name: projectInspector.project?.name || contextHandoff.project_name || null,
      risk_level: projectInspector.project?.risk_level || null,
      package_status: projectInspector.project?.package_status || null
    },
    handoff: {
      target_tool: 'kosmo-design',
      target_runtime: designTool?.handoff_target || 'KosmoDraw / Blender kosmo_design',
      mode: handoffMode,
      design_generation_allowed: handoffMode === 'design_generation',
      orbit_readiness: designTool?.readiness || null,
      module_readiness: designModule?.readiness || null,
      recommended_open_mode: handoffMode === 'design_generation' ? 'design_seed_generation' : handoffMode === 'blocked' ? 'do_not_open' : 'context_review_only'
    },
    context: {
      status: contextHandoff.status || null,
      handoff_mode: contextHandoff.summary?.handoff_mode || null,
      candidate_count: contextHandoff.summary?.candidate_count || 0,
      context_input_count: contextHandoff.summary?.context_input_count || 0,
      design_seed_input_count: contextHandoff.summary?.design_seed_input_count || 0,
      blocked_input_count: contextHandoff.summary?.blocked_input_count || 0,
      unresolved_input_count: contextHandoff.summary?.unresolved_input_count || 0,
      recommended_next_step: contextHandoff.summary?.recommended_next_step || null,
      blocked_inputs: contextHandoff.blocked_inputs || [],
      guardrails: contextHandoff.guardrails || []
    },
    model_profile: {
      units: modelProfile.units || null,
      source_confidence: modelProfile.source_confidence || null,
      story_count: asArray(modelProfile.stories).length,
      room_count: asArray(modelProfile.rooms).length,
      area_count: asArray(modelProfile.areas).length,
      collection_count: asArray(modelProfile.collections).length,
      rooms: asArray(modelProfile.rooms).map((room) => ({
        id: room.id,
        name: room.name,
        story_id: room.story_id,
        function: room.function,
        area_m2: room.area_m2
      })),
      collections: asArray(modelProfile.collections)
    },
    blockers: blockersFor({ canUseDesign, designGenerationAllowed, hasBlockedWorkspaceGate, hasReviewArtifacts, contextHandoff }),
    allowed_actions: allowedActionsFor({ handoffMode }),
    next_actions: nextActionsFor({ handoffMode, contextHandoff, hasReviewArtifacts })
  };
}

function handoffModeFor({ canUseDesign, designGenerationAllowed, hasBlockedWorkspaceGate, hasReviewArtifacts }) {
  if (!canUseDesign) return 'blocked';
  if (designGenerationAllowed && !hasBlockedWorkspaceGate && !hasReviewArtifacts) return 'design_generation';
  return 'context_review_only';
}

function blockersFor({ canUseDesign, designGenerationAllowed, hasBlockedWorkspaceGate, hasReviewArtifacts, contextHandoff }) {
  const blockers = [];
  if (!canUseDesign) blockers.push('Current role has no KosmoDesign permission.');
  if (!designGenerationAllowed) blockers.push('Context handoff does not approve design generation.');
  if (hasBlockedWorkspaceGate) blockers.push('Workspace gates for KosmoDesign are blocked, needs_review or unknown.');
  if (hasReviewArtifacts) blockers.push('Design artifacts still require human review.');
  if ((contextHandoff.summary?.blocked_input_count || 0) > 0) blockers.push('Context handoff contains blocked inputs.');
  return blockers;
}

function allowedActionsFor({ handoffMode }) {
  if (handoffMode === 'blocked') return ['Do not open KosmoDesign from this Orbit state.'];
  if (handoffMode === 'design_generation') {
    return [
      'Open KosmoDesign with approved design seeds.',
      'Pass model-profile and accepted design-seed inputs.',
      'Record generated outputs back into the project package.'
    ];
  }
  return [
    'Open KosmoDesign only in context review mode.',
    'Show model-profile rooms, stories, areas and collections as read-only project context.',
    'Show blocked context inputs and guardrails before any geometry action.',
    'Keep generation, public release and external upload disabled.'
  ];
}

function nextActionsFor({ handoffMode, contextHandoff, hasReviewArtifacts }) {
  const actions = [];
  if (handoffMode === 'context_review_only') {
    actions.push('Build the first Orbit UI panel for this handoff: role, open mode, blockers, model profile and guardrails.');
  }
  if ((contextHandoff.summary?.blocked_input_count || 0) > 0) {
    actions.push('Resolve or explicitly accept/reject blocked context inputs in design/context-selection.json.');
  }
  if (hasReviewArtifacts) {
    actions.push('Close the relevant design human-review records before allowing generation.');
  }
  if (!actions.length) actions.push('KosmoDesign handoff is ready for the next Orbit prototype.');
  return actions;
}

function renderMarkdown(preview) {
  const lines = [
    '# KosmoOrbit KosmoDesign Handoff Preview',
    '',
    `Project: \`${preview.project.name}\``,
    `Generated: ${preview.generated_at}`,
    `Status: \`${preview.status}\``,
    `Mode: \`${preview.handoff.mode}\``,
    '',
    'Review-only. This preview does not open Blender, generate geometry, approve design generation, upload files or publish data.',
    '',
    '## Current Role',
    '',
    `- user: ${preview.current_user.name}`,
    `- role: ${preview.current_user.role_label} (\`${preview.current_user.role_id}\`)`,
    `- UI mode: \`${preview.current_user.ui_mode}\``,
    `- can use KosmoDesign: ${preview.current_user.can_use_design ? 'yes' : 'no'}`,
    '',
    '## Handoff',
    '',
    `- target: \`${preview.handoff.target_tool}\``,
    `- runtime: ${preview.handoff.target_runtime}`,
    `- recommended open mode: \`${preview.handoff.recommended_open_mode}\``,
    `- design generation allowed: ${preview.handoff.design_generation_allowed ? 'yes' : 'no'}`,
    `- Orbit readiness: \`${preview.handoff.orbit_readiness}\``,
    `- module readiness: \`${preview.handoff.module_readiness}\``,
    '',
    '## Blockers',
    ''
  ];

  if (preview.blockers.length) preview.blockers.forEach((blocker) => lines.push(`- ${blocker}`));
  else lines.push('- none');

  lines.push('', '## Allowed Actions', '');
  preview.allowed_actions.forEach((action) => lines.push(`- ${action}`));

  lines.push('', '## Model Profile', '');
  lines.push(`- source confidence: \`${preview.model_profile.source_confidence}\``);
  lines.push(`- stories: ${preview.model_profile.story_count}`);
  lines.push(`- rooms: ${preview.model_profile.room_count}`);
  lines.push(`- areas: ${preview.model_profile.area_count}`);
  lines.push(`- collections: ${preview.model_profile.collection_count}`);

  lines.push('', '| Room | Story | Function | Area m2 |', '| --- | --- | --- | ---: |');
  for (const room of preview.model_profile.rooms) {
    lines.push(`| ${escapePipe(room.name)} | ${escapePipe(room.story_id)} | ${escapePipe(room.function)} | ${room.area_m2 ?? '-'} |`);
  }

  lines.push('', '## Context Handoff', '');
  lines.push(`- context status: \`${preview.context.status}\``);
  lines.push(`- handoff mode: \`${preview.context.handoff_mode}\``);
  lines.push(`- candidates: ${preview.context.candidate_count}`);
  lines.push(`- context inputs: ${preview.context.context_input_count}`);
  lines.push(`- design seed inputs: ${preview.context.design_seed_input_count}`);
  lines.push(`- blocked inputs: ${preview.context.blocked_input_count}`);
  lines.push(`- unresolved inputs: ${preview.context.unresolved_input_count}`);
  lines.push(`- recommended next step: \`${preview.context.recommended_next_step}\``);

  if (preview.context.blocked_inputs.length) {
    lines.push('', 'Blocked inputs:');
    for (const input of preview.context.blocked_inputs) {
      lines.push(`- \`${input.candidate_id}\`: ${input.label} / ${input.blocked_reason}`);
    }
  }

  lines.push('', 'Guardrails:');
  preview.context.guardrails.forEach((guardrail) => lines.push(`- ${guardrail}`));

  lines.push('', '## Next Actions', '');
  preview.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function hasPermission(permissions, permission) {
  return asArray(permissions).includes(permission);
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
