#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = resolve(rootDir, 'data/research-source-registry.json');
const entriesPath = resolve(rootDir, 'data/mock-entries.json');
const outputRoot = resolve(rootDir, 'out/database-research');
const today = new Date().toISOString().slice(0, 10);

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));

  if (args['list-sources']) {
    listSources(registry, args);
    return;
  }

  const agent = args.agent ?? 'all';
  const mode = args.mode ?? (args.analyze ? 'analyze' : 'research');
  const topic = args.topic ?? args.project ?? args.query ?? '';
  const limit = Number.parseInt(args.limit ?? '12', 10);

  if (!topic.trim()) {
    throw new Error('Usage: npm run database:research -- --agent historical|current|all --topic "Project or theme" [--mode analyze]');
  }

  const sources = selectSources(registry.sources, { agent, sourceId: args.source, limit, topic });
  const agents = agent === 'all' ? registry.agents : registry.agents.filter((item) => item.id === agent);
  if (agents.length === 0 && agent !== 'all') throw new Error(`Unknown agent: ${agent}`);
  if (sources.length === 0) throw new Error(`No sources selected for agent/source: ${agent}`);

  const pack = buildResearchPack({ registry, agents, agent, topic, sources });
  const slug = slugify(`${agent}-${topic}`);
  const outputDir = resolve(outputRoot, today, slug);
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'research-pack.json'), `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDir, 'research-pack.md'), renderMarkdown(pack), 'utf8');

  console.log('Architecture Cosmos Database Research Agents');
  console.log(`Mode: ${pack.mode}`);
  console.log(`Agent: ${agent}`);
  console.log(`Topic: ${topic}`);
  console.log(`Sources: ${pack.source_count}`);
  console.log(`JSON: ${relativeToRoot(resolve(outputDir, 'research-pack.json'))}`);
  console.log(`Report: ${relativeToRoot(resolve(outputDir, 'research-pack.md'))}`);

  if (mode === 'analyze') {
    const entries = JSON.parse(await readFile(entriesPath, 'utf8'));
    const analysisPack = buildAnalysisPack({ pack, entries });
    await writeFile(resolve(outputDir, 'analysis-pack.json'), `${JSON.stringify(analysisPack, null, 2)}\n`, 'utf8');
    await writeFile(resolve(outputDir, 'analysis-pack.md'), renderAnalysisMarkdown(analysisPack), 'utf8');
    console.log(`Analysis JSON: ${relativeToRoot(resolve(outputDir, 'analysis-pack.json'))}`);
    console.log(`Analysis Report: ${relativeToRoot(resolve(outputDir, 'analysis-pack.md'))}`);
  }

  console.log('No database row was created.');
}

function buildResearchPack({ registry, agents, agent, topic, sources }) {
  return {
    generated_at: new Date().toISOString(),
    mode: 'query_pack_only',
    writes_database: false,
    topic,
    agent,
    selected_agents: agents.map((item) => ({
      id: item.id,
      label: item.label,
      mission: item.mission
    })),
    safety: {
      no_auto_database_write: registry.policy.no_auto_database_write,
      no_auto_media_republication: registry.policy.no_auto_media_republication,
      public_display_requires: registry.policy.public_display_requires,
      private_or_unclear_sources: registry.policy.private_or_unclear_sources
    },
    source_count: sources.length,
    sources: sources.map((source) => sourcePlan(source, topic)),
    next_review_steps: [
      'Review source hits manually and keep private/auth/subscription material out of public output.',
      'Promote only factual metadata, links, bibliography and own-written summaries.',
      'Run rights gate before any public media, plan, image or model publication.',
      'Create an entry draft only after at least one reliable source and one rights note exist.'
    ]
  };
}

function selectSources(sources, { agent, sourceId, limit, topic = '' }) {
  const selected = sources
    .filter((source) => (sourceId ? source.id === sourceId : true))
    .filter((source) => (agent === 'all' ? true : source.agent === agent))
    .filter((source) => !source.url.includes('mail.google.com'))
    .filter((source) => !source.url.includes('token='))
    .sort((a, b) => scoreSource(b, topic) - scoreSource(a, topic));

  return Number.isFinite(limit) && limit > 0 ? selected.slice(0, limit) : selected;
}

function scoreSource(source, topic = '') {
  const reliability = { primary: 5, high: 4, medium: 3, low: 1 }[source.reliability] ?? 2;
  const automation = source.automation_mode.includes('query') ? 1 : source.automation_mode.includes('api') ? 0.5 : 0;
  const bookmark = source.bookmark_origin === 'opera' ? 1 : 0;
  const eth = source.id.startsWith('eth-') || source.url.includes('ethz.ch') ? 1.5 : 0;
  const primary = source.reliability === 'primary' ? 1 : 0;
  const topicMatch = matchesTopic(source, topic) ? 2 : 0;
  const unmatchedOfficePenalty = source.source_type === 'office_website' && !topicMatch ? -5 : 0;
  return reliability + automation + bookmark + eth + primary + topicMatch + unmatchedOfficePenalty;
}

function matchesTopic(source, topic) {
  const normalizedTopic = normalize(topic);
  if (!normalizedTopic) return false;
  const haystack = normalize([
    source.id,
    source.name,
    source.url,
    source.notes,
    ...(source.keywords ?? [])
  ].join(' '));
  return normalizedTopic
    .split(/\s+/)
    .filter((part) => part.length > 3)
    .some((part) => haystack.includes(part));
}

function sourcePlan(source, topic) {
  const query = buildQuery(source, topic);
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    agent: source.agent,
    source_type: source.source_type,
    reliability: source.reliability,
    rights_mode: source.rights_mode,
    automation_mode: source.automation_mode,
    bookmark_origin: source.bookmark_origin,
    query,
    search_urls: buildSearchUrls(source, query),
    candidate_output: {
      entry_candidate: false,
      source_candidate: true,
      media_candidate: source.rights_mode.includes('file_level') || source.rights_mode.includes('record_level'),
      public_display_default: false
    },
    review_questions: reviewQuestionsFor(source),
    notes: source.notes
  };
}

function buildQuery(source, topic) {
  const termsByType = {
    academic_repository: 'architecture history project source',
    library_catalogue: 'architecture monograph plan section project',
    digitized_journals: 'architecture project plan section architect',
    image_archive: 'architecture building photograph plan',
    lecture_video_index: 'architecture lecture project history',
    course_page: 'architecture project history lecture',
    course_summary: 'architecture history project summary',
    heritage_inventory: 'architecture heritage inventory site',
    geo_map: 'site map coordinates architecture context',
    open_geo_data: 'coordinates building footprint site',
    open_media_archive: 'architecture building file license',
    cultural_heritage_aggregator: 'architecture cultural heritage rights',
    public_archive: 'architecture historic drawing map photograph',
    architecture_magazine: 'architecture project photos plans',
    architecture_engineering_publication: 'architecture project Switzerland',
    office_project_platform: 'architecture project office',
    curated_architecture_atlas: 'architecture project plans photos',
    architecture_journal: 'architecture article project',
    office_website: 'project architecture',
    material_database: 'material construction architecture',
    timber_reference_database: 'timber architecture structure',
    social_media_hint: 'architecture project'
  };

  return `${topic} ${termsByType[source.source_type] ?? 'architecture source'}`.replace(/\s+/g, ' ').trim();
}

function buildSearchUrls(source, query) {
  const encoded = encodeURIComponent(query);
  const host = safeHost(source.url);
  const urls = [
    {
      label: 'source',
      url: source.url
    }
  ];

  if (host) {
    urls.push({
      label: 'site search',
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:${host} ${query}`)}`
    });
  }

  urls.push({
    label: 'general search',
    url: `https://www.google.com/search?q=${encoded}`
  });

  return urls;
}

