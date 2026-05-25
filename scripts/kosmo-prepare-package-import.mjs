#!/usr/bin/env node

import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
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
  const inputRoot = resolve(args.input || args.source || '');
  if (!args.input && !args.source) {
    throw new Error('Usage: npm run kosmo:prepare-import -- --input "/path/to/KosmosPrepare/03_Output/PROJECT" [--slug project-slug] [--force]');
  }
  if (!existsSync(inputRoot) || !statSync(inputRoot).isDirectory()) {
    throw new Error(`KosmosPrepare output folder not found: ${inputRoot}`);
  }

  const originPath = join(inputRoot, '02_ArchiCAD_Export', 'origin.json');
  const origin = existsSync(originPath) ? readJson(originPath) : {};
  const projectName = args.name || origin.project_name || basename(inputRoot);
  const projectId = slugify(args.slug || args.project || basename(inputRoot));
  const outputRoot = resolve(root, args['output-root'] || 'archive-intake/kosmo-projects');
  const projectRoot = join(outputRoot, projectId);
  const force = Boolean(args.force);

  if (existsSync(projectRoot)) {
    if (!force) {
      throw new Error(`Project package already exists: ${relative(root, projectRoot)}. Use --force to replace generated files.`);
    }
    await rm(projectRoot, { recursive: true, force: true });
  }

  const discovered = discoverPrepareOutput(inputRoot);
  await createFolders(projectRoot);
  await copyArtifacts({ inputRoot, projectRoot, discovered });
  await writePackage({ inputRoot, projectRoot, projectId, projectName, origin, discovered });

  console.log('KosmosPrepare package import created');
  console.log(`Project: ${projectId}`);
  console.log(`Source: ${inputRoot}`);
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

function discoverPrepareOutput(inputRoot) {
  const archicadDir = join(inputRoot, '02_ArchiCAD_Export');
  const streetViewDir = join(inputRoot, '04_StreetView');
  const dossierPath = join(inputRoot, '01_Dossier', 'Dossier.html');
  const readmePath = join(inputRoot, 'README.md');
  const originPath = join(archicadDir, 'origin.json');
  const instructionPath = join(archicadDir, 'Anleitung.md');
  const ifcPath = join(archicadDir, 'Bestand_Kontext.ifc');
  const dxfPath = join(archicadDir, 'Plangrundlage.dxf');
  const streetViewImages = existsSync(streetViewDir)
    ? readdirSync(streetViewDir)
        .filter((name) => ['.jpg', '.jpeg', '.png'].includes(extname(name).toLowerCase()))
        .sort()
        .map((name) => join(streetViewDir, name))
    : [];

  return {
    readmePath,
    dossierPath,
    archicadDir,
    originPath,
    instructionPath,
    ifcPath,
    dxfPath,
    streetViewDir,
    streetViewImages
  };
}

