#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rulesPath = resolve(rootDir, 'data/brain-rules.json');
const outputRoot = resolve(rootDir, 'out/brain-review');
const today = new Date().toISOString().slice(0, 10);
const defaultTimeoutMs = 180_000;
const args = new Set(process.argv.slice(2));
const fastMode = args.has('--fast');

const checks = [
  {
    id: 'brain-review',
    label: 'Brain review',
    command: 'npm',
    args: ['run', 'brain:review'],
    retry: true,
    safe_healing: 'regenerate_brain_review'
  },
  {
    id: 'archive-validate',
    label: 'Archive validation',
    command: 'npm',
    args: ['run', 'archive:validate'],
    retry: true,
    safe_healing: 'rerun_failed_checks_once'
  },
  {
    id: 'kosmodata-book-smoke',
    label: 'KosmoData book pipeline smoke',
    command: 'npm',
    args: ['run', 'kosmodata:book-ingest:smoke'],
    retry: true,
    safe_healing: 'regenerate_book_pipeline_review'
  },
  {
    id: 'kosmo-context-guard',
    label: 'Kosmo context guard',
    command: 'npm',
    args: ['run', 'kosmo:context-guard', '--', '--project', 'examples/kosmo-projects/kosmo-demo-001'],
    retry: false,
    safe_healing: 'diagnostics_only'
  },
  {
    id: 'lint',
    label: 'Lint',
    command: 'npm',
    args: ['run', 'lint'],
    retry: false,
    safe_healing: 'diagnostics_only',
    timeout_ms: 120_000,
    slow: true
  },
  {
    id: 'ui-audit',
    label: 'Interface continuity audit',
    command: 'npm',
    args: ['run', 'ui:audit'],
    retry: false,
    safe_healing: 'diagnostics_only'
  },
  {
    id: 'atlas-interaction-guard',
    label: 'Atlas interaction guard',
    command: 'npm',
    args: ['run', 'atlas:interaction-guard'],
    retry: false,
    safe_healing: 'diagnostics_only'
  },
  {
    id: 'build',
    label: 'Fresh static build',
    command: 'npm',
    args: ['run', 'build:fresh'],
    retry: true,
    safe_healing: 'rerun_failed_checks_once',
    timeout_ms: 240_000,
    slow: true
  },
  {
    id: 'atlas-static-smoke',
    label: 'Atlas static export smoke',
    command: 'npm',
    args: ['run', 'atlas:static-smoke'],
    retry: false,
    safe_healing: 'diagnostics_only'
  },
  {
    id: 'kosmodata-hud-guard',
    label: 'KosmoData HUD guard',
    command: 'npm',
    args: ['run', 'kosmodata:hud-guard'],
    retry: false,
    safe_healing: 'diagnostics_only'
  },
  {
    id: 'atlas-style-guard',
    label: 'Atlas style-sector guard',
    command: 'npm',
    args: ['run', 'atlas:style-guard'],
    retry: false,
    safe_healing: 'diagnostics_only'
  },
  {
    id: 'hero-image-audit',
    label: 'Public hero image audit',
    command: 'npm',
    args: ['run', 'database:hero-images:audit'],
    retry: false,
    safe_healing: 'diagnostics_only'
  },
  {
    id: 'planet-thumbnail-audit',
    label: 'Planet thumbnail audit',
    command: 'npm',
    args: ['run', 'database:planet-thumbnails:audit'],
    retry: false,
    safe_healing: 'diagnostics_only'
  },
  {
    id: 'pilot-quality-audit',
    label: 'KosmoData pilot quality audit',
    command: 'npm',
    args: ['run', 'database:pilot-quality'],
    retry: false,
    safe_healing: 'diagnostics_only'
  },
  {
    id: 'kosmo-orbit-full-review',
    label: 'KosmoOrbit full review',
    command: 'npm',
    args: ['run', 'kosmo:orbit-full-review'],
    retry: false,
    safe_healing: 'diagnostics_only',
    timeout_ms: 120_000
  },
  {
    id: 'kosmo-asset-full-review',
    label: 'KosmoAsset full review',
    command: 'npm',
    args: ['run', 'kosmo:asset-full-review'],
    retry: false,
    safe_healing: 'diagnostics_only',
    timeout_ms: 120_000
  },
  {
    id: 'security-check',
    label: 'Security check',
    command: 'npm',
    args: ['run', 'security:check'],
    retry: false,
    safe_healing: 'diagnostics_only'
  }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const rules = JSON.parse(await readFile(rulesPath, 'utf8'));
  const outputDir = resolve(outputRoot, today);
  await mkdir(outputDir, { recursive: true });

  const results = [];

  const activeChecks = fastMode ? checks.filter((check) => !check.slow) : checks;

  for (const check of activeChecks) {
    const first = runCheck(check);
    let final = first;

    if (!first.passed && check.retry && rules.autonomy?.failure_policy?.retry_failed_safe_check_once) {
      final = {
        ...runCheck(check),
        retried: true,
        first_failure: first
      };
    }

    results.push(final);
  }

  const report = buildReport({ rules, results });
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'brain-doctor.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDir, 'brain-doctor.md'), renderMarkdown(report), 'utf8');

  console.log(`Architecture Cosmos Brain Doctor${fastMode ? ' Fast' : ''}`);
  console.log(`Output: ${relativeToRoot(outputDir)}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.total} passed`);
  console.log(`Self-healing retries: ${report.summary.retries}`);

  if (report.summary.failed > 0) {
    console.log('Doctor stopped before unsafe changes. Review the report before approving fixes.');
    process.exitCode = 1;
  }
}

