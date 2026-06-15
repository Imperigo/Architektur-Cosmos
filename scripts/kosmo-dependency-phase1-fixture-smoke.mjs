#!/usr/bin/env node

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const venvPython = args.python || '/mnt/data/ArchitekturKosmos/tools/kosmo-python-tools/.venv/bin/python';
const outputJson = resolve(root, args.out || `data/kosmo-dependency-phase1-fixture-smoke-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-dependency-phase1-fixture-smoke-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const tempRoot = await mkdtemp(join(tmpdir(), 'kosmo-phase1-fixture-'));
  const fixtureHtml = join(tempRoot, 'kosmo-fixture.html');
  await writeFile(fixtureHtml, '<h1>Kosmo Fixture</h1><p>Material: timber</p><p>Structure: frame</p>\n');

  const checks = [
    runPython('markitdown_html_conversion', `
from markitdown import MarkItDown
result = MarkItDown().convert(${JSON.stringify(fixtureHtml)})
text = result.text_content
assert '# Kosmo Fixture' in text
assert 'Material: timber' in text
print('converted_html_to_markdown')
`),
    runPython('docling_import_only', `
import importlib.metadata as md
print(md.version('docling'))
`),
    runPython('ifcopenshell_synthetic_entity', `
import ifcopenshell
f = ifcopenshell.file()
project = f.create_entity('IfcProject', GlobalId=ifcopenshell.guid.new(), Name='Synthetic Kosmo Fixture')
assert project.is_a() == 'IfcProject'
print(project.Name)
`),
    runPython('topologicpy_import_only', `
import importlib.metadata as md
import topologicpy
print(md.version('topologicpy'))
`),
    runPython('specklepy_import_only', `
import importlib.metadata as md
import specklepy
print(md.version('specklepy'))
`)
  ];

  await rm(tempRoot, { recursive: true, force: true });

  const failures = checks.filter((check) => check.status !== 'passed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'dependency_phase1_fixture_smoke_passed' : 'dependency_phase1_fixture_smoke_failed',
    policy: {
      fixture_only: true,
      uses_synthetic_inputs_only: true,
      downloads_models_now: false,
      reads_private_content: false,
      runs_private_ocr: false,
      runs_embeddings_on_private_content: false,
      public_ready_after_smoke: 0
    },
    environment: {
      python: venvPython
    },
    summary: {
      checks: checks.length,
      passed_checks: checks.filter((check) => check.status === 'passed').length,
      failures: failures.length,
      public_ready_after_smoke: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo dependency phase 1 fixture smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function runPython(id, code) {
  const result = spawnSync(venvPython, ['-c', code], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
    shell: false
  });
  return {
    id,
    status: result.status === 0 ? 'passed' : 'failed',
    exit_code: result.status,
    stdout: clip(result.stdout),
    stderr: clip(result.stderr),
    reads_private_content: false,
    public_ready_after_check: 0
  };
}

function clip(value) {
  const text = (value || '').trim();
  if (text.length <= 1200) return text;
  return `${text.slice(0, 1200)}...`;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Dependency Phase 1 Fixture Smoke');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed_checks}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after smoke: ${report.summary.public_ready_after_smoke}`);
  lines.push(`- Python: \`${report.environment.python}\``);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  lines.push('| Check | Status | Output |');
  lines.push('| --- | --- | --- |');
  for (const check of report.checks) {
    lines.push(`| \`${check.id}\` | ${check.status} | \`${check.stdout || check.stderr || '-'}\` |`);
  }
  lines.push('');
  return lines.join('\n');
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
