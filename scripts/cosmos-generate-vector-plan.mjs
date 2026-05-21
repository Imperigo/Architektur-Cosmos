#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const slug = args.entry || args.slug;
  if (!slug) throw new Error('Usage: npm run cosmos:plan-generate -- --entry villa-savoye');

  const entry = await loadEntry(slug);
  if (!entry) throw new Error(`No entry found for "${slug}".`);

  const intakeRoot = path.join(root, 'archive-intake', entry.slug);
  const plansDir = path.join(intakeRoot, 'plans');
  const analysisDir = path.join(intakeRoot, 'analysis');
  const automationDir = path.join(intakeRoot, 'automation');
  await Promise.all([plansDir, analysisDir, automationDir].map((directory) => mkdir(directory, { recursive: true })));

  const plan = buildPlanGraph(entry);
  const section = buildSectionGraph(entry, plan);
  const analysis = buildAnalysisGraph(entry, plan);
  const exports = {
    plan_svg: `archive-intake/${entry.slug}/plans/${entry.slug}-cosmos-plan.svg`,
    section_svg: `archive-intake/${entry.slug}/plans/${entry.slug}-cosmos-section.svg`,
    analysis_svg: `archive-intake/${entry.slug}/plans/${entry.slug}-cosmos-analysis.svg`,
    plan_dxf: `archive-intake/${entry.slug}/plans/${entry.slug}-cosmos-plan.dxf`,
    vector_graph: `archive-intake/${entry.slug}/analysis/vector-plan-graph.json`,
    archicad_2d_profile: `archive-intake/${entry.slug}/automation/archicad-2d-exchange-profile.json`
  };

  const graph = {
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    generated_at: new Date().toISOString(),
    generator: 'cosmos-generate-vector-plan',
    status: 'diagrammatic_study_reconstruction',
    public_use_allowed: false,
    review_status: 'draft',
    caveat: 'Cosmos vector plans are analytical study drawings, not measured construction documents.',
    coordinate_policy: {
      unit: 'diagram_units',
      origin: 'drawing_center',
      scale: 'not_measured',
      north_reference: 'diagrammatic_until_verified'
    },
    source_basis: sourceBasis(entry),
    layers: [...plan.layers, ...section.layers, ...analysis.layers],
    exports
  };

  const archicadProfile = buildArchicad2dProfile(entry, graph);
  const toolRun = buildToolRun(entry, graph, 'plan_generate');

  await writeFile(path.join(plansDir, `${entry.slug}-cosmos-plan.svg`), renderSvg(entry, plan, 'Plan'), 'utf8');
  await writeFile(path.join(plansDir, `${entry.slug}-cosmos-section.svg`), renderSvg(entry, section, 'Section'), 'utf8');
  await writeFile(path.join(plansDir, `${entry.slug}-cosmos-analysis.svg`), renderSvg(entry, analysis, 'Analysis'), 'utf8');
  await writeFile(path.join(plansDir, `${entry.slug}-cosmos-plan.dxf`), renderDxf(plan), 'utf8');
  await writeJson(path.join(analysisDir, 'vector-plan-graph.json'), graph);
  await writeJson(path.join(automationDir, 'archicad-2d-exchange-profile.json'), archicadProfile);
  await writeJson(path.join(automationDir, 'plan-tool-run.json'), toolRun);

  console.log('Architecture Cosmos 2D vector plan generator');
  console.log(`Entry: ${entry.title} (${entry.slug})`);
  console.log(`Layers: ${graph.layers.length}`);
  console.log('Wrote:');
  Object.values(exports).forEach((item) => console.log(`- ${item}`));
  console.log('');
  console.log('No upload was performed. Drawings are draft study reconstructions.');
}

async function loadEntry(slug) {
  const entries = JSON.parse(await readFile(path.join(root, 'data/mock-entries.json'), 'utf8'));
  return entries.find((entry) => entry.slug === slug || entry.id === slug);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : true;
    if (next && !next.startsWith('--')) index += 1;
  }
  return parsed;
}

function buildPlanGraph(entry) {
  const profile = templateProfile(entry);
  const layers = [];
  const add = (layer, geometry) => layers.push({ ...layerBase(entry, layer), geometry });

  add('site_context', [
    rect('site frame', -360, -250, 720, 500),
    label('context / site', -330, -220)
  ]);
  add('structural_grid', grid(profile.gridX, profile.gridY, -240, -150, 480, 300));
  add('walls_mass', profile.planMasses);
  add('openings_voids', profile.openings);
  add('circulation', profile.circulation);
  add('landscape', profile.landscape);
  add('material_annotations', [
    label(`materials: ${materialsFor(entry).slice(0, 4).join(' / ') || 'needs review'}`, -330, 225),
    label(`structure: ${structureHint(entry)}`, -330, 245)
  ]);
  add('uncertainty_notes', [
    label('diagrammatic reconstruction / verify against reviewed plans', -330, 270)
  ]);

  return {
    viewBox: [-420, -310, 840, 620],
    layers
  };
}

