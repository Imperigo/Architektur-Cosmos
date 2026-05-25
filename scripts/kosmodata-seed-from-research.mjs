#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entriesPath = path.join(root, 'data/mock-entries.json');
const researchRoot = path.join(root, 'out/database-research');
const outRoot = path.join(root, 'out/kosmodata-enrichment');
const mediaTypes = ['exterior', 'interior', 'section', 'plan'];
const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const slug = args.entry || args.slug;
  if (!slug) throw new Error('Usage: npm run kosmodata:seed-from-research -- --entry red-house');

  const entries = await readJson(entriesPath);
  const entry = entries.find((item) => item.slug === slug || item.id === slug);
  if (!entry) throw new Error(`No entry found for "${slug}".`);

  const researchPacks = await findResearchPacks(entry);
  const localSources = await findLocalSources(entry);
  const seed = buildSeed(entry, researchPacks, localSources);
  const review = buildSeedReview(entry, seed, researchPacks, localSources);
  const outputDir = path.join(outRoot, entry.slug);
  const intakeDir = path.join(root, 'archive-intake', entry.slug, 'enrichment');
  await Promise.all([outputDir, intakeDir].map((directory) => mkdir(directory, { recursive: true })));

  await writeJson(path.join(outputDir, 'seed-candidate.json'), seed);
  await writeFile(path.join(outputDir, 'seed-candidate.md'), renderSeedMarkdown(review), 'utf8');
  await writeJson(path.join(intakeDir, 'seed-candidate.json'), seed);
  await writeJson(path.join(intakeDir, 'seed-candidate-review.json'), review);

  console.log('KosmoData seed candidate from research');
  console.log(`Entry: ${entry.title} (${entry.slug})`);
  console.log(`Research packs: ${researchPacks.length}`);
  console.log(`Local sources: ${localSources.length}`);
  console.log(`Readiness: ${review.readiness}`);
  console.log('Wrote:');
  console.log(`- out/kosmodata-enrichment/${entry.slug}/seed-candidate.md`);
  console.log(`- archive-intake/${entry.slug}/enrichment/seed-candidate.json`);
  console.log('');
  console.log('Next command:');
  console.log(`npm run kosmodata:enrich -- --entry ${entry.slug}`);
}

function buildSeed(entry, researchPacks, localSources) {
  const sourceCandidates = buildSourceCandidates(entry, researchPacks, localSources);
  const materials = inferMaterials(entry, localSources);
  const program = inferProgram(entry);
  const context = inferContext(entry, program);
  const databaseTags = buildDatabaseTags(entry, materials, program, context);
  const themes = dedupeThemes([...cleanThemes(entry.themes || [], program.type), ...tagThemes(databaseTags)]).slice(0, 10);
  const analysisLayers = buildAnalysisLayers(entry, materials, program, context, databaseTags);
  const modelAssets = buildModelAssets(entry, researchPacks, databaseTags);

  return {
    id: `${entry.slug}-seed-${new Date().toISOString().slice(0, 10)}`,
    entry_id: entry.id,
    slug: entry.slug,
    generated_at: new Date().toISOString(),
    generator: 'kosmodata-seed-from-research',
    mode: 'review_candidate_only',
    writes_public_database: false,
    source_basis: {
      existing_entry: true,
      local_source_count: localSources.length,
      research_pack_count: researchPacks.length,
      local_sources: localSources.map((source) => source.url || source.title),
      research_packs: researchPacks.map((pack) => pack.path)
    },
    entry_patch: {
      source_quality: sourceCandidates.length >= 3 ? 'research_seed_review' : entry.source_quality,
      themes,
      short_description: improvedShortDescription(entry, materials, program),
      one_sentence: improvedOneSentence(entry, materials, program),
      full_description: improvedFullDescription(entry, materials, program, context),
      media: normalizeMedia(entry, localSources),
      source_candidates: sourceCandidates,
      architecture_text: buildArchitectureText(entry, materials, program, context, databaseTags),
      materials,
      program,
      context,
      database_tags: databaseTags,
      model_assets: modelAssets,
      analysis_layers: analysisLayers
    },
    plan_requirements: buildPlanRequirements(entry, analysisLayers, materials),
    model_requirements: buildModelRequirements(entry, modelAssets, databaseTags),
    viewer_requirements: buildViewerRequirements(entry, materials, modelAssets),
    promotion_policy: {
      requires_owner_review: true,
      min_sources_before_promote: 3,
      no_media_republication_without_license: true,
      no_d1_or_r2_write: true,
      no_publish: true
    }
  };
}

function buildSeedReview(entry, seed, researchPacks, localSources) {
  const sourceCount = seed.entry_patch.source_candidates.length;
  const projectSpecificSourceCount = seed.entry_patch.source_candidates.filter((source) => source.project_specific).length;
  const blockers = [];
  if (sourceCount < 3) blockers.push('Less than 3 source candidates; keep this as a rough seed.');
  if (projectSpecificSourceCount < 2) blockers.push('Less than 2 project-specific source candidates; add official/archive/project sources before enrichment promotion.');
  if (!seed.entry_patch.media?.some((media) => media.type === 'exterior' && media.url)) blockers.push('No public-safe hero media found.');
  const warnings = [];
  if (!researchPacks.length) warnings.push('No existing database research pack found; seed was inferred from entry metadata and existing sources only.');
  if (seed.entry_patch.source_quality === 'research_seed_review') warnings.push('Seed is source-aware but still needs owner review before promotion.');

  return {
    generated_at: seed.generated_at,
    entry: { id: entry.id, slug: entry.slug, title: entry.title },
    readiness: blockers.length ? 'needs_research_pack' : 'ready_for_enrichment_review',
    blockers,
    warnings,
    research_packs: researchPacks.map((pack) => ({ path: pack.path, topic: pack.topic, source_count: pack.sources?.length || 0 })),
    local_sources: localSources.map((source) => ({
      title: source.title || source.url,
      url: source.url,
      project_specific: source.project_specific
    })),
    source_count: sourceCount,
    project_specific_source_count: projectSpecificSourceCount,
    generated_outputs: {
      seed_candidate: `archive-intake/${entry.slug}/enrichment/seed-candidate.json`,
      enrichment_review: `out/kosmodata-enrichment/${entry.slug}/enrichment-review.md`
    },
    tool_pipeline: {
      next_enrich: `npm run kosmodata:enrich -- --entry ${entry.slug}`,
      after_owner_review: `npm run kosmodata:promote -- --entry ${entry.slug} --confirm`,
      after_promotion_tools: `npm run cosmos:entry-build -- --entry ${entry.slug} --mode review`
    }
  };
}

async function findResearchPacks(entry) {
  const explicit = args.research ? [path.resolve(root, args.research)] : [];
  const candidates = explicit.length ? explicit : await listFiles(researchRoot);
  const packs = [];
  const needles = [
    entry.slug,
    entry.id,
    entry.title,
    ...(entry.authors || [])
  ].map(normalize).filter(Boolean);

  for (const filePath of candidates.filter((file) => file.endsWith('research-pack.json') || file.endsWith('analysis-pack.json'))) {
    const pack = await readJson(filePath, null);
    if (!pack) continue;
    const haystack = normalize([filePath, pack.topic, pack.agent, ...(pack.sources || []).map((source) => `${source.name} ${source.query} ${source.url}`)].join(' '));
    const score = needles.reduce((sum, needle) => sum + (needle && haystack.includes(needle) ? 1 : 0), 0);
    if (score > 0 || explicit.length) {
      packs.push({ ...pack, path: relativeToRoot(filePath), match_score: score });
    }
  }
  return packs.sort((a, b) => b.match_score - a.match_score).slice(0, 4);
}

async function findLocalSources(entry) {
  const sourceFiles = [
    path.join(root, 'archive-inbox', entry.slug, 'sources.json'),
    path.join(root, 'archive-inbox', entry.slug, 'sources.txt')
  ];
  const sources = [];
  for (const filePath of sourceFiles) {
    const content = await readText(filePath, null);
    if (!content) continue;
    if (filePath.endsWith('.json')) {
      const parsed = JSON.parse(content);
      sources.push(...normalizeLocalSourceList(Array.isArray(parsed) ? parsed : parsed.sources || [], entry));
      continue;
    }
    sources.push(...normalizeLocalSourceList(content.split(/\r?\n/).filter(Boolean).map((url) => ({ url })), entry));
  }
  return dedupeSources(sources);
}

