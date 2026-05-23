#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mediaTypes = ['exterior', 'interior', 'section', 'plan'];
const defaultEntryType = 'building';
const defaultStyleSector = 'modern_architecture';

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const bookSlug = readArg('--book') ?? readArg('--slug');
  const inputRoot = resolve(rootDir, readArg('--input') ?? (bookSlug ? `out/book-ingestion/${bookSlug}` : 'out/book-ingestion/untitled-book'));
  const outputRoot = resolve(rootDir, readArg('--output') ?? join(relativeOutBookRoot(inputRoot), 'entry-drafts'));
  const defaultYear = Number.parseInt(readArg('--default-year') ?? '0', 10);

  const projects = await readJson(resolve(inputRoot, 'detected-projects.json'));
  const sourceMap = await readJson(resolve(inputRoot, 'source-map.json'));
  const manifest = await readJson(resolve(inputRoot, 'book-manifest.json'));

  if (!Array.isArray(projects)) throw new Error('detected-projects.json must be an array.');
  if (!Number.isFinite(defaultYear)) throw new Error('--default-year must be a finite number when provided.');

  await mkdir(outputRoot, { recursive: true });

  const drafts = projects.map((project) => buildDraft({ project, sourceMap, manifest, defaultYear }));
  const written = [];
  for (const draft of drafts) {
    const path = resolve(outputRoot, `${draft.slug}.json`);
    await writeFile(path, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
    written.push(path);
  }

  const index = {
    generated_at: new Date().toISOString(),
    mode: 'book_detected_project_entry_drafts',
    writes_public_database: false,
    uploads_assets: false,
    approval_required_before_apply: true,
    source_review_pack: relativeToRoot(inputRoot),
    draft_count: drafts.length,
    drafts: drafts.map((draft, index) => ({
      id: draft.id,
      slug: draft.slug,
      title: draft.title,
      path: relativeToRoot(written[index]),
      public_use_allowed: false,
      review_status: 'needs_human_review'
    })),
    next_steps: [
      'Review title, architect, year, location and source evidence.',
      'Run npm run archive:draft on a selected draft before manual promotion.',
      'Keep book scans, OCR and page images private unless rights are cleared.',
      'Promote only public-safe metadata and paraphrased architectural analysis.'
    ]
  };

  await writeFile(resolve(outputRoot, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'review.md'), renderReview({ manifest, drafts, index }), 'utf8');

  console.log('KosmoData book entry draft generation');
  console.log(`Review pack: ${relativeToRoot(inputRoot)}`);
  console.log(`Drafts: ${drafts.length}`);
  console.log(`Output: ${relativeToRoot(outputRoot)}`);
  console.log('Mode: LOCAL REVIEW ONLY. No public database write, D1 write, R2 upload or source promotion was performed.');
}

