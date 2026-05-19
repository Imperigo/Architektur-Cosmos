#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mediaTypes = ['exterior', 'interior', 'section', 'plan'];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const title = readArg('--title') ?? readArg('--project') ?? '';
  const architect = readArg('--architect') ?? '';
  const address = readArg('--address') ?? readArg('--place') ?? '';
  const mode = readArg('--mode') ?? 'dev';

  if (!title.trim()) {
    throw new Error('Missing --title "Project name"');
  }

  const slug = slugify(title);
  const entry = researchDraft({ title, architect, address });
  const draftPath = resolve(rootDir, `data/drafts/${slug}.json`);
  const inboxDir = resolve(rootDir, `archive-inbox/${slug}`);
  const sourcePath = resolve(inboxDir, 'sources.md');

  await mkdir(dirname(draftPath), { recursive: true });
  await mkdir(inboxDir, { recursive: true });
  await writeFile(draftPath, `${JSON.stringify(entry, null, 2)}\n`);
  await writeFile(sourcePath, sourceChecklist(entry, { mode }), 'utf8');

  console.log('Architecture Cosmos research entry draft');
  console.log(`Entry: ${entry.title}`);
  console.log(`Draft: ${relativeToRoot(draftPath)}`);
  console.log(`Inbox: ${relativeToRoot(inboxDir)}`);
  console.log(`Sources: ${relativeToRoot(sourcePath)}`);
  console.log('');
  console.log('Next commands:');
  console.log(`npm run archive:draft -- --input data/drafts/${entry.slug}.json --output out/${entry.slug}-draft-preview.json`);
  console.log(`npm run archive:autopilot -- --input archive-inbox/${entry.slug} --title "${entry.title}" --copyright private_research`);
}

function researchDraft({ title, architect, address }) {
  const slug = slugify(title);
  const haystack = normalize(`${title} ${architect} ${address}`);

  if (haystack.includes('ingenbohl')) {
    return {
      id: 'alterszentrum-kloster-ingenbohl',
      slug: 'alterszentrum-kloster-ingenbohl',
      title: 'Alterszentrum Kloster Ingenbohl',
      entry_type: 'building',
      year_start: 2023,
      year_end: null,
      authors: ['Boltshauser Architekten', 'Roger Boltshauser'],
      city: 'Brunnen',
      country: 'Schweiz',
      style_sector: 'sustainable_architecture',
      lecture_cluster: ['Architecture Cosmos dev research', 'contemporary Swiss architecture'],
      themes: [
        'adaptive reuse',
        'monastery',
        'care architecture',
        'concrete structure',
        'lime plaster',
        'clay plaster',
        'timber facade',
        'inner courtyard',
        'roof garden',
        'existing fabric'
      ],
      short_description: 'Umbau und Erweiterung des Klosterareals Ingenbohl zu einem Alterszentrum mit präziser Einbindung in Bestand, Hofstruktur und Landschaft.',
      one_sentence: 'Das Alterszentrum Kloster Ingenbohl verbindet klösterlichen Bestand, neue Pflegearchitektur, Betontragwerk, mineralische Oberflächen und landschaftliche Terrassen zu einem zeitgenössischen Schweizer Umbauprojekt.',
      full_description: 'Der Umbau des Klosters Ingenbohl in Brunnen wird als Weiterbauen am Bestand gelesen: Die neue Struktur ergänzt das klösterliche Ensemble, arbeitet mit Hof, Sockel, Terrassen und präzisen Materialschichten und übersetzt Pflegearchitektur in eine ruhige räumliche Ordnung. Für den Architecture Cosmos ist das Projekt ein wichtiger Referenzknoten für Transformation, Tragwerk, Materialökologie und tektonische Analyse: Beton, mineralische Putze, Holz- und Fassadenschichten, innere Organisation und Landschaftsbezug lassen sich später als Modell- und Filterlayer auswerten.',
      media: mediaTypes.map((type) => ({
        type,
        label: `${labelForMedia(type)} placeholder`,
        placeholder: `${labelForMedia(type)} media slot for rights-reviewed Kloster Ingenbohl material.`,
        credit: 'private_research_until_review'
      })),
      source_quality: 'dev_research_seed',
      source_documents: ['Boltshauser Architekten project page', 'Baunetz project report', 'swiss-architects project note'],
      source_url: 'https://boltshauser.info/projekt/alterszentrum-kloster-ingenbohl/',
      source_candidates: [
        {
          source_type: 'website',
          title: 'Boltshauser Architekten / Alterszentrum Kloster Ingenbohl',
          url: 'https://boltshauser.info/projekt/alterszentrum-kloster-ingenbohl/',
          reliability_level: 'primary_source',
          rights_status: 'needs_permission',
          notes: 'Primary office source for metadata, project scope and source trail.'
        },
        {
          source_type: 'article',
          title: 'Baunetz / Alterszentrum Kloster Ingenbohl',
          reliability_level: 'secondary_source',
          rights_status: 'needs_permission',
          notes: 'Secondary project report; verify images and drawings before public display.'
        }
      ],
      asset_candidates: mediaTypes.map((type) => ({
        kind: type === 'exterior' || type === 'interior' ? 'image' : type,
        media_slot: type,
        title: `${labelForMedia(type)} candidate`,
        planned_r2_key: `entries/alterszentrum-kloster-ingenbohl/media/${type}-01.placeholder.json`,
        rights_status: 'needs_permission',
        public_display_allowed: false
      })),
      model_packages: [
        {
          package_type: 'reference_model',
          status: 'planned',
          planned_paths: [
            'entries/alterszentrum-kloster-ingenbohl/models/low.glb',
            'entries/alterszentrum-kloster-ingenbohl/models/structure.glb',
            'entries/alterszentrum-kloster-ingenbohl/models/tectonic.glb'
          ],
          notes: 'Generate only from own/licensed/private research material until rights are reviewed.'
        }
      ],
      analysis_layers: [
        {
          analysis_type: 'structure',
          summary: 'Initial hypothesis: concrete load-bearing order with existing-monastery interface; verify from plans and project text.',
          review_status: 'draft'
        },
        {
          analysis_type: 'material_system',
          summary: 'Initial tags: concrete, lime plaster, clay plaster, timber/facade layers and mineral surfaces; verify from primary source.',
          review_status: 'draft'
        },
        {
          analysis_type: 'tectonics',
          summary: 'Read as careful Weiterbauen: old/new junctions, courtyard order, facade rhythm, roof garden and landscape threshold.',
          review_status: 'draft'
        }
      ],
      analysis_observations: [
        { analysis_type: 'material_tag', label: 'material concrete', confidence_score: 0.74, source: 'source_inferred' },
        { analysis_type: 'material_tag', label: 'material lime-clay-plaster', confidence_score: 0.68, source: 'source_inferred' },
        { analysis_type: 'structure', label: 'structure care-building-concrete-frame', confidence_score: 0.62, source: 'source_inferred' },
        { analysis_type: 'tectonics', label: 'tectonics old-new-monastery-interface', confidence_score: 0.7, source: 'source_inferred' }
      ],
      ingestion_status: {
        stage: 'needs_review',
        source_status: 'candidate',
        asset_status: 'candidate',
        model_status: 'planned',
        updated_at: new Date().toISOString()
      },
      database_tags: [
        'source:primary-office',
        'source:secondary-publication',
        'typology:care-architecture',
        'typology:monastery-transformation',
        'structure:concrete',
        'material:lime-plaster',
        'material:clay-plaster',
        'material:timber',
        'theme:adaptive-reuse',
        'theme:swiss-contemporary',
        'rights:needs-review',
        'analysis:structure-material-tectonics'
      ],
      database_profile: {
        status: 'draft',
        r2_prefix: 'entries/alterszentrum-kloster-ingenbohl',
        source_count: 2,
        media_count: 4,
        model_count: 1,
        analysis_count: 3,
        tag_count: 12
      }
    };
  }

  return genericDraft({ title, architect, address, slug });
}

