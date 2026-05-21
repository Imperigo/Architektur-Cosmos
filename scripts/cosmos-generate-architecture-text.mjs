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
    `${entry.title} wird als ${program} verstanden; die Bedeutung des Projekts geht nicht in einem einzelnen Bild auf.`,
    `Architektonisch entscheidend ist das Zusammenspiel von Raumdramaturgie, konstruktiver Ordnung, Material und ${context}.`,
    `Der Text beschreibt deshalb, wie Grundriss, Schnitt, Körper, Ort und Gebrauch zusammen eine räumliche Idee bilden.`
  ]);

  const chapters = [
    chapter('Architektonische Lesart', paragraph([
      `${entry.title} gewinnt seine architektonische Kraft aus folgender räumlicher Ordnung: ${spatialClaim.long}.`,
      `Entscheidend ist dabei nicht die reine Datierung, sondern die Frage, wie ${mainThemes(entry)} als räumliche, soziale und konstruktive Ordnung sichtbar werden.`
    ]), spatialClaim.basis),
    chapter('Material und Tragwerk', paragraph([
      visibleClaimText(materialClaim),
      visibleClaimText(structuralClaim),
      `Material und Tragwerk werden hier nicht als technische Randnotizen verstanden, sondern als Träger der architektonischen Wirkung.`
    ]), materialClaim.basis),
    chapter('Raumordnung', paragraph([
      spatialClaim.long,
      `Grundriss, Schnitt, Bewegung und Blickbezüge lassen sich dadurch als zusammenhängendes räumliches System lesen.`
    ]), spatialClaim.basis),
    chapter('Tektonik', paragraph([
      visibleClaimText(tectonicClaim),
      `Die tektonische Lesart fragt, wie einzelne Bauteile, Oberflächen, Fügungen und Lasten zusammen eine architektonische Haltung erzeugen.`
    ]), tectonicClaim.basis),
    chapter('Kontext', paragraph([
      `${entry.title} gehört zu ${context}.`,
      `Der Ort ist dabei keine Hintergrundinformation, sondern ein aktiver Teil des architektonischen Arguments.`
    ]), contextBasis(entry)),
    chapter('Relevanz', paragraph([
      `${entry.title} ist als Referenz wichtig, weil ${databaseValue(entry)} nicht als Schlagworte stehen bleiben, sondern an einer konkreten räumlichen Struktur überprüfbar werden.`,
      `Für Lehre, Entwurf und Vergleich zählt vor allem, wie das Projekt eine bestimmte Bauaufgabe, Epoche oder Landschaft in architektonische Ordnung übersetzt.`
    ]), 'derived from entry metadata and Brain quality rules')
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
    'forum-romanum': 'Forum Romanum: Öffentlicher Raum als politisches Palimpsest',
    nippur: 'Nippur: Tempelstadt als geschichteter Lehmziegelkörper',
    'eridu-and-susa': 'Eridu und Susa: Flusslandschaft, Tempel und frühe Stadtmacht',
    ur: 'Ur: Zikkurat, Stadtmauer und Lehmziegel-Monumentalität',
    'megara-hyblaea': 'Megara Hyblaea: Koloniale Polis als frühes Raster',
    'agora-of-athens': 'Agora von Athen: Öffentlichkeit als architektonische Ordnung',
    milet: 'Milet: Hafen, Raster und ionische Stadtidee',
    olynth: 'Olynth: Wohnblock und Alltagsraster der griechischen Polis',
    priene: 'Priene: Orthogonale Stadt am Hang',
    'dura-europos': 'Dura-Europos: Grenzstadt zwischen Mauer, Raster und Bildraum',
    pompeji: 'Pompeji: Alltagsstadt als konservierter urbaner Schnitt',
    timgad: 'Timgad: Kolonialraster als römische Stadtmaschine',
    siena: 'Siena: Bürgerstadt als Topografie des öffentlichen Raums',
    'villa-medici-in-fiesole': 'Villa Medici in Fiesole: Terrasse, Blick und Renaissance-Landschaft',
    sforzinda: 'Sforzinda: Idealstadt als geometrisches Denkmodell',
    'ptolemy-geographia': 'Ptolemäus Geographia: Weltbild als messbarer Raum',
    'villa-d-este': 'Villa d’Este: Wasser als Architektur des Gartens',
    'garden-of-tuileries': 'Tuilerien: Achse, Parterre und höfische Stadtlandschaft',
    'villa-lante': 'Villa Lante: Wasserlauf, Terrasse und kontrollierte Landschaft',
    'mercator-world-atlas': 'Mercator Weltatlas: Projektion als räumliches Werkzeug',
    'piazza-del-popolo': 'Piazza del Popolo: Stadtzugang als barocke Orientierung',
    'piazza-st-peters': 'Petersplatz: Kolonnade, Ritual und gefasste Menge',
    'arc-et-senans': 'Arc-et-Senans: Industrie als Idealstadtfragment'
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
    short: `${materialText} als tektonische Beziehung`,
    long: `Die tektonische Lesart soll zeigen, wie ${materialText} Stützung, Hülle, Fügung und Atmosphäre organisieren.`,
    basis: 'entry materials and analysis fallback'
  };
}

