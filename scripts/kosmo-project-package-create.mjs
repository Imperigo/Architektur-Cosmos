#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = parseArgs(process.argv.slice(2));
const today = new Date().toISOString().slice(0, 10);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const name = args.name || args.title;
  if (!name) {
    throw new Error('Usage: npm run kosmo:package-create -- --name "Projektname" [--address "..."] [--program "Studio:48, Library:18"]');
  }

  const projectId = slugify(args.project || args.slug || name);
  const outputRoot = resolve(root, args['output-root'] || 'archive-intake/kosmo-projects');
  const projectRoot = resolve(outputRoot, projectId);
  const force = Boolean(args.force);

  if (existsSync(projectRoot) && !force) {
    throw new Error(`Project package already exists: ${relative(root, projectRoot)}. Use --force to overwrite generated files.`);
  }

  const program = parseProgram(args.program || args.rooms || '');
  const site = {
    address: args.address || '',
    locality: args.locality || '',
    country: args.country || '',
    latitude: numericOrNull(args.lat ?? args.latitude),
    longitude: numericOrNull(args.lng ?? args.lon ?? args.longitude),
    north_rotation_degrees: numericOrDefault(args.north ?? args['north-rotation'], 0),
    coordinate_source: args['coordinate-source'] || (args.lat || args.lng ? 'manual_input' : 'unknown')
  };

  await createFolders(projectRoot);
  const files = buildFiles({ name, projectId, projectRoot, site, program });
  await Promise.all(Object.entries(files).map(([pathname, content]) => writeText(join(projectRoot, pathname), content)));

  console.log('Kosmo project package created');
  console.log(`Project: ${projectId}`);
  console.log(`Path: ${relative(root, projectRoot)}`);
  console.log('');
  console.log('Validate:');
  console.log(`npm run kosmo:package-check -- --project ${shellQuote(relative(root, projectRoot))}`);

  if (!args['skip-check']) {
    const result = spawnSync('npm', ['run', 'kosmo:package-check', '--', '--project', relative(root, projectRoot)], {
      cwd: root,
      stdio: 'inherit'
    });
    if (result.status !== 0) process.exitCode = result.status || 1;
  }
}

async function createFolders(projectRoot) {
  const folders = [
    'brief',
    'data',
    'design',
    'draw/plans',
    'draw/sections',
    'draw/exports',
    'viz/previews',
    'publish',
    'memory'
  ];
  await Promise.all(folders.map((folder) => mkdir(join(projectRoot, folder), { recursive: true })));
}

