#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/kosmo-architecture-ontology-seed-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);

const baseSeed = {
  schema_version: '0.1',
  generated_at: '2026-07-22T00:00:00.000Z',
  status: 'architecture_ontology_seed_ready',
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
  source_refs: ['synthetic/pilot-matrix.json', 'synthetic/asset-taxonomy.json', 'synthetic/review-queue.json'],
  summary: {
    entity_types: 8,
    relation_types: 10,
    facet_groups: 6,
    pilots_supported: 3,
    asset_lanes_supported: 3,
    review_lanes_supported: 5,
    pilot_matrix_status: 'post_unlock_pilot_execution_matrix_ready',
    pilot_matrix_guarded_review_only: true,
    pilot_matrix_failures: 0,
    public_ready_after_seed: 0,
    failures: 0
  },
  entity_types: [
    entity('reference_project'),
    entity('source_record'),
    entity('building_element'),
    entity('material_system'),
    entity('space_pattern'),
    entity('structure_system'),
    entity('asset_record'),
    entity('eval_review_item')
  ],
  relation_types: [
    relation('project_has_source'),
    relation('source_supports_element'),
    relation('element_uses_material'),
    relation('element_defines_space'),
    relation('structure_orders_space'),
    relation('asset_derived_from_element'),
    relation('asset_uses_material'),
    relation('eval_item_tests_project'),
    relation('eval_item_tests_asset'),
    relation('source_blocks_public_release')
  ],
  facet_groups: [
    facet('typology'),
    facet('material'),
    facet('structure'),
    facet('space'),
    facet('construction'),
    facet('rights_privacy')
  ],
  pilot_alignment: [
    pilot('villa-savoye'),
    pilot('sogn-benedetg'),
    pilot('alterszentrum-kloster-ingenbohl')
  ],
  hard_stops: [
    'Do not instantiate private project facts from this ontology seed.',
    'Do not create assets, eval rows, embeddings or training data from this seed.',
    'Do not mark ontology-derived records public_ready true.',
    'Keep source provenance and rights/privacy facets mandatory.'
  ],
  failures: []
};

const cases = [
  {
    id: 'public_ready_promoted',
    mutate: (seed) => {
      seed.summary.public_ready_after_seed = 1;
      seed.entity_types[0].public_ready_default = true;
      seed.pilot_alignment[0].public_ready_after_alignment = 1;
    },
    expectedFailures: [
      'public_ready_zero',
      'all_entities_public_ready_false',
      'pilot_alignment_public_ready_zero'
    ]
  },
  {
    id: 'private_training_execution_enabled',
    mutate: (seed) => {
      seed.policy.reads_private_content_now = true;
      seed.policy.creates_assets_now = true;
      seed.policy.creates_eval_rows_now = true;
      seed.policy.writes_training_data_now = true;
    },
    expectedFailures: [
      'policy_no_private_reads',
      'policy_no_assets_now',
      'policy_no_eval_rows_now',
      'policy_no_training_now'
    ]
  },
  {
    id: 'missing_rights_privacy_boundary',
    mutate: (seed) => {
      seed.facet_groups = seed.facet_groups.filter((item) => item.id !== 'rights_privacy');
      seed.summary.facet_groups = seed.facet_groups.length;
      seed.relation_types[0].requires_source_basis = false;
      seed.hard_stops = seed.hard_stops.filter((item) => !item.includes('rights/privacy'));
    },
    expectedFailures: [
      'facet_groups_six',
      'required_facets_present',
      'relations_require_source_basis',
      'hard_stop_rights_privacy_mandatory'
    ]
  },
  {
    id: 'pilot_matrix_unblocked',
    mutate: (seed) => {
      seed.summary.pilot_matrix_status = 'post_unlock_pilot_execution_matrix_running';
      seed.summary.pilot_matrix_guarded_review_only = false;
    },
    expectedFailures: [
      'pilot_matrix_status_guarded',
      'pilot_matrix_review_only_blocked'
    ]
  }
];

try {
  runSmoke();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  if (!keepTemp) rmSync(tempRoot, { recursive: true, force: true });
}

function runSmoke() {
  rmSync(tempRoot, { recursive: true, force: true });
  mkdirSync(tempRoot, { recursive: true });

  const results = cases.map(runCase);
  const summary = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    writes_training_data: false,
    creates_embeddings: false,
    runs_fine_tuning: false,
    public_ready_after_smoke: 0,
    checked_cases: results.length,
    cases: results
  };

  console.log(JSON.stringify(summary, null, 2));
}

function runCase(testCase) {
  const seed = clone(baseSeed);
  testCase.mutate(seed);

  const seedPath = resolve(tempRoot, `${testCase.id}.seed.json`);
  const reportPath = resolve(tempRoot, `${testCase.id}.report.json`);
  const markdownPath = resolve(tempRoot, `${testCase.id}.report.md`);
  writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');

  const result = spawnSync(
    process.execPath,
    [
      'scripts/kosmo-architecture-ontology-seed-check.mjs',
      '--seed',
      seedPath,
      '--out',
      reportPath,
      '--markdown',
      markdownPath
    ],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (result.status === 0) {
    throw new Error(`Expected ontology seed guard to fail for synthetic case ${testCase.id}.`);
  }

  const report = JSON.parse(readReport(reportPath));
  const failedIds = new Set((report.checks || []).filter((check) => check.status === 'failed').map((check) => check.id));
  const missingFailures = testCase.expectedFailures.filter((id) => !failedIds.has(id));
  if (missingFailures.length > 0) {
    throw new Error(`Ontology seed negative smoke ${testCase.id} missed failures: ${missingFailures.join(', ')}`);
  }

  return {
    id: testCase.id,
    synthetic_seed: keepTemp ? relative(root, seedPath) : null,
    expected_failed_checks: testCase.expectedFailures,
    observed_failed_checks: [...failedIds].sort()
  };
}

function readReport(reportPath) {
  return String(readFileSync(reportPath, 'utf8'));
}

function entity(id) {
  return { id, required_fields: ['id', 'public_ready'], public_ready_default: false };
}

function relation(id) {
  return { id, from: 'reference_project', to: 'source_record', requires_source_basis: true };
}

function facet(id) {
  return { id, values: ['review_only'], public_ready_default: false };
}

function pilot(id) {
  return {
    pilot_id: id,
    title: id,
    binds_to_entities: ['reference_project', 'source_record'],
    public_ready_after_alignment: 0
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
