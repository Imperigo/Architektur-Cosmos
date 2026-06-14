#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const activationPath = resolve(root, args.activation || `data/kosmo-source-root-activation-preflight-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-private-metadata-inventory-runner-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-private-metadata-inventory-runner-${dateStamp}.md`);
const maxFiles = Number(args.maxFiles || args['max-files'] || 25000);
const maxMatchesPerPilot = Number(args.maxMatchesPerPilot || args['max-matches-per-pilot'] || 60);
const maxDepth = Number(args.maxDepth || args['max-depth'] || 12);
const explicitRoot = args.root ? resolve(String(args.root)) : null;
const fixtureRoot = args.fixtureRoot ? resolve(String(args.fixtureRoot)) : null;
const allowFixture = fixtureRoot && args.fixture === 'true';

const pilots = [
  {
    pilot_id: 'villa-savoye',
    title: 'Villa Savoye',
    keywords: ['villa savoye', 'savoye', 'poissy', 'corbusier'],
    source_need: 'metadata-only provenance candidates for existing media, diagrams and model basis'
  },
  {
    pilot_id: 'kapelle-sogn-benedetg',
    title: 'Kapelle Sogn Benedetg',
    keywords: ['sogn', 'benedetg', 'sumvitg', 'zumthor', 'holzbau', 'timber'],
    source_need: 'metadata-only candidates for timber structure, drawings, materials and model basis'
  },
  {
    pilot_id: 'alterszentrum-kloster-ingenbohl',
    title: 'Alterszentrum Kloster Ingenbohl',
    keywords: ['ingenbohl', 'ingebohl', 'boltshauser', 'kloster', 'alterszentrum'],
    source_need: 'metadata-only candidates for structure, material evidence and model basis'
  }
];

const allowedExtensions = new Set([
  '.pdf',
  '.epub',
  '.djvu',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.csv',
  '.ifc',
  '.dwg',
  '.dxf',
  '.skp',
  '.blend',
  '.3dm',
  '.obj',
  '.fbx',
  '.glb',
  '.gltf',
  '.jpg',
  '.jpeg',
  '.png',
  '.tif',
  '.tiff',
  '.webp'
]);