function buildFiles({ name, projectId, site, program }) {
  const manifest = buildManifest({ name, projectId, site });
  const constraints = buildConstraints(program);
  const modelProfile = buildModelProfile(projectId, program);
  const projectTitle = escapeXml(name);

  return {
    'kosmo.project.json': json(manifest),
    'README.md': `# ${name}\n\nLocal Kosmo project package created by \`kosmo:package-create\`.\n\nStatus: local review only. Nothing in this folder is public-safe until reviewed.\n`,
    'brief/kosmo-brief.md': renderBrief({ name, site, program }),
    'brief/constraints.json': json(constraints),
    'brief/open-questions.md': renderOpenQuestions(name),
    'data/sources.json': json({
      schema_version: '0.1',
      sources: [
        {
          id: 'source-manual-start',
          title: `${name} manual start package`,
          type: 'local_note',
          path: 'brief/kosmo-brief.md',
          rights_status: 'internal_only',
          confidence: 'medium'
        }
      ]
    }),
    'data/references.json': json({
      schema_version: '0.1',
      references: [],
      note: 'Kosmo Data should add reviewed reference candidates here.'
    }),
    'data/assets.json': json({
      schema_version: '0.1',
      assets: [],
      note: 'KosmoAssets candidates stay review-only until rights and geometry are checked.'
    }),
    'data/rights-review.json': json({
      schema_version: '0.1',
      overall_status: 'internal_only',
      rules: [
        'Local package output is private by default.',
        'Generated geometry, plans, images and model files require review before public use.',
        'No external upload or public release without explicit approval.'
      ],
      blocked_actions: ['public_release', 'external_upload', 'client_delivery']
    }),
    'design/model-profile.json': json(modelProfile),
    'design/context-import.generated.json': json(buildContextImportSeed(projectId, 'package_create')),
    'design/context-candidates.generated.json': json(buildContextCandidatesSeed(projectId, 'package_create')),
    'design/context-selection.json': json(buildContextSelectionSeed(projectId, 'package_create')),
    'design/context-decision-matrix.generated.json': json(buildContextDecisionMatrixSeed(projectId, 'package_create')),
    'design/context-decision-matrix.generated.md': renderContextDecisionMatrixSeed(projectId),
    'design/context-source-map.generated.json': json(buildContextSourceMapSeed(projectId, 'package_create')),
    'design/context-source-map.generated.md': renderContextSourceMapSeed(projectId),
    'design/context-source-review.generated.json': json(buildContextSourceReviewSeed(projectId, 'package_create')),
    'design/context-source-review.generated.md': renderContextSourceReviewSeed(projectId),
    'design/context-source-mapping.json': json(buildContextSourceMappingSeed(projectId, 'package_create')),
    'design/context-source-mapping.md': renderContextSourceMappingSeed(projectId),
    'design/ifc-semantic-proof.generated.json': json(buildIfcSemanticProofSeed(projectId, 'package_create')),
    'design/ifc-semantic-proof.generated.md': renderIfcSemanticProofSeed(projectId),
    'design/variants.json': json({
      schema_version: '0.1',
      variants: [
        {
          id: 'variant-a',
          label: 'Initial package seed',
          status: 'active',
          description: 'First conceptual variant generated from the project package input.',
          source: 'kosmo_package_create'
        }
      ]
    }),
    'draw/exports/ground-floor-plan.svg': renderPlanSvg(projectTitle, modelProfile.rooms),
    'draw/exports/section-a.svg': renderSectionSvg(projectTitle, modelProfile.stories),
    'draw/plans/README.md': '# Plans\n\nKosmo Draw can write generated plan views here.\n',
    'draw/sections/README.md': '# Sections\n\nKosmo Draw can write generated section views here.\n',
    'viz/cameras.json': json(buildCameras()),
    'viz/render-presets.json': json(buildRenderPresets()),
    'viz/previews/preview-manifest.json': json({
      schema_version: '0.1',
      previews: [],
      note: 'Kosmo Viz should write generated previews here.'
    }),
    'publish/review-pack.md': renderReviewPack(name),
    'publish/export-manifest.json': json({
      schema_version: '0.1',
      exports: [
        {
          path: 'design/context-import.generated.json',
          module: 'Kosmo Design',
          format: 'json',
          status: 'pending_blender_context_import',
          rights_status: 'generated_needs_review'
        },
        {
          path: 'design/context-candidates.generated.json',
          module: 'Kosmo Design',
          format: 'json',
          status: 'pending_blender_context_import',
          rights_status: 'generated_needs_review'
        },
        {
          path: 'design/context-selection.json',
          module: 'Kosmo Design',
          format: 'json',
          status: 'pending_context_candidates',
          rights_status: 'internal_only'
        },
        {
          path: 'design/context-decision-matrix.generated.json',
          module: 'Kosmo Design',
          format: 'json',
          status: 'pending_context_candidates',
          rights_status: 'generated_needs_review'
        },
        {
          path: 'design/context-decision-matrix.generated.md',
          module: 'Kosmo Design',
          format: 'markdown',
          status: 'pending_context_candidates',
          rights_status: 'generated_needs_review'
        },
        {
          path: 'design/context-source-map.generated.json',
          module: 'Kosmo Design',
          format: 'json',
          status: 'pending_source_inventory',
          rights_status: 'generated_needs_review'
        },
        {
          path: 'design/context-source-map.generated.md',
          module: 'Kosmo Design',
          format: 'markdown',
          status: 'pending_source_inventory',
          rights_status: 'generated_needs_review'
        },
        {
          path: 'design/context-source-review.generated.json',
          module: 'Kosmo Design',
          format: 'json',
          status: 'pending_source_review_targets',
          rights_status: 'generated_needs_review'
        },
        {
          path: 'design/context-source-review.generated.md',
          module: 'Kosmo Design',
          format: 'markdown',
          status: 'pending_source_review_targets',
          rights_status: 'generated_needs_review'
        },
        {
          path: 'design/context-source-mapping.json',
          module: 'Kosmo Design',
          format: 'json',
          status: 'pending_source_mapping',
          rights_status: 'internal_only'
        },
        {
          path: 'design/context-source-mapping.md',
          module: 'Kosmo Design',
          format: 'markdown',
          status: 'pending_source_mapping',
          rights_status: 'internal_only'
        },
        {
          path: 'design/ifc-semantic-proof.generated.json',
          module: 'Kosmo Design',
          format: 'json',
          status: 'pending_ifc_source',
          rights_status: 'generated_needs_review'
        },
        {
          path: 'design/ifc-semantic-proof.generated.md',
          module: 'Kosmo Design',
          format: 'markdown',
          status: 'pending_ifc_source',
          rights_status: 'generated_needs_review'
        },
        {
          path: 'draw/exports/ground-floor-plan.svg',
          module: 'Kosmo Draw',
          format: 'svg',
          status: 'placeholder',
          rights_status: 'generated_needs_review'
        },
        {
          path: 'draw/exports/section-a.svg',
          module: 'Kosmo Draw',
          format: 'svg',
          status: 'placeholder',
          rights_status: 'generated_needs_review'
        },
        {
          path: 'publish/review-pack.md',
          module: 'Kosmo Publish',
          format: 'markdown',
          status: 'scaffold',
          rights_status: 'internal_only'
        }
      ]
    }),
    'publish/change-log.md': `# Change Log\n\n## ${today}\n\n- Created local Kosmo project package with \`kosmo:package-create\`.\n`,
    'memory/decisions.jsonl': `${jsonl({ timestamp: now(), module: 'orbit', decision: 'Create local review-only Kosmo project package.', status: 'accepted', review_required: false })}\n`,
    'memory/jobs.jsonl': `${jsonl({ timestamp: now(), job_id: 'job-package-create-001', module: 'orbit', status: 'completed', summary: 'Generated package folders, manifest and scaffolds.' })}\n`,
    'memory/uncertainty-log.jsonl': `${jsonl({ timestamp: now(), module: 'prepare', topic: 'input', severity: 'medium', description: 'Package is generated from initial manual input and needs project review.' })}\n`
  };
}

