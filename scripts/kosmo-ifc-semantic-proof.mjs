#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const outputJsonPath = join(projectRoot, args.output || 'design/ifc-semantic-proof.generated.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/ifc-semantic-proof.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const sourceRegistry = existsSync(join(projectRoot, 'data/sources.json')) ? readJson(join(projectRoot, 'data/sources.json')) : null;
  const sourcePath = resolveIfcPath(sourceRegistry);
  const proof = buildProof(sourcePath);

  await mkdir(dirname(outputJsonPath), { recursive: true });
  await mkdir(dirname(outputMdPath), { recursive: true });
  await writeFile(outputJsonPath, `${JSON.stringify(proof, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(proof), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo IFC semantic proof generated');
  console.log(`Project: ${proof.project_id}`);
  console.log(`Engine: ${proof.engine.name}`);
  console.log(`IFCBUILDINGELEMENTPROXY: ${proof.summary.ifcbuildingelementproxy_count}`);
  console.log(`Contained elements: ${proof.summary.elements_contained_in_spatial_structure}`);
  console.log(`Elements with property sets: ${proof.summary.elements_with_property_sets}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildProof(sourcePath) {
  const analysis = analyzeIfcSemantics(sourcePath);
  const sourceReview = readOptionalJson(join(projectRoot, 'design/context-source-review.generated.json'));
  const sourceMapping = readOptionalJson(join(projectRoot, 'design/context-source-mapping.json'));
  const proxyRows = analysis.proxies.map((proxy) => elementRow(proxy, analysis));
  const summary = summarize(analysis, proxyRows);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-ifc-semantic-proof',
    project_id: readProjectId(),
    status: summary.ifcbuildingelementproxy_count > 0 ? 'semantic_ifc_probe_ready_for_human_review' : 'no_semantic_ifc_elements_found',
    rights_status: 'internal_only',
    source_file: sourceFileStatus(sourcePath),
    engine: {
      name: 'kosmo_step_semantic_probe',
      ifcopenshell_available: false,
      note: 'IfcOpenShell/Bonsai was not available locally, so this proof reads STEP entity semantics only. It does not triangulate or edit IFC geometry.'
    },
    policy: {
      proof_does_not_approve_design_generation: true,
      proof_does_not_modify_context_selection: true,
      semantic_elements_require_human_review_before_design_seed: true,
      geometry_is_not_imported_or_edited_by_this_tool: true
    },
    source_context: {
      source_review_status: sourceReview?.status || null,
      source_review_open_human_review_count: sourceReview?.summary?.open_human_review_count ?? null,
      source_mapping_status: sourceMapping?.status || null,
      source_mapping_ifc_decision: sourceMappingDecision(sourceMapping)
    },
    summary,
    project_structure: analysis.projectStructure,
    distributions: {
      proxy_name_top: topCounts(countBy(proxyRows, (row) => row.name || 'unnamed'), 12),
      proxy_object_type_top: topCounts(countBy(proxyRows, (row) => row.object_type || 'none'), 12),
      container_top: topCounts(countBy(proxyRows, (row) => row.container?.label || 'uncontained'), 12),
      property_set_top: topCounts(analysis.propertySetNameCounts, 16)
    },
    element_sample: proxyRows.slice(0, 24),
    elements: proxyRows,
    next_actions: nextActions(summary)
  };
}

function analyzeIfcSemantics(pathname) {
  if (!existsSync(pathname)) {
    return emptyAnalysis();
  }

  const content = readFileSync(pathname, 'utf8');
  const entityCounts = {};
  const entities = new Map();
  const relevantTypes = new Set([
    'IFCBUILDINGELEMENTPROXY',
    'IFCPROJECT',
    'IFCSITE',
    'IFCBUILDING',
    'IFCBUILDINGSTOREY',
    'IFCRELAGGREGATES',
    'IFCRELCONTAINEDINSPATIALSTRUCTURE',
    'IFCRELDEFINESBYPROPERTIES',
    'IFCPROPERTYSET',
    'IFCPROPERTYSINGLEVALUE',
    'IFCLOCALPLACEMENT',
    'IFCPRODUCTDEFINITIONSHAPE',
    'IFCSHAPEREPRESENTATION'
  ]);
  const pattern = /#(\d+)\s*=\s*(IFC[A-Z0-9_]+)\s*\(([\s\S]*?)\);/g;
  let match;
  let totalEntities = 0;

  while ((match = pattern.exec(content)) !== null) {
    const id = Number(match[1]);
    const type = match[2];
    entityCounts[type] = (entityCounts[type] || 0) + 1;
    totalEntities += 1;
    if (relevantTypes.has(type)) {
      entities.set(id, { id, type, args: splitStepArgs(match[3]) });
    }
  }

  const proxies = [...entities.values()].filter((entity) => entity.type === 'IFCBUILDINGELEMENTPROXY');
  const containersByElementId = buildContainmentMap(entities);
  const propertySetsByElementId = buildPropertySetMap(entities);
  const productShapeById = new Map([...entities.values()].filter((entity) => entity.type === 'IFCPRODUCTDEFINITIONSHAPE').map((entity) => [entity.id, entity]));
  const localPlacementById = new Map([...entities.values()].filter((entity) => entity.type === 'IFCLOCALPLACEMENT').map((entity) => [entity.id, entity]));
  const propertySetNameCounts = {};

  for (const psets of propertySetsByElementId.values()) {
    for (const pset of psets) {
      const name = pset.name || 'unnamed_property_set';
      propertySetNameCounts[name] = (propertySetNameCounts[name] || 0) + 1;
    }
  }

  return {
    exists: true,
    totalEntities,
    entityCounts,
    entities,
    proxies,
    containersByElementId,
    propertySetsByElementId,
    productShapeById,
    localPlacementById,
    propertySetNameCounts,
    projectStructure: projectStructure(entities)
  };
}

