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
    'mfo-park': 'MFO-Park: Landschaft als begehbares Stahlgerüst',
    'high-line': 'High Line: Infrastruktur wird öffentlicher Stadtraum',
    'gobekli-tepe': 'Göbekli Tepe: Monumentalität vor der Stadt',
    'afasia-no-architecture-flower-house': 'Flower House: Wohnen als radialer Landschaftsraum',
    'villa-noailles': 'Villa Noailles: Moderne als Bewegung durch Haus, Garten und Blick',
    'haus-tugendhat': 'Haus Tugendhat: Freier Wohnraum als Material- und Blickapparat',
    'catal-huyuk': 'Catal Hüyük: Wohnen, Dachlandschaft und frühe städtische Dichte',
    'uruk-city': 'Uruk: Tempelbezirke, Verwaltung und frühe Stadtordnung',
    'mohenjo-daro': 'Mohenjo-Daro: Wasser, Raster und Indus-Stadt',
    'forum-romanum': 'Forum Romanum: Öffentlicher Raum als politisches Palimpsest'
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
  const specificSpatialReadings = {
    'catal-huyuk': 'Çatal Hüyük wird als dichtes Haus-an-Haus-Gefüge gelesen, in dem Wand, Dach, Innenraum und Erschließung zu einer frühen urbanen Wohnlandschaft verschmelzen',
    'uruk-city': 'Uruk ordnet frühe Stadt über Tempelbezirke, Plattformen, Mauern und Verwaltungsräume; Monument, Schrift und Arbeitsteilung werden zu einer architektonischen Stadtstruktur',
    'mohenjo-daro': 'Mohenjo-Daro verbindet Rasterstraßen, erhöhte Plattformen, Drainagen und Wasserbauten zu einer Stadt, deren Ordnung aus Hygiene, Standardisierung und kollektiver Infrastruktur entsteht',
    'forum-romanum': 'Das Forum Romanum ist kein einzelner Platz, sondern ein über Jahrhunderte geschichtetes Band aus Tempeln, Basiliken, Triumphwegen, Kurie und öffentlicher Leere',
    'haus-tugendhat': 'Die räumliche Ordnung entsteht aus Zonen statt aus geschlossenen Zimmern: Wohnen, Essen, Musik und Blickfelder fließen um Materialwände, Vorhänge und Möblierungsfelder herum'
  };
  if (specificSpatialReadings[entry.slug]) {
    return {
      short: compact(specificSpatialReadings[entry.slug], 92),
      long: specificSpatialReadings[entry.slug],
      basis: 'curated spatial reading'
    };
  }

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
  return String(value ?? '').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
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
    private_residence: 'privates Wohnhaus',
    'private residence': 'privates Wohnhaus',
    neolithic_aggregated_domestic_fabric: 'neolithisches Wohngefüge',
    'neolithic aggregated domestic fabric': 'neolithisches Wohngefüge',
    administrative_ritual_city: 'administrativ-rituelle Stadt',
    'administrative ritual city': 'administrativ-rituelle Stadt',
    indus_grid_city: 'Indus-Rasterstadt',
    'indus grid city': 'Indus-Rasterstadt',
    roman_civic_forum: 'römisches Forum',
    'roman civic forum': 'römisches Forum',
    early_urbanism: 'frühe Urbanisierung',
    'early urbanism': 'frühe Urbanisierung',
    public_space: 'öffentlicher Raum',
    'public space': 'öffentlicher Raum',
    linear_park: 'linearer Park',
    'linear park': 'linearer Park',
    prehistoric_megalithic_enclosure: 'prähistorische Megalithanlage',
    'prehistoric megalithic enclosure': 'prähistorische Megalithanlage',
    urban_park: 'urbaner Park',
    'urban park': 'urbaner Park',
    elderly_care_monastery_conversion: 'Pflege- und Klosterumbau',
    'elderly care monastery conversion': 'Pflege- und Klosterumbau',
    suburban_villa_landscape: 'suburbane Villenlandschaft',
    'suburban villa landscape': 'suburbane Villenlandschaft',
    flat_suburban_site: 'flacher suburbaner Standort',
    'flat suburban site': 'flacher suburbaner Standort',
    village_center: 'Dorfzentrum',
    'village center': 'Dorfzentrum',
    hilltop: 'Hügel- oder Plateaulage',
    hillside: 'Hanglage',
    monastery_context: 'Klosterkontext',
    'monastery context': 'Klosterkontext',
    existing_fabric: 'bestehender Baubestand',
    'existing fabric': 'bestehender Baubestand',
    unesco_world_heritage_component: 'UNESCO-Welterbe-Komponente',
    'unesco world heritage component': 'UNESCO-Welterbe-Komponente',
    listed_monument: 'denkmalgeschütztes Objekt',
    'listed monument': 'denkmalgeschütztes Objekt',
    rural_dispersed: 'disperser Landschaftskontext',
    'rural dispersed': 'disperser Landschaftskontext',
    rural_archaeological_landscape: 'archäologische Landschaft',
    'rural archaeological landscape': 'archäologische Landschaft',
    urban_dense: 'dichter Stadtraum',
    'urban dense': 'dichter Stadtraum',
    elevated_infrastructure: 'aufgeständerte Infrastruktur',
    'elevated infrastructure': 'aufgeständerte Infrastruktur',
    urban_redevelopment: 'städtisches Transformationsgebiet',
    'urban redevelopment': 'städtisches Transformationsgebiet',
    flat_urban_site: 'flacher städtischer Standort',
    'flat urban site': 'flacher städtischer Standort',
    industrial_reuse: 'industrielles Weiterverwenden',
    'industrial reuse': 'industrielles Weiterverwenden',
    rail_infrastructure: 'Bahninfrastruktur',
    'rail infrastructure': 'Bahninfrastruktur',
    unesco_world_heritage_site: 'UNESCO-Welterbestätte',
    'unesco world heritage site': 'UNESCO-Welterbestätte',
    archaeological_site: 'archäologische Stätte',
    'archaeological site': 'archäologische Stätte',
    archaeological_tell_landscape: 'archäologische Tell-Landschaft',
    'archaeological tell landscape': 'archäologische Tell-Landschaft',
    archaeological_city_landscape: 'archäologische Stadtlandschaft',
    'archaeological city landscape': 'archäologische Stadtlandschaft',
    flat_alluvial_plain: 'flache Schwemmlandebene',
    'flat alluvial plain': 'flache Schwemmlandebene',
    alluvial_plain: 'Schwemmlandebene',
    'alluvial plain': 'Schwemmlandebene',
    river_plain: 'Flussebene',
    'river plain': 'Flussebene',
    urban_archaeological_core: 'urbaner archäologischer Kern',
    'urban archaeological core': 'urbaner archäologischer Kern',
    valley_between_hills: 'Talraum zwischen Hügeln',
    'valley between hills': 'Talraum zwischen Hügeln',
    neolithic_settlement: 'neolithische Siedlung',
    'neolithic settlement': 'neolithische Siedlung',
    sumerian_city: 'sumerische Stadt',
    'sumerian city': 'sumerische Stadt',
    early_writing: 'frühe Schriftkultur',
    'early writing': 'frühe Schriftkultur',
    temple_precinct: 'Tempelbezirk',
    'temple precinct': 'Tempelbezirk',
    indus_valley_city: 'Indus-Stadt',
    'indus valley city': 'Indus-Stadt',
    roman_forum: 'römisches Forum',
    'roman forum': 'römisches Forum',
    civic_space: 'zivischer Raum',
    'civic space': 'zivischer Raum',
    palimpsest: 'Palimpsest',
    proto_urban: 'proto-urban',
    'proto urban': 'proto-urban',
    settlement: 'Siedlung',
    collective_memory: 'kollektives Gedächtnis',
    'collective memory': 'kollektives Gedächtnis',
    mesopotamia: 'Mesopotamien',
    city: 'Stadt',
    administration: 'Verwaltung',
    hydraulic_city: 'Wasserstadt',
    'hydraulic city': 'Wasserstadt',
    grid: 'Raster',
    urban_design: 'Städtebau',
    'urban design': 'Städtebau',
    roman_urbanism: 'römischer Urbanismus',
    'roman urbanism': 'römischer Urbanismus',
    forum: 'Forum',
    politics: 'Politik',
    thing_modernity: 'moderne Objektkultur',
    'thing modernity': 'moderne Objektkultur',
    curtain: 'Vorhang',
    material_wall: 'Materialwand',
    'material wall': 'Materialwand',
    modern_living: 'modernes Wohnen',
    'modern living': 'modernes Wohnen',
    steel_frame: 'Stahlskelett',
    'steel frame': 'Stahlskelett',
    fluid_space: 'fließender Raum',
    'fluid space': 'fließender Raum',
    domestic_modernism: 'Wohnmoderne',
    'domestic modernism': 'Wohnmoderne',
    mud_brick: 'Lehmziegel',
    'mud brick': 'Lehmziegel',
    baked_brick: 'gebrannter Ziegel',
    'baked brick': 'gebrannter Ziegel',
    travertine: 'Travertin',
    tufa: 'Tuffstein',
    brick: 'Ziegel',
    roman_concrete: 'römischer Beton',
    'roman concrete': 'römischer Beton',
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
    ['The tectonic reading focuses on the contrast between abstract white surfaces, thin horizontal glazing, exposed pilotis and the inhabited roof landscape', 'Die tektonische Lesart fokussiert den Kontrast zwischen abstrakten weißen Flächen, horizontalen Fensterbändern, freigestellten Pilotis und der bewohnten Dachlandschaft'],
    ['The spatial order is radial and centripetal: six interlocking pavilions form petal-like rooms around a central open courtyard, distributing public and private zones through degrees of openness', 'Die räumliche Ordnung ist radial und zentripetal: sechs ineinandergreifende Pavillons bilden blütenartige Räume um einen offenen Hof und staffeln öffentliche sowie private Bereiche über unterschiedliche Grade der Offenheit'],
    ['The project is organized as sequence rather than object: entries, overlooks, narrowed passages, widened rooms and planting bands create urban episodes along a continuous elevated path', 'Das Projekt ist als Sequenz und nicht als Einzelobjekt organisiert: Zugänge, Aussichtspunkte, Engstellen, Aufweitungen und Pflanzbänder erzeugen urbane Episoden entlang eines durchgehenden erhöhten Weges'],
    ['The site is organized as repeated enclosures with central and perimeter pillars. The architectural question is not plan as habitation but plan as ritual concentration and symbolic ordering', 'Die Anlage ist als Folge von Einhegungen mit zentralen und randständigen Pfeilern organisiert. Die architektonische Frage ist nicht Wohnen, sondern rituelle Konzentration und symbolische Ordnung'],
    ['Instead of a conventional park field, MFO-Park uses a volumetric trellis as a room. It has interior-like spatial depth, vertical surfaces, balconies/perches and a civic ground plane', 'Statt einer konventionellen Parkfläche nutzt der MFO-Park ein volumetrisches Rankgerüst als Raum. Es besitzt innenraumartige Tiefe, vertikale Oberflächen, Balkone, Aufenthaltsnischen und eine öffentliche Bodenebene'],
    ['Spatial order is episodic and kinetic: the villa is experienced through rooms, terraces, stairs, views and garden fragments rather than one continuous freier Grundriss', 'Die räumliche Ordnung ist episodisch und kinetisch: Die Villa wird über Räume, Terrassen, Treppen, Blicke und Gartenfragmente erfahren, nicht als durchgehender freier Grundriss'],
    ['Spatial order is episodic and kinetic: the villa is experienced through rooms, terraces, stairs, views and garden fragments rather than one continuous free plan', 'Die räumliche Ordnung ist episodisch und kinetisch: Die Villa wird über Räume, Terrassen, Treppen, Blicke und Gartenfragmente erfahren, nicht als durchgehender freier Grundriss'],
    ['Spatial order is defined by zones rather than closed rooms: living, dining, music and view fields flow around material partitions and curtains', 'Die räumliche Ordnung entsteht aus Zonen statt aus geschlossenen Zimmern: Wohnen, Essen, Musik und Blickfelder fließen um Materialwände, Vorhänge und Möblierungsfelder herum'],
    ['Dense Neolithic room clusters used mud brick, timber roof structure and plastered interiors; access and circulation are interpreted through rooftops and room openings', 'Dichte neolithische Raumcluster aus Lehmziegeln, Holzdächern und verputzten Innenräumen bilden ein Wohngefüge, dessen Erschließung über Dachflächen und Raumöffnungen gelesen wird'],
    ['Uruk is a mud-brick urban fabric with monumental precincts such as Eanna and Anu/White Temple; geometry should be treated as archaeological reconstruction, not exact survey', 'Uruk wird als Lehmziegel-Stadtgefüge mit monumentalen Bezirken wie Eanna und Anu/Weißem Tempel gelesen; seine Geometrie bleibt archäologische Rekonstruktion und kein exaktes Aufmaß'],
    ['The Indus city is characterized by standardized baked brick, gridded streets, platforms, drains and carefully organized water infrastructure', 'Die Indus-Stadt ist durch standardisierte gebrannte Ziegel, gerasterte Straßen, Plattformen, Drainagen und präzise organisierte Wasserinfrastruktur geprägt'],
    ['The Forum Romanum accumulates stone, brick and concrete monuments around a civic valley; it should be modeled as a layered public field rather than one building', 'Das Forum Romanum versammelt Stein-, Ziegel- und Betonmonumente um einen zivilen Talraum; es soll als geschichtetes öffentliches Feld und nicht als Einzelbau modelliert werden']
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
    .replaceAll('white rendered surfaces', 'weiße Putzflächen')
    .replaceAll('Primary material reading:', 'Primäre Materiallesart:')
    .replaceAll('Structure layer planned for Blender import:', 'Tragwerkslayer für Blender-Import geplant:')
    .replaceAll('Geometry remains reconstruction-grade until source plans are reviewed', 'Die Geometrie bleibt als Studienrekonstruktion markiert, bis Quellenpläne geprüft sind')
    .replaceAll('mud_brick', 'Lehmziegel')
    .replaceAll('baked_brick', 'gebrannter Ziegel')
    .replaceAll('roman_concrete', 'römischer Beton')
    .replaceAll('travertine', 'Travertin')
    .replaceAll('tufa', 'Tuffstein')
    .replaceAll('brick', 'Ziegel')
    .replaceAll('plaster', 'Putz')
    .replaceAll('timber', 'Holz')
    .replaceAll('cellular mass', 'zelluläre Masse')
    .replaceAll('platform', 'Plattform')
    .replaceAll('monumental ensemble', 'monumentales Ensemble')
    .replaceAll('Onyx, glass, steel, textile and Holz are not decoration only; they act as atmospheric and spatial instruments within the freier Grundriss', 'Onyx, Glas, Stahl, Textil und Holz sind nicht nur Ausstattung, sondern atmosphärische und räumliche Instrumente innerhalb des freien Grundrisses')
    .replaceAll('Onyx, glass, steel, textile and timber are not decoration only; they act as atmospheric and spatial instruments within the freier Grundriss', 'Onyx, Glas, Stahl, Textil und Holz sind nicht nur Ausstattung, sondern atmosphärische und räumliche Instrumente innerhalb des freien Grundrisses')
    .replaceAll('The structural reading foregrounds a steel-frame order that frees the living level from conventional room-bearing walls and allows material screens to organize space', 'Die strukturelle Lesart stellt ein Stahlskelett in den Vordergrund, das das Wohngeschoss von tragenden Zimmerwänden löst und Materialschirme als raumbildende Elemente ermöglicht');
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
