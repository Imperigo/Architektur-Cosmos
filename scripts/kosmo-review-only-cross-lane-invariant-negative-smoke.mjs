#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), 'kosmo-review-only-invariant-'));

try {
  const paths = {
    referencesPack: join(tempRoot, 'references-pack.json'),
    assetPack: join(tempRoot, 'asset-pack.json'),
    trainingRubric: join(tempRoot, 'training-rubric.json'),
    trainingTemplate: join(tempRoot, 'training-template.json'),
    trainingQueuePlan: join(tempRoot, 'training-queue-plan.json'),
    out: join(tempRoot, 'report.json'),
    markdown: join(tempRoot, 'report.md')
  };

  writeJson(paths.referencesPack, referencesPack());
  writeJson(paths.assetPack, assetPack());
  writeJson(paths.trainingRubric, trainingRubric());
  writeJson(paths.trainingTemplate, trainingTemplate());
  writeJson(paths.trainingQueuePlan, trainingQueuePlan());

  const result = spawnSync(process.execPath, [
    resolve(root, 'scripts/kosmo-review-only-cross-lane-invariant-check.mjs'),
    '--referencesPack',
    paths.referencesPack,
    '--assetPack',
    paths.assetPack,
    '--trainingRubric',
    paths.trainingRubric,
    '--trainingTemplate',
    paths.trainingTemplate,
    '--trainingQueuePlan',
    paths.trainingQueuePlan,
    '--out',
    paths.out,
    '--markdown',
    paths.markdown
  ], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  const report = JSON.parse(readFileSync(paths.out, 'utf8'));
  const failedIds = new Set((report.checks || [])
    .filter((check) => check.status === 'failed')
    .map((check) => check.id));
  const requiredFailures = [
    'references_intake_readiness.pilots[0].public_ready',
    'asset_intake_readiness.pilot_asset_groups[0].stages[0].public_display_allowed',
    'training_eval_rubric.policy.writes_training_data_now',
    'training_eval_row_template.templates[0].row_stub.public_ready',
    'training_eval_review_queue_plan:public_ready_after_zero',
    'training_eval_review_queue_plan.policy.public_ready_after_plan'
  ];
  const missingRequiredFailures = requiredFailures.filter((id) => !failedIds.has(id));
  const passed = result.status !== 0
    && report.status === 'review_only_cross_lane_invariant_check_failed'
    && missingRequiredFailures.length === 0
    && report.policy?.public_ready_after_check === 0
    && report.summary?.public_ready_after_check === 0;

  console.log('Kosmo review-only cross-lane invariant negative smoke');
  console.log(`Status: ${passed ? 'review_only_cross_lane_invariant_negative_smoke_passed' : 'review_only_cross_lane_invariant_negative_smoke_failed'}`);
  console.log(`Guard exit: ${result.status}`);
  console.log(`Observed failures: ${failedIds.size}`);

  if (!passed) {
    if (missingRequiredFailures.length > 0) {
      console.error(`Missing required failure ids: ${missingRequiredFailures.join(', ')}`);
    }
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exitCode = 1;
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function referencesPack() {
  return {
    status: 'kosmoreferences_pilot_intake_readiness_pack_ready',
    policy: {
      readiness_only: true,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_inventory_now: false,
      executes_local_workers: false,
      writes_public_files: false,
      public_ready_after_pack: 0
    },
    source_refs: ['synthetic/references'],
    summary: {
      public_ready_after_pack: 0
    },
    pilots: [
      {
        id: 'pilot-a',
        public_ready: true,
        intake_stages: [
          {
            id: 'metadata_inventory_match',
            reads_private_content_now: false,
            public_ready_after_stage: 0
          }
        ]
      }
    ],
    hard_stops: ['Keep every pilot review-only and public-ready false.']
  };
}

function assetPack() {
  return {
    status: 'kosmoasset_intake_readiness_pack_ready',
    policy: {
      readiness_only: true,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_inventory_now: false,
      generates_assets_now: false,
      executes_local_workers_now: false,
      uploads_allowed: false,
      public_ready_after_pack: 0
    },
    source_refs: ['synthetic/assets'],
    summary: {
      public_ready_after_pack: 0
    },
    pilot_asset_groups: [
      {
        id: 'pilot-a',
        public_use_allowed: 0,
        stages: [
          {
            id: 'promotion_guard',
            reads_private_content_now: false,
            public_ready_after_stage: 0,
            public_display_allowed: true
          }
        ]
      }
    ],
    hard_stops: ['Do not upload or publish assets.']
  };
}

function trainingRubric() {
  return {
    status: 'training_eval_rubric_pack_ready',
    policy: {
      rubric_only: true,
      writes_training_data_now: true,
      writes_embeddings_now: false,
      runs_fine_tuning_now: false,
      reads_private_content_now: false,
      copies_worker_output_bodies: false,
      public_ready_after_pack: 0
    },
    source_refs: ['synthetic/rubric'],
    summary: {
      public_ready_after_pack: 0
    },
    suites: [
      {
        id: 'source_grounding_provenance',
        public_ready_after_suite: 0
      }
    ],
    scoring: {
      automatic_public_release_allowed: false
    },
    hard_stops: ['Do not train or fine-tune now.']
  };
}

function trainingTemplate() {
  return {
    status: 'training_eval_row_template_ready',
    policy: {
      template_only: true,
      writes_eval_rows_now: false,
      writes_training_data_now: false,
      writes_embeddings_now: false,
      runs_fine_tuning_now: false,
      reads_private_content_now: false,
      stores_private_content: false,
      public_ready_after_template: 0
    },
    source_refs: ['synthetic/template'],
    summary: {
      public_ready_after_template: 0
    },
    templates: [
      {
        suite_id: 'source_grounding_provenance',
        row_stub: {
          public_ready: true
        },
        public_ready_after_template: 0
      }
    ],
    hard_stops: ['Keep public_ready false.']
  };
}

function trainingQueuePlan() {
  return {
    status: 'training_eval_review_queue_plan_ready',
    policy: {
      plan_only: true,
      source_free: true,
      creates_queue_items_now: false,
      writes_eval_rows_now: false,
      writes_training_data_now: false,
      writes_embeddings_now: false,
      runs_fine_tuning_now: false,
      reads_private_content_now: false,
      stores_private_content: false,
      public_ready_after_plan: 1
    },
    source_refs: ['synthetic/queue'],
    summary: {
      public_ready_after_plan: 0
    },
    review_lanes: [
      { id: 'source_grounding_review', executable_now: false },
      { id: 'rights_privacy_review', executable_now: false },
      { id: 'promotion_decision', executable_now: false }
    ],
    queue_states: [
      { id: 'draft_candidate', public_ready_allowed: false }
    ],
    hard_stops: ['Do not mark any row public_ready true.']
  };
}
