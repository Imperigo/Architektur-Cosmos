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
  const program = readableDe(entry.program?.subtype || entry.program?.type || entry.entry_type);
  const context = contextPhrase(entry);
  const structuralClaim = analysis.structure || materialStructureFallback(entry, materials);
  const tectonicClaim = analysis.tectonics || tectonicFallback(entry, materials);
  const spatialClaim = analysis.spatial_order || spatialFallback(entry);
  const materialClaim = analysis.material_system || materialFallback(entry, materials);

  const headline = buildHeadline(entry, program);
  const overview = paragraph([
    `${entry.title} wird im Architektur Kosmos als ${program} gelesen und nicht als isoliertes Archivobjekt behandelt.`,
    `Die Relevanz des Projekts liegt im Zusammenspiel von räumlicher Dramaturgie, konstruktiver Ordnung und ${context}.`,
    `Der Eintrag soll deshalb Projektlogik, Materialsystem, Tragwerk und Modell-Layer sichtbar machen, statt nur eine lineare Kurzgeschichte zu liefern.`
  ]);

  const chapters = [
    chapter('Architektonische Lesart', paragraph([
      `${entry.title} gewinnt seine architektonische Kraft aus folgender räumlicher Ordnung: ${spatialClaim.long}.`,
      `Für den Atlas ist das Projekt wertvoll, weil es trockene Metadaten in eine räumliche Fragestellung übersetzt: ${mainThemes(entry)}.`
    ]), spatialClaim.basis),
    chapter('Material und Tragwerk', paragraph([
      materialClaim.long,
      structuralClaim.long,
      `Für spätere Blender- und ArchiCAD-Workflows sollen diese Beobachtungen als trennbare Ebenen geführt werden, nicht als ein einziges dekoratives Modell.`
    ]), materialClaim.basis),
    chapter('Raumordnung', paragraph([
      spatialClaim.long,
      `Dadurch wird das Projekt als filterbare Referenz interessant: Grundriss, Schnitt, Erschliessung und Kontext können über Zeiträume hinweg verglichen werden, statt nur als Bilder betrachtet zu werden.`
    ]), spatialClaim.basis),
    chapter('Tektonik', paragraph([
      tectonicClaim.long,
      `Der Cosmos-Text hält diese konstruktive Lesart bewusst explizit, weil sie die Brücke zwischen historischer Interpretation und modellbasierter Analyse bildet.`
    ]), tectonicClaim.basis),
    chapter('Kontext', paragraph([
      `${entry.title} gehört zu ${context}.`,
      `Der Ort ist dabei keine Hintergrundinformation, sondern Teil des architektonischen Arguments und soll im Atlas, im Modellpaket und in zukünftigen Suchfiltern sichtbar bleiben.`
    ]), contextBasis(entry)),
    chapter('Datenbank- und Modellwert', paragraph([
      `Für die Architecture-Cosmos-Datenbank soll ${entry.title} als strukturierte Referenz mit Quellenpfad, Medienslots, Analyseebenen und Modellteilen gespeichert werden.`,
      `Die wichtigsten zukünftigen Filter sind ${databaseValue(entry)}.`,
      `Öffentliche Ausgaben müssen rechteklar bleiben; private Forschungsnotizen können detailliertere, quellenbasierte Analysen tragen, bis sie geprüft sind.`
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
    const summary = localizeArchitectureText(layer.summary);
    result[layer.analysis_type] = {
      short: compact(summary, 92),
      long: cleanSentence(summary),
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

  const themes = (entry.themes ?? []).map(readableDe);
  const materials = materialList(entry).map(readableDe);
  const context = entry.context?.setting ? readableDe(entry.context.setting) : entry.city || entry.country;
  const firstAnchor = themes[0] || materials[0] || program;
  const secondAnchor = context || themes[1] || materials[1] || 'Raumordnung';
  return `${entry.title}: ${titleCase(firstAnchor)} zwischen ${readableDe(secondAnchor)}`;
}

function conciseSentence(entry, spatialClaim, structuralClaim) {
  return `${entry.title} ist ein ${readableDe(entry.entry_type)}, das durch ${spatialClaim.short} und ${structuralClaim.short} geprägt wird.`;
}

function materialStructureFallback(entry, materials) {
  const materialText = materials.length ? materials.map(readable).slice(0, 3).join(', ') : 'a source-dependent material system';
  return {
    short: `${materialText} as construction logic`,
    long: `Die aktuellen Archivdaten weisen ${materialText} als konstruktive Grundlage aus; die genaue strukturelle Hierarchie braucht jedoch noch Quellenprüfung`,
    basis: 'entry materials fallback'
  };
}

function tectonicFallback(entry, materials) {
  const materialText = materials.length ? materials.map(readable).slice(0, 3).join(', ') : 'surface, structure and assembly';
  return {
    short: `${materialText} as tectonic relationship`,
    long: `Die tektonische Lesart soll zeigen, wie ${materialText} Stützung, Hülle, Fügung und Atmosphäre organisieren`,
    basis: 'entry materials and analysis fallback'
  };
}

function spatialFallback(entry) {
  const hints = [...(entry.themes ?? []), ...(entry.vibes ?? [])].slice(0, 4).map(readableDe);
  const text = hints.length ? hints.join(', ') : readable(entry.entry_type);
  return {
    short: `${text} as spatial order`,
    long: `Die räumliche Ordnung lässt sich aktuell über ${text} beschreiben; Grundriss und Schnitt brauchen aber weitere quellenbasierte Präzisierung`,
    basis: 'themes/vibes fallback'
  };
}

function materialFallback(entry, materials) {
  const materialText = materials.length ? materials.map(readable).slice(0, 4).join(', ') : 'materials still requiring review';
  return {
    short: materialText,
    long: `Das Materialsystem ist aktuell als ${materialText} erfasst`,
    basis: 'entry materials fallback'
  };
}

function contextPhrase(entry) {
  const parts = [
    entry.context?.setting && readableDe(entry.context.setting),
    entry.context?.topography && readableDe(entry.context.topography),
    entry.city && entry.country ? `${entry.city}, ${entry.country}` : entry.city || entry.country,
    entry.context?.heritage_context?.slice(0, 2).map(readableDe).join(' und ')
  ].filter(Boolean);
  return parts.length ? parts.join(' / ') : 'einem Kontext, der noch Quellenprüfung braucht';
}

function contextBasis(entry) {
  if (entry.context) return 'entry context metadata';
  if (entry.city || entry.country) return 'entry location metadata';
  return 'context needs source review';
}

function mainThemes(entry) {
  return (entry.themes ?? []).slice(0, 5).map(readableDe).join(', ') || readableDe(entry.entry_type);
}

function databaseValue(entry) {
  const tags = [
    ...(entry.database_tags ?? []),
    ...(entry.materials?.primary ?? []),
    ...(entry.themes ?? [])
  ];
  return [...new Set(tags)].slice(0, 8).map(readableDe).join(', ') || 'Tragwerk, Material, Kontext und Typologie';
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
  const text = String(value ?? '').replace(/\s+/g, ' ').replace(/\.\.+/g, '.').replace(/\.\s+\./g, '.').trim();
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

function readableDe(value) {
  const text = readable(value);
  const dictionary = {
    building: 'Gebäude',
    urban_plan: 'Stadtplan',
    landscape_project: 'Landschaftsprojekt',
    infrastructure: 'Infrastruktur',
    object: 'Objekt',
    event: 'Ereignis',
    theory: 'Theorie',
    map: 'Karte',
    text: 'Text',
    modern_villa: 'moderne Villa',
    'modern villa': 'moderne Villa',
    elderly_care_monastery_conversion: 'Pflege- und Klosterumbau',
    'elderly care monastery conversion': 'Pflege- und Klosterumbau',
    suburban_villa_landscape: 'suburbane Villenlandschaft',
    'suburban villa landscape': 'suburbane Villenlandschaft',
    flat_suburban_site: 'flacher suburbaner Standort',
    'flat suburban site': 'flacher suburbaner Standort',
    village_center: 'Dorfzentrum',
    'village center': 'Dorfzentrum',
    hilltop: 'Hang- und Klosterplateau',
    monastery_context: 'Klosterkontext',
    'monastery context': 'Klosterkontext',
    existing_fabric: 'bestehender Baubestand',
    'existing fabric': 'bestehender Baubestand',
    unesco_world_heritage_component: 'UNESCO-Welterbe-Komponente',
    'unesco world heritage component': 'UNESCO-Welterbe-Komponente',
    listed_monument: 'denkmalgeschütztes Objekt',
    'listed monument': 'denkmalgeschütztes Objekt',
    five_points: 'Fünf Punkte',
    'five points': 'Fünf Punkte',
    promenade: 'Promenade architecturale',
    pilotis: 'Pilotis',
    machine_age: 'Maschinenzeitalter',
    'machine age': 'Maschinenzeitalter',
    free_plan: 'freier Grundriss',
    'free plan': 'freier Grundriss',
    adaptive_reuse: 'Weiterbauen im Bestand',
    'adaptive reuse': 'Weiterbauen im Bestand',
    monastery: 'Kloster',
    care_architecture: 'Pflegearchitektur',
    'care architecture': 'Pflegearchitektur',
    concrete_structure: 'Betonstruktur',
    'concrete structure': 'Betonstruktur',
    lime_plaster: 'Kalkputz',
    'lime plaster': 'Kalkputz',
    reinforced_concrete: 'Stahlbeton',
    'reinforced concrete': 'Stahlbeton',
    white_plaster: 'weißer Putz',
    'white plaster': 'weißer Putz',
    glass: 'Glas',
    timber: 'Holz',
    concrete: 'Beton'
  };
  return dictionary[text] ?? text;
}

function localizeArchitectureText(value) {
  let text = cleanSentence(value).replace(/[.!?]$/, '');
  const replacements = [
    ['Spatial order is choreographed as a promenade: arrival below the raised volume, ascent by ramp, movement through living spaces and release onto the roof terrace', 'Die räumliche Ordnung ist als Promenade architecturale choreografiert: Ankunft unter dem angehobenen Volumen, Aufstieg über die Rampe, Bewegung durch die Wohnräume und Öffnung zur Dachterrasse'],
    ['The house is read as a reinforced-concrete frame that separates load-bearing order from facade and plan, making pilotis, slab and free enclosure the structural grammar of the project', 'Das Haus wird als Stahlbetonskelett gelesen, das Tragordnung, Fassade und Grundriss voneinander trennt; Pilotis, Deckenplatte und freie Hülle bilden die strukturelle Grammatik des Projekts'],
    ['The material reading foregrounds white rendered surfaces, reinforced concrete, glass bands and roof-garden ground as an abstract modern envelope', 'Die Materiallesart stellt weiße Putzflächen, Stahlbeton, Fensterbänder und den Dachgarten als abstrakte moderne Hülle in den Vordergrund'],
    ['The tectonic reading focuses on the contrast between abstract white surfaces, thin horizontal glazing, exposed pilotis and the inhabited roof landscape', 'Die tektonische Lesart fokussiert den Kontrast zwischen abstrakten weißen Flächen, horizontalen Fensterbändern, freigestellten Pilotis und der bewohnten Dachlandschaft']
  ];

  for (const [source, target] of replacements) {
    text = text.replaceAll(source, target);
  }

  return text
    .replaceAll('reinforced-concrete', 'Stahlbeton')
    .replaceAll('roof terrace', 'Dachterrasse')
    .replaceAll('roof-garden', 'Dachgarten')
    .replaceAll('roof garden', 'Dachgarten')
    .replaceAll('free plan', 'freier Grundriss')
    .replaceAll('pilotis', 'Pilotis')
    .replaceAll('glass bands', 'Fensterbänder')
    .replaceAll('white rendered surfaces', 'weiße Putzflächen');
}

function titleCase(value) {
  return readable(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
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
