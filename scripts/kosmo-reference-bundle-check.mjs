import fs from 'node:fs';

const requiredFields = [
  'project_slug',
  'status',
  'source_kind',
  'rooms',
  'walls',
  'openings',
  'stories',
  'analysis_layers',
  'asset_candidates'
];

const requiredArrays = ['rooms', 'walls', 'openings', 'stories', 'analysis_layers', 'asset_candidates'];
const allowedOpeningKinds = new Set(['door', 'window', 'stair', 'void']);
const allowedSourceKinds = new Set(['plan_image', 'photo', 'vector_plan', 'hybrid', 'sketch', 'sketch_to_3d']);
const privateLeakPatterns = [
  /\/mnt\//i,
  /\/home\//i,
  /source-root/i,
  /private-library/i,
  /onedrive/i,
  /archiv\/architekturkosmos\/assets/i,
  /\.pdf($|\?)/i,
  /archive-intake/i,
  /\bocr\b/i
];
const ignoredLocalPathKeys = new Set(['ifc_path', 'local_path', 'source_path', 'tmp_path']);
const failures = [];
const warnings = [];

const inputPaths = process.argv.slice(2);
if (inputPaths.length === 0) {
  console.error('Usage: node scripts/kosmo-reference-bundle-check.mjs <bundle.json> [...bundle.json]');
  process.exit(2);
}

function hasPrivateLeak(value) {
  return privateLeakPatterns.some((pattern) => pattern.test(String(value ?? '')));
}

function recordFailure(id, detail) {
  failures.push({ id, detail });
}

function recordWarning(id, detail) {
  warnings.push({ id, detail });
}

function readJson(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (error) {
    recordFailure(`${path}:parse`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

function validateBundle(bundle, path) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    recordFailure(`${path}:shape`, 'bundle must be a JSON object.');
    return null;
  }

  for (const field of requiredFields) {
    if (!(field in bundle)) {
      recordFailure(`${path}:${field}`, `missing required field ${field}.`);
    }
  }

  for (const field of requiredArrays) {
    if (!Array.isArray(bundle[field])) {
      recordFailure(`${path}:${field}`, `${field} must be an array.`);
    }
  }

  if (bundle.status !== 'review_only') {
    recordFailure(`${path}:status`, `status must be review_only for ArchitectureCosmos intake, got ${bundle.status}.`);
  }

  if (typeof bundle.project_slug !== 'string' || !/^[a-z0-9-]+$/.test(bundle.project_slug)) {
    recordFailure(`${path}:project_slug`, 'project_slug must be a kebab-case slug.');
  }

  if (!allowedSourceKinds.has(bundle.source_kind)) {
    recordFailure(`${path}:source_kind`, `source_kind must be one of ${[...allowedSourceKinds].join(', ')}.`);
  }

  scanForPublicFlags(bundle, path);
  scanPublicStrings(bundle, path);
  validateRooms(bundle.rooms ?? [], path);
  validateWalls(bundle.walls ?? [], path);
  validateOpenings(bundle.openings ?? [], path);
  validateStories(bundle.stories ?? [], path);
  validateReviewArtifact(bundle.model_preview, `${path}:model_preview`);
  validateReviewArtifacts(bundle.drawings ?? [], `${path}:drawings`);
  validateAnalysisLayers(bundle.analysis_layers ?? [], path);
  validateAssetCandidates(bundle.asset_candidates ?? [], path);

  return {
    path,
    project_slug: bundle.project_slug,
    status: bundle.status,
    rooms: Array.isArray(bundle.rooms) ? bundle.rooms.length : 0,
    walls: Array.isArray(bundle.walls) ? bundle.walls.length : 0,
    openings: Array.isArray(bundle.openings) ? bundle.openings.length : 0,
    stories: Array.isArray(bundle.stories) ? bundle.stories.length : 0,
    analysis_layers: Array.isArray(bundle.analysis_layers) ? bundle.analysis_layers.length : 0,
    asset_candidates: Array.isArray(bundle.asset_candidates) ? bundle.asset_candidates.length : 0
  };
}

function scanForPublicFlags(value, path) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForPublicFlags(item, `${path}[${index}]`));
    return;
  }

  if (value.public_display_allowed === true) {
    recordFailure(`${path}:public_display_allowed`, 'public_display_allowed must stay false for review-only bundle intake.');
  }

  for (const [key, child] of Object.entries(value)) {
    scanForPublicFlags(child, `${path}.${key}`);
  }
}

function scanPublicStrings(value, path) {
  if (typeof value === 'string') {
    if (hasPrivateLeak(value)) {
      recordFailure(`${path}:private-leak`, 'string contains blocked private/source pattern.');
    }
    return;
  }

  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPublicStrings(item, `${path}[${index}]`));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (ignoredLocalPathKeys.has(key)) continue;
    scanPublicStrings(child, `${path}.${key}`);
  }
}

function validateRooms(rooms, path) {
  rooms.forEach((room, index) => {
    if (!room.id) recordWarning(`${path}:rooms[${index}]:id`, 'room has no id.');
    if (!Array.isArray(room.polygon_xy)) recordWarning(`${path}:rooms[${index}]:polygon_xy`, 'room has no polygon_xy array.');
    if (typeof room.confidence !== 'number') recordWarning(`${path}:rooms[${index}]:confidence`, 'room has no numeric confidence.');
  });
}

