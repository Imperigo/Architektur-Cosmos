#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { adaptPlanProfile, validatePlanProfile } from './kosmodraw-plan-profile-adapter.mjs';

const fixturePath = new URL('../examples/kosmo-references/kosmodraw-plan-profile-v0.1.fixture.json', import.meta.url);
const profile = JSON.parse(await readFile(fixturePath, 'utf8'));
const failures = [];

validatePlanProfile(profile);
const first = adaptPlanProfile(profile);
const second = adaptPlanProfile(JSON.parse(JSON.stringify(profile)));

check('deterministic_output', JSON.stringify(first) === JSON.stringify(second));
check('review_only', first.status === 'review_only');
check('public_display_blocked', first.public_display_allowed === false);
check('draft_contract', first.source_contract.contract_status === 'draft');
check('room_count', first.rooms.length === 2);
check('wall_count', first.walls.length === 7);
check('shared_wall_deduplicated', first.walls.filter((wall) => wall.room_ids.length === 2).length === 1);
check('opening_count', first.openings.length === 2);
check('door_position_m', first.openings.find((opening) => opening.id === 'O1')?.position_m === 2.5);
check('window_position_m', first.openings.find((opening) => opening.id === 'O2')?.position_m === 3);
check('no_public_assets', first.asset_candidates.length === 0 && first.drawings.length === 0 && first.model_preview === null);
check('stable_sort', first.walls.map((wall) => wall.id).join(',') === 'W001,W002,W003,W004,W005,W006,W007');
check('analysis_review_only', first.analysis_layers.every((layer) => layer.review_status === 'draft'));
check('plan_profile_blocked', first.plan_profile.public_display_allowed === false);
check('room_stamps_preserved', first.plan_profile.room_stamps.length === 2);
check('dimensions_preserved', first.plan_profile.dimensions.length === 3);
check('grid_preserved', first.plan_profile.grid.spacing_m === 1);

expectFailure('reject_publicly_unsafe_schema', () => validatePlanProfile({ ...profile, schema_version: '1.0' }));
expectFailure('reject_unknown_host_wall', () => validatePlanProfile({
  ...profile,
  openings: [{ ...profile.openings[0], host_wall_id: 'missing' }]
}));
expectFailure('reject_invalid_position_t', () => validatePlanProfile({
  ...profile,
  openings: [{ ...profile.openings[0], position_t: 1.5 }]
}));
expectFailure('reject_duplicate_wall_axis', () => validatePlanProfile({
  ...profile,
  walls: [...profile.walls, { ...profile.walls[0], id: 'W999' }]
}));
expectFailure('reject_wrong_dimension_length', () => validatePlanProfile({
  ...profile,
  dimensions: [{ ...profile.dimensions[0], length_m: 99 }]
}));
expectFailure('reject_wrong_bounds', () => validatePlanProfile({
  ...profile,
  bounds: [0, 0, 10, 5]
}));

const report = {
  status: failures.length === 0 ? 'passed' : 'failed',
  checks: 23,
  failures,
  summary: {
    rooms: first.rooms.length,
    walls: first.walls.length,
    openings: first.openings.length,
    public_ready_after_adapter: 0,
    writes_public_data: false
  }
};

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);

function check(id, passed) {
  if (!passed) failures.push(id);
}

function expectFailure(id, action) {
  try {
    action();
    failures.push(id);
  } catch {
    // Expected fail-closed behavior.
  }
}