function spatialFallback(entry) {
  const specificSpatialReadings = {
    'catal-huyuk': 'Çatal Hüyük wird als dichtes Haus-an-Haus-Gefüge gelesen, in dem Wand, Dach, Innenraum und Erschließung zu einer frühen urbanen Wohnlandschaft verschmelzen',
    'uruk-city': 'Uruk ordnet frühe Stadt über Tempelbezirke, Plattformen, Mauern und Verwaltungsräume; Monument, Schrift und Arbeitsteilung werden zu einer architektonischen Stadtstruktur',
    'mohenjo-daro': 'Mohenjo-Daro verbindet Rasterstraßen, erhöhte Plattformen, Drainagen und Wasserbauten zu einer Stadt, deren Ordnung aus Hygiene, Standardisierung und kollektiver Infrastruktur entsteht',
    'forum-romanum': 'Das Forum Romanum ist kein einzelner Platz, sondern ein über Jahrhunderte geschichtetes Band aus Tempeln, Basiliken, Triumphwegen, Kurie und öffentlicher Leere',
    nippur: 'Nippur wird als sakrale Stadtlandschaft gelesen, in der Tempelbezirke, Lehmziegelmasse, Tell-Schichtung und Prozessionsräume den urbanen Kern organisieren',
    'eridu-and-susa': 'Eridu und Susa stehen für frühe Stadtbildung in Flusslandschaften: Tempel, Palast, Lehmziegelplattformen und Sedimentschichten bilden eine lange Folge politischer und ritueller Räume',
    ur: 'Ur verdichtet Stadt, Zikkurat, Wohnquartiere und Mauer zu einer Lehmziegel-Topografie, in der Monument und Alltagsstadt nicht getrennt betrachtet werden können',
    'megara-hyblaea': 'Megara Hyblaea macht die griechische Kolonialstadt als ordnenden Grundriss lesbar: Parzellen, Straßen, öffentliche Räume und Hausgrundstücke werden zu einem frühen Rasterinstrument',
    'agora-of-athens': 'Die Agora von Athen ist ein offenes urbanes Feld, das durch Stoen, Heiligtümer, Verwaltungsbauten, Wege und politische Rituale räumliche Bedeutung erhält',
    milet: 'Milet verknüpft Hafenlandschaft, orthogonales Raster und öffentliche Monumente zu einer Stadtidee, in der Geometrie und Küstenveränderung zusammenspielen',
    olynth: 'Olynth zeigt die Polis auf Ebene des Wohnblocks: regelmäßige Straßen, Hofhäuser, Parzellen und Nachbarschaften machen Alltag als städtebauliches System sichtbar',
    priene: 'Priene legt ein orthogonales Raster über einen steilen Hang; Terrassen, Stützmauern, Agora und Heiligtümer zeigen, wie Geometrie topografisch verhandelt wird',
    'dura-europos': 'Dura-Europos verbindet hellenistisches Raster, Befestigung, Flusskante und religiöse Innenräume zu einer Grenzstadt, deren Bedeutung aus Überlagerung entsteht',
    pompeji: 'Pompeji wird als urbaner Schnitt durch Alltag, Handel, Wohnen, Straße, Infrastruktur und Vulkanlandschaft gelesen, nicht nur als konservierte Ruinenstadt',
    timgad: 'Timgad übersetzt römische Kolonialordnung in Cardo, Decumanus, Forum, Theater und Steinraster; die Stadt wird zum präzisen Instrument imperialer Raumproduktion',
    siena: 'Siena formt öffentlichen Raum aus Topografie: Gassen, Hangkanten, Ziegelkörper, Torre del Mangia und die muschelförmige Piazza del Campo bilden eine verdichtete Bürgerlandschaft',
    'villa-medici-in-fiesole': 'Villa Medici in Fiesole ordnet Haus, Terrassen, Gartenräume und Blickachsen am Hang; Architektur und Landschaft werden zu einem kontrollierten Sehapparat über Florenz',
    sforzinda: 'Sforzinda ist keine gebaute Stadt, sondern ein geometrisches Argument: Sternfigur, Radialordnung, Befestigung und Symbolik übersetzen Herrschaft in einen idealen Stadtgrundriss',
    'ptolemy-geographia': 'Die Geographia macht Raum über Koordinaten, Projektion und Maßverhältnis beschreibbar; sie verschiebt Architektur- und Stadtdenken in ein kartografisches Ordnungssystem',
    'villa-d-este': 'Villa d’Este organisiert den steilen Hang als Wasserdramaturgie: Terrassen, Achsen, Brunnen, Grotten und Gartenräume bilden eine begehbare hydraulische Inszenierung',
    'garden-of-tuileries': 'Die Tuilerien übersetzen höfische Ordnung in ein offenes Gartenfeld: Achsen, Parterres, Baumvolumen, Wasserbecken und Wege strukturieren Paris als Landschaftsraum',
    'villa-lante': 'Villa Lante verdichtet Renaissancegarten, Wasserlauf, Terrassenfolge und symmetrische Casino-Bauten zu einer präzisen Choreografie von Bewegung und Blick',
    'mercator-world-atlas': 'Mercators Atlas verwandelt Weltgeografie in eine navigierbare Projektionsfläche; nicht Masse, sondern Abstraktion, Maß und Orientierung werden zum räumlichen Instrument',
    'piazza-del-popolo': 'Piazza del Popolo ordnet Stadteingang, Obelisk, Zwillingskirchen und drei ausstrahlende Straßen zu einem barocken Orientierungssystem',
    'piazza-st-peters': 'Der Petersplatz fasst die Menge durch Ellipse, Kolonnade, Achse und Obelisk; der Platz wird zu einem räumlichen Instrument für Ritual, Prozession und Sichtbarkeit',
    'arc-et-senans': 'Arc-et-Senans verbindet Produktion, Ordnung und Utopie: Die halbkreisförmige Anlage macht industrielle Arbeit, soziale Hierarchie und geometrische Idealvorstellung räumlich lesbar',
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
  const seen = new Set();
  return sentences
    .map((sentence) => cleanSentence(sentence))
    .filter(Boolean)
    .filter((sentence) => {
      const key = sentence.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(' ');
}

function visibleClaimText(claim) {
  const text = cleanSentence(claim?.long);
  if (!text) return '';
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => !/(Blender|ArchiCAD|Datenbank|Filter|Suchfilter|Modell|Layer|Tragwerkslayer|Studienrekonstruktion|Quellenpläne|review|source|R2|Upload)/i.test(sentence));
  return sentences.join(' ');
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
    temple_city: 'Tempelstadt',
    'temple city': 'Tempelstadt',
    temple_city_and_palatial_settlement: 'Tempelstadt und Palastsiedlung',
    'temple city and palatial settlement': 'Tempelstadt und Palastsiedlung',
    ziggurat_city: 'Zikkuratstadt',
    'ziggurat city': 'Zikkuratstadt',
    greek_colonial_polis_grid: 'griechische Kolonialstadt',
    'greek colonial polis grid': 'griechische Kolonialstadt',
    greek_civic_agora: 'griechische Agora',
    'greek civic agora': 'griechische Agora',
    ionian_grid_harbor_city: 'ionische Raster- und Hafenstadt',
    'ionian grid harbor city': 'ionische Raster- und Hafenstadt',
    greek_domestic_grid: 'griechisches Wohnraster',
    'greek domestic grid': 'griechisches Wohnraster',
    terraced_hellenistic_grid_city: 'terrassierte hellenistische Rasterstadt',
    'terraced hellenistic grid city': 'terrassierte hellenistische Rasterstadt',
    fortified_frontier_city: 'befestigte Grenzstadt',
    'fortified frontier city': 'befestigte Grenzstadt',
    roman_city: 'römische Stadt',
    'roman city': 'römische Stadt',
    roman_colonial_grid_city: 'römische Kolonialstadt',
    'roman colonial grid city': 'römische Kolonialstadt',
    medieval_hill_city: 'mittelalterliche Hügelstadt',
    'medieval hill city': 'mittelalterliche Hügelstadt',
    villa_landscape: 'Villenlandschaft',
    'villa landscape': 'Villenlandschaft',
    renaissance_terraced_villa_garden: 'terrassierter Renaissancegarten',
    'renaissance terraced villa garden': 'terrassierter Renaissancegarten',
    ideal_city: 'Idealstadt',
    'ideal city': 'Idealstadt',
    renaissance_star_plan_theory: 'Renaissance-Idealstadt',
    'renaissance star plan theory': 'Renaissance-Idealstadt',
    knowledge_system: 'Wissenssystem',
    'knowledge system': 'Wissenssystem',
    cartographic_projection_treatise: 'kartografische Projektionslehre',
    'cartographic projection treatise': 'kartografische Projektionslehre',
    renaissance_hydraulic_garden: 'hydraulischer Renaissancegarten',
    'renaissance hydraulic garden': 'hydraulischer Renaissancegarten',
    formal_royal_garden: 'formaler königlicher Garten',
    'formal royal garden': 'formaler königlicher Garten',
    renaissance_water_garden: 'Renaissance-Wassergarten',
    'renaissance water garden': 'Renaissance-Wassergarten',
    world_map_projection_atlas: 'Weltkartenatlas',
    'world map projection atlas': 'Weltkartenatlas',
    baroque_urban_piazza: 'barocke Stadtpiazza',
    'baroque urban piazza': 'barocke Stadtpiazza',
    baroque_ritual_square: 'barocker Ritualplatz',
    'baroque ritual square': 'barocker Ritualplatz',
    industrial_complex: 'Industrieanlage',
    'industrial complex': 'Industrieanlage',
    enlightenment_saltworks_ideal_city: 'aufklärerische Salinen-Idealstadt',
    'enlightenment saltworks ideal city': 'aufklärerische Salinen-Idealstadt',
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
    riverine_archaeological_landscape: 'archäologische Flusslandschaft',
    'riverine archaeological landscape': 'archäologische Flusslandschaft',
    euphrates_archaeological_landscape: 'archäologische Euphratlandschaft',
    'euphrates archaeological landscape': 'archäologische Euphratlandschaft',
    archaeological_mountain_site: 'archäologische Hang- und Bergstadt',
    'archaeological mountain site': 'archäologische Hang- und Bergstadt',
    coastal_plain: 'Küstenebene',
    'coastal plain': 'Küstenebene',
    low_urban_slope: 'flacher urbaner Hang',
    'low urban slope': 'flacher urbaner Hang',
    former_harbor_plain: 'ehemalige Hafenebene',
    'former harbor plain': 'ehemalige Hafenebene',
    low_hill: 'flacher Hügel',
    'low hill': 'flacher Hügel',
    steep_slope: 'steiler Hang',
    'steep slope': 'steiler Hang',
    river_bluff: 'Flusskante',
    'river bluff': 'Flusskante',
    volcanic_plain: 'vulkanische Ebene',
    'volcanic plain': 'vulkanische Ebene',
    plateau_plain: 'Plateau-Ebene',
    'plateau plain': 'Plateau-Ebene',
    historic_city_center: 'historischer Stadtkern',
    'historic city center': 'historischer Stadtkern',
    hilltop_ridge: 'Hügelrücken',
    'hilltop ridge': 'Hügelrücken',
    periurban_villa_landscape: 'periurbane Villenlandschaft',
    'periurban villa landscape': 'periurbane Villenlandschaft',
    renaissance_treatise_context: 'Renaissance-Traktatkontext',
    'renaissance treatise context': 'Renaissance-Traktatkontext',
    theoretical_plain: 'theoretische Ebene',
    'theoretical plain': 'theoretische Ebene',
    mediterranean_scholarly_context: 'mediterraner Gelehrtenkontext',
    'mediterranean scholarly context': 'mediterraner Gelehrtenkontext',
    knowledge_network: 'Wissensnetz',
    'knowledge network': 'Wissensnetz',
    historic_garden: 'historischer Garten',
    'historic garden': 'historischer Garten',
    steep_hillside: 'steiler Hang',
    'steep hillside': 'steiler Hang',
    central_paris_royal_axis: 'zentrale Pariser Königsachse',
    'central paris royal axis': 'zentrale Pariser Königsachse',
    gentle_slope: 'sanfter Hang',
    'gentle slope': 'sanfter Hang',
    early_modern_cartographic_network: 'frühneuzeitliches Kartografienetz',
    'early modern cartographic network': 'frühneuzeitliches Kartografienetz',
    global_projection: 'globale Projektion',
    'global projection': 'globale Projektion',
    historic_city_gateway: 'historischer Stadteingang',
    'historic city gateway': 'historischer Stadteingang',
    flat_urban_node: 'flacher urbaner Knoten',
    'flat urban node': 'flacher urbaner Knoten',
    vatican_civic_ritual_space: 'vatikanischer Ritualraum',
    'vatican civic ritual space': 'vatikanischer Ritualraum',
    flat_urban_forecourt: 'flacher urbaner Vorplatz',
    'flat urban forecourt': 'flacher urbaner Vorplatz',
    industrial_heritage_landscape: 'industrielle Kulturlandschaft',
    'industrial heritage landscape': 'industrielle Kulturlandschaft',
    flat_rural_site: 'flacher ländlicher Standort',
    'flat rural site': 'flacher ländlicher Standort',
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
    greek_colony: 'griechische Kolonie',
    'greek colony': 'griechische Kolonie',
    polis_planning: 'Polis-Planung',
    'polis planning': 'Polis-Planung',
    greek_agora: 'griechische Agora',
    'greek agora': 'griechische Agora',
    democratic_civic_space: 'demokratischer Bürgerraum',
    'democratic civic space': 'demokratischer Bürgerraum',
    greek_city: 'griechische Stadt',
    'greek city': 'griechische Stadt',
    hippodamian_grid: 'hippodamisches Raster',
    'hippodamian grid': 'hippodamisches Raster',
    domestic_block: 'Wohnblock',
    'domestic block': 'Wohnblock',
    hellenistic_city: 'hellenistische Stadt',
    'hellenistic city': 'hellenistische Stadt',
    grid_plan: 'Rasterplan',
    'grid plan': 'Rasterplan',
    frontier_city: 'Grenzstadt',
    'frontier city': 'Grenzstadt',
    fortification: 'Befestigung',
    roman_domestic_city: 'römische Alltagsstadt',
    'roman domestic city': 'römische Alltagsstadt',
    roman_colony: 'römische Kolonie',
    'roman colony': 'römische Kolonie',
    ziggurat: 'Zikkurat',
    medieval_city: 'mittelalterliche Stadt',
    'medieval city': 'mittelalterliche Stadt',
    civic_square: 'Bürgerplatz',
    'civic square': 'Bürgerplatz',
    renaissance_villa: 'Renaissancevilla',
    'renaissance villa': 'Renaissancevilla',
    garden_history: 'Gartengeschichte',
    'garden history': 'Gartengeschichte',
    medici_landscape: 'Medici-Landschaft',
    'medici landscape': 'Medici-Landschaft',
    renaissance_urban_theory: 'Renaissance-Stadttheorie',
    'renaissance urban theory': 'Renaissance-Stadttheorie',
    geometric_planning: 'geometrische Planung',
    'geometric planning': 'geometrische Planung',
    cartography: 'Kartografie',
    projection_system: 'Projektionssystem',
    'projection system': 'Projektionssystem',
    renaissance_transmission: 'Renaissance-Überlieferung',
    'renaissance transmission': 'Renaissance-Überlieferung',
    renaissance_garden: 'Renaissancegarten',
    'renaissance garden': 'Renaissancegarten',
    hydraulic_landscape: 'hydraulische Landschaft',
    'hydraulic landscape': 'hydraulische Landschaft',
    french_formal_garden: 'französischer Formalgarten',
    'french formal garden': 'französischer Formalgarten',
    royal_landscape: 'höfische Landschaft',
    'royal landscape': 'höfische Landschaft',
    urban_axis: 'Stadtachse',
    'urban axis': 'Stadtachse',
    mannerist_garden: 'manieristischer Garten',
    'mannerist garden': 'manieristischer Garten',
    water_axis: 'Wasserachse',
    'water axis': 'Wasserachse',
    navigation: 'Navigation',
    mercator_projection: 'Mercator-Projektion',
    'mercator projection': 'Mercator-Projektion',
    baroque_city: 'barocke Stadt',
    'baroque city': 'barocke Stadt',
    roman_piazza: 'römische Piazza',
    'roman piazza': 'römische Piazza',
    ritual_space: 'Ritualraum',
    'ritual space': 'Ritualraum',
    world_heritage_context: 'Welterbe-Kontext',
    'world heritage context': 'Welterbe-Kontext',
    industrial_utopia: 'Industrieutopie',
    'industrial utopia': 'Industrieutopie',
    enlightenment_planning: 'Planung der Aufklärung',
    'enlightenment planning': 'Planung der Aufklärung',
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
    urban_grid: 'Stadtraster',
    'urban grid': 'Stadtraster',
    colonization: 'Kolonisation',
    democracy: 'Demokratie',
    topography: 'Topografie',
    frontier: 'Grenze',
    street_grid: 'Straßenraster',
    'street grid': 'Straßenraster',
    domesticity: 'Alltagswohnen',
    colonial_city: 'Kolonialstadt',
    'colonial city': 'Kolonialstadt',
    republic: 'Republik',
    view: 'Blick',
    geometry: 'Geometrie',
    worldview: 'Weltbild',
    projection: 'Projektion',
    water: 'Wasser',
    axis: 'Achse',
    ritual: 'Ritual',
    industry: 'Industrie',
    utopia: 'Utopie',
    renaissance_city: 'Renaissance-Stadt',
    'renaissance city': 'Renaissance-Stadt',
    baroque_city: 'barocke Stadt',
    'baroque city': 'barocke Stadt',
    mud_brick: 'Lehmziegel',
    'mud brick': 'Lehmziegel',
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
    alluvial_clay: 'Schwemmland-Lehm',
    'alluvial clay': 'Schwemmland-Lehm',
    stone_foundations: 'Steinfundamente',
    'stone foundations': 'Steinfundamente',
    stone_masonry: 'Steinmauerwerk',
    'stone masonry': 'Steinmauerwerk',
    stone_paving: 'Steinpflaster',
    'stone paving': 'Steinpflaster',
    stone_edges: 'Steinkanten',
    'stone edges': 'Steinkanten',
    terrace_walls: 'Terrassenmauern',
    'terrace walls': 'Terrassenmauern',
    timber_roof: 'Holzdach',
    'timber roof': 'Holzdach',
    industrial_infrastructure: 'Industrieinfrastruktur',
    'industrial infrastructure': 'Industrieinfrastruktur',
    vegetation: 'Vegetation',
    gravel: 'Kies',
    water: 'Wasser',
    paper: 'Papier',
    ink: 'Tinte',
    parchment: 'Pergament',
    engraving: 'Kupferstich',
    terracotta: 'Terrakotta',
    geometric_diagram: 'geometrisches Diagramm',
    'geometric diagram': 'geometrisches Diagramm',
    masonry: 'Mauerwerk',
    stone: 'Stein',
    limestone: 'Kalkstein',
    marble: 'Marmor',
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
    ['The Forum Romanum accumulates stone, brick and concrete monuments around a civic valley; it should be modeled as a layered public field rather than one building', 'Das Forum Romanum versammelt Stein-, Ziegel- und Betonmonumente um einen zivilen Talraum; es soll als geschichtetes öffentliches Feld und nicht als Einzelbau modelliert werden'],
    ['Nippur is read as a Mesopotamian temple city with mud-Ziegel urban fabric, sacred precincts and layered tell stratigraphy', 'Nippur wird als mesopotamische Tempelstadt mit Lehmziegelgefüge, sakralen Bezirken und geschichteter Tell-Stratigrafie gelesen'],
    ['Urban and temple fabrics are reconstructed primarily through Mesopotamian alluvial mud-Ziegel archaeology; Susa adds Elamite/Achaemenid palatial and mud-Ziegel contexts', 'Stadt- und Tempelgefüge werden vor allem über mesopotamische Schwemmland-Lehm-Archäologie rekonstruiert; Susa ergänzt elamische und achämenidische Palast- und Lehmziegelkontexte'],
    ['The ziggurat and city remains combine mud-Ziegel massing with baked-Ziegel revetments and bitumen mortars in key monumental zones', 'Zikkurat und Stadtreste verbinden Lehmziegelmasse mit gebrannten Ziegelverkleidungen und Bitumenmörtel in den zentralen monumentalen Zonen'],
    ['Greek colonial urban fabric is read through Stein foundations, street grids and house plots; upper structures are largely archaeological inference', 'Das griechische Kolonialgefüge wird über Steinfundamente, Straßenraster und Hausparzellen gelesen; aufgehende Bauteile bleiben weitgehend archäologische Interpretation'],
    ['The Agora combines open civic ground with stoas, temples and administrative buildings; material reading is Stein civic architecture around a public void', 'Die Agora verbindet offenen Bürgergrund mit Stoen, Tempeln und Verwaltungsbauten; die Materiallesart versteht sie als steinerne Bürgerarchitektur um eine öffentliche Leere'],
    ['Milet is an important grid-planning and harbor-city reference, with Stein civic monuments arranged in relation to orthogonal urban order and changing coastline', 'Milet ist eine zentrale Referenz für Rasterplanung und Hafenstadt: steinerne öffentliche Monumente stehen im Verhältnis zu orthogonaler Ordnung und veränderlicher Küstenlinie'],
    ['Olynth is central for reading Greek domestic blocks: regular street grid, courtyard houses and Stein foundation traces with reconstructed mud-Ziegel/Holz superstructures', 'Olynth ist zentral für die Lesart griechischer Wohnblöcke: regelmäßiges Straßennetz, Hofhäuser und Steinfundamente mit rekonstruierten Lehmziegel- und Holzaufbauten'],
    ['Priene adapts an orthogonal urban grid to a steep slope, making terraces, retaining walls and civic monuments inseparable from topography', 'Priene passt ein orthogonales Stadtraster an einen steilen Hang an; Terrassen, Stützmauern und öffentliche Monumente werden untrennbar mit der Topografie verbunden'],
    ['Dura-Europos is a fortified frontier city with mud-Ziegel and Stein fabric, city walls, religious interiors and exceptional painted/Putzed room evidence', 'Dura-Europos ist eine befestigte Grenzstadt aus Lehmziegel- und Steingefüge, Stadtmauer, religiösen Innenräumen und außergewöhnlichen bemalten Putzbefunden'],
    ['Pompeii combines volcanic Stein, Ziegel, concrete, Putzed interiors and street paving; the urban model should expose domestic, commercial and infrastructural layers', 'Pompeji verbindet vulkanisches Gestein, Ziegel, Beton, verputzte Innenräume und Straßenbeläge; das Stadtmodell soll Wohn-, Handels- und Infrastrukturschichten getrennt lesbar machen'],
    ['Timgad is a Roman colonial grid city whose Stein streets, forum, theater and cardo/decumanus structure make it a strong urban-order reference', 'Timgad ist eine römische Kolonialstadt, deren Steinstraßen, Forum, Theater und Cardo-Decumanus-Struktur sie zu einer starken Referenz urbaner Ordnung machen']
  ];

  for (const [source, target] of replacements) {
    text = text.replaceAll(source, target);
  }

  text = text.replace(
    /Tectonic layer planned around ([^;]+); separates material expression, enclosure and structural reading for later Blender layer toggles/g,
    'Die tektonische Lesart trennt $1 als Zusammenspiel von Materialausdruck, Hülle, Fügung und tragender Ordnung'
  );

  return text
    .replaceAll('Material system planned for database filters: materials require source review', 'Das Materialsystem muss noch quellenbasiert präzisiert werden')
    .replaceAll('The structural reading treats Villa Noailles as a stepped system of cubic blocks, terraces and retaining relations rather than as a single pure object', 'Die strukturelle Lesart versteht Villa Noailles als gestuftes System aus kubischen Körpern, Terrassen und Stützmauerbezügen, nicht als reine Einzelbox')
    .replaceAll('The structural reading treats Villa Noailles as a stepped system of cubic blocks, terraces and retaining relations rather than as a single pure box', 'Die strukturelle Lesart versteht Villa Noailles als gestuftes System aus kubischen Körpern, Terrassen und Stützmauerbezügen, nicht als reine Einzelbox')
    .replaceAll('The tectonic reading separates block volumes, terraces, roof planes, circulation paths, garden geometry and light surfaces', 'Die tektonische Lesart trennt Baukörper, Terrassen, Dachflächen, Wegeführung, Gartengeometrie und helle Oberflächen')
    .replaceAll('The primary architectural material is worked limestone. T-shaped monoliths, circular/oval enclosures and stone walls define space through mass, carving and arrangement rather than through roofed building systems', 'Das primäre architektonische Material ist bearbeiteter Kalkstein. T-förmige Monolithe, kreis- und ovalförmige Einhegungen sowie Steinmauern definieren Raum über Masse, Setzung, Relief und Anordnung statt über gedeckte Gebäudesysteme')
    .replaceAll('Its tectonics are megalithic and subtractive/additive at once: quarrying, shaping, carving, erecting and embedding Steins into enclosure walls', 'Die Tektonik ist zugleich megalithisch und aushebend-aufbauend: Gewinnen, Formen, Reliefieren, Aufrichten und Einbetten der Steine erzeugen die räumliche Ordnung')
    .replaceAll('Its tectonics are megalithic and subtractive/additive at once: quarrying, shaping, carving, erecting and embedding stones into enclosure walls', 'Die Tektonik ist zugleich megalithisch und aushebend-aufbauend: Gewinnen, Formen, Reliefieren, Aufrichten und Einbetten der Steine erzeugen die räumliche Ordnung')
    .replaceAll('The project depends on a steel scaffold, climbing vegetation and time. Its architectural material is not simply greenery but the changing relation between frame, seasonal growth, shade, void and public occupation', 'Das Projekt beruht auf Stahlgerüst, Klettervegetation und Zeit. Sein architektonisches Material ist nicht bloß Begrünung, sondern das wechselnde Verhältnis von Rahmen, Wachstum, Schatten, Leere und öffentlicher Aneignung')
    .replaceAll('Its tectonics are exposed and processual: steel is the permanent skeleton, vegetation is the living envelope, and the park matures through growth rather than through finished facade treatment', 'Die Tektonik ist offen und prozesshaft: Stahl bildet das dauerhafte Skelett, Vegetation die lebendige Hülle, und der Park reift durch Wachstum statt durch eine abgeschlossene Fassadenbehandlung')
    .replaceAll('The retained rail viaduct provides the structural datum. Concrete planks, steel infrastructure, planting and fragments of rail memory are layered to make an adaptive landscape rather than erase the industrial support', 'Das erhaltene Bahnviadukt bildet den tragenden Grund. Betonplatten, Stahlstruktur, Pflanzung und Spuren der Bahngeschichte werden so geschichtet, dass eine neue Landschaft entsteht, ohne die industrielle Grundlage auszulöschen')
    .replaceAll('Glass, concrete and earth/topography form the primary material system: transparent pavilion edges meet a heavy ground datum and hillside thermal envelope', 'Glas, Beton und Erd-/Hangbezug bilden das primäre Materialsystem: transparente Pavillonränder treffen auf einen schweren Bodensockel und eine in den Hang eingebettete Hülle')
    .replaceAll('Six pavilion roofs act as canopy-like structural fields. Vertical supports and concrete retaining elements organize a light/heavy contrast across the radial plan', 'Sechs Pavillondächer wirken wie schirmartige Tragfelder. Vertikale Stützen und haltende Betonelemente organisieren den Kontrast von Leichtigkeit und Schwere im radialen Grundriss')
    .replaceAll('The tectonic reading separates frame, glass, curtain, Onyx wall, Holz wall and floor plane into layered elements that produce fluid domestic space', 'Die tektonische Lesart trennt Rahmen, Glas, Vorhang, Onyxwand, Holzwand und Bodenebene als Schichten, die einen fließenden Wohnraum erzeugen')
    .replaceAll('The tectonic reading separates the lifted frame, white envelope, horizontal window band, ramp, service cores and Dachgarten plane as distinct modern layers', 'Die tektonische Lesart trennt angehobenes Tragwerk, weiße Hülle, horizontales Fensterband, Rampe, dienende Kerne und Dachgartenebene als klare moderne Schichten')
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
    .replaceAll('alluvial_clay', 'Schwemmland-Lehm')
    .replaceAll('stone_foundations', 'Steinfundamente')
    .replaceAll('stone_masonry', 'Steinmauerwerk')
    .replaceAll('roman_concrete', 'römischer Beton')
    .replaceAll('limestone', 'Kalkstein')
    .replaceAll('marble', 'Marmor')
    .replaceAll('masonry', 'Mauerwerk')
    .replaceAll('vegetation', 'Vegetation')
    .replaceAll('gravel', 'Kies')
    .replaceAll('water', 'Wasser')
    .replaceAll('paper', 'Papier')
    .replaceAll('ink', 'Tinte')
    .replaceAll('parchment', 'Pergament')
    .replaceAll('engraving', 'Kupferstich')
    .replaceAll('terracotta', 'Terrakotta')
    .replaceAll('stone', 'Stein')
    .replaceAll('travertine', 'Travertin')
    .replaceAll('tufa', 'Tuffstein')
    .replaceAll('brick', 'Ziegel')
    .replaceAll('plaster', 'Putz')
    .replaceAll('timber', 'Holz')
    .replaceAll('cellular mass', 'zelluläre Masse')
    .replaceAll('massive wall', 'massive Wand')
    .replaceAll('stepped mass', 'gestufte Masse')
    .replaceAll('masonry foundation', 'Mauerwerksfundament')
    .replaceAll('terrace wall', 'Terrassenmauer')
    .replaceAll('stone masonry', 'Steinmauerwerk')
    .replaceAll('mass, load path and spatial support system', 'Masse, Lastpfad und räumliches Tragsystem')
    .replaceAll('platform', 'Plattform')
    .replaceAll('monumental ensemble', 'monumentales Ensemble')
    .replaceAll('Onyx, glass, steel, textile and Holz are not decoration only; they act as atmospheric and spatial instruments within the freier Grundriss', 'Onyx, Glas, Stahl, Textil und Holz sind nicht nur Ausstattung, sondern atmosphärische und räumliche Instrumente innerhalb des freien Grundrisses')
    .replaceAll('Onyx, glass, steel, textile and timber are not decoration only; they act as atmospheric and spatial instruments within the freier Grundriss', 'Onyx, Glas, Stahl, Textil und Holz sind nicht nur Ausstattung, sondern atmosphärische und räumliche Instrumente innerhalb des freien Grundrisses')
    .replaceAll('The structural reading foregrounds a steel-frame order that frees the living level from conventional room-bearing walls and allows material screens to organize space', 'Die strukturelle Lesart stellt ein Stahlskelett in den Vordergrund, das das Wohngeschoss von tragenden Zimmerwänden löst und Materialschirme als raumbildende Elemente ermöglicht')
    .replaceAll('Nippur is read as a Mesopotamian temple city with mud-Ziegel urban fabric, sacred precincts and layered tell stratigraphy', 'Nippur wird als mesopotamische Tempelstadt mit Lehmziegelgefüge, sakralen Bezirken und geschichteter Tell-Stratigrafie gelesen')
    .replaceAll('Urban and temple fabrics are reconstructed primarily through Mesopotamian alluvial mud-Ziegel archaeology; Susa adds Elamite/Achaemenid palatial and mud-Ziegel contexts', 'Stadt- und Tempelgefüge werden vor allem über mesopotamische Schwemmland-Lehm-Archäologie rekonstruiert; Susa ergänzt elamische und achämenidische Palast- und Lehmziegelkontexte')
    .replaceAll('The ziggurat and city remains combine mud-Ziegel massing with baked-Ziegel revetments and bitumen mortars in key monumental zones', 'Zikkurat und Stadtreste verbinden Lehmziegelmasse mit gebrannten Ziegelverkleidungen und Bitumenmörtel in den zentralen monumentalen Zonen')
    .replaceAll('Greek colonial urban fabric is read through Stein foundations, street grids and house plots; upper structures are largely archaeological inference', 'Das griechische Kolonialgefüge wird über Steinfundamente, Straßenraster und Hausparzellen gelesen; aufgehende Bauteile bleiben weitgehend archäologische Interpretation')
    .replaceAll('The Agora combines open civic ground with stoas, temples and administrative buildings; material reading is Stein civic architecture around a public void', 'Die Agora verbindet offenen Bürgergrund mit Stoen, Tempeln und Verwaltungsbauten; die Materiallesart versteht sie als steinerne Bürgerarchitektur um eine öffentliche Leere')
    .replaceAll('Milet is an important grid-planning and harbor-city reference, with Stein civic monuments arranged in relation to orthogonal urban order and changing coastline', 'Milet ist eine zentrale Referenz für Rasterplanung und Hafenstadt: steinerne öffentliche Monumente stehen im Verhältnis zu orthogonaler Ordnung und veränderlicher Küstenlinie')
    .replaceAll('Olynth is central for reading Greek domestic blocks: regular street grid, courtyard houses and Stein foundation traces with reconstructed mud-Ziegel/Holz superstructures', 'Olynth ist zentral für die Lesart griechischer Wohnblöcke: regelmäßiges Straßennetz, Hofhäuser und Steinfundamente mit rekonstruierten Lehmziegel- und Holzaufbauten')
    .replaceAll('Dura-Europos is a fortified frontier city with mud-Ziegel and Stein fabric, city walls, religious interiors and exceptional painted/Putzed room evidence', 'Dura-Europos ist eine befestigte Grenzstadt aus Lehmziegel- und Steingefüge, Stadtmauer, religiösen Innenräumen und außergewöhnlichen bemalten Putzbefunden')
    .replaceAll('Pompeii combines volcanic Stein, Ziegel, concrete, Putzed interiors and street paving; the urban model should expose domestic, commercial and infrastructural layers', 'Pompeji verbindet vulkanisches Gestein, Ziegel, Beton, verputzte Innenräume und Straßenbeläge; das Stadtmodell soll Wohn-, Handels- und Infrastrukturschichten getrennt lesbar machen')
    .replaceAll('Timgad is a Roman colonial grid city whose Stein streets, forum, theater and cardo/decumanus structure make it a strong urban-order reference', 'Timgad ist eine römische Kolonialstadt, deren Steinstraßen, Forum, Theater und Cardo-Decumanus-Struktur sie zu einer starken Referenz urbaner Ordnung machen')
    .replaceAll('Siena is read as a medieval hill city where Ziegel/Stein fabric, shell-shaped Piazza del Campo and topographic streets form a compact civic landscape', 'Siena wird als mittelalterliche Hügelstadt gelesen, in der Ziegel- und Steinstruktur, die muschelförmige Piazza del Campo und topografische Gassen eine kompakte Bürgerlandschaft bilden')
    .replaceAll('The villa is modeled as architecture plus terraced landscape: Mauerwerk house, retaining walls, planted garden rooms and framed views toward Florence', 'Die Villa verbindet Architektur und terrassierte Landschaft: Mauerwerkskörper, Stützmauern, bepflanzte Gartenräume und gefasste Blicke auf Florenz bilden eine zusammenhängende Ordnung')
    .replaceAll('Sforzinda is a textual/drawn ideal city; material is manuscript/diagram, while 3D value lies in reconstructing geometry and urban order', 'Sforzinda ist eine gezeichnete und beschriebene Idealstadt; ihr Material ist Manuskript und Diagramm, ihre architektonische Bedeutung liegt in der Rekonstruktion von Geometrie und urbaner Ordnung')
    .replaceAll('As a cartographic/textual object, the material system is manuscript and early print media rather than building fabric', 'Als kartografisches und textliches Objekt besteht das Materialsystem aus Manuskript, Papier, Tinte und früher Druckkultur statt aus Baugefüge')
    .replaceAll('Villa d’Este is read as hydraulic landscape architecture: terraces, Stein retaining systems, fountains, water axes and garden rooms', 'Villa d’Este wird als hydraulische Landschaftsarchitektur gelesen: Terrassen, steinerne Stützungen, Brunnen, Wasserachsen und Gartenräume bilden eine räumliche Dramaturgie')
    .replaceAll('Villa d’Este is read as hydraulic landscape architecture: terraces, Stein retaining systems, fountains, Wasser axes and garden rooms', 'Villa d’Este wird als hydraulische Landschaftsarchitektur gelesen: Terrassen, steinerne Stützungen, Brunnen, Wasserachsen und Gartenräume bilden eine räumliche Dramaturgie')
    .replaceAll('Tuileries is modeled as a formal garden field: axial paths, parterres, basins, tree masses and royal/urban alignments', 'Die Tuilerien werden als formales Gartenfeld gelesen: Achswege, Parterres, Wasserbecken, Baumvolumen und höfisch-städtische Ausrichtungen ordnen den Raum')
    .replaceAll('Villa Lante is read as a compact Renaissance water garden with paired casino buildings, terraces, fountains and a controlled descent of water', 'Villa Lante wird als kompakter Renaissance-Wassergarten mit paarigen Casino-Bauten, Terrassen, Brunnen und kontrolliertem Wasserlauf gelesen')
    .replaceAll('Villa Lante is read as a compact Renaissance Wasser garden with paired casino buildings, terraces, fountains and a controlled descent of Wasser', 'Villa Lante wird als kompakter Renaissance-Wassergarten mit paarigen Casino-Bauten, Terrassen, Brunnen und kontrolliertem Wasserlauf gelesen')
    .replaceAll('Mercator is modeled as a cartographic projection and printed knowledge object; spatial value lies in navigational abstraction rather than architectural mass', 'Mercator wird als kartografische Projektion und gedrucktes Wissensobjekt gelesen; sein räumlicher Wert liegt in navigierbarer Abstraktion statt in architektonischer Masse')
    .replaceAll('Piazza del Popolo is a baroque/urban threshold: paving field, twin churches, obelisk, gates and radiating streets produce an urban orientation device', 'Piazza del Popolo ist eine barocke urbane Schwelle: Pflasterfeld, Zwillingskirchen, Obelisk, Tore und ausstrahlende Straßen erzeugen ein Orientierungssystem')
    .replaceAll('St Peter’s Square is a ritual urban space: elliptical colonnades, axial approach, obelisk and paving define crowd, procession and symbolic orientation', 'Der Petersplatz ist ein ritueller Stadtraum: elliptische Kolonnaden, axiale Annäherung, Obelisk und Pflasterung ordnen Menge, Prozession und symbolische Orientierung')
    .replaceAll('The Royal Saltworks is an industrial-ideal urban fragment: semicircular plan, production buildings, director’s house and social order encoded in geometry', 'Die Königliche Saline ist ein industriell-ideales Stadtfragment: Halbkreisplan, Produktionsbauten, Direktorenhaus und soziale Ordnung werden geometrisch codiert')
    .replaceAll('Stein_edges', 'Steinkanten')
    .replaceAll('Stein_paving', 'Steinpflaster')
    .replaceAll('Holz_roof', 'Holzdach')
    .replaceAll('industrial_infrastructure', 'Industrieinfrastruktur')
    .replaceAll('terrace_walls', 'Terrassenmauern')
    .replaceAll('geometric_diagram', 'geometrisches Diagramm')
    .replaceAll('Mauerwerk foundation', 'Mauerwerksfundament')
    .replaceAll('Stein Mauerwerk', 'Steinmauerwerk');
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
