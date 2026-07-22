#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = args.date || new Date().toISOString().slice(0, 10);

const inputSpecs = [
  {
    id: 'references_intake_readiness',
    path: args.referencesPack || `data/kosmoreferences-pilot-intake-readiness-pack-${dateStamp}.json`,
    expectedStatus: 'kosmoreferences_pilot_intake_readiness_pack_ready'
  },
  {
    id: 'asset_intake_readiness',
    path: args.assetPack || `data/kosmoasset-intake-readiness-pack-${dateStamp}.json`,
    expectedStatus: 'kosmoasset_intake_readiness_pack_ready'
  },
  {
    id: 'training_eval_rubric',
    path: args.trainingRubric || `data/kosmo-training-eval-rubric-pack-${dateStamp}.json`,
    expectedStatus: 'training_eval_rubric_pack_ready'
  },
  {
    id: 'training_eval_row_template',
    path: args.trainingTemplate || `data/kosmo-training-eval-row-template-${dateStamp}.json`,
    expectedStatus: 'training_eval_row_template_ready'
  },
  {
    id: 'training_eval_review_queue_plan',
    path: args.trainingQueuePlan || `data/kosmo-training-eval-review-queue-plan-${dateStamp}.json`,
    expectedStatus: 'training_eval_review_queue_plan_ready'
  }
];