function buildManifest({ name, projectId, site }) {
  return {
    schema_version: '0.1',
    project_id: projectId,
    name,
    created_at: today,
    updated_at: today,
    status: 'draft',
    risk_level: 'local_review_only',
    site,
    modules: {
      prepare: moduleState('review_ready', 'Initial package brief and constraints scaffold exist.', 'Kosmo Prepare'),
      data: moduleState('pending', 'References, sources and asset candidates still need review.', 'Kosmo Data'),
      orbit: moduleState('review_ready', 'Project manifest and module folders exist.', 'Kosmo Orbit'),
      design: moduleState('pending', 'Model profile scaffold exists and can be imported by Kosmo Design.', 'Kosmo Design'),
      draw: moduleState('pending', 'Placeholder plan outputs exist; generated exports are not ready.', 'Kosmo Draw'),
      viz: moduleState('pending', 'Camera and render presets exist; no rendered previews yet.', 'Kosmo Viz'),
      publish: moduleState('pending', 'Review pack scaffold exists and awaits outputs.', 'Kosmo Publish'),
      zentrale: moduleState('pending', 'Memory logs exist, not yet registered in a Control Hub.', 'Kosmo Zentrale')
    },
    package_paths: {
      brief: 'brief/',
      data: 'data/',
      design: 'design/',
      draw: 'draw/',
      viz: 'viz/',
      publish: 'publish/',
      memory: 'memory/'
    },
    inputs: [
      artifact('brief/kosmo-brief.md', 'brief', 'prepare', 'internal_only', 'Human-readable start brief.'),
      artifact('brief/constraints.json', 'constraints', 'prepare', 'internal_only', 'Structured constraints and open questions.'),
      artifact('data/sources.json', 'source_registry', 'data', 'internal_only', 'Initial local source registry.')
    ],
    outputs: [
      artifact('design/model-profile.json', 'model_profile', 'design', 'generated_needs_review', 'Conceptual model profile for Blender/Kosmo Design.'),
      artifact('design/context-import.generated.json', 'other', 'design', 'generated_needs_review', 'KosmoDraw context import report.'),
      artifact('design/context-candidates.generated.json', 'other', 'design', 'generated_needs_review', 'KosmoDraw context candidates.'),
      artifact('design/context-selection.json', 'other', 'design', 'internal_only', 'Human review gate for accepting context candidates as design input.'),
      artifact('design/context-decision-matrix.generated.json', 'other', 'design', 'generated_needs_review', 'Generated recommendation matrix for reviewing context candidates.'),
      artifact('design/context-decision-matrix.generated.md', 'other', 'design', 'generated_needs_review', 'Human-readable recommendation matrix for reviewing context candidates.'),
      artifact('design/context-source-map.generated.json', 'other', 'design', 'generated_needs_review', 'Generated DXF/IFC source inventory and mapping recommendation.'),
      artifact('design/context-source-map.generated.md', 'other', 'design', 'generated_needs_review', 'Human-readable DXF/IFC source inventory and mapping recommendation.'),
      artifact('design/context-source-review.generated.json', 'other', 'design', 'generated_needs_review', 'Automated source evidence review for context candidates that need source review.'),
      artifact('design/context-source-review.generated.md', 'other', 'design', 'generated_needs_review', 'Human-readable source evidence review for context candidates.'),
      artifact('design/context-source-mapping.json', 'other', 'design', 'internal_only', 'Human source mapping gate for reviewed DXF layer and semantic IFC decisions.'),
      artifact('design/context-source-mapping.md', 'other', 'design', 'internal_only', 'Human-readable source mapping gate for DXF/IFC decisions.'),
      artifact('design/ifc-semantic-proof.generated.json', 'other', 'design', 'generated_needs_review', 'Read-only semantic IFC proof before design-seed review.'),
      artifact('design/ifc-semantic-proof.generated.md', 'other', 'design', 'generated_needs_review', 'Human-readable semantic IFC proof before design-seed review.'),
      artifact('draw/exports/ground-floor-plan.svg', 'plan_export', 'draw', 'generated_needs_review', 'Placeholder vector ground floor export.'),
      artifact('draw/exports/section-a.svg', 'plan_export', 'draw', 'generated_needs_review', 'Placeholder vector section export.'),
      artifact('publish/review-pack.md', 'review_pack', 'publish', 'internal_only', 'Local review package scaffold.')
    ],
    review_gates: {
      public_release: gate('disabled', 'Local review package; no public release is allowed by default.'),
      external_upload: gate('disabled', 'No external upload is allowed from package-create.'),
      client_delivery: gate('disabled', 'Not a reviewed client package.'),
      paid_cloud_job: gate('requires_human_approval', 'Any paid cloud generation must be approved explicitly.')
    },
    notes: 'Generated by kosmo:package-create as a local review-only package.'
  };
}

