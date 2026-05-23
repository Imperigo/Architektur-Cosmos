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
  const materialClaim = specificMaterialClaim(entry) || analysis.material_system || materialFallback(entry, materials);

  const headline = buildHeadline(entry, program);
  const overview = paragraph([
    `${entry.title} wird als ${program} verstanden; die Bedeutung des Projekts geht nicht in einem einzelnen Bild auf.`,
    `Architektonisch entscheidend ist das Zusammenspiel von Netzwerkposition, Topos, Typos, Tektonik, Raumdramaturgie und ${context}.`,
    `Der Text beantwortet deshalb, welche architektonische These im Objekt steckt, wie es sich von verwandten Referenzen unterscheidet und welchen Wert es als KosmoData-Referenz für Analyse, Entwurf und 3D-Layer besitzt.`
  ]);

  const chapters = [
    chapter('These', paragraph([
      `${entry.title} wird nicht als isoliertes Objekt gelesen, sondern als architektonische These innerhalb von ${mainThemes(entry)}.`,
      `${spatialClaim.long}.`,
      `Die Analyse fragt, welche räumliche Intelligenz daraus entsteht und welche Idee über das einzelne Projekt hinaus übertragbar bleibt.`
    ]), spatialClaim.basis),
    chapter('Netzwerk und DNA', paragraph([
      networkDna(entry),
      `Im Atlas ist wichtig, ob ${entry.title} eine bekannte DNA nur fortschreibt, sie verdichtet, bricht oder in eine andere Epoche, Landschaft oder Bauaufgabe übersetzt.`,
      `So wird das Objekt nicht nur datiert, sondern in ein Beziehungsnetz von ähnlichen Typologien, Materialien, Programmen, Quellen und historischen Problemen eingeordnet.`
    ]), 'entry themes, source trail and atlas relation logic'),
    chapter('Topos', paragraph([
      `${entry.title} gehört zu ${context}.`,
      `Der Ort ist dabei keine Hintergrundinformation, sondern ein aktiver Teil des architektonischen Arguments: Gelände, Stadtlage, Landschaft, Klima, Blick, Schwelle oder institutioneller Rahmen verändern die architektonische Bedeutung.`
    ]), contextBasis(entry)),
    chapter('Typos', paragraph([
      `Typologisch ist ${entry.title} als ${program} zu lesen.`,
      `Entscheidend ist, wie Programm, Gebrauch, Erschließung, Öffentlichkeit und Privatheit organisiert werden und ob der Typus dabei stabilisiert, erweitert oder bewusst gestört wird.`
    ]), 'entry type and program metadata'),
    chapter('Tektonik', paragraph([
      visibleClaimText(tectonicClaim),
      visibleClaimText(materialClaim),
      visibleClaimText(structuralClaim),
      `Tektonik bedeutet hier nicht nur Konstruktion, sondern das Zusammenspiel von Last, Fügung, Oberfläche, Maßstab und architektonischer Wirkung.`
    ]), tectonicClaim.basis),
    chapter('Raumlogik', paragraph([
      spatialClaim.long,
      `Grundriss, Schnitt, Bewegung, Blickbeziehungen und Schwellen werden als zusammenhängendes räumliches System gelesen, nicht als getrennte Darstellungsarten.`
    ]), spatialClaim.basis),
    chapter('Konflikt und Kritik', paragraph([
      critiqueClaim(entry),
      `Die kritische Lesart verhindert, dass das Objekt nur als Ikone gespeichert wird: Maßstab, soziale Wirkung, technische Abhängigkeit, ökologische Folgen, Repräsentation und Quellenlage bleiben Teil der Bewertung.`
    ]), 'derived from entry metadata and review questions'),
    chapter('KosmoData-Layer und 3D-Potenzial', paragraph([
      layerPotential(entry),
      `Für Blender, ArchiCAD und spätere Analyseansichten zählt, welche Bestandteile als getrennte Ebenen lesbar werden: Ort, Masse, Tragstruktur, Hülle, Innenraum, Material, Zirkulation und Unsicherheit.`
    ]), 'model assets, analysis layers and database tags'),
    chapter('Entwurfsintelligenz', paragraph([
      `${entry.title} ist als Referenz wichtig, weil ${databaseValue(entry)} nicht als Schlagworte stehen bleiben, sondern an einer konkreten räumlichen Struktur überprüfbar werden.`,
      `Die eigentliche Lernfrage lautet: Welche Regel, räumliche Operation oder konstruktive Haltung kann aus dem Projekt extrahiert werden, ohne es formal zu kopieren?`
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
    'arc-et-senans': 'Arc-et-Senans: Industrie als Idealstadtfragment',
    'palazzo-medici-riccardi': 'Palazzo Medici Riccardi: Stadtpalast als gebaute Macht',
    'fortezza-di-palmanova': 'Palmanova: Sternfestung als geometrische Stadtmaschine',
    'new-lanark-mills': 'New Lanark: Industrie, Fürsorge und reformierte Siedlung',
    'royal-observatory-greenwich': 'Greenwich Observatory: Architektur der Zeitmessung',
    'central-park': 'Central Park: Landschaft als Gegenform zur Metropole',
    familistere: 'Familistère: Kollektives Wohnen als sozialer Apparat',
    'barcelona-extension': 'Barcelona Eixample: Raster, Hygiene und Stadterweiterung',
    'wien-ringstrasse': 'Wien Ringstraße: Boulevard als bürgerliche Bühne',
    'emerald-necklace': 'Emerald Necklace: Parksystem als urbane Infrastruktur',
    'linear-city': 'Linear City: Stadt als Verkehrsband',
    'hotel-tassel': 'Hôtel Tassel: Interieur, Eisen und fließende Linie',
    'letchworth-garden-city': 'Letchworth: Gartenstadt als Reformmodell',
    'new-delhi': 'New Delhi: Hauptstadtachse als koloniale Raumordnung',
    'welwyn-garden-city': 'Welwyn Garden City: Gartenstadt in zweiter Generation',
    postsparkasse: 'Postsparkasse: Moderne Verwaltung als präziser Prozessraum',
    'karl-marx-hof': 'Karl-Marx-Hof: Wohnblock als Stadt der Fürsorge',
    'pyramids-of-giza': 'Pyramiden von Gizeh: Geometrie, Arbeit und kosmische Dauer',
    parthenon: 'Parthenon: Ordnung, Maß und Polis als Tempelbild',
    'vitruvius-de-architectura': 'De architectura: Bauwissen als übertragbares System',
    pantheon: 'Pantheon: Kuppelraum, Licht und kosmische Mitte',
    'hagia-sophia': 'Hagia Sophia: Kuppel, Licht und imperiale Raumordnung',
    'kloster-st-gallen': 'Kloster St. Gallen: Wissen, Liturgie und Plan als Ordnung',
    alhambra: 'Alhambra: Hof, Wasser und Ornament als Klimaarchitektur',
    'hereford-mappa-mundi': 'Hereford Mappa Mundi: Weltbild als kartografische Theologie',
    'catalan-atlas': 'Catalan Atlas: Navigation, Handel und gezeichnete Welt',
    'brunelleschi-dome': 'Santa Maria del Fiore: Kuppelbau als Stadtzeichen',
    'city-in-layers': 'City in Layers: Stadt als vertikale Infrastruktur',
    'palladio-four-books': 'Palladios Vier Bücher: Proportion als übertragbare Architektur',
    'sixtus-v-rome-plan': 'Rom unter Sixtus V.: Achsen, Obelisken und Pilgerstadt',
    'versailles-gardens': 'Versailles: Landschaft als absolutistische Perspektive',
    'marc-antoine-laugier-primitive-hut': 'Primitive Hut: Ursprung als architektonische Theoriefigur',
    panopticon: 'Panopticon: Sichtbarkeit als räumliche Machttechnik',
    'crystal-palace': 'Crystal Palace: Eisen, Glas und klimatisierter Ausstellungsraum',
    'red-house': 'Red House: Handwerk, Wohnen und Kritik an der Industrieform',
    'cite-industrielle': 'Cité Industrielle: Industrie, Wohnen und Stadt als rationales System',
    'garden-cities-of-tomorrow': 'Garden Cities of To-morrow: Reformstadt zwischen Land und Metropole',
    '25b-avenue-franklin': '25bis Rue Franklin: Betonrahmen, Fassade und freier Wohnplan',
    'warenhaus-wertheim': 'Warenhaus Wertheim: Konsum, Schwelle und moderne Großstadtfassade',
    'fagus-factory': 'Fagus-Werk: Glas, Ecke und industrielle Transparenz',
    'dom-ino-house': 'Dom-Ino: Das Skelett als offenes architektonisches Betriebssystem',
    'bauhaus-dessau': 'Bauhaus Dessau: Schule, Werkstatt und Glasfassade als moderne Pädagogik',
    'immeuble-rue-des-amiraux': 'Rue des Amiraux: Wohnblock, Bad und urbane Infrastruktur',
    'voelkerbundspalast-competition': 'Völkerbundpalast: Wettbewerb als Konflikt moderner Repräsentation',
    'narkomfin-housing': 'Narkomfin: Kollektives Wohnen als sozialer Schnitt',
    'hufeisensiedlung': 'Hufeisensiedlung: Reformwohnen als Landschaftsfigur',
    'ville-radieuse': 'Ville Radieuse: Stadt als vertikale Funktion und Sonne',
    'broadacre-city': 'Broadacre City: Dezentralisierung, Land und Auto als Stadtmodell',
    'athens-charter': 'Charta von Athen: Funktionstrennung als Stadtprogramm',
    'the-capitol': 'The Capitol: Lichtarchitektur und Kino als Großstadtapparat',
    'buerogebaeude-montecatini': 'Montecatini: Büroarbeit als präzise moderne Prozessarchitektur',
    chandigarh: 'Chandigarh: Hauptstadt als postkoloniale Landschaft der Moderne',
    'unite-habitation': 'Unité d’Habitation: Wohnmaschine als vertikale Stadt',
    brasilia: 'Brasília: Hauptstadtachse, Monument und leere Mitte',
    'habitat-67': 'Habitat 67: Modul, Terrasse und gestapeltes Wohnen',
    'new-babylon': 'New Babylon: Megastruktur als Spielraum einer freien Gesellschaft',
    'ibm-cosham': 'IBM Cosham: Bürohaus als technologische Glaslandschaft',
    'delirious-new-york': 'Delirious New York: Manhattan als Kultur der Dichte',
    'gas-works-park': 'Gas Works Park: Industriebestand als öffentliche Landschaft',
    'willis-faber-and-dumas-office': 'Willis Faber & Dumas: Büro als gläserner Stadtorganismus',
    'centre-pompidou': 'Centre Pompidou: Kulturmaschine mit offen gelegter Infrastruktur'
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

function specificMaterialClaim(entry) {
  const claims = {
    'central-park': 'Central Park ist eine gebaute Stadtlandschaft aus Erdmodellierung, Pflanzung, Wasserflächen, Felsen, Wegen und Brückeninfrastruktur.',
    'pyramids-of-giza': 'Die Pyramiden werden als präzise Steinmasse, Logistikbau und geometrisches Erdzeichen gelesen; Material, Last und Orientierung bilden eine untrennbare Einheit.',
    parthenon: 'Der Parthenon wird über Marmorkonstruktion, Säulenordnung, Gebälk, Cella und optische Korrekturen gelesen; Tragwerk und Bildordnung fallen eng zusammen.',
    'vitruvius-de-architectura': 'Als Text besitzt De architectura kein Tragwerk im baulichen Sinn; sein Material ist die systematische Ordnung von Bauwissen, Technik, Proportion und Begriffen.',
    pantheon: 'Das Pantheon verbindet römischen Beton, abgestufte Kuppelmasse, Ziegel- und Steinverkleidung, Kassettierung und Oculus zu einer radikalen Innenraumkonstruktion.',
    'hagia-sophia': 'Hagia Sophia wird über Mauerwerksmassen, Pendentifs, Halbkuppeln, Marmorschichten und Lichtflächen gelesen; die Konstruktion erzeugt eine scheinbar schwebende Kuppelordnung.',
    'kloster-st-gallen': 'Der St. Galler Plan arbeitet mit der zeichnerischen Ordnung von Kirche, Klausur, Werkhöfen, Gärten, Schule, Herberge und Versorgung; sein Material ist der organisierte Grundriss.',
    alhambra: 'Die Alhambra verbindet Mauerwerk, Stuck, Holzdecken, Fliesen, Wasserbecken, Schatten und Hofräume zu einer leichten, klimatisch präzisen Raumstruktur.',
    'hereford-mappa-mundi': 'Die Hereford Mappa Mundi ist als Pergament-, Tinten- und Bildordnung wirksam; ihr räumliches Material ist die Verbindung von Ort, Text, Geschichte und theologischer Hierarchie.',
    'catalan-atlas': 'Der Catalan Atlas arbeitet mit Pergament, Farbe, Schrift, Küstenlinien und Figuren; seine konstruktive Ordnung liegt in Navigation, Maß und narrativer Weltgliederung.',
    'brunelleschi-dome': 'Die Florentiner Kuppel wird über Doppelschale, Rippen, Ziegelverband, hölzerne Bauhilfen und selbsttragende Bauabfolge gelesen.',
    'city-in-layers': 'City in Layers beschreibt Material nicht als Baustoff, sondern als räumliche Schichtung von Bewegung, Versorgung, Wasser, Arbeit und Öffentlichkeit.',
    'palladio-four-books': 'Palladios Traktat arbeitet mit Zeichnung, Maß, Proportion und Typus; sein konstruktives Material ist die Übertragbarkeit architektonischer Regeln.',
    'sixtus-v-rome-plan': 'Rom unter Sixtus V. wird über Straßenachsen, Obelisken, Platzräume und sakrale Knoten gelesen; die Konstruktion liegt in der städtischen Verbindung.',
    'versailles-gardens': 'Versailles verbindet Erdmodellierung, Wassertechnik, Bosketts, Parterres, Achsen und Blickräume zu einer gebauten Landschaft der Kontrolle.',
    'marc-antoine-laugier-primitive-hut': 'Die Primitive Hut arbeitet als theoretische Materialfigur aus Stütze, Balken, Dach und Natur; sie reduziert Architektur auf eine elementare tektonische Ordnung.',
    panopticon: 'Das Panopticon besitzt sein Tragwerk vor allem als Diagramm: Ring, Zelle, Zentrum, Blick und Distanz ordnen Körper und Institution.',
    'crystal-palace': 'Crystal Palace wird über Eisenstützen, Träger, Glasfelder, modulare Rasterung, Vorfertigung und klimatische Hülle als industrieller Großraum lesbar.',
    'red-house': 'Red House wird über Backstein, Holz, Handwerksdetails, Dachkörper, Gartenbezug und häusliche Maßstäblichkeit gelesen; das Material widerspricht der glatten industriellen Warenform.',
    'cite-industrielle': 'Die Cité Industrielle besitzt ihr konstruktives Material als Zeichnungssystem: Industrie, Wohnen, Verkehr, Grünräume und öffentliche Bauten werden über klare Funktionszonen geordnet.',
    'garden-cities-of-tomorrow': 'Garden Cities of To-morrow arbeitet mit Diagramm, Grünring, Eisenbahn, gemeinschaftlichem Bodenbesitz und Nachbarschaftsmaßstab; sein Material ist das Reformmodell selbst.',
    '25b-avenue-franklin': '25bis Rue Franklin wird über Stahlbetonrahmen, zurückgesetzte Fassadenfelder, große Fenster, keramische Verkleidung und die Trennung von Tragwerk und Wohnteilung gelesen.',
    'warenhaus-wertheim': 'Warenhaus Wertheim verbindet Stahl- und Mauerwerksstruktur, große Schaufenster, Lichthöfe, Treppen und Fassadenrhythmus zu einer Architektur des modernen Konsums.',
    'fagus-factory': 'Das Fagus-Werk macht Stahlbetonskelett, Ziegelpfeiler, Glasflächen und die entmaterialisierte Ecke zu einem tektonischen Zeichen industrieller Modernität.',
    'dom-ino-house': 'Dom-Ino reduziert Architektur auf Stützen, Deckenplatten und Treppe; Material und Tragwerk werden zu einem offenen Skelett für variable Grundrisse.',
    'bauhaus-dessau': 'Das Bauhaus Dessau wird über Stahlbeton, Glasvorhangfassade, Werkstattflügel, Brücke, Schlafhaus und helle Innenräume als zusammengesetzte Maschine des Lernens lesbar.',
    'immeuble-rue-des-amiraux': 'Rue des Amiraux verbindet Stahlbeton, Wohnzellen, zentralen Baderaum, Hofraum und Blockkante; Wohnen und Infrastruktur werden in einem urbanen Körper verschaltet.',
    'voelkerbundspalast-competition': 'Der Völkerbundpalast-Wettbewerb wird über Repräsentation, Büroorganisation, Sitzungssäle, Landschaftskante und die Spannung zwischen klassischer Monumentalität und moderner Sachlichkeit gelesen.',
    'narkomfin-housing': 'Narkomfin verbindet Stahlbetonskelett, Maisonette-Typen, Gemeinschaftseinrichtungen, Dachterrasse und kollektive Erschließung zu einem sozialen Wohnapparat.',
    'hufeisensiedlung': 'Die Hufeisensiedlung arbeitet mit seriellen Mauerwerkswohnungen, Gartenparzellen, farbigen Fassaden, Straßenräumen und der Hufeisenfigur um Wasser und Grün.',
    'ville-radieuse': 'Ville Radieuse besitzt ihr Material als urbanes Diagramm aus Hochhauszeilen, Grünraum, Verkehrsbändern, Sonne, Luft und strikter funktionaler Ordnung.',
    'broadacre-city': 'Broadacre City wird über Parzelle, Straße, Auto, dezentralisierte Versorgung, Landschaft und Einzelhaus als flächiges Gegenmodell zur dichten Stadt gelesen.',
    'athens-charter': 'Die Charta von Athen ist kein Baukörper, sondern eine Regelstruktur aus Wohnen, Arbeiten, Erholung und Verkehr; ihr Material ist die funktionale Stadtanalyse.',
    'the-capitol': 'The Capitol wird über Licht, Kinosaal, Foyer, Großstadtfassade und technische Inszenierung gelesen; Architektur wird hier zum Apparat der Wahrnehmung.',
    'buerogebaeude-montecatini': 'Montecatini verbindet Stahlbeton, Naturstein, Glas, präzise Haustechnik, Treppenräume und Büroorganisation zu einer kontrollierten Architektur der Arbeit.',
    chandigarh: 'Chandigarh wird über Betonmonumente, Sektorenraster, breite Verkehrsachsen, Grünräume und die Capitol-Anlage gelesen; Stadt und Staatsrepräsentation fallen eng zusammen.',
    'unite-habitation': 'Die Unité d’Habitation verbindet Béton brut, Pilotis, innere Straßen, Maisonette-Wohnungen, Dachlandschaft und gemeinschaftliche Einrichtungen zu einem vertikalen Wohnkörper.',
    brasilia: 'Brasília arbeitet mit Betonmonumenten, Superquadras, Verkehrsachsen, weitem Landschaftsraum und skulpturalen Regierungsbauten als Material einer geplanten Hauptstadt.',
    'habitat-67': 'Habitat 67 wird über vorgefertigte Betonmodule, gestapelte Wohneinheiten, Terrassen, Brücken und Zwischenräume als dreidimensionaler Wohnteppich gelesen.',
    'new-babylon': 'New Babylon besitzt sein Material als Modell, Collage, Karte und spekulative Struktur; Raum wird als veränderbares Feld für Spiel, Mobilität und kollektives Leben entworfen.',
    'ibm-cosham': 'IBM Cosham verbindet flexible Büroflächen, Glasfassade, technische Infrastruktur und campusartige Arbeitsorganisation zu einer frühen Architektur der Informationsarbeit.',
    'delirious-new-york': 'Delirious New York ist ein theoretisches Material aus Raster, Dichte, Hochhaus, Programmstapelung und metropolitaner Fantasie; der Text liest Manhattan als architektonisches Labor.',
    'gas-works-park': 'Gas Works Park erhält industrielle Apparate, Betonfundamente, Erdmodellierung, Wiesen und Blickbeziehungen; Ruine und Park werden nicht getrennt, sondern ineinander überführt.',
    'willis-faber-and-dumas-office': 'Willis Faber & Dumas verbindet dunkle Glasfassade, flexible Büroflächen, Dachgarten, soziale Innenräume und Stadtblockkante zu einer offenen Arbeitslandschaft.',
    'centre-pompidou': 'Centre Pompidou legt Stahltragwerk, Rolltreppen, Lüftung, Farbcode, flexible Hallen und öffentlichen Vorplatz offen; Infrastruktur wird zur Fassade und zum Stadtereignis.'
  };
  if (!claims[entry.slug]) return null;
  return {
    short: compact(claims[entry.slug], 92),
    long: claims[entry.slug],
    basis: 'curated material reading'
  };
}

function tectonicFallback(entry, materials) {
  const materialText = materials.length ? materials.map(readableDe).slice(0, 3).join(', ') : 'Oberfläche, Tragstruktur und Fügung';
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
    'palazzo-medici-riccardi': 'Der Palazzo Medici Riccardi übersetzt Familienmacht in Stadtform: rustizierte Sockelzonen, hierarchische Fassade, Innenhof und Straßenkante bilden eine kontrollierte urbane Präsenz',
    'fortezza-di-palmanova': 'Palmanova macht Verteidigung zur Stadtfigur: Bastionen, Wälle, radiale Straßen und zentrale Piazza verschmelzen zu einer geometrischen Maschine aus Sicht, Bewegung und Kontrolle',
    'new-lanark-mills': 'New Lanark verbindet Fabrik, Wasserkraft, Arbeiterwohnen und Sozialreform zu einer Industriesiedlung, in der Produktion und Alltag räumlich aufeinander bezogen werden',
    'royal-observatory-greenwich': 'Das Observatorium in Greenwich macht Messung zu Architektur: Baukörper, Instrumente, Meridianlinie und Parktopografie ordnen Zeit, Blick und wissenschaftliche Autorität',
    'central-park': 'Central Park ist eine künstlich gebaute Landschaft im Raster Manhattans: Wege, Felsen, Wasser, Wiesen, Brücken und Baumräume erzeugen eine Gegenwelt zur dichten Stadt',
    familistere: 'Das Familistère ordnet Wohnen, Hof, Glasdach, Versorgung und kollektive Einrichtungen zu einem sozialen Innenraum, in dem Reform nicht Theorie bleibt, sondern Alltag organisiert',
    'barcelona-extension': 'Cerdàs Eixample liest Stadt als Infrastruktur: abgeschrägte Blöcke, breite Straßen, Innenhöfe, Bewegung und Hygiene bilden ein offenes System metropolitaner Erweiterung',
    'wien-ringstrasse': 'Die Wiener Ringstraße verwandelt die ehemalige Befestigungslinie in einen bürgerlichen Boulevard aus Institutionen, Parks, Repräsentationsfassaden und öffentlicher Bewegung',
    'emerald-necklace': 'Emerald Necklace verbindet Park, Wasserlauf, Entwässerung, Erholung und ökologische Reparatur zu einem metropolitanen Freiraumsystem',
    'linear-city': 'Die Linear City denkt Stadt entlang eines Verkehrsbandes: Transport, Parzellen, Versorgung und Siedlung wachsen nicht konzentrisch, sondern als lineares Infrastrukturmodell',
    'hotel-tassel': 'Hôtel Tassel verschiebt das Stadthaus ins Innere: Treppenhalle, Eisenstruktur, Glas, Ornament und Bewegung bilden einen zusammenhängenden räumlichen Fluss',
    'letchworth-garden-city': 'Letchworth übersetzt die Gartenstadtidee in eine geplante Siedlung aus Wohnen, Grünraum, Industrie, Gemeinschaftseinrichtungen und begrenztem Wachstum',
    'new-delhi': 'New Delhi ordnet Hauptstadt über Achsen, Monumente, Gartengerüste und ceremonielle Distanzen; Macht wird als Landschaft aus Straßen, Blicken und Verwaltungsbauten inszeniert',
    'welwyn-garden-city': 'Welwyn Garden City entwickelt das Gartenstadtmodell weiter: Nachbarschaften, Grünpuffer, Industrie, Zentrum und Landschaft werden als kontrollierte Stadtlandschaft zusammen gedacht',
    postsparkasse: 'Die Postsparkasse organisiert Verwaltung als modernen Prozessraum: Schalterhalle, Glasdach, Metallverkleidung, sichtbare Befestigungen und klare Wege übersetzen Bürokratie in Architektur',
    'karl-marx-hof': 'Der Karl-Marx-Hof macht kommunales Wohnen monumental: langer Block, Höfe, Tore, Gemeinschaftseinrichtungen und rote Wiener Stadtpolitik werden zu einer kollektiven Architekturfigur',
    'pyramids-of-giza': 'Die Pyramiden von Gizeh verbinden präzise Geometrie, monumentale Masse, Arbeitsorganisation und kosmische Orientierung zu einer dauerhaften Landschaft der Macht und des Jenseits',
    parthenon: 'Der Parthenon verdichtet Tempelordnung, Proportion, optische Korrektur und Akropolis-Topografie zu einem politischen Bild der Polis',
    'vitruvius-de-architectura': 'De architectura ordnet Bauwissen als Verhältnis von Festigkeit, Zweck und Schönheit; Architektur wird dadurch als lehrbares, technisches und kulturelles System formuliert',
    pantheon: 'Das Pantheon erzeugt Innenraum aus Kuppel, Zylinder, Oculus, Betonmasse und Lichtstrahl; der Raum erscheint zugleich konstruktiv, atmosphärisch und kosmisch geordnet',
    'hagia-sophia': 'Hagia Sophia übersetzt Kuppel, Pendentifs, Halbkuppeln, Licht und Liturgie in einen schwebend wirkenden Zentralraum imperialer Präsenz',
    'kloster-st-gallen': 'Der St. Galler Klosterplan ordnet Liturgie, Arbeit, Wissen, Versorgung und Gemeinschaft in einem idealisierten monastischen Grundriss',
    alhambra: 'Die Alhambra organisiert Palast, Hof, Wasser, Schatten, Ornament und Aussicht als feines klimatisches und symbolisches Raumgefüge',
    'hereford-mappa-mundi': 'Die Hereford Mappa Mundi zeichnet Welt nicht neutral, sondern theologisch: Zentrum, Rand, Geschichte, Ort und Bedeutung werden in einer kartografischen Ordnung verschränkt',
    'catalan-atlas': 'Der Catalan Atlas verbindet Navigation, Küstenwissen, Herrschaftsbilder und Handelsräume; Karte wird hier zum Instrument von Bewegung und Weltvorstellung',
    'brunelleschi-dome': 'Brunelleschis Kuppel verbindet doppelschalige Konstruktion, Bauprozess, Rippenlogik und Stadtbild zu einem technischen und symbolischen Wendepunkt der Renaissance',
    'city-in-layers': 'City in Layers denkt Stadt als geschichtete Ordnung: Bewegung, Wasser, Arbeit, Versorgung und Öffentlichkeit werden nicht nur im Plan, sondern im Schnitt organisiert',
    'palladio-four-books': 'Palladios Vier Bücher machen Architektur reproduzierbar: Proportion, Villa, Antike, Typus und Zeichnung werden zu einem übertragbaren Entwurfswissen',
    'sixtus-v-rome-plan': 'Rom unter Sixtus V. ordnet die Stadt über Sichtachsen, Obelisken, Pilgerwege und sakrale Knoten; Bewegung durch die Stadt wird zur räumlichen Dramaturgie',
    'versailles-gardens': 'Versailles formt Landschaft als Machtraum: Achse, Parterre, Wasser, Waldkanten und Blicktiefe übersetzen absolutistische Ordnung in begehbare Perspektive',
    'marc-antoine-laugier-primitive-hut': 'Laugiers Urhütte reduziert Architektur auf Stütze, Balken, Dach und Naturbezug; sie ist weniger Bauwerk als theoretisches Bild einer konstruktiven Herkunft',
    panopticon: 'Das Panopticon organisiert Macht durch Sichtbarkeit: Ring, Zelle, Zentrum und Blickachse machen Kontrolle zu einer räumlichen Figur',
    'crystal-palace': 'Crystal Palace verbindet Eisenraster, Glasfläche, modulare Fertigung, Ausstellung und kontrolliertes Klima zu einem frühen Raum der industriellen Moderne',
    'red-house': 'Red House organisiert Wohnen als handwerklich gegliedertes Haus mit Gartenbezug: Räume, Dachformen, Kaminzonen und Materialdetails bilden eine bewusste Gegenwelt zur anonymen Industrieware',
    'cite-industrielle': 'Die Cité Industrielle ordnet Stadt als Produktionslandschaft: Industrie, Arbeiterwohnen, Bildung, Gesundheit, Verkehr und Grünräume werden als zusammenhängendes rationales Stadtmodell gezeichnet',
    'garden-cities-of-tomorrow': 'Garden Cities of To-morrow denkt Stadt über Maß, Grenze und Beziehung: Zentrum, Wohnringe, Grüngürtel, Landwirtschaft und Bahnverbindungen vermitteln zwischen Metropole und Land',
    '25b-avenue-franklin': '25bis Rue Franklin nutzt das Betonskelett, um die Pariser Wohnparzelle neu zu organisieren: Fassadenrücksprünge, Licht, flexible Teilungen und vertikale Erschließung werden zu einem modernen Wohninstrument',
    'warenhaus-wertheim': 'Warenhaus Wertheim macht die Großstadt als Konsumraum sichtbar: Schaufenster, Lichthöfe, Treppen, Warenfluss und Straßenkante verbinden Öffentlichkeit und Innenwelt',
    'fagus-factory': 'Das Fagus-Werk verschiebt die Fabrik vom massiven Produktionsblock zum transparenten Arbeitsraum: Glasflächen, leichte Ecken und serielles Raster erzeugen ein neues industrielles Bild',
    'dom-ino-house': 'Dom-Ino ist weniger Haus als räumliches Prinzip: Stützen, Platten und Treppe trennen Tragwerk von Grundriss und eröffnen ein variables Feld moderner Architektur',
    'bauhaus-dessau': 'Das Bauhaus Dessau setzt verschiedene Lern- und Lebensbereiche als Baukörper zusammen: Werkstatt, Schule, Brücke, Bühne und Wohnhaus bilden eine räumliche Pädagogik der Moderne',
    'immeuble-rue-des-amiraux': 'Rue des Amiraux verdichtet Wohnblock und Badeanstalt: Der städtische Block wird nicht nur bewohnt, sondern mit kollektiver Infrastruktur räumlich aufgeladen',
    'voelkerbundspalast-competition': 'Der Völkerbundpalast-Wettbewerb zeigt Architektur als internationale Aushandlung: Verwaltung, Versammlung, Repräsentation und Landschaft werden zwischen Monument und Moderne verhandelt',
    'narkomfin-housing': 'Narkomfin organisiert Wohnen als sozialen Schnitt: private Zellen, kollektive Einrichtungen, Erschließung und Dachbereiche bilden ein Experiment zwischen Familie und Gemeinschaft',
    'hufeisensiedlung': 'Die Hufeisensiedlung verbindet Serienwohnen und Landschaft: Straßen, Gärten, Farbfassaden und die zentrale Hufeisenform geben Reformwohnen eine erkennbare städtebauliche Figur',
    'ville-radieuse': 'Ville Radieuse löst die traditionelle Straße zugunsten von Hochhauszeilen, Grünraum, Sonne und Verkehrsschichten auf; Stadt wird als funktional entmischtes Großdiagramm gelesen',
    'broadacre-city': 'Broadacre City zerlegt Stadt in Landschaft, Parzelle, Mobilität und Selbstversorgung; Dichte wird durch ein ausgedehntes Netz dezentraler Einheiten ersetzt',
    'athens-charter': 'Die Charta von Athen beschreibt Stadt als analytisches System: Wohnen, Arbeiten, Erholung und Verkehr werden getrennt, bewertet und als Planungsprogramm neu zusammengesetzt',
    'the-capitol': 'The Capitol inszeniert Kino als Großstadterfahrung: Fassade, Licht, Foyer und Saal führen Besucher von der Straße in eine technische Innenwelt der Projektion',
    'buerogebaeude-montecatini': 'Montecatini liest Büroarbeit als präzisen Ablauf: Fassade, Treppen, Erschließung, Arbeitsräume und technische Ausstattung bilden eine disziplinierte Organisation moderner Verwaltung',
    chandigarh: 'Chandigarh ordnet die neue Hauptstadt über Sektoren, Straßenhierarchie, Grünräume und Capitol-Komplex; die Stadt wird als offenes, klimatisch und politisch aufgeladenes Raster gelesen',
    'unite-habitation': 'Die Unité d’Habitation stapelt Wohnen, Erschließung, Versorgung und Dachnutzung zu einer vertikalen Nachbarschaft, in der der Wohnblock wie eine kleine Stadt funktioniert',
    brasilia: 'Brasília formt Hauptstadt über zwei große Achsen, Superquadras, monumentale Regierungsräume und weite Leere; Bewegung, Blick und Distanz werden zum eigentlichen Stadtmaterial',
    'habitat-67': 'Habitat 67 zerlegt den Wohnblock in stapelbare Einheiten: Jede Wohnung erhält Licht, Terrasse und Adresse, während das Ganze als dreidimensionale Nachbarschaft erscheint',
    'new-babylon': 'New Babylon entwirft keinen festen Ort, sondern ein offenes Netz von Plattformen und veränderbaren Räumen, in dem Arbeit durch Spiel, Drift und kollektive Aneignung ersetzt wird',
    'ibm-cosham': 'IBM Cosham organisiert Büroarbeit als flexible technische Landschaft: Glas, offene Geschosse, Infrastruktur und Arbeitsplätze bilden eine ruhige, veränderbare Ordnung',
    'delirious-new-york': 'Delirious New York liest Manhattan als Schnittmaschine: Raster, Parzelle, Wolkenkratzer und programmatische Stapelung erzeugen eine Kultur extremer Dichte',
    'gas-works-park': 'Gas Works Park verwandelt Industrie nicht in Kulisse, sondern in nutzbaren Landschaftsbestand: Hügel, Maschinenfragmente, Wege und Seeufer bilden eine neue öffentliche Topografie',
    'willis-faber-and-dumas-office': 'Willis Faber & Dumas biegt sich in die Stadt ein: Glasfassade, offenes Büro, Rolltreppen, Atrium und Dachgarten verbinden Arbeit mit urbanem Alltag',
    'centre-pompidou': 'Centre Pompidou kehrt das Museum nach außen: Erschließung, Technik, Tragwerk und Vorplatz machen Kultur als öffentliche Maschine sichtbar',
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
  const countryLabel = entry.country ? readableDe(entry.country) : '';
  const parts = [
    entry.context?.setting && readableDe(entry.context.setting),
    entry.context?.topography && readableDe(entry.context.topography),
    entry.city && countryLabel ? `${entry.city}, ${countryLabel}` : entry.city || countryLabel,
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
    ...(entry.database_tags ?? []).filter((tag) => !/^(source|rights|license|image|credit):/i.test(tag)),
    ...(entry.materials?.primary ?? []),
    ...(entry.themes ?? [])
  ];
  return [...new Set(tags)].slice(0, 8).map(readableDe).join(', ') || 'Tragwerk, Material, Kontext und Typologie';
}

function networkDna(entry) {
  const related = [
    ...(entry.themes ?? []),
    entry.style_sector,
    entry.program?.type,
    entry.program?.subtype,
    ...(entry.source_documents ?? [])
  ].filter(Boolean);
  const anchors = [...new Set(related)].slice(0, 6).map(readableDe);
  if (!anchors.length) {
    return `${entry.title} braucht noch eine präzisere Netzwerkzuordnung; vorerst wird es über Typ, Epoche, Material und Kontext mit verwandten Referenzen verglichen.`;
  }
  return `${entry.title} sitzt im Netzwerk von ${anchors.join(', ')}. Diese Einordnung beschreibt nicht nur Kategorien, sondern eine architektonische DNA aus Typus, Epoche, Material, Quelle und räumlicher Strategie.`;
}

function critiqueClaim(entry) {
  const critiqueTags = (entry.database_tags ?? [])
    .filter((tag) => /critique|risk|conflict|uncertain|needs|fragile|colonial|power|control|exclusion|copyright|rights/i.test(tag))
    .slice(0, 4)
    .map(stripTagPrefix)
    .map(readableDe);
  if (critiqueTags.length) {
    return `${entry.title} muss auch über ${critiqueTags.join(', ')} kritisch gelesen werden; diese Punkte markieren offene Spannungen statt fertige Werturteile.`;
  }
  return `${entry.title} braucht eine kritische Gegenfrage: Welche sozialen, politischen, ökologischen oder technischen Bedingungen machen die räumliche Ordnung erst möglich, und welche Kosten oder Ausschlüsse produziert sie?`;
}

function layerPotential(entry) {
  const analysisTypes = (entry.analysis_layers ?? [])
    .map((layer) => layer.analysis_type)
    .filter(Boolean)
    .slice(0, 6)
    .map(readableDe);
  const modelTypes = (entry.model_assets ?? [])
    .map((asset) => asset.model_type || asset.layer)
    .filter(Boolean)
    .slice(0, 6)
    .map(readableDe);
  const tags = (entry.database_tags ?? [])
    .filter((tag) => !/^(source|rights|license|image|credit):/i.test(tag))
    .slice(0, 6)
    .map(readableDe);
  const parts = [
    analysisTypes.length && `Analyseebenen: ${analysisTypes.join(', ')}`,
    modelTypes.length && `Modellpakete: ${modelTypes.join(', ')}`,
    tags.length && `Filtertags: ${tags.join(', ')}`
  ].filter(Boolean);
  if (!parts.length) {
    return `${entry.title} ist als KosmoData-Objekt noch im Aufbau; zuerst müssen Analyseebenen, Modell-Layer und belastbare Quellen präzisiert werden.`;
  }
  return `${entry.title} besitzt bereits verwertbare KosmoData-Anker: ${parts.join('; ')}.`;
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
    .filter((sentence) => !/(Blender|ArchiCAD|Datenbank|Database|Filter|Suchfilter|\bModell\b|\bLayer\b|Tragwerkslayer|Studienrekonstruktion|Quellenpläne|review|source|classification|context tags|R2|Upload)/i.test(sentence));
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
  const text = stripTagPrefix(readable(value));
  const dictionary = {
    building: 'Gebäude',
    urban_plan: 'Stadtplan',
    'urban plan': 'Stadtplan',
    landscape_project: 'Landschaftsprojekt',
    'landscape project': 'Landschaftsprojekt',
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
    megastructure: 'Megastruktur',
    housing: 'Wohnbau',
    cluster: 'Cluster',
    prefabrication: 'Vorfertigung',
    modular_housing: 'modularer Wohnbau',
    'modular housing': 'modularer Wohnbau',
    terraced_housing: 'Terrassenwohnen',
    'terraced housing': 'Terrassenwohnen',
    experimental_housing: 'experimentelles Wohnen',
    'experimental housing': 'experimentelles Wohnen',
    garden_apartment: 'Gartenwohnung',
    'garden apartment': 'Gartenwohnung',
    prefabricated_modular_garden_apartment_megastructure: 'vorgefertigte modulare Gartenwohn-Megastruktur',
    'prefabricated modular garden apartment megastructure': 'vorgefertigte modulare Gartenwohn-Megastruktur',
    classical_temple_and_polis_monument: 'klassischer Tempel und Polis-Monument',
    'classical temple and polis monument': 'klassischer Tempel und Polis-Monument',
    dorische_peripteral_temple_on_acropolis_with_sculptural_program: 'dorischer Peripteraltempel auf der Akropolis mit Skulpturenprogramm',
    'dorische peripteral temple on acropolis with sculptural program': 'dorischer Peripteraltempel auf der Akropolis mit Skulpturenprogramm',
    sacred_polis_acropolis_and_world_heritage_landmark: 'sakrale Polis-Akropolis und Welterbe-Ort',
    'sacred polis acropolis and world heritage landmark': 'sakrale Polis-Akropolis und Welterbe-Ort',
    acropolis_limestone_rock_above_athens: 'Kalksteinfelsen der Akropolis über Athen',
    'acropolis limestone rock above athens': 'Kalksteinfelsen der Akropolis über Athen',
    doric_peripteral_temple: 'dorischer Peripteraltempel',
    'doric peripteral temple': 'dorischer Peripteraltempel',
    classical_temple: 'klassischer Tempel',
    'classical temple': 'klassischer Tempel',
    dorisches_system: 'dorisches System',
    'dorisches system': 'dorisches System',
    akropolis_topos: 'Akropolis-Topos',
    'akropolis topos': 'Akropolis-Topos',
    polis_monument: 'Polis-Monument',
    'polis monument': 'Polis-Monument',
    pentelic_marble: 'pentelischer Marmor',
    'pentelic marble': 'pentelischer Marmor',
    stone_entablature: 'Steingebälk',
    'stone entablature': 'Steingebälk',
    post_and_lintel: 'Stütze-und-Balken-System',
    'post and lintel': 'Stütze-und-Balken-System',
    doric_order: 'dorische Ordnung',
    'doric order': 'dorische Ordnung',
    peristasis_cella_procession: 'Peristasis, Cella und Prozession',
    'peristasis cella procession': 'Peristasis, Cella und Prozession',
    fragmentation_restoration_restitution: 'Fragmentierung, Restaurierung und Restitution',
    'fragmentation restoration restitution': 'Fragmentierung, Restaurierung und Restitution',
    site_model: 'Site-Modell',
    'site model': 'Site-Modell',
    tectonics: 'Tektonik',
    turkey: 'Türkei',
    türkiye: 'Türkei',
    italy: 'Italien',
    greece: 'Griechenland',
    egypt: 'Ägypten',
    canada: 'Kanada',
    expo_67_site_and_modern_heritage_landmark: 'Expo-67-Areal und Denkmal der Moderne',
    'expo 67 site and modern heritage landmark': 'Expo-67-Areal und Denkmal der Moderne',
    artificial_peninsula_on_saint_lawrence_river: 'künstliche Halbinsel am Sankt-Lorenz-Strom',
    'artificial peninsula on saint lawrence river': 'künstliche Halbinsel am Sankt-Lorenz-Strom',
    low_poly_model: 'Low-Poly-Modell',
    'low poly model': 'Low-Poly-Modell',
    structure_model: 'Tragwerksmodell',
    'structure model': 'Tragwerksmodell',
    tectonic_model: 'Tektonikmodell',
    'tectonic model': 'Tektonikmodell',
    structure: 'Tragwerk',
    spatial_order: 'Raumordnung',
    'spatial order': 'Raumordnung',
    material_system: 'Materialsystem',
    'material system': 'Materialsystem',
    circulation: 'Erschließung',
    filter_classification: 'Filterklassifikation',
    'filter classification': 'Filterklassifikation',
    scalability_cost_maintenance: 'Skalierbarkeit, Kosten und Unterhalt',
    'scalability cost maintenance': 'Skalierbarkeit, Kosten und Unterhalt',
    prefabricated_reinforced_concrete_modules: 'vorgefertigte Stahlbetonmodule',
    'prefabricated reinforced concrete modules': 'vorgefertigte Stahlbetonmodule',
    concrete_box_structure: 'Betonbox-Tragstruktur',
    'concrete box structure': 'Betonbox-Tragstruktur',
    roof_gardens: 'Dachgärten',
    'roof gardens': 'Dachgärten',
    prefabricated_concrete: 'vorgefertigter Beton',
    'prefabricated concrete': 'vorgefertigter Beton',
    concrete_module: 'Betonmodul',
    'concrete module': 'Betonmodul',
    stacked_boxes: 'gestapelte Boxen',
    'stacked boxes': 'gestapelte Boxen',
    three_dimensional_matrix: 'dreidimensionale Matrix',
    'three dimensional matrix': 'dreidimensionale Matrix',
    flying_streets: 'schwebende Erschließungsstraßen',
    'flying streets': 'schwebende Erschließungsstraßen',
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
    renaissance_family_palazzo: 'Renaissance-Familienpalast',
    'renaissance family palazzo': 'Renaissance-Familienpalast',
    venetian_star_fort_city: 'venezianische Sternfestungsstadt',
    'venetian star fort city': 'venezianische Sternfestungsstadt',
    textile_mill_village_social_reform: 'Textilmühlensiedlung der Sozialreform',
    'textile mill village social reform': 'Textilmühlensiedlung der Sozialreform',
    observatory_timekeeping_meridian: 'Observatorium und Zeitmessungsbau',
    'observatory timekeeping meridian': 'Observatorium und Zeitmessungsbau',
    metropolitan_public_park: 'metropolitaner Volkspark',
    'metropolitan public park': 'metropolitaner Volkspark',
    industrial_social_utopia_housing: 'soziale Industriesiedlung',
    'industrial social utopia housing': 'soziale Industriesiedlung',
    eixample_grid_infrastructure: 'Eixample-Rasterinfrastruktur',
    'eixample grid infrastructure': 'Eixample-Rasterinfrastruktur',
    nineteenth_century_civic_ring: 'bürgerlicher Ringboulevard des 19. Jahrhunderts',
    'nineteenth century civic ring': 'bürgerlicher Ringboulevard des 19. Jahrhunderts',
    metropolitan_park_system: 'metropolitanes Parksystem',
    'metropolitan park system': 'metropolitanes Parksystem',
    linear_infrastructure_city: 'lineare Infrastrukturstadt',
    'linear infrastructure city': 'lineare Infrastrukturstadt',
    art_nouveau_townhouse: 'Art-Nouveau-Stadthaus',
    'art nouveau townhouse': 'Art-Nouveau-Stadthaus',
    reform_settlement_garden_city: 'reformerische Gartenstadt',
    'reform settlement garden city': 'reformerische Gartenstadt',
    colonial_ceremonial_capital_plan: 'kolonialer Hauptstadtplan',
    'colonial ceremonial capital plan': 'kolonialer Hauptstadtplan',
    second_generation_garden_city: 'Gartenstadt zweiter Generation',
    'second generation garden city': 'Gartenstadt zweiter Generation',
    modern_bureaucratic_service_building: 'moderner Verwaltungsbau',
    'modern bureaucratic service building': 'moderner Verwaltungsbau',
    red_vienna_superblock_housing: 'Superblock des Roten Wien',
    'red vienna superblock housing': 'Superblock des Roten Wien',
    temple: 'Tempel',
    treatise: 'Traktat',
    monastery_plan: 'Klosterplan',
    'monastery plan': 'Klosterplan',
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
    fortified_urban_landscape: 'befestigte Stadtlandschaft',
    'fortified urban landscape': 'befestigte Stadtlandschaft',
    industrial_heritage_village: 'industrielles Kulturerbe-Dorf',
    'industrial heritage village': 'industrielles Kulturerbe-Dorf',
    historic_scientific_landscape: 'historische Wissenschaftslandschaft',
    'historic scientific landscape': 'historische Wissenschaftslandschaft',
    dense_metropolitan_grid: 'dichtes metropolitanes Raster',
    'dense metropolitan grid': 'dichtes metropolitanes Raster',
    industrial_reform_settlement: 'industrielle Reformsiedlung',
    'industrial reform settlement': 'industrielle Reformsiedlung',
    metropolitan_expansion_grid: 'metropolitanes Erweiterungsraster',
    'metropolitan expansion grid': 'metropolitanes Erweiterungsraster',
    historic_capital_expansion: 'historische Hauptstadt-Erweiterung',
    'historic capital expansion': 'historische Hauptstadt-Erweiterung',
    metropolitan_open_space_system: 'metropolitanes Freiraumsystem',
    'metropolitan open space system': 'metropolitanes Freiraumsystem',
    madrid_reform_context: 'Madrider Reformkontext',
    'madrid reform context': 'Madrider Reformkontext',
    theoretical_corridor: 'theoretischer Korridor',
    'theoretical corridor': 'theoretischer Korridor',
    brussels_townhouse_fabric: 'Brüsseler Stadthausgefüge',
    'brussels townhouse fabric': 'Brüsseler Stadthausgefüge',
    urban_plot: 'städtische Parzelle',
    'urban plot': 'städtische Parzelle',
    planned_town: 'Planstadt',
    'planned town': 'Planstadt',
    capital_city_axis: 'Hauptstadtachse',
    'capital city axis': 'Hauptstadtachse',
    plateau_garden_city: 'Plateau-Gartenstadt',
    'plateau garden city': 'Plateau-Gartenstadt',
    vienna_civic_core: 'Wiener Stadtkern',
    'vienna civic core': 'Wiener Stadtkern',
    municipal_housing_landscape: 'kommunale Wohnlandschaft',
    'municipal housing landscape': 'kommunale Wohnlandschaft',
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
    palazzo: 'Palazzo',
    urban_power: 'städtische Macht',
    'urban power': 'städtische Macht',
    fortress_city: 'Festungsstadt',
    'fortress city': 'Festungsstadt',
    defense: 'Verteidigung',
    reform_city: 'Reformstadt',
    'reform city': 'Reformstadt',
    social_utopia: 'soziale Utopie',
    'social utopia': 'soziale Utopie',
    time: 'Zeit',
    synchronization: 'Synchronisierung',
    landscape_urbanism: 'Landschaftsurbanismus',
    'landscape urbanism': 'Landschaftsurbanismus',
    park_system: 'Parksystem',
    'park system': 'Parksystem',
    reform_housing: 'Wohnreform',
    'reform housing': 'Wohnreform',
    collective_living: 'kollektives Wohnen',
    'collective living': 'kollektives Wohnen',
    urban_expansion: 'Stadterweiterung',
    'urban expansion': 'Stadterweiterung',
    ring: 'Ring',
    linear_city: 'lineare Stadt',
    'linear city': 'lineare Stadt',
    art_nouveau: 'Art Nouveau',
    'art nouveau': 'Art Nouveau',
    threshold: 'Schwelle',
    interior: 'Interieur',
    garden_city: 'Gartenstadt',
    'garden city': 'Gartenstadt',
    capital_city: 'Hauptstadt',
    'capital city': 'Hauptstadt',
    colonial_urbanism: 'kolonialer Urbanismus',
    process_architecture: 'Prozessarchitektur',
    'process architecture': 'Prozessarchitektur',
    bureaucracy: 'Bürokratie',
    housing_reform: 'Wohnreform',
    'housing reform': 'Wohnreform',
    red_vienna: 'Rotes Wien',
    'red vienna': 'Rotes Wien',
    monument: 'Monument',
    labor: 'Arbeit',
    afterlife: 'Jenseits',
    order: 'Ordnung',
    proportion: 'Proportion',
    polis: 'Polis',
    firmitas: 'Festigkeit',
    utilitas: 'Nützlichkeit',
    venustas: 'Schönheit',
    dome: 'Kuppel',
    cosmos: 'Kosmos',
    liturgy: 'Liturgie',
    empire: 'Imperium',
    light: 'Licht',
    pendentive_dome: 'Pendentifkuppel',
    'pendentive dome': 'Pendentifkuppel',
    pendentive_dome_system: 'Pendentifkuppelsystem',
    'pendentive dome system': 'Pendentifkuppelsystem',
    semi_domes: 'Halbkuppeln',
    'semi domes': 'Halbkuppeln',
    byzantine_space: 'byzantinischer Raum',
    'byzantine space': 'byzantinischer Raum',
    longitudinal_central_hybrid: 'longitudinaler Zentralraum-Hybrid',
    'longitudinal central hybrid': 'longitudinaler Zentralraum-Hybrid',
    longitudinal_central_hybrid_with_pendentive_dome_and_semi_domes: 'longitudinaler Zentralraum-Hybrid mit Pendentifkuppel und Halbkuppeln',
    'longitudinal central hybrid with pendentive dome and semi domes': 'longitudinaler Zentralraum-Hybrid mit Pendentifkuppel und Halbkuppeln',
    imperial_basilica: 'imperiale Basilika',
    'imperial basilica': 'imperiale Basilika',
    sultanahmet_world_heritage_archaeological_park: 'Sultanahmet-Welterbe und archäologischer Park',
    'sultanahmet world heritage archaeological park': 'Sultanahmet-Welterbe und archäologischer Park',
    historic_peninsula_between_bosphorus_golden_horn_and_marmara: 'historische Halbinsel zwischen Bosporus, Goldenem Horn und Marmarameer',
    'historic peninsula between bosphorus golden horn and marmara': 'historische Halbinsel zwischen Bosporus, Goldenem Horn und Marmarameer',
    church_mosque_museum_monument: 'Kirche, Moschee, Museum und Monument',
    'church mosque museum monument': 'Kirche, Moschee, Museum und Monument',
    mosaic_light: 'Mosaiklicht',
    'mosaic light': 'Mosaiklicht',
    ottoman_transformation: 'osmanische Transformation',
    'ottoman transformation': 'osmanische Transformation',
    structural_reinforcement: 'strukturelle Verstärkung',
    'structural reinforcement': 'strukturelle Verstärkung',
    light_ring_floating_dome: 'Lichtring und schwebende Kuppel',
    'light ring floating dome': 'Lichtring und schwebende Kuppel',
    galleries_and_nave: 'Galerien und Hauptraum',
    'galleries and nave': 'Galerien und Hauptraum',
    religious_political_heritage_conflict: 'religiös-politischer Welterbe-Konflikt',
    'religious political heritage conflict': 'religiös-politischer Welterbe-Konflikt',
    pendentive_dome_layer_candidate: 'Pendentifkuppel-Layer',
    'pendentive dome layer candidate': 'Pendentifkuppel-Layer',
    light_and_mosaic_layer_candidate: 'Licht- und Mosaik-Layer',
    'light and mosaic layer candidate': 'Licht- und Mosaik-Layer',
    byzantine_dome: 'byzantinische Kuppel',
    'byzantine dome': 'byzantinische Kuppel',
    pendentive: 'Pendentif',
    central_space: 'Zentralraum',
    'central space': 'Zentralraum',
    mosque_conversion: 'Moscheeumbau',
    'mosque conversion': 'Moscheeumbau',
    heritage_conflict: 'Welterbe-Konflikt',
    'heritage conflict': 'Welterbe-Konflikt',
    brick_and_mortar_masonry: 'Ziegel- und Mörtelmauerwerk',
    'brick and mortar masonry': 'Ziegel- und Mörtelmauerwerk',
    marble_revetment: 'Marmorverkleidung',
    'marble revetment': 'Marmorverkleidung',
    gold_mosaic: 'Goldmosaik',
    'gold mosaic': 'Goldmosaik',
    gold_mosaic_surfaces: 'Goldmosaikflächen',
    'gold mosaic surfaces': 'Goldmosaikflächen',
    stone_and_marble_columns: 'Stein- und Marmorsäulen',
    'stone and marble columns': 'Stein- und Marmorsäulen',
    window_ring: 'Fensterkranz',
    'window ring': 'Fensterkranz',
    courtyard: 'Hof',
    ornament: 'Ornament',
    microclimate: 'Mikroklima',
    theocentric: 'theozentrisches Weltbild',
    construction: 'Konstruktion',
    city_image: 'Stadtbild',
    'city image': 'Stadtbild',
    engineering: 'Ingenieurbau',
    sectional_city: 'Schnittstadt',
    'sectional city': 'Schnittstadt',
    villa: 'Villa',
    classicism: 'Klassizismus',
    pilgrimage: 'Pilgerbewegung',
    absolutism: 'Absolutismus',
    landscape: 'Landschaft',
    control: 'Kontrolle',
    origin: 'Ursprung',
    nature: 'Natur',
    column: 'Säule',
    surveillance: 'Überwachung',
    institution: 'Institution',
    diagram: 'Diagramm',
    exhibition: 'Ausstellung',
    climate: 'Klima',
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
    mud_brick: 'Lehmziegel',
    'mud brick': 'Lehmziegel',
    roman_urbanism: 'römischer Urbanismus',
    'roman urbanism': 'römischer Urbanismus',
    forum: 'Forum',
    politics: 'Politik',
    thing_modernity: 'moderne Objektkultur',
    'thing modernity': 'moderne Objektkultur',
    arts_and_crafts: 'Arts and Crafts',
    'arts and crafts': 'Arts and Crafts',
    hygiene: 'Hygiene',
    workers: 'Arbeiterschaft',
    zoning: 'Zonierung',
    concrete_frame: 'Betonskelett',
    'concrete frame': 'Betonskelett',
    commerce: 'Konsum',
    factory: 'Fabrik',
    glass_corner: 'Glasecke',
    'glass corner': 'Glasecke',
    transparency: 'Transparenz',
    prototype: 'Prototyp',
    frame: 'Skelett',
    standardization: 'Standardisierung',
    school: 'Schule',
    workshop: 'Werkstatt',
    modern_pedagogy: 'moderne Pädagogik',
    'modern pedagogy': 'moderne Pädagogik',
    urban_block: 'Stadtblock',
    'urban block': 'Stadtblock',
    competition: 'Wettbewerb',
    modernism: 'Moderne',
    modern_housing: 'moderne Wohnreform',
    'modern housing': 'moderne Wohnreform',
    modern_urbanism: 'moderner Urbanismus',
    'modern urbanism': 'moderner Urbanismus',
    agrarian_city: 'agrarische Stadt',
    'agrarian city': 'agrarische Stadt',
    functional_city: 'funktionale Stadt',
    'functional city': 'funktionale Stadt',
    mobility: 'Mobilität',
    cinema: 'Kino',
    office: 'Büro',
    postcolonial_city: 'postkoloniale Stadt',
    'postcolonial city': 'postkoloniale Stadt',
    modulor: 'Modulor',
    freedom: 'Freiheit',
    play: 'Spiel',
    situationism: 'Situationismus',
    technology: 'Technologie',
    urban_theory: 'Stadttheorie',
    'urban theory': 'Stadttheorie',
    density: 'Dichte',
    metropolis: 'Metropole',
    ruin: 'Ruine',
    culture: 'Kultur',
    services: 'Haustechnik',
    exoskeleton: 'Exoskelett',
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
    paper: 'Papier',
    ink: 'Tinte',
    parchment: 'Pergament',
    engraving: 'Kupferstich',
    terracotta: 'Terrakotta',
    geometric_diagram: 'geometrisches Diagramm',
    'geometric diagram': 'geometrisches Diagramm',
    rusticated_stone: 'Rustikamauerwerk',
    'rusticated stone': 'Rustikamauerwerk',
    pietra_forte: 'Pietra forte',
    'pietra forte': 'Pietra forte',
    earthworks: 'Erdwerke',
    brick_masonry: 'Ziegelmauerwerk',
    'brick masonry': 'Ziegelmauerwerk',
    timber_floor: 'Holzboden',
    'timber floor': 'Holzboden',
    water_power_infrastructure: 'Wasserkraft-Infrastruktur',
    'water power infrastructure': 'Wasserkraft-Infrastruktur',
    scientific_instrumentation: 'wissenschaftliche Instrumente',
    'scientific instrumentation': 'wissenschaftliche Instrumente',
    rock_outcrop: 'Felsaufschluss',
    'rock outcrop': 'Felsaufschluss',
    soil: 'Boden',
    glass_roof: 'Glasdach',
    'glass roof': 'Glasdach',
    iron_structure: 'Eisenstruktur',
    'iron structure': 'Eisenstruktur',
    masonry_blocks: 'Mauerwerksblöcke',
    'masonry blocks': 'Mauerwerksblöcke',
    street_infrastructure: 'Straßeninfrastruktur',
    'street infrastructure': 'Straßeninfrastruktur',
    urban_paving: 'Stadtpflaster',
    'urban paving': 'Stadtpflaster',
    historicist_facades: 'historistische Fassaden',
    'historicist facades': 'historistische Fassaden',
    wetland_soil: 'Feuchtboden',
    'wetland soil': 'Feuchtboden',
    tram_corridor: 'Tramkorridor',
    'tram corridor': 'Tramkorridor',
    housing_plots: 'Wohnparzellen',
    'housing plots': 'Wohnparzellen',
    brick_housing: 'Ziegelwohnbauten',
    'brick housing': 'Ziegelwohnbauten',
    garden_landscape: 'Gartenlandschaft',
    'garden landscape': 'Gartenlandschaft',
    sandstone: 'Sandstein',
    stone_cladding: 'Steinverkleidung',
    'stone cladding': 'Steinverkleidung',
    aluminium: 'Aluminium',
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
  return dictionary[text] ?? dictionary[text.toLowerCase()] ?? text;
}

function stripTagPrefix(value) {
  return String(value ?? '').replace(/^(source|typology|material|structure|context|style|program|theme|rights|critique|risk|license|image|credit|spatial|topos|tectonic|heritage|blender|labor|knowledge|landscape):/i, '');
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
    .replaceAll('The Florentine palazzo is read through heavy rusticated Mauerwerk, hierarchical facade courses, courtyard order and urban power representation', 'Der Florentiner Palazzo wird über schweres Rustikamauerwerk, hierarchische Fassadenschichten, Hofordnung und städtische Machtrepräsentation gelesen')
    .replaceAll('Palmanova is an ideal fortress city where earthwork ramparts, bastions, radial streets and central piazza form one geometric defensive machine', 'Palmanova ist eine ideale Festungsstadt, in der Erdwerke, Bastionen, radiale Straßen und zentrale Piazza eine geometrische Verteidigungsmaschine bilden')
    .replaceAll('New Lanark is a mill village where Stein factory blocks, Wasser power, worker housing and reformist social infrastructure form an industrial settlement system', 'New Lanark ist eine Mühlensiedlung, in der steinerne Fabrikblöcke, Wasserkraft, Arbeiterwohnungen und reformerische soziale Infrastruktur ein industrielles Siedlungssystem bilden')
    .replaceAll('The observatory is infrastructure for time and measurement: Mauerwerk buildings, instruments, meridian line and landscape position over Greenwich Park', 'Das Observatorium ist Infrastruktur für Zeit und Messung: Mauerwerksbauten, Instrumente, Meridianlinie und die Lage über Greenwich Park bilden eine wissenschaftliche Raumordnung')
    .replaceAll('Central Park is a constructed urban landscape of earthwork, planting, Wasser bodies, rock outcrops, paths and bridge infrastructure', 'Central Park ist eine gebaute Stadtlandschaft aus Erdmodellierung, Pflanzung, Wasserflächen, Felsen, Wegen und Brückeninfrastruktur')
    .replaceAll('Central Park is a constructed urban landscape of earthwork, planting, water bodies, rock outcrops, paths and bridge infrastructure', 'Central Park ist eine gebaute Stadtlandschaft aus Erdmodellierung, Pflanzung, Wasserflächen, Felsen, Wegen und Brückeninfrastruktur')
    .replaceAll('The Familistère is a social-housing machine: Ziegel residential blocks, glazed courtyards and collective facilities organized around reformist living', 'Das Familistère ist eine Wohnmaschine der Sozialreform: Ziegelwohnblöcke, verglaste Höfe und kollektive Einrichtungen ordnen einen reformierten Alltag')
    .replaceAll('Cerdà’s Eixample is modeled as infrastructure and block logic: chamfered grid, street widths, courtyards, movement and hygienic reform', 'Cerdàs Eixample wird als Infrastruktur- und Blocklogik gelesen: abgeschrägtes Raster, Straßenbreiten, Höfe, Bewegung und hygienische Reform bilden ein offenes Stadtsystem')
    .replaceAll('Ringstrasse is a civic ring infrastructure: boulevard, institutions, public space, tram movement and historicist Stein facades around the former fortification line', 'Die Ringstraße ist eine bürgerliche Ringinfrastruktur: Boulevard, Institutionen, öffentlicher Raum, Trambewegung und historistische Steinfassaden besetzen die ehemalige Befestigungslinie')
    .replaceAll('The Emerald Necklace is landscape infrastructure: lTinteed parks, Wasserways, drainage, ecological repair and recreational public space', 'Emerald Necklace ist Landschaftsinfrastruktur: verbundene Parks, Wasserläufe, Entwässerung, ökologische Reparatur und öffentlicher Erholungsraum greifen ineinander')
    .replaceAll('Arturo Soria’s Linear City is an infrastructural urban theory: transport spine, housing plots and service bands extending settlement linearly', 'Arturo Sorias Linear City ist eine infrastrukturelle Stadttheorie: Verkehrsachse, Wohnparzellen und Versorgungsbänder lassen Siedlung linear wachsen')
    .replaceAll('Hôtel Tassel is a tectonic interior manifesto: iron/glass stair hall, Stein facade, flowing structure and ornamental material continuity', 'Hôtel Tassel ist ein tektonisches Interieurmanifest: Eisen-Glas-Treppenhalle, Steinfassade, fließende Struktur und ornamentale Materialkontinuität verbinden sich')
    .replaceAll('Letchworth is an implemented garden city: low-density housing, green belt, civic center, industry and landscape structure planned together', 'Letchworth ist eine gebaute Gartenstadt: lockeres Wohnen, Grüngürtel, Zentrum, Industrie und Landschaftsstruktur werden gemeinsam geplant')
    .replaceAll('New Delhi is read as imperial capital planning: axial geometry, sandStein civic monuments, ceremonial avenues and garden-city spatial devices', 'New Delhi wird als imperiale Hauptstadtplanung gelesen: axiale Geometrie, Sandsteinmonumente, ceremonielle Alleen und Gartenstadtmotive ordnen den Raum')
    .replaceAll('Welwyn Garden City develops the garden-city model with planned neighborhoods, landscape buffers, industry and civic center', 'Welwyn Garden City entwickelt das Gartenstadtmodell mit geplanten Nachbarschaften, Landschaftspuffern, Industrie und Zentrum weiter')
    .replaceAll('Postsparkasse is read through functional modernity: Stein/aluminium cladding, exposed fasteners, glass-roofed banking hall and process-oriented plan', 'Die Postsparkasse wird über funktionale Moderne gelesen: Stein- und Aluminiumverkleidung, sichtbare Befestigungen, glasgedeckte Kassenhalle und prozessorientierter Grundriss')
    .replaceAll('Karl-Marx-Hof is Red Vienna housing infrastructure: long perimeter block, monumental gateways, courtyards and collective services', 'Der Karl-Marx-Hof ist Wohninfrastruktur des Roten Wien: langer Randblock, monumentale Tore, Höfe und kollektive Einrichtungen bilden eine eigene Stadtfigur')
    .replaceAll('rusticated_Stein', 'Rustikamauerwerk')
    .replaceAll('Ziegel_Mauerwerk', 'Ziegelmauerwerk')
    .replaceAll('Holz_floor', 'Holzboden')
    .replaceAll('Wasser_power_infrastructure', 'Wasserkraft-Infrastruktur')
    .replaceAll('scientific_instrumentation', 'wissenschaftliche Instrumente')
    .replaceAll('rock_outcrop', 'Felsaufschluss')
    .replaceAll('glass_roof', 'Glasdach')
    .replaceAll('iron_structure', 'Eisenstruktur')
    .replaceAll('urban_grid', 'Stadtraster')
    .replaceAll('Mauerwerk_blocks', 'Mauerwerksblöcke')
    .replaceAll('street_infrastructure', 'Straßeninfrastruktur')
    .replaceAll('urban_paving', 'Stadtpflaster')
    .replaceAll('historicist_facades', 'historistische Fassaden')
    .replaceAll('wetland_soil', 'Feuchtboden')
    .replaceAll('tram_corridor', 'Tramkorridor')
    .replaceAll('housing_plots', 'Wohnparzellen')
    .replaceAll('Ziegel_housing', 'Ziegelwohnbauten')
    .replaceAll('garden_landscape', 'Gartenlandschaft')
    .replaceAll('sandStein', 'Sandstein')
    .replaceAll('Stein_cladding', 'Steinverkleidung')
    .replaceAll('Stein_edges', 'Steinkanten')
    .replaceAll('Stein_paving', 'Steinpflaster')
    .replaceAll('Holz_roof', 'Holzdach')
    .replaceAll('industrial_infrastructure', 'Industrieinfrastruktur')
    .replaceAll('earthworks', 'Erdwerke')
    .replaceAll('soil', 'Boden')
    .replaceAll('glass', 'Glas')
    .replaceAll('concrete', 'Beton')
    .replaceAll('aluminium', 'Aluminium')
    .replaceAll('pietra_forte', 'Pietra forte')
    .replaceAll('urban_axis', 'Stadtachse')
    .replaceAll('terrace_walls', 'Terrassenmauern')
    .replaceAll('geometric_diagram', 'geometrisches Diagramm')
    .replaceAll('Mauerwerk foundation', 'Mauerwerksfundament')
    .replaceAll('Stein Mauerwerk', 'Steinmauerwerk')
    .replaceAll('flying streets', 'schwebende Erschließungsstraßen');
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