function buildContainmentMap(entities) {
  const containersByElementId = new Map();
  for (const entity of entities.values()) {
    if (entity.type !== 'IFCRELCONTAINEDINSPATIALSTRUCTURE') continue;
    const relatedElements = refsIn(entity.args[4]);
    const structureRef = firstRef(entity.args[5]);
    const structure = structureRef ? entities.get(structureRef) || null : null;
    for (const elementId of relatedElements) {
      containersByElementId.set(elementId, {
        relation_id: entity.id,
        structure_id: structureRef,
        type: structure?.type || null,
        name: structure ? decodeStepString(structure.args[2]) : null,
        label: structureLabel(structureRef, structure)
      });
    }
  }
  return containersByElementId;
}

function buildPropertySetMap(entities) {
  const propertySingleValueById = new Map([...entities.values()]
    .filter((entity) => entity.type === 'IFCPROPERTYSINGLEVALUE')
    .map((entity) => [entity.id, parsePropertySingleValue(entity)]));
  const propertySetById = new Map([...entities.values()]
    .filter((entity) => entity.type === 'IFCPROPERTYSET')
    .map((entity) => [entity.id, parsePropertySet(entity, propertySingleValueById)]));
  const propertySetsByElementId = new Map();

  for (const entity of entities.values()) {
    if (entity.type !== 'IFCRELDEFINESBYPROPERTIES') continue;
    const relatedObjects = refsIn(entity.args[4]);
    const propertySetRef = firstRef(entity.args[5]);
    const propertySet = propertySetRef ? propertySetById.get(propertySetRef) || null : null;
    if (!propertySet) continue;
    for (const objectId of relatedObjects) {
      const existing = propertySetsByElementId.get(objectId) || [];
      existing.push(propertySet);
      propertySetsByElementId.set(objectId, existing);
    }
  }

  return propertySetsByElementId;
}

function parsePropertySet(entity, propertySingleValueById) {
  const propertyRefs = refsIn(entity.args[4]);
  const properties = propertyRefs
    .map((ref) => propertySingleValueById.get(ref))
    .filter(Boolean);
  return {
    id: entity.id,
    global_id: decodeStepString(entity.args[0]),
    name: decodeStepString(entity.args[2]),
    property_count: properties.length,
    property_names: properties.map((property) => property.name).filter(Boolean).slice(0, 24),
    properties: properties.slice(0, 48)
  };
}

function parsePropertySingleValue(entity) {
  return {
    id: entity.id,
    name: decodeStepString(entity.args[0]),
    nominal_value: parseNominalValue(entity.args[2])
  };
}

function elementRow(proxy, analysis) {
  const args = proxy.args;
  const placementRef = firstRef(args[5]);
  const representationRef = firstRef(args[6]);
  const container = analysis.containersByElementId.get(proxy.id) || null;
  const propertySets = analysis.propertySetsByElementId.get(proxy.id) || [];
  const productShape = representationRef ? analysis.productShapeById.get(representationRef) || null : null;
  const placement = placementRef ? analysis.localPlacementById.get(placementRef) || null : null;

  return {
    step_id: proxy.id,
    global_id: decodeStepString(args[0]),
    name: decodeStepString(args[2]),
    description: decodeStepString(args[3]),
    object_type: decodeStepString(args[4]),
    tag: decodeStepString(args[7]),
    object_placement_ref: placementRef,
    has_local_placement: Boolean(placement),
    representation_ref: representationRef,
    has_product_definition_shape: Boolean(productShape),
    shape_representation_ref_count: productShape ? refsIn(productShape.args[2]).length : 0,
    container,
    property_set_count: propertySets.length,
    property_sets: propertySets.map((propertySet) => ({
      id: propertySet.id,
      name: propertySet.name,
      property_count: propertySet.property_count,
      property_names: propertySet.property_names,
      properties: propertySet.properties
    }))
  };
}

