#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

const allowedOpeningKinds = new Set(['door', 'window']);
const allowedSourceKinds = new Set(['plan_image', 'photo', 'vector_plan', 'hybrid', 'sketch', 'sketch_to_3d']);

export function adaptPlanProfile(planProfile, options = {}) {
  validatePlanProfile(planProfile);

  const projectSlug = String(options.projectSlug || 'kosmodraw-plan-profile-contract-fixture');
  if (!/^[a-z0-9-]+$/.test(projectSlug)) {
    throw new Error('projectSlug must be kebab-case.');
  }
  const sourceKind = options.sourceKind || 'vector_plan';
  if (!allowedSourceKinds.has(sourceKind)) {
    throw new Error(`sourceKind must be one of ${[...allowedSourceKinds].join(', ')}.`);
  }
  const sourceBasis = planProfile.provenance === 'recognized'
    ? 'KosmoDraw plan_profile v0.1 recognized geometry'
    : 'KosmoDraw plan_profile v0.1 exact projection';

  const rooms = [...planProfile.rooms]
    .sort(byId)
    .map((room) => ({
      id: room.id,
      name: room.name || room.id,
      function: room.function || null,
      polygon_xy: roundPoints(room.boundary_xy),
      floor_level: finiteNumber(room.floor_level, planProfile.floor_level),
      height_m: finiteNumber(room.height_m, null),
      area_m2: finiteNumber(room.area_m2, polygonArea(room.boundary_xy)),
      confidence: round(room.confidence),
      source_basis: sourceBasis
    }));

  const walls = [...planProfile.walls]
    .sort(byId)
    .map((wall) => {
      const [start, end] = roundPoints(wall.axis);
      return {
        id: wall.id,
        start_x: start[0],
        start_y: start[1],
        end_x: end[0],
        end_y: end[1],
        thickness_m: wall.thickness_m,
        height_m: wall.height_m,
        floor_level: planProfile.floor_level,
        structural_role: wall.is_external ? 'external' : 'internal',
        room_ids: [...(wall.room_ids || [])].sort(),
        cad_layer: wall.cad_layer || null,
        confidence: round(wall.confidence),
        source_basis: sourceBasis
      };
    });

  const wallById = new Map(planProfile.walls.map((wall) => [wall.id, wall]));
  const openings = [...planProfile.openings]
    .sort(byId)
    .map((opening) => {
      const host = wallById.get(opening.host_wall_id);
      const length = segmentLength(host.axis);
      return {
        id: opening.id,
        type: opening.type,
        host_wall_id: opening.host_wall_id,
        position_m: round(length * opening.position_t),
        position_t: round(opening.position_t),
        width_m: round(opening.width_m),
        height_m: round(opening.height_m),
        sill_m: round(opening.sill_m),
        floor_level: planProfile.floor_level,
        reveal: opening.reveal || null,
        confidence: round(opening.confidence),
        source_basis: sourceBasis
      };
    });

  const storyHeight = Math.max(0, ...rooms.map((room) => room.height_m || 0));
  const roomStamps = deriveRoomStamps(planProfile.rooms);
  const grid = planProfile.grid
    ? {
      spacing_m: round(planProfile.grid.spacing_m),
      origin_xy: roundPoints([planProfile.grid.origin_xy])[0]
    }
    : {
      spacing_m: 1,
      origin_xy: roundPoints([planProfile.units.origin])[0]
    };
  const dimensions = (planProfile.dimensions || [])
    .sort((left, right) => JSON.stringify(left.seg).localeCompare(JSON.stringify(right.seg)))
    .map((dimension) => ({
      ...dimension,
      seg: roundPoints(dimension.seg),
      length_m: round(dimension.length_m)
    }));
  const stories = [{
    id: planProfile.story_id,
    name: planProfile.story_id,
    floor_level: planProfile.floor_level,
    elevation_m: planProfile.floor_level === 0 ? 0 : null,
    height_m: storyHeight || null,
    source_basis: 'KosmoDraw plan_profile v0.1 story bridge'
  }];

  return {
    project_slug: projectSlug,
    status: 'review_only',
    public_display_allowed: false,
    source_kind: sourceKind,
    source_contract: {
      name: 'kosmodraw_plan_profile',
      schema_version: planProfile.schema_version,
      contract_status: 'producer_live',
      producer_commit: '01257fa',
      provenance: planProfile.provenance,
      deterministic_projection: planProfile.provenance === 'exact_projection',
      confidence_passthrough: true
    },
    rooms,
    walls,
    openings,
    stories,
    model_preview: null,
    drawings: [],
    plan_profile: {
      review_status: 'draft',
      public_display_allowed: false,
      story_id: planProfile.story_id,
      floor_level: planProfile.floor_level,
      units: planProfile.units,
      provenance: planProfile.provenance,
      confidence_summary: confidenceSummary([...rooms, ...walls, ...openings]),
      derived_by_consumer: {
        room_stamps: !Array.isArray(planProfile.room_stamps),
        dimensions: !Array.isArray(planProfile.dimensions),
        grid: !planProfile.grid
      },
      room_stamps: roomStamps,
      dimensions,
      grid,
      bounds: planProfile.bounds.map(round)
    },
    analysis_layers: [
      {
        analysis_type: 'plan_geometry',
        review_status: 'draft',
        summary: `${rooms.length} Räume und ${walls.length} deduplizierte Wandachsen aus dem live plan_profile-v0.1-Producer.`
      },
      {
        analysis_type: 'opening_semantics',
        review_status: 'draft',
        summary: `${openings.length} gehostete Türen/Fenster mit Position entlang der Wandachse.`
      },
      {
        analysis_type: 'dimension_chains',
        review_status: 'draft',
        summary: `${dimensions.length} gelieferte Masssegmente; fehlende Ketten werden consumer-seitig erzeugt und bleiben bis zur fachlichen Prüfung intern.`
      }
    ],
    asset_candidates: []
  };
}