function normalizeLocalSourceList(sources, entry) {
  return sources
    .filter((source) => source && (source.url || source.title))
    .map((source) => ({
      source_type: source.source_type || 'local_source_candidate',
      title: source.title || source.url,
      url: source.url,
      reliability_level: source.reliability_level || 'needs_review',
      rights_status: source.rights_status || 'link_only',
      notes: source.notes || 'Local intake source candidate. Review before promotion.',
      project_specific: source.project_specific ?? sourceIsProjectSpecific(source, entry),
      material_tags: Array.isArray(source.material_tags) ? source.material_tags : [],
      hero_media: source.hero_media && typeof source.hero_media === 'object' ? source.hero_media : null
    }));
}

async function listFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
    }));
    return files.flat();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function buildSourceCandidates(entry, researchPacks, localSources) {
  const hasHeroOverride = localSources.some((source) => source.hero_media);
  const existing = (entry.source_candidates || [])
    .filter((source) => {
      if (!hasHeroOverride) return true;
      return !/^Wikimedia Commons hero candidate/i.test(source.title || '');
    })
    .map((source) => ({
      source_type: source.source_type || 'source',
      title: source.title || source.url,
      url: source.url,
      reliability_level: source.reliability_level || 'existing_entry_source',
      rights_status: source.rights_status || 'link_only',
      notes: source.notes || 'Existing entry source candidate.',
      project_specific: sourceIsProjectSpecific(source, entry)
    }));
  const fromPacks = researchPacks.flatMap((pack) => (pack.sources || []).map((source) => ({
    source_type: source.source_type || 'research_pack_source',
    title: source.name || source.id,
    url: source.url,
    reliability_level: source.reliability || 'needs_review',
    rights_status: source.rights_mode || 'link_only',
    notes: `Research pack source for "${pack.topic || entry.title}". Query: ${source.query || 'n/a'}`,
    project_specific: sourceIsProjectSpecific(source, entry)
  })));
  return dedupeSources([...existing, ...localSources, ...fromPacks]).slice(0, 10);
}

function inferMaterials(entry, localSources = []) {
  const localMaterialTags = localSources.flatMap((source) => source.material_tags || []).filter(Boolean);
  if (localMaterialTags.length) {
    return {
      primary: [...new Set(localMaterialTags.map(slugify))],
      secondary: ['craft_details', 'surface_system', 'construction_logic'],
      notes: 'Seeded from local reviewed source metadata; verify exact material claims before publication.'
    };
  }

  const curatedChapterText = (entry.architecture_text?.chapters || [])
    .filter((chapter) => !normalize(chapter.source_basis).includes('seed from research'))
    .map((chapter) => chapter.text);
  const fallbackText = [entry.short_description, entry.full_description];
  const haystack = normalize([
    entry.title,
    ...(curatedChapterText.length ? curatedChapterText : fallbackText),
    ...(entry.themes || [])
  ].join(' '));
  const dictionary = [
    ['brick', ['brick', 'backstein', 'red house']],
    ['timber', ['timber', 'holz', 'wood', 'arts and crafts']],
    ['glass', ['glass', 'glas']],
    ['steel', ['steel', 'stahl']],
    ['iron', ['iron', 'eisen']],
    ['concrete', ['concrete', 'beton']],
    ['stone', ['stone', 'stein', 'masonry']],
    ['water', ['water', 'wasser', 'emscher']],
    ['vegetation', ['garden', 'garten', 'landscape', 'park']]
  ];
  const primary = dictionary.filter(([, terms]) => terms.some((term) => hasTerm(haystack, term))).map(([tag]) => tag);
  return {
    primary: primary.length ? primary : ['needs_material_review'],
    secondary: ['craft_details', 'surface_system', 'construction_logic'].filter((tag) => !primary.includes(tag)),
    notes: `Seeded from existing entry metadata and research packs; verify exact material claims before promotion.`
  };
}

function inferProgram(entry) {
  const haystack = normalize([entry.entry_type, entry.title, entry.short_description, ...(entry.themes || [])].join(' '));
  let type = entry.entry_type;
  if (haystack.includes('pavilion') || haystack.includes('pavillon')) type = 'pavilion';
  else if (haystack.includes('monastery') || haystack.includes('kloster') || haystack.includes('abbey')) type = 'monastery_plan';
  else if (haystack.includes('department store') || haystack.includes('warenhaus') || haystack.includes('commerce') || haystack.includes('kaufhaus')) type = 'department_store';
  else if (haystack.includes('apartment') || haystack.includes('avenue franklin') || haystack.includes('rue franklin') || haystack.includes('immeuble')) type = 'apartment_building';
  else if (haystack.includes('iba') || haystack.includes('critical reconstruction') || haystack.includes('stadt erneuerung') || haystack.includes('stadterneuerung')) type = 'urban_renewal_program';
  else if (entry.entry_type === 'text' || haystack.includes('treatise') || haystack.includes('traktat') || haystack.includes('quattro libri') || haystack.includes('delirious new york')) type = 'architectural_treatise';
  else if (entry.entry_type === 'urban_plan' || haystack.includes('broadacre') || haystack.includes('zoning') || haystack.includes('stadtmodell') || haystack.includes('urban plan')) type = 'urban_plan';
  else if (entry.entry_type === 'landscape_project' || haystack.includes('landscape') || haystack.includes('park')) type = 'landscape_project';
  else if (haystack.includes('factory') || haystack.includes('fabrik') || haystack.includes('industrie') || haystack.includes('industrial')) type = 'factory';
  else if (haystack.includes('school') || haystack.includes('schule') || haystack.includes('pedagogy') || haystack.includes('workshop') || haystack.includes('bauhaus')) type = 'school';
  else if (haystack.includes('house') || haystack.includes('home') || haystack.includes('domestic') || haystack.includes('wohnen') || haystack.includes('red house')) type = 'domestic_house';
  else if (haystack.includes('dom ino') || haystack.includes('prototype') || haystack.includes('free plan') || haystack.includes('frame')) type = 'structural_prototype';
  return {
    type,
    subtype: `${entry.style_sector}_reference`,
    public_access: 'needs_review',
    components: [...new Set([...cleanThemes(entry.themes || [], type), entry.entry_type, entry.style_sector])].slice(0, 10)
  };
}

function inferContext(entry, program) {
  return {
    topography: 'needs_site_review',
    setting: inferSetting(entry, program),
    landscape_relations: ['site_context_needs_review'],
    urban_context: [entry.lecture_cluster?.[0], entry.source_quality].filter(Boolean),
    construction_logic: [...new Set([...cleanThemes(entry.themes || []), entry.entry_type, entry.style_sector].filter(Boolean))].slice(0, 8)
  };
}

function inferSetting(entry, program) {
  const place = [entry.city, entry.country].filter(Boolean).join(', ');
  if (place) return place;
  if (program.type === 'structural_prototype') return 'ohne festen Ort';
  if (program.type === 'architectural_treatise') return 'als publizierte Wissensform';
  return 'noch zu prüfender Ort';
}

function buildDatabaseTags(entry, materials, program) {
  const tags = [
    ...(entry.source_candidates || []).map((source) => `source:${slugify(source.title || source.source_type || 'source')}`),
    `typology:${slugify(program.type)}`,
    `style:${entry.style_sector}`,
    ...cleanThemes(entry.themes || [], program.type).map((theme) => `theme:${slugify(theme)}`),
    ...(materials.primary || []).map((material) => `material:${slugify(material)}`),
    `rights:review-required`,
    `blender:${slugify(program.type)}-layer-candidate`,
    'plan:vector-review-required',
    'viewer:3d-layer-review-required'
  ];
  return [...new Set(tags)].slice(0, 24);
}

function buildAnalysisLayers(entry, materials, program, context, databaseTags) {
  return [
    layer('structure', `${entry.title} needs a reviewed structural reading connecting ${materials.primary.slice(0, 3).join(', ')} with construction logic, span, support and assembly.`, ['structure:needs_review', ...materials.primary]),
    layer('material_system', `${entry.title} should be tagged through ${materials.primary.join(', ')} and verified against primary sources before public material claims are made.`, materials.primary),
    layer('spatial_order', `${entry.title} should be read through program, movement, room sequence, exterior relation and typological position rather than as a single image.`, ['spatial_order', program.type]),
    layer('typology', `${entry.title} is currently classified as ${program.type}; the seed must verify how this type differs from related entries with the same DNA.`, ['typology', program.type, context.setting]),
    layer('filter_classification', `${entry.title} needs filter checks for themes, materials, rights, plan readiness, 3D layer readiness and viewer filters.`, databaseTags.slice(0, 10))
  ];
}

function layer(analysisType, summary, tags) {
  return {
    analysis_type: analysisType,
    summary,
    data: {
      seed_tags: tags,
      review_note: 'Generated by seed-from-research; owner/source review required before factual promotion.'
    },
    review_status: 'draft'
  };
}