function buildDraft({ project, sourceMap, manifest, defaultYear }) {
  const slug = project.slug || slugify(project.title);
  const year = Number.isFinite(project.year) && project.year !== null ? project.year : defaultYear;
  const authors = Array.isArray(project.architects) && project.architects.length ? project.architects : ['Needs review'];
  const pageRefs = Array.isArray(project.page_refs) ? project.page_refs : [];
  const evidence = Array.isArray(project.evidence) ? project.evidence : [];
  const sourceTitle = manifest.title ?? sourceMap.book_title ?? 'Private book source';
  const r2Prefix = `entries/${slug}`;
  const confidence = Number.isFinite(project.source_confidence) ? project.source_confidence : 0;

  return {
    id: slug,
    slug,
    title: project.title,
    entry_type: defaultEntryType,
    year_start: year,
    year_end: null,
    authors,
    city: project.place ?? '',
    country: '',
    style_sector: defaultStyleSector,
    lecture_cluster: ['book_private_intake'],
    themes: ['book-draft', 'needs-review', 'private-library'],
    short_description: `${project.title} wurde aus einem privaten Buch- oder Scanpaket als Projektkandidat erkannt.`,
    one_sentence: `${project.title} ist ein aus privatem Buchmaterial abgeleiteter KosmoData-Entwurf und muss vor jeder öffentlichen Verwendung quellen- und rechtegeprüft werden.`,
    full_description: [
      `${project.title} stammt aus dem lokalen Book-Ingest-Workflow von KosmoData.`,
      `Die aktuelle Fassung ist ein privater Review-Entwurf aus ${sourceTitle}.`,
      'Buchseiten, OCR-Texte, Pläne und fotografierte Abbildungen bleiben private Quellen; öffentlich nutzbar sind erst geprüfte Metadaten, Quellenverweise und paraphrasierte Analyse.'
    ].join(' '),
    source_quality: confidence >= 0.75 ? 'book_detected_review' : 'book_detected_low_confidence',
    source_documents: [
      sourceTitle,
      pageRefs.length ? `page_refs:${pageRefs.join(',')}` : 'page_refs:needs_mapping'
    ],
    source_url: '',
    media: mediaTypes.map((type) => ({
      type,
      label: `${mediaLabel(type)} placeholder`,
      placeholder: `${mediaLabel(type)} bleibt Platzhalter, bis public-safe Medien oder eigene Aufnahmen vorhanden sind.`,
      credit: 'private_book_source_blocked',
      r2_key: `${r2Prefix}/media/${type}-01.placeholder.json`,
      copyright_status: 'private_research'
    })),
    source_candidates: [
      {
        source_type: 'private_book',
        title: sourceTitle,
        local_path: sourceMap.input_root ?? manifest.input_root ?? '',
        reliability_level: confidence >= 0.75 ? 'detected_needs_review' : 'low_confidence_needs_review',
        rights_status: manifest.rights_default ?? project.rights_status ?? 'private_research',
        notes: `Detected from private book ingestion. Evidence: ${evidence.join('; ') || 'needs manual evidence review'}`
      }
    ],
    asset_candidates: [],
    model_packages: [
      {
        package_type: 'book_derived_reference_model',
        status: 'planned_private_review',
        planned_paths: [`entries/${slug}/models/low.glb`, `entries/${slug}/models/structure.glb`],
        notes: 'Only build a model after source geometry and rights boundaries are reviewed.'
      }
    ],
    analysis_layers: [
      {
        analysis_type: 'source_review',
        summary: 'Book-derived project candidate requires manual source, rights and metadata verification.',
        r2_key: `${r2Prefix}/analysis/source-review.json`,
        review_status: 'draft'
      }
    ],
    analysis_observations: [
      { analysis_type: 'source_confidence', label: `confidence:${Math.round(confidence * 100)}`, source: 'book_ingest', confidence_score: confidence },
      { analysis_type: 'rights', label: 'rights:private-book-source', source: 'book_ingest', confidence_score: 1 },
      { analysis_type: 'page_refs', label: pageRefs.length ? `pages:${pageRefs.join(',')}` : 'pages:needs-mapping', source: 'book_ingest', confidence_score: pageRefs.length ? 0.7 : 0.1 }
    ],
    ingestion_status: {
      stage: 'book_detected_needs_review',
      source_status: 'private_book_candidate',
      asset_status: 'rights_blocked',
      model_status: 'planned',
      updated_at: new Date().toISOString()
    },
    database_tags: [
      'source:private-book',
      'workflow:book-ingest',
      'rights:private-research',
      'public-display:metadata-only',
      'status:needs-human-review',
      year === 0 ? 'year:needs-review' : `year:${year}`,
      `confidence:${Math.round(confidence * 100)}`
    ],
    database_profile: {
      status: 'draft',
      r2_prefix: r2Prefix,
      source_count: 1,
      media_count: 4,
      model_count: 1,
      analysis_count: 1,
      tag_count: 7
    },
    book_ingestion: {
      book_slug: manifest.book_slug,
      source_review_pack: `out/book-ingestion/${manifest.book_slug}`,
      project_id: project.id,
      page_refs: pageRefs,
      evidence,
      public_display: project.public_display ?? 'metadata_only',
      rights_status: project.rights_status ?? manifest.rights_default ?? 'private_research'
    }
  };
}

function renderReview({ manifest, drafts, index }) {
  const lines = [
    `# Book Entry Drafts / ${manifest.title}`,
    '',
    `Generated: ${index.generated_at}`,
    `Mode: \`${index.mode}\``,
    `Writes public database: \`${index.writes_public_database}\``,
    `Uploads assets: \`${index.uploads_assets}\``,
    '',
    '## Drafts',
    ''
  ];

  for (const draft of drafts) {
    lines.push(`### ${draft.title}`);
    lines.push('');
    lines.push(`- Slug: \`${draft.slug}\``);
    lines.push(`- Year: ${draft.year_start === 0 ? 'needs review' : draft.year_start}`);
    lines.push(`- Source quality: \`${draft.source_quality}\``);
    lines.push(`- Rights: \`private_research\``);
    lines.push(`- Public display: \`metadata_only\``);
    lines.push('');
  }

  lines.push('## Next Steps', '');
  index.next_steps.forEach((step) => lines.push(`- ${step}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function mediaLabel(type) {
  return {
    exterior: 'Aussenbild',
    interior: 'Innenbild',
    section: 'Schnitt',
    plan: 'Grundriss'
  }[type] ?? type;
}

function relativeOutBookRoot(inputRoot) {
  const relative = relativeToRoot(inputRoot);
  if (relative.startsWith('out/book-ingestion/')) return relative;
  return 'out/book-ingestion/untitled-book';
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
