#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const args = parseArgs(process.argv.slice(2));
const keepServerOpen = Boolean(args['keep-server-open']);
const siteUrl = 'https://architekturkosmos.ch';
const blockedPath = '/_overseer/private-source.pdf';
const privateBody = [
  '<!doctype html>',
  '<html lang="de">',
  '<head><title>Synthetic private route</title></head>',
  '<body>',
  'source-root decision payload',
  '/mnt/data/ArchitekturKosmos/Assets/private.pdf',
  '</body>',
  '</html>',
  ''
].join('\n');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');

    if (url.pathname === '/robots.txt') {
      response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      response.end([
        'User-agent: *',
        'Allow: /',
        `Disallow: ${blockedPath}`,
        `Sitemap: ${siteUrl}/sitemap.xml`,
        ''
      ].join('\n'));
      return;
    }

    if (url.pathname === '/sitemap.xml') {
      response.writeHead(200, { 'content-type': 'application/xml; charset=utf-8' });
      response.end([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        `  <url><loc>${siteUrl}/</loc></url>`,
        `  <url><loc>${siteUrl}${blockedPath}</loc></url>`,
        '</urlset>',
        ''
      ].join('\n'));
      return;
    }

    if (url.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(`${'Public atlas route body. '.repeat(40)}\n`);
      return;
    }

    if (url.pathname === blockedPath) {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(privateBody);
      return;
    }

    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  });

  await listen(server);

  try {
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    const result = await runCheck(baseUrl);

    if (result.code === 0) {
      throw new Error(`Expected public-sitemap-route-leak-check to fail for synthetic private sitemap path ${blockedPath}.`);
    }

    const report = parseJsonFromStdout(result.stdout);
    const failedIds = new Set((report.findings || []).map((finding) => finding.id));
    const requiredFailures = [
      'robots:no_private_patterns',
      'sitemap:no_private_patterns',
      `${blockedPath}:path_no_private_patterns`,
      `${blockedPath}:no_private_patterns`
    ];
    const missingFailures = requiredFailures.filter((id) => !failedIds.has(id));

    if (missingFailures.length > 0) {
      throw new Error(`Negative sitemap route leak smoke missed expected failures: ${missingFailures.join(', ')}`);
    }

    console.log(JSON.stringify({
      status: 'passed',
      synthetic_only: true,
      reads_private_content: false,
      starts_server: true,
      blocked_path: blockedPath,
      expected_failed_checks: requiredFailures,
      observed_failed_checks: [...failedIds].sort()
    }, null, 2));
  } finally {
    if (!keepServerOpen) await close(server);
  }
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function runCheck(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        'scripts/public-sitemap-route-leak-check.mjs',
        '--base-url',
        baseUrl,
        '--timeout-ms',
        '1000'
      ],
      {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

function parseJsonFromStdout(stdout) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Expected JSON stdout from sitemap route leak check: ${error instanceof Error ? error.message : String(error)}\n${stdout}`);
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (index + 1 < argv.length && next && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
