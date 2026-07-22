#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const pilotMatrixPath = resolve(root, args.pilotMatrix || `data/kosmo-post-unlock-pilot-execution-matrix-${dateStamp}.json`);
const assetTaxonomyPath = resolve(root, args.assetTaxonomy || `data/kosmoasset-candidate-taxonomy-review-${dateStamp}.json`);
const reviewQueuePath = resolve(root, args.reviewQueue || `data/kosmo-training-eval-review-queue-plan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-architecture-ontology-seed-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-architecture-ontology-seed-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pilotMatrix = await readJson(pilotMatrixPath);
  const assetTaxonomy = await readJson(assetTaxonomyPath);
  const reviewQueue = await readJson(reviewQueuePath);
  const report = buildReport({ pilotMatrix, assetTaxonomy, reviewQueue });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo architecture ontology seed');
  console.log(`Status: ${report.status}`);
  console.log(`Entity types: ${report.summary.entity_types}`);
  console.log(`Relation types: ${report.summary.relation_types}`);
  console.log(`Facet groups: ${report.summary.facet_groups}`);
  console.log(`Public-ready after seed: ${report.summary.public_ready_after_seed}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport({ pilotMatrix, assetTaxonomy, reviewQueue }) {
  const failures = [];
  const pilotMatrixAccepted = [
    'post_unlock_pilot_execution_matrix_ready',
    'post_unlock_pilot_execution_matrix_needs_review'
  ].includes(pilotMatrix.status);
  if (!pilotMatrixAccepted) failures.push(`Pilot matrix not in a guarded ready/review state: ${pilotMatrix.status}`);
  if (assetTaxonomy.status !== 'kosmoasset_candidate_taxonomy_review_ready') failures.push(`Asset taxonomy not ready: ${assetTaxonomy.status}`);
  if (reviewQueue.status !== 'training_eval_review_queue_plan_ready') failures.push(`Review queue not ready: ${reviewQueue.status}`);

  const entityTypes = [
    entity('reference_project', ['project_id', 'title', 'status', 'rights_state', 'public_ready']),
    entity('source_record', ['source_id', 'source_type', 'provenance_state', 'privacy_state', 'public_ready']),
    entity('building_element', ['element_id', 'category', 'system_role', 'source_basis', 'public_ready']),
    entity('material_system', ['material_id', 'material_family', 'surface_state', 'texture_state', 'rights_state']),
    entity('space_pattern', ['space_id', 'typology', 'circulation_role', 'section_role', 'source_basis']),
    entity('structure_system', ['structure_id', 'load_path', 'span_logic', 'junction_logic', 'source_basis']),
    entity('asset_record', ['asset_id', 'asset_lane', 'export_target', 'review_state', 'public_ready']),
    entity('eval_review_item', ['eval_id', 'suite_id', 'queue_state', 'review_lane', 'public_ready'])
  ];
  const relationTypes = [
    relation('project_has_source', 'reference_project', 'source_record'),
    relation('source_supports_element', 'source_record', 'building_element'),
    relation('element_uses_material', 'building_element', 'material_system'),
    relation('element_defines_space', 'building_element', 'space_pattern'),
    relation('structure_orders_space', 'structure_system', 'space_pattern'),
    relation('asset_derived_from_element', 'asset_record', 'building_element'),
    relation('asset_uses_material', 'asset_record', 'material_system'),
    relation('eval_item_tests_project', 'eval_review_item', 'reference_project'),
    relation('eval_item_tests_asset', 'eval_review_item', 'asset_record'),
    relation('source_blocks_public_release', 'source_record', 'asset_record')
  ];
  const facetGroups = [
    facet('typology', ['housing', 'sacral', 'education', 'office', 'cultural', 'infrastructure']),
    facet('material', ['concrete', 'timber', 'masonry', 'steel', 'glass', 'earth_or_stone']),
    facet('structure', ['wall_bearing', 'frame', 'shell', 'hybrid', 'suspended', 'massive']),
    facet('space', ['served_servant', 'enfilade', 'free_plan', 'split_level', 'courtyard', 'processional']),
    facet('construction', ['prefabricated', 'cast_in_place', 'layered_assembly', 'joinery', 'monolithic', 'adaptive_reuse']),
    facet('rights_privacy', ['private', 'review_only', 'public_candidate', 'public_ready_false', 'owner_gate_required', 'rights_unknown'])
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'architecture_ontology_seed_ready'
      : 'architecture_ontology_seed_needs_review',
    policy: {
      seed_only: true,
      source_free: true,
      reads_private_content_now: false,
      writes_private_content_now: false,
      creates_assets_now: false,
      creates_eval_rows_now: false,
      writes_training_data_now: false,
      public_ready_after_seed: 0
    },
    source_refs: [
      relative(root, pilotMatrixPath),
      relative(root, assetTaxonomyPath),
      relative(root, reviewQueuePath)
    ],
    summary: {
      entity_types: entityTypes.length,
      relation_types: relationTypes.length,
      facet_groups: facetGroups.length,
      pilots_supported: pilotMatrix.summary?.pilots ?? null,
      asset_lanes_supported: assetTaxonomy.summary?.reviewable_asset_lanes ?? null,
      review_lanes_supported: reviewQueue.summary?.review_lanes ?? null,
      pilot_matrix_status: pilotMatrix.status,
      pilot_matrix_guarded_review_only: pilotMatrixAccepted && (pilotMatrix.summary?.executable_now ?? 0) === 0 && pilotMatrix.summary?.public_ready_after_matrix === 0,
      pilot_matrix_failures: pilotMatrix.summary?.failures ?? null,
      public_ready_after_seed: 0,
      failures: failures.length
    },
    entity_types: entityTypes,
    relation_types: relationTypes,
    facet_groups: facetGroups,
    pilot_alignment: (pilotMatrix.pilots || []).map((pilot) => ({
      pilot_id: pilot.id,
      title: pilot.title,
      binds_to_entities: ['reference_project', 'source_record', 'building_element', 'material_system', 'space_pattern', 'structure_system', 'asset_record', 'eval_review_item'],
      public_ready_after_alignment: 0
    })),
    hard_stops: [
      'Do not instantiate private project facts from this ontology seed.',
      'Do not create assets, eval rows, embeddings or training data from this seed.',
      'Do not mark ontology-derived records public_ready true.',
      'Keep source provenance and rights/privacy facets mandatory.'
    ],
    failures
  };
}

function entity(id, requiredFields) {
  return { id, required_fields: requiredFields, public_ready_default: false };
}

function relation(id, from, to) {
  return { id, from, to, requires_source_basis: true };
}

function facet(id, values) {
  return { id, values, public_ready_default: false };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Architecture Ontology Seed');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Entity types: ${report.summary.entity_types}`);
  lines.push(`- Relation types: ${report.summary.relation_types}`);
  lines.push(`- Facet groups: ${report.summary.facet_groups}`);
  lines.push(`- Pilots supported: ${report.summary.pilots_supported}`);
  lines.push(`- Pilot matrix status: ${report.summary.pilot_matrix_status}`);
  lines.push(`- Pilot matrix guarded review-only: ${report.summary.pilot_matrix_guarded_review_only ? 'yes' : 'no'}`);
  lines.push(`- Asset lanes supported: ${report.summary.asset_lanes_supported}`);
  lines.push(`- Review lanes supported: ${report.summary.review_lanes_supported}`);
  lines.push(`- Public-ready after seed: ${report.summary.public_ready_after_seed}`);
  lines.push('');
  lines.push('## Entity Types');
  lines.push('');
  report.entity_types.forEach((item) => lines.push(`- \`${item.id}\`: ${item.required_fields.join(', ')}`));
  lines.push('');
  lines.push('## Relation Types');
  lines.push('');
  report.relation_types.forEach((item) => lines.push(`- \`${item.id}\`: ${item.from} -> ${item.to}`));
  lines.push('');
  lines.push('## Facet Groups');
  lines.push('');
  report.facet_groups.forEach((item) => lines.push(`- \`${item.id}\`: ${item.values.join(', ')}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  return lines.join('\n');
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
