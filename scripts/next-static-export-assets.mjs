#!/usr/bin/env node

import { copyFile, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const sourceRoot = resolve(root, '.next/static');
const outRoot = resolve(root, 'out');
const targetRoot = resolve(outRoot, '_next/static');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(sourceRoot)) throw new Error('Missing .next/static. Run next build before completing static assets.');
  if (!existsSync(outRoot)) throw new Error('Missing out/. Static export output was not created.');

  const sourceFiles = await listFiles(sourceRoot);
  let copied = 0;
  let existing = 0;

  for (const sourceFile of sourceFiles) {
    const targetFile = join(targetRoot, relative(sourceRoot, sourceFile));
    if (existsSync(targetFile)) {
      existing += 1;
      continue;
    }
    await mkdir(dirname(targetFile), { recursive: true });
    await copyFile(sourceFile, targetFile);
    copied += 1;
  }

  console.log('Next static export assets');
  console.log(`Source files: ${sourceFiles.length}`);
  console.log(`Already present: ${existing}`);
  console.log(`Copied missing: ${copied}`);

  const htmlFiles = (await listFiles(outRoot)).filter((file) => file.endsWith('.html'));
  const referencedAssets = await collectReferencedNextAssets(htmlFiles);
  const missingAssets = referencedAssets.filter((asset) => !existsSync(asset.outputPath));
  if (missingAssets.length > 0) {
    const sample = missingAssets.slice(0, 8).map((asset) => `- ${asset.url}`).join('\n');
    throw new Error(`Static export still references missing Next assets:\n${sample}`);
  }

  const cssCount = referencedAssets.filter((asset) => asset.url.includes('/css/')).length;
  const jsCount = referencedAssets.filter((asset) => asset.url.includes('/chunks/')).length;
  if (cssCount === 0 || jsCount === 0) {
    throw new Error(`Static export asset verification failed: css=${cssCount}, js=${jsCount}`);
  }

  console.log(`Referenced assets verified: ${referencedAssets.length}`);
  console.log(`Referenced CSS: ${cssCount}`);
  console.log(`Referenced JS: ${jsCount}`);
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile()) {
      const info = await stat(path);
      if (info.size > 0) files.push(path);
    }
  }
  return files;
}

async function collectReferencedNextAssets(htmlFiles) {
  const assetsByUrl = new Map();
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    const matches = html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g);
    for (const match of matches) {
      const url = match[1];
      const decodedPath = decodeURIComponent(url.slice(1));
      assetsByUrl.set(url, {
        url,
        outputPath: resolve(outRoot, decodedPath)
      });
    }
  }
  return [...assetsByUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
}
