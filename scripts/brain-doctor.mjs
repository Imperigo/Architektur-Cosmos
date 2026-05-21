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
    id: 'lint',
    label: 'Lint',
    command: 'npm',
    args: ['run', 'lint'],
    retry: false,
    safe_healing: 'diagnostics_only'
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
    id: 'build',
    label: 'Build',
    command: 'npm',
    args: ['run', 'build'],
    retry: true,
    safe_healing: 'rerun_failed_checks_once'
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

  for (const check of checks) {
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

  console.log('Architecture Cosmos Brain Doctor');
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
  const result = spawnSync(check.command, check.args, {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16
  });

  return {
    id: check.id,
    label: check.label,
    command: `${check.command} ${check.args.join(' ')}`,
    safe_healing: check.safe_healing,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: result.status,
    passed: result.status === 0,
    retried: false,
    stdout_tail: tail(result.stdout),
    stderr_tail: tail(result.stderr),
    diagnosis: diagnose(check, result)
  };
}

function diagnose(check, result) {
  if (result.status === 0) return 'passed';

  const output = `${result.stdout}\n${result.stderr}`.toLowerCase();
  if (check.id === 'build' && output.includes('type')) return 'Build failed during TypeScript or static generation. Needs code review before edits.';
  if (check.id === 'lint') return 'Lint failed. Doctor will not auto-fix tracked source files without approval.';
  if (check.id === 'ui-audit') return 'Interface audit failed. Check shared UI tokens, mobile panel rules and touch-target consistency.';
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
