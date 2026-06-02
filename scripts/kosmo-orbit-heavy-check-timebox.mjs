#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-heavy-check-timebox.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-heavy-check-timebox.generated.md');
const defaultTimeoutMs = numberArg(args.timeoutMs, 90_000);
const buildTimeoutMs = numberArg(args.buildTimeoutMs, 150_000);
const commonEnv = {
  CI: '1',
  NEXT_TELEMETRY_DISABLED: '1'
};

const commandPlan = [
  {
    id: 'git_status_no_ahead',
    label: 'Git status without ahead/behind traversal',
    command: 'git',
    args: ['status', '--short', '--branch', '--no-ahead-behind'],
    timeoutMs: 20_000
  },
  {
    id: 'toolchain_probe',
    label: 'Local Node/Next/TypeScript/ESLint probe',
    command: process.execPath,
    args: [
      '-e',
      [
        "const {existsSync, readFileSync}=require('node:fs');",
        "const pkg=JSON.parse(readFileSync('package.json','utf8'));",
        "const maybe=(path)=>existsSync(path)?require(path).version:null;",
        "const report={",
        "node:process.version,",
        "npm:process.env.npm_config_user_agent||null,",
        "platform:process.platform,",
        "arch:process.arch,",
        "next:pkg.dependencies?.next||pkg.devDependencies?.next||null,",
        "typescript:pkg.dependencies?.typescript||pkg.devDependencies?.typescript||null,",
        "eslint:pkg.dependencies?.eslint||pkg.devDependencies?.eslint||null,",
        "nextPackage:maybe('./node_modules/next/package.json'),",
        "typescriptPackage:maybe('./node_modules/typescript/package.json'),",
        "eslintPackage:maybe('./node_modules/eslint/package.json'),",
        "tsconfig:existsSync('tsconfig.json'),",
        "eslintConfig:existsSync('eslint.config.mjs'),",
        "nextTelemetryDisabled:process.env.NEXT_TELEMETRY_DISABLED||null,",
        "ci:process.env.CI||null",
        "};",
        "console.log(JSON.stringify(report));"
      ].join('')
    ],
    timeoutMs: 20_000
  },
  {
    id: 'kosmosketch_adapter',
    label: 'KosmoSketch adapter contract check',
    command: 'npm',
    args: ['run', 'kosmo:orbit-kosmosketch-adapter'],
    timeoutMs: defaultTimeoutMs
  },
  {
    id: 'route_smoke',
    label: 'KosmoOrbit route smoke',
    command: 'npm',
    args: ['run', 'kosmo:orbit-route-smoke'],
    timeoutMs: defaultTimeoutMs
  },
  {
    id: 'responsive_audit',
    label: 'KosmoOrbit responsive audit',
    command: 'npm',
    args: ['run', 'kosmo:orbit-responsive-audit'],
    timeoutMs: defaultTimeoutMs
  },
  {
    id: 'full_review',
    label: 'KosmoOrbit full review',
    command: 'npm',
    args: ['run', 'kosmo:orbit-full-review'],
    timeoutMs: defaultTimeoutMs
  },
  {
    id: 'typescript_no_emit',
    label: 'TypeScript no-emit check',
    command: resolve(root, 'node_modules/.bin/tsc'),
    args: ['--noEmit', '--pretty', 'false', '--incremental', 'false'],
    timeoutMs: defaultTimeoutMs,
    env: commonEnv
  },
  {
    id: 'lint',
    label: 'ESLint check',
    command: 'npm',
    args: ['run', 'lint'],
    timeoutMs: defaultTimeoutMs,
    env: commonEnv
  },
  {
    id: 'next_static_build',
    label: 'Next static build without fresh cleanup',
    command: resolve(root, 'node_modules/.bin/next'),
    args: ['build'],
    timeoutMs: buildTimeoutMs,
    env: commonEnv
  }
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const startedAt = new Date();
  const results = [];

  for (const item of commandPlan) {
    const result = await runCommand(item);
    results.push(result);
  }

  const report = buildReport(startedAt, results);
  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit heavy check timebox');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Timed out: ${report.summary.timed_out_checks}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_heavy_check_timebox_passed') process.exit(1);
}

