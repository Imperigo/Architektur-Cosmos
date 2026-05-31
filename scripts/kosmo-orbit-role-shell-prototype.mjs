#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const variantsPath = resolve(projectRoot, args.variants || 'orbit/role-ui-variants.generated.json');
const smokePath = resolve(projectRoot, args.smoke || 'orbit/role-ui-smoke.generated.json');
const roleStatePath = resolve(root, args.state || 'examples/kosmo-orbit/role-state.demo.json');
const outputHtmlPath = resolve(projectRoot, args.output || 'orbit/role-shell-prototype.generated.html');
const outputJsonPath = resolve(projectRoot, args.manifest || 'orbit/role-shell-prototype.generated.json');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(variantsPath)) throw new Error(`KosmoOrbit role variants not found: ${variantsPath}`);
  if (!existsSync(smokePath)) throw new Error(`KosmoOrbit role smoke report not found: ${smokePath}`);
  if (!existsSync(roleStatePath)) throw new Error(`KosmoOrbit role state not found: ${roleStatePath}`);

  const variantsReport = readJson(variantsPath);
  const smokeReport = readJson(smokePath);
  const roleState = readJson(roleStatePath);
  const manifest = buildManifest({ variantsReport, smokeReport, roleState });
  const html = renderHtml({ variantsReport, smokeReport, roleState, manifest });

  await Promise.all([
    mkdir(dirname(outputHtmlPath), { recursive: true }),
    mkdir(dirname(outputJsonPath), { recursive: true })
  ]);
  await writeFile(outputHtmlPath, html, 'utf8');
  await writeFile(outputJsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log('KosmoOrbit role shell prototype generated');
  console.log(`Project: ${manifest.project?.name || 'unknown'}`);
  console.log(`Roles: ${manifest.summary.variant_count}`);
  console.log(`HTML: ${relative(root, outputHtmlPath)}`);
  console.log(`Manifest: ${relative(root, outputJsonPath)}`);
}

function buildManifest({ variantsReport, smokeReport, roleState }) {
  const variants = asArray(variantsReport.variants);
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-role-shell-prototype',
    source_variants: relative(root, variantsPath),
    source_smoke: relative(root, smokePath),
    source_role_state: relative(root, roleStatePath),
    html_output: relative(root, outputHtmlPath),
    status: smokeReport.status === 'role_ui_smoke_passed'
      ? 'role_shell_prototype_ready'
      : 'role_shell_prototype_blocked',
    project: variantsReport.project || null,
    summary: {
      variant_count: variants.length,
      design_capable_count: variants.filter((variant) => variant.permissions?.can_open_design_review).length,
      learning_variant_count: variants.filter((variant) => variant.learning_support?.enabled).length,
      generation_capable_count: variants.filter((variant) => variant.permissions?.can_request_design_generation).length,
      smoke_status: smokeReport.status || null,
      smoke_passed_checks: smokeReport.summary?.passed_checks ?? null,
      smoke_check_count: smokeReport.summary?.check_count ?? null,
      active_role_id: roleState.session?.active_role_id || null,
      selected_role_id: roleState.role_preview?.selected_role_id || null,
      active_project_id: roleState.active_project?.project_id || null,
      visible_module_count: asArray(roleState.visible_modules).length,
      blocked_action_count: asArray(roleState.blocked_actions).length
    },
    role_state: {
      state_id: roleState.state?.id || null,
      mode: roleState.state?.mode || null,
      active_role_id: roleState.session?.active_role_id || null,
      selected_role_id: roleState.role_preview?.selected_role_id || null,
      active_project_id: roleState.active_project?.project_id || null,
      review_only: roleState.interaction_policy?.review_only === true
    },
    safety: {
      static_html_only: true,
      no_auth_runtime: true,
      no_user_data_write: true,
      no_network_calls: true,
      no_blender_launch: true,
      no_geometry_generation: true,
      no_uploads: true,
      no_public_publish: true
    },
    next_actions: [
      'Use this static role shell as the visual reference for the first KosmoOrbit app screen.',
      'Add a smoke check for the role shell before turning it into a real Next route.',
      'Keep role permissions data-driven and review-only until local auth exists.'
    ]
  };
}