function buildSectionGraph(entry) {
  const isLandscape = entry.entry_type === 'landscape_project' || entry.entry_type === 'infrastructure';
  const layers = [];
  const add = (layer, geometry) => layers.push({ ...layerBase(entry, layer), geometry });

  add('site_context', [
    polyline('ground datum', [[-340, 120], [-180, 110], [0, 126], [170, 108], [340, 120]]),
    label('section / topographic datum', -330, -230)
  ]);
  add('walls_mass', isLandscape
    ? [rect('elevated infrastructure / frame', -260, -40, 520, 34), rect('public room volume', -230, -170, 460, 130)]
    : [rect('primary volume', -230, -110, 460, 160), rect('plinth / ground relation', -190, 50, 380, 46)]);
  add('structural_grid', [
    ...[-180, -90, 0, 90, 180].map((x, index) => line(`vertical support ${index + 1}`, x, -110, x, 120)),
    line('roof/slab datum', -230, -110, 230, -110),
    line('floor datum', -230, 50, 230, 50)
  ]);
  add('circulation', [
    polyline('movement section', [[-200, 72], [-90, 10], [40, -44], [190, -92]]),
    label('movement / promenade', 100, -125)
  ]);
  add('material_annotations', [
    label(`material system: ${materialsFor(entry).slice(0, 3).join(' / ') || 'needs review'}`, -330, 245)
  ]);
  add('uncertainty_notes', [label('schematic section, not measured', -330, 270)]);

  return {
    viewBox: [-420, -310, 840, 620],
    layers
  };
}

function buildAnalysisGraph(entry, plan) {
  const layers = [];
  const add = (layer, geometry) => layers.push({ ...layerBase(entry, layer), geometry });
  const ringLabels = [
    ['program', entry.program?.type ?? entry.entry_type],
    ['context', entry.context?.setting ?? entry.city ?? 'context review'],
    ['style', entry.style_sector.replace(/_/g, ' ')],
    ['themes', (entry.themes ?? []).slice(0, 3).join(' / ') || 'themes review']
  ];

  add('filter_classification', ringLabels.map(([key, value], index) => ({
    kind: 'circle_label',
    id: key,
    cx: 0,
    cy: 0,
    r: 80 + index * 45,
    text: value
  })));
  add('spatial_order', [
    polyline('primary axis', [[-280, 0], [280, 0]]),
    polyline('secondary axis', [[0, -210], [0, 210]]),
    label('spatial order / filter map', -330, -240)
  ]);
  add('material_annotations', materialsFor(entry).slice(0, 5).map((material, index) => label(material, -320 + index * 130, 250)));
  add('uncertainty_notes', [label('analysis graph derived from entry data and reviewed source notes', -330, 280)]);

  return {
    viewBox: plan.viewBox,
    layers
  };
}

function templateProfile(entry) {
  if (entry.slug === 'villa-savoye') {
    return {
      gridX: 5,
      gridY: 3,
      planMasses: [
        rect('lifted villa volume', -230, -135, 460, 270),
        rect('service core', -65, -95, 100, 100),
        rect('roof garden field', 60, -100, 115, 145)
      ],
      openings: [
        line('ribbon window north', -205, -135, 205, -135),
        line('ribbon window south', -205, 135, 205, 135)
      ],
      circulation: [
        polyline('promenade ramp', [[-130, 130], [-70, 55], [-10, 0], [55, -55], [120, -125]]),
        polyline('automobile loop', [[-310, 145], [-255, 205], [-120, 225], [40, 205], [120, 150]])
      ],
      landscape: [
        rect('lawn field', -340, -230, 680, 460),
        polyline('roof garden route', [[55, -100], [170, -100], [170, 45], [55, 45], [55, -100]])
      ]
    };
  }

  const landscape = entry.entry_type === 'landscape_project' || entry.entry_type === 'infrastructure';
  const courtyard = hasAny(entry, ['courtyard', 'hof', 'monastery', 'care', 'kloster']);
  return {
    gridX: landscape ? 7 : 4,
    gridY: landscape ? 2 : 4,
    planMasses: courtyard
      ? [rect('perimeter volume', -230, -160, 460, 320), rect('courtyard void', -105, -80, 210, 160)]
      : landscape
        ? [rect('linear public frame', -310, -50, 620, 100), rect('episode room', -120, -120, 240, 240)]
        : [rect('primary mass', -220, -140, 440, 280), rect('secondary volume', -80, -70, 160, 140)],
    openings: [
      line('principal facade rhythm', -210, -140, 210, -140),
      line('secondary facade rhythm', -210, 140, 210, 140)
    ],
    circulation: [
      polyline('primary movement', [[-250, 95], [-120, 35], [0, 0], [115, -40], [250, -95]])
    ],
    landscape: [
      rect('context field', -340, -230, 680, 460),
      polyline('landscape relation', [[-310, 185], [-130, 210], [60, 180], [310, 205]])
    ]
  };
}