function moduleState(status, summary, owner) {
  return { status, summary, last_run_at: null, owner };
}

function gate(mode, reason) {
  return { mode, reason, approved_by: null, approved_at: null };
}

function artifact(pathname, type, module, rights_status, description) {
  return { path: pathname, type, module, rights_status, description };
}

function buildConstraints(program) {
  return {
    schema_version: '0.1',
    program,
    site_boundaries: [],
    building_law_constraints: [],
    design_goals: [
      'Keep the first package small, legible and reviewable.',
      'Keep generated outputs marked as review-required.',
      'Make future Blender collections and plan layers easy to derive.'
    ],
    open_questions: [
      'Which project documents, scans, PDFs or site inputs should be added first?',
      'Which references from KosmoData should guide the first design move?',
      'Which outputs are needed first: model, plan, render or review pack?'
    ],
    uncertainties: [
      {
        id: 'u-001',
        topic: 'source_basis',
        description: 'The package was generated from initial manual metadata and needs review.',
        severity: 'medium'
      }
    ]
  };
}

function buildModelProfile(projectId, program) {
  const rooms = (program.length ? program : [{ id: 'room-main', label: 'Main room', target_area_m2: 36 }]).map((item, index) => {
    const width = Math.max(3, Math.sqrt(item.target_area_m2 || 24));
    const depth = Math.max(3, (item.target_area_m2 || 24) / width);
    const x = (index % 3) * 7;
    const y = Math.floor(index / 3) * 6;
    return {
      id: item.id || `room-${index + 1}`,
      story_id: 'level-00',
      name: item.label || item.id || `Room ${index + 1}`,
      function: item.function || 'program',
      area_m2: item.target_area_m2 || null,
      boundary_xy: [
        [round(x), round(y)],
        [round(x + width), round(y)],
        [round(x + width), round(y + depth)],
        [round(x), round(y + depth)]
      ]
    };
  });

  return {
    schema_version: '0.1',
    units: 'meters',
    source_confidence: 'conceptual',
    stories: [
      { id: 'level-00', label: 'EG', elevation_m: 0, height_m: 3.2 },
      { id: 'level-01', label: '1.OG', elevation_m: 3.2, height_m: 3.2 }
    ],
    rooms,
    walls: [],
    areas: [
      {
        id: 'area-program-total',
        label: 'Target program total',
        value_m2: round(program.reduce((sum, item) => sum + (item.target_area_m2 || 0), 0) || rooms.reduce((sum, room) => sum + (room.area_m2 || 0), 0))
      }
    ],
    collections: [
      projectId,
      `${projectId}/00_Boundaries`,
      `${projectId}/10_Rooms`,
      `${projectId}/20_Walls`,
      `${projectId}/30_Draw`,
      `${projectId}/40_Viz`
    ]
  };
}

