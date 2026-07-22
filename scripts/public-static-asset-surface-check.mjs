#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { publicLeakMatches, publicLeakVariants } from './public-leak-patterns.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outRoot = resolve(root, args.out || 'out');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-data/review/public-static-asset-surface-check.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-data/review/public-static-asset-surface-check.generated.md');
const maxTextScanBytes = 2 * 1024 * 1024;

const allowedExtensionlessFiles = new Set(['_headers']);
const allowedExtensions = new Set([
  '.avif',
  '.css',
  '.gif',
  '.glb',
  '.gltf',
  '.html',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.png',
  '.svg',
  '.ttf',
  '.txt',
  '.usdz',
  '.webp',
  '.woff',
  '.woff2',
  '.xml'
]);
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.svg', '.txt', '.xml']);
const blockedExtensions = new Set([
  '.3dm',
  '.7z',
  '.blend',
  '.csv',
  '.db',
  '.doc',
  '.docm',
  '.docx',
  '.dwg',
  '.dxf',
  '.fbx',
  '.gz',
  '.ifc',
  '.key',
  '.log',
  '.mbox',
  '.msg',
  '.numbers',
  '.obj',
  '.ods',
  '.odt',
  '.pages',
  '.pdf',
  '.pla',
  '.pln',
  '.ppt',
  '.pptm',
  '.pptx',
  '.psd',
  '.rar',
  '.rvt',
  '.skp',
  '.sqlite',
  '.sqlite3',
  '.sql',
  '.tar',
  '.xls',
  '.xlsm',
  '.xlsx',
  '.zip'
]);
const blockedBinarySignatures = [
  {
    id: 'pdf',
    label: 'PDF document',
    signature: Buffer.from('%PDF')
  },
  {
    id: 'zip',
    label: 'ZIP archive',
    signature: Buffer.from([0x50, 0x4b, 0x03, 0x04])
  },
  {
    id: 'zip-empty',
    label: 'ZIP archive',
    signature: Buffer.from([0x50, 0x4b, 0x05, 0x06])
  },
  {
    id: 'zip-spanned',
    label: 'ZIP archive',
    signature: Buffer.from([0x50, 0x4b, 0x07, 0x08])
  },
  {
    id: 'gzip',
    label: 'gzip archive',
    signature: Buffer.from([0x1f, 0x8b, 0x08])
  },
  {
    id: '7z',
    label: '7z archive',
    signature: Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])
  },
  {
    id: 'rar',
    label: 'RAR archive',
    signature: Buffer.from('Rar!\x1a\x07', 'binary')
  },
  {
    id: 'sqlite',
    label: 'SQLite database',
    signature: Buffer.from('SQLite format 3')
  },
  {
    id: 'ole-compound',
    label: 'Office compound document',
    signature: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  }
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  if (!existsSync(outRoot)) {
    if (args['allow-missing-out']) {
      const report = skippedMissingOutReport();
      await writeReport(report);
      console.log('Public static asset surface check');
      console.log(`Status: ${report.status}`);
      console.log(`Assets: ${report.summary.allowed_assets}/${report.summary.checked_assets}`);
      console.log(`Skipped: missing static export at ${report.inputs.out_dir}`);
      console.log(`Wrote: ${relative(root, outputMdPath)}`);
      return;
    }
    throw new Error(`Static export not found: ${relative(root, outRoot)}. Run npm run build first.`);
  }

  const assetPaths = await collectFiles(outRoot);
  const assets = assetPaths.map(checkAsset);
  const failures = assets.flatMap((asset) => asset.failures);
  const extensionCounts = countBy(assets.map((asset) => asset.extension || '[none]'));

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-static-asset-surface-check',
    status: failures.length === 0
      ? 'public_static_asset_surface_check_passed'
      : 'public_static_asset_surface_check_failed',
    policy: {
      source_free: true,
      reads_private_content: false,
      writes_public_ready: false,
      starts_server: false,
      scans_static_export_only: true,
      text_scan_max_bytes: maxTextScanBytes
    },
    inputs: {
      out_dir: relative(root, outRoot)
    },
    summary: {
      checked_assets: assets.length,
      allowed_assets: assets.filter((asset) => asset.status === 'passed').length,
      failed_assets: assets.filter((asset) => asset.status !== 'passed').length,
      blocked_extension_assets: assets.filter((asset) => asset.blocked_extension).length,
      embedded_blocked_extension_assets: assets.filter((asset) => asset.embedded_blocked_extensions.length > 0).length,
      unexpected_extension_assets: assets.filter((asset) => asset.unexpected_extension).length,
      blocked_signature_assets: assets.filter((asset) => asset.blocked_signatures.length > 0).length,
      path_leak_assets: assets.filter((asset) => asset.path_leak_matches.length > 0).length,
      content_leak_assets: assets.filter((asset) => asset.content_leak_matches.length > 0).length,
      failure_count: failures.length,
      public_ready_after_check: 0
    },
    extension_counts: extensionCounts,
    assets,
    failures
  };

  await writeReport(report);

  console.log('Public static asset surface check');
  console.log(`Status: ${report.status}`);
  console.log(`Assets: ${report.summary.allowed_assets}/${report.summary.checked_assets}`);
  console.log(`Blocked extensions: ${report.summary.blocked_extension_assets}`);
  console.log(`Unexpected extensions: ${report.summary.unexpected_extension_assets}`);
  console.log(`Blocked signatures: ${report.summary.blocked_signature_assets}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (failures.length > 0) process.exit(1);
}

async function writeReport(report) {
  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');
}

function skippedMissingOutReport() {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-static-asset-surface-check',
    status: 'public_static_asset_surface_check_skipped_missing_out',
    policy: {
      source_free: true,
      reads_private_content: false,
      writes_public_ready: false,
      starts_server: false,
      scans_static_export_only: true,
      text_scan_max_bytes: maxTextScanBytes,
      allow_missing_out: true
    },
    inputs: {
      out_dir: relative(root, outRoot)
    },
    summary: {
      checked_assets: 0,
      allowed_assets: 0,
      failed_assets: 0,
      blocked_extension_assets: 0,
      embedded_blocked_extension_assets: 0,
      unexpected_extension_assets: 0,
      blocked_signature_assets: 0,
      path_leak_assets: 0,
      content_leak_assets: 0,
      failure_count: 0,
      public_ready_after_check: 0
    },
    extension_counts: {},
    assets: [],
    failures: []
  };
}

async function collectFiles(directory, prefix = '') {
  const items = await readdir(directory, { withFileTypes: true });
  const collected = [];
  for (const item of items) {
    const relativePath = prefix ? `${prefix}/${item.name}` : item.name;
    const absolutePath = resolve(directory, item.name);
    if (item.isDirectory()) {
      collected.push(...await collectFiles(absolutePath, relativePath));
    } else if (item.isFile()) {
      collected.push(relativePath);
    }
  }
  return collected.sort();
}

function checkAsset(relativePath) {
  const absolutePath = resolve(outRoot, relativePath);
  const extension = extname(relativePath).toLowerCase();
  const basename = relativePath.split('/').pop();
  const stats = statSync(absolutePath);
  const failures = [];
  const blockedExtension = blockedExtensions.has(extension);
  const embeddedBlockedExtensions = detectEmbeddedBlockedExtensions(relativePath, extension);
  const extensionlessAllowed = extension === '' && allowedExtensionlessFiles.has(basename);
  const unexpectedExtension = !blockedExtension && !extensionlessAllowed && !allowedExtensions.has(extension);
  const blockedSignatures = detectBlockedBinarySignatures(absolutePath);
  const pathLeakMatches = publicLeakMatches(relativePath);
  const contentLeakMatches = scanTextContent(absolutePath, extension);

  if (blockedExtension) {
    failures.push({
      id: `asset:${relativePath}:blocked-extension`,
      detail: `Static export must not contain source/archive/office/database artifact extension: ${extension}`
    });
  }
  if (embeddedBlockedExtensions.length > 0) {
    failures.push({
      id: `asset:${relativePath}:embedded-blocked-extension`,
      detail: `Static export asset name contains disguised source/archive/office/database extension(s): ${embeddedBlockedExtensions.join(', ')}`
    });
  }
  if (unexpectedExtension) {
    failures.push({
      id: `asset:${relativePath}:unexpected-extension`,
      detail: `Static export asset extension is not in the public allowlist: ${extension || '[none]'}`
    });
  }
  if (blockedSignatures.length > 0) {
    failures.push({
      id: `asset:${relativePath}:blocked-signature`,
      detail: `Static export asset content has blocked source/archive/database signature(s): ${blockedSignatures.join(', ')}`
    });
  }
  if (pathLeakMatches.length > 0) {
    failures.push({
      id: `asset:${relativePath}:path-leak`,
      detail: `Static export asset path has blocked private/source marker(s): ${pathLeakMatches.join(', ')}`
    });
  }
  if (contentLeakMatches.length > 0) {
    failures.push({
      id: `asset:${relativePath}:content-leak`,
      detail: `Static export text asset has blocked private/source marker(s): ${contentLeakMatches.join(', ')}`
    });
  }

  return {
    path: relative(root, absolutePath),
    relative_path: relativePath,
    extension,
    bytes: stats.size,
    status: failures.length === 0 ? 'passed' : 'failed',
    blocked_extension: blockedExtension,
    embedded_blocked_extensions: embeddedBlockedExtensions,
    unexpected_extension: unexpectedExtension,
    blocked_signatures: blockedSignatures,
    path_leak_matches: [...new Set(pathLeakMatches)],
    content_leak_matches: [...new Set(contentLeakMatches)],
    failures
  };
}

function detectBlockedBinarySignatures(absolutePath) {
  const maxSignatureBytes = Math.max(...blockedBinarySignatures.map((item) => item.signature.length));
  const head = readFileSync(absolutePath).subarray(0, maxSignatureBytes);
  return blockedBinarySignatures
    .filter((item) => head.subarray(0, item.signature.length).equals(item.signature))
    .map((item) => item.id);
}

function detectEmbeddedBlockedExtensions(relativePath, finalExtension) {
  const normalizedPath = relativePath.replace(/\\/g, '/').toLowerCase();
  const extensions = [];

  for (const blockedExtension of blockedExtensions) {
    if (blockedExtension === finalExtension) continue;
    if (
      normalizedPath.includes(`${blockedExtension}.`)
      || normalizedPath.includes(`${blockedExtension}/`)
    ) {
      extensions.push(blockedExtension);
    }
  }

  return [...new Set(extensions)].sort();
}

function scanTextContent(absolutePath, extension) {
  if (!textExtensions.has(extension)) return [];
  const stats = statSync(absolutePath);
  if (stats.size > maxTextScanBytes) return [];
  const body = readFileSync(absolutePath, 'utf8');
  return publicLeakMatches(body).filter((match) => match !== '/\\/home\\//i' || hasLocalHomePath(body));
}

function hasLocalHomePath(value) {
  return publicLeakVariants(value).some((variant) => /(?:^|["'(\s=:])\/home\//i.test(variant));
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function renderMarkdown(report) {
  const lines = [
    '# Public Static Asset Surface Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Checks the built static export for public-safe asset file types, private/source path markers and small text-asset leaks without reading private source roots or promoting public-ready state.',
    '',
    '## Summary',
    '',
    `- checked assets: ${report.summary.checked_assets}`,
    `- failed assets: ${report.summary.failed_assets}`,
    `- blocked extension assets: ${report.summary.blocked_extension_assets}`,
    `- embedded blocked extension assets: ${report.summary.embedded_blocked_extension_assets}`,
    `- unexpected extension assets: ${report.summary.unexpected_extension_assets}`,
    `- blocked signature assets: ${report.summary.blocked_signature_assets}`,
    `- path leak assets: ${report.summary.path_leak_assets}`,
    `- content leak assets: ${report.summary.content_leak_assets}`,
    `- public-ready after check: ${report.summary.public_ready_after_check}`,
    '',
    '## Extension Counts',
    '',
    '| Extension | Count |',
    '| --- | ---: |'
  ];

  Object.entries(report.extension_counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([extension, count]) => {
      lines.push(`| \`${extension}\` | ${count} |`);
    });

  if (report.failures.length > 0) {
    lines.push('', '## Failures', '');
    report.failures.forEach((failure) => lines.push(`- \`${failure.id}\`: ${failure.detail}`));
  }

  return `${lines.join('\n')}\n`;
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