async function createFolders(projectRoot) {
  const folders = [
    'brief',
    'data/source-files',
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

async function copyArtifacts({ projectRoot, discovered }) {
  await copyOptional(discovered.readmePath, join(projectRoot, 'brief', 'kosmosprepare-readme.md'));
  await copyOptional(discovered.dossierPath, join(projectRoot, 'brief', 'source-dossier.html'));
  await copyOptional(discovered.originPath, join(projectRoot, 'data', 'source-files', 'kosmosprepare-origin.json'));
  await copyOptional(discovered.instructionPath, join(projectRoot, 'data', 'source-files', 'archicad-import-anleitung.md'));
  await copyOptional(discovered.ifcPath, join(projectRoot, 'data', 'source-files', 'Bestand_Kontext.ifc'));
  await copyOptional(discovered.dxfPath, join(projectRoot, 'data', 'source-files', 'Plangrundlage.dxf'));
}

async function copyOptional(from, to) {
  if (!existsSync(from)) return;
  await mkdir(resolve(to, '..'), { recursive: true });
  await copyFile(from, to);
}

async function writePackage({ inputRoot, projectRoot, projectId, projectName, origin, discovered }) {
  const site = {
    address: '',
    locality: '',
    country: 'CH',
    latitude: numericOrNull(origin.wgs84_origin?.lat),
    longitude: numericOrNull(origin.wgs84_origin?.lon),
    north_rotation_degrees: 0,
    coordinate_source: origin.wgs84_origin ? 'kosmosprepare_origin' : 'unknown'
  };

  const sourceFiles = sourceFileArtifacts(discovered);
  const manifest = buildManifest({ projectId, projectName, site, sourceFiles });
  const files = {
    'kosmo.project.json': json(manifest),
    'README.md': renderReadme({ projectName, projectId, inputRoot }),
    'brief/kosmo-brief.md': renderBrief({ projectName, projectId, inputRoot, origin, discovered }),
    'brief/constraints.json': json(buildConstraints(origin, discovered)),
    'brief/open-questions.md': renderOpenQuestions(projectName),
    'data/sources.json': json(buildSources({ inputRoot, discovered, sourceFiles })),
    'data/references.json': json({
      schema_version: '0.1',
      references: [],
      note: 'Kosmo Data should add reviewed reference candidates after KosmosPrepare import.'
    }),
    'data/assets.json': json({
      schema_version: '0.1',
      assets: sourceFiles.map((item) => ({
        id: item.id,
        path: item.path,
        type: item.type,
        rights_status: 'internal_only',
        source: 'kosmosprepare_import'
      }))
    }),
    'data/rights-review.json': json({
      schema_version: '0.1',
      overall_status: 'internal_only',
      rules: [
        'KosmosPrepare imports are private by default.',
        'StreetView/Mapillary images remain source references and require rights review before public use.',
        'IFC/DXF/source geometry require owner review before external delivery.',
        'No external upload or public release without explicit approval.'
      ],
      blocked_actions: ['public_release', 'external_upload', 'client_delivery']
    }),
    'design/model-profile.json': json(buildModelProfile(projectId, origin)),
    'design/context-import.generated.json': json(buildContextImportSeed(projectId, 'kosmosprepare_import')),
    'design/context-candidates.generated.json': json(buildContextCandidatesSeed(projectId, 'kosmosprepare_import')),
    'design/context-selection.json': json(buildContextSelectionSeed(projectId, 'kosmosprepare_import')),
    'design/variants.json': json({
      schema_version: '0.1',
      variants: [],
      note: 'Kosmo Design should generate design variants from this Phase 0 package.'
    }),
    'draw/exports/ground-floor-plan.svg': renderPlaceholderSvg(projectName, 'Kosmo Prepare source package - plan pending'),
    'draw/exports/section-a.svg': renderPlaceholderSvg(projectName, 'Kosmo Prepare source package - section pending'),
    'draw/plans/README.md': '# Plans\n\nKosmo Draw or KosmoPublish can write generated plan views here.\n',
    'draw/sections/README.md': '# Sections\n\nKosmo Draw or KosmoPublish can write generated section views here.\n',
    'viz/cameras.json': json({
      schema_version: '0.1',
      cameras: [],
      note: 'Kosmo Viz should generate cameras after a design model exists.'
    }),
    'viz/render-presets.json': json({
      schema_version: '0.1',
      presets: [],
      note: 'Render presets should be selected after model import.'
    }),
    'viz/previews/preview-manifest.json': json({
      schema_version: '0.1',
      previews: [],
      note: 'No rendered preview exists yet.'
    }),
    'publish/review-pack.md': renderReviewPack(projectName),
    'publish/export-manifest.json': json(buildExportManifest()),
    'publish/change-log.md': `# Change Log\n\n## ${today}\n\n- Imported KosmosPrepare output into local Kosmo project package.\n`,
    'memory/decisions.jsonl': `${jsonl({ timestamp: now(), module: 'orbit', decision: 'Import KosmosPrepare output as local review-only Kosmo project package.', status: 'accepted', review_required: false })}\n`,
    'memory/jobs.jsonl': `${jsonl({ timestamp: now(), job_id: 'job-kosmosprepare-import-001', module: 'prepare', status: 'completed', summary: 'Imported KosmosPrepare output folder and registered source files.' })}\n`,
    'memory/uncertainty-log.jsonl': `${jsonl({ timestamp: now(), module: 'prepare', topic: 'source_review', severity: 'medium', description: 'Imported source package needs human review before design, public release or client delivery.' })}\n`
  };

  await Promise.all(Object.entries(files).map(([pathname, content]) => writeText(join(projectRoot, pathname), content)));
}

function buildManifest({ projectId, projectName, site, sourceFiles }) {
  const sourceInputs = sourceFiles.map((item) =>
    artifact(item.path, manifestArtifactType(item.type), item.path.startsWith('data/') ? 'data' : 'prepare', 'internal_only', `Imported KosmosPrepare source file: ${item.id}.`)
  );

  return {
    schema_version: '0.1',
    project_id: projectId,
    name: projectName,
    created_at: today,
    updated_at: today,
    status: 'draft',
    risk_level: 'local_review_only',
    site,
    modules: {
      prepare: moduleState('review_ready', 'KosmosPrepare source package imported with Dossier, IFC/DXF and origin metadata.', 'Kosmo Prepare'),
      data: moduleState('review_ready', 'Local source registry and source files are available for review.', 'Kosmo Data'),
      orbit: moduleState('review_ready', 'Project manifest and module folders exist.', 'Kosmo Orbit'),
      design: moduleState('pending', 'Phase 0 package exists; no design room model has been generated yet.', 'Kosmo Design'),
      draw: moduleState('pending', 'Placeholder plan outputs exist; generated exports are not ready.', 'Kosmo Draw'),
      viz: moduleState('pending', 'No rendered previews yet.', 'Kosmo Viz'),
      publish: moduleState('pending', 'Review pack scaffold exists and awaits generated outputs.', 'Kosmo Publish'),
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
      artifact('brief/kosmo-brief.md', 'brief', 'prepare', 'internal_only', 'Imported KosmosPrepare brief.'),
      artifact('brief/constraints.json', 'constraints', 'prepare', 'internal_only', 'KosmosPrepare origin and source constraints.'),
      artifact('data/sources.json', 'source_registry', 'data', 'internal_only', 'Imported local source registry.'),
      ...sourceInputs
    ],
    outputs: [
      artifact('design/model-profile.json', 'model_profile', 'design', 'generated_needs_review', 'Empty Phase 0 model profile seed for Kosmo Design.'),
      artifact('design/context-import.generated.json', 'other', 'design', 'generated_needs_review', 'KosmoDraw Phase 0 context import report.'),
      artifact('design/context-candidates.generated.json', 'other', 'design', 'generated_needs_review', 'KosmoDraw Phase 0 context candidates.'),
      artifact('design/context-selection.json', 'other', 'design', 'internal_only', 'Human review gate for accepting context candidates as design input.'),
      artifact('draw/exports/ground-floor-plan.svg', 'plan_export', 'draw', 'generated_needs_review', 'Placeholder vector ground floor export.'),
      artifact('draw/exports/section-a.svg', 'plan_export', 'draw', 'generated_needs_review', 'Placeholder vector section export.'),
      artifact('publish/review-pack.md', 'review_pack', 'publish', 'internal_only', 'Local review package scaffold.')
    ],
    review_gates: {
      public_release: gate('disabled', 'Imported KosmosPrepare package is local-only and unreviewed.'),
      external_upload: gate('disabled', 'No external upload is allowed from prepare import.'),
      client_delivery: gate('disabled', 'Not a reviewed client package.'),
      paid_cloud_job: gate('requires_human_approval', 'Any paid cloud generation must be approved explicitly.')
    },
    notes: 'Generated by kosmo:prepare-import from a local KosmosPrepare output folder.'
  };
}

function manifestArtifactType(sourceType) {
  if (sourceType === 'readme' || sourceType === 'dossier_html') return 'brief';
  return 'other';
}

function sourceFileArtifacts(discovered) {
  const candidates = [
    ['kosmosprepare_readme', 'brief/kosmosprepare-readme.md', 'readme', discovered.readmePath],
    ['source_dossier', 'brief/source-dossier.html', 'dossier_html', discovered.dossierPath],
    ['origin_metadata', 'data/source-files/kosmosprepare-origin.json', 'origin_metadata', discovered.originPath],
    ['archicad_instruction', 'data/source-files/archicad-import-anleitung.md', 'instruction', discovered.instructionPath],
    ['context_ifc', 'data/source-files/Bestand_Kontext.ifc', 'ifc', discovered.ifcPath],
    ['plan_base_dxf', 'data/source-files/Plangrundlage.dxf', 'dxf', discovered.dxfPath]
  ];
  return candidates
    .filter((item) => existsSync(item[3]))
    .map(([id, path, type, source]) => ({ id, path, type, source }));
}

function buildSources({ inputRoot, discovered, sourceFiles }) {
  return {
    schema_version: '0.1',
    imported_from: inputRoot,
    generator: 'kosmo-prepare-package-import',
    sources: [
      ...sourceFiles.map((item) => ({
        id: item.id,
        title: basename(item.source),
        type: item.type,
        path: item.path,
        original_path: item.source,
        rights_status: 'internal_only',
        confidence: 'medium'
      })),
      {
        id: 'streetview-image-folder',
        title: 'KosmosPrepare StreetView / Mapillary image folder',
        type: 'image_reference_folder',
        path: null,
        original_path: discovered.streetViewDir,
        image_count: discovered.streetViewImages.length,
        rights_status: 'unknown',
        confidence: 'low'
      }
    ]
  };
}

function buildConstraints(origin, discovered) {
  return {
    schema_version: '0.1',
    source_module: 'Kosmo Prepare',
    origin,
    imported_files: {
      has_dossier: existsSync(discovered.dossierPath),
      has_ifc: existsSync(discovered.ifcPath),
      has_dxf: existsSync(discovered.dxfPath),
      streetview_image_count: discovered.streetViewImages.length
    },
    site_boundaries: [],
    building_law_constraints: [],
    open_questions: [
      'Which source facts from the Dossier are binding and which are assumptions?',
      'Should the imported IFC/DXF become the design base or only a context underlay?',
      'Which KosmoData references should be linked to this site?',
      'Which generated outputs are needed next: Blender model, plans, preview or publish package?'
    ],
    uncertainties: [
      {
        topic: 'source_rights',
        severity: 'medium',
        description: 'Imported source package and StreetView/Mapillary images need rights review before external use.'
      },
      {
        topic: 'design_model',
        severity: 'medium',
        description: 'This Phase 0 import does not yet contain a Kosmo Design room model.'
      }
    ]
  };
}

function buildModelProfile(projectId, origin) {
  return {
    schema_version: '0.1',
    units: 'meters',
    source_confidence: 'source_package',
    source: {
      module: 'Kosmo Prepare',
      operation: 'prepare_import',
      project_id: projectId,
      imported_at: now()
    },
    coordinate_reference: {
      lv95_origin: origin.lv95_origin || null,
      wgs84_origin: origin.wgs84_origin || null,
      convention: origin.convention || null
    },
    stories: [],
    rooms: [],
    walls: [],
    areas: [],
    collections: []
  };
}

function buildContextImportSeed(projectId, source) {
  return {
    schema_version: '0.1',
    generated_at: null,
    generator: 'kosmo-prepare-package-import',
    project_id: projectId,
    status: 'pending_blender_context_import',
    rights_status: 'internal_only',
    source_stage: 'phase_0_context',
    source,
    note: 'KosmoDraw should overwrite this file after importing Prepare context into Blender.',
    context: null
  };
}

function buildContextCandidatesSeed(projectId, source) {
  return {
    schema_version: '0.1',
    generated_at: null,
    generator: 'kosmo-prepare-package-import',
    project_id: projectId,
    status: 'pending_blender_context_import',
    rights_status: 'internal_only',
    source_stage: 'phase_0_context',
    source,
    note: 'KosmoDraw should overwrite this file with review-required context candidates after importing Prepare context into Blender.',
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
    generator: 'kosmo-prepare-package-import',
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

function buildExportManifest() {
  return {
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
  };
}

function renderReadme({ projectName, projectId, inputRoot }) {
  return `# ${projectName}\n\nLocal Kosmo project package imported from KosmosPrepare.\n\n- Project ID: \`${projectId}\`\n- Source: \`${inputRoot}\`\n- Status: local review only\n\nNothing in this package is public-safe until reviewed.\n`;
}

function renderBrief({ projectName, projectId, inputRoot, origin, discovered }) {
  const lines = [
    `# ${projectName} Kosmo Brief`,
    '',
    'Imported from KosmosPrepare Phase 0 output.',
    '',
    `- Project ID: \`${projectId}\``,
    `- Source folder: \`${inputRoot}\``,
    `- Canton: \`${origin.canton || 'unknown'}\``,
    `- WGS84 origin: \`${origin.wgs84_origin ? `${origin.wgs84_origin.lat}, ${origin.wgs84_origin.lon}` : 'unknown'}\``,
    `- LV95 origin: \`${origin.lv95_origin ? `${origin.lv95_origin.easting}, ${origin.lv95_origin.northing}, ${origin.lv95_origin.elevation_msl}` : 'unknown'}\``,
    `- StreetView / Mapillary images: ${discovered.streetViewImages.length}`,
    '',
    '## Imported Artifacts',
    '',
    '- Dossier HTML',
    '- ArchiCAD import instructions',
    '- Context IFC',
    '- Plan DXF',
    '- Origin metadata',
    '',
    '## Next',
    '',
    '1. Review imported source rights and assumptions.',
    '2. Decide whether IFC/DXF are context underlay or design base.',
    '3. Let Kosmo Design generate or import a first editable design model.',
    '4. Let KosmoPublish replace placeholder exports with reviewed plan/presentation outputs.',
    ''
  ];
  return `${lines.join('\n')}\n`;
}

function renderOpenQuestions(projectName) {
  return `# Open Questions\n\n- Which source documents are authoritative for ${projectName}?\n- Are the imported IFC and DXF complete enough for design import?\n- What should Kosmo Design generate first from this Phase 0 package?\n- Which outputs should KosmoPublish produce for first review?\n`;
}

function renderReviewPack(projectName) {
  return `# ${projectName} Review Pack\n\nStatus: scaffold  \nRisk level: local review only\n\n## Review Notes\n\n- Imported from KosmosPrepare output.\n- Source package, geometry and images require review before public or external use.\n- Draw/Viz/Publish outputs are placeholders until generated by downstream modules.\n\n## Next Actions\n\n1. Review \`brief/kosmo-brief.md\` and \`data/sources.json\`.\n2. Check IFC/DXF source files.\n3. Generate first Kosmo Design model.\n4. Run Kosmo Draw/KosmoPublish for real plan outputs.\n`;
}

function renderPlaceholderSvg(title, label) {
  const safeTitle = escapeXml(title);
  const safeLabel = escapeXml(label);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540" role="img" aria-label="${safeTitle} placeholder">\n  <rect x="20" y="20" width="860" height="500" fill="#fbfdff" stroke="#94a3b8" stroke-width="2"/>\n  <text x="40" y="58" font-family="Arial, sans-serif" font-size="24" fill="#111827">${safeTitle}</text>\n  <text x="40" y="94" font-family="Arial, sans-serif" font-size="16" fill="#4b5563">${safeLabel}</text>\n  <text x="40" y="494" font-family="Arial, sans-serif" font-size="14" fill="#4b5563">local review only</text>\n</svg>\n`;
}

function moduleState(status, summary, owner) {
  return { status, summary, last_run_at: null, owner };
}

function gate(mode, reason) {
  return { mode, reason, approved_by: null, approved_at: null };
}

function artifact(path, type, module, rights_status, description) {
  return { path, type, module, rights_status, description };
}

async function writeText(pathname, content) {
  await mkdir(resolve(pathname, '..'), { recursive: true });
  await writeFile(pathname, content, 'utf8');
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function jsonl(value) {
  return JSON.stringify(value);
}

function now() {
  return new Date().toISOString();
}

function numericOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function slugify(value) {
  return String(value || 'kosmo-prepare-import')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'kosmo-prepare-import';
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