function buildModelAssets(entry, researchPacks, databaseTags) {
  const sourceBasis = sourceBasisText(entry, researchPacks);
  return [
    model('site_model', entry, 'Site/context study model', 'site', 'preview', 'procedural', 'draft', sourceBasis),
    model('structure_model', entry, 'Structure and spatial order study model', 'structure', 'medium', 'source_reconstruction', 'needs_source', sourceBasis),
    model('tectonic_model', entry, 'Material, tectonic and filter-layer study model', 'tectonic', 'study', 'source_reconstruction', 'needs_source', `${sourceBasis}; tags: ${databaseTags.slice(0, 8).join(', ')}`)
  ];
}

function model(modelType, entry, title, file, lodLevel, generationMethod, reviewStatus, sourceBasis) {
  return {
    model_type: modelType,
    title: `${entry.title} ${title}`,
    r2_key: `entries/${entry.slug}/models/${file}.glb`,
    format: 'glb',
    lod_level: lodLevel,
    source_basis: sourceBasis,
    generation_method: generationMethod,
    review_status: reviewStatus,
    confidence_score: reviewStatus === 'draft' ? 0.42 : 0.32
  };
}

function buildPlanRequirements(entry, analysisLayers, materials) {
  return {
    status: 'planned',
    required_outputs: ['plan_svg', 'section_svg', 'analysis_svg', 'plan_dxf', 'vector_graph', 'archicad_2d_profile'],
    required_layers: ['site_context', 'structural_grid', 'walls_mass', 'openings_voids', 'circulation', 'landscape', 'material_annotations', 'uncertainty_notes'],
    analysis_links: analysisLayers.map((layer) => layer.analysis_type),
    material_labels: materials.primary,
    archicad_policy: 'Export SVG/DXF as diagrammatic underlay only until reviewed plan sources exist.'
  };
}

function buildModelRequirements(entry, modelAssets, databaseTags) {
  return {
    status: 'planned',
    required_outputs: ['model-package.manifest.json', 'analysis-profile.json', 'blender-import-profile.json', 'archicad-exchange-profile.json', 'gaussian-splat-plan.json'],
    layer_contract: ['site', 'mass', 'structure', 'facade', 'interior', 'tectonic', 'materials', 'uncertainty'],
    model_targets: modelAssets.map((asset) => asset.r2_key),
    blender_filters: databaseTags.filter((tag) => tag.startsWith('material:') || tag.startsWith('blender:') || tag.startsWith('theme:')).slice(0, 12),
    geometry_policy: 'Do not generate precise geometry from unclear/copyrighted plans. Use diagrammatic study reconstruction until reviewed.'
  };
}

function buildViewerRequirements(entry, materials, modelAssets) {
  return {
    status: 'planned',
    route: `/atlas/${entry.slug}/`,
    component: '3d model viewer',
    modes: ['realistisch', 'analysefarben', 'struktur', 'material', 'schnitt'],
    filter_buttons: [...new Set(['site', 'structure', 'tectonic', 'materials', ...materials.primary])],
    layer_sources: modelAssets.map((asset) => asset.r2_key),
    note: 'Viewer filters should map to Blender collections and analysis layers after model generation.'
  };
}

function buildArchitectureText(entry, materials, program, context, databaseTags) {
  const materialText = listText(materials.primary);
  const programText = labelFor(program.type);
  const profile = architectureTextProfile(entry, materials, program, context, databaseTags);
  if (entry.architecture_text?.chapters?.length) {
    const curatedChapters = entry.architecture_text.chapters.filter((chapter) => !normalize(chapter.source_basis).includes('seed from research'));
    if (curatedChapters.length < 3) return buildGeneratedArchitectureText(entry, materials, program, context, databaseTags);
    const generatedChapterTitles = new Set([
      normalize('Netzwerk und DNA'),
      normalize('Topos / Typos / Tektonik'),
      normalize('Datenbank- und Modellwert')
    ]);
    const baseChapters = curatedChapters.filter((chapter) => !generatedChapterTitles.has(normalize(chapter.title)));
    const existingTitles = new Set(baseChapters.map((chapter) => normalize(chapter.title)));
    const additions = [
      chapter('Netzwerk und DNA', `${entry.title} wird mit verwandten Einträgen über Typus, Material, Epoche, Quellenlage und räumliche Strategie verglichen. Entscheidend ist, wie es sich innerhalb derselben architektonischen DNA unterscheidet: durch Ort, Auftrag, Fügung, Gebrauch und kulturelle Haltung.`),
      chapter('Topos / Typos / Tektonik', `Topos, Typos und Tektonik werden zusammen gelesen: Ort und Landschaft bilden die Setzung, ${programText} bildet den typologischen Ausgangspunkt, und ${materialText} markieren die konstruktiv-atmosphärische Lesart.`),
      chapter('Datenbank- und Modellwert', `Für KosmoData ist ${entry.title} relevant, weil sich daraus Filter, Vergleichsgruppen, Planlayer und spätere Blender-Collections ableiten lassen: ${listText(publicTagLabels(databaseTags))}.`)
    ].filter((item) => !existingTitles.has(normalize(item.title)));

    return {
      ...entry.architecture_text,
      headline: profile.headline || entry.architecture_text.headline,
      overview: profile.overview || entry.architecture_text.overview,
      chapters: [...baseChapters, ...additions],
      generator: 'kosmodata-seed-from-research',
      generated_at: new Date().toISOString(),
      review_status: entry.architecture_text.review_status || 'draft_review'
    };
  }

  return buildGeneratedArchitectureText(entry, materials, program, context, databaseTags);
}

function buildGeneratedArchitectureText(entry, materials, program, context, databaseTags) {
  const materialText = listText(materials.primary);
  const programText = labelFor(program.type);
  const themes = listText(cleanThemes(entry.themes || [], program.type)) || 'noch zu prüfende Themen';
  const profile = architectureTextProfile(entry, materials, program, context, databaseTags);
  return {
    headline: profile.headline || entry.architecture_text?.headline || `${entry.title}: ${programText} als KosmoData-Referenz`,
    overview: profile.overview || `${entry.title} wird als architektonische Referenz gelesen: Ort, Nutzung, Material, Traglogik und historische Position werden zusammengeführt, damit das Projekt nicht nur beschrieben, sondern im KosmoData-Netzwerk vergleichbar wird.`,
    chapters: [
      chapter('These', profile.thesis || `${entry.title} wird über ${themes} als räumliche These gelesen: Das Projekt zeigt, wie eine Bauaufgabe eine Haltung zu Arbeit, Lernen, Öffentlichkeit, Landschaft oder Alltag formuliert.`),
      chapter('Netzwerk und DNA', profile.network || `${entry.title} wird mit verwandten Einträgen über Typus, Material, Epoche, Quellenlage und räumliche Strategie verglichen. Entscheidend ist, worin seine DNA innerhalb ähnlicher Projekte abweicht.`),
      chapter('Topos', profile.topos || `Der Ort ${context.setting} ist Teil der architektonischen Lesart: Er bestimmt Adresse, Maßstab, Landschaft, Infrastruktur und die Art, wie das Objekt in seinem Umfeld wirkt.`),
      chapter('Typos', profile.typos || `Typologisch wird ${entry.title} als ${programText} geführt. Diese Kategorie dient nicht als starre Schublade, sondern als Vergleichsebene für Programme, Raumfolgen und Nutzungslogiken.`),
      chapter('Tektonik', profile.tectonics || `${materialText} werden als konstruktiv-atmosphärische Ebene gelesen: Oberfläche, Traglogik, Fügung, Öffnung und Hülle bilden zusammen die tektonische Grammatik des Projekts.`),
      chapter('Raumlogik', profile.spatial || `Grundriss, Schnitt, Bewegung, Blick, Schwelle und Gebrauch werden als zusammenhängendes System gelesen. Für die spätere Plan- und 3D-Pipeline ist diese Raumlogik wichtiger als eine reine Bildbeschreibung.`),
      chapter('Konflikt und Kritik', profile.critique || `${entry.title} wird auch über offene Spannungen gelesen: Rechte, Quellenlage, soziale Wirkung, Ökologie, industrielle Abhängigkeit oder institutionelle Macht bleiben als prüfbare Kritikfelder markiert.`),
      chapter('KosmoData-Layer und 3D-Potenzial', profile.layers || `Aus ${entry.title} lassen sich Planlayer, Materiallayer und spätere Blender-Collections ableiten: ${listText(publicTagLabels(databaseTags))}.`),
      chapter('Entwurfsintelligenz', profile.transfer || `Der Datenbankwert liegt in der übertragbaren Entwurfsregel: ${entry.title} hilft, spätere Projekte nach Material, Typus, Struktur, Atmosphäre und historischem Netzwerk gezielt zu vergleichen.`)
    ],
    language: 'de',
    generator: 'kosmodata-seed-from-research',
    generated_at: new Date().toISOString(),
    review_status: 'draft_review'
  };
}

