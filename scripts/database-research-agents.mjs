#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = resolve(rootDir, 'data/research-source-registry.json');
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
  const topic = args.topic ?? args.project ?? args.query ?? '';
  const limit = Number.parseInt(args.limit ?? '12', 10);

  if (!topic.trim()) {
    throw new Error('Usage: npm run database:research -- --agent historical|current|all --topic "Project or theme"');
  }

  const sources = selectSources(registry.sources, { agent, sourceId: args.source, limit, topic });
  const agents = agent === 'all' ? registry.agents : registry.agents.filter((item) => item.id === agent);
  if (agents.length === 0 && agent !== 'all') throw new Error(`Unknown agent: ${agent}`);
  if (sources.length === 0) throw new Error(`No sources selected for agent/source: ${agent}`);

  const pack = {
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
  console.log('No database row was created.');
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
