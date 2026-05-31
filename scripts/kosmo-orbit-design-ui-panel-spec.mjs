#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const handoffPath = resolve(projectRoot, args.handoff || 'orbit/design-handoff-preview.generated.json');
const outputJsonPath = resolve(projectRoot, args.output || 'orbit/design-handoff-ui-panel.generated.json');
const outputMdPath = resolve(projectRoot, args.markdown || 'orbit/design-handoff-ui-panel.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(handoffPath)) throw new Error(`KosmoDesign handoff preview not found: ${handoffPath}`);

  const handoff = readJson(handoffPath);
  const spec = buildPanelSpec(handoff);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(spec), 'utf8');

  console.log('KosmoOrbit KosmoDesign UI panel spec generated');
  console.log(`Project: ${spec.project.name}`);
  console.log(`Panel state: ${spec.panel.state}`);
  console.log(`Primary action: ${spec.actions.primary.label}`);
  console.log(`Primary enabled: ${spec.actions.primary.enabled}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function buildPanelSpec(handoff) {
  const blocked = handoff.handoff?.mode === 'blocked';
  const designGeneration = handoff.handoff?.mode === 'design_generation';
  const reviewOnly = handoff.handoff?.mode === 'context_review_only';
  const primaryEnabled = !blocked;
  const primaryLabel = designGeneration ? 'Open KosmoDesign' : reviewOnly ? 'Open Review Mode' : 'Do Not Open';
  const state = blocked ? 'blocked' : designGeneration ? 'ready_for_design_generation' : 'review_only';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-design-ui-panel-spec',
    source_handoff: relative(root, handoffPath),
    status: 'ui_panel_spec_ready',
    project: {
      id: handoff.project?.id || null,
      name: handoff.project?.name || null,
      risk_level: handoff.project?.risk_level || null
    },
    current_user: {
      name: handoff.current_user?.name || null,
      role_label: handoff.current_user?.role_label || null,
      ui_mode: handoff.current_user?.ui_mode || null
    },
    panel: {
      id: 'kosmo-design-handoff-panel',
      title: 'KosmoDesign',
      subtitle: 'Design handoff',
      state,
      tone: stateTone(state),
      purpose: 'Decide how KosmoOrbit may open KosmoDesign for this project and role.',
      layout: {
        width: 'orbit-side-panel',
        sections: [
          'status_header',
          'role_gate',
          'blockers',
          'allowed_actions',
          'model_profile',
          'context_inputs',
          'guardrails',
          'next_actions'
        ]
      }
    },
    badges: [
      badge('open-mode', handoff.handoff?.recommended_open_mode || 'unknown', stateTone(state)),
      badge('role', handoff.current_user?.role_label || 'unknown', 'neutral'),
      badge('generation', handoff.handoff?.design_generation_allowed ? 'generation allowed' : 'generation blocked', handoff.handoff?.design_generation_allowed ? 'green' : 'red'),
      badge('risk', handoff.project?.risk_level || 'unknown', handoff.project?.risk_level === 'local_review_only' ? 'blue' : 'yellow')
    ],
    sections: {
      status_header: {
        title: 'Open Mode',
        value: handoff.handoff?.recommended_open_mode || 'unknown',
        description: openModeDescription(handoff.handoff?.recommended_open_mode)
      },
      role_gate: {
        title: 'Current Role',
        rows: [
          row('User', handoff.current_user?.name),
          row('Role', handoff.current_user?.role_label),
          row('UI mode', handoff.current_user?.ui_mode),
          row('Can use KosmoDesign', handoff.current_user?.can_use_design ? 'yes' : 'no')
        ]
      },
      blockers: {
        title: 'Blockers',
        empty_label: 'No blockers',
        items: asArray(handoff.blockers).map((blocker) => ({ tone: 'red', text: blocker }))
      },
      allowed_actions: {
        title: 'Allowed Actions',
        items: asArray(handoff.allowed_actions).map((action) => ({ tone: 'blue', text: action }))
      },
      model_profile: {
        title: 'Model Profile',
        summary: [
          row('Source confidence', handoff.model_profile?.source_confidence),
          row('Stories', handoff.model_profile?.story_count),
          row('Rooms', handoff.model_profile?.room_count),
          row('Areas', handoff.model_profile?.area_count),
          row('Collections', handoff.model_profile?.collection_count)
        ],
        rooms: asArray(handoff.model_profile?.rooms).map((room) => ({
          id: room.id,
          name: room.name,
          story: room.story_id,
          function: room.function,
          area_m2: room.area_m2
        }))
      },
      context_inputs: {
        title: 'Context Inputs',
        summary: [
          row('Candidates', handoff.context?.candidate_count),
          row('Context inputs', handoff.context?.context_input_count),
          row('Design seeds', handoff.context?.design_seed_input_count),
          row('Blocked inputs', handoff.context?.blocked_input_count),
          row('Unresolved inputs', handoff.context?.unresolved_input_count)
        ],
        blocked_inputs: asArray(handoff.context?.blocked_inputs).map((input) => ({
          id: input.candidate_id,
          label: input.label,
          reason: input.blocked_reason,
          selected_use: input.selected_use,
          downstream_permission: input.downstream_permission
        }))
      },
      guardrails: {
        title: 'Guardrails',
        items: asArray(handoff.context?.guardrails).map((guardrail) => ({ tone: 'yellow', text: guardrail }))
      },
      next_actions: {
        title: 'Next Actions',
        items: asArray(handoff.next_actions).map((action) => ({ tone: 'neutral', text: action }))
      }
    },
    actions: {
      primary: {
        id: designGeneration ? 'open-kosmo-design' : reviewOnly ? 'open-kosmo-design-review-mode' : 'blocked-open-kosmo-design',
        label: primaryLabel,
        enabled: primaryEnabled,
        mode: handoff.handoff?.recommended_open_mode || 'unknown',
        requires_confirmation: designGeneration,
        effect: primaryActionEffect({ blocked, designGeneration, reviewOnly })
      },
      secondary: [
        {
          id: 'view-project-inspector',
          label: 'View Project Inspector',
          enabled: true,
          effect: 'open_orbit_project_inspector'
        },
        {
          id: 'view-context-selection',
          label: 'Review Context Selection',
          enabled: asArray(handoff.context?.blocked_inputs).length > 0,
          effect: 'open_context_selection_for_human_review'
        },
        {
          id: 'copy-guardrails',
          label: 'Copy Guardrails',
          enabled: asArray(handoff.context?.guardrails).length > 0,
          effect: 'copy_guardrails_to_clipboard'
        }
      ],
      disabled_generation: {
        label: 'Generate Design',
        enabled: Boolean(handoff.handoff?.design_generation_allowed),
        reason: handoff.handoff?.design_generation_allowed ? null : 'Design generation is blocked until context and human-review gates are approved.'
      }
    },
    safety: {
      no_blender_launch_in_spec: true,
      no_geometry_generation_in_spec: true,
      no_public_publish_in_spec: true,
      no_uploads_in_spec: true
    }
  };
}

function renderMarkdown(spec) {
  const lines = [
    '# KosmoOrbit KosmoDesign UI Panel Spec',
    '',
    `Project: \`${spec.project.name}\``,
    `Generated: ${spec.generated_at}`,
    `Panel state: \`${spec.panel.state}\``,
    `Tone: \`${spec.panel.tone}\``,
    '',
    'This is a product/UI specification only. It does not open Blender, generate geometry, upload files or approve any gate.',
    '',
    '## Header',
    '',
    `- title: ${spec.panel.title}`,
    `- subtitle: ${spec.panel.subtitle}`,
    `- purpose: ${spec.panel.purpose}`,
    `- open mode: \`${spec.sections.status_header.value}\``,
    `- description: ${spec.sections.status_header.description}`,
    '',
    '## Badges',
    '',
    '| Badge | Label | Tone |',
    '| --- | --- | --- |'
  ];

  spec.badges.forEach((item) => lines.push(`| ${item.id} | ${escapePipe(item.label)} | \`${item.tone}\` |`));

  lines.push('', '## Primary Action', '');
  lines.push(`- label: ${spec.actions.primary.label}`);
  lines.push(`- enabled: ${spec.actions.primary.enabled ? 'yes' : 'no'}`);
  lines.push(`- mode: \`${spec.actions.primary.mode}\``);
  lines.push(`- requires confirmation: ${spec.actions.primary.requires_confirmation ? 'yes' : 'no'}`);
  lines.push(`- effect: \`${spec.actions.primary.effect}\``);

  lines.push('', '## Secondary Actions', '', '| Action | Enabled | Effect |', '| --- | --- | --- |');
  spec.actions.secondary.forEach((action) => {
    lines.push(`| ${escapePipe(action.label)} | ${action.enabled ? 'yes' : 'no'} | \`${action.effect}\` |`);
  });

  lines.push('', '## Disabled Generation Action', '');
  lines.push(`- label: ${spec.actions.disabled_generation.label}`);
  lines.push(`- enabled: ${spec.actions.disabled_generation.enabled ? 'yes' : 'no'}`);
  if (spec.actions.disabled_generation.reason) lines.push(`- reason: ${spec.actions.disabled_generation.reason}`);

  lines.push('', '## Blockers', '');
  if (spec.sections.blockers.items.length) spec.sections.blockers.items.forEach((item) => lines.push(`- ${item.text}`));
  else lines.push('- none');

  lines.push('', '## Allowed Actions', '');
  spec.sections.allowed_actions.items.forEach((item) => lines.push(`- ${item.text}`));

  lines.push('', '## Model Profile', '');
  spec.sections.model_profile.summary.forEach((item) => lines.push(`- ${item.label}: ${item.value}`));
  lines.push('', '| Room | Story | Function | Area m2 |', '| --- | --- | --- | ---: |');
  spec.sections.model_profile.rooms.forEach((room) => {
    lines.push(`| ${escapePipe(room.name)} | ${escapePipe(room.story)} | ${escapePipe(room.function)} | ${room.area_m2 ?? '-'} |`);
  });

  lines.push('', '## Context Inputs', '');
  spec.sections.context_inputs.summary.forEach((item) => lines.push(`- ${item.label}: ${item.value}`));
  if (spec.sections.context_inputs.blocked_inputs.length) {
    lines.push('', 'Blocked inputs:');
    spec.sections.context_inputs.blocked_inputs.forEach((input) => {
      lines.push(`- \`${input.id}\`: ${input.label} / ${input.reason}`);
    });
  }

  lines.push('', '## Guardrails', '');
  spec.sections.guardrails.items.forEach((item) => lines.push(`- ${item.text}`));

  lines.push('', '## Next Actions', '');
  spec.sections.next_actions.items.forEach((item) => lines.push(`- ${item.text}`));

  return `${lines.join('\n')}\n`;
}

function badge(id, label, tone) {
  return { id, label, tone };
}

function row(label, value) {
  return { label, value: value ?? null };
}

function stateTone(state) {
  if (state === 'blocked') return 'red';
  if (state === 'review_only') return 'yellow';
  if (state === 'ready_for_design_generation') return 'green';
  return 'neutral';
}

function openModeDescription(mode) {
  if (mode === 'context_review_only') return 'KosmoDesign may show context and model data, but must not generate or mutate design geometry.';
  if (mode === 'design_seed_generation') return 'KosmoDesign may open with approved design seeds after explicit confirmation.';
  if (mode === 'do_not_open') return 'KosmoDesign must stay closed for this role or state.';
  return 'Open mode is not known.';
}

function primaryActionEffect({ blocked, designGeneration, reviewOnly }) {
  if (blocked) return 'none';
  if (designGeneration) return 'open_kosmo_design_with_approved_design_seed_inputs';
  if (reviewOnly) return 'open_kosmo_design_context_review_only';
  return 'none';
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