function buildContextImportSeed(projectId, source) {
  return {
    schema_version: '0.1',
    generated_at: null,
    generator: 'kosmo-project-package-create',
    project_id: projectId,
    status: 'pending_blender_context_import',
    rights_status: 'internal_only',
    source_stage: 'phase_0_context',
    source,
    note: 'KosmoDraw should overwrite this file after importing package context into Blender.',
    context: null
  };
}

function buildContextCandidatesSeed(projectId, source) {
  return {
    schema_version: '0.1',
    generated_at: null,
    generator: 'kosmo-project-package-create',
    project_id: projectId,
    status: 'pending_blender_context_import',
    rights_status: 'internal_only',
    source_stage: 'phase_0_context',
    source,
    note: 'KosmoDraw should overwrite this file with review-required context candidates after importing package context into Blender.',
    summary: {
      candidate_count: 0,
      review_required_count: 0,
      design_readiness: 'pending_blender_context_import',
      suggested_next_step: 'run_kosmo_blender_package_smoke'
    },
    candidates: []
  };
}

function buildContextSelectionSeed(projectId, source) {
  return {
    schema_version: '0.1',
    generated_at: null,
    generator: 'kosmo-project-package-create',
    project_id: projectId,
    status: 'pending_context_candidates',
    rights_status: 'internal_only',
    source_stage: 'phase_0_context',
    source,
    source_candidates_path: 'design/context-candidates.generated.json',
    approved_for_design_generation: false,
    policy: {
      generated_candidates_are_not_design_facts: true,
      default_decision: 'undecided',
      accepted_as_design_seed_requires_human_review: true,
      public_or_external_use_allowed: false
    },
    review: {
      reviewed_by: null,
      reviewed_at: null,
      notes: []
    },
    summary: {
      candidate_count: 0,
      accepted_as_context_count: 0,
      accepted_as_design_seed_count: 0,
      needs_more_source_review_count: 0,
      rejected_count: 0,
      undecided_count: 0,
      stale_selection_count: 0,
      readiness: 'pending_context_candidates'
    },
    selections: [],
    stale_selections: []
  };
}