function reviewQuestionsFor(source) {
  const questions = [
    'Is this a primary, academic, official or secondary source for the project?',
    'Which exact facts can be cited from this source without copying protected media?',
    'Does the source contain explicit rights or license information?'
  ];

  if (source.agent === 'historical') {
    questions.push('Does it map to an ETH lecture, archive, period, typology or historical theme?');
  }

  if (source.agent === 'current') {
    questions.push('Does it identify architect, year, place, client, materials and project type clearly?');
  }

  if (source.source_type.includes('image') || source.source_type.includes('magazine') || source.source_type.includes('atlas')) {
    questions.push('Should media stay link-only/private until permission or file-level license is available?');
  }

  return questions;
}

function listSources(registry, args) {
  const agent = args.agent ?? 'all';
  const sources = selectSources(registry.sources, { agent, sourceId: args.source, limit: Number.POSITIVE_INFINITY });
  for (const source of sources) {
    console.log(`${source.id}\t${source.agent}\t${source.reliability}\t${source.automation_mode}\t${source.name}`);
  }
}

function renderMarkdown(pack) {
  const lines = [
    '# Architecture Cosmos Database Research Pack',
    '',
    `Generated: ${pack.generated_at}`,
    `Mode: \`${pack.mode}\``,
    `Agent: \`${pack.agent}\``,
    `Topic: ${pack.topic}`,
    `Sources: ${pack.source_count}`,
    '',
    '> This report is research-only. It does not create database rows and does not republish media.',
    '',
    '## Agents',
    ''
  ];

  for (const agent of pack.selected_agents) {
    lines.push(`- **${agent.label}**: ${agent.mission}`);
  }

  lines.push('', '## Sources', '');

  for (const source of pack.sources) {
    lines.push(`### ${source.name}`);
    lines.push('');
    lines.push(`- ID: \`${source.id}\``);
    lines.push(`- Type: \`${source.source_type}\``);
    lines.push(`- Reliability: \`${source.reliability}\``);
    lines.push(`- Rights mode: \`${source.rights_mode}\``);
    lines.push(`- Automation: \`${source.automation_mode}\``);
    lines.push(`- Query: ${source.query}`);
    lines.push(`- Source: ${source.url}`);
    const siteSearch = source.search_urls.find((item) => item.label === 'site search');
    if (siteSearch) lines.push(`- Site search: ${siteSearch.url}`);
    lines.push(`- Notes: ${source.notes}`);
    lines.push('');
    lines.push('Review:');
    for (const question of source.review_questions) {
      lines.push(`- ${question}`);
    }
    lines.push('');
  }

  lines.push('## Next Review Steps', '');
  for (const step of pack.next_review_steps) {
    lines.push(`- ${step}`);
  }

  return `${lines.join('\n')}\n`;
}

