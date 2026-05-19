#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entriesPath = resolve(rootDir, 'data/mock-entries.json');
const relationsPath = resolve(rootDir, 'data/relations.json');
const rulesPath = resolve(rootDir, 'data/brain-rules.json');
const queuePath = resolve(rootDir, 'data/review-queue.json');
const decisionsPath = resolve(rootDir, 'data/agent-decisions.json');
const outputRoot = resolve(rootDir, 'out/brain-review');
const today = new Date().toISOString().slice(0, 10);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const [entries, relations, rules, queue, decisions] = await Promise.all([
    readJson(entriesPath),
    readJson(relationsPath),
    readJson(rulesPath),
    readJson(queuePath),
    readJson(decisionsPath)
  ]);

  const review = buildReview({ entries, relations, rules, queue, decisions });
  const outputDir = resolve(outputRoot, today);
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'brain-review.json'), `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDir, 'brain-review.md'), renderMarkdown(review), 'utf8');

  console.log('Architecture Cosmos Brain Review');
  console.log(`Output: ${relativeToRoot(outputDir)}`);
  console.log(`Entries: ${review.summary.entries}`);
  console.log(`Open tasks: ${review.tasks.length}`);
  console.log(`Highest priority: ${review.tasks[0]?.title ?? 'none'}`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function buildReview({ entries, relations, rules, queue, decisions }) {
  const entryIds = new Set(entries.map((entry) => entry.id));
  const relationCounts = countRelations(relations);
  const entriesWithDatabaseProfile = entries.filter((entry) => entry.database_profile);
  const entriesWithModels = entries.filter((entry) => hasModel(entry));
  const entriesWithAnalysis = entries.filter((entry) => (entry.analysis_layers?.length ?? 0) > 0 || (entry.analysis_observations?.length ?? 0) > 0);
  const entriesWithSourceCandidates = entries.filter((entry) => (entry.source_candidates?.length ?? 0) > 0 || Boolean(entry.source_url));
  const brokenRelations = relations.filter((relation) => !entryIds.has(relation.source_entry_id) || !entryIds.has(relation.target_entry_id));

  const entryReviews = entries.map((entry) => reviewEntry(entry, relationCounts, rules));
  const tasks = entryReviews
    .flatMap((entryReview) => entryReview.tasks)
    .sort((a, b) => b.priority - a.priority || a.entry_title.localeCompare(b.entry_title))
    .slice(0, 40);

  const systemTasks = buildSystemTasks({ entries, relations, brokenRelations, rules });
  const allTasks = [...systemTasks, ...tasks].sort((a, b) => b.priority - a.priority).slice(0, 50);

  return {
    generated_at: new Date().toISOString(),
    mode: rules.default_mode ?? 'review',
    writes_database: false,
    publishes: false,
    approval_required: true,
    summary: {
      entries: entries.length,
      relations: relations.length,
      broken_relations: brokenRelations.length,
      database_profiles: entriesWithDatabaseProfile.length,
      model_ready_or_planned: entriesWithModels.length,
      analysis_ready_or_planned: entriesWithAnalysis.length,
      source_candidate_entries: entriesWithSourceCandidates.length,
      queue_items: queue.items?.length ?? 0,
      recorded_decisions: decisions.decisions?.length ?? 0
    },
    coverage: {
      database_profile_percent: percent(entriesWithDatabaseProfile.length, entries.length),
      model_percent: percent(entriesWithModels.length, entries.length),
      analysis_percent: percent(entriesWithAnalysis.length, entries.length),
      source_candidate_percent: percent(entriesWithSourceCandidates.length, entries.length)
    },
    watchlists: {
      rights_blocked: entryReviews.filter((item) => item.flags.includes('rights_blocked')).map(toWatchItem).slice(0, 20),
      missing_models: entryReviews.filter((item) => item.flags.includes('missing_model')).map(toWatchItem).slice(0, 20),
      missing_analysis: entryReviews.filter((item) => item.flags.includes('missing_analysis')).map(toWatchItem).slice(0, 20),
      weak_relations: entryReviews.filter((item) => item.flags.includes('weak_relations')).map(toWatchItem).slice(0, 20),
      public_candidates: entryReviews.filter((item) => item.flags.includes('public_candidate')).map(toWatchItem).slice(0, 20)
    },
    tasks: allTasks,
    next_steps: [
      'Review the top tasks and approve only one execution batch at a time.',
      'Promote public-safe metadata before any image, plan or model publication.',
      'Keep the Brain in review mode until upload/auth/database write security is implemented.',
      'Use the report as an owner dashboard, not as an automatic deploy trigger.'
    ]
  };
}

function reviewEntry(entry, relationCounts, rules) {
  const flags = [];
  const tasks = [];
  const sourceCount = sourceCountFor(entry);
  const relationCount = relationCounts.get(entry.id) ?? 0;
  const analysisTypes = new Set((entry.analysis_layers ?? []).map((layer) => layer.analysis_type));
  const modelPartTypes = new Set((entry.model_3d?.parts ?? []).map((part) => part.type));
  const mediaRights = (entry.media ?? []).map((media) => media.license).filter(Boolean);
  const blockedRights = mediaRights.some((license) => rules.private_or_blocked_rights?.includes(license));

  if (sourceCount < rules.entry_quality_targets.minimum_sources) {
    flags.push('missing_sources');
    tasks.push(task(entry, 'research', `Add source trail for ${entry.title}`, `Only ${sourceCount} source(s) attached. Target is ${rules.entry_quality_targets.minimum_sources}.`, rules.priority_weights.missing_sources));
  }

  if (blockedRights || entry.ingestion_status?.asset_status === 'rights_blocked') {
    flags.push('rights_blocked');
    tasks.push(task(entry, 'rights', `Rights review for ${entry.title}`, 'Entry contains private, blocked or unclear media/model rights. Keep assets link-only until cleared.', rules.priority_weights.rights_blocked));
  }

  if (!hasModel(entry)) {
    flags.push('missing_model');
    tasks.push(task(entry, 'model', `Plan 3D layers for ${entry.title}`, 'No model_3d or model_assets found. Prepare full, structure and site layers.', rules.priority_weights.missing_model));
  } else {
    const missingParts = rules.entry_quality_targets.required_model_parts.filter((part) => !modelPartTypes.has(part));
    if (missingParts.length) {
      flags.push('model_parts_incomplete');
      tasks.push(task(entry, 'model', `Complete Blender layer plan for ${entry.title}`, `Missing model parts: ${missingParts.join(', ')}.`, rules.priority_weights.missing_model - 4));
    }
  }

  if (!entry.analysis_layers?.length && !entry.analysis_observations?.length) {
    flags.push('missing_analysis');
    tasks.push(task(entry, 'analysis', `Add analysis layers for ${entry.title}`, 'No structure/material/tectonic analysis layers attached.', rules.priority_weights.missing_analysis));
  } else {
    const missingAnalysis = rules.entry_quality_targets.required_analysis_layers.filter((type) => !analysisTypes.has(type));
    if (missingAnalysis.length) {
      flags.push('analysis_incomplete');
      tasks.push(task(entry, 'analysis', `Complete analysis filters for ${entry.title}`, `Missing analysis layers: ${missingAnalysis.join(', ')}.`, rules.priority_weights.missing_analysis - 4));
    }
  }

  if (relationCount < 2) {
    flags.push('weak_relations');
    tasks.push(task(entry, 'relations', `Strengthen relation network for ${entry.title}`, `Only ${relationCount} relation(s). Add typological, material or source relations.`, rules.priority_weights.missing_relations));
  }

  if (entry.database_profile && sourceCount >= rules.entry_quality_targets.minimum_sources && !blockedRights) {
    flags.push('public_candidate');
  }

  if (entry.database_profile) {
    tasks.forEach((item) => {
      item.priority += rules.priority_weights.pilot_entry;
    });
  }

  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    source_count: sourceCount,
    relation_count: relationCount,
    flags,
    tasks
  };
}

function buildSystemTasks({ entries, brokenRelations, rules }) {
  const tasks = [];
  if (brokenRelations.length > 0) {
    tasks.push({
      id: 'system-broken-relations',
      scope: 'system',
      kind: 'integrity',
      entry_id: null,
      entry_title: 'Archive graph',
      title: 'Fix broken relations',
      body: `${brokenRelations.length} relation(s) point to missing entries.`,
      priority: 100,
      approval_required: true
    });
  }

  const publicReady = entries.filter((entry) => entry.database_profile?.status === 'reviewed' || entry.database_profile?.status === 'published').length;
  if (publicReady === 0) {
    tasks.push({
      id: 'system-public-review-batch',
      scope: 'system',
      kind: 'review',
      entry_id: null,
      entry_title: 'Public archive',
      title: 'Select first public-safe review batch',
      body: 'No database-profile entry is marked reviewed/published. Choose a small public-safe batch before wider publication.',
      priority: 54,
      approval_required: true
    });
  }

  const entriesWithoutProfile = entries.length - entries.filter((entry) => entry.database_profile).length;
  if (entriesWithoutProfile > entries.length * 0.7) {
    tasks.push({
      id: 'system-profile-coverage',
      scope: 'system',
      kind: 'database',
      entry_id: null,
      entry_title: 'Database coverage',
      title: 'Increase database profile coverage',
      body: `${entriesWithoutProfile} entries do not yet have database_profile metadata.`,
      priority: 38 + Math.min(20, rules.priority_weights.missing_analysis),
      approval_required: true
    });
  }

  return tasks;
}

function task(entry, kind, title, body, priority) {
  return {
    id: `${kind}-${entry.id}`,
    scope: 'entry',
    kind,
    entry_id: entry.id,
    entry_slug: entry.slug,
    entry_title: entry.title,
    title,
    body,
    priority,
    approval_required: true
  };
}

function hasModel(entry) {
  return Boolean(entry.model_3d || (entry.model_assets?.length ?? 0) > 0 || (entry.model_packages?.length ?? 0) > 0);
}

function sourceCountFor(entry) {
  return [
    entry.source_url,
    ...(entry.source_documents ?? []),
    ...(entry.source_candidates ?? []),
    ...(entry.source_assets ?? [])
  ].filter(Boolean).length;
}

function countRelations(relations) {
  const counts = new Map();
  for (const relation of relations) {
    counts.set(relation.source_entry_id, (counts.get(relation.source_entry_id) ?? 0) + 1);
    counts.set(relation.target_entry_id, (counts.get(relation.target_entry_id) ?? 0) + 1);
  }
  return counts;
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function toWatchItem(item) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    source_count: item.source_count,
    relation_count: item.relation_count,
    flags: item.flags
  };
}

function renderMarkdown(review) {
  const lines = [
    '# Architecture Cosmos Brain Review',
    '',
    `Generated: ${review.generated_at}`,
    `Mode: \`${review.mode}\``,
    `Writes database: \`${review.writes_database}\``,
    `Publishes: \`${review.publishes}\``,
    '',
    '## Summary',
    '',
    `- Entries: ${review.summary.entries}`,
    `- Relations: ${review.summary.relations}`,
    `- Broken relations: ${review.summary.broken_relations}`,
    `- Database profiles: ${review.summary.database_profiles} (${review.coverage.database_profile_percent}%)`,
    `- Model ready/planned: ${review.summary.model_ready_or_planned} (${review.coverage.model_percent}%)`,
    `- Analysis ready/planned: ${review.summary.analysis_ready_or_planned} (${review.coverage.analysis_percent}%)`,
    `- Source candidate entries: ${review.summary.source_candidate_entries} (${review.coverage.source_candidate_percent}%)`,
    '',
    '## Top Tasks',
    ''
  ];

  if (!review.tasks.length) {
    lines.push('No open tasks detected.', '');
  } else {
    review.tasks.slice(0, 15).forEach((taskItem, index) => {
      lines.push(`${index + 1}. **${taskItem.title}**`);
      lines.push(`   - Kind: \`${taskItem.kind}\`; priority: \`${taskItem.priority}\`; entry: \`${taskItem.entry_title}\``);
      lines.push(`   - ${taskItem.body}`);
    });
    lines.push('');
  }

  lines.push('## Watchlists', '');
  for (const [name, items] of Object.entries(review.watchlists)) {
    lines.push(`### ${titleCase(name)}`, '');
    if (!items.length) {
      lines.push('- none');
    } else {
      items.slice(0, 8).forEach((item) => {
        lines.push(`- ${item.title} — sources ${item.source_count}, relations ${item.relation_count}, flags ${item.flags.join(', ')}`);
      });
    }
    lines.push('');
  }

  lines.push('## Next Steps', '');
  review.next_steps.forEach((step) => lines.push(`- ${step}`));
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function titleCase(value) {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