function genericDraft({ title, architect, address, slug }) {
  return {
    id: slug,
    slug,
    title,
    entry_type: 'building',
    year_start: new Date().getFullYear(),
    authors: splitList(architect, ['Unknown architect']),
    city: address,
    country: '',
    style_sector: 'sustainable_architecture',
    lecture_cluster: ['Architecture Cosmos dev research'],
    themes: ['needs research', 'source verification', 'rights review', 'structure analysis', 'material analysis', 'tectonic analysis'],
    short_description: `${title} is staged for AI-assisted research and archive classification.`,
    one_sentence: `${title} is a dev-mode research seed prepared for source discovery, rights review, media intake, model planning and analysis-layer classification.`,
    full_description: `${title} has not been verified yet. The next local research step should collect official project sources, reliable publication references, rights-safe media candidates, project metadata, structural/material/tectonic hypotheses and possible model-generation inputs.`,
    media: mediaTypes.map((type) => ({
      type,
      label: `${labelForMedia(type)} placeholder`,
      placeholder: `${labelForMedia(type)} media slot planned for ${title}.`,
      credit: 'needs_permission'
    })),
    source_quality: 'research_seed',
    source_documents: ['Generated research job / sources pending'],
    source_candidates: [],
    asset_candidates: [],
    database_tags: ['source:needs-research', 'rights:needs-review', 'analysis:needs-review'],
    database_profile: {
      status: 'draft',
      r2_prefix: `entries/${slug}`,
      source_count: 0,
      media_count: 4,
      model_count: 0,
      analysis_count: 0,
      tag_count: 3
    }
  };
}

function sourceChecklist(entry, { mode }) {
  return `# ${entry.title} / research intake

Mode: ${mode}
Rights default: needs_permission / private_research until reviewed

## Seed
- Title: ${entry.title}
- Authors: ${entry.authors.join(', ')}
- Place: ${[entry.city, entry.country].filter(Boolean).join(', ')}
- Year: ${entry.year_start}

## Source candidates
${(entry.source_candidates ?? []).map((source) => `- ${source.title}${source.url ? `: ${source.url}` : ''} (${source.reliability_level}, ${source.rights_status})`).join('\n') || '- Add official office page, archive page, publication page and image/source pages.'}

## What AI/research should verify
- Exact project title, date range, location and office credits
- Public/private rights status for every image, plan and drawing
- Structure: load-bearing system, cores, spans, old/new junctions
- Materials: concrete, wood, plaster, glass, stone, roof/landscape layers
- Tectonics: facade rhythm, section logic, construction hierarchy
- Model inputs: only own/licensed/public-domain/publicly permitted assets for public model release

## Next commands
npm run archive:draft -- --input data/drafts/${entry.slug}.json --output out/${entry.slug}-draft-preview.json
npm run archive:autopilot -- --input archive-inbox/${entry.slug} --title "${entry.title}" --copyright private_research
`;
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function splitList(value, fallback = []) {
  const values = value.split(',').map((item) => item.trim()).filter(Boolean);
  return values.length > 0 ? values : fallback;
}

function labelForMedia(type) {
  return {
    exterior: 'Exterior',
    interior: 'Interior',
    section: 'Section',
    plan: 'Plan'
  }[type];
}

function slugify(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-entry';
}

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