function summarize(analysis, proxyRows) {
  const count = (predicate) => proxyRows.filter(predicate).length;
  const integrityParts = [
    ratio(count((row) => row.global_id), proxyRows.length),
    ratio(count((row) => row.object_placement_ref), proxyRows.length),
    ratio(count((row) => row.representation_ref), proxyRows.length),
    ratio(count((row) => row.container), proxyRows.length),
    ratio(count((row) => row.property_set_count > 0), proxyRows.length)
  ];
  const semanticIntegrityScore = integrityParts.length ? round(integrityParts.reduce((sum, value) => sum + value, 0) / integrityParts.length) : 0;

  return {
    ifc_exists: analysis.exists,
    ifc_total_entities: analysis.totalEntities,
    ifc_entity_type_count: Object.keys(analysis.entityCounts).length,
    ifcbuildingelementproxy_count: proxyRows.length,
    elements_with_global_id: count((row) => row.global_id),
    elements_with_object_placement: count((row) => row.object_placement_ref),
    elements_with_product_shape: count((row) => row.has_product_definition_shape),
    elements_contained_in_spatial_structure: count((row) => row.container),
    elements_with_property_sets: count((row) => row.property_set_count > 0),
    property_set_links: proxyRows.reduce((sum, row) => sum + row.property_set_count, 0),
    semantic_integrity_score: semanticIntegrityScore,
    design_seed_approved: false,
    recommended_next_step: proxyRows.length
      ? 'human_review_semantic_ifc_elements_before_design_seed'
      : 'provide_ifc_with_semantic_building_elements'
  };
}

function projectStructure(entities) {
  const structureTypes = new Set(['IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY']);
  const rows = [...entities.values()]
    .filter((entity) => structureTypes.has(entity.type))
    .map((entity) => ({
      step_id: entity.id,
      type: entity.type,
      global_id: decodeStepString(entity.args[0]),
      name: decodeStepString(entity.args[2])
    }));
  const childToParent = new Map();
  for (const entity of entities.values()) {
    if (entity.type !== 'IFCRELAGGREGATES') continue;
    const parent = firstRef(entity.args[4]);
    for (const child of refsIn(entity.args[5])) {
      childToParent.set(child, parent);
    }
  }
  return rows.map((row) => ({
    ...row,
    parent_step_id: childToParent.get(row.step_id) || null
  }));
}

function nextActions(summary) {
  if (!summary.ifc_exists) return ['Add or register a local IFC source file.'];
  if (!summary.ifcbuildingelementproxy_count) return ['Import or provide an IFC with semantic building elements.'];
  const actions = [
    'Open the IFC in Bonsai/IfcOpenShell or an equivalent semantic IFC viewer/import path.',
    'Human-review classes, storey containment, placements, units and coordinates.',
    'Compare semantic elements with the DXF context layer and IFC bounds.',
    'Keep context-selection approved_for_design_generation=false until the semantic review is complete.'
  ];
  if (summary.elements_contained_in_spatial_structure < summary.ifcbuildingelementproxy_count) {
    actions.unshift('Investigate uncontained IFCBUILDINGELEMENTPROXY elements before design-seed use.');
  }
  return actions;
}