function layerBase(entry, layer) {
  return {
    layer,
    title: titleCase(layer),
    review_status: 'draft',
    source_basis: sourceBasis(entry),
    public_use_allowed: false
  };
}

function sourceBasis(entry) {
  const sources = [
    entry.source_url,
    ...(entry.source_documents ?? []),
    ...(entry.source_candidates ?? []).map((source) => source.title || source.url)
  ].filter(Boolean);
  return sources.length ? sources.slice(0, 5).join(' | ') : 'entry metadata only; needs source review';
}

function rect(id, x, y, width, height) {
  return { kind: 'rect', id, x, y, width, height };
}

function line(id, x1, y1, x2, y2) {
  return { kind: 'line', id, x1, y1, x2, y2 };
}

function polyline(id, points) {
  return { kind: 'polyline', id, points };
}

function label(text, x, y) {
  return { kind: 'label', id: slugify(text), text, x, y };
}

function grid(columns, rows, x, y, width, height) {
  const items = [];
  for (let index = 0; index <= columns; index += 1) {
    const gx = x + (width / columns) * index;
    items.push(line(`grid x${index}`, gx, y, gx, y + height));
  }
  for (let index = 0; index <= rows; index += 1) {
    const gy = y + (height / rows) * index;
    items.push(line(`grid y${index}`, x, gy, x + width, gy));
  }
  return items;
}

