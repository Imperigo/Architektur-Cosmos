#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const semanticPath = join(projectRoot, args.semantic || 'design/ifc-semantic-proof.generated.json');
const geometryPath = join(projectRoot, args.geometry || 'design/ifc-geometry-preview.generated.json');
const outputJsonPath = join(projectRoot, args.output || 'design/ifc-layer-plan.generated.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/ifc-layer-plan.generated.md');
const outputSvgPath = join(projectRoot, args.svg || 'viz/previews/ifc-layer-plan.svg');
const blenderProfilePath = join(projectRoot, args.blender || 'design/blender-layer-profile.generated.json');
const archicadProfilePath = join(projectRoot, args.archicad || 'design/archicad-layer-profile.generated.json');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const semantic = existsSync(semanticPath) ? readJson(semanticPath) : null;
  const geometry = existsSync(geometryPath) ? readJson(geometryPath) : null;
  const layerPlan = buildLayerPlan({ semantic, geometry });
  const blenderProfile = buildBlenderProfile(layerPlan);
  const archicadProfile = buildArchicadProfile(layerPlan);

  for (const path of [outputJsonPath, outputMdPath, outputSvgPath, blenderProfilePath, archicadProfilePath]) {
    await mkdir(dirname(path), { recursive: true });
  }
  await writeFile(outputJsonPath, `${JSON.stringify(layerPlan, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(layerPlan), 'utf8');
  await writeFile(outputSvgPath, renderSvg(layerPlan), 'utf8');
  await writeFile(blenderProfilePath, `${JSON.stringify(blenderProfile, null, 2)}\n`, 'utf8');
  await writeFile(archicadProfilePath, `${JSON.stringify(archicadProfile, null, 2)}\n`, 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo IFC layer plan generated');
  console.log(`Project: ${layerPlan.project_id}`);
  console.log(`Status: ${layerPlan.status}`);
  console.log(`Elements: ${layerPlan.summary.ifc_element_count}`);
  console.log(`Layer groups: ${layerPlan.summary.layer_group_count}`);
  console.log(`Material groups: ${layerPlan.summary.material_group_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  console.log(`SVG: ${relative(root, outputSvgPath)}`);
  console.log(`Blender profile: ${relative(root, blenderProfilePath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildLayerPlan({ semantic, geometry }) {
  const semanticByStep = new Map((semantic?.elements || []).map((element) => [element.step_id, element]));
  const semanticByGlobalId = new Map((semantic?.elements || []).map((element) => [element.global_id, element]).filter((row) => row[0]));
  const geometryElements = Array.isArray(geometry?.elements) ? geometry.elements : [];
  const elements = geometryElements
    .filter((element) => element.has_geometry_bbox)
    .map((geometryElement) => {
      const semanticElement = semanticByStep.get(geometryElement.step_id) || semanticByGlobalId.get(geometryElement.global_id) || null;
      return classifyElement({ geometryElement, semanticElement });
    });
  const layerGroups = buildLayerGroups(elements);
  const materialGroups = layerGroups.filter((group) => group.layer_type === 'material');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-ifc-layer-plan',
    project_id: readProjectId(),
    status: elements.length ? 'ifc_layer_plan_ready_for_human_review' : 'no_ifc_layer_plan',
    rights_status: 'internal_only',
    source_files: {
      semantic_proof: sourceFileStatus(semanticPath),
      geometry_preview: sourceFileStatus(geometryPath)
    },
    preview_svg_path: relative(projectRoot, outputSvgPath),
    blender_profile_path: relative(projectRoot, blenderProfilePath),
    archicad_profile_path: relative(projectRoot, archicadProfilePath),
    engine: {
      name: 'kosmo_ifc_layer_planner',
      note: 'Review-only layer proposal from semantic IFC proof and geometry preview. It creates no GLB and approves no design seed.'
    },
    policy: {
      layer_plan_does_not_approve_design_generation: true,
      layer_plan_does_not_generate_public_assets: true,
      human_review_required_before_blender_import: true,
      geometry_is_bbox_level_until_reviewed: true
    },
    summary: {
      semantic_proof_ready: semantic?.status === 'semantic_ifc_probe_ready_for_human_review',
      geometry_preview_ready: geometry?.status === 'ifc_geometry_preview_ready_for_human_review',
      ifc_element_count: elements.length,
      layer_group_count: layerGroups.length,
      material_group_count: materialGroups.length,
      structure_element_count: elements.filter((element) => element.layer_keys.includes('structure')).length,
      facade_element_count: elements.filter((element) => element.layer_keys.includes('facade')).length,
      mass_element_count: elements.filter((element) => element.layer_keys.includes('mass')).length,
      design_seed_approved: false,
      recommended_next_step: elements.length
        ? 'human_review_layer_plan_before_blender_or_archicad_import'
        : 'run_ifc_semantic_proof_and_ifc_geometry_preview'
    },
    layer_groups: layerGroups,
    elements,
    next_actions: nextActions(elements, layerGroups)
  };
}

function classifyElement({ geometryElement, semanticElement }) {
  const text = [
    geometryElement.name,
    geometryElement.global_id,
    semanticElement?.name,
    semanticElement?.object_type,
    semanticElement?.tag,
    ...propertyValues(semanticElement)
  ].filter(Boolean).join(' ').toLowerCase();
  const bbox = geometryElement.geometry_bbox;
  const width = bbox ? round(bbox.max[0] - bbox.min[0]) : 0;
  const depth = bbox ? round(bbox.max[1] - bbox.min[1]) : 0;
  const height = bbox ? round(bbox.max[2] - bbox.min[2]) : 0;
  const thinDimension = Math.min(width || Number.POSITIVE_INFINITY, depth || Number.POSITIVE_INFINITY);
  const materialTags = inferMaterials(text, semanticElement);
  const type = inferElementType({ text, width, depth, height, thinDimension });
  const layerKeys = inferLayerKeys(type, text, materialTags);
  const confidenceScore = confidenceFor({ semanticElement, geometryElement, materialTags, layerKeys });

  return {
    step_id: geometryElement.step_id,
    global_id: geometryElement.global_id,
    name: geometryElement.name || semanticElement?.name || `IFC element #${geometryElement.step_id}`,
    source_object_type: semanticElement?.object_type || null,
    tag: semanticElement?.tag || null,
    proposed_element_type: type,
    proposed_layer_role: layerKeys[0] || 'mass',
    layer_keys: layerKeys,
    material_tags: materialTags,
    blender_collections: layerKeys.map((key) => blenderCollectionName(key)),
    archicad_layers: layerKeys.map((key) => archicadLayerName(key)),
    geometry_bbox: bbox,
    width_m_estimate: width,
    depth_m_estimate: depth,
    height_m_estimate: height,
    face_count: geometryElement.face_count || 0,
    footprint_area_m2_estimate: geometryElement.footprint_area_m2_estimate || 0,
    semantic_container: semanticElement?.container?.label || null,
    property_sets: semanticElement?.property_sets || [],
    confidence_score: confidenceScore,
    review_status: 'generated_needs_human_layer_review',
    notes: notesFor(type, materialTags, confidenceScore)
  };
}

function inferElementType({ text, width, depth, height, thinDimension }) {
  if (/\b(column|pillar|stuetze|stütze|post|support)\b/.test(text)) return 'vertical_support';
  if (/\b(window|door|opening|fenster|tuer|tür)\b/.test(text)) return 'facade_opening';
  if (/\b(slab|deck|floor|ceiling|roof|decke|platte)\b/.test(text)) return 'horizontal_slab';
  if (/\b(wall|facade|fassade|exterior|envelope|wand)\b/.test(text)) return 'wall_or_facade';
  if (height <= 0.75 && Math.max(width, depth) >= 3) return 'horizontal_slab';
  if (height >= 2 && thinDimension <= 0.75) return 'wall_or_facade';
  return 'mass_context';
}

function inferLayerKeys(type, text, materialTags) {
  const keys = new Set();
  if (type === 'wall_or_facade') {
    keys.add('structure');
    keys.add('facade');
    keys.add('tectonic');
  } else if (type === 'horizontal_slab' || type === 'vertical_support') {
    keys.add('structure');
    keys.add('mass');
  } else if (type === 'facade_opening') {
    keys.add('facade');
    keys.add('interior');
  } else {
    keys.add('mass');
  }
  if (/\b(site|terrain|landscape|umgebung)\b/.test(text)) keys.add('site');
  for (const material of materialTags) keys.add(`material:${material}`);
  return [...keys];
}

function inferMaterials(text, semanticElement) {
  const values = propertyValues(semanticElement).join(' ').toLowerCase();
  const haystack = `${text} ${values}`;
  const materials = [];
  const rules = [
    ['concrete', /\b(concrete|beton|reinforced concrete|stahlbeton)\b/],
    ['timber', /\b(timber|wood|holz)\b/],
    ['steel', /\b(steel|stahl)\b/],
    ['stone', /\b(stone|stein|limestone|sandstone|granite|gneiss)\b/],
    ['glass', /\b(glass|glas)\b/],
    ['vegetation', /\b(vegetation|planting|pflanze|greenery)\b/]
  ];
  for (const [tag, regex] of rules) {
    if (regex.test(haystack)) materials.push(tag);
  }
  return materials.length ? [...new Set(materials)] : ['material_unknown'];
}

function propertyValues(semanticElement) {
  return (semanticElement?.property_sets || []).flatMap((propertySet) => {
    return (propertySet.properties || []).flatMap((property) => {
      const nominal = property.nominal_value;
      if (typeof nominal === 'string') return [property.name, nominal];
      if (nominal?.value) return [property.name, nominal.value];
      return [property.name].filter(Boolean);
    });
  }).filter(Boolean);
}

function confidenceFor({ semanticElement, geometryElement, materialTags, layerKeys }) {
  let score = 0.25;
  if (semanticElement) score += 0.2;
  if (semanticElement?.container) score += 0.1;
  if (semanticElement?.property_set_count > 0) score += 0.12;
  if (geometryElement.has_geometry_bbox) score += 0.18;
  if (geometryElement.face_count > 0) score += 0.08;
  if (!materialTags.includes('material_unknown')) score += 0.05;
  if (layerKeys.length > 1) score += 0.02;
  return Math.min(0.95, round(score));
}

function buildLayerGroups(elements) {
  const groups = new Map();
  for (const element of elements) {
    for (const key of element.layer_keys) {
      const group = groups.get(key) || {
        layer_key: key,
        layer_type: key.startsWith('material:') ? 'material' : key,
        title: titleForLayer(key),
        element_count: 0,
        step_ids: [],
        global_ids: [],
        blender_collection: blenderCollectionName(key),
        archicad_layer: archicadLayerName(key),
        planned_glb_path: plannedGlbPath(key),
        review_status: 'generated_needs_human_layer_review'
      };
      group.element_count += 1;
      group.step_ids.push(element.step_id);
      if (element.global_id) group.global_ids.push(element.global_id);
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => orderForLayer(a.layer_key) - orderForLayer(b.layer_key) || a.layer_key.localeCompare(b.layer_key));
}

function buildBlenderProfile(layerPlan) {
  return {
    schema_version: '0.1',
    generated_at: layerPlan.generated_at,
    generator: 'kosmo-ifc-layer-plan',
    project_id: layerPlan.project_id,
    status: layerPlan.status,
    units: 'meters',
    approved_for_import: false,
    collections: layerPlan.layer_groups.map((group) => ({
      name: group.blender_collection,
      layer_key: group.layer_key,
      element_step_ids: group.step_ids,
      planned_glb_path: group.planned_glb_path,
      review_status: group.review_status
    })),
    import_policy: {
      create_collections_only_after_human_review: true,
      keep_source_custom_properties: true,
      keep_material_layers_separate: true
    }
  };
}

function buildArchicadProfile(layerPlan) {
  return {
    schema_version: '0.1',
    generated_at: layerPlan.generated_at,
    generator: 'kosmo-ifc-layer-plan',
    project_id: layerPlan.project_id,
    status: layerPlan.status,
    approved_for_import: false,
    layers: layerPlan.layer_groups.map((group) => ({
      name: group.archicad_layer,
      layer_key: group.layer_key,
      element_step_ids: group.step_ids,
      review_status: group.review_status
    })),
    exchange_policy: {
      use_as_reference_layers_first: true,
      do_not_create_bim_elements_without_human_review: true
    }
  };
}

function renderMarkdown(layerPlan) {
  const lines = [
    '# IFC Layer Plan',
    '',
    `Project ID: \`${layerPlan.project_id}\``,
    `Generated: ${layerPlan.generated_at}`,
    `Status: \`${layerPlan.status}\``,
    '',
    'Review-only Blender/ArchiCAD layer proposal. This does not approve design generation.',
    '',
    '## Summary',
    '',
    `- IFC elements: ${layerPlan.summary.ifc_element_count}`,
    `- layer groups: ${layerPlan.summary.layer_group_count}`,
    `- material groups: ${layerPlan.summary.material_group_count}`,
    `- structure elements: ${layerPlan.summary.structure_element_count}`,
    `- facade elements: ${layerPlan.summary.facade_element_count}`,
    `- mass elements: ${layerPlan.summary.mass_element_count}`,
    `- Blender profile: \`${layerPlan.blender_profile_path}\``,
    `- ArchiCAD profile: \`${layerPlan.archicad_profile_path}\``,
    `- design seed approved: ${layerPlan.summary.design_seed_approved ? 'yes' : 'no'}`,
    '',
    '## Layer Groups',
    '',
    '| Layer | Type | Elements | Blender collection | ArchiCAD layer | Planned GLB |',
    '| --- | --- | ---: | --- | --- | --- |'
  ];

  for (const group of layerPlan.layer_groups) {
    lines.push(`| ${escapePipe(group.title)} | ${escapePipe(group.layer_type)} | ${group.element_count} | \`${escapePipe(group.blender_collection)}\` | \`${escapePipe(group.archicad_layer)}\` | \`${escapePipe(group.planned_glb_path)}\` |`);
  }

  lines.push('', '## Element Sample', '', '| STEP | Name | Type | Layers | Materials | Confidence |', '| ---: | --- | --- | --- | --- | ---: |');
  for (const element of layerPlan.elements.slice(0, 24)) {
    lines.push(`| #${element.step_id} | ${escapePipe(element.name)} | ${escapePipe(element.proposed_element_type)} | ${escapePipe(element.layer_keys.join(', '))} | ${escapePipe(element.material_tags.join(', '))} | ${element.confidence_score} |`);
  }

  lines.push('', '## Next Actions', '');
  for (const action of layerPlan.next_actions) lines.push(`- ${action}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderSvg(layerPlan) {
  const width = 1400;
  const height = 1000;
  const margin = 72;
  const bboxes = layerPlan.elements.map((element) => element.geometry_bbox).filter(Boolean);
  const bounds = combineBounds(bboxes);
  if (!bounds) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="IFC layer plan unavailable">
  <rect width="${width}" height="${height}" fill="#101820"/>
  <text x="${margin}" y="${margin}" fill="#dce8ef" font-family="Arial, sans-serif" font-size="28">IFC Layer Plan</text>
  <text x="${margin}" y="${margin + 44}" fill="#8fb3c6" font-family="Arial, sans-serif" font-size="18">No IFC layer plan geometry found.</text>
</svg>
`;
  }
  const spanX = Math.max(1, bounds.max[0] - bounds.min[0]);
  const spanY = Math.max(1, bounds.max[1] - bounds.min[1]);
  const scale = Math.min((width - margin * 2) / spanX, (height - margin * 2) / spanY);
  const mapX = (x) => margin + (x - bounds.min[0]) * scale;
  const mapY = (y) => height - margin - (y - bounds.min[1]) * scale;
  const rects = layerPlan.elements.map((element) => {
    const bbox = element.geometry_bbox;
    const x = mapX(bbox.min[0]);
    const y = mapY(bbox.max[1]);
    const w = Math.max(1, (bbox.max[0] - bbox.min[0]) * scale);
    const h = Math.max(1, (bbox.max[1] - bbox.min[1]) * scale);
    const color = colorForLayer(element.proposed_layer_role);
    return `  <rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="${color}" fill-opacity="0.28" stroke="${color}" stroke-width="2">
    <title>${escapeXml(element.name)} / ${escapeXml(element.layer_keys.join(', '))}</title>
  </rect>`;
  });
  const legend = layerPlan.layer_groups.slice(0, 10).map((group, index) => {
    const y = 98 + index * 24;
    return `  <rect x="${width - 360}" y="${y - 12}" width="14" height="14" fill="${colorForLayer(group.layer_key)}" fill-opacity="0.7"/>
  <text x="${width - 338}" y="${y}" fill="#dce8ef" font-family="Arial, sans-serif" font-size="13">${escapeXml(group.title)} (${group.element_count})</text>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="IFC layer plan top projection">
  <rect width="${width}" height="${height}" fill="#101820"/>
  <rect x="${margin}" y="${margin}" width="${round(spanX * scale)}" height="${round(spanY * scale)}" fill="none" stroke="#456677" stroke-width="1"/>
${rects.join('\n')}
  <text x="${margin}" y="34" fill="#dce8ef" font-family="Arial, sans-serif" font-size="24">IFC Layer Plan - Blender/ArchiCAD Review</text>
  <text x="${margin}" y="60" fill="#8fb3c6" font-family="Arial, sans-serif" font-size="14">${layerPlan.summary.ifc_element_count} elements, ${layerPlan.summary.layer_group_count} layer groups, review-only</text>
${legend}
  <text x="${margin}" y="${height - 26}" fill="#8fb3c6" font-family="Arial, sans-serif" font-size="14">Generated from semantic proof + geometry preview. Not a BIM import. Not approved as design seed.</text>
</svg>
`;
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
    outputItem('design/ifc-layer-plan.generated.json', 'other', 'design', 'Kosmo Design', 'json', 'Read-only IFC element layer plan for Blender/ArchiCAD review.'),
    outputItem('design/ifc-layer-plan.generated.md', 'other', 'design', 'Kosmo Design', 'markdown', 'Human-readable IFC element layer plan for Blender/ArchiCAD review.'),
    outputItem('design/blender-layer-profile.generated.json', 'other', 'design', 'Kosmo Design', 'json', 'Review-only Blender collection profile derived from the IFC layer plan.'),
    outputItem('design/archicad-layer-profile.generated.json', 'other', 'design', 'Kosmo Design', 'json', 'Review-only ArchiCAD layer profile derived from the IFC layer plan.'),
    outputItem('viz/previews/ifc-layer-plan.svg', 'render_preview', 'viz', 'Kosmo Viz', 'svg', 'SVG top projection preview of IFC layer assignments.')
  ];
}

function outputItem(path, type, module, exportModule, format, description) {
  return {
    path,
    manifest: {
      path,
      type,
      module,
      rights_status: 'generated_needs_review',
      description
    },
    exportManifest: {
      path,
      module: exportModule,
      format,
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    }
  };
}

function notesFor(type, materialTags, confidenceScore) {
  const notes = [`Heuristic IFC layer assignment: ${type}.`];
  if (materialTags.includes('material_unknown')) notes.push('Material remains unknown until property values or human review confirm it.');
  if (confidenceScore < 0.75) notes.push('Review geometry class before exporting model layers.');
  return notes;
}

function nextActions(elements, layerGroups) {
  if (!elements.length) return ['Run semantic proof and geometry preview before layer planning.'];
  return [
    'Open the layer-plan SVG and compare layer roles against the IFC viewer.',
    'Human-review wall/slab/support classifications before Blender or ArchiCAD import.',
    `Prepare ${layerGroups.length} review-only collections/layers, but keep approved_for_import=false.`,
    'Only after review: generate GLB layer exports and Blender collections from approved layer keys.'
  ];
}

function plannedGlbPath(layerKey) {
  const projectId = readProjectId();
  if (layerKey.startsWith('material:')) return `models/${projectId}/materials/${slugify(layerKey.slice('material:'.length))}.glb`;
  return `models/${projectId}/${slugify(layerKey)}.glb`;
}

function blenderCollectionName(layerKey) {
  return `KOSMO_${slugify(readProjectId()).replace(/-/g, '_')}_${slugify(layerKey).replace(/-/g, '_')}`.toUpperCase();
}

function archicadLayerName(layerKey) {
  return `KOSMO_${slugify(readProjectId()).replace(/-/g, '_')}_${slugify(layerKey).replace(/-/g, '_')}`.toUpperCase();
}

function titleForLayer(layerKey) {
  if (layerKey.startsWith('material:')) return `Material ${layerKey.slice('material:'.length).replace(/_/g, ' ')}`;
  return layerKey.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function orderForLayer(layerKey) {
  const order = ['site', 'mass', 'structure', 'facade', 'interior', 'tectonic'];
  const index = order.indexOf(layerKey);
  if (index >= 0) return index;
  if (layerKey.startsWith('material:')) return 20;
  return 40;
}

function colorForLayer(layerKey) {
  if (layerKey.startsWith('material:')) return '#f2c94c';
  return {
    site: '#6ee7b7',
    mass: '#93c5fd',
    structure: '#f97316',
    facade: '#e879f9',
    interior: '#c4b5fd',
    tectonic: '#facc15'
  }[layerKey] || '#7dd3fc';
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

function sourceFileStatus(pathname) {
  return {
    path: relative(projectRoot, pathname),
    exists: existsSync(pathname),
    name: basename(pathname),
    size_bytes: existsSync(pathname) ? readFileSync(pathname).length : 0
  };
}

function readProjectId() {
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (!existsSync(manifestPath)) return basename(projectRoot);
  return readJson(manifestPath).project_id || basename(projectRoot);
}

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function slugify(value) {
  return String(value || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9:]+/g, '-')
    .replace(/:/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'unknown';
}

function escapePipe(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