function renderMarkdown(proof) {
  const lines = [
    '# IFC Semantic Proof',
    '',
    `Project ID: \`${proof.project_id}\``,
    `Generated: ${proof.generated_at}`,
    `Status: \`${proof.status}\``,
    '',
    'Read-only semantic STEP proof. This does not approve design generation.',
    '',
    '## Summary',
    '',
    `- IFC file: \`${proof.source_file.path}\``,
    `- parser: \`${proof.engine.name}\``,
    `- IfcOpenShell available: ${proof.engine.ifcopenshell_available ? 'yes' : 'no'}`,
    `- total entities: ${proof.summary.ifc_total_entities}`,
    `- entity types: ${proof.summary.ifc_entity_type_count}`,
    `- IFCBUILDINGELEMENTPROXY: ${proof.summary.ifcbuildingelementproxy_count}`,
    `- with placement: ${proof.summary.elements_with_object_placement}`,
    `- with product shape: ${proof.summary.elements_with_product_shape}`,
    `- contained in spatial structure: ${proof.summary.elements_contained_in_spatial_structure}`,
    `- with property sets: ${proof.summary.elements_with_property_sets}`,
    `- property set links: ${proof.summary.property_set_links}`,
    `- semantic integrity score: ${proof.summary.semantic_integrity_score}`,
    `- design seed approved: ${proof.summary.design_seed_approved ? 'yes' : 'no'}`,
    '',
    '## Project Structure',
    '',
    '| STEP | Type | Name | Parent |',
    '| ---: | --- | --- | ---: |'
  ];

  for (const row of proof.project_structure) {
    lines.push(`| #${row.step_id} | ${escapePipe(row.type)} | ${escapePipe(row.name || '-')} | ${row.parent_step_id ? `#${row.parent_step_id}` : '-'} |`);
  }

  lines.push('', '## Containers', '', '| Container | Count |', '| --- | ---: |');
  for (const item of proof.distributions.container_top) {
    lines.push(`| ${escapePipe(item.value)} | ${item.count} |`);
  }

  lines.push('', '## Property Sets', '', '| Property set | Linked elements |', '| --- | ---: |');
  for (const item of proof.distributions.property_set_top) {
    lines.push(`| ${escapePipe(item.value)} | ${item.count} |`);
  }

  lines.push('', '## Element Sample', '', '| STEP | Global ID | Name | Object type | Container | Psets |', '| ---: | --- | --- | --- | --- | ---: |');
  for (const row of proof.element_sample) {
    lines.push(`| #${row.step_id} | ${escapePipe(row.global_id || '-')} | ${escapePipe(row.name || '-')} | ${escapePipe(row.object_type || '-')} | ${escapePipe(row.container?.label || '-')} | ${row.property_set_count} |`);
  }

  lines.push('', '## Next Actions', '');
  for (const action of proof.next_actions) lines.push(`- ${action}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = ensureItem(manifest.outputs, 'design/ifc-semantic-proof.generated.json', {
      path: 'design/ifc-semantic-proof.generated.json',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Read-only semantic IFC proof for IFCBUILDINGELEMENTPROXY elements before design-seed review.'
    });
    didChange = ensureItem(manifest.outputs, 'design/ifc-semantic-proof.generated.md', {
      path: 'design/ifc-semantic-proof.generated.md',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Human-readable semantic IFC proof before design-seed review.'
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
    let didChange = ensureItem(exportManifest.exports, 'design/ifc-semantic-proof.generated.json', {
      path: 'design/ifc-semantic-proof.generated.json',
      module: 'Kosmo Design',
      format: 'json',
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    });
    didChange = ensureItem(exportManifest.exports, 'design/ifc-semantic-proof.generated.md', {
      path: 'design/ifc-semantic-proof.generated.md',
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

function resolveIfcPath(sourceRegistry) {
  const sources = sourceRegistry?.sources || [];
  const source = sources.find((item) => item.type === 'ifc' && item.path);
  return join(projectRoot, source?.path || 'data/source-files/Bestand_Kontext.ifc');
}

function sourceMappingDecision(sourceMapping) {
  const row = sourceMapping?.rows?.find((item) => item.mapping_id === 'ifc-type-ifcbuildingelementproxy');
  return row?.decision || null;
}

function sourceFileStatus(pathname) {
  return {
    path: relative(projectRoot, pathname),
    name: basename(pathname),
    exists: existsSync(pathname),
    size_bytes: existsSync(pathname) ? statSync(pathname).size : 0
  };
}

function emptyAnalysis() {
  return {
    exists: false,
    totalEntities: 0,
    entityCounts: {},
    entities: new Map(),
    proxies: [],
    containersByElementId: new Map(),
    propertySetsByElementId: new Map(),
    productShapeById: new Map(),
    localPlacementById: new Map(),
    propertySetNameCounts: {},
    projectStructure: []
  };
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
  let decoded = trimmed.slice(1, -1).replace(/''/g, "'");
  decoded = decoded.replace(/\\X2\\([0-9A-Fa-f]+)\\X0\\/g, (_match, hex) => {
    let result = '';
    for (let index = 0; index < hex.length; index += 4) {
      const code = Number.parseInt(hex.slice(index, index + 4), 16);
      if (Number.isFinite(code)) result += String.fromCharCode(code);
    }
    return result;
  });
  return decoded || null;
}

function parseNominalValue(value) {
  if (!value || value === '$' || value === '*') return null;
  const match = String(value).match(/^([A-Z0-9_]+)\(([\s\S]*)\)$/);
  if (!match) return decodeStepString(value);
  return {
    type: match[1],
    value: decodeStepString(match[2])
  };
}

function structureLabel(ref, entity) {
  if (!ref || !entity) return null;
  const name = decodeStepString(entity.args[2]);
  return `${entity.type} #${ref}${name ? ` ${name}` : ''}`;
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

function ratio(value, total) {
  return total > 0 ? value / total : 0;
}

function round(value) {
  return Math.round(value * 10000) / 10000;
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

function readOptionalJson(pathname) {
  try {
    return existsSync(pathname) ? readJson(pathname) : null;
  } catch {
    return null;
  }
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
