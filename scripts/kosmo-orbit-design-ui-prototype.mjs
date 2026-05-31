#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const panelSpecPath = resolve(projectRoot, args.panel || 'orbit/design-handoff-ui-panel.generated.json');
const outputHtmlPath = resolve(projectRoot, args.output || 'orbit/design-handoff-ui-prototype.generated.html');
const outputJsonPath = resolve(projectRoot, args.manifest || 'orbit/design-handoff-ui-prototype.generated.json');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(panelSpecPath)) throw new Error(`KosmoOrbit UI panel spec not found: ${panelSpecPath}`);

  const spec = readJson(panelSpecPath);
  const manifest = buildManifest(spec);
  const html = renderHtml(spec, manifest);

  await Promise.all([
    mkdir(dirname(outputHtmlPath), { recursive: true }),
    mkdir(dirname(outputJsonPath), { recursive: true })
  ]);
  await writeFile(outputHtmlPath, html, 'utf8');
  await writeFile(outputJsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log('KosmoOrbit KosmoDesign UI prototype generated');
  console.log(`Project: ${spec.project?.name || 'unknown'}`);
  console.log(`Panel state: ${spec.panel?.state || 'unknown'}`);
  console.log(`HTML: ${relative(root, outputHtmlPath)}`);
  console.log(`Manifest: ${relative(root, outputJsonPath)}`);
}

function buildManifest(spec) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-design-ui-prototype',
    source_panel_spec: relative(root, panelSpecPath),
    html_output: relative(root, outputHtmlPath),
    status: 'ui_prototype_ready',
    project: spec.project,
    panel_state: spec.panel?.state || null,
    primary_action: spec.actions?.primary || null,
    safety: {
      static_html_only: true,
      no_network_calls: true,
      no_blender_launch: true,
      no_geometry_generation: true,
      no_uploads: true,
      no_public_publish: true
    },
    smoke_expectations: {
      contains_panel_title: spec.panel?.title || 'KosmoDesign',
      primary_action_enabled: spec.actions?.primary?.enabled === true,
      generation_enabled: spec.actions?.disabled_generation?.enabled === true,
      blocker_count: asArray(spec.sections?.blockers?.items).length,
      guardrail_count: asArray(spec.sections?.guardrails?.items).length
    }
  };
}

