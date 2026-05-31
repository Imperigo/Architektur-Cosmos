import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const entriesPath = path.join(root, 'data/mock-entries.json');
const relationsPath = path.join(root, 'data/relations.json');
const outDir = path.join(root, 'out/database-pilot-quality');

const defaultPilotSlugs = [
  'villa-savoye',
  'alterszentrum-kloster-ingenbohl',
  'mfo-park',
  'high-line',
  'gobekli-tepe'
];

const frameworkTerms = [
  { id: 'network', label: 'Netzwerk / DNA', terms: ['netz', 'relation', 'verwandt', 'typologisch', 'dna', 'vergleich', 'kanon', 'linie'] },
  { id: 'topos', label: 'Topos', terms: ['topos', 'ort', 'landschaft', 'stadt', 'kontext', 'terrain', 'plateau', 'infrastruktur'] },
  { id: 'typos', label: 'Typos', terms: ['typos', 'typologie', 'programm', 'wohn', 'park', 'ritual', 'pflege', 'oeffentlich', 'raumordnung'] },
  { id: 'tectonics', label: 'Tektonik', terms: ['tektonik', 'tragwerk', 'struktur', 'material', 'konstruktion', 'fuge', 'stuetze', 'huelle'] },
  { id: 'model_value', label: 'Modellwert', terms: ['modell', '3d', 'layer', 'blender', 'schnitt', 'plan', 'geometrie', 'analyse'] }
];