export function validatePlanProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error('plan_profile must be an object.');
  }
  if (profile.schema_version !== '0.1') {
    throw new Error(`Unsupported plan_profile schema_version: ${profile.schema_version}`);
  }
  if (profile.units?.length !== 'm') {
    throw new Error('plan_profile units.length must be m.');
  }
  if (!validPoint(profile.units.origin)) {
    throw new Error('plan_profile units.origin must be a finite XY point.');
  }
  if (!['exact_projection', 'recognized'].includes(profile.provenance)) {
    throw new Error('plan_profile provenance must be exact_projection or recognized.');
  }
  if (!profile.story_id || !Number.isInteger(profile.floor_level)) {
    throw new Error('plan_profile requires story_id and integer floor_level.');
  }
  for (const key of ['rooms', 'walls', 'openings']) {
    if (!Array.isArray(profile[key])) throw new Error(`plan_profile.${key} must be an array.`);
  }
  for (const key of ['room_stamps', 'dimensions']) {
    if (profile[key] !== undefined && !Array.isArray(profile[key])) {
      throw new Error(`plan_profile.${key} must be an array when present.`);
    }
  }
  if (!Array.isArray(profile.bounds) || profile.bounds.length !== 4 || !profile.bounds.every(isFiniteNumber)) {
    throw new Error('plan_profile.bounds must contain four finite numbers.');
  }

  const roomIds = uniqueIds(profile.rooms, 'rooms');
  const wallIds = uniqueIds(profile.walls, 'walls');
  profile.rooms.forEach((room) => {
    if (!validPolygon(room.boundary_xy)) throw new Error(`Room ${room.id} needs a valid boundary_xy polygon.`);
    if (!Number.isInteger(room.floor_level)) throw new Error(`Room ${room.id} needs integer floor_level.`);
    validateConfidence(room.confidence, `Room ${room.id}`);
  });
  const wallSegments = new Set();
  profile.walls.forEach((wall) => {
    if (!validSegment(wall.axis)) throw new Error(`Wall ${wall.id} needs a valid axis segment.`);
    const segmentKey = canonicalSegmentKey(wall.axis);
    if (wallSegments.has(segmentKey)) throw new Error(`Wall ${wall.id} duplicates an existing wall axis.`);
    wallSegments.add(segmentKey);
    if (!positive(wall.thickness_m) || !positive(wall.height_m)) {
      throw new Error(`Wall ${wall.id} needs positive thickness_m and height_m.`);
    }
    for (const roomId of wall.room_ids || []) {
      if (!roomIds.has(roomId)) throw new Error(`Wall ${wall.id} references unknown room ${roomId}.`);
    }
    validateConfidence(wall.confidence, `Wall ${wall.id}`);
  });
  profile.openings.forEach((opening) => {
    if (!allowedOpeningKinds.has(opening.type)) throw new Error(`Opening ${opening.id} has unsupported type.`);
    if (!wallIds.has(opening.host_wall_id)) throw new Error(`Opening ${opening.id} references unknown host wall.`);
    if (!isFiniteNumber(opening.position_t) || opening.position_t < 0 || opening.position_t > 1) {
      throw new Error(`Opening ${opening.id} position_t must be between 0 and 1.`);
    }
    if (!positive(opening.width_m) || !positive(opening.height_m) || !isFiniteNumber(opening.sill_m)) {
      throw new Error(`Opening ${opening.id} needs width_m, height_m and sill_m.`);
    }
    validateConfidence(opening.confidence, `Opening ${opening.id}`);
  });
  (profile.room_stamps || []).forEach((stamp) => {
    if (!roomIds.has(stamp.room_id) || !validPoint(stamp.xy)) {
      throw new Error(`Room stamp ${stamp.room_id} needs a known room and finite xy.`);
    }
  });
  (profile.dimensions || []).forEach((dimension, index) => {
    if (!validSegment(dimension.seg) || !positive(dimension.length_m)) {
      throw new Error(`Dimension ${index} needs a valid segment and positive length_m.`);
    }
    if (Math.abs(segmentLength(dimension.seg) - dimension.length_m) > 0.002) {
      throw new Error(`Dimension ${index} length_m does not match its segment.`);
    }
  });
  if (profile.grid && (!positive(profile.grid.spacing_m) || !validPoint(profile.grid.origin_xy))) {
    throw new Error('plan_profile.grid needs positive spacing_m and finite origin_xy.');
  }
  const calculatedBounds = boundsForRooms(profile.rooms);
  if (calculatedBounds.some((value, index) => Math.abs(value - profile.bounds[index]) > 0.002)) {
    throw new Error('plan_profile.bounds do not match room geometry.');
  }
  return true;
}

