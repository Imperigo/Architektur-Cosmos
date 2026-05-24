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
  const seed = buildSeed(entry, researchPacks);
  const review = buildSeedReview(entry, seed, researchPacks);
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
  console.log(`Readiness: ${review.readiness}`);
  console.log('Wrote:');
  console.log(`- out/kosmodata-enrichment/${entry.slug}/seed-candidate.md`);
  console.log(`- archive-intake/${entry.slug}/enrichment/seed-candidate.json`);
  console.log('');
  console.log('Next command:');
  console.log(`npm run kosmodata:enrich -- --entry ${entry.slug}`);
}

function buildSeed(entry, researchPacks) {
  const sourceCandidates = buildSourceCandidates(entry, researchPacks);
  const materials = inferMaterials(entry);
  const program = inferProgram(entry);
  const context = inferContext(entry);
  const databaseTags = buildDatabaseTags(entry, materials, program, context);
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
      research_pack_count: researchPacks.length,
      research_packs: researchPacks.map((pack) => pack.path)
    },
    entry_patch: {
      source_quality: sourceCandidates.length >= 3 ? 'research_seed_review' : entry.source_quality,
      themes: [...new Set([...(entry.themes || []), ...tagThemes(databaseTags)])].slice(0, 10),
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

function buildSeedReview(entry, seed, researchPacks) {
  const sourceCount = seed.entry_patch.source_candidates.length;
  const blockers = [];
  if (sourceCount < 3) blockers.push('Less than 3 source candidates; keep this as a rough seed.');
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
    source_count: sourceCount,
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

function buildSourceCandidates(entry, researchPacks) {
  const existing = (entry.source_candidates || []).map((source) => ({
    source_type: source.source_type || 'source',
    title: source.title || source.url,
    url: source.url,
    reliability_level: source.reliability_level || 'existing_entry_source',
    rights_status: source.rights_status || 'link_only',
    notes: source.notes || 'Existing entry source candidate.'
  }));
  const fromPacks = researchPacks.flatMap((pack) => (pack.sources || []).map((source) => ({
    source_type: source.source_type || 'research_pack_source',
    title: source.name || source.id,
    url: source.url,
    reliability_level: source.reliability || 'needs_review',
    rights_status: source.rights_mode || 'link_only',
    notes: `Research pack source for "${pack.topic || entry.title}". Query: ${source.query || 'n/a'}`
  })));
  return dedupeSources([...existing, ...fromPacks]).slice(0, 8);
}

function inferMaterials(entry) {
  const haystack = normalize([entry.title, entry.short_description, entry.full_description, ...(entry.themes || [])].join(' '));
  const dictionary = [
    ['brick', ['brick', 'backstein', 'red house']],
    ['timber', ['timber', 'holz', 'wood', 'arts and crafts']],
    ['glass', ['glass', 'glas']],
    ['iron', ['iron', 'eisen']],
    ['concrete', ['concrete', 'beton']],
    ['stone', ['stone', 'stein', 'masonry']],
    ['vegetation', ['garden', 'garten', 'landscape', 'park']]
  ];
  const primary = dictionary.filter(([, terms]) => terms.some((term) => haystack.includes(term))).map(([tag]) => tag);
  return {
    primary: primary.length ? primary : ['needs_material_review'],
    secondary: ['craft_details', 'surface_system', 'construction_logic'].filter((tag) => !primary.includes(tag)),
    notes: `Seeded from existing entry metadata and research packs; verify exact material claims before promotion.`
  };
}

function inferProgram(entry) {
  const haystack = normalize([entry.entry_type, entry.title, entry.short_description, ...(entry.themes || [])].join(' '));
  const type = haystack.includes('house') || haystack.includes('domestic') || haystack.includes('wohnen') ? 'domestic_house' : entry.entry_type;
  return {
    type,
    subtype: `${entry.style_sector}_reference`,
    public_access: 'needs_review',
    components: [...new Set([...(entry.themes || []), entry.entry_type, entry.style_sector])].slice(0, 10)
  };
}

function inferContext(entry) {
  return {
    topography: 'needs_site_review',
    setting: [entry.city, entry.country].filter(Boolean).join(', ') || 'needs_location_review',
    landscape_relations: ['site_context_needs_review'],
    urban_context: [entry.lecture_cluster?.[0], entry.source_quality].filter(Boolean),
    construction_logic: [...new Set([...(entry.themes || []), entry.style_sector])].slice(0, 8)
  };
}

function buildDatabaseTags(entry, materials, program) {
  const tags = [
    ...(entry.source_candidates || []).map((source) => `source:${slugify(source.title || source.source_type || 'source')}`),
    `typology:${slugify(program.type)}`,
    `style:${entry.style_sector}`,
    ...(entry.themes || []).map((theme) => `theme:${slugify(theme)}`),
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
  const themes = (entry.themes || []).join(', ') || 'noch zu prüfende Themen';
  return {
    headline: entry.architecture_text?.headline || `${entry.title}: ${program.type} als KosmoData-Referenz`,
    overview: `${entry.title} wird als Review-Kandidat gelesen. Der Seed verbindet bestehende Metadaten, Quellenpakete, Materialhinweise und Analysefragen, damit daraus nach Prüfung ein präziser KosmoData-Eintrag entstehen kann.`,
    chapters: [
      chapter('These', `${entry.title} muss als architektonische These aus ${themes} gelesen werden, nicht als neutrale Kurzbeschreibung.`),
      chapter('Netzwerk und DNA', `${entry.title} wird mit verwandten Einträgen über Typus, Material, Epoche, Quellenlage und räumliche Strategie verglichen.`),
      chapter('Topos', `Der Ort ${context.setting} wird als aktiver Teil des architektonischen Arguments geprüft.`),
      chapter('Typos', `Typologisch ist der Seed vorerst als ${program.type} angelegt; die genaue Differenz zu verwandten Typen braucht Quellenreview.`),
      chapter('Tektonik', `Materialien wie ${materials.primary.join(', ')} werden als Fügung, Oberfläche, Traglogik und architektonische Wirkung geprüft.`),
      chapter('Raumlogik', `Grundriss, Schnitt, Bewegung, Blick, Schwelle und Gebrauch werden als zusammenhängendes System analysiert.`),
      chapter('Konflikt und Kritik', `Der Seed markiert offene Fragen zu Rechte, Quellen, sozialem Kontext, Macht, Ökologie oder technischer Abhängigkeit.`),
      chapter('KosmoData-Layer und 3D-Potenzial', `Vorgeschlagene Filter und Layer: ${databaseTags.slice(0, 10).join(', ')}.`),
      chapter('Entwurfsintelligenz', `Die spätere Textfassung soll klären, welche übertragbare Entwurfsregel aus ${entry.title} gewonnen werden kann.`)
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
  return `${entry.title} wird als ${program.type} mit Fokus auf ${materials.primary.slice(0, 3).join(', ')} und räumlicher DNA aus ${entry.themes?.slice(0, 3).join(', ') || 'noch zu prüfenden Themen'} vorbereitet.`;
}

function improvedOneSentence(entry, materials, program) {
  return `${entry.title} ist ein KosmoData-Seed für ${program.type}, bei dem ${materials.primary.slice(0, 4).join(', ')} sowie Topos, Typos, Tektonik, Plan- und 3D-Layer geprüft werden.`;
}

function improvedFullDescription(entry, materials, program, context) {
  return `${entry.title} wird über die KosmoData-Pipeline nicht direkt veröffentlicht, sondern als Review-Kandidat aufgebaut. Der Seed übernimmt bestehende Metadaten und Quellenpfade, ergänzt Material-, Programm-, Kontext-, Plan- und Modellhinweise und markiert offene Prüfstellen. Architektonisch soll der spätere Eintrag erklären, wie ${program.type}, ${materials.primary.join(', ')}, ${context.setting}, räumliche Ordnung und historische Position zusammen ein belastbares Referenzobjekt ergeben.`;
}

function tagThemes(databaseTags) {
  return databaseTags
    .filter((tag) => /^(typology|material|structure|spatial|theme):/.test(tag))
    .map(stripTagPrefix);
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