function buildContextDecisionMatrixSeed(projectId, source) {
  return {
    schema_version: '0.1',
    generated_at: null,
    generator: 'kosmo-project-package-create',
    project_id: projectId,
    status: 'pending_context_candidates',
    rights_status: 'internal_only',
    source_stage: 'phase_0_context',
    source,
    source_candidates_path: 'design/context-candidates.generated.json',
    source_selection_path: 'design/context-selection.json',
    note: 'Run npm run kosmo:context-matrix -- --project <project> after context candidates exist.',
    policy: {
      matrix_is_advisory: true,
      context_selection_is_source_of_truth_for_human_decisions: true,
      approved_for_design_generation_is_never_set_by_matrix: true
    },
    summary: {
      candidate_count: 0,
      recommended_accepted_as_context_count: 0,
      recommended_accepted_as_design_seed_count: 0,
      recommended_needs_more_source_review_count: 0,
      recommended_rejected_count: 0,
      current_undecided_count: 0,
      recommended_next_step: 'generate_context_candidates'
    },
    rows: []
  };
}

function renderContextDecisionMatrixSeed(projectId) {
  return `# Context Decision Matrix\n\nProject ID: \`${projectId}\`\n\nPending context candidates. Run \`npm run kosmo:context-matrix -- --project <project>\` after KosmoDraw has generated \`design/context-candidates.generated.json\`.\n`;
}

function buildContextSourceMapSeed(projectId, source) {
  return {
    schema_version: '0.1',
    generated_at: null,
    generator: 'kosmo-project-package-create',
    project_id: projectId,
    status: 'pending_source_inventory',
    rights_status: 'internal_only',
    source_stage: 'phase_0_context',
    source,
    note: 'Run npm run kosmo:context-source-map -- --project <project> after local DXF/IFC sources are registered.',
    summary: {
      dxf_exists: false,
      dxf_total_entities: 0,
      dxf_total_polylines: 0,
      dxf_layer_count: 0,
      ifc_exists: false,
      ifc_total_entities: 0,
      ifc_entity_type_count: 0,
      ifc_semantic_building_element_count: 0,
      design_seed_candidate_after_review_count: 0,
      recommended_next_step: 'register_local_sources'
    },
    dxf: { top_layers: [] },
    ifc: { top_entity_types: [], semantic_entity_types: [] },
    rows: []
  };
}

function renderContextSourceMapSeed(projectId) {
  return `# Context Source Map\n\nProject ID: \`${projectId}\`\n\nPending source inventory. Run \`npm run kosmo:context-source-map -- --project <project>\` after local DXF/IFC sources are available.\n`;
}

function buildContextSourceReviewSeed(projectId, source) {
  return {
    schema_version: '0.1',
    generated_at: null,
    generator: 'kosmo-project-package-create',
    project_id: projectId,
    status: 'pending_source_review_targets',
    rights_status: 'internal_only',
    source_stage: 'phase_0_context',
    source,
    source_candidates_path: 'design/context-candidates.generated.json',
    source_selection_path: 'design/context-selection.json',
    note: 'Run npm run kosmo:context-source-review -- --project <project> after context-selection marks candidates as needs_more_source_review.',
    summary: {
      target_count: 0,
      automated_evidence_confirmed_count: 0,
      automated_evidence_missing_or_incomplete_count: 0,
      open_human_review_count: 0,
      design_seed_possible_after_review_count: 0,
      recommended_next_step: 'review_context_selection'
    },
    rows: []
  };
}

function renderContextSourceReviewSeed(projectId) {
  return `# Context Source Review\n\nProject ID: \`${projectId}\`\n\nPending source-review targets. Run \`npm run kosmo:context-source-review -- --project <project>\` after \`design/context-selection.json\` contains \`needs_more_source_review\` candidates.\n`;
}