function runCheck(check) {
  const startedAt = new Date().toISOString();
  const invocation = resolveInvocation(check);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16,
    timeout: check.timeout_ms ?? defaultTimeoutMs
  });

  return {
    id: check.id,
    label: check.label,
    command: invocation.display,
    safe_healing: check.safe_healing,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: result.status ?? (result.signal === 'SIGTERM' ? 124 : 1),
    passed: result.status === 0,
    retried: false,
    stdout_tail: tail(result.stdout),
    stderr_tail: tail(`${result.stderr ?? ''}\n${result.error?.message ?? ''}`),
    diagnosis: diagnose(check, result)
  };
}

function resolveInvocation(check) {
  if (check.command !== 'npm' || !process.env.npm_execpath) {
    return {
      command: check.command,
      args: check.args,
      display: `${check.command} ${check.args.join(' ')}`
    };
  }

  return {
    command: process.execPath,
    args: [process.env.npm_execpath, ...check.args],
    display: `npm ${check.args.join(' ')}`
  };
}

function diagnose(check, result) {
  if (result.status === 0) return 'passed';

  const output = `${result.stdout}\n${result.stderr}`.toLowerCase();
  if (result.signal === 'SIGTERM') return `Timed out after ${check.timeout_ms ?? defaultTimeoutMs}ms. Treat as local tooling hang unless CI also fails.`;
  if (output.includes('spawnsync npm enoent') || result.error?.code === 'ENOENT') return 'npm is not available on PATH. Run Brain Doctor through npm or use the bundled Node/npm environment.';
  if (check.id === 'build' && (output.includes('failed to load swc') || output.includes('next-swc') || output.includes('different team ids'))) {
    return 'Local Next SWC binary failed to load because of macOS code-signature/runtime environment. Product checks passed; reinstall dependencies or run build in a clean terminal/CI.';
  }
  if (check.id === 'build' && output.includes('type')) return 'Build failed during TypeScript or static generation. Needs code review before edits.';
  if (check.id === 'kosmodata-book-smoke') return 'Book pipeline smoke failed. Check local book ingest, draft generation and rights-gated review output.';
  if (check.id === 'kosmo-context-guard') return 'Context guard failed. Downstream design tools must not use context candidates as design seeds until owner approval is complete.';
  if (check.id === 'lint') return 'Lint failed. Doctor will not auto-fix tracked source files without approval.';
  if (check.id === 'ui-audit') return 'Interface audit failed. Check shared UI tokens, mobile panel rules and touch-target consistency.';
  if (check.id === 'atlas-interaction-guard') return 'Atlas interaction guard failed. Check dossier opening, filter chips, entry-node click propagation and filter panel pinning.';
  if (check.id === 'atlas-static-smoke') return 'Atlas static export smoke failed. Run build:fresh and check /atlas HTML, serialized entries and referenced _next/static assets.';
  if (check.id === 'kosmodata-hud-guard') return 'KosmoData HUD guard failed. Check Database/Search/Dev/Filter placement, global crosshair rendering and overlay close behavior.';
  if (check.id === 'atlas-style-guard') return 'Atlas style-sector guard failed. Check wormhole sector angles, color bands and radial label readability.';
  if (check.id === 'hero-image-audit') return 'Hero image audit failed. Check duplicate URLs, blocked licenses or missing public-safe source metadata.';
  if (check.id === 'planet-thumbnail-audit') return 'Planet thumbnail audit failed. Check project thumbnail coverage, duplicate URLs and node rendering bindings.';
  if (check.id === 'pilot-quality-audit') return 'Pilot quality audit failed. Check source-backed text framework, network relations, 2D plan artifacts, 3D layers and viewer requirements.';
  if (check.id === 'kosmo-orbit-full-review') return 'KosmoOrbit full review failed. Keep /orbit, role gates, command contracts, pilot templates and static demo evidence in review-only mode.';
  if (check.id === 'kosmo-asset-full-review') return 'KosmoAsset full review failed. Check local review certificates, export routes, decision ledger and public promotion gates before using assets.';
  if (check.id === 'security-check') return 'Security check failed. Treat as approval-gated P0 before publish.';
  if (check.id === 'archive-validate') return 'Archive validation failed. Check entry schema, relations, media, model or analysis rows.';
  if (check.id === 'brain-review') return 'Brain review failed. Check rules, queue and data JSON validity.';
  return 'Check failed. Manual review required.';
}

