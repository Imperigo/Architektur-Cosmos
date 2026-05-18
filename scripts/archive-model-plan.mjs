#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const slug = args.entry || args.slug;
  if (!slug) {
    throw new Error('Usage: npm run archive:model-plan -- --entry villa-savoye');
  }

  const entries = JSON.parse(await readFile(path.join(root, 'data/mock-entries.json'), 'utf8'));
  const entry = entries.find((candidate) => candidate.slug === slug || candidate.id === slug);
  if (!entry) throw new Error(`No entry found for "${slug}".`);

  const intakeRoot = path.join(root, 'archive-intake', entry.slug);
  const analysisDir = path.join(intakeRoot, 'analysis');
  const modelsDir = path.join(intakeRoot, 'models');
  const splatsDir = path.join(intakeRoot, 'splats');
  const automationDir = path.join(intakeRoot, 'automation');

  await Promise.all([analysisDir, modelsDir, splatsDir, automationDir].map((directory) => mkdir(directory, { recursive: true })));

  const availableAssets = checkLocalAssets(entry);
  const modelPackage = buildModelPackage(entry, availableAssets);
  const analysisProfile = buildAnalysisProfile(entry, availableAssets);
  const blenderProfile = buildBlenderProfile(entry, modelPackage, analysisProfile);
  const archicadProfile = buildArchicadProfile(entry, modelPackage);
  const splatPlan = buildSplatPlan(entry, availableAssets);
  const nextActions = buildNextActions(entry, availableAssets);

  await writeJson(path.join(modelsDir, 'model-package.manifest.json'), modelPackage);
  await writeJson(path.join(analysisDir, 'analysis-profile.json'), analysisProfile);
  await writeJson(path.join(automationDir, 'blender-import-profile.json'), blenderProfile);
  await writeJson(path.join(automationDir, 'archicad-exchange-profile.json'), archicadProfile);
  await writeJson(path.join(splatsDir, 'gaussian-splat-plan.json'), splatPlan);
  await writeFile(path.join(automationDir, 'next-actions.md'), nextActions, 'utf8');

  console.log('Architecture Cosmos 3D/model automation plan');
  console.log(`Entry: ${entry.title} (${entry.slug})`);
  console.log(`Local intake: ${path.relative(root, intakeRoot)}`);
  console.log(`Assets checked: ${availableAssets.length}`);
  console.log(`Model targets: ${modelPackage.targets.length}`);
  console.log(`Analysis layers: ${analysisProfile.layers.length}`);
  console.log('Wrote:');
  console.log(`- ${path.relative(root, path.join(modelsDir, 'model-package.manifest.json'))}`);
  console.log(`- ${path.relative(root, path.join(analysisDir, 'analysis-profile.json'))}`);
  console.log(`- ${path.relative(root, path.join(automationDir, 'blender-import-profile.json'))}`);
  console.log(`- ${path.relative(root, path.join(automationDir, 'archicad-exchange-profile.json'))}`);
  console.log(`- ${path.relative(root, path.join(splatsDir, 'gaussian-splat-plan.json'))}`);
  console.log(`- ${path.relative(root, path.join(automationDir, 'next-actions.md'))}`);
  console.log('');
  console.log('No upload was performed. All generated files are local and gitignored.');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : true;
    if (next && !next.startsWith('--')) index += 1;
  }
  return parsed;
}

function checkLocalAssets(entry) {
  const media = (entry.media ?? []).map((asset) => ({
    slot: asset.type,
    title: asset.label,
    local_path: asset.url,
    source_url: asset.source_url,
    rights_note: asset.credit,
    exists: asset.url ? existsSync(path.join(root, asset.url)) : false
  }));

  const candidates = (entry.asset_candidates ?? []).map((asset) => ({
    slot: asset.media_slot ?? asset.kind,
    title: asset.title,
    local_path: asset.local_path,
    planned_r2_key: asset.planned_r2_key,
    rights_status: asset.rights_status,
    public_display_allowed: asset.public_display_allowed,
    exists: asset.local_path ? existsSync(path.join(root, asset.local_path)) : false
  }));

  const deduped = new Map();
  for (const asset of [...media, ...candidates]) {
    const key = asset.local_path || `${asset.slot}:${asset.title}`;
    const existing = deduped.get(key);
    deduped.set(key, existing ? { ...existing, ...asset, exists: existing.exists || asset.exists } : asset);
  }

  return [...deduped.values()];
}

function buildModelPackage(entry, availableAssets) {
  const modelAssets = entry.model_assets ?? [];
  const packageAssets = entry.model_packages ?? [];
  const localPlanAssets = availableAssets.filter((asset) => ['plan', 'section'].includes(asset.slot) && asset.exists);

  return {
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    status: localPlanAssets.length >= 2 ? 'ready_for_manual_or_ai_assisted_massing' : 'needs_plan_or_section_review',
    coordinate_policy: {
      unit: 'meter',
      origin: 'project_center_ground_floor',
      north_reference: 'diagrammatic_until_verified',
      source_scale: 'not_measured_reconstruction'
    },
    source_assets: availableAssets,
    targets: modelAssets.map((model) => ({
      model_type: model.model_type,
      title: model.title,
      target_path: model.r2_key,
      local_placeholder: `archive-intake/${entry.slug}/models/${model.model_type.replace(/_model$/, '')}.glb`,
      format: model.format,
      lod_level: model.lod_level,
      source_basis: model.source_basis,
      generation_method: model.generation_method,
      review_status: model.review_status
    })),
    package_targets: packageAssets,
    blender_layers: [
      '00_source_images',
      '01_site_context',
      '02_mass_model',
      '03_structure',
      '04_envelope',
      '05_circulation',
      '06_material_and_tectonic_annotations',
      '07_reference_splat'
    ]
  };
}

