#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const brainDbName = 'architecture-cosmos-brain';
const today = new Date().toISOString().slice(0, 10);
const outputDir = resolve(rootDir, 'out/brain-review', today);
const schemaPath = resolve(rootDir, 'schema/architecture-cosmos-brain-d1.sql');
const seedPath = resolve(outputDir, 'brain-cloud-seed.sql');

const args = new Set(process.argv.slice(2));
const statusOnly = args.has('--status');
const createD1 = args.has('--create-d1');
const applyRemote = args.has('--apply-remote');
const smokeRemote = args.has('--smoke-remote');
const confirmed = args.has('--confirm-d1-write');

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  if (!statusOnly && !createD1 && !applyRemote && !smokeRemote) {
    await runPlan();
    return;
  }

  if (statusOnly) {
    await printStatus();
  }

  if (createD1) {
    ensureToken();
    ensureD1Database();
  }

  if (applyRemote) {
    ensureToken();
    ensureWriteConfirmation();
    ensureD1Database();
    ensureLocalSeed();
    run('npx', ['wrangler', 'd1', 'execute', brainDbName, '--remote', '--file', relativeToRoot(schemaPath)]);
    run('npx', ['wrangler', 'd1', 'execute', brainDbName, '--remote', '--file', relativeToRoot(seedPath)]);
    console.log('Remote Brain D1 preview seed applied.');
  }

  if (smokeRemote) {
    ensureToken();
    ensureD1Database();
    remoteQuery('SELECT COUNT(*) AS runs FROM brain_runs;');
    remoteQuery('SELECT COUNT(*) AS tasks FROM brain_tasks;');
    remoteQuery('SELECT COUNT(*) AS reports FROM brain_reports;');
  }
}

async function runPlan() {
  run('npm', ['run', 'brain:cloud-ready']);
  ensureLocalSeed();

  const schema = await readFile(schemaPath, 'utf8');
  const seed = await readFile(seedPath, 'utf8');
  const tables = ['brain_runs', 'brain_tasks', 'brain_approvals', 'brain_errors', 'brain_reports', 'brain_obsidian_exports'];
  const missingTables = tables.filter((table) => !schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`));
  if (missingTables.length > 0) {
    throw new Error(`Brain D1 schema is missing tables: ${missingTables.join(', ')}`);
  }

  const insertCount = (seed.match(/INSERT OR REPLACE INTO/g) ?? []).length;
  if (insertCount < 3) {
    throw new Error('Brain seed preview looks too small. Run npm run brain:cloud-ready again.');
  }

  console.log('');
  console.log('Architecture Cosmos Brain D1 preview plan');
  console.log(`D1 target: ${brainDbName}`);
  console.log(`Schema: ${relativeToRoot(schemaPath)}`);
  console.log(`Seed: ${relativeToRoot(seedPath)}`);
  console.log(`Seed inserts: ${insertCount}`);
  console.log('Cloud writes: false');
  console.log('');
  console.log('Optional owner-approved commands:');
  console.log('  npm run brain:d1-status');
  console.log('  npm run brain:d1-create');
  console.log('  npm run brain:d1-apply-preview');
  console.log('  npm run brain:d1-smoke-remote');
}

async function printStatus() {
  ensureToken();
  const list = listD1Databases();
  const match = list.find((database) => database.name === brainDbName);
  console.log('Architecture Cosmos Brain D1 status');
  if (!match) {
    console.log(`D1: missing (${brainDbName})`);
    console.log('Cloud writes: false');
    return;
  }

  console.log(`D1: exists (${match.name})`);
  console.log(`ID: ${match.uuid ?? match.database_id ?? 'unknown'}`);
  console.log('Cloud writes: false');
}

function ensureD1Database() {
  const list = listD1Databases();
  const match = list.find((database) => database.name === brainDbName);
  if (match) {
    console.log(`D1 database already exists: ${brainDbName}`);
    return;
  }

  run('npx', ['wrangler', 'd1', 'create', brainDbName, '--location', 'eeur', '--update-config=false']);
}

function listD1Databases() {
  const result = spawnSync('npx', ['wrangler', 'd1', 'list', '--json'], {
    cwd: rootDir,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`${result.stderr || result.stdout || 'wrangler d1 list failed'}`.trim());
  }

  return JSON.parse(result.stdout);
}

function remoteQuery(sql) {
  run('npx', ['wrangler', 'd1', 'execute', brainDbName, '--remote', '--command', sql]);
}

function ensureToken() {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    throw new Error('Missing CLOUDFLARE_API_TOKEN. Export a Cloudflare token before touching remote D1.');
  }
}

function ensureWriteConfirmation() {
  if (!confirmed) {
    throw new Error('Refusing remote D1 write. Re-run with --confirm-d1-write after owner approval.');
  }
}

function ensureLocalSeed() {
  const missing = [schemaPath, seedPath].filter((path) => !existsSync(path));
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.map(relativeToRoot).join(', ')}. Run npm run brain:cloud-ready first.`);
  }
}

function run(command, commandArgs) {
  console.log(`\n$ ${command} ${commandArgs.join(' ')}`);
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(' ')} failed`);
  }
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