function buildReport({ rules, results }) {
  const failed = results.filter((result) => !result.passed);
  const retries = results.filter((result) => result.retried).length;
  return {
    generated_at: new Date().toISOString(),
    mode: rules.default_mode,
    doctor_mode: fastMode ? 'fast' : 'full',
    posture: rules.autonomy?.posture,
    writes_source_files: false,
    publishes: false,
    approval_required_for_fixes: failed.length > 0,
    summary: {
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      retries
    },
    results,
    self_healing_boundary: {
      allowed: rules.autonomy?.may_self_heal_without_approval ?? [],
      must_ask_before: rules.autonomy?.must_ask_before ?? []
    },
    next_steps: failed.length
      ? failed.map((result) => `Approve a targeted fix for ${result.label}: ${result.diagnosis}`)
      : ['All doctor checks passed. Next autonomous step can be a scoped review-task execution plan.']
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Architecture Cosmos Brain Doctor',
    '',
    `Generated: ${report.generated_at}`,
    `Mode: \`${report.mode}\``,
    `Doctor mode: \`${report.doctor_mode}\``,
    `Posture: \`${report.posture}\``,
    `Writes source files: \`${report.writes_source_files}\``,
    `Publishes: \`${report.publishes}\``,
    '',
    '## Summary',
    '',
    `- Passed: ${report.summary.passed}/${report.summary.total}`,
    `- Failed: ${report.summary.failed}`,
    `- Self-healing retries: ${report.summary.retries}`,
    '',
    '## Checks',
    ''
  ];

  for (const result of report.results) {
    lines.push(`### ${result.passed ? 'PASS' : 'FAIL'} / ${result.label}`);
    lines.push('');
    lines.push(`- Command: \`${result.command}\``);
    lines.push(`- Safe healing: \`${result.safe_healing}\``);
    lines.push(`- Retried: \`${result.retried}\``);
    lines.push(`- Diagnosis: ${result.diagnosis}`);
    if (!result.passed && result.stderr_tail) {
      lines.push('', '```text', result.stderr_tail, '```');
    }
    lines.push('');
  }

  lines.push('## Self-Healing Boundary', '');
  lines.push('Allowed without approval:');
  report.self_healing_boundary.allowed.forEach((item) => lines.push(`- ${item}`));
  lines.push('', 'Must ask before:');
  report.self_healing_boundary.must_ask_before.forEach((item) => lines.push(`- ${item}`));
  lines.push('', '## Next Steps', '');
  report.next_steps.forEach((step) => lines.push(`- ${step}`));
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function tail(value, maxLength = 6000) {
  const clean = (value ?? '').trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(-maxLength);
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}

if (!existsSync(rulesPath)) {
  throw new Error('Missing data/brain-rules.json');
}