function buildAnalysisProfile(entry, availableAssets) {
  const layers = entry.analysis_layers ?? [];
  const observations = entry.analysis_observations ?? [];

  return {
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    generated_from: 'mock-entry-plus-local-intake',
    confidence_policy: {
      verified: 'source-backed or manually reviewed',
      reviewed: 'plausible from curated source set',
      draft: 'usable for internal automation only',
      needs_source: 'do not publish as factual model output'
    },
    source_assets_ready: availableAssets.filter((asset) => asset.exists).length,
    layers: layers.map((layer) => ({
      analysis_type: layer.analysis_type,
      summary: layer.summary,
      review_status: layer.review_status,
      output_path: layer.r2_key ?? `entries/${entry.slug}/analysis/${layer.analysis_type}.json`,
      data: layer.data ?? {}
    })),
    observations,
    query_tags: [...new Set([...(entry.themes ?? []), ...(entry.database_tags ?? [])])]
  };
}

function buildBlenderProfile(entry, modelPackage, analysisProfile) {
  return {
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    target_file: `archive-intake/${entry.slug}/models/source.blend`,
    import_contract: {
      expected_units: modelPackage.coordinate_policy.unit,
      collection_prefix: `AC_${entry.slug.replace(/-/g, '_')}`,
      layer_collections: modelPackage.blender_layers,
      metadata_text_block: 'architecture_cosmos_metadata.json'
    },
    model_targets: modelPackage.targets,
    analysis_layers: analysisProfile.layers.map((layer) => ({
      analysis_type: layer.analysis_type,
      bind_to_collection: `06_${layer.analysis_type}`,
      source_json: layer.output_path
    })),
    future_chat_queries: [
      `Import ${entry.title} as a reference model.`,
      `Show comparable entries with ${entry.themes?.slice(0, 3).join(', ')}.`,
      `Highlight structure, material system and circulation layers for ${entry.title}.`
    ]
  };
}

function buildArchicadProfile(entry, modelPackage) {
  return {
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    exchange_goal: 'future ArchiCAD reference package',
    preferred_formats: ['IFC', 'OBJ', 'GLB'],
    classification_map: {
      site_model: 'Site',
      mass_model: 'Morph',
      structure_model: 'Structure',
      tectonic_model: 'Detail / Assembly',
      low_poly_model: 'Reference Object',
      full_model: 'Reference Object'
    },
    target_exports: modelPackage.targets.map((target) => ({
      model_type: target.model_type,
      suggested_ifc_class: modelTypeToIfc(target.model_type),
      source_glb: target.target_path,
      status: target.review_status
    }))
  };
}

function buildSplatPlan(entry, availableAssets) {
  const splats = entry.splat_assets ?? [];
  const imageCount = availableAssets.filter((asset) => ['exterior', 'interior', 'image'].includes(asset.slot) && asset.exists).length;

  return {
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    status: imageCount >= 20 ? 'ready_for_splat_training' : 'needs_video_or_more_photos',
    minimum_capture_set: {
      exterior_orbit_video: '2-4 minutes slow orbit, even exposure, no fast motion',
      interior_walkthrough_video: 'optional, separate layer if rights and access are clear',
      still_images: '80-250 sharp frames extracted from own or licensed video',
      masks: 'optional foreground/building masks for cleaner splat'
    },
    output_targets: splats.length ? splats : [
      {
        splat_type: 'reality_layer',
        title: `${entry.title} reality splat`,
        r2_key: `entries/${entry.slug}/splats/reality.splat`,
        alternate_r2_key: `entries/${entry.slug}/splats/reality.ply`,
        source_basis: 'planned own or licensed video capture',
        generation_method: 'gaussian_splatting_planned',
        review_status: 'planned',
        use_case: 'Atmospheric reality layer behind the clean analytical model.'
      }
    ],
    notes: [
      'Use splats as visual memory and atmosphere, not as measured geometry.',
      'Keep analytical GLB/IFC layers separate from splat layers.',
      'Only upload source frames or splats after rights review and explicit upload command.'
    ]
  };
}

function buildNextActions(entry, availableAssets) {
  const missing = availableAssets.filter((asset) => !asset.exists);
  const ready = availableAssets.filter((asset) => asset.exists);
  return `# ${entry.title} / Next 3D + Analysis Actions

## Ready locally
${ready.map((asset) => `- ${asset.slot}: ${asset.local_path}`).join('\n') || '- No local assets detected yet.'}

## Missing or unresolved
${missing.map((asset) => `- ${asset.slot}: ${asset.local_path ?? asset.title}`).join('\n') || '- No missing local asset references.'}

## Recommended next sequence
1. Review diagrammatic plan and section layers against trusted sources.
2. Build a low-poly mass model from plan, section and five-points logic.
3. Split the model into site, mass, structure, envelope, circulation and tectonic layers.
4. Add analysis JSON for materials, roof form, structure and circulation.
5. Capture or source a rights-clean video set before generating a Gaussian splat.
6. Export GLB first; postpone IFC/ArchiCAD exchange until the geometry is reviewed.

## Safety
- No public upload without explicit command.
- Diagrammatic drawings are not measured construction plans.
- Gaussian splat is a reality/atmosphere layer, not the canonical analytical model.
`;
}

function modelTypeToIfc(modelType) {
  const map = {
    full_model: 'IfcBuildingElementProxy',
    low_poly_model: 'IfcBuildingElementProxy',
    structure_model: 'IfcStructuralItem',
    tectonic_model: 'IfcElementAssembly',
    site_model: 'IfcSite',
    mass_model: 'IfcBuildingElementProxy'
  };
  return map[modelType] ?? 'IfcBuildingElementProxy';
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