function buildAnalysisPack({ pack, entries }) {
  const matchedEntry = findEntryForTopic(entries, pack.topic);
  const sourceAssessments = pack.sources.map((source) => assessSource(source));
  const sourceScore = scoreSourceAssessments(sourceAssessments);
  const rightsSummary = summarizeRights(sourceAssessments, matchedEntry);
  const analysisTags = inferAnalysisTags(pack.topic, matchedEntry, sourceAssessments);
  const modelPotential = inferModelPotential(matchedEntry, analysisTags, sourceAssessments);
  const draftRecommendation = buildDraftRecommendation(pack.topic, matchedEntry, analysisTags, sourceAssessments, modelPotential);
  const readinessScore = scoreReadiness({ matchedEntry, sourceScore, rightsSummary, analysisTags, modelPotential });

  return {
    generated_at: new Date().toISOString(),
    mode: 'analysis_pack_only',
    writes_database: false,
    topic: pack.topic,
    agent: pack.agent,
    matched_entry: matchedEntry ? {
      id: matchedEntry.id,
      slug: matchedEntry.slug,
      title: matchedEntry.title,
      year_start: matchedEntry.year_start,
      authors: matchedEntry.authors,
      city: matchedEntry.city,
      country: matchedEntry.country,
      style_sector: matchedEntry.style_sector,
      database_status: matchedEntry.database_profile?.status ?? 'local_json'
    } : null,
    source_score: sourceScore,
    readiness_score: readinessScore,
    rights_summary: rightsSummary,
    source_assessments: sourceAssessments,
    analysis_tags: analysisTags,
    model_potential: modelPotential,
    draft_recommendation: draftRecommendation,
    next_actions: [
      'Manually open the top source links and verify facts.',
      'Keep images, plans and screenshots link-only/private until file-level rights are clear.',
      'Use this analysis pack to create or refine an entry draft, but do not auto-write to the database.',
      'Run archive:rights-gate before public media or model publication.',
      'For Blender/ArchiCAD, keep model layers named by material, structure, tectonics, site and context.'
    ]
  };
}