function buildReport(startedAt, results) {
  const failed = results.filter((item) => item.status !== 'passed');
  const timedOut = results.filter((item) => item.status === 'timed_out');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    started_at: startedAt.toISOString(),
    generator: 'kosmo-orbit-heavy-check-timebox',
    mode: 'local_review_only',
    status: failed.length ? 'orbit_heavy_check_timebox_blocked' : 'orbit_heavy_check_timebox_passed',
    safety: {
      no_push: true,
      no_deploy: true,
      no_upload: true,
      no_external_account_change: true,
      purpose: 'Detect heavy-check hangs and preserve local evidence without changing public deployment.'
    },
    environment: environmentSnapshot(),
    summary: {
      check_count: results.length,
      passed_checks: results.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      timed_out_checks: timedOut.length
    },
    checks: results,
    next_actions: failed.length
      ? [
          'Keep this as the current heavy-check blocker record.',
          'Use the toolchain_probe and environment snapshot to diagnose whether the timeout is caused by local Node/Next/SWC tooling.',
          'Treat TypeScript, lint and Next build timeouts as local heavy-check/tooling blockers until they complete with logs.',
          'Rerun this timebox after the local Node/Next toolchain is healthy, before relying on the heavy checks as publish evidence.'
        ]
      : [
          'Use this report as local evidence before commit.',
          'Run static export smoke after a completed build.',
          'Wait for explicit Owner-Go before push or live deploy.'
        ]
  };
}

function runCommand(item) {
  return new Promise((resolveCommand) => {
    const started = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(item.command, item.args, {
      cwd: root,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...(item.env || {})
      }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      killProcessGroup(child.pid, 'SIGTERM');
      setTimeout(() => killProcessGroup(child.pid, 'SIGKILL'), 5000).unref();
    }, item.timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      resolveCommand(resultFor(item, started, 'failed', null, stdout, `${stderr}\n${error.message}`));
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const status = timedOut ? 'timed_out' : code === 0 ? 'passed' : 'failed';
      resolveCommand(resultFor(item, started, status, code, stdout, stderr, signal));
    });
  });
}

function resultFor(item, started, status, exitCode, stdout, stderr, signal = null) {
  return {
    id: item.id,
    label: item.label,
    command: [commandLabel(item.command), ...item.args].join(' '),
    status,
    exit_code: exitCode,
    signal,
    timeout_ms: item.timeoutMs,
    duration_ms: Date.now() - started,
    output_excerpt: outputExcerpt(stdout, stderr),
    stdout_bytes: Buffer.byteLength(stdout ?? '', 'utf8'),
    stderr_bytes: Buffer.byteLength(stderr ?? '', 'utf8')
  };
}

function killProcessGroup(pid, signal) {
  if (!pid) return;
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // The process may already have exited.
    }
  }
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Heavy Check Timebox',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Local review-only report. It does not push, deploy, upload, spend money or modify external accounts.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- failed: ${report.summary.failed_checks}`,
    `- timed out: ${report.summary.timed_out_checks}`,
    '',
    '## Environment',
    '',
    `- node: \`${report.environment.node}\``,
    `- platform: \`${report.environment.platform}\``,
    `- arch: \`${report.environment.arch}\``,
    `- next package: \`${report.environment.package_versions.next}\``,
    `- typescript package: \`${report.environment.package_versions.typescript}\``,
    `- eslint package: \`${report.environment.package_versions.eslint}\``,
    `- CI: \`${report.environment.env.CI || '-'}\``,
    `- NEXT_TELEMETRY_DISABLED: \`${report.environment.env.NEXT_TELEMETRY_DISABLED || '-'}\``,
    '',
    '## Checks',
    '',
    '| Check | Status | Duration | Command | Output |',
    '| --- | --- | ---: | --- | --- |'
  ];

  report.checks.forEach((item) => {
    lines.push(
      `| \`${item.id}\` | \`${item.status}\` | ${item.duration_ms} ms | \`${escapePipe(item.command)}\` | ${escapePipe(item.output_excerpt || '-')} |`
    );
  });

  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function environmentSnapshot() {
  const packageJson = readOptionalJson(resolve(root, 'package.json'));
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    package_versions: {
      next: packageJson?.dependencies?.next || packageJson?.devDependencies?.next || null,
      typescript: packageJson?.dependencies?.typescript || packageJson?.devDependencies?.typescript || null,
      eslint: packageJson?.dependencies?.eslint || packageJson?.devDependencies?.eslint || null
    },
    config_files: {
      tsconfig: existsSync(resolve(root, 'tsconfig.json')),
      eslint_config: existsSync(resolve(root, 'eslint.config.mjs')),
      next_config: existsSync(resolve(root, 'next.config.js')) || existsSync(resolve(root, 'next.config.mjs'))
    },
    env: {
      CI: commonEnv.CI,
      NEXT_TELEMETRY_DISABLED: commonEnv.NEXT_TELEMETRY_DISABLED
    }
  };
}

function readOptionalJson(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function outputExcerpt(stdout, stderr) {
  const lines = `${stdout ?? ''}\n${stderr ?? ''}`
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(-8).join(' | ');
}

function commandLabel(command) {
  if (command.startsWith(root)) return relative(root, command);
  return command;
}

function numberArg(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}
