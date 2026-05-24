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
  const context = inferContext(entry);
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
      media: normalizeMedia(entry),
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
      material_tags: Array.isArray(source.material_tags) ? source.material_tags : []
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
  const existing = (entry.source_candidates || []).map((source) => ({
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
  if (entry.entry_type === 'landscape_project' || haystack.includes('landscape') || haystack.includes('park')) type = 'landscape_project';
  else if (haystack.includes('factory') || haystack.includes('fabrik') || haystack.includes('industrie') || haystack.includes('industrial')) type = 'factory';
  else if (haystack.includes('school') || haystack.includes('schule') || haystack.includes('pedagogy') || haystack.includes('workshop') || haystack.includes('bauhaus')) type = 'school';
  else if (haystack.includes('house') || haystack.includes('domestic') || haystack.includes('wohnen') || haystack.includes('red house')) type = 'domestic_house';
  return {
    type,
    subtype: `${entry.style_sector}_reference`,
    public_access: 'needs_review',
    components: [...new Set([...cleanThemes(entry.themes || [], type), entry.entry_type, entry.style_sector])].slice(0, 10)
  };
}

function inferContext(entry) {
  return {
    topography: 'needs_site_review',
    setting: [entry.city, entry.country].filter(Boolean).join(', ') || 'needs_location_review',
    landscape_relations: ['site_context_needs_review'],
    urban_context: [entry.lecture_cluster?.[0], entry.source_quality].filter(Boolean),
    construction_logic: [...new Set([...cleanThemes(entry.themes || []), entry.entry_type, entry.style_sector].filter(Boolean))].slice(0, 8)
  };
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
  return {
    headline: entry.architecture_text?.headline || `${entry.title}: ${programText} als KosmoData-Referenz`,
    overview: `${entry.title} wird als architektonische Referenz gelesen: Ort, Nutzung, Material, Traglogik und historische Position werden zusammengeführt, damit das Projekt nicht nur beschrieben, sondern im KosmoData-Netzwerk vergleichbar wird.`,
    chapters: [
      chapter('These', `${entry.title} wird über ${themes} als räumliche These gelesen: Das Projekt zeigt, wie eine Bauaufgabe eine Haltung zu Arbeit, Lernen, Öffentlichkeit, Landschaft oder Alltag formuliert.`),
      chapter('Netzwerk und DNA', `${entry.title} wird mit verwandten Einträgen über Typus, Material, Epoche, Quellenlage und räumliche Strategie verglichen. Entscheidend ist, worin seine DNA innerhalb ähnlicher Projekte abweicht.`),
      chapter('Topos', `Der Ort ${context.setting} ist Teil der architektonischen Lesart: Er bestimmt Adresse, Maßstab, Landschaft, Infrastruktur und die Art, wie das Objekt in seinem Umfeld wirkt.`),
      chapter('Typos', `Typologisch wird ${entry.title} als ${programText} geführt. Diese Kategorie dient nicht als starre Schublade, sondern als Vergleichsebene für Programme, Raumfolgen und Nutzungslogiken.`),
      chapter('Tektonik', `${materialText} werden als konstruktiv-atmosphärische Ebene gelesen: Oberfläche, Traglogik, Fügung, Öffnung und Hülle bilden zusammen die tektonische Grammatik des Projekts.`),
      chapter('Raumlogik', `Grundriss, Schnitt, Bewegung, Blick, Schwelle und Gebrauch werden als zusammenhängendes System gelesen. Für die spätere Plan- und 3D-Pipeline ist diese Raumlogik wichtiger als eine reine Bildbeschreibung.`),
      chapter('Konflikt und Kritik', `${entry.title} wird auch über offene Spannungen gelesen: Rechte, Quellenlage, soziale Wirkung, Ökologie, industrielle Abhängigkeit oder institutionelle Macht bleiben als prüfbare Kritikfelder markiert.`),
      chapter('KosmoData-Layer und 3D-Potenzial', `Aus ${entry.title} lassen sich Planlayer, Materiallayer und spätere Blender-Collections ableiten: ${listText(publicTagLabels(databaseTags))}.`),
      chapter('Entwurfsintelligenz', `Der Datenbankwert liegt in der übertragbaren Entwurfsregel: ${entry.title} hilft, spätere Projekte nach Material, Typus, Struktur, Atmosphäre und historischem Netzwerk gezielt zu vergleichen.`)
    ],
    language: 'de',
    generator: 'kosmodata-seed-from-research',
    generated_at: new Date().toISOString(),
    review_status: 'draft_review'
  };
}

function chapter(title, text) {
  return {
    title,
    text,
    source_basis: 'seed-from-research draft; owner/source review required',
    review_status: 'draft_review'
  };
}

function normalizeMedia(entry) {
  const byType = new Map((entry.media || []).map((item) => [item.type, item]));
  return mediaTypes.map((type) => ({
    type,
    label: byType.get(type)?.label || defaultMediaLabel(type),
    placeholder: byType.get(type)?.placeholder || `${defaultMediaLabel(type)} / ${entry.title}`,
    ...(byType.get(type) || {})
  }));
}

function improvedShortDescription(entry, materials, program) {
  return `${entry.title} verbindet ${labelFor(program.type)}, ${listText(materials.primary.slice(0, 3))} und die räumliche DNA von ${listText(entry.themes?.slice(0, 3) || ['noch zu prüfenden Themen'])} zu einer prägnanten Architekturlesart.`;
}

function improvedOneSentence(entry, materials, program) {
  return `${entry.title} zeigt, wie ${labelFor(program.type)}, ${listText(materials.primary.slice(0, 4))}, Topos, Typos und Tektonik zu einer belastbaren Referenz für Plan-, Material- und 3D-Layer werden.`;
}

function improvedFullDescription(entry, materials, program, context) {
  return `${entry.title} wird als architektonisches Referenzobjekt über ${labelFor(program.type)}, ${listText(materials.primary)}, ${context.setting}, räumliche Ordnung und historische Position gelesen. Entscheidend ist nicht die reine Datierung, sondern wie Setzung, Material, Gebrauch, Fügung und kulturelle Haltung zusammen eine übertragbare Entwurfsintelligenz bilden. Für KosmoData werden daraus zugleich Planlayer, Modelllayer, Filterbegriffe und Vergleichsbeziehungen abgeleitet.`;
}

function labelFor(value) {
  const labels = {
    domestic_house: 'Wohnhaus',
    building: 'Bauwerk',
    urban_plan: 'Stadtplan',
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
    factory: 'Fabrik',
    school: 'Schule',
    'glass-corner': 'Glasecke',
    'modern-pedagogy': 'moderne Pädagogik',
    'landscape-project': 'Landschaftsprojekt',
    'industrial-reuse': 'industrielle Umnutzung',
    'landscape-urbanism': 'Landscape Urbanism',
    palimpsest: 'Palimpsest',
    'public-space': 'öffentlicher Raum',
    transparency: 'Transparenz',
    industry: 'Industrie',
    workshop: 'Werkstatt'
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
    .filter((tag) => /^(typology|structure|spatial|theme):/.test(tag))
    .map(stripTagPrefix);
}

function cleanThemes(themes, programType = null) {
  const materialLike = new Set(['brick', 'timber', 'stone', 'concrete', 'glass', 'iron', 'wood', 'holz', 'backstein', 'stein']);
  const typologyLike = new Set(['domestic-house', 'building', 'landscape-project', 'factory', 'school']);
  const allowedTypology = slugify(programType || '');
  return dedupeThemes(themes.filter((theme) => {
    const slug = slugify(theme);
    if (materialLike.has(slug)) return false;
    if (typologyLike.has(slug) && slug !== allowedTypology) return false;
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