function architectureTextProfile(entry, materials, program, context, databaseTags) {
  const tags = listText(publicTagLabels(databaseTags));
  const materialText = listText(materials.primary);
  const curated = curatedNarrative(entry);
  if (curated) return curated.profile(tags, materialText, context, program);
  if (program.type === 'pavilion') {
    return {
      headline: `${entry.title}: temporärer Pavillon als Material- und Atmosphärenexperiment`,
      overview: `${entry.title} wird als begehbares Experiment gelesen: Eine temporäre Struktur verdichtet Dach, Stütze, Materialoberfläche und Landschaft zu einer räumlichen These. Entscheidend ist nicht Dauerhaftigkeit, sondern wie wenig Architektur nötig ist, um Ort, Schatten, Bewegung und öffentliche Aneignung zu verändern.`,
      thesis: `Der Pavillon ist eine präzise Versuchsanordnung. Er macht sichtbar, wie Dachfigur, Traglogik und Materialwirkung ein öffentliches Zwischenfeld erzeugen, das weder reines Objekt noch klassisches Gebäude ist.`,
      network: `${entry.title} steht im Netzwerk temporärer Ausstellungsarchitekturen, Landschaftspavillons und experimenteller Tragwerke. Seine DNA unterscheidet sich von dauerhaften Gebäuden durch Kürze, atmosphärische Intensität und hohe konstruktive Lesbarkeit.`,
      topos: `Der Ort ${context.setting} wird als Park- und Ausstellungsraum wirksam: Das Objekt muss nicht nur stehen, sondern eine bestehende Landschaft für kurze Zeit neu rahmen.`,
      typos: `Typologisch bleibt der Pavillon offen. Er ist Treffpunkt, Dach, Bild, Bühne und Testmodell zugleich; gerade diese Unschärfe macht ihn für Vergleichsfilter interessant.`,
      tectonics: `${materialText} werden als Kontrast zwischen Schwere, Oberfläche und Stützlogik gelesen. Für die Analyse zählt, wie Material scheinbar einfache Geometrie in Atmosphäre übersetzt.`,
      spatial: `Raum entsteht vor allem über Bewegung unter und um das Dach, über Blickachsen, Randzonen und Übergänge zwischen Park und überdecktem Feld.`,
      layers: `Für Plan, Schnitt und 3D reichen wenige starke Layer: Dachfläche, Stützenpunkte, Landschaftsbezug, Schwellen, Materialwirkung und Unsicherheitszonen. Tags: ${tags}.`
    };
  }
  if (program.type === 'monastery_plan') {
    return {
      headline: `${entry.title}: Kloster als räumliches Wissenssystem`,
      overview: `${entry.title} wird als Planintelligenz gelesen: Sakralraum, Wohnen, Arbeit, Bildung, Heilung und Versorgung werden zu einem idealisierten Organismus verbunden. Das Projekt ist deshalb weniger ein einzelnes Bauwerk als ein frühes Netzwerkmodell von Programm, Ordnung und Alltag.`,
      thesis: `Der Klosterplan formuliert Architektur als Ordnungssystem. Er zeigt, wie religiöse, ökonomische und soziale Funktionen räumlich so verknüpft werden, dass ein autarker Wissens- und Lebensraum entsteht.`,
      network: `${entry.title} verknüpft sich mit Stadtplänen, Campuslogiken, Idealstädten und monastischen Bautypologien. Seine DNA liegt in der Beziehung zwischen Programmclustern, Wegen und Hierarchien.`,
      topos: `Der Ort ${context.setting} ist nicht nur geografisch relevant, sondern als kulturelles Archiv: Der Plan wird über Überlieferung, Zeichnung und institutionelles Wissen lesbar.`,
      typos: `Typologisch ist das Projekt ein Klosterplan und zugleich ein frühes Diagramm komplexer Nutzungsorganisation. Es ordnet nicht nur Räume, sondern Rollen, Routinen und Abhängigkeiten.`,
      tectonics: `${materialText} markieren die Spannung zwischen gezeichneter Quelle und vermuteter Baupraxis. Die Tektonik muss deshalb als überprüfbare Hypothese und nicht als exakte Rekonstruktion geführt werden.`,
      spatial: `Raumlogik entsteht über Achsen, Höfe, Funktionsgruppen und abgestufte Zugänglichkeit: Kirche, Klausur, Versorgung und Lernen bilden ein lesbares System.`,
      layers: `Für KosmoData sind besonders Planlayer, Funktionscluster, Netzwerkbeziehungen, Quellenstatus und Unsicherheiten wichtig. Tags: ${tags}.`
    };
  }
  if (program.type === 'apartment_building') {
    return {
      headline: `${entry.title}: Wohnhaus als frühes Labor der Moderne`,
      overview: `${entry.title} wird als urbanes Wohnexperiment gelesen. Tragstruktur, Wohnungstyp, Fassade und Parzelle werden nicht getrennt betrachtet, sondern als System: Der moderne Wohnbau entsteht hier aus der Reibung zwischen Stadtadresse, konstruktiver Freiheit und neuer Häuslichkeit.`,
      thesis: `Das Haus verschiebt den Wohnbau vom massiven Stadtkörper zu einem offeneren System aus Struktur, Hülle und Nutzung. Darin liegt seine Bedeutung für die moderne Architektur-DNA.`,
      network: `${entry.title} gehört zu einem Netzwerk früher moderner Wohnhäuser, Stahlbetonexperimente und Fassadenstudien. Vergleichbar ist nicht nur die Form, sondern die Frage, wie Struktur neue Grundrisse erlaubt.`,
      topos: `Der Ort ${context.setting} bestimmt Maßstab, Adresse und städtische Lesbarkeit. Das Projekt muss als Parzellenarchitektur gelesen werden, nicht als freigestelltes Objekt.`,
      typos: `Typologisch ist es ein Wohnhaus, aber mit experimentellem Anspruch: Grundriss, Fassade und Konstruktion dienen als Testfeld für neue Wohn- und Repräsentationsformen.`,
      tectonics: `${materialText} werden über Rahmen, Füllung, Öffnung und Oberfläche gelesen. Die Tektonik liegt in der Vermittlung zwischen tragender Logik und urbanem Ausdruck.`,
      spatial: `Die Raumlogik entsteht durch Wohnungsschichtung, Belichtung, Fassadenbezug und den Übergang von privatem Innenraum zur Stadt.`,
      layers: `Für 2D und 3D sind Strukturrahmen, Fassadenebene, Wohnungszonen, Öffnungen und Materiallayer entscheidend. Tags: ${tags}.`
    };
  }
  if (program.type === 'department_store') {
    return {
      headline: `${entry.title}: Warenhaus als Bühne der Großstadtmoderne`,
      overview: `${entry.title} wird als öffentliche Innenwelt des Konsums gelesen. Straße, Schaufenster, Eingang, Lichtraum und vertikale Bewegung bilden eine räumliche Maschine, in der Handel, Sichtbarkeit und urbane Dichte architektonisch organisiert werden.`,
      thesis: `Das Warenhaus übersetzt Konsum in Raum. Seine Architektur entscheidet, wie Ware sichtbar wird, wie Publikum geführt wird und wie die Stadt in einen kommerziellen Innenraum übergeht.`,
      network: `${entry.title} steht im Netzwerk von Passagen, Kaufhäusern, Bahnhofs- und Großstadtarchitekturen. Seine DNA liegt in Schwelle, Blickführung, Lichtregie und öffentlichem Innenraum.`,
      topos: `Der Ort ${context.setting} ist Teil des Programms: Ein Warenhaus braucht städtische Frequenz, Adressbildung und eine Fassade, die zwischen Monument und Einladung vermittelt.`,
      typos: `Typologisch ist es Warenhaus und urbaner Knoten zugleich. Es ordnet Verkauf, Erschließung, Lichthöfe und Schaufenster zu einer neuen öffentlichen Alltagstypologie.`,
      tectonics: `${materialText} werden als Fassade, Tragstruktur, Öffnung und Lichtraum gelesen. Tektonisch wichtig ist die Spannung zwischen massiver Präsenz und transparenter Warenwelt.`,
      spatial: `Raum entsteht über Schwellen, Blickbeziehungen, vertikale Bewegung und die Choreografie zwischen Straße, Eingang, Verkaufsflächen und Lichthof.`,
      layers: `Für KosmoData sind Fassadenrhythmus, Handelszonen, vertikale Erschließung, Lichtstruktur und urbane Schwellen als Modelllayer interessant. Tags: ${tags}.`
    };
  }
  return {};
}

