#!/usr/bin/env node

import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const sourceRoot = resolve(args.root || '/home/andrin-baumann/ArchitekturKosmos Onedrive');
const outputJson = resolve(root, args.out || `data/kosmo-onedrive-sync-error-summary-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-onedrive-sync-error-summary-${dateStamp}.md`);
const sensitiveTokens = ['secret', 'secrets', 'token', '.env', 'credential', 'password'];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const markerFiles = await collectErrorFiles(sourceRoot);
  const markers = [];
  for (const file of markerFiles) markers.push(await inspectMarker(file));
  const aggregateMarker = markers.find((marker) => marker.filename === '___All_Errors.txt') || null;
  const leafMarkers = markers.filter((marker) => marker.filename !== '___All_Errors.txt');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: markerFiles.length > 0 ? 'onedrive_sync_errors_visible' : 'no_onedrive_sync_errors_detected',
    policy: {
      read_only: true,
      copied_private_content: false,
      sensitive_segments_redacted: true,
      note: 'This summary records OneDrive sync error metadata only. It does not copy private source files, book pages, lecture text, images, plans or secrets.'
    },
    source_root: sourceRoot,
    summary: {
      marker_files: markers.length,
      leaf_marker_files: leafMarkers.length,
      aggregate_marker_present: Boolean(aggregateMarker),
      aggregate_missing_items: aggregateMarker?.listed_missing_items ?? 0,
      redacted_marker_targets: leafMarkers.filter((marker) => marker.redacted).length,
      affected_top_level_groups: countBy(leafMarkers.map((marker) => marker.top_level_group)),
      exception_types: countBy(markers.map((marker) => marker.exception_type || 'unknown')),
      latest_utc_datetime: latestDate(markers.map((marker) => marker.utc_datetime).filter(Boolean))
    },
    markers: leafMarkers.map((marker) => ({
      marker_path: marker.marker_path,
      target_path_redacted: marker.target_path_redacted,
      top_level_group: marker.top_level_group,
      exception_type: marker.exception_type,
      utc_datetime: marker.utc_datetime,
      listed_missing_items: marker.listed_missing_items,
      redacted: marker.redacted
    })),
    aggregate: aggregateMarker ? {
      marker_path: aggregateMarker.marker_path,
      exception_type: aggregateMarker.exception_type,
      utc_datetime: aggregateMarker.utc_datetime,
      listed_missing_items: aggregateMarker.listed_missing_items,
      sample_missing_paths_redacted: aggregateMarker.sample_missing_paths_redacted
    } : null,
    next_actions: nextActions(markerFiles.length, aggregateMarker)
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo OneDrive sync error summary');
  console.log(`Status: ${report.status}`);
  console.log(`Marker files: ${report.summary.marker_files}`);
  console.log(`Leaf markers: ${report.summary.leaf_marker_files}`);
  console.log(`Aggregate missing items: ${report.summary.aggregate_missing_items}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function collectErrorFiles(start) {
  const files = [];
  const stack = [start];
  while (stack.length > 0) {
    const current = stack.pop();
    let info;
    try {
      info = await stat(current);
    } catch {
      continue;
    }
    if (info.isDirectory()) {
      let entries = [];
      try {
        entries = await readdir(current);
      } catch {
        continue;
      }
      for (const entry of entries) stack.push(`${current}/${entry}`);
    } else if (info.isFile() && (current.endsWith('_Error.txt') || current.endsWith('___All_Errors.txt'))) {
      files.push(current);
    }
  }
  return files.sort();
}

async function inspectMarker(path) {
  const text = await readFile(path, 'utf8');
  const rel = relative(sourceRoot, path);
  const filename = rel.split('/').pop();
  const targetPath = markerTargetPath(rel);
  const redaction = redactPath(targetPath);
  const listed = parseListedMissingItems(text);
  return {
    marker_path: redactPath(rel).value,
    filename,
    target_path_redacted: redaction.value,
    redacted: redaction.redacted,
    top_level_group: topLevelGroup(targetPath),
    exception_type: matchLine(text, /ExceptionType:\s*([^.\r\n]+)/i),
    utc_datetime: matchLine(text, /UTC DateTime:\s*([^\r\n]+)/i),
    listed_missing_items: listed.length,
    sample_missing_paths_redacted: listed.slice(0, 20).map((item) => redactPath(item).value)
  };
}

function markerTargetPath(rel) {
  if (rel === '___All_Errors.txt') return 'aggregate';
  const withoutSuffix = rel.replace(/_Error\.txt$/, '');
  return withoutSuffix.replace(/^__/, '');
}

function parseListedMissingItems(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^\d+\.\s+(.+)$/);
      return match ? match[1].trim() : null;
    })
    .filter(Boolean);
}

function redactPath(path) {
  const parts = String(path).split('/');
  let redacted = false;
  const safe = parts.map((part) => {
    const lower = part.toLowerCase();
    if (sensitiveTokens.some((token) => lower.includes(token))) {
      redacted = true;
      return '[redacted-sensitive]';
    }
    return part;
  });
  return { value: safe.join('/'), redacted };
}

function topLevelGroup(path) {
  const parts = String(path).split('/').filter(Boolean);
  if (parts[0] === '11 AI Workflow') return parts[1] || parts[0];
  return parts[0] || 'unknown';
}

function matchLine(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    const key = value || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function latestDate(values) {
  return values.sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
}

function nextActions(markerCount, aggregateMarker) {
  if (markerCount === 0) return ['No OneDrive sync error markers found in the scanned root.'];
  const actions = [
    'Treat the visible OneDrive mirror as incomplete until sync errors are resolved.',
    'Resolve or re-sync the affected top-level folders before running source inventory.',
    'Do not promote source-dependent assets based on this mirror alone.'
  ];
  if (aggregateMarker?.listed_missing_items) {
    actions.push(`Use the aggregate marker to prioritize the ${aggregateMarker.listed_missing_items} missing listed files/folders.`);
  }
  actions.push('Re-run npm run kosmo:onedrive-sync-errors after sync repair.');
  return actions;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo OneDrive Sync Error Summary');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Marker files: ${report.summary.marker_files}`);
  lines.push(`- Leaf marker files: ${report.summary.leaf_marker_files}`);
  lines.push(`- Aggregate marker present: ${report.summary.aggregate_marker_present ? 'yes' : 'no'}`);
  lines.push(`- Aggregate missing listed items: ${report.summary.aggregate_missing_items}`);
  lines.push(`- Redacted marker targets: ${report.summary.redacted_marker_targets}`);
  lines.push(`- Latest UTC datetime: ${report.summary.latest_utc_datetime || 'unknown'}`);
  lines.push('');
  lines.push('## Affected Groups');
  lines.push('');
  for (const [group, count] of Object.entries(report.summary.affected_top_level_groups)) {
    lines.push(`- ${group}: ${count}`);
  }
  lines.push('');
  lines.push('## Marker Targets');
  lines.push('');
  lines.push('| Target | Group | Exception | UTC | Redacted |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const marker of report.markers) {
    lines.push(`| \`${escapePipe(marker.target_path_redacted)}\` | ${escapePipe(marker.top_level_group)} | ${escapePipe(marker.exception_type || 'unknown')} | ${escapePipe(marker.utc_datetime || 'unknown')} | ${marker.redacted ? 'yes' : 'no'} |`);
  }
  if (report.aggregate?.sample_missing_paths_redacted?.length) {
    lines.push('');
    lines.push('## Aggregate Sample');
    lines.push('');
    report.aggregate.sample_missing_paths_redacted.forEach((path) => lines.push(`- \`${path}\``));
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}`;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
