#!/usr/bin/env node

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
  if (!slug) throw new Error('Usage: npm run cosmos:text-generate -- --entry villa-savoye');

  const entry = await loadEntry(slug);
  if (!entry) throw new Error(`No entry found for "${slug}".`);

  const reviewRoot = path.join(root, 'out/text-review', entry.slug);
  const intakeTexts = path.join(root, 'archive-intake', entry.slug, 'texts');
  const automationDir = path.join(root, 'archive-intake', entry.slug, 'automation');
  await Promise.all([reviewRoot, intakeTexts, automationDir].map((directory) => mkdir(directory, { recursive: true })));

  const textPack = buildTextPack(entry);
  const markdown = renderMarkdown(textPack);
  const toolRun = {
    tool_id: 'text_generate',
    entry_id: entry.id,
    slug: entry.slug,
    generated_at: textPack.generated_at,
    status: 'draft_review_generated',
    writes_public_database: false,
    uploads_assets: false,
    public_use_allowed: false,
    outputs: {
      review_json: `out/text-review/${entry.slug}/architecture-text.json`,
      review_md: `out/text-review/${entry.slug}/architecture-text.md`,
      intake_json: `archive-intake/${entry.slug}/texts/architecture-text.json`
    },
    next_review: [
      'Check every factual claim against attached sources or ETH notes.',
      'Replace generic or weak source notes before promoting into mock-entries.',
      'Keep private lecture/book-derived notes as paraphrased public-safe prose only.'
    ]
  };

  await writeJson(path.join(reviewRoot, 'architecture-text.json'), textPack);
  await writeFile(path.join(reviewRoot, 'architecture-text.md'), markdown, 'utf8');
  await writeJson(path.join(intakeTexts, 'architecture-text.json'), textPack);
  await writeJson(path.join(automationDir, 'text-tool-run.json'), toolRun);

  console.log('Architecture Cosmos architecture text generator');
  console.log(`Entry: ${entry.title} (${entry.slug})`);
  console.log(`Chapters: ${textPack.chapters.length}`);
  console.log('Wrote:');
  console.log(`- out/text-review/${entry.slug}/architecture-text.json`);
  console.log(`- out/text-review/${entry.slug}/architecture-text.md`);
  console.log(`- archive-intake/${entry.slug}/texts/architecture-text.json`);
  console.log(`- archive-intake/${entry.slug}/automation/text-tool-run.json`);
  console.log('');
  console.log('No entry data was overwritten. Text remains a review draft.');
}

