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
check('producer_live_contract', first.source_contract.contract_status === 'producer_live');
check('exact_projection_provenance', first.source_contract.provenance === 'exact_projection');
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
check('dimensions_optional', first.plan_profile.dimensions.length === 0);
check('grid_consumer_derived', first.plan_profile.grid.spacing_m === 1 && first.plan_profile.derived_by_consumer.grid === true);
check('confidence_passthrough', [...first.rooms, ...first.walls, ...first.openings].every((item) => item.confidence === 1));
check('confidence_summary', first.plan_profile.confidence_summary.minimum === 1 && first.plan_profile.confidence_summary.average === 1);

const recognized = adaptPlanProfile({
  ...profile,
  provenance: 'recognized',
  rooms: profile.rooms.map((room, index) => ({ ...room, confidence: index === 0 ? 0.92 : 0.8 })),
  walls: profile.walls.map((wall, index) => ({ ...wall, confidence: index === 3 ? 0.7 : 0.84 })),
  openings: profile.openings.map((opening, index) => ({ ...opening, confidence: index === 0 ? 0.55 : 0.76 }))
});
check('recognized_provenance', recognized.source_contract.provenance === 'recognized');
check('recognized_confidence_preserved', recognized.rooms[0].confidence === 0.92
  && recognized.walls.find((wall) => wall.id === 'W004')?.confidence === 0.7
  && recognized.openings[0].confidence === 0.55);

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
expectFailure('reject_missing_confidence', () => validatePlanProfile({
  ...profile,
  rooms: [{ ...profile.rooms[0], confidence: undefined }, profile.rooms[1]]
}));
expectFailure('reject_invalid_confidence', () => validatePlanProfile({
  ...profile,
  walls: [{ ...profile.walls[0], confidence: 1.2 }, ...profile.walls.slice(1)]
}));

const report = {
  status: failures.length === 0 ? 'passed' : 'failed',
  checks: 30,
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
