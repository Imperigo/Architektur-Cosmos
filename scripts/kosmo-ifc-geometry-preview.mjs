#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const outputJsonPath = join(projectRoot, args.output || 'design/ifc-geometry-preview.generated.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/ifc-geometry-preview.generated.md');
const outputSvgPath = join(projectRoot, args.svg || 'viz/previews/ifc-geometry-preview.svg');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const sourceRegistry = existsSync(join(projectRoot, 'data/sources.json')) ? readJson(join(projectRoot, 'data/sources.json')) : null;
  const sourcePath = resolveIfcPath(sourceRegistry);
  const preview = buildPreview(sourcePath);

  await mkdir(dirname(outputJsonPath), { recursive: true });
  await mkdir(dirname(outputMdPath), { recursive: true });
  await mkdir(dirname(outputSvgPath), { recursive: true });
  await writeFile(outputJsonPath, `${JSON.stringify(preview, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(preview), 'utf8');
  await writeFile(outputSvgPath, renderSvg(preview), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo IFC geometry preview generated');
  console.log(`Project: ${preview.project_id}`);
  console.log(`Elements: ${preview.summary.ifcbuildingelementproxy_count}`);
  console.log(`Elements with geometry: ${preview.summary.elements_with_geometry_bbox}`);
  console.log(`Faces resolved: ${preview.summary.faces_resolved}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  console.log(`SVG: ${relative(root, outputSvgPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildPreview(sourcePath) {
  const geometry = analyzeIfcGeometry(sourcePath);
  const elements = geometry.proxies.map((proxy) => elementGeometry(proxy, geometry));
  const elementsWithGeometry = elements.filter((element) => element.has_geometry_bbox);
  const globalBounds = combineBounds(elementsWithGeometry.map((element) => element.geometry_bbox).filter(Boolean));
  const summary = summarize(geometry, elements, globalBounds);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-ifc-geometry-preview',
    project_id: readProjectId(),
    status: summary.elements_with_geometry_bbox > 0 ? 'ifc_geometry_preview_ready_for_human_review' : 'no_ifc_geometry_preview',
    rights_status: 'internal_only',
    source_file: sourceFileStatus(sourcePath),
    preview_svg_path: relative(projectRoot, outputSvgPath),
    engine: {
      name: 'kosmo_step_geometry_preview',
      ifcopenshell_available: false,
      note: 'Read-only STEP geometry preview. This resolves faceted BREP bounds and top projection but does not import editable BIM geometry.'
    },
    policy: {
      preview_does_not_approve_design_generation: true,
      preview_does_not_modify_context_selection: true,
      preview_is_not_a_bim_import: true,
      geometry_must_be_human_reviewed_before_design_seed: true
    },
    summary,
    global_bounds: globalBounds,
    distributions: {
      face_count_top: topCounts(countBy(elementsWithGeometry, (element) => bucketFaceCount(element.face_count)), 12),
      height_top: topCounts(countBy(elementsWithGeometry, (element) => bucketHeight(element.geometry_bbox)), 12),
      area_top: topCounts(countBy(elementsWithGeometry, (element) => bucketArea(element.geometry_bbox)), 12)
    },
    element_sample: elementsWithGeometry.slice(0, 24),
    elements,
    next_actions: nextActions(summary)
  };
}

function analyzeIfcGeometry(pathname) {
  if (!existsSync(pathname)) return emptyGeometry();

  const content = readFileSync(pathname, 'utf8');
  const entityCounts = {};
  const points = new Map();
  const polyLoops = new Map();
  const faceOuterBoundToLoop = new Map();
  const faceToLoops = new Map();
  const shellToFaces = new Map();
  const brepToShell = new Map();
  const shapeRepresentationToItems = new Map();
  const productShapeToRepresentations = new Map();
  const localPlacements = new Map();
  const axisPlacements = new Map();
  const proxies = [];
  const pattern = /#(\d+)\s*=\s*(IFC[A-Z0-9_]+)\s*\(([\s\S]*?)\);/g;
  let match;
  let totalEntities = 0;

  while ((match = pattern.exec(content)) !== null) {
    const id = Number(match[1]);
    const type = match[2];
    const argsText = match[3];
    entityCounts[type] = (entityCounts[type] || 0) + 1;
    totalEntities += 1;

    if (type === 'IFCCARTESIANPOINT') points.set(id, parseCartesianPoint(argsText));
    else if (type === 'IFCPOLYLOOP') polyLoops.set(id, refsIn(argsText));
    else if (type === 'IFCFACEOUTERBOUND') faceOuterBoundToLoop.set(id, firstRef(argsText));
    else if (type === 'IFCFACE') faceToLoops.set(id, refsIn(argsText).map((ref) => faceOuterBoundToLoop.get(ref)).filter(Boolean));
    else if (type === 'IFCOPENSHELL') shellToFaces.set(id, refsIn(argsText));
    else if (type === 'IFCFACETEDBREP') brepToShell.set(id, firstRef(argsText));
    else if (type === 'IFCSHAPEREPRESENTATION') shapeRepresentationToItems.set(id, refsIn(argsText));
    else if (type === 'IFCPRODUCTDEFINITIONSHAPE') productShapeToRepresentations.set(id, refsIn(argsText));
    else if (type === 'IFCAXIS2PLACEMENT3D') axisPlacements.set(id, parseAxisPlacement(argsText));
    else if (type === 'IFCLOCALPLACEMENT') localPlacements.set(id, parseLocalPlacement(argsText));
    else if (type === 'IFCBUILDINGELEMENTPROXY') proxies.push(parseProxy(id, argsText));
  }

  return {
    exists: true,
    totalEntities,
    entityCounts,
    points,
    polyLoops,
    faceToLoops,
    shellToFaces,
    brepToShell,
    shapeRepresentationToItems,
    productShapeToRepresentations,
    localPlacements,
    axisPlacements,
    proxies
  };
}

function elementGeometry(proxy, geometry) {
  const productShapeReps = geometry.productShapeToRepresentations.get(proxy.representation_ref) || [];
  const itemRefs = productShapeReps.flatMap((repRef) => geometry.shapeRepresentationToItems.get(repRef) || []);
  const brepRefs = itemRefs.filter((ref) => geometry.brepToShell.has(ref));
  const faceRefs = brepRefs.flatMap((brepRef) => geometry.shellToFaces.get(geometry.brepToShell.get(brepRef)) || []);
  const pointRefs = [];
  let loopCount = 0;

  for (const faceRef of faceRefs) {
    const loopRefs = geometry.faceToLoops.get(faceRef) || [];
    loopCount += loopRefs.length;
    for (const loopRef of loopRefs) {
      pointRefs.push(...(geometry.polyLoops.get(loopRef) || []));
    }
  }

  const uniquePointRefs = [...new Set(pointRefs)];
  const bounds = boundsFromPointRefs(uniquePointRefs, geometry.points);
  const placement = geometry.localPlacements.get(proxy.object_placement_ref) || null;
  const axisPlacement = placement?.relative_placement_ref ? geometry.axisPlacements.get(placement.relative_placement_ref) || null : null;
  const placementOrigin = axisPlacement?.location_ref ? geometry.points.get(axisPlacement.location_ref) || null : null;

  return {
    step_id: proxy.step_id,
    global_id: proxy.global_id,
    name: proxy.name,
    object_placement_ref: proxy.object_placement_ref,
    representation_ref: proxy.representation_ref,
    product_shape_representation_count: productShapeReps.length,
    brep_count: brepRefs.length,
    face_count: faceRefs.length,
    loop_count: loopCount,
    unique_point_count: uniquePointRefs.length,
    has_geometry_bbox: Boolean(bounds),
    geometry_bbox: bounds,
    footprint_area_m2_estimate: bounds ? round((bounds.max[0] - bounds.min[0]) * (bounds.max[1] - bounds.min[1])) : 0,
    height_m_estimate: bounds ? round(bounds.max[2] - bounds.min[2]) : 0,
    placement_origin: placementOrigin ? placementOrigin.map(round) : null
  };
}

function summarize(geometry, elements, globalBounds) {
  const elementsWithGeometry = elements.filter((element) => element.has_geometry_bbox);
  return {
    ifc_exists: geometry.exists,
    ifc_total_entities: geometry.totalEntities,
    ifc_entity_type_count: Object.keys(geometry.entityCounts).length,
    ifcbuildingelementproxy_count: elements.length,
    elements_with_geometry_bbox: elementsWithGeometry.length,
    product_shape_representations_resolved: elements.filter((element) => element.product_shape_representation_count > 0).length,
    breps_resolved: elements.reduce((sum, element) => sum + element.brep_count, 0),
    faces_resolved: elements.reduce((sum, element) => sum + element.face_count, 0),
    unique_points_resolved_sum: elements.reduce((sum, element) => sum + element.unique_point_count, 0),
    global_width_m_estimate: globalBounds ? round(globalBounds.max[0] - globalBounds.min[0]) : 0,
    global_depth_m_estimate: globalBounds ? round(globalBounds.max[1] - globalBounds.min[1]) : 0,
    global_height_m_estimate: globalBounds ? round(globalBounds.max[2] - globalBounds.min[2]) : 0,
    preview_svg_written: true,
    design_seed_approved: false,
    recommended_next_step: elementsWithGeometry.length
      ? 'human_review_ifc_geometry_preview_against_context_sources'
      : 'provide_ifc_with_resolvable_faceted_brep_geometry'
  };
}

function renderMarkdown(preview) {
  const lines = [
    '# IFC Geometry Preview',
    '',
    `Project ID: \`${preview.project_id}\``,
    `Generated: ${preview.generated_at}`,
    `Status: \`${preview.status}\``,
    '',
    'Read-only faceted BREP preview. This does not approve design generation.',
    '',
    '## Summary',
    '',
    `- IFC file: \`${preview.source_file.path}\``,
    `- SVG preview: \`${preview.preview_svg_path}\``,
    `- total entities: ${preview.summary.ifc_total_entities}`,
    `- IFCBUILDINGELEMENTPROXY: ${preview.summary.ifcbuildingelementproxy_count}`,
    `- elements with geometry bbox: ${preview.summary.elements_with_geometry_bbox}`,
    `- product shape reps resolved: ${preview.summary.product_shape_representations_resolved}`,
    `- BREPs resolved: ${preview.summary.breps_resolved}`,
    `- faces resolved: ${preview.summary.faces_resolved}`,
    `- global width estimate: ${preview.summary.global_width_m_estimate} m`,
    `- global depth estimate: ${preview.summary.global_depth_m_estimate} m`,
    `- global height estimate: ${preview.summary.global_height_m_estimate} m`,
    `- design seed approved: ${preview.summary.design_seed_approved ? 'yes' : 'no'}`,
    '',
    '## Element Sample',
    '',
    '| STEP | Name | Faces | Points | Footprint bbox | Height |',
    '| ---: | --- | ---: | ---: | ---: | ---: |'
  ];

  for (const element of preview.element_sample) {
    lines.push(`| #${element.step_id} | ${escapePipe(element.name || '-')} | ${element.face_count} | ${element.unique_point_count} | ${element.footprint_area_m2_estimate} | ${element.height_m_estimate} |`);
  }

  lines.push('', '## Next Actions', '');
  for (const action of preview.next_actions) lines.push(`- ${action}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderSvg(preview) {
  const width = 1400;
  const height = 1000;
  const margin = 72;
  const bounds = preview.global_bounds;
  if (!bounds) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="IFC geometry preview unavailable">
  <rect width="${width}" height="${height}" fill="#101820"/>
  <text x="${margin}" y="${margin}" fill="#dce8ef" font-family="Arial, sans-serif" font-size="28">IFC Geometry Preview</text>
  <text x="${margin}" y="${margin + 44}" fill="#8fb3c6" font-family="Arial, sans-serif" font-size="18">No resolvable faceted BREP geometry found.</text>
</svg>
`;
  }

  const spanX = Math.max(1, bounds.max[0] - bounds.min[0]);
  const spanY = Math.max(1, bounds.max[1] - bounds.min[1]);
  const scale = Math.min((width - margin * 2) / spanX, (height - margin * 2) / spanY);
  const mapX = (x) => margin + (x - bounds.min[0]) * scale;
  const mapY = (y) => height - margin - (y - bounds.min[1]) * scale;
  const elements = preview.elements
    .filter((element) => element.geometry_bbox)
    .sort((a, b) => (b.footprint_area_m2_estimate || 0) - (a.footprint_area_m2_estimate || 0));
  const maxHeight = Math.max(...elements.map((element) => element.height_m_estimate || 0), 1);
  const rects = elements.map((element) => {
    const bbox = element.geometry_bbox;
    const x = mapX(bbox.min[0]);
    const y = mapY(bbox.max[1]);
    const w = Math.max(1, (bbox.max[0] - bbox.min[0]) * scale);
    const h = Math.max(1, (bbox.max[1] - bbox.min[1]) * scale);
    const hue = Math.round(190 + 120 * ((element.height_m_estimate || 0) / maxHeight));
    return `  <rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="hsl(${hue}, 76%, 58%)" fill-opacity="0.24" stroke="hsl(${hue}, 88%, 70%)" stroke-width="1"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="IFC geometry top projection preview">
  <rect width="${width}" height="${height}" fill="#101820"/>
  <rect x="${margin}" y="${margin}" width="${round(spanX * scale)}" height="${round(spanY * scale)}" fill="none" stroke="#456677" stroke-width="1"/>
${rects.join('\n')}
  <text x="${margin}" y="34" fill="#dce8ef" font-family="Arial, sans-serif" font-size="24">IFC Geometry Preview - Top Projection</text>
  <text x="${margin}" y="60" fill="#8fb3c6" font-family="Arial, sans-serif" font-size="14">${preview.summary.elements_with_geometry_bbox} elements, ${preview.summary.faces_resolved} faces, ${preview.summary.global_width_m_estimate}m x ${preview.summary.global_depth_m_estimate}m</text>
  <text x="${margin}" y="${height - 26}" fill="#8fb3c6" font-family="Arial, sans-serif" font-size="14">Read-only preview. Not a BIM import. Not approved as design seed.</text>
</svg>
`;
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = ensureItem(manifest.outputs, 'design/ifc-geometry-preview.generated.json', {
      path: 'design/ifc-geometry-preview.generated.json',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Read-only IFC faceted BREP geometry preview before design-seed review.'
    });
    didChange = ensureItem(manifest.outputs, 'design/ifc-geometry-preview.generated.md', {
      path: 'design/ifc-geometry-preview.generated.md',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Human-readable IFC geometry preview before design-seed review.'
    }) || didChange;
    didChange = ensureItem(manifest.outputs, 'viz/previews/ifc-geometry-preview.svg', {
      path: 'viz/previews/ifc-geometry-preview.svg',
      type: 'viz_preview',
      module: 'viz',
      rights_status: 'generated_needs_review',
      description: 'SVG top projection preview of IFC faceted BREP element bounds.'
    }) || didChange;
    if (didChange) {
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      changed.push(manifestPath);
    }
  }

  const exportManifestPath = join(projectRoot, 'publish/export-manifest.json');
  if (existsSync(exportManifestPath)) {
    const exportManifest = readJson(exportManifestPath);
    if (!Array.isArray(exportManifest.exports)) exportManifest.exports = [];
    let didChange = ensureItem(exportManifest.exports, 'design/ifc-geometry-preview.generated.json', {
      path: 'design/ifc-geometry-preview.generated.json',
      module: 'Kosmo Design',
      format: 'json',
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    });
    didChange = ensureItem(exportManifest.exports, 'design/ifc-geometry-preview.generated.md', {
      path: 'design/ifc-geometry-preview.generated.md',
      module: 'Kosmo Design',
      format: 'markdown',
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    }) || didChange;
    didChange = ensureItem(exportManifest.exports, 'viz/previews/ifc-geometry-preview.svg', {
      path: 'viz/previews/ifc-geometry-preview.svg',
      module: 'Kosmo Viz',
      format: 'svg',
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    }) || didChange;
    if (didChange) {
      await writeFile(exportManifestPath, `${JSON.stringify(exportManifest, null, 2)}\n`, 'utf8');
      changed.push(exportManifestPath);
    }
  }

  return changed;
}

function parseProxy(id, argsText) {
  const args = splitStepArgs(argsText);
  return {
    step_id: id,
    global_id: decodeStepString(args[0]),
    name: decodeStepString(args[2]),
    object_placement_ref: firstRef(args[5]),
    representation_ref: firstRef(args[6])
  };
}

function parseLocalPlacement(argsText) {
  const args = splitStepArgs(argsText);
  return {
    placement_rel_to_ref: firstRef(args[0]),
    relative_placement_ref: firstRef(args[1])
  };
}

function parseAxisPlacement(argsText) {
  const args = splitStepArgs(argsText);
  return {
    location_ref: firstRef(args[0]),
    axis_ref: firstRef(args[1]),
    ref_direction_ref: firstRef(args[2])
  };
}

function parseCartesianPoint(argsText) {
  const values = [...argsText.matchAll(/[-+]?(?:\d+\.\d*|\d*\.\d+|\d+)(?:[Ee][-+]?\d+)?/g)].map((match) => Number(match[0]));
  return [values[0] || 0, values[1] || 0, values[2] || 0];
}

function boundsFromPointRefs(pointRefs, points) {
  let bounds = null;
  for (const ref of pointRefs) {
    const point = points.get(ref);
    if (!point) continue;
    bounds ||= { min: [...point], max: [...point] };
    for (let index = 0; index < 3; index += 1) {
      bounds.min[index] = Math.min(bounds.min[index], point[index]);
      bounds.max[index] = Math.max(bounds.max[index], point[index]);
    }
  }
  return bounds ? { min: bounds.min.map(round), max: bounds.max.map(round) } : null;
}

function combineBounds(boundsList) {
  let combined = null;
  for (const bounds of boundsList) {
    if (!bounds) continue;
    combined ||= { min: [...bounds.min], max: [...bounds.max] };
    for (let index = 0; index < 3; index += 1) {
      combined.min[index] = Math.min(combined.min[index], bounds.min[index]);
      combined.max[index] = Math.max(combined.max[index], bounds.max[index]);
    }
  }
  return combined ? { min: combined.min.map(round), max: combined.max.map(round) } : null;
}

function nextActions(summary) {
  if (!summary.ifc_exists) return ['Add or register a local IFC source file.'];
  if (!summary.elements_with_geometry_bbox) return ['Use Bonsai/IfcOpenShell or provide IFC faceted BREP geometry for visual review.'];
  return [
    'Open the SVG preview and compare the top projection with DXF context and IFC bounds.',
    'Review outlier extents, units and origin before considering any semantic IFC design-seed change.',
    'Keep context-selection approved_for_design_generation=false until a human verifies geometry and semantic classes.'
  ];
}

function resolveIfcPath(sourceRegistry) {
  const sources = sourceRegistry?.sources || [];
  const source = sources.find((item) => item.type === 'ifc' && item.path);
  return join(projectRoot, source?.path || 'data/source-files/Bestand_Kontext.ifc');
}

function sourceFileStatus(pathname) {
  return {
    path: relative(projectRoot, pathname),
    name: basename(pathname),
    exists: existsSync(pathname),
    size_bytes: existsSync(pathname) ? statSync(pathname).size : 0
  };
}

function emptyGeometry() {
  return {
    exists: false,
    totalEntities: 0,
    entityCounts: {},
    points: new Map(),
    polyLoops: new Map(),
    faceToLoops: new Map(),
    shellToFaces: new Map(),
    brepToShell: new Map(),
    shapeRepresentationToItems: new Map(),
    productShapeToRepresentations: new Map(),
    localPlacements: new Map(),
    axisPlacements: new Map(),
    proxies: []
  };
}

function countBy(items, getter) {
  const counts = {};
  for (const item of items) {
    const value = getter(item);
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function topCounts(counts, limit) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function bucketFaceCount(value) {
  if (value < 64) return '<64';
  if (value < 256) return '64-255';
  if (value < 1024) return '256-1023';
  if (value < 4096) return '1024-4095';
  return '4096+';
}

function bucketHeight(bounds) {
  if (!bounds) return 'none';
  const height = bounds.max[2] - bounds.min[2];
  if (height < 3) return '<3m';
  if (height < 8) return '3-8m';
  if (height < 20) return '8-20m';
  return '20m+';
}

function bucketArea(bounds) {
  if (!bounds) return 'none';
  const area = (bounds.max[0] - bounds.min[0]) * (bounds.max[1] - bounds.min[1]);
  if (area < 25) return '<25m2';
  if (area < 100) return '25-100m2';
  if (area < 500) return '100-500m2';
  return '500m2+';
}

function splitStepArgs(text) {
  const args = [];
  let current = '';
  let depth = 0;
  let inString = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "'") {
      current += char;
      if (inString && next === "'") {
        current += next;
        index += 1;
      } else {
        inString = !inString;
      }
      continue;
    }
    if (!inString) {
      if (char === '(') depth += 1;
      if (char === ')') depth = Math.max(0, depth - 1);
      if (char === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
        continue;
      }
    }
    current += char;
  }
  if (current.trim() || text.endsWith(',')) args.push(current.trim());
  return args;
}

function refsIn(value) {
  if (!value || value === '$' || value === '*') return [];
  return [...String(value).matchAll(/#(\d+)/g)].map((match) => Number(match[1]));
}

function firstRef(value) {
  return refsIn(value)[0] || null;
}

function decodeStepString(value) {
  if (!value || value === '$' || value === '*') return null;
  const trimmed = String(value).trim();
  if (!trimmed.startsWith("'") || !trimmed.endsWith("'")) return trimmed.replace(/^\./, '').replace(/\.$/, '') || null;
  return trimmed.slice(1, -1).replace(/''/g, "'") || null;
}

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
}

function readProjectId() {
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (!existsSync(manifestPath)) return basename(projectRoot);
  return readJson(manifestPath).project_id || basename(projectRoot);
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function escapePipe(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
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
