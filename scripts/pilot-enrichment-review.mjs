#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entriesPath = resolve(rootDir, 'data/mock-entries.json');
const outputRoot = resolve(rootDir, 'out/database-research');
const today = new Date().toISOString().slice(0, 10);

const pilots = [
  {
    id: 'villa-savoye',
    source_trail: [
      officialSource('Centre des monuments nationaux / Villa Savoye', 'https://www.villa-savoye.fr/'),
      officialSource('Fondation Le Corbusier / Villa Savoye', 'https://www.fondationlecorbusier.fr/oeuvre-architecture/realisations-villa-savoye-et-loge-du-jardinier-poissy-france-1928-1931/'),
      academicSource('UNESCO / The Architectural Work of Le Corbusier', 'https://whc.unesco.org/en/list/1321/')
    ],
    architecture_brief: {
      core_reading: 'Villa Savoye should be read as a condensed spatial manifesto rather than only as an isolated white villa. The object detaches itself from the ground through pilotis, receives the automobile as a spatial generator and turns circulation into a continuous architectural argument.',
      material_structure: 'The essential structural logic is a reinforced-concrete frame that separates support, enclosure and spatial organization. This enables the free plan, long ribbon windows and the roof garden as usable architectural surface rather than decorative cap.',
      spatial_order: 'The promenade architecturale is the entrys key system: automobile arrival, ramp, stair, salon, terrace and roof garden are organized as a controlled unfolding of views and sectional movement.',
      tectonics: 'The tectonic tension lies between abstract white rendered surfaces and the legible frame logic underneath. Facade, support and plan are conceptually separated, but visually held in a precise volumetric envelope.',
      context: 'The suburban Poissy site is not neutral background; the lawn, driveway loop and roof garden create a sequence from machine-age mobility to elevated landscape.',
      database_value: 'For Cosmos and Blender this is a reference prototype for modern frame logic, promenade, roof landscape and analytical decomposition into structure/facade/site/material layers.'
    },
    database_fields: {
      geo: { lat: 48.9243, lon: 2.0288, region: 'Ile-de-France', precision: 'site' },
      materials: {
        primary: ['reinforced_concrete', 'plaster', 'glass'],
        secondary: ['steel', 'roof_garden'],
        notes: 'Reinforced-concrete frame, rendered surfaces, ribbon glazing and roof garden as architectural system.'
      },
      program: { type: 'housing_single_family', subtype: 'modern_villa', public_access: 'public' },
      context: {
        topography: 'flat_suburban_site',
        setting: 'suburban_villa_landscape',
        heritage_context: ['unesco_world_heritage_component', 'listed_monument'],
        landscape_relation: ['driveway_loop', 'lawn', 'roof_garden']
      },
      vibes: ['machine-age villa', 'promenade', 'detached object', 'white frame manifesto']
    },
    model_3d_potential: {
      readiness: 'strong_analytical_reference',
      layers: ['full', 'structure', 'facade', 'site', 'material:reinforced_concrete', 'circulation_ramp', 'roof_garden'],
      source_basis: 'Public heritage pages, existing Cosmos diagrammatic reconstruction and later verified plan/section review.',
      blender_use: 'Reference for frame/free-plan decomposition, circulation path import, roof-garden layer and modern villa massing.',
      caution: 'Any exact plan-derived geometry should retain source notes; public model release requires review that geometry is an original analytical reconstruction.'
    },
    missing_questions: [
      'Verify exact public-domain or licensed plan sources before making plan-based geometry public.',
      'Separate restored-present condition from 1931 analytical dataset in model metadata.'
    ]
  },
  {
    id: 'alterszentrum-kloster-ingenbohl',
    source_trail: [
      officeSource('Boltshauser Architekten / Alterszentrum Kloster Ingenbohl', 'https://boltshauser.info/projekt/alterszentrum-kloster-ingenbohl/'),
      officialSource('Kloster Ingenbohl / Neues Alterszentrum St. Josef', 'https://www.kloster-ingenbohl.ch/neues-alterszentrum-st-josef/'),
      specialistSource('Schnetzer Puskas / Alterszentrum Kloster Ingenbohl', 'https://www.schnetzerpuskas.com/de/projekte/3705-alterszentrum-kloster-ingenbohl')
    ],
    architecture_brief: {
      core_reading: 'The Ingenbohl project is important as a contemporary Swiss case of institutional care inserted into a monastery landscape. It is not only a care building but a negotiation between continuity, enclosure, material atmosphere and the social rhythm of an existing religious setting.',
      material_structure: 'The current Cosmos reading identifies reinforced concrete, timber, lime/clay plaster, trass-lime elements and existing masonry. The architectural value lies in how mineral surfaces and timber elements mediate between robust care infrastructure and the calmer material world of the monastery.',
      spatial_order: 'The square/courtyard logic is the decisive organizer: it gives a legible care typology, short circulation, protected exterior relation and a collective inner world.',
      tectonics: 'The tectonic question is the old-new interface: how new structure, surface and facade depth meet existing fabric and landscape edge without becoming either imitation or autonomous object.',
      context: 'The monastery hill, village center and lake-region setting matter as much as the building envelope. The project should be tagged through topography, institution, care and heritage context.',
      database_value: 'For Cosmos and Blender this is a key pilot for Swiss adaptive reuse, care architecture, mineral/timber material filters and old-new tectonic layer separation.'
    },
    database_fields: {
      geo: { lat: 46.9997, lon: 8.6136, canton: 'SZ', region: 'Innerschweiz', precision: 'site' },
      materials: {
        primary: ['concrete', 'timber', 'lime_plaster', 'clay_plaster', 'existing_masonry'],
        stone_type: ['trass_lime'],
        secondary: ['mineral_render', 'roof_garden'],
        notes: 'Verify final material specification against office/project documents before public detail claims.'
      },
      program: { type: 'care', subtype: 'elderly_care_monastery_conversion', public_access: 'restricted' },
      context: {
        topography: 'hilltop',
        setting: 'village_center',
        heritage_context: ['monastery_context', 'existing_fabric'],
        landscape_relation: ['monastery_hill', 'courtyard', 'lake_region']
      },
      vibes: ['mineral calm', 'monastery care', 'old-new interface', 'courtyard institution']
    },
    model_3d_potential: {
      readiness: 'good_private_research_pilot',
      layers: ['full', 'structure', 'site', 'material:timber', 'material:concrete', 'material:lime_plaster', 'heritage_context'],
      source_basis: 'Office/public project metadata plus private plan/image review later; public release requires rights-safe reconstruction.',
      blender_use: 'Reference for care typology, courtyard organization, old-new material interface and Swiss hilltop institutional context.',
      caution: 'Photographs/plans from publications remain link-only unless licensed; generated model should distinguish approximate massing from verified geometry.'
    },
    missing_questions: [
      'Confirm whether public office page provides enough plan/section information for a verified model layer.',
      'Check if the monastery ensemble has official inventory records useful for heritage tags.'
    ]
  },
  {
    id: 'mfo-park',
    source_trail: [
      officialSource('Stadt Zürich / MFO-Park', 'https://www.stadt-zuerich.ch/de/stadtleben/sport-und-erholung/park-und-gruenanlagen/mfo-park.html'),
      officeSource('Burckhardt / MFO-Park, Zürich', 'https://burckhardt.swiss/en/project/mfo-park-zurich/'),
      specialistSource('Basler & Hofmann / MFO Park steel structure greening', 'https://www.baslerhofmann.ch/en/reference/mfo-park-zurich-oerlikon-steel-structure-greening')
    ],
    architecture_brief: {
      core_reading: 'MFO-Park is a landscape-architectural building: a public open space whose main spatial instrument is an industrial-scale planted frame. It converts the memory of machine production into a climatic and social structure.',
      material_structure: 'The project depends on a steel scaffold, climbing vegetation and time. Its architectural material is not simply greenery but the changing relation between frame, seasonal growth, shade, void and public occupation.',
      spatial_order: 'Instead of a conventional park field, MFO-Park uses a volumetric trellis as a room. It has interior-like spatial depth, vertical surfaces, balconies/perches and a civic ground plane.',
      tectonics: 'Its tectonics are exposed and processual: steel is the permanent skeleton, vegetation is the living envelope, and the park matures through growth rather than through finished facade treatment.',
      context: 'The park belongs to Zürich Nord/Oerlikon redevelopment and should be read as urban repair after industrial transformation.',
      database_value: 'For Cosmos this is a key bridge between landscape project, infrastructure memory, public room and material/time-based architecture.'
    },
    database_fields: {
      geo: { lat: 47.4122, lon: 8.5394, canton: 'ZH', region: 'Zuerich Nord', precision: 'site' },
      materials: {
        primary: ['steel', 'vegetation', 'climbing_plants'],
        secondary: ['industrial_frame', 'public_landscape'],
        notes: 'Steel trellis and plant growth form a time-based spatial envelope.'
      },
      program: { type: 'public_space', subtype: 'urban_park', public_access: 'public' },
      context: {
        topography: 'flat_urban_site',
        setting: 'urban_redevelopment',
        heritage_context: ['industrial_reuse'],
        landscape_relation: ['climate_landscape', 'urban_repair', 'seasonal_growth']
      },
      vibes: ['green machine hall', 'urban trellis', 'seasonal room', 'industrial memory']
    },
    model_3d_potential: {
      readiness: 'strong_spatial_frame_reference',
      layers: ['site', 'structure', 'material:steel', 'material:vegetation', 'growth_phase', 'public_ground'],
      source_basis: 'Public city/office sources and existing Cosmos landscape reading; geometric precision should be checked against plans if available.',
      blender_use: 'Reference for landscape-as-building, green scaffold, seasonal envelope and public-space section.',
      caution: 'Vegetation geometry should be procedural/interpretive unless measured data exists.'
    },
    missing_questions: [
      'Find rights-safe plan/section source or office permission for exact trellis geometry.',
      'Decide how to encode vegetation growth phases in Blender layers.'
    ]
  },
  {
    id: 'high-line',
    source_trail: [
      officialSource('The High Line / Official History and Park Information', 'https://www.thehighline.org/'),
      officeSource('Diller Scofidio + Renfro / The High Line', 'https://dsrny.com/project/the-high-line'),
      officeSource('Field Operations / The High Line', 'https://www.fieldoperations.net/project/high-line')
    ],
    architecture_brief: {
      core_reading: 'The High Line is a linear public landscape produced from obsolete infrastructure. Its importance is in the shift from rail logistics to choreographed urban experience, where movement, planting and elevated section become an architectural system.',
      material_structure: 'The retained rail viaduct provides the structural datum. Concrete planks, steel infrastructure, planting and fragments of rail memory are layered to make an adaptive landscape rather than erase the industrial support.',
      spatial_order: 'The project is organized as sequence rather than object: entries, overlooks, narrowed passages, widened rooms and planting bands create urban episodes along a continuous elevated path.',
      tectonics: 'The tectonic idea is peel-up and interweaving: hard paving and soft planting interlock, suggesting that landscape grows from the infrastructure rather than being placed on top of it.',
      context: 'Its urban setting is central: West Side redevelopment, property pressure, tourism, civic landscape and industrial memory are inseparable from the design.',
      database_value: 'For Cosmos and Blender it is a reference for adaptive reuse, linear section, infrastructure landscape, public-space choreography and vegetation/structure filters.'
    },
    database_fields: {
      geo: { lat: 40.748, lon: -74.005, region: 'New York City', precision: 'site' },
      materials: {
        primary: ['steel', 'concrete', 'vegetation'],
        secondary: ['rail_infrastructure', 'paving'],
        notes: 'Elevated rail structure, concrete plank system and planting matrix as adaptive public landscape.'
      },
      program: { type: 'public_space', subtype: 'linear_park', public_access: 'public' },
      context: {
        topography: 'elevated_infrastructure',
        setting: 'urban_dense',
        heritage_context: ['industrial_reuse', 'rail_infrastructure'],
        landscape_relation: ['linear_landscape', 'urban_redevelopment', 'elevated_walk']
      },
      vibes: ['linear reuse', 'urban balcony', 'rail ecology', 'choreographed walk']
    },
    model_3d_potential: {
      readiness: 'strong_site_section_reference',
      layers: ['site', 'structure', 'material:steel', 'material:concrete', 'material:vegetation', 'circulation_path', 'urban_context'],
      source_basis: 'Official park and office sources plus later verified sectional references; public model should remain analytical and non-literal unless geometry rights are clear.',
      blender_use: 'Reference for elevated public-space section, adaptive reuse and linear urban sequence.',
      caution: 'Exact urban geometry and current surrounding context should be sourced from open geodata with attribution, not from protected drawings.'
    },
    missing_questions: [
      'Separate phase/year metadata because the High Line opened in sections.',
      'Clarify whether Blender import should include immediate buildings or only infrastructure/landscape layer.'
    ]
  },
  {
    id: 'gobekli-tepe',
    source_trail: [
      officialSource('UNESCO / Gobekli Tepe', 'https://whc.unesco.org/en/list/1572/'),
      academicSource('German Archaeological Institute / Göbekli Tepe research context', 'https://www.dainst.org/'),
      academicSource('DAI / Göbekli Tepe fieldwork and research', 'https://www.dainst.org/en/research/projects/noslug/1934')
    ],
    architecture_brief: {
      core_reading: 'Göbekli Tepe is a deep-time anchor for Cosmos because it shifts architecture before settled urbanism: monumental enclosure, carved stone, ritual gathering and landscape position appear before conventional city or domestic typology.',
      material_structure: 'The primary architectural material is worked limestone. T-shaped monoliths, circular/oval enclosures and stone walls define space through mass, carving and arrangement rather than through roofed building systems.',
      spatial_order: 'The site is organized as repeated enclosures with central and perimeter pillars. The architectural question is not plan as habitation but plan as ritual concentration and symbolic ordering.',
      tectonics: 'Its tectonics are megalithic and subtractive/additive at once: quarrying, shaping, carving, erecting and embedding stones into enclosure walls.',
      context: 'The hilltop/limestone plateau setting is crucial. The monument relates to visibility, gathering and landscape rather than to urban street fabric.',
      database_value: 'For Cosmos it is an origin-point for monumentality, stone construction, ritual space and pre-urban collective architecture.'
    },
    database_fields: {
      geo: { lat: 37.2231, lon: 38.9226, region: 'Sanliurfa', precision: 'site' },
      materials: {
        primary: ['limestone', 'megalithic_stone'],
        stone_type: ['limestone'],
        secondary: ['carved_relief'],
        notes: 'Worked limestone pillars and enclosure walls; archaeological interpretation continues to evolve.'
      },
      program: { type: 'ritual_site', subtype: 'prehistoric_megalithic_enclosure', public_access: 'public' },
      context: {
        topography: 'hilltop',
        setting: 'rural_archaeological_landscape',
        heritage_context: ['unesco_world_heritage_site', 'archaeological_site'],
        landscape_relation: ['limestone_plateau', 'ritual_landscape', 'deep_time']
      },
      vibes: ['deep time', 'ritual enclosure', 'megalithic threshold', 'pre-urban monument']
    },
    model_3d_potential: {
      readiness: 'cautious_archaeological_reference',
      layers: ['site', 'structure', 'material:limestone', 'enclosure_rings', 'central_pillars', 'relief_annotations'],
      source_basis: 'UNESCO/official/academic references plus archaeological plans only when rights and interpretation status are clear.',
      blender_use: 'Reference for ritual enclosure, megalithic stone ordering, topographic placement and deep-time monumentality.',
      caution: 'Avoid presenting speculative reconstruction as verified; every model layer should mark confidence and interpretation date.'
    },
    missing_questions: [
      'Find openly licensed archaeological plan/diagram sources or keep geometry schematic.',
      'Add interpretation confidence per enclosure because research status changes over time.'
    ]
  }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const entries = JSON.parse(await readFile(entriesPath, 'utf8'));
  const outputDir = resolve(outputRoot, today, 'deep-pilot-batch');
  await mkdir(outputDir, { recursive: true });

  const packs = pilots.map((pilot) => buildPack(pilot, entries));
  const validation = validatePacks(packs);

  for (const pack of packs) {
    const entryDir = resolve(outputDir, pack.entry.id);
    await mkdir(entryDir, { recursive: true });
    await writeFile(resolve(entryDir, 'review-pack.json'), `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
    await writeFile(resolve(entryDir, 'review-pack.md'), renderPackMarkdown(pack), 'utf8');
  }

  const summary = {
    generated_at: new Date().toISOString(),
    mode: 'deep_pilot_review_packs_only',
    writes_database: false,
    public_safe: true,
    pilot_count: packs.length,
    pilots: packs.map((pack) => ({
      id: pack.entry.id,
      title: pack.entry.title,
      readiness: pack.review_status.readiness,
      source_count: pack.source_trail.length,
      output: `out/database-research/${today}/deep-pilot-batch/${pack.entry.id}/review-pack.md`
    })),
    validation
  };

  await writeFile(resolve(outputDir, 'batch-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDir, 'batch-summary.md'), renderSummaryMarkdown(summary), 'utf8');

  console.log('Architecture Cosmos Deep Pilot Enrichment');
  console.log(`Output: ${relativeToRoot(outputDir)}`);
  console.log(`Pilots: ${packs.length}`);
  console.log(`Validation: ${validation.passed ? 'passed' : 'failed'}`);
  for (const pack of packs) {
    console.log(`- ${pack.entry.id}: ${pack.source_trail.length} sources, ${pack.review_status.readiness}`);
  }

  if (!validation.passed) {
    validation.errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  }
}

function buildPack(pilot, entries) {
  const entry = entries.find((candidate) => candidate.id === pilot.id || candidate.slug === pilot.id);
  if (!entry) throw new Error(`Entry not found: ${pilot.id}`);

  const existing = {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    year_start: entry.year_start,
    year_end: entry.year_end,
    authors: entry.authors,
    city: entry.city,
    country: entry.country,
    entry_type: entry.entry_type,
    style_sector: entry.style_sector,
    themes: entry.themes,
    source_quality: entry.source_quality,
    source_url: entry.source_url,
    source_documents: entry.source_documents ?? [],
    existing_geo: entry.geo ?? null,
    existing_materials: entry.materials ?? null,
    existing_program: entry.program ?? null,
    existing_context: entry.context ?? null,
    existing_model_3d: entry.model_3d ?? null,
    existing_analysis_layers: entry.analysis_layers?.length ?? 0,
    existing_media_slots: entry.media?.map((item) => ({
      type: item.type,
      label: item.label,
      license: item.license ?? 'not_set',
      has_url: Boolean(item.url)
    })) ?? []
  };

  return {
    generated_at: new Date().toISOString(),
    mode: 'review_pack_only',
    writes_database: false,
    public_safe: true,
    entry: existing,
    source_trail: pilot.source_trail.map((source, index) => ({ priority: index + 1, ...source })),
    architecture_brief: pilot.architecture_brief,
    database_fields: pilot.database_fields,
    model_3d_potential: pilot.model_3d_potential,
    rights_notes: {
      public_display_allowed_now: false,
      public_safe_data: ['own written summaries', 'metadata', 'tags', 'links', 'rights-reviewed official facts'],
      link_only_or_private: ['publication images', 'plans', 'sections', 'screenshots', 'unclear office/media assets'],
      publication_rule: 'Do not republish media or exact plan-derived assets until rights are own_work, licensed or public_domain.'
    },
    missing_questions: pilot.missing_questions,
    review_status: {
      readiness: inferReadiness(pilot),
      minimum_sources_met: pilot.source_trail.length >= 3,
      required_brief_sections_met: hasRequiredBriefSections(pilot.architecture_brief),
      database_write_allowed: false,
      next_step: 'Manual review, then selectively promote safe fields into data/mock-entries.json.'
    }
  };
}

function validatePacks(packs) {
  const errors = [];
  for (const pack of packs) {
    if (pack.source_trail.length < 3) errors.push(`${pack.entry.id}: fewer than 3 sources`);
    if (!pack.review_status.required_brief_sections_met) errors.push(`${pack.entry.id}: missing required architecture brief sections`);
    if (!pack.database_fields.geo || !pack.database_fields.materials || !pack.database_fields.program || !pack.database_fields.context) {
      errors.push(`${pack.entry.id}: missing required database field proposal`);
    }
    if (!pack.model_3d_potential.layers?.length) errors.push(`${pack.entry.id}: missing model layers`);
  }

  return {
    passed: errors.length === 0,
    errors
  };
}

function hasRequiredBriefSections(brief) {
  return ['core_reading', 'material_structure', 'spatial_order', 'tectonics', 'context', 'database_value'].every((key) => Boolean(brief[key]));
}

function inferReadiness(pilot) {
  if (pilot.model_3d_potential.readiness.includes('strong')) return 'strong_review_candidate';
  if (pilot.model_3d_potential.readiness.includes('good')) return 'good_review_candidate';
  return 'needs_source_review';
}

function officialSource(name, url) {
  return {
    name,
    url,
    source_type: 'official_project_or_institutional_source',
    reliability: 'high',
    rights_status: 'metadata_link_only_until_file_level_rights',
    public_use: 'facts_links_own_summary'
  };
}

function officeSource(name, url) {
  return {
    name,
    url,
    source_type: 'office_or_designer_source',
    reliability: 'high',
    rights_status: 'link_only_unless_explicit_license',
    public_use: 'facts_links_own_summary'
  };
}

function academicSource(name, url) {
  return {
    name,
    url,
    source_type: 'academic_or_heritage_source',
    reliability: 'high',
    rights_status: 'record_level_review_required',
    public_use: 'facts_links_own_summary'
  };
}

function specialistSource(name, url) {
  return {
    name,
    url,
    source_type: 'specialist_engineering_or_project_source',
    reliability: 'high',
    rights_status: 'link_only_unless_explicit_license',
    public_use: 'technical_facts_links_own_summary'
  };
}

function renderPackMarkdown(pack) {
  const lines = [
    `# Deep Review Pack: ${pack.entry.title}`,
    '',
    `Generated: ${pack.generated_at}`,
    `Mode: \`${pack.mode}\``,
    `Database write: \`${pack.writes_database}\``,
    `Readiness: \`${pack.review_status.readiness}\``,
    '',
    '> This pack is public-safe research review material. It does not publish media, upload assets or edit the live entry.',
    '',
    '## Existing Entry',
    '',
    `- ID: \`${pack.entry.id}\``,
    `- Year: ${pack.entry.year_start}`,
    `- Authors: ${pack.entry.authors.join(', ')}`,
    `- Place: ${[pack.entry.city, pack.entry.country].filter(Boolean).join(', ')}`,
    `- Type/style: \`${pack.entry.entry_type}\` / \`${pack.entry.style_sector}\``,
    `- Current themes: ${pack.entry.themes.join(', ')}`,
    '',
    '## Source Trail',
    ''
  ];

  for (const source of pack.source_trail) {
    lines.push(`- ${source.priority}. **${source.name}** — ${source.url}  `);
    lines.push(`  Reliability: \`${source.reliability}\`; rights: \`${source.rights_status}\`; use: ${source.public_use}`);
  }

  lines.push('', '## Architecture Brief', '');
  for (const [key, value] of Object.entries(pack.architecture_brief)) {
    lines.push(`### ${titleCase(key)}`, '', value, '');
  }

  lines.push('## Proposed Database Fields', '');
  lines.push('```json');
  lines.push(JSON.stringify(pack.database_fields, null, 2));
  lines.push('```', '');

  lines.push('## 3D / Blender Potential', '');
  lines.push(`- Readiness: \`${pack.model_3d_potential.readiness}\``);
  lines.push(`- Layers: ${pack.model_3d_potential.layers.map((layer) => `\`${layer}\``).join(', ')}`);
  lines.push(`- Source basis: ${pack.model_3d_potential.source_basis}`);
  lines.push(`- Blender use: ${pack.model_3d_potential.blender_use}`);
  lines.push(`- Caution: ${pack.model_3d_potential.caution}`);
  lines.push('');

  lines.push('## Rights Notes', '');
  lines.push(`- Public display allowed now: \`${pack.rights_notes.public_display_allowed_now}\``);
  lines.push(`- Safe: ${pack.rights_notes.public_safe_data.join(', ')}`);
  lines.push(`- Link-only/private: ${pack.rights_notes.link_only_or_private.join(', ')}`);
  lines.push(`- Rule: ${pack.rights_notes.publication_rule}`);
  lines.push('');

  lines.push('## Missing Questions', '');
  for (const question of pack.missing_questions) {
    lines.push(`- ${question}`);
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function renderSummaryMarkdown(summary) {
  const lines = [
    '# Deep Pilot Batch Summary',
    '',
    `Generated: ${summary.generated_at}`,
    `Mode: \`${summary.mode}\``,
    `Database write: \`${summary.writes_database}\``,
    `Public-safe: \`${summary.public_safe}\``,
    `Validation: \`${summary.validation.passed ? 'passed' : 'failed'}\``,
    '',
    '## Pilots',
    ''
  ];

  for (const pilot of summary.pilots) {
    lines.push(`- **${pilot.title}** (\`${pilot.id}\`): ${pilot.source_count} sources, \`${pilot.readiness}\`  `);
    lines.push(`  ${pilot.output}`);
  }

  if (summary.validation.errors.length) {
    lines.push('', '## Validation Errors', '');
    for (const error of summary.validation.errors) lines.push(`- ${error}`);
  }

  return `${lines.join('\n')}\n`;
}

function titleCase(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