function renderHtml(spec, manifest) {
  const panel = spec.panel || {};
  const sections = spec.sections || {};
  const actions = spec.actions || {};
  const tone = panel.tone || 'neutral';
  const primary = actions.primary || {};
  const disabledGeneration = actions.disabled_generation || {};

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(panel.title || 'KosmoDesign')} | KosmoOrbit Prototype</title>
  <style>
    :root {
      color-scheme: dark;
      --field: #050505;
      --panel: #0a0d10;
      --line: #f7f7f4;
      --muted: #b8b8b8;
      --construction: #2f2f2f;
      --blue: #64c7ff;
      --yellow: #ffd166;
      --red: #ff5c77;
      --green: #78d88b;
      --ink: #f7f7f4;
      --soft: rgba(247, 247, 244, 0.08);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
        linear-gradient(0deg, rgba(255,255,255,0.035) 1px, transparent 1px),
        var(--field);
      background-size: 48px 48px;
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }

    main {
      width: min(1280px, 100%);
      margin: 0 auto;
      padding: 28px;
      display: grid;
      gap: 18px;
    }

    .shell {
      border: 1px solid var(--construction);
      background: rgba(5, 5, 5, 0.88);
      display: grid;
      grid-template-columns: minmax(280px, 0.9fr) minmax(320px, 1.4fr);
      min-height: calc(100vh - 56px);
    }

    .rail {
      border-right: 1px solid var(--construction);
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      min-width: 0;
    }

    .panel {
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

    .state {
      border: 1px solid ${toneColor(tone)};
      padding: 14px;
      display: grid;
      gap: 8px;
    }

    .state strong {
      font-size: 13px;
      color: ${toneColor(tone)};
      text-transform: uppercase;
    }

    .state p, .text {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.45;
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .badge {
      border: 1px solid var(--construction);
      color: var(--line);
      padding: 6px 8px;
      font-size: 12px;
      min-height: 30px;
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
      gap: 10px;
    }

    button {
      appearance: none;
      border: 1px solid var(--line);
      background: var(--line);
      color: #050505;
      min-height: 42px;
      padding: 0 14px;
      font: inherit;
      font-size: 14px;
      cursor: default;
      text-align: left;
    }

    button.secondary {
      background: transparent;
      color: var(--line);
      border-color: var(--construction);
    }

    button:disabled {
      border-color: var(--red);
      color: var(--red);
      background: transparent;
    }

    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .section {
      border-top: 1px solid var(--construction);
      padding-top: 14px;
      display: grid;
      gap: 10px;
      min-width: 0;
    }

    .kv {
      display: grid;
      grid-template-columns: minmax(110px, 0.75fr) minmax(0, 1.25fr);
      gap: 10px;
      font-size: 13px;
      border-bottom: 1px solid rgba(255,255,255,0.055);
      padding-bottom: 8px;
    }

    .kv span:first-child { color: var(--muted); }

    ul {
      margin: 0;
      padding-left: 18px;
      display: grid;
      gap: 8px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.35;
    }

    li[data-tone="red"] { color: var(--red); }
    li[data-tone="yellow"] { color: var(--yellow); }
    li[data-tone="blue"] { color: var(--blue); }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      min-width: 420px;
    }

    th, td {
      border-bottom: 1px solid var(--construction);
      padding: 9px 8px;
      text-align: left;
      vertical-align: top;
    }

    th {
      color: var(--muted);
      font-weight: 500;
      text-transform: uppercase;
      font-size: 11px;
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--construction);
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }

    @media (max-width: 820px) {
      main { padding: 14px; }
      .shell { grid-template-columns: 1fr; }
      .rail { border-right: 0; border-bottom: 1px solid var(--construction); }
      .grid { grid-template-columns: 1fr; }
      h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <main>
    <div class="shell">
      <aside class="rail">
        <div>
          <div class="eyebrow">KosmoOrbit Prototype</div>
          <h1>${escapeHtml(panel.title || 'KosmoDesign')}</h1>
          <p class="text">${escapeHtml(panel.subtitle || 'Design handoff')}</p>
        </div>

        <div class="state">
          <strong>${escapeHtml(panel.state || 'unknown')}</strong>
          <p>${escapeHtml(sections.status_header?.description || '')}</p>
        </div>

        <div class="badges">
          ${asArray(spec.badges).map((item) => `<span class="badge" data-tone="${escapeAttribute(item.tone)}">${escapeHtml(item.label)}</span>`).join('\n          ')}
        </div>

        <div class="actions">
          <button${primary.enabled ? '' : ' disabled'}>${escapeHtml(primary.label || 'Open')}</button>
          ${asArray(actions.secondary).map((action) => `<button class="secondary"${action.enabled ? '' : ' disabled'}>${escapeHtml(action.label)}</button>`).join('\n          ')}
          <button disabled>${escapeHtml(disabledGeneration.label || 'Generate Design')}</button>
          <p class="text">${escapeHtml(disabledGeneration.reason || 'Design generation state is not available.')}</p>
        </div>

        <div class="section">
          <h2>Current Role</h2>
          ${renderRows(sections.role_gate?.rows)}
        </div>
      </aside>

      <section class="panel">
        <div class="grid">
          <div class="section">
            <h2>Blockers</h2>
            ${renderList(sections.blockers?.items)}
          </div>
          <div class="section">
            <h2>Allowed Actions</h2>
            ${renderList(sections.allowed_actions?.items)}
          </div>
        </div>

        <div class="section">
          <h2>Model Profile</h2>
          <div class="grid">${renderRows(sections.model_profile?.summary)}</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Room</th><th>Story</th><th>Function</th><th>Area</th></tr></thead>
              <tbody>
                ${asArray(sections.model_profile?.rooms).map((room) => `<tr><td>${escapeHtml(room.name)}</td><td class="mono">${escapeHtml(room.story)}</td><td>${escapeHtml(room.function)}</td><td>${escapeHtml(room.area_m2)} m2</td></tr>`).join('\n                ')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <h2>Context Inputs</h2>
          <div class="grid">${renderRows(sections.context_inputs?.summary)}</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Input</th><th>Reason</th><th>Use</th><th>Permission</th></tr></thead>
              <tbody>
                ${asArray(sections.context_inputs?.blocked_inputs).map((input) => `<tr><td class="mono">${escapeHtml(input.id)}<br>${escapeHtml(input.label)}</td><td>${escapeHtml(input.reason)}</td><td>${escapeHtml(input.selected_use)}</td><td>${escapeHtml(input.downstream_permission)}</td></tr>`).join('\n                ')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid">
          <div class="section">
            <h2>Guardrails</h2>
            ${renderList(sections.guardrails?.items)}
          </div>
          <div class="section">
            <h2>Next Actions</h2>
            ${renderList(sections.next_actions?.items)}
          </div>
        </div>

        <div class="section">
          <h2>Prototype Manifest</h2>
          <p class="text mono">${escapeHtml(manifest.html_output)}</p>
          <p class="text">Static local prototype. No network calls, no Blender launch, no generation, no uploads.</p>
        </div>
      </section>
    </div>
  </main>
</body>
</html>
`;
}

function renderRows(rows) {
  return asArray(rows).map((row) => `
    <div class="kv">
      <span>${escapeHtml(row.label)}</span>
      <span>${escapeHtml(row.value)}</span>
    </div>`).join('');
}

function renderList(items) {
  const rows = asArray(items);
  if (!rows.length) return '<p class="text">None</p>';
  return `<ul>${rows.map((item) => `<li data-tone="${escapeAttribute(item.tone || 'neutral')}">${escapeHtml(item.text || item.label || item)}</li>`).join('')}</ul>`;
}

function toneColor(tone) {
  if (tone === 'red') return 'var(--red)';
  if (tone === 'yellow') return 'var(--yellow)';
  if (tone === 'blue') return 'var(--blue)';
  if (tone === 'green') return 'var(--green)';
  return 'var(--line)';
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