function buildContextSourceMappingSeed(projectId, source) {
  return {
    schema_version: '0.1',
    generated_at: null,
    generator: 'kosmo-project-package-create',
    project_id: projectId,
    status: 'pending_source_mapping',
    rights_status: 'internal_only',
    source_stage: 'phase_0_context',
    source,
    source_map_path: 'design/context-source-map.generated.json',
    source_review_path: 'design/context-source-review.generated.json',
    source_selection_path: 'design/context-selection.json',
    note: 'Run npm run kosmo:context-source-mapping -- --project <project> after source-map/source-review exist.',
    summary: {
      mapping_row_count: 0,
      pending_review_count: 0,
      accepted_as_context_count: 0,
      accepted_as_design_seed_count: 0,
      needs_more_source_review_count: 0,
      rejected_count: 0,
      linked_context_candidate_count: 0,
      design_seed_possible_after_review_count: 0,
      recommended_next_step: 'generate_source_map'
    },
    rows: []
  };
}

function renderContextSourceMappingSeed(projectId) {
  return `# Context Source Mapping\n\nProject ID: \`${projectId}\`\n\nPending source mapping. Run \`npm run kosmo:context-source-mapping -- --project <project>\` after source-map and source-review reports exist.\n`;
}

function buildIfcSemanticProofSeed(projectId, source) {
  return {
    schema_version: '0.1',
    generated_at: null,
    generator: 'kosmo-project-package-create',
    project_id: projectId,
    status: 'pending_ifc_source',
    rights_status: 'internal_only',
    source_stage: 'phase_0_context',
    source,
    note: 'Run npm run kosmo:ifc-semantic-proof -- --project <project> after a local IFC source is registered.',
    summary: {
      ifc_exists: false,
      ifc_total_entities: 0,
      ifc_entity_type_count: 0,
      ifcbuildingelementproxy_count: 0,
      elements_with_object_placement: 0,
      elements_with_product_shape: 0,
      elements_contained_in_spatial_structure: 0,
      elements_with_property_sets: 0,
      design_seed_approved: false,
      recommended_next_step: 'register_ifc_source'
    },
    elements: []
  };
}

function renderIfcSemanticProofSeed(projectId) {
  return `# IFC Semantic Proof\n\nProject ID: \`${projectId}\`\n\nPending IFC source. Run \`npm run kosmo:ifc-semantic-proof -- --project <project>\` after a local IFC source is available.\n`;
}

function buildCameras() {
  return {
    schema_version: '0.1',
    cameras: [
      {
        id: 'cam-entry-eye',
        label: 'Entry eye-level',
        position: [7.5, -9, 1.7],
        target: [4, 3, 1.4],
        lens_mm: 28,
        purpose: 'human-scale preview'
      },
      {
        id: 'cam-axon',
        label: 'Concept axon',
        position: [10, -12, 9],
        target: [4, 3, 2],
        lens_mm: 45,
        purpose: 'overview'
      }
    ]
  };
}

function buildRenderPresets() {
  return {
    schema_version: '0.1',
    presets: [
      {
        id: 'eevee-live-preview',
        engine: 'EEVEE',
        resolution: [1280, 720],
        sun: { enabled: true, date: '2026-06-21', time: '10:00', timezone: 'Europe/Zurich' },
        status: 'planned'
      },
      {
        id: 'cycles-review-snapshot',
        engine: 'CYCLES',
        resolution: [1600, 1000],
        samples: 64,
        status: 'planned'
      }
    ]
  };
}

function renderBrief({ name, site, program }) {
  const lines = [
    `# Kosmo Brief`,
    '',
    `Project: ${name}`,
    `Status: local review only`,
    '',
    '## Site',
    '',
    `- Address: ${site.address || 'needs input'}`,
    `- Locality: ${site.locality || 'needs input'}`,
    `- Country: ${site.country || 'needs input'}`,
    '',
    '## Program',
    ''
  ];
  if (program.length) {
    for (const item of program) lines.push(`- ${item.label}: ${item.target_area_m2 || 'n/a'} m2`);
  } else {
    lines.push('- needs input');
  }
  lines.push('', '## Intent', '', 'This package is a structured starting point. Kosmo Prepare should refine brief, constraints and open questions before any public or external action.');
  return `${lines.join('\n')}\n`;
}