const outputJson = resolve(root, args.out || `data/kosmo-review-only-cross-lane-invariant-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-review-only-cross-lane-invariant-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const inputs = [];
  for (const spec of inputSpecs) {
    const filePath = resolve(root, spec.path);
    inputs.push({
      ...spec,
      resolvedPath: filePath,
      data: await readJson(filePath)
    });
  }

  const checks = buildChecks(inputs);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'review_only_cross_lane_invariant_check_passed'
      : 'review_only_cross_lane_invariant_check_failed',
    policy: {
      validates_existing_reports_only: true,
      reads_private_content_now: false,
      copies_private_content_now: false,
      runs_private_inventory_now: false,
      executes_local_workers_now: false,
      writes_public_files_now: false,
      writes_training_data_now: false,
      writes_embeddings_now: false,
      runs_fine_tuning_now: false,
      public_ready_after_check: 0
    },
    source_refs: inputs.map((input) => relative(root, input.resolvedPath)),
    summary: {
      lanes_checked: inputs.length,
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      invariant_paths_checked: checks.filter((checkItem) => checkItem.kind === 'invariant').length,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo review-only cross-lane invariant check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(inputs) {
  return [
    ...inputs.flatMap((input) => inputEnvelopeChecks(input)),
    ...inputs.flatMap((input) => recursiveInvariantChecks(input)),
    ...crossLaneChecks(inputs)
  ];
}

function inputEnvelopeChecks(input) {
  const data = input.data;
  const policy = data.policy || {};
  const summary = data.summary || {};
  return [
    check(`${input.id}:status`, data.status === input.expectedStatus, data.status),
    check(`${input.id}:policy_object`, isPlainObject(policy), typeof policy),
    check(`${input.id}:source_refs_present`, Array.isArray(data.source_refs) && data.source_refs.length > 0, data.source_refs?.length ?? 0),
    check(`${input.id}:public_ready_after_zero`, firstDefined([
      policy.public_ready_after_check,
      policy.public_ready_after_pack,
      policy.public_ready_after_template,
      policy.public_ready_after_plan,
      summary.public_ready_after_check,
      summary.public_ready_after_pack,
      summary.public_ready_after_template,
      summary.public_ready_after_plan
    ]) === 0, {
      policy: publicReadyLike(policy),
      summary: publicReadyLike(summary)
    })
  ];
}

function recursiveInvariantChecks(input) {
  const checks = [];
  visit(input.data, input.id, (path, key, value) => {
    const keyLower = key.toLowerCase();
    if (publicReadyKey(keyLower)) {
      checks.push(invariantCheck(path, value === false || value === 0, value));
      return;
    }

    if (publicAllowedKey(keyLower)) {
      checks.push(invariantCheck(path, value === false || value === 0, value));
      return;
    }

    if (promotionAllowedKey(keyLower)) {
      checks.push(invariantCheck(path, value === false || value === 0, value));
      return;
    }

    if (privateActionKey(keyLower) || trainingActionKey(keyLower) || publicWriteKey(keyLower)) {
      checks.push(invariantCheck(path, value === false || value === 0, value));
    }
  });
  return checks;
}

function crossLaneChecks(inputs) {
  const byId = new Map(inputs.map((input) => [input.id, input.data]));
  const references = byId.get('references_intake_readiness');
  const asset = byId.get('asset_intake_readiness');
  const rubric = byId.get('training_eval_rubric');
  const template = byId.get('training_eval_row_template');
  const queuePlan = byId.get('training_eval_review_queue_plan');
  const referencesPilotIds = new Set((references.pilots || []).map((pilot) => pilot.id));
  const assetPilotIds = new Set((asset.pilot_asset_groups || []).map((group) => group.id));
  const rubricSuiteIds = new Set((rubric.suites || []).map((suite) => suite.id));
  const templateSuiteIds = new Set((template.templates || []).map((templateItem) => templateItem.suite_id));
  const queueLaneIds = new Set((queuePlan.review_lanes || []).map((lane) => lane.id));

  return [
    check('cross_lane:pilot_ids_match_asset_bridge', setEquals(referencesPilotIds, assetPilotIds), {
      references: [...referencesPilotIds],
      assets: [...assetPilotIds]
    }),
    check('cross_lane:training_suites_match_templates', setEquals(rubricSuiteIds, templateSuiteIds), {
      rubric: [...rubricSuiteIds],
      templates: [...templateSuiteIds]
    }),
    check('cross_lane:rights_privacy_review_lane_present', queueLaneIds.has('rights_privacy_review'), [...queueLaneIds]),
    check('cross_lane:source_grounding_review_lane_present', queueLaneIds.has('source_grounding_review'), [...queueLaneIds]),
    check('cross_lane:promotion_decision_lane_present', queueLaneIds.has('promotion_decision'), [...queueLaneIds]),
    check('cross_lane:all_hard_stops_present', inputs.every((input) => Array.isArray(input.data.hard_stops) && input.data.hard_stops.length > 0), inputs.map((input) => `${input.id}:${input.data.hard_stops?.length ?? 0}`))
  ];
}

function publicReadyKey(key) {
  return key === 'public_ready'
    || key === 'public-ready'
    || key.startsWith('public_ready_after')
    || key.endsWith('_public_ready');
}

function publicAllowedKey(key) {
  return key === 'public_display_allowed'
    || key === 'public_use_allowed'
    || key === 'automatic_public_release_allowed'
    || key.endsWith('_public_ready_allowed')
    || key.endsWith('_public_downloads_allowed');
}

function promotionAllowedKey(key) {
  return key === 'promotion_allowed'
    || key === 'promotes_public_ready_now'
    || key === 'promotion_guard_does_promote_assets';
}

function privateActionKey(key) {
  return key === 'reads_private_content'
    || key === 'reads_private_content_now'
    || key === 'copies_private_content'
    || key === 'copies_private_content_now'
    || key === 'copies_private_paths_to_report'
    || key === 'runs_private_inventory_now'
    || key === 'stores_private_content';
}

function trainingActionKey(key) {
  return key === 'writes_training_data_now'
    || key === 'writes_eval_rows_now'
    || key === 'writes_embeddings_now'
    || key === 'runs_fine_tuning_now'
    || key === 'copies_worker_output_bodies';
}

function publicWriteKey(key) {
  return key === 'writes_public_files'
    || key === 'writes_public_files_now'
    || key === 'writes_public_data_now'
    || key === 'writes_public_manifest'
    || key === 'writes_mock_entries_now'
    || key === 'uploads_allowed'
    || key === 'uploads_assets_now';
}

function visit(value, path, callback) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${path}[${index}]`, callback));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, childValue] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    callback(childPath, key, childValue);
    visit(childValue, childPath, callback);
  }
}

function invariantCheck(id, condition, evidence) {
  return {
    ...check(id, condition, evidence),
    kind: 'invariant'
  };
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

function firstDefined(values) {
  return values.find((value) => value !== undefined);
}

function publicReadyLike(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([key]) => key.toLowerCase().includes('public_ready'))
  );
}

function setEquals(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Review-only Cross-Lane Invariant Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Lanes checked: ${report.summary.lanes_checked}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Invariant paths checked: ${report.summary.invariant_paths_checked}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Source Refs');
  lines.push('');
  report.source_refs.forEach((sourceRef) => {
    lines.push(`- ${sourceRef}`);
  });
  lines.push('');
  lines.push('## Failed Checks');
  lines.push('');
  const failures = report.checks.filter((checkItem) => checkItem.status === 'failed');
  if (failures.length === 0) {
    lines.push('- none');
  } else {
    failures.forEach((checkItem) => {
      lines.push(`- \`${checkItem.id}\`: ${JSON.stringify(checkItem.evidence)}`);
    });
  }
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