async function main() {
  const requestedSlugs = readArgList('--entries') ?? defaultPilotSlugs;
  const entries = JSON.parse(await fs.readFile(entriesPath, 'utf8'));
  const relations = JSON.parse(await fs.readFile(relationsPath, 'utf8'));
  const relationCounts = countRelations(relations);
  const rows = await Promise.all(requestedSlugs.map((slug) => auditEntry(slug, entries, relationCounts)));
  const summary = summarize(rows);

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'pilot-quality.json'), `${JSON.stringify({ generated_at: new Date().toISOString(), summary, rows }, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, 'pilot-quality.md'), renderMarkdown(summary, rows));

  console.log('Architecture Cosmos pilot quality audit');
  console.log(`Pilots: ${rows.length}`);
  console.log(`Average score: ${summary.average_score}%`);
  console.log(`Ready: ${summary.ready}`);
  console.log(`Review: ${summary.review}`);
  console.log(`Needs work: ${summary.needs_work}`);
  console.log('Report: out/database-pilot-quality/pilot-quality.md');

  if (rows.some((row) => row.status === 'needs_work')) {
    process.exitCode = 1;
  }
}

function readArgList(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value) return null;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

async function auditEntry(slug, entries, relationCounts) {
  const entry = entries.find((item) => item.slug === slug || item.id === slug);
  if (!entry) {
    return {
      slug,
      title: slug,
      status: 'needs_work',
      score: 0,
      checks: [{ id: 'entry', label: 'Eintrag vorhanden', score: 0, note: 'Nicht gefunden.' }],
      missing: ['entry']
    };
  }

  const reviewPack = await loadTextReviewPack(entry.slug);
  const reviewNetworkBasis = reviewPack?.network_basis;
  const textBlob = [
    entry.one_sentence,
    entry.short_description,
    entry.full_description,
    entry.architecture_text?.headline,
    entry.architecture_text?.overview,
    ...(entry.architecture_text?.chapters?.map((chapter) => `${chapter.title} ${chapter.body}`) ?? []),
    reviewPack?.overview,
    ...(reviewPack?.chapters?.map((chapter) => `${chapter.title} ${chapter.body}`) ?? []),
    ...(entry.analysis_observations?.map((observation) => `${observation.analysis_type} ${observation.label} ${observation.note ?? ''}`) ?? [])
  ].filter(Boolean).join(' ').toLowerCase();

  const checks = [
    check('text_depth', 'Architekturtext', textLength(entry) >= 600, `${textLength(entry)} Zeichen`),
    check('source_trail', 'Quellenlage', sourceCount(entry) >= 2, `${sourceCount(entry)} Quellen/Quellkandidaten`),
    check('media', 'Medien', Array.isArray(entry.media) && entry.media.length >= 3, `${entry.media?.length ?? 0} Medien`),
    check('materials', 'Material', Boolean(entry.materials?.primary?.length || entry.materials?.notes), materialNote(entry)),
    check('context', 'Topos/Kontextfelder', Boolean(entry.context?.topography && entry.context?.setting), contextNote(entry)),
    check('program', 'Typos/Programm', Boolean(entry.program?.type || entry.entry_type), entry.program?.type ?? entry.entry_type),
    check('model', '3D-/Modellplan', Boolean(entry.model_3d?.parts?.length || entry.model_assets?.length || entry.model_packages?.length), modelNote(entry)),
    check('relations', 'Netzwerk', (relationCounts.get(entry.id) ?? 0) >= 2, `${relationCounts.get(entry.id) ?? 0} Relationen`),
    check(
      'network_review_pack',
      'Netzwerk-Review-Pack',
      Boolean(reviewNetworkBasis?.explicit_relation_count || reviewNetworkBasis?.similar_entries?.length),
      reviewNetworkBasis
        ? `${reviewNetworkBasis.explicit_relation_count ?? 0} Relationen im Review; ${reviewNetworkBasis.similar_entries?.length ?? 0} Aehnlichkeiten`
        : 'kein Text-Review-Pack'
    ),
    ...frameworkTerms.map((framework) => {
      const hits = framework.terms.filter((term) => textBlob.includes(term));
      return check(framework.id, framework.label, hits.length > 0, hits.length ? hits.slice(0, 4).join(', ') : 'im Text kaum sichtbar');
    })
  ];

  const score = Math.round(checks.reduce((sum, item) => sum + item.score, 0) / checks.length);
  const status = score >= 86 ? 'ready' : score >= 68 ? 'review' : 'needs_work';

  return {
    slug: entry.slug,
    id: entry.id,
    title: entry.title,
    status,
    score,
    checks,
    review_pack: reviewNetworkBasis ? {
      network_relation_count: reviewNetworkBasis.explicit_relation_count ?? 0,
      related_entries: reviewNetworkBasis.related_entries ?? [],
      similar_entries: reviewNetworkBasis.similar_entries ?? []
    } : null,
    missing: checks.filter((item) => item.score === 0).map((item) => item.id)
  };
}

async function loadTextReviewPack(slug) {
  const reviewPath = path.join(root, 'out/text-review', slug, 'architecture-text.json');
  try {
    return JSON.parse(await fs.readFile(reviewPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function check(id, label, passed, note) {
  return {
    id,
    label,
    score: passed ? 100 : 0,
    note
  };
}

function textLength(entry) {
  return [entry.one_sentence, entry.short_description, entry.full_description, entry.architecture_text?.overview]
    .filter(Boolean)
    .join(' ')
    .length;
}

function sourceCount(entry) {
  return [
    entry.source_url,
    ...(entry.source_documents ?? []),
    ...(entry.source_candidates ?? []),
    ...(entry.source_assets ?? [])
  ].filter(Boolean).length;
}

function materialNote(entry) {
  const primary = entry.materials?.primary?.join(', ');
  return primary || entry.materials?.notes || 'keine Materialfelder';
}

function contextNote(entry) {
  return [entry.context?.topography, entry.context?.setting].filter(Boolean).join(' / ') || 'keine Kontextfelder';
}

function modelNote(entry) {
  if (entry.model_3d?.parts?.length) return `${entry.model_3d.parts.length} Modellteile`;
  if (entry.model_assets?.length) return `${entry.model_assets.length} Modellassets`;
  if (entry.model_packages?.length) return `${entry.model_packages.length} Modellpakete`;
  return 'kein Modellplan';
}

function countRelations(relations) {
  const counts = new Map();
  relations.forEach((relation) => {
    counts.set(relation.source_entry_id, (counts.get(relation.source_entry_id) ?? 0) + 1);
    counts.set(relation.target_entry_id, (counts.get(relation.target_entry_id) ?? 0) + 1);
  });
  return counts;
}

function summarize(rows) {
  const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0;
  return {
    average_score: average,
    ready: rows.filter((row) => row.status === 'ready').length,
    review: rows.filter((row) => row.status === 'review').length,
    needs_work: rows.filter((row) => row.status === 'needs_work').length
  };
}

function renderMarkdown(summary, rows) {
  const lines = [
    '# KosmoData Pilot Quality Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Average score: ${summary.average_score}%`,
    `- Ready: ${summary.ready}`,
    `- Review: ${summary.review}`,
    `- Needs work: ${summary.needs_work}`,
    '',
    '## Entries',
    ''
  ];

  rows.forEach((row) => {
    lines.push(`### ${row.title}`);
    lines.push('');
    lines.push(`- Slug: \`${row.slug}\``);
    lines.push(`- Status: \`${row.status}\``);
    lines.push(`- Score: ${row.score}%`);
    if (row.missing.length) lines.push(`- Missing / weak: ${row.missing.map((item) => `\`${item}\``).join(', ')}`);
    lines.push('');
    row.checks.forEach((item) => {
      lines.push(`- ${item.score === 100 ? 'OK' : 'OPEN'} ${item.label}: ${item.note}`);
    });
    lines.push('');
  });

  lines.push('## Safety');
  lines.push('');
  lines.push('- Audit reads public/static mock data only.');
  lines.push('- It does not browse, upload assets, write D1/R2 or modify entries.');
  lines.push('- Scores are review signals, not architectural truth claims.');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