function renderOpenQuestions(name) {
  return `# Open Questions\n\n- What are the most important source documents for ${name}?\n- Which KosmoData references should guide the first design step?\n- Which constraints are hard facts and which are assumptions?\n- Which outputs are needed first: model, plan, visual preview or review pack?\n`;
}

function renderReviewPack(name) {
  return `# ${name} Review Pack\n\nStatus: scaffold  \nRisk level: local review only\n\n## Review Notes\n\n- This package is generated from initial metadata.\n- Geometry, plans and renders are placeholders or conceptual until reviewed.\n- No public release, external upload or client delivery is allowed.\n\n## Next Actions\n\n1. Add project sources to \`data/sources.json\`.\n2. Refine \`brief/constraints.json\`.\n3. Let Kosmo Data suggest references and assets.\n4. Let Kosmo Design replace the conceptual model profile.\n5. Let Kosmo Draw and Kosmo Viz replace placeholders.\n`;
}

function renderPlanSvg(title, rooms) {
  const roomRects = rooms.map((room, index) => {
    const [[x0, y0], [x1], [, y1]] = room.boundary_xy;
    const scale = 35;
    const x = 40 + x0 * scale;
    const y = 70 + y0 * scale;
    const width = Math.max(80, (x1 - x0) * scale);
    const height = Math.max(70, (y1 - y0) * scale);
    const color = index % 2 === 0 ? '#dff7ff' : '#f2e7ff';
    return [
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" stroke="#111827" stroke-width="2"/>`,
      `<text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="18" fill="#111827">${escapeXml(room.name)}</text>`
    ].join('\n  ');
  }).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540" role="img" aria-label="${title} placeholder ground floor plan">\n  <rect x="20" y="20" width="860" height="500" fill="#f8fbff" stroke="#1f6feb" stroke-width="3"/>\n  <text x="40" y="48" font-family="Arial, sans-serif" font-size="18" fill="#111827">${title} - EG placeholder</text>\n  ${roomRects}\n  <line x1="40" y1="500" x2="140" y2="500" stroke="#111827" stroke-width="2"/>\n  <text x="90" y="522" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#111827">5 m</text>\n</svg>\n`;
}

function renderSectionSvg(title, stories) {
  const floors = stories.map((story, index) => {
    const y = 380 - index * 150;
    return [
      `<rect x="80" y="${y - 120}" width="620" height="120" fill="${index % 2 === 0 ? '#dff7ff' : '#f2e7ff'}" stroke="#111827" stroke-width="2"/>`,
      `<text x="390" y="${y - 60}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="22" fill="#111827">${escapeXml(story.label)}</text>`
    ].join('\n  ');
  }).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520" role="img" aria-label="${title} placeholder section A">\n  <text x="40" y="48" font-family="Arial, sans-serif" font-size="18" fill="#111827">${title} - Section A placeholder</text>\n  ${floors}\n  <line x1="50" y1="380" x2="760" y2="380" stroke="#111827" stroke-width="3"/>\n</svg>\n`;
}

async function writeText(pathname, content) {
  await mkdir(resolve(pathname, '..'), { recursive: true });
  await writeFile(pathname, content, 'utf8');
}

function parseProgram(value) {
  return String(value || '')
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => {
      const [rawLabel, rawArea] = part.split(':').map((item) => item?.trim());
      const label = rawLabel || `Room ${index + 1}`;
      return {
        id: slugify(label),
        label,
        target_area_m2: numericOrNull(rawArea)
      };
    });
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function jsonl(value) {
  return JSON.stringify(value);
}

function numericOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numericOrDefault(value, fallback) {
  const number = numericOrNull(value);
  return number === null ? fallback : number;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function now() {
  return new Date().toISOString();
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shellQuote(value) {
  return JSON.stringify(value);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'kosmo-project';
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
