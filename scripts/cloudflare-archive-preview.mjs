#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const d1Name = 'architecture-cosmos-preview';
const r2Bucket = 'architecture-cosmos-assets-preview';

main();

function main() {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error('CLOUDFLARE_API_TOKEN is not set.');
    console.error('Create a Cloudflare API token with D1/R2 edit rights, then run:');
    console.error('  export CLOUDFLARE_API_TOKEN="..."');
    console.error('  npm run archive:cloudflare-preview');
    process.exitCode = 1;
    return;
  }

  run('npm', ['run', 'archive:validate']);
  run('npm', ['run', 'archive:export']);
  run('npm', ['run', 'archive:r2-manifest']);

  ensureD1Database();
  ensureR2Bucket();

  run('npx', ['wrangler', 'd1', 'execute', d1Name, '--remote', '--file', 'schema/architecture-cosmos-d1.sql']);
  run('npx', ['wrangler', 'd1', 'execute', d1Name, '--remote', '--file', 'out/archive-d1-import.sql']);

  runSmokeQuery('entries', 'SELECT COUNT(*) AS entries FROM entries;');
  runSmokeQuery('relations', 'SELECT COUNT(*) AS relations FROM entry_relations;');
  runSmokeQuery('flower_sources', "SELECT COUNT(*) AS flower_sources FROM entry_sources WHERE entry_id = 'afasia-no-architecture-flower-house';");
  runSmokeQuery('flower_media', "SELECT COUNT(*) AS flower_media FROM entry_media WHERE entry_id = 'afasia-no-architecture-flower-house';");
  runSmokeQuery('flower_models', "SELECT COUNT(*) AS flower_models FROM entry_models WHERE entry_id = 'afasia-no-architecture-flower-house';");
  runSmokeQuery('flower_analysis', "SELECT COUNT(*) AS flower_analysis FROM entry_analysis WHERE entry_id = 'afasia-no-architecture-flower-house';");
  runSmokeQuery('afasia_entries', "SELECT COUNT(DISTINCT et.entry_id) AS afasia_entries FROM entry_tags et JOIN tags t ON t.id = et.tag_id WHERE t.label = 'Afasia';");

  console.log('\nCloudflare archive preview is ready.');
  console.log(`D1: ${d1Name}`);
  console.log(`R2: ${r2Bucket}`);
  console.log('The live website is still static and is not connected to D1/R2.');
}

function ensureD1Database() {
  const list = runJson('npx', ['wrangler', 'd1', 'list', '--json']);
  const exists = Array.isArray(list) && list.some((database) => database.name === d1Name);

  if (exists) {
    console.log(`D1 database already exists: ${d1Name}`);
    return;
  }

  run('npx', ['wrangler', 'd1', 'create', d1Name]);
}

function ensureR2Bucket() {
  const list = runJson('npx', ['wrangler', 'r2', 'bucket', 'list', '--json']);
  const exists = Array.isArray(list) && list.some((bucket) => bucket.name === r2Bucket);

  if (exists) {
    console.log(`R2 bucket already exists: ${r2Bucket}`);
    return;
  }

  run('npx', ['wrangler', 'r2', 'bucket', 'create', r2Bucket]);
}

function runSmokeQuery(label, sql) {
  console.log(`\nRemote smoke query: ${label}`);
  run('npx', ['wrangler', 'd1', 'execute', d1Name, '--remote', '--command', sql]);
}

function runJson(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe']
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed`);
  }

  const output = result.stdout.trim();
  if (!output) return null;

  try {
    return JSON.parse(output);
  } catch (error) {
    process.stdout.write(result.stdout);
    throw new Error(`Could not parse JSON output from ${command} ${args.join(' ')}: ${error.message}`);
  }
}

function run(command, args) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'inherit'
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
}
