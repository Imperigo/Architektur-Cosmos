#!/usr/bin/env node

import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mediaSlots = ['exterior', 'interior', 'section', 'plan'];

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const slug = args.entry || args.slug;
  if (!slug) throw new Error('Usage: npm run archive:media-quality -- --entry villa-savoye');

  const entry = await loadEntry(slug);
  if (!entry) throw new Error(`No entry found for "${slug}".`);

  const rows = mediaSlots.map((slot) => scoreSlot(entry, slot));
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'local_static_quality_report',
    upload_allowed: false,
    entry_id: entry.id,
    slug: entry.slug,
    title: entry.title,
    summary: {
      average_score: round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length),
      ready_slots: rows.filter((row) => row.status === 'ready').length,
      needs_review_slots: rows.filter((row) => row.status !== 'ready').length
    },
    slots: rows,
    limitations: [
      'This static report checks metadata, file presence, slot type and source/rights hints.',
      'It does not visually inspect pixels yet.',
      'True building-visible and interior-visible checks require a private server-side vision model.'
    ]
  };

  const outputPath = path.join(root, args.output ?? `out/media-quality/${entry.slug}.json`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('Architecture Cosmos media quality report');
  console.log(`Entry: ${entry.title} (${entry.slug})`);
  console.log(`Average score: ${Math.round(report.summary.average_score * 100)}%`);
  rows.forEach((row) => console.log(`- ${row.slot}: ${Math.round(row.score * 100)}% / ${row.status}`));
  console.log(`Report: ${path.relative(root, outputPath)}`);
  console.log('Upload mode: LOCAL REPORT ONLY. No file was uploaded or published.');
}

async function loadEntry(slug) {
  const entries = JSON.parse(await readFile(path.join(root, 'data/mock-entries.json'), 'utf8'));
  return entries.find((candidate) => candidate.slug === slug || candidate.id === slug);
}

function scoreSlot(entry, slot) {
  const media = (entry.media ?? []).find((item) => item.type === slot);
  const checks = [];

  if (!media) {
    return {
      slot,
      status: 'missing',
      score: 0,
      checks: ['missing_media_slot'],
      recommendation: `Add ${slot} media metadata and a source candidate.`
    };
  }

  checks.push('metadata_present');
  if (media.label) checks.push('label_present');
  if (media.placeholder && media.placeholder.length >= 28) checks.push('descriptive_caption');
  if (media.source_url) checks.push('source_url_present');
  if (media.credit) checks.push(`rights_hint:${media.credit}`);

  const localPath = media.url ? resolveAssetPath(media.url) : null;
  const exists = Boolean(localPath && existsSync(localPath));
  if (exists) {
    checks.push('local_file_present');
    const size = statSync(localPath).size;
    checks.push(size <= 8 * 1024 * 1024 ? 'size_ok' : 'size_large_review');
  } else if (media.url) {
    checks.push('local_file_missing');
  } else {
    checks.push('placeholder_only');
  }

  const semanticHints = `${media.label ?? ''} ${media.placeholder ?? ''} ${media.url ?? ''}`.toLowerCase();
  if (slot === 'exterior' && /(exterior|aussen|fassade|outside|view|volume|building)/.test(semanticHints)) checks.push('slot_semantic_hint_ok');
  if (slot === 'interior' && /(interior|innen|room|raum|furniture|atmosphere)/.test(semanticHints)) checks.push('slot_semantic_hint_ok');
  if (slot === 'section' && /(section|schnitt)/.test(semanticHints)) checks.push('slot_semantic_hint_ok');
  if (slot === 'plan' && /(plan|grundriss|floor)/.test(semanticHints)) checks.push('slot_semantic_hint_ok');

  const score = round(Math.min(1, checks.reduce((sum, check) => {
    if (check === 'metadata_present') return sum + 0.14;
    if (check === 'label_present') return sum + 0.1;
    if (check === 'descriptive_caption') return sum + 0.14;
    if (check === 'source_url_present') return sum + 0.14;
    if (check.startsWith('rights_hint:')) return sum + 0.1;
    if (check === 'local_file_present') return sum + 0.22;
    if (check === 'size_ok') return sum + 0.08;
    if (check === 'slot_semantic_hint_ok') return sum + 0.08;
    return sum;
  }, 0)));

  return {
    slot,
    status: score >= 0.78 ? 'ready' : score >= 0.5 ? 'needs_review' : 'weak',
    score,
    title: media.label,
    url: media.url,
    source_url: media.source_url,
    credit: media.credit,
    checks,
    recommendation: recommendationFor(slot, score, exists)
  };
}

function recommendationFor(slot, score, exists) {
  if (score >= 0.78) return 'Good metadata basis. Later vision QA should confirm the project is actually visible.';
  if (!exists) return `Add or stage a rights-reviewed ${slot} asset, then rerun this report.`;
  return `Review ${slot} source, rights and caption quality before public display.`;
}

function resolveAssetPath(assetPath) {
  if (path.isAbsolute(assetPath)) {
    const publicPath = path.join(root, 'public', assetPath.replace(/^\/+/, ''));
    if (existsSync(publicPath)) return publicPath;
    return assetPath;
  }

  const repoPath = path.join(root, assetPath);
  if (existsSync(repoPath)) return repoPath;
  return path.join(root, 'public', assetPath);
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

function round(value) {
  return Math.round(value * 1000) / 1000;
}
