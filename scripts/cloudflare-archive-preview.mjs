#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const d1Name = 'architecture-cosmos-preview';
const r2Bucket = 'architecture-cosmos-assets-preview';
const withR2 = process.argv.includes('--with-r2');
const smokeOnly = process.argv.includes('--smoke-only');
const allowR2 = process.env.ARCHITECTURE_COSMOS_ENABLE_R2 === '1' && process.argv.includes('--i-understand-r2-costs');

main();

function main() {
  if (withR2 && !allowR2) {
    console.error('\nR2 creation is blocked by Architecture Cosmos cost guardrails.');
    console.error('R2 is not needed for the D1 database. It stores large files only.');
    console.error('To enable it later, run intentionally:');
    console.error('  export ARCHITECTURE_COSMOS_ENABLE_R2=1');
    console.error('  npm run archive:d1-preview -- --with-r2 --i-understand-r2-costs');
    process.exitCode = 1;
    return;
  }

  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error('CLOUDFLARE_API_TOKEN is not set.');
    console.error('Create a Cloudflare API token with D1 edit rights, then run:');
    console.error('  export CLOUDFLARE_API_TOKEN="..."');
    console.error('  npm run archive:d1-preview');
    process.exitCode = 1;
    return;
  }

  run('npm', ['run', 'archive:validate']);
  if (smokeOnly) {
    runRemoteSmokeQueries();
    return;
  }

  run('npm', ['run', 'archive:export']);
  run('npm', ['run', 'archive:r2-plan']);

  ensureD1Database();
  if (withR2) {
    ensureR2Bucket();
  } else {
    console.log('\nSkipping R2 bucket creation. Local R2 manifest remains in out/archive-r2-manifest.json.');
    console.log('R2 can only be enabled with ARCHITECTURE_COSMOS_ENABLE_R2=1 and --i-understand-r2-costs.');
  }

  run('npx', ['wrangler', 'd1', 'execute', d1Name, '--remote', '--file', 'schema/architecture-cosmos-d1.sql']);
  run('npx', ['wrangler', 'd1', 'execute', d1Name, '--remote', '--file', 'out/archive-d1-import.sql']);

  runRemoteSmokeQueries();

  console.log('\nCloudflare archive preview is ready.');
  console.log(`D1: ${d1Name}`);
  console.log(`R2: ${withR2 ? r2Bucket : 'skipped, local manifest only'}`);
  console.log('The live website is still static and is not connected to D1/R2.');
}

function runRemoteSmokeQueries() {
  ensureD1Database();
  runSmokeQuery('entries', 'SELECT COUNT(*) AS entries FROM entries;');
  runSmokeQuery('relations', 'SELECT COUNT(*) AS relations FROM entry_relations;');
  runSmokeQuery('flower_sources', "SELECT COUNT(*) AS flower_sources FROM entry_sources WHERE entry_id = 'afasia-no-architecture-flower-house';");
  runSmokeQuery('flower_media', "SELECT COUNT(*) AS flower_media FROM entry_media WHERE entry_id = 'afasia-no-architecture-flower-house';");
  runSmokeQuery('flower_models', "SELECT COUNT(*) AS flower_models FROM entry_models WHERE entry_id = 'afasia-no-architecture-flower-house';");
  runSmokeQuery('flower_analysis', "SELECT COUNT(*) AS flower_analysis FROM entry_analysis WHERE entry_id = 'afasia-no-architecture-flower-house';");
  runSmokeQuery('afasia_entries', "SELECT COUNT(DISTINCT et.entry_id) AS afasia_entries FROM entry_tags et JOIN tags t ON t.id = et.tag_id WHERE t.label = 'Afasia';");
}

function ensureD1Database() {
  const list = runJson('npx', ['wrangler', 'd1', 'list', '--json']);
  const exists = Array.isArray(list) && list.some((database) => database.name === d1Name);

  if (exists) {
    console.log(`D1 database already exists: ${d1Name}`);
    return;
  }

  run('npx', ['wrangler', 'd1', 'create', d1Name, '--location', 'eeur', '--update-config=false']);
}

function ensureR2Bucket() {
  const list = runText('npx', ['wrangler', 'r2', 'bucket', 'list']);
  const exists = list.split('\n').some((line) => line.includes(r2Bucket));

  if (exists) {
    console.log(`R2 bucket already exists: ${r2Bucket}`);
    return;
  }

  run('npx', ['wrangler', 'r2', 'bucket', 'create', r2Bucket, '--location', 'eeur', '--update-config=false']);
}

function runSmokeQuery(label, sql) {
  console.log(`\nRemote smoke query: ${label}`);
  run('npx', ['wrangler', 'd1', 'execute', d1Name, '--remote', '--command', sql]);
}

function runJson(command, args) {
  const output = runText(command, args).trim();
  if (!output) return null;

  try {
    return JSON.parse(output);
  } catch (error) {
    process.stdout.write(output);
    throw new Error(`Could not parse JSON output from ${command} ${args.join(' ')}: ${error.message}`);
  }
}

function runText(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe']
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed`);
  }

  return result.stdout;
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