function chapter(title, text) {
  return {
    title,
    text,
    source_basis: 'seed-from-research draft; owner/source review required',
    review_status: 'draft_review'
  };
}

function curatedNarrative(entry) {
  const items = {
    'euralille-metropole': {
      short: 'Euralille macht den TGV-Knoten von Lille zu einem verdichteten metropolitanen Projekt aus Infrastruktur, Großform, Büro, Handel und öffentlichem Stadtraum.',
      one: 'Euralille zeigt, wie ein Verkehrsknoten nicht nur Erschließung bleibt, sondern durch Überlagerung von Bahnhof, Brücken, Hochhäusern, Einkaufsflächen und Plätzen eine neue Form europäischer Metropole erzeugt.',
      full: 'Euralille wird als metropolitanes Infrastrukturprojekt gelesen. OMA organisiert den neuen TGV-Knoten nicht als isolierten Bahnhof, sondern als überlagertes Feld aus Verkehr, Büro, Handel, Hotel, Kultur und öffentlichem Raum. Architektonisch wichtig ist die Spannung zwischen großmaßstäblicher Infrastruktur und städtischer Benutzbarkeit: Die Stadt entsteht aus Schnittstellen, Rampen, Brücken, Restflächen und programmatischen Verdichtungen. Für KosmoData ist Euralille ein Schlüsselobjekt für Projet Urbain, Verkehrsknoten, Großform, Public-Private-Development und die Frage, wie Mobilität selbst zur räumlichen Struktur einer Stadt wird.',
      profile: (tags, _materials, context) => ({
        headline: 'Euralille: Infrastruktur als metropolitaner Stadtraum',
        overview: 'Euralille übersetzt den TGV-Anschluss von Lille in ein urbanes System. Bahnhof, Brücken, Bürotürme, Einkaufsflächen und öffentliche Räume bilden kein Add-on zur Stadt, sondern eine neue Schnittstelle zwischen europäischem Verkehr, regionaler Ökonomie und lokaler Stadterfahrung.',
        thesis: 'Die These liegt in der Überlagerung: Euralille nimmt Infrastruktur nicht als technische Rückseite der Stadt, sondern als Generator von Adresse, Dichte und öffentlichem Raum.',
        network: 'Im Netzwerk steht Euralille zwischen Projet Urbain, Bahnhofsquartier, Großform und postindustrieller Stadtentwicklung. Anders als klassische Idealstadtmodelle operiert es mit realen Verkehrssystemen, Investitionslogiken und Restflächen.',
        topos: `Der Topos ${context.setting} ist entscheidend: Lille wird als Knoten zwischen nationaler Stadt, TGV-System und europäischem Maßstab gelesen.`,
        typos: 'Typologisch ist Euralille weder reines Quartier noch einzelnes Gebäude. Es ist ein Infrastruktur-Cluster, in dem Bahnhof, Dienstleistung, Handel und öffentlicher Raum eine hybride Stadtmaschine bilden.',
        tectonics: 'Tektonisch zählen weniger einzelne Materialien als die Fügung von Brücke, Platte, Hülle, Tragwerk und Zwischenraum. Stadt wird hier aus Schnittkanten, Ebenenwechseln und programmierten Übergängen gebaut.',
        spatial: 'Die Raumlogik entsteht über Bewegung: Ankunft, Transfer, vertikale Erschließung, Blick in die Tiefe des Verkehrsknotens und die Verdichtung kommerzieller und öffentlicher Programme.',
        layers: `Für 2D und 3D sind Verkehrsebenen, Brückenkanten, öffentliche Plätze, Hochpunktlogik, kommerzielle Volumen und Schnittstellen als Layer zentral. Tags: ${tags}.`,
        critique: 'Kritisch bleibt die Frage, ob die metropolitanen Großformen dauerhafte Urbanität erzeugen oder ob Infrastruktur, Kommerz und Imageproduktion den öffentlichen Stadtraum dominieren.',
        transfer: 'Übertragbar ist die Entwurfsintelligenz, Infrastruktur als räumliches und programmatisches Gerüst zu behandeln, nicht nur als technische Funktion.'
      })
    },
    'rural-studio-20k-house': {
      short: 'Das 20K House untersucht, wie aus begrenztem Budget, lokaler Baupraxis und präzisem Detail ein robustes, bezahlbares Wohnmodell entstehen kann.',
      one: 'Das 20K House zeigt Architektur als soziale und konstruktive Forschung: ein kleines Wohnhaus wird über Kosten, Materialökonomie, lokale Arbeit, Dauerhaftigkeit und Alltagstauglichkeit optimiert.',
      full: 'Das 20K House wird als Wohn- und Forschungsprototyp gelesen, nicht als einzelnes fertiges Objekt. Rural Studio entwickelt eine Serie kleiner Häuser, in denen Kosten, Konstruktion, Würde, Wartung und lokale Baupraxis zusammen gedacht werden. Architektonisch wichtig ist die Genauigkeit im Einfachen: Fundament, Dach, Holzrahmen, Hülle, Veranda, Belichtung und Möblierung werden so organisiert, dass geringe Mittel nicht zu geringer Qualität führen. Für KosmoData ist das Projekt zentral für bezahlbaren Wohnbau, Rural Practice, Materialökonomie und die Frage, wie Entwurf direkt auf soziale Realität und handwerkliche Umsetzbarkeit reagiert.',
      profile: (tags, materialText, context) => ({
        headline: '20K House: bezahlbares Wohnen als präzise Baukultur',
        overview: 'Das 20K House liest Wohnen nicht über Formikone, sondern über Budget, Arbeit, Detail und Alltag. Rural Studio macht das kleine Haus zum Testfeld für eine Architektur, die soziale Würde, konstruktive Einfachheit und materielle Robustheit zusammendenkt.',
        thesis: 'Die architektonische These lautet: Begrenzung ist kein Mangel, sondern ein Entwurfsinstrument. Kosten, Wartung und lokale Baupraxis werden zur eigentlichen Grammatik des Hauses.',
        network: 'Im Netzwerk steht das Projekt zwischen vernakulärem Bauen, Affordable Housing, Design-Build-Pädagogik und konstruktivem Prototyp. Seine DNA unterscheidet sich von industriellem Serienbau durch lokale Anpassung und reale Bauverantwortung.',
        topos: `Der Topos ${context.setting} verweist auf ruralen Alltag, Klima, Grundstück, lokale Ressourcen und die soziale Frage des Wohnens.`,
        typos: 'Typologisch ist es ein kleines Wohnhaus und zugleich ein Forschungsmodell. Der Typus wird iteriert, gemessen und korrigiert, statt als endgültige Form behauptet zu werden.',
        tectonics: `${materialText} stehen für eine Logik von leichter Konstruktion, Dachschutz, einfacher Montage, reparierbaren Details und bewusster Materialökonomie.`,
        spatial: 'Die Raumlogik entsteht aus wenigen, gut proportionierten Räumen, Schwellen zum Außenraum, einfacher Belichtung und der Beziehung zwischen Innenraum, Veranda und Landschaft.',
        layers: `Für Plan und 3D sind Fundament, Holzrahmen, Dachform, Hülle, Schwelle, Versorgung und Kostenlogik als Layer interessant. Tags: ${tags}.`,
        critique: 'Kritisch zu prüfen sind Skalierung, Finanzierungsmodell, langfristige Wartung und die Grenze zwischen sozialem Engagement und prototypischer Einzelproduktion.',
        transfer: 'Übertragbar ist die Haltung, Architekturqualität aus Einschränkung, Gebrauch und konstruktiver Verantwortung zu entwickeln.'
      })
    },
    'broadacre-city': {
      short: 'Broadacre City entwirft eine dezentralisierte Landschaftsstadt, in der Parzelle, Auto, Landwirtschaft, Einzelhaus und Infrastruktur ein alternatives Stadtmodell bilden.',
      one: 'Broadacre City zeigt Frank Lloyd Wrights Vision einer aufgelösten, agrarisch-technischen Stadt: Dichte wird durch Landverteilung, Mobilität und individuelle Selbstversorgung ersetzt.',
      full: 'Broadacre City wird als ideologischer Stadtentwurf gelesen. Wright ersetzt die kompakte Stadt durch ein flächiges System aus Parzellen, Straßen, Landwirtschaft, Einzelhäusern, öffentlichen Einrichtungen und moderner Mobilität. Architektonisch wichtig ist die Ambivalenz: Das Modell verspricht Freiheit, Licht, Boden und Selbstbestimmung, erzeugt aber zugleich extreme Abhängigkeit von Infrastruktur, Fläche und individueller Mobilität. Für KosmoData ist Broadacre ein starker Vergleichspunkt für Idealstadt, Suburbanisierung, Automobilurbanismus, Landschaftsraster und die politische Dimension räumlicher Dezentralisierung.',
      profile: (tags, _materials, context) => ({
        headline: 'Broadacre City: Landschaftsstadt zwischen Freiheit und Zersiedelung',
        overview: 'Broadacre City ist weniger Stadtplan im technischen Sinn als ein räumliches Manifest. Frank Lloyd Wright verbindet Landbesitz, Mobilität, Einzelhaus und Landschaft zu einem Gegenmodell zur dichten industriellen Stadt.',
        thesis: 'Die These lautet Dezentralisierung: Stadt soll nicht konzentriert, sondern über Landschaft, Straße und Parzelle verteilt werden.',
        network: 'Im Netzwerk steht Broadacre zwischen Idealstadt, Garden City, Suburbia, Automobilurbanismus und anti-urbaner Moderne. Seine DNA ist verwandt mit Landschaftsplanung, unterscheidet sich aber durch radikale Individualisierung.',
        topos: `Der Topos ${context.setting} ist weniger ein konkreter Ort als eine amerikanische Landschaftsidee aus Boden, Mobilität und Eigentum.`,
        typos: 'Typologisch ist Broadacre Stadtmodell, Manifest und Ausstellungsmodell zugleich. Es ordnet Wohnen, Arbeit, Landwirtschaft und Verkehr als territoriale Verteilung.',
        tectonics: 'Tektonisch wird nicht der Einzelbau, sondern die Infrastruktur lesbar: Straße, Parzelle, Raster, Landschaft und Modellbau bilden die konstruktive Logik des Plans.',
        spatial: 'Die Raumlogik entsteht über Distanz: Wege, Grundstücke, Sicht auf Landschaft und die Abhängigkeit vom Fahrzeug ersetzen urbane Nähe.',
        layers: `Für KosmoData sind Parzellenraster, Straßenhierarchie, Landschaft, Gebäudetypen, öffentliche Programme und Mobilitätslayer zentral. Tags: ${tags}.`,
        critique: 'Kritisch ist Broadacre gerade wegen seiner Wirkungsgeschichte: Das Versprechen individueller Freiheit steht neben Flächenverbrauch, Infrastrukturabhängigkeit und sozialer Fragmentierung.',
        transfer: 'Übertragbar ist die Fähigkeit, Stadt als ideologisches Raumprogramm zu lesen, in dem Mobilität und Eigentum ebenso wichtig sind wie Gebäude.'
      })
    },
    'athens-charter': {
      short: 'Die Charta von Athen formuliert die funktionale Stadt als Regelwerk aus Wohnen, Arbeiten, Erholung und Verkehr.',
      one: 'Die Charta von Athen zeigt Stadt als analytisches Programm: urbane Probleme werden in Funktionen zerlegt und als modernistisches Planungsmodell neu geordnet.',
      full: 'Die Charta von Athen wird als theoretisches Planungsinstrument gelesen. Sie ist kein Gebäude und kein einzelner Stadtplan, sondern ein normatives Regelwerk, das Wohnen, Arbeiten, Erholung und Verkehr als zentrale Funktionen der modernen Stadt definiert. Architektonisch relevant ist ihre doppelte Wirkung: Sie schafft eine klare Sprache für Hygiene, Licht, Grünraum und Mobilität, verengt Stadt aber zugleich auf funktionale Trennung und planbare Ordnung. Für KosmoData ist sie ein Schlüsseltext für CIAM, funktionale Stadt, Zonierung, Wohnungsfrage und die Kritik an modernistischer Planung.',
      profile: (tags, _materials, context) => ({
        headline: 'Charta von Athen: die funktionale Stadt als Regelapparat',
        overview: 'Die Charta von Athen übersetzt Stadt in Funktionen. Wohnen, Arbeiten, Erholung und Verkehr werden getrennt analysiert und als Grundlage einer rational organisierten Moderne formuliert.',
        thesis: 'Die These liegt in der funktionalen Lesbarkeit: Stadt soll durch Analyse, Zonierung, Licht, Hygiene und Verkehr neu geordnet werden.',
        network: 'Im Netzwerk steht die Charta zwischen CIAM, modernistischem Städtebau, Wohnungsreform, Hygiene-Diskurs und späterer Kritik an funktionaler Trennung.',
        topos: `Der Topos ${context.setting} ist vor allem diskursiv: Die Charta ist ein publiziertes Wissensobjekt, das konkrete Städte über ein theoretisches Raster bewertet.`,
        typos: 'Typologisch ist sie Theorie, Manifest und Planungsinstrument zugleich. Sie produziert keine Form, sondern Regeln für viele Formen.',
        tectonics: 'Ihre Tektonik ist begrifflich: Funktion, Zone, Abstand, Verkehr, Grün und Wohnung werden zu Bausteinen eines Planungsmodells.',
        spatial: 'Die Raumlogik entsteht durch Trennung und Zuordnung. Der Text ordnet Tätigkeiten, Verkehrsströme und Freiräume, bevor er architektonische Gestalt erzeugt.',
        layers: `Für KosmoData sind Funktionszonen, Wohnungsfrage, Mobilitätsachsen, Grünraum, Kritik und Quellenstatus als Layer relevant. Tags: ${tags}.`,
        critique: 'Kritisch wichtig ist, dass die Charta zugleich ein historisches Werkzeug und ein Problemfall ist: Ihre Klarheit kann urbane Komplexität reduzieren.',
        transfer: 'Übertragbar bleibt die Frage, wann Analyse hilft und wann sie Stadt zu stark vereinfacht.'
      })
    },
    'delirious-new-york': {
      short: 'Delirious New York liest Manhattan als Labor aus Raster, Parzelle, Wolkenkratzer, Programmstapelung und metropolitaner Fantasie.',
      one: 'Delirious New York zeigt, wie ein Architekturtext aus der Geschichte Manhattans eine Theorie der Dichte, des Schnitts, der Überlagerung und des kontrollierten Wahnsinns entwickelt.',
      full: 'Delirious New York wird als theoretisches Projekt gelesen. Koolhaas beschreibt Manhattan nicht neutral, sondern rekonstruiert es als ein System aus Grid, Parzelle, Aufzug, Hochhaus, Programmstapelung und spekulativer Imagination. Architektonisch wichtig ist die Methode: Die Stadt wird als Retroactive Manifesto verstanden, in dem gebaute Realität nachträglich als kohärente Entwurfslogik sichtbar wird. Für KosmoData ist der Text zentral für Dichte, Großstadt, Schnittlogik, Hybridprogramm, Theorieproduktion und die Frage, wie Architekturgeschichte selbst als entwerferisches Material benutzt werden kann.',
      profile: (tags, _materials, context) => ({
        headline: 'Delirious New York: Manhattan als rückwirkendes Manifest',
        overview: 'Delirious New York macht die Großstadt zum theoretischen Objekt. Manhattan erscheint als Labor, in dem Raster, Parzelle, Aufzug, Wolkenkratzer und Programmstapelung eine eigene Architektur-DNA erzeugen.',
        thesis: 'Die These liegt in der rückwirkenden Lesart: Das scheinbar chaotische Manhattan wird als präzise Entwurfsmaschine aus Regeln, Exzess und Spekulation verstanden.',
        network: 'Im Netzwerk verbindet der Text Hochhausgeschichte, Urban Theory, Metropolitanism, OMA-Denken und spätere Debatten über Dichte, Hybridität und Programm.',
        topos: `Der Topos ${context.setting} ist Manhattan als kulturelle und räumliche Maschine, nicht nur als geografischer Ort.`,
        typos: 'Typologisch ist Delirious New York Architekturtheorie, Stadtanalyse und Manifest. Es produziert Begriffe, mit denen Gebäude und Städte neu gelesen werden können.',
        tectonics: 'Die Tektonik ist hier nicht Materialfügung, sondern Schnittlogik: Grid, Aufzug, Stahlrahmen, Grundstück und Programmstapelung bilden die eigentliche Konstruktion der Theorie.',
        spatial: 'Raum entsteht im vertikalen Schnitt: unterschiedliche Programme liegen übereinander, ohne eine klassische Einheit bilden zu müssen.',
        layers: `Für KosmoData sind Grid, Parzelle, Hochhaus, Schnitt, Programmstapelung, Dichte und Theoriebeziehungen als Layer zentral. Tags: ${tags}.`,
        critique: 'Kritisch bleibt die Frage, ob die Faszination am Exzess soziale, ökonomische und politische Gewalt der Großstadt mitromantisiert.',
        transfer: 'Übertragbar ist die Methode, Stadtgeschichte als Entwurfswissen zu lesen und daraus operative Begriffe für neue Projekte zu gewinnen.'
      })
    }
  };
  return items[entry.slug] || null;
}