function renderSvg(entry, graph, drawingType) {
  const [x, y, width, height] = graph.viewBox;
  const layers = graph.layers.map((layer) => renderLayer(layer)).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}" role="img" aria-label="${escapeXml(entry.title)} ${drawingType} diagram">
  <metadata>${escapeXml(JSON.stringify({ generator: 'Architecture Cosmos', drawing_type: drawingType, entry_id: entry.id, review_status: 'draft' }))}</metadata>
  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#050505"/>
  <style>
    .cosmos-line{fill:none;stroke:#f4f0e8;stroke-width:1.25;vector-effect:non-scaling-stroke}
    .cosmos-grid{fill:none;stroke:#7d8790;stroke-width:.45;stroke-dasharray:4 8;opacity:.55;vector-effect:non-scaling-stroke}
    .cosmos-accent{fill:none;stroke:#6ff6ff;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
    .cosmos-soft{fill:#ffffff08;stroke:#ffffff55;stroke-width:.8;vector-effect:non-scaling-stroke}
    .cosmos-label{fill:#f4f0e8;font-family:Inter,Arial,sans-serif;font-size:10px;letter-spacing:.08em;text-transform:uppercase}
    .cosmos-note{fill:#9fa8ad;font-family:Inter,Arial,sans-serif;font-size:8px;letter-spacing:.05em}
  </style>
  <text class="cosmos-label" x="${x + 28}" y="${y + 32}">${escapeXml(entry.title)} / ${drawingType}</text>
  <text class="cosmos-note" x="${x + 28}" y="${y + 48}">diagrammatic study reconstruction / not measured</text>
${layers}
</svg>
`;
}

function renderLayer(layer) {
  const className = classForLayer(layer.layer);
  return `  <g id="${escapeXml(layer.layer)}" data-review-status="${layer.review_status}">
${layer.geometry.map((item) => renderGeometry(item, className)).join('\n')}
  </g>`;
}

function renderGeometry(item, className) {
  if (item.kind === 'rect') return `    <rect class="${className}" x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}"/>`;
  if (item.kind === 'line') return `    <line class="${className}" x1="${item.x1}" y1="${item.y1}" x2="${item.x2}" y2="${item.y2}"/>`;
  if (item.kind === 'polyline') return `    <polyline class="${className}" points="${item.points.map((point) => point.join(',')).join(' ')}"/>`;
  if (item.kind === 'label') return `    <text class="${item.text.includes('diagrammatic') || item.text.includes('schematic') ? 'cosmos-note' : 'cosmos-label'}" x="${item.x}" y="${item.y}">${escapeXml(item.text)}</text>`;
  if (item.kind === 'circle_label') {
    return `    <circle class="cosmos-grid" cx="${item.cx}" cy="${item.cy}" r="${item.r}"/>\n    <text class="cosmos-note" x="${item.cx - item.r + 8}" y="${item.cy - item.r + 15}">${escapeXml(item.text)}</text>`;
  }
  return '';
}

function classForLayer(layer) {
  if (layer === 'structural_grid') return 'cosmos-grid';
  if (['circulation', 'material_annotations', 'filter_classification'].includes(layer)) return 'cosmos-accent';
  if (['site_context', 'landscape'].includes(layer)) return 'cosmos-soft';
  return 'cosmos-line';
}

function renderDxf(graph) {
  const lines = ['0', 'SECTION', '2', 'ENTITIES'];
  for (const layer of graph.layers) {
    for (const item of layer.geometry) {
      if (item.kind === 'line') addDxfLine(lines, layer.layer, item.x1, item.y1, item.x2, item.y2);
      if (item.kind === 'rect') {
        const points = [[item.x, item.y], [item.x + item.width, item.y], [item.x + item.width, item.y + item.height], [item.x, item.y + item.height], [item.x, item.y]];
        addDxfPolyline(lines, layer.layer, points);
      }
      if (item.kind === 'polyline') addDxfPolyline(lines, layer.layer, item.points);
    }
  }
  lines.push('0', 'ENDSEC', '0', 'EOF');
  return `${lines.join('\n')}\n`;
}

function addDxfLine(lines, layer, x1, y1, x2, y2) {
  lines.push('0', 'LINE', '8', layer, '10', String(x1), '20', String(-y1), '30', '0', '11', String(x2), '21', String(-y2), '31', '0');
}

function addDxfPolyline(lines, layer, points) {
  lines.push('0', 'LWPOLYLINE', '8', layer, '90', String(points.length), '70', '0');
  points.forEach(([x, y]) => lines.push('10', String(x), '20', String(-y)));
}

function buildArchicad2dProfile(entry, graph) {
  return {
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    exchange_goal: 'ArchiCAD 2D underlay and layer guide',
    status: 'draft_review',
    public_use_allowed: false,
    preferred_formats: ['SVG', 'DXF', 'JSON'],
    import_notes: [
      'Use DXF/SVG as a diagrammatic underlay, not as construction documentation.',
      'Preserve layer names for later BIM element tracing.',
      'Keep uncertainty_notes visible until geometry is manually reviewed.'
    ],
    layer_map: graph.layers.map((layer) => ({
      source_layer: layer.layer,
      archicad_layer: `AC_${entry.slug}_${layer.layer}`,
      role: layer.title,
      review_status: layer.review_status
    })),
    exports: graph.exports
  };
}

function buildToolRun(entry, graph, toolId) {
  return {
    tool_id: toolId,
    entry_id: entry.id,
    slug: entry.slug,
    generated_at: graph.generated_at,
    status: 'draft_review_generated',
    writes_public_database: false,
    uploads_assets: false,
    public_use_allowed: false,
    outputs: graph.exports,
    next_review: [
      'Check source basis against reviewed drawings or ETH notes.',
      'Mark any exact plan-derived geometry as private until rights are clear.',
      'Only promote the vector graph after owner review.'
    ]
  };
}

function materialsFor(entry) {
  return [...new Set([...(entry.materials?.primary ?? []), ...(entry.materials?.secondary ?? []), ...(entry.materials?.stone_type ?? [])])]
    .map((item) => String(item).replace(/_/g, ' '));
}

function structureHint(entry) {
  const analysis = (entry.analysis_layers ?? []).find((layer) => layer.analysis_type === 'structure');
  if (analysis?.summary) return truncate(analysis.summary, 84);
  if (materialsFor(entry).some((item) => item.includes('concrete'))) return 'frame / slab logic to review';
  if (materialsFor(entry).some((item) => item.includes('timber'))) return 'timber / hybrid logic to review';
  return 'needs structural source review';
}

function hasAny(entry, needles) {
  const haystack = [entry.title, entry.short_description, entry.full_description, ...(entry.themes ?? []), ...(entry.vibes ?? [])].join(' ').toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

function truncate(value, max) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function titleCase(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'label';
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
