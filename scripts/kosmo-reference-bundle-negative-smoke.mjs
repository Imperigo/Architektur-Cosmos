#!/usr/bin/env node

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const tmpRoot = resolve(root, '.tmp/kosmo-reference-bundle-negative-smoke');
const validatorPath = resolve(root, 'scripts/kosmo-reference-bundle-check.mjs');

const baseBundle = {
  project_slug: 'villa-savoye',
  status: 'review_only',
  source_kind: 'sketch_to_3d',
  rooms: [
    {
      id: 'room-01',
      polygon_xy: [[0, 0], [5, 0], [5, 4], [0, 4]],
      confidence: 0.6
    }
  ],
  walls: [
    {
      id: 'wall-01',
      start_x: 0,
      start_y: 0,
      end_x: 5,
      end_y: 0,
      thickness_m: 0.2,
      confidence: 0.6
    }
  ],
  openings: [
    {
      id: 'opening-01',
      kind: 'window',
      at_xy: [2.5, 0],
      width_m: 1.2,
      height_m: 1.1,
      sill_m: 0.9,
      confidence: 0.5
    }
  ],
  stories: [
    {
      id: 'story-01',
      elevation_m: 0,
      height_m: 3
    }
  ],
  ifc_path: '/tmp/kosmodraw/negative-smoke/model.ifc',
  model_preview: {
    glb_url: null,
    review_status: 'draft',
    public_display_allowed: false
  },
  drawings: [
    {
      kind: 'plan',
      url: null,
      review_status: 'draft',
      public_display_allowed: false
    }
  ],
  analysis_layers: [
    {
      analysis_type: 'source_reconstruction',
      review_status: 'draft'
    }
  ],
  asset_candidates: [
    {
      kind: 'model',
      title: 'negative-smoke-model.glb',
      rights_status: 'own_work',
      public_display_allowed: false
    }
  ]
};

const cases = [
  {
    id: 'blocks_public_display_allowed',
    mutate: (bundle) => {
      bundle.asset_candidates[0].public_display_allowed = true;
    },
    expected: 'public_display_allowed'
  },
  {
    id: 'blocks_private_public_string',
    mutate: (bundle) => {
      bundle.model_preview.caveat = 'unsafe /mnt/archive/private-source reference';
    },
    expected: 'private-leak'
  },
  {
    id: 'blocks_non_review_status',
    mutate: (bundle) => {
      bundle.status = 'public_ready';
    },
    expected: 'status must be review_only'
  },
  {
    id: 'blocks_opening_without_position',
    mutate: (bundle) => {
      delete bundle.openings[0].at_xy;
    },
    expected: 'opening needs host_wall_id'
  }
];

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  await rm(tmpRoot, { recursive: true, force: true });
  await mkdir(tmpRoot, { recursive: true });

  const results = [];
  for (const testCase of cases) {
    const bundle = structuredClone(baseBundle);
    testCase.mutate(bundle);
    const path = resolve(tmpRoot, `${testCase.id}.json`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    const run = spawnSync(process.execPath, [validatorPath, path], {
      cwd: root,
      encoding: 'utf8'
    });
    const output = `${run.stdout}\n${run.stderr}`;
    const passed = run.status !== 0 && output.includes(testCase.expected);
    results.push({
      id: testCase.id,
      expected_failure: testCase.expected,
      validator_exit_code: run.status,
      passed
    });
  }

  await rm(tmpRoot, { recursive: true, force: true });

  const summary = {
    status: results.every((result) => result.passed) ? 'passed' : 'failed',
    cases: results
  };
  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== 'passed') process.exit(1);
}