function normalizeMedia(entry, localSources = []) {
  const byType = new Map((entry.media || []).map((item) => [item.type, item]));
  const heroOverride = localSources.find((source) => source.hero_media)?.hero_media || null;
  return mediaTypes.map((type) => {
    const base = {
      type,
      label: byType.get(type)?.label || defaultMediaLabel(type),
      placeholder: byType.get(type)?.placeholder || `${defaultMediaLabel(type)} / ${entry.title}`,
      ...(byType.get(type) || {})
    };
    if (type !== 'exterior' || !heroOverride) return base;
    return {
      ...base,
      ...heroOverride,
      type: 'exterior',
      label: heroOverride.label || base.label || 'Außenansicht',
      placeholder: heroOverride.placeholder || base.placeholder || `Außenansicht / ${entry.title}`
    };
  });
}

function improvedShortDescription(entry, materials, program) {
  const curated = curatedNarrative(entry);
  if (curated) return curated.short;
  if (program.type === 'architectural_treatise') {
    return `${entry.title} verbindet Traktat, Zeichnung, Proportion und klassische Ordnungslehre zu einem übertragbaren Architekturmodell.`;
  }
  if (program.type === 'urban_plan') {
    return `${entry.title} verbindet Stadtplan, Industrie, Zonierung und soziale Utopie zu einem frühen Modell der rational organisierten Stadt.`;
  }
  if (program.type === 'structural_prototype') {
    return `${entry.title} verdichtet Stahlbetonskelett, freien Grundriss und serielle Wiederholbarkeit zu einem konstruktiven Prototyp der Moderne.`;
  }
  if (program.type === 'urban_renewal_program') {
    return `${entry.title} verbindet kritische Rekonstruktion, Blockstruktur, Reparatur und Wohnungsbau zu einem Modell stadträumlicher Erneuerung.`;
  }
  if (program.type === 'pavilion') {
    return `${entry.title} verbindet temporäre Architektur, Landschaft, Dachfigur und Materialexperiment zu einem prägnanten Pavillonraum.`;
  }
  if (program.type === 'monastery_plan') {
    return `${entry.title} verbindet monastische Ordnung, Wissensorganisation und idealisierten Lageplan zu einem frühmittelalterlichen Raumdiagramm.`;
  }
  if (program.type === 'apartment_building') {
    return `${entry.title} verbindet Stahlbetonrahmen, Wohnungsgrundriss, Fassade und städtisches Grundstück zu einem frühen Labor der Moderne.`;
  }
  if (program.type === 'department_store') {
    return `${entry.title} verbindet Warenhaus, Schwelle, Konsumraum und urbanes Parterre zu einer Schlüsselarchitektur der Großstadtmoderne.`;
  }
  return `${entry.title} verbindet ${labelFor(program.type)}, ${listText(materials.primary.slice(0, 3))} und die räumliche DNA von ${listText(entry.themes?.slice(0, 3) || ['noch zu prüfenden Themen'])} zu einer prägnanten Architekturlesart.`;
}

