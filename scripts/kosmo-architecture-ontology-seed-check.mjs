#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const seedPath = resolve(root, args.seed || `data/kosmo-architecture-ontology-seed-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-architecture-ontology-seed-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-architecture-ontology-seed-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const seed = await readJson(seedPath);
  const checks = buildChecks(seed);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'architecture_ontology_seed_guard_passed'
      : 'architecture_ontology_seed_guard_failed',
    policy: {
      validates_seed_only: true,
      reads_private_content_now: false,
      creates_assets_now: false,
      creates_eval_rows_now: false,
      writes_training_data_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, seedPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      warnings: 0,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo architecture ontology seed check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(seed) {
  const entities = (seed.entity_types || []).map((item) => item.id);
  const facets = (seed.facet_groups || []).map((item) => item.id);
  const relations = seed.relation_types || [];
  const hardStops = (seed.hard_stops || []).join(' ').toLowerCase();

  return [
    check('status_ready', seed.status === 'architecture_ontology_seed_ready', seed.status),
    check('policy_seed_only', seed.policy?.seed_only === true, seed.policy?.seed_only),
    check('policy_source_free', seed.policy?.source_free === true, seed.policy?.source_free),
    check('policy_no_private_reads', seed.policy?.reads_private_content_now === false, seed.policy?.reads_private_content_now),
    check('policy_no_private_writes', seed.policy?.writes_private_content_now === false, seed.policy?.writes_private_content_now),
    check('policy_no_assets_now', seed.policy?.creates_assets_now === false, seed.policy?.creates_assets_now),
    check('policy_no_eval_rows_now', seed.policy?.creates_eval_rows_now === false, seed.policy?.creates_eval_rows_now),
    check('policy_no_training_now', seed.policy?.writes_training_data_now === false, seed.policy?.writes_training_data_now),
    check('public_ready_zero', seed.summary?.public_ready_after_seed === 0, seed.summary?.public_ready_after_seed),
    check('entity_types_eight', seed.summary?.entity_types === 8, seed.summary?.entity_types),
    check('relation_types_ten', seed.summary?.relation_types === 10, seed.summary?.relation_types),
    check('facet_groups_six', seed.summary?.facet_groups === 6, seed.summary?.facet_groups),
    check('pilots_supported_three', seed.summary?.pilots_supported === 3, seed.summary?.pilots_supported),
    check('asset_lanes_supported_three', seed.summary?.asset_lanes_supported === 3, seed.summary?.asset_lanes_supported),
    check('review_lanes_supported_five', seed.summary?.review_lanes_supported === 5, seed.summary?.review_lanes_supported),
    check('required_entities_present', ['reference_project', 'source_record', 'building_element', 'material_system', 'space_pattern', 'structure_system', 'asset_record', 'eval_review_item'].every((entity) => entities.includes(entity)), entities.join(',')),
    check('required_facets_present', ['typology', 'material', 'structure', 'space', 'construction', 'rights_privacy'].every((facet) => facets.includes(facet)), facets.join(',')),
    check('all_entities_public_ready_false', (seed.entity_types || []).every((item) => item.public_ready_default === false), (seed.entity_types || []).filter((item) => item.public_ready_default !== false).map((item) => item.id).join(',')),
    check('all_facets_public_ready_false', (seed.facet_groups || []).every((item) => item.public_ready_default === false), (seed.facet_groups || []).filter((item) => item.public_ready_default !== false).map((item) => item.id).join(',')),
    check('relations_require_source_basis', relations.every((item) => item.requires_source_basis === true), relations.filter((item) => item.requires_source_basis !== true).map((item) => item.id).join(',')),
    check('pilot_alignment_three', (seed.pilot_alignment || []).length === 3, (seed.pilot_alignment || []).length),
    check('pilot_alignment_public_ready_zero', (seed.pilot_alignment || []).every((item) => item.public_ready_after_alignment === 0), (seed.pilot_alignment || []).filter((item) => item.public_ready_after_alignment !== 0).map((item) => item.pilot_id).join(',')),
    check('hard_stop_no_private_instantiation', hardStops.includes('do not instantiate private project facts'), hardStops),
    check('hard_stop_no_assets_eval_embeddings_training', hardStops.includes('assets') && hardStops.includes('eval rows') && hardStops.includes('embeddings') && hardStops.includes('training data'), hardStops),
    check('hard_stop_public_ready_false', hardStops.includes('public_ready true'), hardStops),
    check('hard_stop_rights_privacy_mandatory', hardStops.includes('rights/privacy facets mandatory'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Architecture Ontology Seed Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((checkItem) => {
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${String(checkItem.evidence ?? '-')}`);
  });
  lines.push('');
  return lines.join('\n');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
