#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const outputHtmlPath = join(projectRoot, args.html || 'design/ifc-human-review-viewer.generated.html');
const outputJsonPath = join(projectRoot, args.output || 'design/ifc-human-review-viewer.generated.json');

const paths = {
  manifest: join(projectRoot, 'kosmo.project.json'),
  ifcOpenShellReview: join(projectRoot, 'design/ifcopenshell-semantic-review.generated.json'),
  humanReviewPack: join(projectRoot, 'design/ifc-human-review-pack.generated.json'),
  semanticProof: join(projectRoot, 'design/ifc-semantic-proof.generated.json'),
  geometryPreview: join(projectRoot, 'design/ifc-geometry-preview.generated.json'),
  alignmentPreview: join(projectRoot, 'design/ifc-dxf-alignment-preview.generated.json'),
  layerPlan: join(projectRoot, 'design/ifc-layer-plan.generated.json'),
  blenderAudit: join(projectRoot, 'design/blender-context-import.audit.json'),
  geometrySvg: join(projectRoot, 'viz/previews/ifc-geometry-preview.svg'),
  alignmentSvg: join(projectRoot, 'viz/previews/ifc-dxf-alignment-preview.svg'),
  layerSvg: join(projectRoot, 'viz/previews/ifc-layer-plan.svg')
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const viewer = buildViewer();
  await Promise.all([
    mkdir(dirname(outputHtmlPath), { recursive: true }),
    mkdir(dirname(outputJsonPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(viewer, null, 2)}\n`, 'utf8');
  await writeFile(outputHtmlPath, renderHtml(viewer), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo IFC human review viewer generated');
  console.log(`Project: ${viewer.project_id}`);
  console.log(`Status: ${viewer.status}`);
  console.log(`HTML: ${relative(root, outputHtmlPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildViewer() {
  const manifest = readOptionalJson(paths.manifest);
  const ifcOpenShellReview = readOptionalJson(paths.ifcOpenShellReview);
  const humanReviewPack = readOptionalJson(paths.humanReviewPack);
  const semanticProof = readOptionalJson(paths.semanticProof);
  const geometryPreview = readOptionalJson(paths.geometryPreview);
  const alignmentPreview = readOptionalJson(paths.alignmentPreview);
  const layerPlan = readOptionalJson(paths.layerPlan);
  const blenderAudit = readOptionalJson(paths.blenderAudit);
  const projectId = manifest?.project_id || humanReviewPack?.project_id || basename(projectRoot);
  const previews = [
    preview('IFC Geometry', paths.geometrySvg, '../viz/previews/ifc-geometry-preview.svg'),
    preview('IFC/DXF Alignment', paths.alignmentSvg, '../viz/previews/ifc-dxf-alignment-preview.svg'),
    preview('IFC Layer Plan', paths.layerSvg, '../viz/previews/ifc-layer-plan.svg')
  ];
  const humanChecks = Array.isArray(humanReviewPack?.human_checklist) ? humanReviewPack.human_checklist : [];
  const machineChecks = Array.isArray(humanReviewPack?.evidence?.machine_checks) ? humanReviewPack.evidence.machine_checks : [];
  const ifcChecks = Array.isArray(ifcOpenShellReview?.machine_checks) ? ifcOpenShellReview.machine_checks : [];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-ifc-review-viewer',
    project_id: projectId,
    project_name: manifest?.name || null,
    status: ifcOpenShellReview && humanReviewPack ? 'ifc_review_viewer_ready' : 'ifc_review_viewer_incomplete',
    rights_status: 'internal_only',
    policy: {
      viewer_does_not_approve_design_generation: true,
      viewer_does_not_modify_context_selection: true,
      viewer_is_local_review_only: true
    },
    output_files: {
      html: relative(projectRoot, outputHtmlPath),
      json: relative(projectRoot, outputJsonPath)
    },
    source_files: Object.fromEntries(Object.entries(paths).map(([key, pathname]) => [key, sourceFileStatus(pathname)])),
    summary: {
      design_generation_allowed: Boolean(humanReviewPack?.summary?.design_generation_allowed),
      evidence_ready: Boolean(humanReviewPack?.summary?.evidence_ready),
      recommended_decision_now: humanReviewPack?.summary?.recommended_decision_now || 'keep_needs_more_source_review',
      ifcopenshell_machine_checks_passed: numberOrDefault(ifcOpenShellReview?.summary?.machine_checks_passed, 0),
      ifcopenshell_machine_check_count: numberOrDefault(ifcOpenShellReview?.summary?.machine_check_count, 0),
      human_pack_machine_checks_passed: numberOrDefault(humanReviewPack?.summary?.machine_checks_passed, 0),
      human_pack_machine_check_count: numberOrDefault(humanReviewPack?.summary?.machine_check_count, 0),
      open_human_check_count: humanChecks.filter((item) => item.status === 'pending_human_review').length,
      preview_count: previews.filter((item) => item.exists).length,
      ifc_proxy_count: numberOrDefault(ifcOpenShellReview?.summary?.ifcbuildingelementproxy_count, 0),
      ifc_body_brep_count: numberOrDefault(ifcOpenShellReview?.summary?.proxies_with_body_brep, 0),
      geometry_bbox_count: numberOrDefault(geometryPreview?.summary?.elements_with_geometry_bbox, 0),
      alignment_hint: alignmentPreview?.summary?.alignment_hint || null,
      blender_audit_status: blenderAudit?.status || null
    },
    ifcopenshell: ifcOpenShellReview,
    human_review_pack: humanReviewPack,
    semantic_proof: semanticProof,
    geometry_preview: geometryPreview,
    alignment_preview: alignmentPreview,
    layer_plan: layerPlan,
    blender_audit: blenderAudit,
    previews,
    machine_checks: machineChecks,
    ifcopenshell_checks: ifcChecks,
    human_checks: humanChecks
  };
}

function preview(label, pathname, href) {
  return {
    label,
    path: relative(projectRoot, pathname),
    href,
    exists: existsSync(pathname),
    size_bytes: existsSync(pathname) ? statSync(pathname).size : 0
  };
}

function renderHtml(viewer) {
  const ifc = viewer.ifcopenshell || {};
  const ifcSummary = ifc.summary || {};
  const distributions = ifc.distributions || {};
  const headerBadges = [
    { label: `Project ${viewer.project_id}` },
    {
      label: viewer.summary.evidence_ready ? 'Machine evidence ready' : 'Machine evidence incomplete',
      tone: viewer.summary.evidence_ready ? 'good' : 'warn'
    },
    {
      label: viewer.summary.open_human_check_count > 0 ? 'Human review open' : 'Human review complete',
      tone: viewer.summary.open_human_check_count > 0 ? 'warn' : 'good'
    },
    {
      label: viewer.summary.design_generation_allowed ? 'Design generation allowed' : 'Design generation blocked',
      tone: viewer.summary.design_generation_allowed ? 'good' : 'block'
    }
  ];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kosmo IFC Human Review - ${escapeHtml(viewer.project_id)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #08090b;
      --panel: #11151a;
      --panel-2: #171d24;
      --text: #edf4f7;
      --muted: #99a9b4;
      --line: #2a3541;
      --cyan: #66d9ff;
      --magenta: #ff67d7;
      --green: #8ee6a8;
      --amber: #ffd166;
      --red: #ff7b7b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    header, main { width: min(1440px, calc(100vw - 32px)); margin: 0 auto; }
    header { padding: 28px 0 18px; display: grid; gap: 12px; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: clamp(28px, 4vw, 48px); line-height: 1; letter-spacing: 0; }
    h2 { font-size: 18px; margin-bottom: 12px; }
    h3 { font-size: 13px; color: var(--cyan); margin-bottom: 8px; }
    .sub { color: var(--muted); max-width: 900px; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .badge {
      border: 1px solid var(--line);
      background: #0d1116;
      border-radius: 999px;
      color: var(--muted);
      padding: 6px 10px;
      font-size: 12px;
      white-space: nowrap;
    }
    .badge.good { color: var(--green); border-color: color-mix(in srgb, var(--green) 45%, var(--line)); }
    .badge.warn { color: var(--amber); border-color: color-mix(in srgb, var(--amber) 45%, var(--line)); }
    .badge.block { color: var(--red); border-color: color-mix(in srgb, var(--red) 45%, var(--line)); }
    main { display: grid; gap: 16px; padding-bottom: 32px; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(12, 1fr); }
    .card {
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
      min-width: 0;
    }
    .span-3 { grid-column: span 3; }
    .span-4 { grid-column: span 4; }
    .span-5 { grid-column: span 5; }
    .span-6 { grid-column: span 6; }
    .span-7 { grid-column: span 7; }
    .span-8 { grid-column: span 8; }
    .span-12 { grid-column: span 12; }
    .metric { color: var(--muted); font-size: 12px; }
    .metric strong { display: block; color: var(--text); font-size: 28px; line-height: 1.1; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid var(--line); padding: 8px; text-align: left; vertical-align: top; }
    th { color: var(--muted); font-weight: 600; }
    td { color: #d7e2e8; }
    .checks { display: grid; gap: 8px; }
    .check { display: grid; grid-template-columns: 26px 1fr; gap: 10px; align-items: start; padding: 10px; border: 1px solid var(--line); border-radius: 8px; background: #0c1014; }
    .dot { width: 14px; height: 14px; margin-top: 3px; border-radius: 50%; background: var(--amber); box-shadow: 0 0 0 3px color-mix(in srgb, var(--amber) 14%, transparent); }
    .dot.passed { background: var(--green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 14%, transparent); }
    .dot.failed { background: var(--red); box-shadow: 0 0 0 3px color-mix(in srgb, var(--red) 14%, transparent); }
    .check small { color: var(--muted); display: block; margin-top: 2px; }
    .preview-grid { display: grid; gap: 14px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .preview { background: #07090c; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; min-height: 260px; }
    .preview img { width: 100%; height: 320px; object-fit: contain; display: block; background: #040506; }
    .preview a { display: block; padding: 10px 12px; color: var(--cyan); text-decoration: none; border-top: 1px solid var(--line); }
    .bar { display: grid; gap: 6px; }
    .bar-row { display: grid; grid-template-columns: minmax(120px, 1fr) 80px; gap: 10px; align-items: center; }
    .bar-track { height: 8px; border-radius: 999px; background: #26313b; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--cyan), var(--magenta)); }
    .bar-label { color: var(--muted); overflow-wrap: anywhere; }
    .bar-count { color: var(--text); text-align: right; }
    .decision { border-color: color-mix(in srgb, var(--amber) 42%, var(--line)); }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
    @media (max-width: 980px) {
      .grid { grid-template-columns: 1fr; }
      .span-3, .span-4, .span-5, .span-6, .span-7, .span-8, .span-12 { grid-column: 1; }
      .preview-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div class="badge-row">
      ${headerBadges.map(renderBadge).join('\n      ')}
    </div>
    <h1>IFC Human Review</h1>
    <p class="sub">Local review-only dashboard for semantic IFC evidence. It shows what Kosmo can prove automatically and what a human still has to decide before any IFC design seed is allowed.</p>
  </header>
  <main>
    <section class="grid">
      ${metric('IfcOpenShell Checks', `${ifcSummary.machine_checks_passed || 0}/${ifcSummary.machine_check_count || 0}`, 'span-3')}
      ${metric('IFC Proxies', ifcSummary.ifcbuildingelementproxy_count || 0, 'span-3')}
      ${metric('Body/Brep', `${ifcSummary.proxies_with_body_brep || 0}/${ifcSummary.ifcbuildingelementproxy_count || 0}`, 'span-3')}
      ${metric('Open Human Checks', viewer.summary.open_human_check_count, 'span-3')}
      <div class="card span-5 decision">
        <h2>Decision Gate</h2>
        <p class="metric">Recommended current decision<strong>${escapeHtml(viewer.summary.recommended_decision_now)}</strong></p>
        <p class="sub">The viewer is evidence, not approval. Keep design generation blocked until the human checklist is complete and context-selection explicitly approves a seed.</p>
      </div>
      <div class="card span-7">
        <h2>Semantic Snapshot</h2>
        <div class="badge-row">
          <span class="badge">Schema ${escapeHtml(ifc.ifc_schema || '-')}</span>
          <span class="badge">Unit scale ${escapeHtml(ifcSummary.unit_scale ?? '-')}</span>
          <span class="badge">Storeys ${escapeHtml(ifcSummary.storey_count ?? '-')}</span>
          <span class="badge">Geometry bboxes ${escapeHtml(viewer.summary.geometry_bbox_count)}</span>
          <span class="badge">Alignment ${escapeHtml(viewer.summary.alignment_hint || '-')}</span>
          <span class="badge">Blender audit ${escapeHtml(viewer.summary.blender_audit_status || '-')}</span>
        </div>
      </div>
    </section>
    <section class="grid">
      <div class="card span-4">
        <h2>OBJEKTART</h2>
        ${bars(distributions.kosmo_object_type || [])}
      </div>
      <div class="card span-4">
        <h2>Storey / Representation</h2>
        <h3>Storey</h3>
        ${bars(distributions.storey_container || [])}
        <h3 style="margin-top:16px">Representation</h3>
        ${bars(distributions.representation || [])}
      </div>
      <div class="card span-4">
        <h2>Property Sets</h2>
        ${bars(distributions.property_sets || [])}
      </div>
    </section>
    <section class="card">
      <h2>Preview Evidence</h2>
      <div class="preview-grid">
        ${viewer.previews.map(renderPreview).join('\n')}
      </div>
    </section>
    <section class="grid">
      <div class="card span-6">
        <h2>Machine Checks</h2>
        <div class="checks">
          ${viewer.machine_checks.map(renderCheck).join('\n')}
        </div>
      </div>
      <div class="card span-6">
        <h2>Human Checklist</h2>
        <div class="checks">
          ${viewer.human_checks.map(renderHumanCheck).join('\n')}
        </div>
      </div>
    </section>
    <section class="card">
      <h2>Element Sample</h2>
      <table>
        <thead><tr><th>STEP</th><th>Name</th><th>Class</th><th>OBJEKTART</th><th>Container</th><th>Representation</th></tr></thead>
        <tbody>
          ${(ifc.element_sample || []).slice(0, 16).map((row) => `<tr><td class="mono">#${escapeHtml(row.step_id)}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.class)}</td><td>${escapeHtml(row.kosmo_object_type || '-')}</td><td>${escapeHtml(row.container_label || '-')}</td><td>${escapeHtml(row.representation_signature || '-')}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>
`;
}

function metric(label, value, span) {
  return `<div class="card ${span}"><p class="metric">${escapeHtml(label)}<strong>${escapeHtml(value)}</strong></p></div>`;
}

function renderBadge(badge) {
  const tone = badge.tone ? ` ${badge.tone}` : '';
  return `<span class="badge${escapeAttribute(tone)}">${escapeHtml(badge.label)}</span>`;
}

function bars(items) {
  const max = Math.max(...items.map((item) => Number(item.count) || 0), 1);
  if (!items.length) return '<p class="sub">No data.</p>';
  return `<div class="bar">${items.map((item) => {
    const count = Number(item.count) || 0;
    const width = Math.max(2, Math.round((count / max) * 100));
    return `<div class="bar-row"><div><div class="bar-label">${escapeHtml(item.value)}</div><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div></div><div class="bar-count">${escapeHtml(count)}</div></div>`;
  }).join('\n')}</div>`;
}

function renderPreview(item) {
  if (!item.exists) return `<div class="preview"><div style="padding:16px"><h3>${escapeHtml(item.label)}</h3><p class="sub">Missing preview: ${escapeHtml(item.path)}</p></div></div>`;
  return `<div class="preview"><img src="${escapeAttribute(item.href)}" alt="${escapeAttribute(item.label)}"><a href="${escapeAttribute(item.href)}">${escapeHtml(item.label)}</a></div>`;
}

function renderCheck(check) {
  return `<div class="check"><span class="dot ${escapeAttribute(check.status)}"></span><div><strong>${escapeHtml(check.id)}</strong><small>${escapeHtml(check.detail)}</small></div></div>`;
}

function renderHumanCheck(check) {
  return `<div class="check"><span class="dot"></span><div><strong>${escapeHtml(check.id)}</strong><small>${escapeHtml(check.question)}</small><small>${escapeHtml(check.evidence_hint)}</small></div></div>`;
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = false;
    for (const item of packageOutputItems()) {
      didChange = ensureItem(manifest.outputs, item.path, item.manifest) || didChange;
    }
    if (didChange) {
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      changed.push(manifestPath);
    }
  }
  const exportManifestPath = join(projectRoot, 'publish/export-manifest.json');
  if (existsSync(exportManifestPath)) {
    const exportManifest = readJson(exportManifestPath);
    if (!Array.isArray(exportManifest.exports)) exportManifest.exports = [];
    let didChange = false;
    for (const item of packageOutputItems()) {
      didChange = ensureItem(exportManifest.exports, item.path, item.exportManifest) || didChange;
    }
    if (didChange) {
      await writeFile(exportManifestPath, `${JSON.stringify(exportManifest, null, 2)}\n`, 'utf8');
      changed.push(exportManifestPath);
    }
  }
  return changed;
}

function packageOutputItems() {
  return [
    outputItem('design/ifc-human-review-viewer.generated.json', 'other', 'design', 'Kosmo Design', 'json', 'Static IFC human review viewer manifest.'),
    outputItem('design/ifc-human-review-viewer.generated.html', 'other', 'design', 'Kosmo Design', 'html', 'Static local IFC human review dashboard.')
  ];
}

function outputItem(path, type, module, exportModule, format, description) {
  return {
    path,
    manifest: { path, type, module, rights_status: 'generated_needs_review', description },
    exportManifest: { path, module: exportModule, format, status: 'generated_needs_review', rights_status: 'generated_needs_review' }
  };
}

function sourceFileStatus(pathname) {
  return {
    path: relative(projectRoot, pathname),
    name: basename(pathname),
    exists: existsSync(pathname),
    size_bytes: existsSync(pathname) ? statSync(pathname).size : 0
  };
}

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function readOptionalJson(pathname) {
  if (!existsSync(pathname)) return null;
  return readJson(pathname);
}

function numberOrDefault(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
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