function improvedOneSentence(entry, materials, program) {
  const curated = curatedNarrative(entry);
  if (curated) return curated.one;
  if (program.type === 'architectural_treatise') {
    return `${entry.title} zeigt, wie Text, Bild, Proportion und antike Referenz zu einem reproduzierbaren Regelwerk architektonischen Wissens werden.`;
  }
  if (program.type === 'structural_prototype') {
    return `${entry.title} zeigt, wie Stahlbetonskelett, Stützenraster und freier Grundriss zu einem offenen System für Plan-, Struktur- und 3D-Layer werden.`;
  }
  if (program.type === 'pavilion') {
    return `${entry.title} zeigt, wie ein temporärer Pavillon über Dachfigur, Landschaftsbezug, Materialwirkung und leichte Tragstruktur zu einem präzisen räumlichen Experiment wird.`;
  }
  if (program.type === 'monastery_plan') {
    return `${entry.title} zeigt, wie ein idealisierter Klosterplan religiöse Ordnung, Arbeit, Wissen, Versorgung und Topografie zu einem lesbaren räumlichen System verbindet.`;
  }
  if (program.type === 'apartment_building') {
    return `${entry.title} zeigt, wie Wohnungsgrundriss, Stahlbetonrahmen, Fassade und Stadtadresse zu einem frühen Labor der modernen Wohnarchitektur werden.`;
  }
  if (program.type === 'department_store') {
    return `${entry.title} zeigt, wie Warenhaus, Schaufenster, vertikale Erschließung und städtische Schwelle die Architektur des modernen Konsums räumlich organisieren.`;
  }
  return `${entry.title} zeigt, wie ${labelFor(program.type)}, ${listText(materials.primary.slice(0, 4))}, Topos, Typos und Tektonik zu einer belastbaren Referenz für Plan-, Material- und 3D-Layer werden.`;
}

function improvedFullDescription(entry, materials, program, context) {
  const curated = curatedNarrative(entry);
  if (curated) return curated.full;
  if (program.type === 'architectural_treatise') {
    return `${entry.title} wird als Wissensobjekt gelesen: Der Traktat übersetzt antike Ordnung, Proportion, Villentypologien und Zeichnung in ein transportierbares architektonisches Regelwerk. Für KosmoData ist er weniger ein Gebäude als ein Betriebssystem der klassischen Architektur, aus dem Vergleichsachsen, Planlogiken, Referenzfamilien und spätere Analyse-Layer abgeleitet werden.`;
  }
  if (program.type === 'structural_prototype') {
    return `${entry.title} wird als konstruktiver Prototyp ohne festen Ort gelesen. Entscheidend ist die Trennung von Tragwerk, Grundriss und Hülle: wenige Stahlbetonelemente erzeugen ein offenes Raster, das Wiederholung, Erweiterung und freie räumliche Organisation ermöglicht. Für KosmoData wird daraus ein besonders klares Modell für Struktur-, Plan- und Blender-Layer.`;
  }
  if (program.type === 'pavilion') {
    return `${entry.title} wird als temporäre Architektur gelesen, deren Wert nicht in Dauerhaftigkeit, sondern in der räumlichen Zuspitzung liegt. Dach, Stütze, Materialoberfläche und Landschaftsbezug bilden ein konzentriertes Experiment: ein begehbares Modell, an dem Atmosphäre, Schwere, Leichtigkeit und öffentliche Aneignung direkt prüfbar werden. Für KosmoData ist der Eintrag besonders wichtig, weil Pavillons als schnelle Testfelder für Struktur-, Material- und Wahrnehmungslayer funktionieren.`;
  }
  if (program.type === 'monastery_plan') {
    return `${entry.title} wird als räumliches Wissensdiagramm gelesen: Der Plan ordnet Sakralraum, Wohnen, Arbeit, Bildung, Heilung und Versorgung zu einem idealisierten Klosterorganismus. Entscheidend ist weniger die exakte gebaute Umsetzung als die Klarheit der Beziehungen zwischen Programm, Weg, Hierarchie und Landschaft. Für KosmoData entsteht daraus ein früher Referenzfall für Netzwerkdenken, Typologie und planbasierte Modellrekonstruktion.`;
  }
  if (program.type === 'apartment_building') {
    return `${entry.title} wird als urbanes Wohnlabor der Moderne gelesen. Stahlbetonrahmen, Grundrissorganisation, Fassade, Lichtführung und städtische Parzelle verschieben das Wohnhaus weg vom massiven Block hin zu einem offen lesbaren System aus Struktur, Hülle und Nutzung. Für KosmoData wird der Eintrag zur Vergleichsachse für Wohnbau, freie Grundrisse, Fassadentektonik und frühe moderne Materiallogik.`;
  }
  if (program.type === 'department_store') {
    return `${entry.title} wird als Architektur der Großstadt gelesen: Nicht nur als Gebäude für Verkauf, sondern als räumliche Maschine aus Zugang, Blick, Ware, Licht, vertikaler Bewegung und urbanem Parterre. Fassade und Innenraum vermitteln zwischen Straße und Konsumwelt; Schwelle, Transparenz und Monumentalität werden zu tektonischen Werkzeugen des modernen Handels. Für KosmoData ist der Eintrag ein Schlüsselobjekt für Kommerz, Stadtraum und öffentliche Innenräume.`;
  }
  return `${entry.title} wird als architektonisches Referenzobjekt über ${labelFor(program.type)}, ${listText(materials.primary)}, ${context.setting}, räumliche Ordnung und historische Position gelesen. Entscheidend ist nicht die reine Datierung, sondern wie Setzung, Material, Gebrauch, Fügung und kulturelle Haltung zusammen eine übertragbare Entwurfsintelligenz bilden. Für KosmoData werden daraus zugleich Planlayer, Modelllayer, Filterbegriffe und Vergleichsbeziehungen abgeleitet.`;
}