function validateWalls(walls, path) {
  walls.forEach((wall, index) => {
    if (!wall.id) recordWarning(`${path}:walls[${index}]:id`, 'wall has no id.');
    if (!hasWallPosition(wall)) {
      recordWarning(`${path}:walls[${index}]:position`, 'wall should provide start/end coordinates or angle_deg + length_m.');
    }
    if (typeof wall.thickness_m !== 'number') recordWarning(`${path}:walls[${index}]:thickness_m`, 'wall has no numeric thickness_m.');
    if (typeof wall.confidence !== 'number') recordWarning(`${path}:walls[${index}]:confidence`, 'wall has no numeric confidence.');
  });
}

function hasWallPosition(wall) {
  const hasStartEnd = ['start_x', 'start_y', 'end_x', 'end_y'].every((key) => typeof wall[key] === 'number');
  const hasAngleLength = typeof wall.angle_deg === 'number' && typeof wall.length_m === 'number';
  return hasStartEnd || hasAngleLength;
}

function validateOpenings(openings, path) {
  openings.forEach((opening, index) => {
    const openingPath = `${path}:openings[${index}]`;
    const kind = opening.type ?? opening.kind;
    if (!opening.id) recordWarning(`${openingPath}:id`, 'opening has no id.');
    if (!allowedOpeningKinds.has(kind)) {
      recordFailure(`${openingPath}:kind`, `opening type/kind must be one of ${[...allowedOpeningKinds].join(', ')}.`);
    }
    if (!hasOpeningPosition(opening)) {
      recordFailure(`${openingPath}:position`, 'opening needs host_wall_id + position_m or at_xy/position_xy/at/xy coordinates.');
    }
    if (typeof opening.width_m !== 'number' || opening.width_m <= 0) {
      recordFailure(`${openingPath}:width_m`, 'opening needs a positive numeric width_m.');
    }
    if (kind === 'window' && typeof opening.sill_m !== 'number') {
      recordWarning(`${openingPath}:sill_m`, 'window opening should include sill_m for IFC window placement.');
    }
    if (typeof opening.height_m !== 'number' || opening.height_m <= 0) {
      recordWarning(`${openingPath}:height_m`, 'opening should include a positive numeric height_m.');
    }
    if (typeof opening.confidence !== 'number') {
      recordWarning(`${openingPath}:confidence`, 'opening has no numeric confidence.');
    }
  });
}

function hasOpeningPosition(opening) {
  const hasHostPosition = Boolean(opening.host_wall_id) && typeof opening.position_m === 'number';
  const hasAtCoordinates = isPoint(opening.at_xy) || isPoint(opening.position_xy) || isPoint(opening.at) || isPoint(opening.xy);
  return hasHostPosition || hasAtCoordinates;
}

function isPoint(value) {
  return Array.isArray(value) && value.length >= 2 && value.slice(0, 2).every((item) => typeof item === 'number');
}

function validateStories(stories, path) {
  stories.forEach((story, index) => {
    const storyPath = `${path}:stories[${index}]`;
    if (!story.id) recordWarning(`${storyPath}:id`, 'story has no id.');
    if (typeof story.elevation_m !== 'number') recordWarning(`${storyPath}:elevation_m`, 'story has no numeric elevation_m.');
    if (typeof story.height_m !== 'number' || story.height_m <= 0) recordWarning(`${storyPath}:height_m`, 'story should include a positive numeric height_m.');
  });
}

function validateReviewArtifacts(artifacts, path) {
  if (!Array.isArray(artifacts)) {
    recordFailure(path, 'drawings must be an array when present.');
    return;
  }

  artifacts.forEach((artifact, index) => validateReviewArtifact(artifact, `${path}[${index}]`));
}

function validateReviewArtifact(artifact, path) {
  if (!artifact) return;
  if (artifact.public_display_allowed !== false) {
    recordFailure(`${path}:public_display_allowed`, 'review artifact must explicitly set public_display_allowed false.');
  }
  if (!artifact.review_status) {
    recordWarning(`${path}:review_status`, 'review artifact should include review_status.');
  }
}

function validateAnalysisLayers(layers, path) {
  layers.forEach((layer, index) => {
    if (!layer.analysis_type) recordFailure(`${path}:analysis_layers[${index}]:analysis_type`, 'analysis layer needs analysis_type.');
    if (!layer.review_status) recordFailure(`${path}:analysis_layers[${index}]:review_status`, 'analysis layer needs review_status.');
  });
}

function validateAssetCandidates(candidates, path) {
  candidates.forEach((candidate, index) => {
    if (!candidate.kind) recordFailure(`${path}:asset_candidates[${index}]:kind`, 'asset candidate needs kind.');
    if (!candidate.title) recordFailure(`${path}:asset_candidates[${index}]:title`, 'asset candidate needs title.');
    if (!candidate.rights_status) recordFailure(`${path}:asset_candidates[${index}]:rights_status`, 'asset candidate needs rights_status.');
    if (candidate.public_display_allowed !== false) {
      recordFailure(`${path}:asset_candidates[${index}]:public_display_allowed`, 'asset candidate must explicitly set public_display_allowed false.');
    }
  });
}

const checked = inputPaths
  .map((path) => {
    const bundle = readJson(path);
    return validateBundle(bundle, path);
  })
  .filter(Boolean);

const summary = {
  status: failures.length === 0 ? 'passed' : 'failed',
  checked,
  failures,
  warnings
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