function uniqueIds(items, label) {
  const ids = new Set();
  for (const item of items) {
    if (!item.id || ids.has(item.id)) throw new Error(`${label} require unique non-empty ids.`);
    ids.add(item.id);
  }
  return ids;
}

function validateConfidence(value, label) {
  if (!isFiniteNumber(value) || value < 0 || value > 1) {
    throw new Error(`${label} confidence must be a finite number between 0 and 1.`);
  }
}

function byId(left, right) {
  return String(left.id).localeCompare(String(right.id));
}

function round(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function roundPoints(points) {
  return points.map((point) => [round(point[0]), round(point[1])]);
}

function segmentLength(segment) {
  return Math.hypot(segment[1][0] - segment[0][0], segment[1][1] - segment[0][1]);
}

function canonicalSegmentKey(segment) {
  return roundPoints(segment)
    .map((point) => point.join(','))
    .sort()
    .join('|');
}

function boundsForRooms(rooms) {
  const points = rooms.flatMap((room) => room.boundary_xy);
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(round);
}

function polygonArea(points) {
  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
  return round(Math.abs(area) / 2);
}

function finiteNumber(value, fallback) {
  return isFiniteNumber(value) ? round(value) : fallback;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function positive(value) {
  return isFiniteNumber(value) && value > 0;
}

function validSegment(value) {
  return Array.isArray(value) && value.length === 2 && value.every(validPoint)
    && segmentLength(value) > 0;
}

function validPolygon(value) {
  return Array.isArray(value) && value.length >= 3 && value.every(validPoint);
}

function validPoint(value) {
  return Array.isArray(value) && value.length >= 2 && value.slice(0, 2).every(isFiniteNumber);
}

function deriveRoomStamps(rooms) {
  return [...rooms]
    .sort(byId)
    .map((room) => {
      const points = room.boundary_xy;
      const xy = [
        round(points.reduce((sum, point) => sum + point[0], 0) / points.length),
        round(points.reduce((sum, point) => sum + point[1], 0) / points.length)
      ];
      const area = finiteNumber(room.area_m2, polygonArea(points));
      return {
        room_id: room.id,
        xy,
        text: `${room.name || room.id}\n${area.toFixed(1)} m²`,
        area_m2: area,
        function: room.function || null,
        confidence: round(room.confidence),
        source_basis: 'ArchitectureCosmos consumer-derived room stamp'
      };
    });
}

function confidenceSummary(elements) {
  const values = elements.map((element) => element.confidence);
  if (values.length === 0) {
    return { element_count: 0, minimum: null, average: null, maximum: null };
  }
  return {
    element_count: values.length,
    minimum: round(Math.min(...values)),
    average: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    maximum: round(Math.max(...values))
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) {
    console.error('Usage: node scripts/kosmodraw-plan-profile-adapter.mjs --input profile.json --output bundle.json [--project-slug slug]');
    process.exit(2);
  }

  const inputPath = resolve(process.cwd(), args.input);
  const outputPath = resolve(process.cwd(), args.output);
  const profile = JSON.parse(await readFile(inputPath, 'utf8'));
  const bundle = adaptPlanProfile(profile, {
    projectSlug: args['project-slug'],
    sourceKind: args['source-kind']
  });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  console.log(`Adapted plan_profile ${profile.schema_version} -> review-only bundle`);
  console.log(`Rooms ${bundle.rooms.length}, walls ${bundle.walls.length}, openings ${bundle.openings.length}`);
  console.log(`Wrote ${args.output}`);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = true;
    }
  }
  return result;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
