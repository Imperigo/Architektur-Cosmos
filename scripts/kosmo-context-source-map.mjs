#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const outputJsonPath = join(projectRoot, args.output || 'design/context-source-map.generated.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/context-source-map.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const sourceRegistry = existsSync(join(projectRoot, 'data/sources.json')) ? readJson(join(projectRoot, 'data/sources.json')) : null;
  const sourcePaths = resolveSourcePaths(sourceRegistry);
  const dxf = analyzeDxf(sourcePaths.dxf);
  const ifc = analyzeIfc(sourcePaths.ifc);
  const sourceMap = buildSourceMap({ dxf, ifc, sourcePaths });

  await mkdir(dirname(outputJsonPath), { recursive: true });
  await mkdir(dirname(outputMdPath), { recursive: true });
  await writeFile(outputJsonPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(sourceMap), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo context source map generated');
  console.log(`Project: ${sourceMap.project_id}`);
  console.log(`DXF layers: ${sourceMap.summary.dxf_layer_count}`);
  console.log(`IFC entity types: ${sourceMap.summary.ifc_entity_type_count}`);
  console.log(`Design-seed candidates after review: ${sourceMap.summary.design_seed_candidate_after_review_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildSourceMap({ dxf, ifc, sourcePaths }) {
  const dxfRows = dxf.layers.map((layer) => {
    const role = classifyDxfLayer(layer.name);
    return {
      id: `dxf-layer-${slugify(layer.name)}`,
      source_kind: 'dxf_layer',
      source_file: sourceFileStatus(sourcePaths.dxf),
      name: layer.name,
      entity_count: layer.entity_count,
      polyline_count: layer.polyline_count,
      vertex_hint_count: layer.vertex_hint_count,
      coverage: dxf.totalPolylines > 0 ? round(layer.polyline_count / dxf.totalPolylines) : null,
      entity_types: layer.entity_types,
      proposed_role: role.role,
      mapping_status: role.status,
      design_seed_candidate_after_review: role.designSeedCandidate,
      required_review: role.requiredReview,
      notes: role.notes
    };
  });

  const ifcRows = Object.entries(ifc.entityCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => {
      const role = classifyIfcType(type);
      return {
        id: `ifc-type-${type.toLowerCase()}`,
        source_kind: 'ifc_entity_type',
        source_file: sourceFileStatus(sourcePaths.ifc),
        name: type,
        entity_count: count,
        proposed_role: role.role,
        mapping_status: role.status,
        design_seed_candidate_after_review: role.designSeedCandidate,
        required_review: role.requiredReview,
        notes: role.notes
      };
    });

  const rows = [...dxfRows, ...ifcRows];
  const designSeedCandidates = rows.filter((row) => row.design_seed_candidate_after_review);
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-context-source-map',
    project_id: readProjectId(),
    status: 'generated_needs_review',
    rights_status: 'internal_only',
    note: 'Source map is an inventory and recommendation layer. It does not approve design generation or change context-selection decisions.',
    policy: {
      source_map_is_advisory: true,
      layer_mapping_requires_human_review: true,
      ifc_design_seed_requires_semantic_import_review: true,
      approved_for_design_generation_is_never_set_by_source_map: true
    },
    summary: {
      dxf_exists: dxf.exists,
      dxf_total_entities: dxf.totalEntities,
      dxf_total_polylines: dxf.totalPolylines,
      dxf_layer_count: dxf.layers.length,
      ifc_exists: ifc.exists,
      ifc_total_entities: ifc.totalEntities,
      ifc_entity_type_count: Object.keys(ifc.entityCounts).length,
      ifc_semantic_building_element_count: countSemanticIfcElements(ifc.entityCounts),
      design_seed_candidate_after_review_count: designSeedCandidates.length,
      recommended_next_step: designSeedCandidates.length
        ? 'review_layer_mapping_and_semantic_ifc_import_before_design_seed'
        : 'use_sources_as_context_reference_only'
    },
    dxf: {
      source_file: sourceFileStatus(sourcePaths.dxf),
      total_entities: dxf.totalEntities,
      total_polylines: dxf.totalPolylines,
      top_layers: dxfRows.slice(0, 12)
    },
    ifc: {
      source_file: sourceFileStatus(sourcePaths.ifc),
      total_entities: ifc.totalEntities,
      top_entity_types: ifcRows.slice(0, 24),
      semantic_entity_types: ifcRows.filter((row) => row.proposed_role === 'semantic_building_element')
    },
    rows
  };
}

function analyzeDxf(pathname) {
  if (!existsSync(pathname)) {
    return { exists: false, totalEntities: 0, totalPolylines: 0, layers: [] };
  }

  const lines = readFileSync(pathname, 'utf8').split(/\r?\n/);
  const layers = new Map();
  let currentType = null;
  let currentLayer = null;
  let currentVertexHints = 0;
  let totalEntities = 0;
  let totalPolylines = 0;

  const flushEntity = () => {
    if (!currentType || ['SECTION', 'ENDSEC', 'EOF'].includes(currentType)) return;
    const layerName = currentLayer || '0';
    const layer = getLayer(layers, layerName);
    layer.entity_count += 1;
    layer.entity_types[currentType] = (layer.entity_types[currentType] || 0) + 1;
    layer.vertex_hint_count += currentVertexHints;
    totalEntities += 1;
    if (['LWPOLYLINE', 'POLYLINE'].includes(currentType)) {
      layer.polyline_count += 1;
      totalPolylines += 1;
    }
  };

  for (let index = 0; index < lines.length - 1; index += 2) {
    const code = lines[index].trim();
    const value = lines[index + 1].trim();
    if (code === '0') {
      flushEntity();
      currentType = value;
      currentLayer = null;
      currentVertexHints = 0;
    } else if (code === '8') {
      currentLayer = value;
    } else if (code === '10') {
      currentVertexHints += 1;
    }
  }
  flushEntity();

  return {
    exists: true,
    totalEntities,
    totalPolylines,
    layers: [...layers.values()].sort((a, b) => b.polyline_count - a.polyline_count || b.entity_count - a.entity_count)
  };
}

function getLayer(layers, name) {
  if (!layers.has(name)) {
    layers.set(name, {
      name,
      entity_count: 0,
      polyline_count: 0,
      vertex_hint_count: 0,
      entity_types: {}
    });
  }
  return layers.get(name);
}

function analyzeIfc(pathname) {
  if (!existsSync(pathname)) return { exists: false, totalEntities: 0, entityCounts: {} };
  const content = readFileSync(pathname, 'utf8');
  const entityCounts = {};
  const pattern = /#\d+\s*=\s*(IFC[A-Z0-9_]+)/g;
  let match;
  let totalEntities = 0;
  while ((match = pattern.exec(content)) !== null) {
    const type = match[1];
    entityCounts[type] = (entityCounts[type] || 0) + 1;
    totalEntities += 1;
  }
  return { exists: true, totalEntities, entityCounts };
}

function classifyDxfLayer(name) {
  const lower = name.toLowerCase();
  if (lower.includes('gebaeude') || lower.includes('gebäude') || lower.includes('building')) {
    return {
      role: 'existing_building_context',
      status: 'candidate_context_layer_needs_review',
      designSeedCandidate: false,
      requiredReview: 'verify_layer_semantics_and_clean_geometry',
      notes: ['Dominant building/context layer candidate.', 'Use as context reference until cleaned and reviewed.']
    };
  }
  if (lower.includes('legende') || lower.includes('legend')) {
    return {
      role: 'drawing_legend_or_annotation',
      status: 'reject_for_design_mapping',
      designSeedCandidate: false,
      requiredReview: 'none_unless_needed_as_annotation_reference',
      notes: ['Likely legend or annotation layer.']
    };
  }
  if (lower.includes('rahmen') || lower.includes('frame')) {
    return {
      role: 'drawing_frame',
      status: 'reject_for_design_mapping',
      designSeedCandidate: false,
      requiredReview: 'none_unless_needed_as_sheet_reference',
      notes: ['Likely drawing frame layer.']
    };
  }
  return {
    role: 'unclassified_dxf_layer',
    status: 'needs_human_mapping',
    designSeedCandidate: false,
    requiredReview: 'classify_layer_before_use',
    notes: ['Layer name does not map to a known Kosmo context role.']
  };
}

function classifyIfcType(type) {
  if (['IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY'].includes(type)) {
    return {
      role: 'project_structure',
      status: 'accepted_as_context_metadata_candidate',
      designSeedCandidate: false,
      requiredReview: 'verify_ifc_project_hierarchy',
      notes: ['Useful for source/project hierarchy, not geometry seed.']
    };
  }
  if (semanticIfcElementTypes().includes(type)) {
    return {
      role: 'semantic_building_element',
      status: 'semantic_ifc_import_required',
      designSeedCandidate: true,
      requiredReview: 'import_semantically_and_verify_elements',
      notes: ['Potential design/context seed only after semantic IFC import and human review.']
    };
  }
  if (['IFCPRODUCTDEFINITIONSHAPE', 'IFCSHAPEREPRESENTATION', 'IFCFACETEDBREP', 'IFCPOLYLOOP', 'IFCFACE', 'IFCFACEOUTERBOUND', 'IFCCARTESIANPOINT'].includes(type)) {
    return {
      role: 'geometry_representation',
      status: 'context_geometry_reference_only',
      designSeedCandidate: false,
      requiredReview: 'use_through_semantic_parent_elements',
      notes: ['Geometry representation data should be interpreted through semantic parent elements.']
    };
  }
  if (['IFCPROPERTYSET', 'IFCPROPERTYSINGLEVALUE', 'IFCRELDEFINESBYPROPERTIES'].includes(type)) {
    return {
      role: 'source_metadata',
      status: 'accepted_as_context_metadata_candidate',
      designSeedCandidate: false,
      requiredReview: 'review_properties_before_claims',
      notes: ['Useful as metadata/reference, not direct geometry.']
    };
  }
  return {
    role: 'ifc_support_or_unclassified',
    status: 'context_metadata_or_support',
    designSeedCandidate: false,
    requiredReview: 'review_only_if_needed',
    notes: ['Support entity or unclassified IFC entity type.']
  };
}

function resolveSourcePaths(sourceRegistry) {
  const sources = sourceRegistry?.sources || [];
  const byType = (type, fallback) => {
    const source = sources.find((item) => item.type === type && item.path);
    return join(projectRoot, source?.path || fallback);
  };
  return {
    dxf: byType('dxf', 'data/source-files/Plangrundlage.dxf'),
    ifc: byType('ifc', 'data/source-files/Bestand_Kontext.ifc')
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

function renderMarkdown(sourceMap) {
  const lines = [
    '# Context Source Map',
    '',
    `Project ID: \`${sourceMap.project_id}\``,
    `Generated: ${sourceMap.generated_at}`,
    '',
    'Advisory inventory only. This does not approve design generation or change `context-selection.json`.',
    '',
    '## Summary',
    '',
    `- DXF layers: ${sourceMap.summary.dxf_layer_count}`,
    `- DXF polylines: ${sourceMap.summary.dxf_total_polylines}`,
    `- IFC entity types: ${sourceMap.summary.ifc_entity_type_count}`,
    `- IFC semantic building elements: ${sourceMap.summary.ifc_semantic_building_element_count}`,
    `- design-seed candidates after review: ${sourceMap.summary.design_seed_candidate_after_review_count}`,
    '',
    '## DXF Layers',
    '',
    '| Layer | Polylines | Coverage | Proposed role | Mapping status |',
    '| --- | ---: | ---: | --- | --- |'
  ];

  for (const row of sourceMap.dxf.top_layers) {
    lines.push(`| ${escapePipe(row.name)} | ${row.polyline_count} | ${row.coverage ?? '-'} | ${escapePipe(row.proposed_role)} | ${escapePipe(row.mapping_status)} |`);
  }

  lines.push('', '## IFC Entity Types', '', '| Type | Count | Proposed role | Mapping status | Design seed later |', '| --- | ---: | --- | --- | --- |');
  for (const row of sourceMap.ifc.top_entity_types) {
    lines.push(`| ${escapePipe(row.name)} | ${row.entity_count} | ${escapePipe(row.proposed_role)} | ${escapePipe(row.mapping_status)} | ${row.design_seed_candidate_after_review ? 'yes' : 'no'} |`);
  }

  lines.push('', '## Semantic IFC Candidates', '');
  if (!sourceMap.ifc.semantic_entity_types.length) {
    lines.push('- none');
  } else {
    for (const row of sourceMap.ifc.semantic_entity_types) {
      lines.push(`- \`${row.name}\`: ${row.entity_count} entities; ${row.required_review}`);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = ensureItem(manifest.outputs, 'design/context-source-map.generated.json', {
      path: 'design/context-source-map.generated.json',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Generated DXF/IFC source inventory and mapping recommendation.'
    });
    didChange = ensureItem(manifest.outputs, 'design/context-source-map.generated.md', {
      path: 'design/context-source-map.generated.md',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Human-readable DXF/IFC source inventory and mapping recommendation.'
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
    let didChange = ensureItem(exportManifest.exports, 'design/context-source-map.generated.json', {
      path: 'design/context-source-map.generated.json',
      module: 'Kosmo Design',
      format: 'json',
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    });
    didChange = ensureItem(exportManifest.exports, 'design/context-source-map.generated.md', {
      path: 'design/context-source-map.generated.md',
      module: 'Kosmo Design',
      format: 'markdown',
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

function semanticIfcElementTypes() {
  return [
    'IFCBEAM',
    'IFCBUILDINGELEMENTPROXY',
    'IFCCOLUMN',
    'IFCCOVERING',
    'IFCCURTAINWALL',
    'IFCDOOR',
    'IFCFOOTING',
    'IFCMEMBER',
    'IFCPLATE',
    'IFCRAILING',
    'IFCRAMP',
    'IFCROOF',
    'IFCSLAB',
    'IFCSTAIR',
    'IFCWALL',
    'IFCWALLSTANDARDCASE',
    'IFCWINDOW'
  ];
}

function countSemanticIfcElements(entityCounts) {
  return semanticIfcElementTypes().reduce((sum, type) => sum + (entityCounts[type] || 0), 0);
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

function slugify(value) {
  return String(value || 'source')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'source';
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function escapePipe(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
