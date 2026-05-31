#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const workspacePath = resolve(root, args.workspace || 'examples/kosmo-orbit/workspace.demo.json');
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const panelSpecPath = resolve(projectRoot, args.panel || 'orbit/design-handoff-ui-panel.generated.json');
const outputJsonPath = resolve(projectRoot, args.output || 'orbit/role-ui-variants.generated.json');
const outputMdPath = resolve(projectRoot, args.markdown || 'orbit/role-ui-variants.generated.md');

const rolePresets = {
  owner_admin: {
    focus: 'office_control',
    detail_level: 'full',
    primary_label: 'Open Review Mode',
    extra_sections: ['admin_gates', 'publish_risk'],
    learning_support: false
  },
  it_ai_admin: {
    focus: 'infrastructure_control',
    detail_level: 'full',
    primary_label: 'Inspect System State',
    extra_sections: ['runtime_safety', 'smoke_checks'],
    learning_support: false
  },
  project_lead_architect: {
    focus: 'project_decision',
    detail_level: 'decision',
    primary_label: 'Open Project Review',
    extra_sections: ['human_review', 'next_actions'],
    learning_support: false
  },
  design_architect: {
    focus: 'design_context',
    detail_level: 'creative',
    primary_label: 'Open Design Context',
    extra_sections: ['model_profile', 'context_inputs'],
    learning_support: false
  },
  drafter_efz: {
    focus: 'production_quality',
    detail_level: 'technical',
    primary_label: 'View Model Quality',
    extra_sections: ['model_profile', 'guardrails'],
    learning_support: false
  },
  intern: {
    focus: 'guided_assist',
    detail_level: 'guided',
    primary_label: 'Open Guided Review',
    extra_sections: ['allowed_actions', 'guardrails'],
    learning_support: true
  },
  apprentice: {
    focus: 'learning',
    detail_level: 'learning',
    primary_label: 'Open Learning View',
    extra_sections: ['explanations', 'guardrails'],
    learning_support: true
  },
  trial_user: {
    focus: 'observer',
    detail_level: 'observer',
    primary_label: 'View Demo Only',
    extra_sections: ['explanations'],
    learning_support: true
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(workspacePath)) throw new Error(`KosmoOrbit workspace not found: ${workspacePath}`);
  if (!existsSync(panelSpecPath)) throw new Error(`KosmoOrbit panel spec not found: ${panelSpecPath}`);

  const workspace = readJson(workspacePath);
  const panelSpec = readJson(panelSpecPath);
  const report = buildReport({ workspace, panelSpec });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit role UI variants generated');
  console.log(`Project: ${report.project.name}`);
  console.log(`Variants: ${report.summary.variant_count}`);
  console.log(`Design-capable roles: ${report.summary.design_capable_count}`);
  console.log(`Learning roles: ${report.summary.learning_variant_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function buildReport({ workspace, panelSpec }) {
  const roles = Array.isArray(workspace.roles) ? workspace.roles : [];
  const variants = roles.map((role) => variantForRole(role, panelSpec));
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-role-ui-variants',
    workspace_path: relative(root, workspacePath),
    panel_spec: relative(root, panelSpecPath),
    status: 'role_ui_variants_ready',
    policy: {
      review_only: true,
      no_auth_runtime: true,
      no_user_data_write: true,
      no_blender_launch: true,
      no_geometry_generation: true
    },
    project: panelSpec.project || null,
    summary: {
      variant_count: variants.length,
      design_capable_count: variants.filter((variant) => variant.permissions.can_open_design_review).length,
      generation_capable_count: variants.filter((variant) => variant.permissions.can_request_design_generation).length,
      admin_variant_count: variants.filter((variant) => variant.role.level === 'admin').length,
      learning_variant_count: variants.filter((variant) => variant.learning_support.enabled).length
    },
    variants,
    next_actions: [
      'Use these variants as the role matrix for the first KosmoOrbit app screen.',
      'Keep design generation disabled for every role until context and human-review gates are approved.',
      'Turn learning variants into simplified UI copy before apprentices or trial users see the tool.'
    ]
  };
}

function variantForRole(role, panelSpec) {
  const preset = rolePresets[role.id] || rolePresets.trial_user;
  const permissions = Array.isArray(role.permissions) ? role.permissions : [];
  const canOpenDesignReview = permissions.includes('admin_all') || permissions.includes('use_design');
  const canApproveLocal = permissions.includes('admin_all') || permissions.includes('approve_local');
  const canApprovePublic = permissions.includes('admin_all') || permissions.includes('approve_public');
  const canRequestDesignGeneration = false;
  const hiddenSections = hiddenSectionsFor({ role, canOpenDesignReview });

  return {
    role: {
      id: role.id,
      label: role.label,
      level: role.level,
      ui_mode: role.ui_mode,
      focus: preset.focus,
      detail_level: preset.detail_level
    },
    permissions: {
      can_open_design_review: canOpenDesignReview,
      can_request_design_generation: canRequestDesignGeneration,
      can_approve_local: canApproveLocal,
      can_approve_public: canApprovePublic,
      read_only: permissions.includes('read_only') || role.level === 'observer'
    },
    panel_state: {
      base_state: panelSpec.panel?.state || 'unknown',
      tone: canOpenDesignReview ? panelSpec.panel?.tone || 'yellow' : 'red',
      primary_label: canOpenDesignReview ? preset.primary_label : 'View Summary Only',
      primary_enabled: canOpenDesignReview,
      generation_enabled: false,
      generation_reason: 'Design generation is blocked for all roles until context and human-review gates are approved.'
    },
    visible_sections: visibleSectionsFor({ panelSpec, hiddenSections, preset }),
    hidden_sections: hiddenSections,
    badges: roleBadges({ role, panelSpec, canOpenDesignReview }),
    warnings: warningsFor({ role, canOpenDesignReview, canApprovePublic }),
    learning_support: {
      enabled: preset.learning_support,
      mode: preset.learning_support ? role.ui_mode : null,
      guidance: preset.learning_support
        ? 'Show simplified explanations, safe examples and no destructive actions.'
        : null
    }
  };
}

function visibleSectionsFor({ panelSpec, hiddenSections, preset }) {
  const base = panelSpec.panel?.layout?.sections || [];
  const visible = base.filter((section) => !hiddenSections.includes(section));
  for (const section of preset.extra_sections) {
    if (!visible.includes(section)) visible.push(section);
  }
  return visible;
}

function hiddenSectionsFor({ role, canOpenDesignReview }) {
  const hidden = [];
  if (!canOpenDesignReview) hidden.push('allowed_actions');
  if (['apprentice', 'trial_user'].includes(role.id)) {
    hidden.push('admin_gates', 'publish_risk');
  }
  if (role.id === 'trial_user') {
    hidden.push('context_inputs');
  }
  return [...new Set(hidden)];
}

function roleBadges({ role, panelSpec, canOpenDesignReview }) {
  return [
    { id: 'role', label: role.label, tone: 'neutral' },
    { id: 'ui-mode', label: role.ui_mode, tone: 'blue' },
    { id: 'design-access', label: canOpenDesignReview ? 'design review allowed' : 'design review blocked', tone: canOpenDesignReview ? 'yellow' : 'red' },
    { id: 'generation', label: 'generation blocked', tone: 'red' },
    { id: 'base-panel', label: panelSpec.panel?.state || 'unknown', tone: panelSpec.panel?.tone || 'yellow' }
  ];
}

function warningsFor({ role, canOpenDesignReview, canApprovePublic }) {
  const warnings = [];
  if (!canOpenDesignReview) warnings.push('This role cannot open KosmoDesign review mode.');
  if (!canApprovePublic) warnings.push('This role cannot clear public release or publish gates.');
  if (['apprentice', 'trial_user'].includes(role.id)) warnings.push('Keep this role in learning/read-only mode.');
  warnings.push('Design generation stays disabled until context and human-review gates are approved.');
  return warnings;
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Role UI Variants',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Project: \`${report.project?.name || 'unknown'}\``,
    '',
    'Review-only role matrix. This does not create users, write auth data, open Blender or generate geometry.',
    '',
    '## Summary',
    '',
    `- variants: ${report.summary.variant_count}`,
    `- design-capable roles: ${report.summary.design_capable_count}`,
    `- generation-capable roles: ${report.summary.generation_capable_count}`,
    `- admin variants: ${report.summary.admin_variant_count}`,
    `- learning variants: ${report.summary.learning_variant_count}`,
    '',
    '## Variants',
    '',
    '| Role | UI mode | Focus | Primary | Design review | Public approve | Learning |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  ];

  for (const variant of report.variants) {
    lines.push(`| ${escapePipe(variant.role.label)} | \`${variant.role.ui_mode}\` | \`${variant.role.focus}\` | ${escapePipe(variant.panel_state.primary_label)} | ${variant.permissions.can_open_design_review ? 'yes' : 'no'} | ${variant.permissions.can_approve_public ? 'yes' : 'no'} | ${variant.learning_support.enabled ? 'yes' : 'no'} |`);
  }

  for (const variant of report.variants) {
    lines.push('', `## ${variant.role.label}`, '');
    lines.push(`- focus: \`${variant.role.focus}\``);
    lines.push(`- detail level: \`${variant.role.detail_level}\``);
    lines.push(`- primary action: ${variant.panel_state.primary_label}`);
    lines.push(`- primary enabled: ${variant.panel_state.primary_enabled ? 'yes' : 'no'}`);
    lines.push(`- generation enabled: ${variant.panel_state.generation_enabled ? 'yes' : 'no'}`);
    lines.push(`- visible sections: ${variant.visible_sections.map((section) => `\`${section}\``).join(', ')}`);
    if (variant.hidden_sections.length) lines.push(`- hidden sections: ${variant.hidden_sections.map((section) => `\`${section}\``).join(', ')}`);
    lines.push('', 'Warnings:');
    variant.warnings.forEach((warning) => lines.push(`- ${warning}`));
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