function renderHtml({ variantsReport, smokeReport, roleState, manifest }) {
  const variants = asArray(variantsReport.variants);
  const visibleModules = asArray(roleState.visible_modules);
  const blockedActions = asArray(roleState.blocked_actions);
  const selectedRoleId = roleState.role_preview?.selected_role_id || roleState.session?.active_role_id;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KosmoOrbit Role Shell Prototype</title>
  <style>
    :root {
      color-scheme: dark;
      --field: #050505;
      --panel: #0b0e11;
      --panel-2: #11161a;
      --line: #f7f7f4;
      --muted: #b8b8b8;
      --construction: #34383d;
      --blue: #64c7ff;
      --yellow: #ffd166;
      --red: #ff5c77;
      --green: #78d88b;
      --ink: #f7f7f4;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
        linear-gradient(0deg, rgba(255,255,255,0.035) 1px, transparent 1px),
        var(--field);
      background-size: 44px 44px;
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }

    main {
      width: min(1360px, 100%);
      margin: 0 auto;
      padding: 28px;
      display: grid;
      gap: 18px;
    }

    .shell {
      border: 1px solid var(--construction);
      background: rgba(5, 5, 5, 0.9);
      display: grid;
      grid-template-columns: minmax(260px, 0.72fr) minmax(0, 1.55fr);
      min-height: calc(100vh - 56px);
    }

    .rail {
      border-right: 1px solid var(--construction);
      padding: 22px;
      display: grid;
      gap: 18px;
      align-content: start;
      min-width: 0;
    }

    .workspace {
      padding: 22px;
      display: grid;
      gap: 18px;
      align-content: start;
      min-width: 0;
    }

    .eyebrow {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
    }

    h1, h2, h3, p { margin: 0; }

    h1 {
      font-size: 30px;
      font-weight: 600;
      line-height: 1.05;
    }

    h2 {
      font-size: 16px;
      font-weight: 600;
      line-height: 1.25;
    }

    h3 {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.25;
    }

    .text {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.45;
    }

    .summary {
      border: 1px solid var(--construction);
      padding: 14px;
      display: grid;
      gap: 10px;
    }

    .state-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .summary strong {
      color: var(--green);
      font-size: 13px;
      text-transform: uppercase;
    }

    .role-list {
      display: grid;
      gap: 8px;
    }

    .role-button {
      border: 1px solid var(--construction);
      background: var(--panel);
      color: var(--line);
      min-height: 46px;
      padding: 10px;
      display: grid;
      gap: 4px;
    }

    .role-button[data-active="true"] {
      border-color: var(--yellow);
      background: var(--panel-2);
    }

    .role-button span {
      color: var(--muted);
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .state-panels {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 14px;
    }

    .role-card {
      border: 1px solid var(--construction);
      background: rgba(11, 14, 17, 0.92);
      padding: 14px;
      display: grid;
      gap: 12px;
      min-width: 0;
    }

    .role-card[data-design="true"] { border-color: rgba(255, 209, 102, 0.72); }
    .role-card[data-readonly="true"] { border-color: rgba(100, 199, 255, 0.72); }

    .meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .metric {
      border: 1px solid rgba(255,255,255,0.08);
      padding: 9px;
      min-height: 58px;
      display: grid;
      gap: 4px;
    }

    .metric span {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
    }

    .metric strong {
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }

    .badge {
      border: 1px solid var(--construction);
      color: var(--line);
      padding: 5px 7px;
      font-size: 12px;
      min-height: 28px;
      display: inline-flex;
      align-items: center;
      max-width: 100%;
    }

    .badge[data-tone="red"] { border-color: var(--red); color: var(--red); }
    .badge[data-tone="yellow"] { border-color: var(--yellow); color: var(--yellow); }
    .badge[data-tone="blue"] { border-color: var(--blue); color: var(--blue); }
    .badge[data-tone="green"] { border-color: var(--green); color: var(--green); }

    .actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .action {
      border: 1px solid var(--line);
      color: #050505;
      background: var(--line);
      min-height: 38px;
      padding: 9px 10px;
      font-size: 13px;
      display: flex;
      align-items: center;
      overflow-wrap: anywhere;
    }

    .action[data-enabled="false"] {
      border-color: var(--red);
      color: var(--red);
      background: transparent;
    }

    ul {
      margin: 0;
      padding-left: 18px;
      display: grid;
      gap: 7px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }

    @media (max-width: 920px) {
      main { padding: 14px; }
      .shell { grid-template-columns: 1fr; }
      .rail { border-right: 0; border-bottom: 1px solid var(--construction); }
      .cards, .state-panels, .state-grid { grid-template-columns: 1fr; }
      h1 { font-size: 24px; }
    }

    @media (max-width: 560px) {
      .meta, .actions { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <div class="shell">
      <aside class="rail">
        <div>
          <div class="eyebrow">KosmoOrbit Hauptsoftware</div>
          <h1>Role-Aware Orbit Shell</h1>
          <p class="text">Static local prototype for role-based KosmoOrbit control surfaces.</p>
        </div>

        <div class="summary">
          <strong>${escapeHtml(manifest.status)}</strong>
          <p class="text">${escapeHtml(manifest.project?.name || 'Unknown project')}</p>
          <p class="text mono">${escapeHtml(smokeReport.status)} · ${escapeHtml(manifest.summary.smoke_passed_checks)}/${escapeHtml(manifest.summary.smoke_check_count)} checks</p>
        </div>

        <div class="summary">
          <h2>Role State</h2>
          <p class="text mono">active: ${escapeHtml(roleState.session?.active_role_id)}</p>
          <p class="text mono">selected: ${escapeHtml(roleState.role_preview?.selected_role_id)}</p>
          <p class="text mono">project: ${escapeHtml(roleState.active_project?.project_id)}</p>
        </div>

        <div class="role-list">
          ${variants.map((variant) => renderRoleButton(variant, variant.role?.id === selectedRoleId)).join('\n          ')}
        </div>
      </aside>

      <section class="workspace">
        <div>
          <div class="eyebrow">Workspace Preview</div>
          <h2>One software shell, different depth per person</h2>
          <p class="text">Every role sees the same project state through a safer, role-shaped surface. Generation remains blocked for everyone.</p>
        </div>

        <div class="state-grid">
          <div class="metric"><span>Active Project</span><strong>${escapeHtml(roleState.active_project?.project_id)}</strong></div>
          <div class="metric"><span>Visible Modules</span><strong>${visibleModules.length}</strong></div>
          <div class="metric"><span>Blocked Actions</span><strong>${blockedActions.length}</strong></div>
        </div>

        <div class="state-panels">
          <div class="summary">
            <h2>Visible Modules</h2>
            <ul>${visibleModules.map((module) => `<li><strong>${escapeHtml(module.tool_id)}</strong> · ${escapeHtml(module.visibility)} · ${escapeHtml(module.reason)}</li>`).join('')}</ul>
          </div>
          <div class="summary">
            <h2>Blocked Actions</h2>
            <ul>${blockedActions.map((action) => `<li><strong>${escapeHtml(action.label)}</strong> · ${escapeHtml(action.gate_id)} · ${escapeHtml(action.reason)}</li>`).join('')}</ul>
          </div>
        </div>

        <div class="cards">
          ${variants.map(renderRoleCard).join('\n          ')}
        </div>

        <div class="summary">
          <h2>Prototype Manifest</h2>
          <p class="text mono">${escapeHtml(manifest.html_output)}</p>
          <p class="text">Static HTML only. No auth runtime, no user data writes, no network calls, no Blender launch, no geometry generation, no uploads.</p>
        </div>
      </section>
    </div>
  </main>
</body>
</html>
`;
}

function renderRoleButton(variant, active) {
  return `<div class="role-button" data-active="${active ? 'true' : 'false'}">
            <strong>${escapeHtml(variant.role?.label)}</strong>
            <span>${escapeHtml(variant.role?.ui_mode)} · ${escapeHtml(variant.role?.focus)}</span>
          </div>`;
}

function renderRoleCard(variant) {
  return `<article class="role-card" data-design="${variant.permissions?.can_open_design_review ? 'true' : 'false'}" data-readonly="${variant.permissions?.read_only ? 'true' : 'false'}">
            <div>
              <div class="eyebrow">${escapeHtml(variant.role?.level)}</div>
              <h3>${escapeHtml(variant.role?.label)}</h3>
              <p class="text">${escapeHtml(variant.role?.focus)} · ${escapeHtml(variant.role?.detail_level)}</p>
            </div>

            <div class="badges">
              ${asArray(variant.badges).map((badge) => `<span class="badge" data-tone="${escapeAttribute(badge.tone)}">${escapeHtml(badge.label)}</span>`).join('\n              ')}
            </div>

            <div class="meta">
              <div class="metric"><span>Design Review</span><strong>${variant.permissions?.can_open_design_review ? 'allowed' : 'blocked'}</strong></div>
              <div class="metric"><span>Generation</span><strong>${variant.permissions?.can_request_design_generation ? 'allowed' : 'blocked'}</strong></div>
              <div class="metric"><span>Public Gate</span><strong>${variant.permissions?.can_approve_public ? 'can approve' : 'blocked'}</strong></div>
              <div class="metric"><span>Learning</span><strong>${variant.learning_support?.enabled ? 'guided' : 'standard'}</strong></div>
            </div>

            <div class="actions">
              <div class="action" data-enabled="${variant.panel_state?.primary_enabled ? 'true' : 'false'}">${escapeHtml(variant.panel_state?.primary_label)}</div>
              <div class="action" data-enabled="false">Generate Design</div>
            </div>

            <div>
              <h3>Visible Sections</h3>
              <ul>${asArray(variant.visible_sections).slice(0, 5).map((section) => `<li>${escapeHtml(section)}</li>`).join('')}</ul>
            </div>

            <div>
              <h3>Warnings</h3>
              <ul>${asArray(variant.warnings).slice(0, 3).map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>
            </div>
          </article>`;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
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
