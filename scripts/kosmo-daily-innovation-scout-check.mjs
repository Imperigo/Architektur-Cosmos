#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const scoutPath = resolve(root, args.scout || `data/kosmo-daily-innovation-scout-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-daily-innovation-scout-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-daily-innovation-scout-check-${dateStamp}.md`);

const requiredCandidates = new Set([
  'markitdown',
  'docling',
  'qwen3_embedding_reranker',
  'ifcopenshell'
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const scout = JSON.parse(await readFile(scoutPath, 'utf8'));
  const findings = checkScout(scout);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'daily_innovation_scout_guard_passed' : 'daily_innovation_scout_guard_failed',
    policy: {
      scout_only: true,
      installs_tools_now: false,
      reads_private_content: false,
      writes_public_files: false,
      public_ready_after_check: 0,
      note: 'This guard validates innovation scout policy and candidate coverage only.'
    },
    source_refs: [relative(root, scoutPath)],
    summary: {
      scout_status: scout.status,
      candidates: scout.candidates?.length ?? 0,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use the scout to prioritize source-free fixture contracts.',
          'Do not install or clone candidates during this block.',
          'Refresh the scout when owner unlocks Source Root or when a tool becomes immediately actionable.'
        ]
      : [
          'Fix innovation scout guard failures.',
          'Rerun npm run kosmo:daily-innovation-scout and npm run kosmo:daily-innovation-scout-check.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo daily innovation scout check');
  console.log(`Status: ${report.status}`);
  console.log(`Candidates: ${report.summary.candidates}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkScout(scout) {
  const findings = [];
  const candidates = scout.candidates || [];
  const ids = new Set(candidates.map((candidate) => candidate.id));
  expect(scout.schema_version === '0.1', findings, 'schema_version', 'Scout schema_version must be 0.1.');
  expect(scout.status === 'daily_innovation_scout_ready', findings, 'scout_status_ready', 'Scout status must be ready.');
  expect(scout.policy?.scout_only === true, findings, 'scout_only', 'Scout must be scout-only.');
  expect(scout.policy?.installs_tools_now === false, findings, 'no_installs', 'Scout must not install tools.');
  expect(scout.policy?.clones_repositories_now === false, findings, 'no_clones', 'Scout must not clone repositories.');
  expect(scout.policy?.reads_private_content === false, findings, 'no_private_reads', 'Scout must not read private content.');
  expect(scout.policy?.runs_private_ocr === false, findings, 'no_private_ocr', 'Scout must not run private OCR.');
  expect(scout.policy?.runs_embeddings_on_private_content === false, findings, 'no_private_embeddings', 'Scout must not run private embeddings.');
  expect(scout.policy?.runs_training === false, findings, 'no_training', 'Scout must not run training.');
  expect(scout.policy?.public_ready_after_scout === 0, findings, 'public_ready_zero', 'Scout public-ready must remain 0.');
  expect(candidates.length >= 8, findings, 'candidate_count', 'Scout must include at least eight candidates.');
  for (const id of requiredCandidates) {
    expect(ids.has(id), findings, `candidate_present:${id}`, `Scout must include ${id}.`);
  }
  for (const candidate of candidates) {
    expect(Boolean(candidate.source_url), findings, `source_url:${candidate.id}`, `Candidate ${candidate.id} must include a source URL.`);
    expect(candidate.source_type?.startsWith('primary'), findings, `primary_source:${candidate.id}`, `Candidate ${candidate.id} must use a primary source.`);
    expect(candidate.install_now === false, findings, `install_now_false:${candidate.id}`, `Candidate ${candidate.id} must not install now.`);
    expect(candidate.private_content_allowed_now === false, findings, `private_content_false:${candidate.id}`, `Candidate ${candidate.id} must not allow private content now.`);
    expect(Number(candidate.priority) >= 1 && Number(candidate.priority) <= 5, findings, `priority_range:${candidate.id}`, `Candidate ${candidate.id} priority must be 1-5.`);
  }
  expect((scout.recommended_sequence || []).some((item) => item.id === 'private_gate'), findings, 'private_gate_sequence', 'Recommended sequence must include private gate.');
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Daily Innovation Scout Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Scout status: ${report.summary.scout_status}`);
  lines.push(`- Candidates: ${report.summary.candidates}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => {
    lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
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
