#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const packagePath = resolve(root, args.package || 'package.json');
const vacationSafePath = resolve(root, args['vacation-safe-check'] || 'scripts/public-vacation-safe-check.mjs');

const requiredGateCommands = [
  {
    id: 'route_manifest',
    command: 'npm run public:route-manifest-check',
    coveredByVacationSafe: 'scripts/public-route-manifest-check.mjs'
  },
  {
    id: 'demo_gate',
    command: 'node scripts/public-demo-gate-check.mjs',
    coveredByVacationSafe: 'scripts/public-demo-gate-check.mjs'
  },
  {
    id: 'static_asset_surface',
    command: 'node scripts/public-static-asset-surface-check.mjs --allow-missing-out',
    coveredByVacationSafe: 'scripts/public-static-asset-surface-check.mjs'
  },
  {
    id: 'entry_detail_dossier',
    command: 'npm run public:entry-detail-dossier-check',
    coveredByVacationSafe: 'scripts/public-entry-detail-dossier-check.mjs'
  }
];

const allowedExtraGateCommands = new Set([
  'npm run public:gate-alignment-check'
]);

const blockedCommandPatterns = [
  { id: 'live_check', pattern: /\bpublic:demo-live-check\b|public-demo-live-check\.mjs/ },
  { id: 'server_start', pattern: /\bnext\s+(?:dev|start)\b|\bnpm\s+run\s+(?:dev|start)\b/ },
  { id: 'cloudflare_deploy', pattern: /\bwrangler\b|\bcloudflare\b/i },
  { id: 'private_inventory', pattern: /private-(?:metadata-)?inventory|source-root|source_root/i },
  { id: 'local_worker', pattern: /local-worker|worker-output|worker-logs/i },
  { id: 'owner_mutation', pattern: /owner-answer|owner-review|owner-unlock|decision-session/i },
  { id: 'public_ready_mutation', pattern: /public[-_:]?ready/i }
];

const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const vacationSafeSource = readFileSync(vacationSafePath, 'utf8');
const gateScript = packageJson.scripts?.['public:gate-check'] || '';
const gateCommands = splitShellAnd(gateScript);
const failures = [];

if (!gateScript) {
  failures.push({
    id: 'package:public-gate-check:missing',
    detail: 'package.json is missing scripts.public:gate-check.'
  });
}

for (const required of requiredGateCommands) {
  const index = gateCommands.indexOf(required.command);
  if (index === -1) {
    failures.push({
      id: `gate:${required.id}:missing`,
      detail: `public:gate-check must include: ${required.command}`
    });
    continue;
  }

  if (index !== requiredGateCommands.findIndex((item) => item.id === required.id)) {
    failures.push({
      id: `gate:${required.id}:order`,
      detail: `public:gate-check command ${required.command} is not in the canonical early-gate order.`
    });
  }

  if (!vacationSafeSource.includes(required.coveredByVacationSafe)) {
    failures.push({
      id: `vacation-safe:${required.id}:coverage`,
      detail: `public-vacation-safe-check.mjs must cover ${required.coveredByVacationSafe}.`
    });
  }
}

for (const command of gateCommands) {
  const isRequired = requiredGateCommands.some((required) => required.command === command);
  if (!isRequired && !allowedExtraGateCommands.has(command)) {
    failures.push({
      id: `gate:unexpected-command:${slug(command)}`,
      detail: `public:gate-check has an unexpected command: ${command}`
    });
  }

  for (const blocked of blockedCommandPatterns) {
    if (blocked.pattern.test(command)) {
      failures.push({
        id: `gate:${blocked.id}:${slug(command)}`,
        detail: `public:gate-check must stay static, source-free and review-only; blocked command: ${command}`
      });
    }
  }
}

const report = {
  schema_version: '0.1',
  generated_at: new Date().toISOString(),
  generator: 'public-gate-alignment-check',
  status: failures.length === 0 ? 'public_gate_alignment_check_passed' : 'public_gate_alignment_check_failed',
  policy: {
    source_free: true,
    reads_private_content: false,
    starts_server: false,
    writes_public_ready: false,
    verifies_static_gate_shape: true,
    verifies_vacation_safe_coverage: true
  },
  inputs: {
    package_json: relative(root, packagePath),
    vacation_safe_check: relative(root, vacationSafePath)
  },
  summary: {
    gate_command_count: gateCommands.length,
    required_gate_commands: requiredGateCommands.length,
    failure_count: failures.length,
    public_ready_after_check: 0
  },
  gate_commands: gateCommands,
  required_gate_commands: requiredGateCommands.map((item) => item.command),
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);

function splitShellAnd(script) {
  return String(script)
    .split(/\s+&&\s+/)
    .map((command) => command.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'empty';
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