function findEntryForTopic(entries, topic) {
  const normalizedTopic = normalize(topic);
  const topicParts = normalizedTopic.split(/\s+/).filter((part) => part.length > 3);
  return entries
    .map((entry) => {
      const haystack = normalize([
        entry.id,
        entry.slug,
        entry.title,
        ...(entry.authors ?? []),
        entry.city ?? '',
        entry.country ?? '',
        ...(entry.themes ?? []),
        ...(entry.database_tags ?? [])
      ].join(' '));
      const score = topicParts.reduce((sum, part) => sum + (haystack.includes(part) ? 1 : 0), 0);
      return { entry, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.entry ?? null;
}

function assessSource(source) {
  const sourceConfidence = {
    primary: 0.95,
    high: 0.84,
    medium: 0.62,
    low: 0.32
  }[source.reliability] ?? 0.5;
  const rightsDecision = source.rights_mode.includes('public_domain') || source.rights_mode.includes('file_level')
    ? 'review_file_level'
    : source.rights_mode.includes('private') || source.rights_mode.includes('subscription')
      ? 'private_or_link_only'
      : source.rights_mode.includes('link_only') || source.rights_mode.includes('citation')
        ? 'link_only'
        : 'review_required';
  const analysisUse = inferSourceAnalysisUse(source);

  return {
    id: source.id,
    name: source.name,
    url: source.url,
    source_type: source.source_type,
    reliability: source.reliability,
    confidence: sourceConfidence,
    rights_mode: source.rights_mode,
    rights_decision: rightsDecision,
    public_media_default: false,
    analysis_use: analysisUse,
    risk: rightsDecision === 'private_or_link_only' ? 'protected_or_subscription_material' : rightsDecision === 'link_only' ? 'media_not_reusable_by_default' : 'needs_record_review',
    recommended_use: source.reliability === 'primary'
      ? 'primary facts, project metadata, source trail, no media reuse without permission'
      : 'supporting reference, tags and source trail'
  };
}

function inferSourceAnalysisUse(source) {
  const uses = new Set(['source_trail']);
  if (source.source_type.includes('office')) uses.add('identity').add('project_facts');
  if (source.source_type.includes('material') || source.source_type.includes('timber')) uses.add('material_tags').add('structure_tags');
  if (source.source_type.includes('journal') || source.source_type.includes('magazine')) uses.add('critical_context').add('media_candidates');
  if (source.source_type.includes('geo') || source.source_type.includes('map') || source.source_type.includes('heritage')) uses.add('site_context');
  if (source.source_type.includes('course') || source.source_type.includes('repository') || source.source_type.includes('library')) uses.add('historical_context');
  return Array.from(uses);
}

function scoreSourceAssessments(sourceAssessments) {
  const strongest = Math.max(...sourceAssessments.map((source) => source.confidence), 0);
  const primaryCount = sourceAssessments.filter((source) => source.reliability === 'primary').length;
  const highCount = sourceAssessments.filter((source) => source.reliability === 'high').length;
  return {
    strongest_confidence: round2(strongest),
    primary_sources: primaryCount,
    high_reliability_sources: highCount,
    source_mix: primaryCount > 0 && highCount > 0 ? 'strong' : primaryCount > 0 || highCount > 1 ? 'good' : 'needs_more_verification'
  };
}

function summarizeRights(sourceAssessments, matchedEntry) {
  const publicReadyAssets = (matchedEntry?.asset_candidates ?? []).filter((asset) => asset.public_display_allowed).length;
  const linkOnlySources = sourceAssessments.filter((source) => source.rights_decision === 'link_only' || source.rights_decision === 'private_or_link_only').length;
  return {
    public_media_ready: publicReadyAssets,
    link_only_or_private_sources: linkOnlySources,
    publication_default: publicReadyAssets > 0 ? 'partial_public_media_after_attribution' : 'metadata_and_links_only',
    note: 'Generated analysis and own summaries can be public; protected source images, plans and screenshots stay link-only/private unless rights are cleared.'
  };
}

function inferAnalysisTags(topic, matchedEntry, sourceAssessments) {
  const haystack = normalize([
    topic,
    matchedEntry?.title ?? '',
    matchedEntry?.short_description ?? '',
    matchedEntry?.one_sentence ?? '',
    matchedEntry?.full_description ?? '',
    ...(matchedEntry?.themes ?? []),
    ...(matchedEntry?.database_tags ?? []),
    ...sourceAssessments.flatMap((source) => source.analysis_use)
  ].join(' '));
  const candidates = [
    ['material:concrete', ['concrete', 'beton', 'stahlbeton']],
    ['material:timber', ['timber', 'holz', 'wood']],
    ['material:lime-plaster', ['lime', 'kalk', 'trasskalk']],
    ['material:clay-plaster', ['clay', 'lehm']],
    ['structure:concrete-frame', ['concrete frame', 'betontragwerk', 'stahlbetonskelett', 'frame']],
    ['structure:core', ['core', 'kern', 'aussteif']],
    ['typology:care-architecture', ['care', 'pflege', 'alterszentrum']],
    ['typology:monastery-transformation', ['monastery', 'kloster']],
    ['theme:adaptive-reuse', ['reuse', 'umbau', 'weiterbauen', 'bestand']],
    ['spatial:courtyard', ['courtyard', 'hof']],
    ['landscape:terrace-roof-garden', ['terrasse', 'terrace', 'roof garden', 'dachgarten']],
    ['analysis:tectonics-old-new-interface', ['old new', 'alt neu', 'weiterbauen', 'bestand']]
  ];
  const inferred = candidates
    .filter(([, needles]) => needles.some((needle) => haystack.includes(normalize(needle))))
    .map(([tag]) => tag);
  const existingTags = (matchedEntry?.database_tags ?? []).filter((tag) => /^(material|structure|typology|theme|spatial|landscape|analysis):/.test(tag));
  return Array.from(new Set([...inferred, ...existingTags])).slice(0, 24);
}

function inferModelPotential(matchedEntry, analysisTags, sourceAssessments) {
  const hasMediaSlots = (matchedEntry?.media ?? []).length >= 4;
  const hasModelLayers = (matchedEntry?.model_assets ?? []).length > 0 || (matchedEntry?.database_profile?.model_count ?? 0) > 0;
  const hasAnalysisLayers = (matchedEntry?.analysis_layers ?? []).length > 0;
  const structureTags = analysisTags.filter((tag) => tag.startsWith('structure:'));
  const materialTags = analysisTags.filter((tag) => tag.startsWith('material:'));
  const sourceTypes = new Set(sourceAssessments.flatMap((source) => source.analysis_use));
  const readiness = hasModelLayers ? 'model_seed_ready' : hasMediaSlots && hasAnalysisLayers ? 'draft_model_plan_ready' : 'needs_plans_and_verified_images';

  return {
    readiness,
    score: round2((hasMediaSlots ? 0.28 : 0) + (hasModelLayers ? 0.28 : 0) + (hasAnalysisLayers ? 0.24 : 0) + (structureTags.length ? 0.1 : 0) + (materialTags.length ? 0.1 : 0)),
    recommended_layers: [
      'low.glb',
      'mass.glb',
      'structure.glb',
      'material-system.glb',
      'tectonic-old-new-interface.glb',
      'site-context.glb'
    ],
    blender_collections: [
      'AC_entry_identity',
      'AC_structure',
      'AC_materials',
      'AC_tectonics',
      'AC_site_context',
      'AC_source_confidence'
    ],
    source_basis_needed: [
      'verified exterior and interior photographs',
      'plans and sections with rights status',
      'own diagrammatic reconstruction notes',
      sourceTypes.has('site_context') ? 'site/terrain/context reference' : 'site context source'
    ]
  };
}

function buildDraftRecommendation(topic, matchedEntry, analysisTags, sourceAssessments, modelPotential) {
  const title = matchedEntry?.title ?? topic;
  const sourceCandidates = sourceAssessments.slice(0, 8).map((source) => ({
    title: source.name,
    url: source.url,
    reliability_level: source.reliability,
    rights_status: source.rights_decision
  }));

  return {
    action: matchedEntry ? 'refine_existing_entry' : 'create_new_draft_after_review',
    title,
    slug: matchedEntry?.slug ?? slugify(title),
    source_candidates: sourceCandidates,
    suggested_tags: analysisTags,
    model_status: modelPotential.readiness,
    public_copy_policy: 'own_summary_only_with_links_until_rights_clear',
    database_write_allowed: false
  };
}

function scoreReadiness({ matchedEntry, sourceScore, rightsSummary, analysisTags, modelPotential }) {
  const entryScore = matchedEntry ? 0.22 : 0;
  const sourceComponent = sourceScore.source_mix === 'strong' ? 0.28 : sourceScore.source_mix === 'good' ? 0.2 : 0.1;
  const rightsComponent = rightsSummary.public_media_ready > 0 ? 0.12 : 0.06;
  const tagComponent = Math.min(analysisTags.length / 20, 1) * 0.2;
  const modelComponent = modelPotential.score * 0.18;
  const score = entryScore + sourceComponent + rightsComponent + tagComponent + modelComponent;
  return {
    score: round2(score),
    label: score >= 0.78 ? 'strong_pilot' : score >= 0.58 ? 'good_pilot_needs_review' : 'needs_more_sources',
    blockers: [
      rightsSummary.public_media_ready === 0 ? 'no public-display media cleared' : null,
      sourceScore.primary_sources === 0 ? 'no primary source selected' : null,
      modelPotential.readiness === 'needs_plans_and_verified_images' ? 'model source basis incomplete' : null
    ].filter(Boolean)
  };
}

function renderAnalysisMarkdown(pack) {
  const lines = [
    '# Architecture Cosmos Analysis Pack',
    '',
    `Generated: ${pack.generated_at}`,
    `Mode: \`${pack.mode}\``,
    `Topic: ${pack.topic}`,
    `Agent: \`${pack.agent}\``,
    `Readiness: \`${pack.readiness_score.label}\` (${pack.readiness_score.score})`,
    '',
    '> Analysis only. No database row was created and no media may be republished from this report alone.',
    ''
  ];

  if (pack.matched_entry) {
    lines.push('## Matched Entry', '');
    lines.push(`- ${pack.matched_entry.title} (${pack.matched_entry.year_start})`);
    lines.push(`- Slug: \`${pack.matched_entry.slug}\``);
    lines.push(`- Authors: ${pack.matched_entry.authors.join(', ')}`);
    lines.push(`- Place: ${[pack.matched_entry.city, pack.matched_entry.country].filter(Boolean).join(', ')}`);
    lines.push('');
  }

  lines.push('## Source Quality', '');
  lines.push(`- Mix: \`${pack.source_score.source_mix}\``);
  lines.push(`- Primary sources: ${pack.source_score.primary_sources}`);
  lines.push(`- High reliability sources: ${pack.source_score.high_reliability_sources}`);
  lines.push(`- Strongest confidence: ${pack.source_score.strongest_confidence}`);
  lines.push('');

  lines.push('## Rights', '');
  lines.push(`- Publication default: \`${pack.rights_summary.publication_default}\``);
  lines.push(`- Public media ready: ${pack.rights_summary.public_media_ready}`);
  lines.push(`- Link/private sources: ${pack.rights_summary.link_only_or_private_sources}`);
  lines.push(`- Note: ${pack.rights_summary.note}`);
  lines.push('');

  lines.push('## Analysis Tags', '');
  pack.analysis_tags.forEach((tag) => lines.push(`- \`${tag}\``));
  lines.push('');

  lines.push('## 3D / Blender Potential', '');
  lines.push(`- Readiness: \`${pack.model_potential.readiness}\``);
  lines.push(`- Score: ${pack.model_potential.score}`);
  lines.push(`- Recommended layers: ${pack.model_potential.recommended_layers.join(', ')}`);
  lines.push(`- Blender collections: ${pack.model_potential.blender_collections.join(', ')}`);
  lines.push('');

  lines.push('## Source Assessments', '');
  for (const source of pack.source_assessments) {
    lines.push(`### ${source.name}`);
    lines.push(`- Reliability: \`${source.reliability}\` / confidence ${source.confidence}`);
    lines.push(`- Rights: \`${source.rights_decision}\``);
    lines.push(`- Use: ${source.analysis_use.join(', ')}`);
    lines.push(`- Recommended: ${source.recommended_use}`);
    lines.push('');
  }

  lines.push('## Draft Recommendation', '');
  lines.push(`- Action: \`${pack.draft_recommendation.action}\``);
  lines.push(`- Slug: \`${pack.draft_recommendation.slug}\``);
  lines.push(`- Public copy policy: \`${pack.draft_recommendation.public_copy_policy}\``);
  lines.push('');

  lines.push('## Next Actions', '');
  pack.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function safeHost(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return '';
  }
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

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function normalize(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function relativeToRoot(filePath) {
  return filePath.replace(`${rootDir}/`, '');
}