function labelFor(value) {
  const labels = {
    domestic_house: 'Wohnhaus',
    building: 'Bauwerk',
    urban_plan: 'Stadtplan',
    architectural_treatise: 'Architekturtraktat',
    structural_prototype: 'Konstruktionsprototyp',
    urban_renewal_program: 'Stadterneuerungsprogramm',
    pavilion: 'Pavillon',
    monastery_plan: 'Klosterplan',
    apartment_building: 'Wohnhaus',
    department_store: 'Warenhaus',
    landscape_project: 'Landschaftsprojekt',
    brick: 'Backstein',
    timber: 'Holz',
    concrete: 'Beton',
    glass: 'Glas',
    steel: 'Stahl',
    iron: 'Eisen',
    stone: 'Stein',
    vegetation: 'Vegetation',
    water: 'Wasser',
    paper: 'Papier',
    drawing: 'Zeichnung',
    ceramic: 'Keramik',
    'thing-modernity': 'Objektmoderne',
    'arts-and-crafts': 'Arts and Crafts',
    hygiene: 'Hygiene',
    domesticity: 'Wohnkultur',
    'domestic-house': 'Wohnhaus',
    'pre-modern-architecture': 'vormoderne Architektur',
    pre_modern_architecture: 'vormoderne Architektur',
    modern_architecture: 'moderne Architektur',
    'modern-architecture': 'moderne Architektur',
    sustainable_architecture: 'nachhaltige Architektur',
    'sustainable-architecture': 'nachhaltige Architektur',
    classical_architecture: 'klassische Architektur',
    'classical-architecture': 'klassische Architektur',
    postwar_modern_architecture: 'Nachkriegsmoderne',
    'postwar-modern-architecture': 'Nachkriegsmoderne',
    factory: 'Fabrik',
    school: 'Schule',
    'urban-renewal-program': 'Stadterneuerungsprogramm',
    'monastery-plan': 'Klosterplan',
    'apartment-building': 'Wohnhaus',
    'department-store': 'Warenhaus',
    'structural-prototype': 'Konstruktionsprototyp',
    'architectural-treatise': 'Architekturtraktat',
    'urban-plan': 'Stadtplan',
    'glass-corner': 'Glasecke',
    'modern-pedagogy': 'moderne Pädagogik',
    'landscape-project': 'Landschaftsprojekt',
    'industrial-reuse': 'industrielle Umnutzung',
    'landscape-urbanism': 'Landscape Urbanism',
    palimpsest: 'Palimpsest',
    'public-space': 'öffentlicher Raum',
    transparency: 'Transparenz',
    industry: 'Industrie',
    workshop: 'Werkstatt',
    zoning: 'Zonierung',
    workers: 'Arbeiterschaft',
    utopia: 'Utopie',
    treatise: 'Traktat',
    villa: 'Villa',
    proportion: 'Proportion',
    classicism: 'Klassizismus',
    prototype: 'Prototyp',
    frame: 'Rahmen',
    standardization: 'Standardisierung',
    'free-plan': 'freier Grundriss',
    'critical-reconstruction': 'kritische Rekonstruktion',
    block: 'Blockstruktur',
    repair: 'Reparatur',
    housing: 'Wohnungsbau',
    temporary: 'temporäre Architektur',
    landscape: 'Landschaft',
    'knowledge-network': 'Wissensnetzwerk',
    'concrete-frame': 'Stahlbetonrahmen',
    commerce: 'Handel',
    threshold: 'Schwelle'
  };
  const raw = String(value || '');
  return labels[raw] || labels[slugify(raw)] || raw.replace(/[_-]/g, ' ');
}

function listText(values) {
  return [...new Set(values.map(labelFor))].join(', ');
}

function tagLabel(value) {
  return String(value || '').replace(/^[a-z_ -]+:/i, '');
}

function publicTagLabels(tags) {
  return tags
    .filter((tag) => /^(typology|style|theme|material):/.test(tag))
    .map(tagLabel)
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .slice(0, 8);
}

function hasTerm(haystack, rawTerm) {
  const term = normalize(rawTerm);
  if (!term) return false;
  return new RegExp(`(^|\\s)${escapeRegExp(term)}(\\s|$)`).test(haystack);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sourceIsProjectSpecific(source, entry) {
  const haystack = normalize([source.title, source.name, source.id, source.url].filter(Boolean).join(' '));
  const needles = [
    entry.slug,
    entry.id,
    entry.title,
    ...(entry.authors || [])
  ]
    .map(normalize)
    .flatMap((value) => [value, ...value.split(/\s+/).filter((part) => part.length > 4)])
    .filter(Boolean);
  return needles.some((needle) => haystack.includes(needle));
}

function tagThemes(databaseTags) {
  return databaseTags
    .filter((tag) => /^(structure|spatial|theme):/.test(tag))
    .map(stripTagPrefix);
}

function cleanThemes(themes) {
  const materialLike = new Set(['brick', 'timber', 'stone', 'concrete', 'glass', 'iron', 'wood', 'holz', 'backstein', 'stein']);
  const typologyLike = new Set(['domestic-house', 'building', 'landscape-project', 'factory', 'school', 'urban-plan', 'architectural-treatise', 'structural-prototype', 'urban-renewal-program', 'monastery-plan', 'apartment-building', 'department-store', 'pavilion']);
  return dedupeThemes(themes.filter((theme) => {
    const slug = slugify(theme);
    if (materialLike.has(slug)) return false;
    if (typologyLike.has(slug)) return false;
    return true;
  }));
}

function dedupeThemes(themes) {
  const seen = new Set();
  return themes.filter((theme) => {
    const slug = slugify(theme);
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

function sourceBasisText(entry, researchPacks) {
  const parts = [
    entry.source_url,
    ...(entry.source_candidates || []).map((source) => source.title || source.url),
    ...researchPacks.flatMap((pack) => (pack.sources || []).map((source) => source.name || source.url))
  ].filter(Boolean);
  return parts.length ? parts.slice(0, 6).join(' | ') : 'entry metadata only; needs source review';
}

function dedupeSources(sources) {
  const seen = new Set();
  return sources.filter((source) => {
    const key = source.url || source.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderSeedMarkdown(review) {
  const lines = [
    `# ${review.entry.title} / KosmoData Seed Candidate`,
    '',
    `Generated: ${review.generated_at}`,
    `Readiness: \`${review.readiness}\``,
    '',
    '## Research Packs',
    ''
  ];
  if (review.research_packs.length) {
    review.research_packs.forEach((pack) => lines.push(`- ${pack.path} (${pack.source_count} sources)`));
  } else {
    lines.push('- none found; run `npm run database:research -- --agent all --topic "..."` first for stronger seeds.');
  }
  lines.push('', '## Blockers', '');
  if (review.blockers.length) review.blockers.forEach((item) => lines.push(`- ${item}`));
  else lines.push('- none');
  lines.push('', '## Warnings', '');
  if (review.warnings.length) review.warnings.forEach((item) => lines.push(`- ${item}`));
  else lines.push('- none');
  lines.push('', '## Pipeline', '');
  Object.entries(review.tool_pipeline).forEach(([key, value]) => lines.push(`- ${key}: \`${value}\``));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function readJson(filePath, fallback = undefined) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (fallback !== undefined && error.code === 'ENOENT') return fallback;
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

async function readText(filePath, fallback = undefined) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (fallback !== undefined && error.code === 'ENOENT') return fallback;
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function defaultMediaLabel(type) {
  return {
    exterior: 'Außenansicht',
    interior: 'Innenraum',
    section: 'Schnitt',
    plan: 'Grundriss'
  }[type];
}

function stripTagPrefix(value) {
  return String(value).replace(/^[a-z_ -]+:/i, '');
}

function slugify(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tag';
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function relativeToRoot(filePath) {
  return path.relative(root, filePath);
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