async function loadEntry(slug) {
  const entries = JSON.parse(await readFile(path.join(root, 'data/mock-entries.json'), 'utf8'));
  return entries.find((entry) => entry.slug === slug || entry.id === slug);
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

function buildTextPack(entry) {
  const sources = sourceTrail(entry);
  const analysis = analysisByType(entry);
  const materials = materialList(entry);
  const program = readable(entry.program?.subtype || entry.program?.type || entry.entry_type);
  const context = contextPhrase(entry);
  const structuralClaim = analysis.structure || materialStructureFallback(entry, materials);
  const tectonicClaim = analysis.tectonics || tectonicFallback(entry, materials);
  const spatialClaim = analysis.spatial_order || spatialFallback(entry);
  const materialClaim = analysis.material_system || materialFallback(entry, materials);

  const headline = buildHeadline(entry, program);
  const overview = paragraph([
    `${entry.title} is treated in Architecture Cosmos as ${article(program)} ${program} rather than as an isolated database object.`,
    `Its relevance lies in the relation between ${spatialClaim.short}, ${structuralClaim.short} and ${context}.`,
    `The entry should therefore be read through project logic, material system and model layers, not through a flat historical summary.`
  ]);

  const chapters = [
    chapter('Architectural Reading', paragraph([
      `${entry.title} gains its architectural force from ${spatialClaim.long}.`,
      `The project is useful for the atlas because it turns dry metadata into a spatial problem: ${mainThemes(entry)}.`
    ]), spatialClaim.basis),
    chapter('Material / Structure', paragraph([
      `${materialClaim.long}.`,
      `${structuralClaim.long}.`,
      `For later Blender and ArchiCAD work, these observations should become separable layers instead of a single decorative model.`
    ]), materialClaim.basis),
    chapter('Spatial Order', paragraph([
      `${spatialClaim.long}.`,
      `This makes the project valuable as a filterable precedent: plan, section, circulation and context can be compared across time instead of only browsed as images.`
    ]), spatialClaim.basis),
    chapter('Tectonics', paragraph([
      `${tectonicClaim.long}.`,
      `The Cosmos text should keep this constructional reading explicit, because it is the bridge between historical interpretation and model-based analysis.`
    ]), tectonicClaim.basis),
    chapter('Context', paragraph([
      `${entry.title} belongs to ${context}.`,
      `Its setting is not background information; it is part of the architectural argument and should remain visible in the atlas, model package and future search filters.`
    ]), contextBasis(entry)),
    chapter('Database / Model Value', paragraph([
      `For the Architecture Cosmos database, ${entry.title} should be stored as a structured reference with source trail, media slots, analysis layers and model parts.`,
      `The most important future filters are ${databaseValue(entry)}.`,
      `Public output must remain rights-safe; private research notes can carry more detailed source-derived analysis until reviewed.`
    ]), 'derived from entry metadata, model fields and Brain quality rules')
  ];

  return {
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    generated_at: new Date().toISOString(),
    generator: 'cosmos-generate-architecture-text',
    status: 'draft_review',
    public_use_allowed: false,
    review_status: 'needs_owner_review',
    source_basis: sources,
    claims_policy: {
      verified: 'only claims backed by entry fields or reviewed source notes should be promoted',
      private_notes: 'lecture/book-derived notes must remain paraphrased and rights-safe before public display',
      no_filler: true
    },
    suggested_entry_fields: {
      headline,
      overview,
      one_sentence: conciseSentence(entry, spatialClaim, structuralClaim),
      full_description: chapters.map((item) => `${item.title}: ${item.text}`).join('\n\n')
    },
    headline,
    overview,
    chapters
  };
}

function analysisByType(entry) {
  const result = {};
  for (const layer of entry.analysis_layers ?? []) {
    result[layer.analysis_type] = {
      short: compact(layer.summary, 92),
      long: cleanSentence(layer.summary),
      basis: `analysis layer: ${layer.analysis_type}; review status: ${layer.review_status}`
    };
  }
  return result;
}

function buildHeadline(entry, program) {
  const specificHeadlines = {
    'villa-savoye': 'Villa Savoye: Der freie Grundriss als bewohnbares Manifest',
    'alterszentrum-kloster-ingenbohl': 'Alterszentrum Kloster Ingenbohl: Weiterbauen zwischen Kloster, Pflege und Landschaft',
    'mfo-park': 'MFO-Park: Landschaft als begehbares Stahlgeruest',
    'high-line': 'High Line: Infrastruktur wird oeffentlicher Stadtraum',
    'gobekli-tepe': 'Goebekli Tepe: Monumentalitaet vor der Stadt'
  };

  if (specificHeadlines[entry.slug]) return specificHeadlines[entry.slug];

  const themes = (entry.themes ?? []).map(readable);
  const materials = materialList(entry).map(readable);
  const context = entry.context?.setting ? readable(entry.context.setting) : entry.city || entry.country;
  const firstAnchor = themes[0] || materials[0] || program;
  const secondAnchor = context || themes[1] || materials[1] || 'Raumordnung';
  return `${entry.title}: ${titleCase(firstAnchor)} zwischen ${readable(secondAnchor)}`;
}

function conciseSentence(entry, spatialClaim, structuralClaim) {
  return `${entry.title} is a ${readable(entry.entry_type)} defined by ${spatialClaim.short} and ${structuralClaim.short}.`;
}

function materialStructureFallback(entry, materials) {
  const materialText = materials.length ? materials.map(readable).slice(0, 3).join(', ') : 'a source-dependent material system';
  return {
    short: `${materialText} as construction logic`,
    long: `The current archive data points to ${materialText} as the constructional basis, but the exact structural hierarchy still needs source review`,
    basis: 'entry materials fallback'
  };
}

function tectonicFallback(entry, materials) {
  const materialText = materials.length ? materials.map(readable).slice(0, 3).join(', ') : 'surface, structure and assembly';
  return {
    short: `${materialText} as tectonic relationship`,
    long: `The tectonic reading should focus on how ${materialText} organize support, enclosure, joint and atmosphere`,
    basis: 'entry materials and analysis fallback'
  };
}

function spatialFallback(entry) {
  const hints = [...(entry.themes ?? []), ...(entry.vibes ?? [])].slice(0, 4).map(readable);
  const text = hints.length ? hints.join(', ') : readable(entry.entry_type);
  return {
    short: `${text} as spatial order`,
    long: `The spatial order is currently best described through ${text}, with plan and section requiring further source-backed refinement`,
    basis: 'themes/vibes fallback'
  };
}

function materialFallback(entry, materials) {
  const materialText = materials.length ? materials.map(readable).slice(0, 4).join(', ') : 'materials still requiring review';
  return {
    short: materialText,
    long: `The material system is recorded as ${materialText}`,
    basis: 'entry materials fallback'
  };
}

function contextPhrase(entry) {
  const parts = [
    entry.context?.setting && readable(entry.context.setting),
    entry.context?.topography && readable(entry.context.topography),
    entry.city && entry.country ? `${entry.city}, ${entry.country}` : entry.city || entry.country,
    entry.context?.heritage_context?.slice(0, 2).map(readable).join(' and ')
  ].filter(Boolean);
  return parts.length ? parts.join(' within ') : 'a context that still needs source review';
}

function contextBasis(entry) {
  if (entry.context) return 'entry context metadata';
  if (entry.city || entry.country) return 'entry location metadata';
  return 'context needs source review';
}

function mainThemes(entry) {
  return (entry.themes ?? []).slice(0, 5).map(readable).join(', ') || readable(entry.entry_type);
}

function databaseValue(entry) {
  const tags = [
    ...(entry.database_tags ?? []),
    ...(entry.materials?.primary ?? []),
    ...(entry.themes ?? [])
  ];
  return [...new Set(tags)].slice(0, 8).map(readable).join(', ') || 'structure, material, context and typology';
}

function sourceTrail(entry) {
  return [
    entry.source_url && { type: 'source_url', value: entry.source_url },
    ...(entry.source_documents ?? []).map((value) => ({ type: 'source_document', value })),
    ...(entry.source_candidates ?? []).map((source) => ({
      type: source.source_type,
      title: source.title,
      value: source.url ?? source.local_path ?? source.notes,
      reliability_level: source.reliability_level,
      rights_status: source.rights_status
    }))
  ].filter(Boolean);
}

function materialList(entry) {
  return [...new Set([
    ...(entry.materials?.primary ?? []),
    ...(entry.materials?.secondary ?? []),
    ...(entry.materials?.stone_type ?? [])
  ])];
}

function chapter(title, text, source_basis) {
  return {
    title,
    text,
    source_basis,
    review_status: source_basis.includes('fallback') || source_basis.includes('needs') ? 'needs_source_review' : 'draft_review'
  };
}

function paragraph(sentences) {
  return sentences
    .map((sentence) => cleanSentence(sentence))
    .filter(Boolean)
    .join(' ');
}

function cleanSentence(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function compact(value, max) {
  const text = cleanSentence(value).replace(/[.!?]$/, '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function readable(value) {
  return String(value ?? '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function titleCase(value) {
  return readable(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function article(value) {
  return /^[aeiou]/i.test(value) ? 'an' : 'a';
}

function renderMarkdown(pack) {
  const lines = [
    `# ${pack.headline}`,
    '',
    `Entry: \`${pack.slug}\``,
    `Generated: ${pack.generated_at}`,
    `Status: \`${pack.status}\``,
    '',
    '## Overview',
    '',
    pack.overview,
    '',
    '## Chapters',
    ''
  ];
  pack.chapters.forEach((chapterItem) => {
    lines.push(`### ${chapterItem.title}`, '');
    lines.push(chapterItem.text, '');
    lines.push(`_Source basis: ${chapterItem.source_basis}; review: ${chapterItem.review_status}_`, '');
  });
  lines.push('## Suggested Entry Fields', '');
  lines.push(`- one_sentence: ${pack.suggested_entry_fields.one_sentence}`);
  lines.push('- full_description: chapter text above');
  lines.push('');
  lines.push('No live entry data was changed.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