const ignoredDirNames = new Set([
  '.cache',
  '.git',
  '.next',
  '.venv',
  '__pycache__',
  'dist',
  'node_modules',
  'site-packages',
  'venv'
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const activation = await readOptionalJson(activationPath);
  const report = await buildReport(activation);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo private metadata inventory runner');
  console.log(`Status: ${report.status}`);
  console.log(`Mode: ${report.summary.mode}`);
  console.log(`Root scanned: ${report.summary.root_scanned ? 'yes' : 'no'}`);
  console.log(`Files scanned: ${report.summary.files_scanned}`);
  console.log(`Pilot matches: ${report.summary.total_candidate_matches}`);
  console.log(`Public-ready after run: ${report.summary.public_ready_after_run}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function buildReport(activation) {
  const activationReady = activation?.summary?.activation_ready === true &&
    activation.status === 'source_root_activation_ready_for_private_metadata_diagnostic';
  const selectedRoot = explicitRoot || (activation?.summary?.selected_root_path ? resolve(activation.summary.selected_root_path) : null);
  const scanRoot = allowFixture ? fixtureRoot : selectedRoot;
  const canScan = allowFixture || (activationReady && scanRoot);
  const privateOutputRoot = activation?.git_guard?.private_root ||
    activation?.summary?.private_root ||
    '/mnt/data/ArchitekturKosmos/KosmoZentrale/sources/private-inventory';

  const scan = canScan ? await scanMetadataRoot(scanRoot) : blockedScan();
  const inventory = buildPrivateInventory({ activation, privateOutputRoot, scanRoot, scan, canScan });
  const privateInventoryPath = resolve(privateOutputRoot, `kosmo-private-metadata-inventory-${dateStamp}.json`);

  if (canScan && !allowFixture) {
    await mkdir(dirname(privateInventoryPath), { recursive: true });
    await writeFile(privateInventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
  }

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: canScan
      ? allowFixture
        ? 'private_metadata_inventory_fixture_passed'
        : 'private_metadata_inventory_ready_private_output_written'
      : 'private_metadata_inventory_blocked_until_activation',
    policy: {
      metadata_only: true,
      reads_file_contents: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_run: 0,
      note: 'This runner uses directory and file metadata only. It never opens source files for content extraction.'
    },
    source_refs: [relative(root, activationPath)],
    summary: {
      mode: allowFixture ? 'fixture_public_safe' : 'private_guarded',
      activation_status: activation?.status || null,
      activation_ready: activationReady,
      selected_root_path: selectedRoot,
      scan_root: scanRoot,
      root_scanned: canScan,
      scan_truncated: scan.truncated,
      files_scanned: scan.files_scanned,
      dirs_scanned: scan.dirs_scanned,
      total_candidate_matches: scan.total_matches,
      pilots: pilots.length,
      max_files: maxFiles,
      max_depth: maxDepth,
      max_matches_per_pilot: maxMatchesPerPilot,
      private_output_root: privateOutputRoot,
      private_inventory_written: canScan && !allowFixture,
      private_inventory_path: canScan && !allowFixture ? privateInventoryPath : null,
      public_ready_after_run: 0
    },
    pilots: scan.pilots.map((pilot) => ({
      pilot_id: pilot.pilot_id,
      title: pilot.title,
      candidate_files: pilot.matches.length,
      extensions: pilot.extensions,
      largest_file_bytes: pilot.largest_file_bytes,
      match_fingerprints: pilot.matches.map((match) => ({
        path_hash: match.path_hash,
        extension: match.extension,
        size_bytes: match.size_bytes,
        mtime_day: match.mtime_day,
        keyword_hits: match.keyword_hits
      })),
      rights_status: 'review_only',
      public_ready: false
    })),
    blocked_reason: canScan ? null : {
      activation_required: 'source_root_activation_ready_for_private_metadata_diagnostic',
      current_activation_status: activation?.status || 'missing',
      selected_root_present: Boolean(selectedRoot),
      message: 'No private metadata inventory scan runs until source-root activation is ready.'
    },
    next_actions: canScan
      ? [
          'Run private inventory output check against the private output path before any handoff.',
          'Keep output review-only and pilot-scoped.',
          'Do not run OCR or content extraction from this metadata inventory.'
        ]
      : [
          'Keep metadata inventory blocked until source-root activation is ready.',
          'After owner/overseer records a real source root, rerun source-root activation preflight.',
          'Then run this command against the approved selected root only.'
        ]
  };
}

async function scanMetadataRoot(start) {
  const pilotRows = pilots.map((pilot) => ({
    ...pilot,
    matches: [],
    extensions: {},
    largest_file_bytes: 0
  }));
  const stack = [{ path: start, depth: 0 }];
  let filesScanned = 0;
  let dirsScanned = 0;
  let truncated = false;

  while (stack.length > 0) {
    const current = stack.pop();
    if (current.depth > maxDepth) continue;
    let entries = [];
    try {
      entries = await readdir(current.path, { withFileTypes: true });
    } catch {
      continue;
    }
    dirsScanned += 1;
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoredDirNames.has(entry.name.toLowerCase())) {
          stack.push({ path: `${current.path}/${entry.name}`, depth: current.depth + 1 });
        }
        continue;
      }
      if (!entry.isFile()) continue;
      filesScanned += 1;
      const filePath = `${current.path}/${entry.name}`;
      const extension = extname(entry.name).toLowerCase();
      if (!allowedExtensions.has(extension)) continue;
      const lowerPath = filePath.toLowerCase();
      const info = await stat(filePath);
      for (const pilot of pilotRows) {
        if (pilot.matches.length >= maxMatchesPerPilot) continue;
        const keywordHits = pilot.keywords.filter((keyword) => lowerPath.includes(keyword));
        if (keywordHits.length === 0) continue;
        pilot.extensions[extension || '<none>'] = (pilot.extensions[extension || '<none>'] || 0) + 1;
        pilot.largest_file_bytes = Math.max(pilot.largest_file_bytes, info.size);
        pilot.matches.push({
          path_hash: hashPath(filePath),
          extension,
          size_bytes: info.size,
          mtime_day: info.mtime.toISOString().slice(0, 10),
          keyword_hits: keywordHits
        });
      }
      if (filesScanned >= maxFiles) {
        truncated = true;
        stack.length = 0;
        break;
      }
    }
  }

  return {
    files_scanned: filesScanned,
    dirs_scanned: dirsScanned,
    truncated,
    total_matches: pilotRows.reduce((sum, pilot) => sum + pilot.matches.length, 0),
    pilots: pilotRows
  };
}

function blockedScan() {
  return {
    files_scanned: 0,
    dirs_scanned: 0,
    truncated: false,
    total_matches: 0,
    pilots: pilots.map((pilot) => ({
      ...pilot,
      matches: [],
      extensions: {},
      largest_file_bytes: 0
    }))
  };
}

function buildPrivateInventory({ activation, privateOutputRoot, scanRoot, scan, canScan }) {
  return {
    schema_version: '0.1',
    created_at: new Date().toISOString(),
    status: canScan ? 'private_metadata_inventory_review_only' : 'private_metadata_inventory_not_run',
    policy: {
      private_content_included: false,
      copied_private_files: false,
      public_ready_after_inventory: 0,
      public_writes_allowed: false,
      long_quotes_allowed: false,
      rule: 'Metadata inventory only: path hashes, extensions, counts, sizes and dates. No file text, scans, screenshots or copied plans.'
    },
    inventory_root: privateOutputRoot,
    source_root: scanRoot,
    run_id: `kosmo-private-metadata-inventory-${dateStamp}`,
    activation_ref: relative(root, activationPath),
    pilots: scan.pilots.map((pilot) => ({
      pilot_id: pilot.pilot_id,
      inventory_status: canScan ? 'metadata_scanned_review_only' : 'blocked_not_started',
      metadata_counts: {
        candidate_files: pilot.matches.length,
        source_records: 0,
        rights_records: 0
      },
      path_fingerprints: pilot.matches.map((match) => ({
        path_hash: match.path_hash,
        extension: match.extension,
        size_bytes: match.size_bytes,
        mtime_day: match.mtime_day,
        keyword_hits: match.keyword_hits
      })),
      gap_summary: canScan
        ? `Metadata-only filename/path candidate scan for ${pilot.title}; no source contents extracted.`
        : 'Blocked until source-root activation passes.',
      rights_status: 'review_only',
      public_ready: false,
      open_questions: activation?.summary?.activation_ready === true ? [] : ['source-root activation pending']
    })),
    forbidden_content_guard: {
      max_summary_chars: 1200,
      max_open_question_chars: 300,
      forbidden_fields: [
        'full_text',
        'ocr_text',
        'pdf_text',
        'book_excerpt',
        'page_scan',
        'image_base64',
        'copied_plan',
        'private_image'
      ]
    }
  };
}

function hashPath(path) {
  return createHash('sha256').update(path).digest('hex').slice(0, 24);
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Private Metadata Inventory Runner');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Mode: ${report.summary.mode}`);
  lines.push(`- Activation: ${report.summary.activation_status || 'missing'}`);
  lines.push(`- Activation ready: ${report.summary.activation_ready ? 'yes' : 'no'}`);
  lines.push(`- Root scanned: ${report.summary.root_scanned ? 'yes' : 'no'}`);
  lines.push(`- Files scanned: ${report.summary.files_scanned}`);
  lines.push(`- Dirs scanned: ${report.summary.dirs_scanned}`);
  lines.push(`- Candidate matches: ${report.summary.total_candidate_matches}`);
  lines.push(`- Scan truncated: ${report.summary.scan_truncated ? 'yes' : 'no'}`);
  lines.push(`- Private inventory written: ${report.summary.private_inventory_written ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after run: ${report.summary.public_ready_after_run}`);
  lines.push('');
  lines.push('## Pilots');
  lines.push('');
  lines.push('| Pilot | Candidates | Largest bytes | Rights | Public-ready |');
  lines.push('| --- | ---: | ---: | --- | --- |');
  report.pilots.forEach((pilot) => {
    lines.push(`| ${escapePipe(pilot.title)} | ${pilot.candidate_files} | ${pilot.largest_file_bytes} | ${pilot.rights_status} | ${pilot.public_ready ? 'yes' : 'no'} |`);
  });
  lines.push('');
  lines.push('## Blocked Reason');
  lines.push('');
  if (report.blocked_reason) {
    lines.push(`- ${report.blocked_reason.message}`);
    lines.push(`- Current activation: ${report.blocked_reason.current_activation_status}`);
    lines.push(`- Selected root present: ${report.blocked_reason.selected_root_present ? 'yes' : 'no'}`);
  } else {
    lines.push('- None for metadata scan; content extraction and public promotion remain blocked by later gates.');
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
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
