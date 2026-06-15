#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const payloadsPath = resolve(root, args.payloads || `data/kosmo-innovation-github-fixture-payloads-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-fixture-payloads-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-fixture-payloads-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const payloads = JSON.parse(await readFile(payloadsPath, 'utf8'));
  const findings = await checkPayloads(payloads);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_github_fixture_payloads_guard_passed' : 'innovation_github_fixture_payloads_guard_failed',
    policy: {
      validates_payloads_only: true,
      copies_github_code: false,
      copies_readme_text: false,
      clones_repositories_now: false,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_discovered_code_now: false,
      reads_private_content: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, payloadsPath)],
    summary: {
      payloads_status: payloads.status,
      payloads_checked: payloads.written_payloads?.length ?? 0,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Add lightweight payload smoke reader for lane-specific shape checks.',
          'Keep real adapter execution behind dependency/install review.',
          'Wire into day-batch loop after smoke reader exists.'
        ]
      : [
          'Fix GitHub fixture payload guard failures.',
          'Rerun npm run kosmo:innovation-github-fixture-payloads and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub fixture payloads check');
  console.log(`Status: ${report.status}`);
  console.log(`Payloads checked: ${report.summary.payloads_checked}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

async function checkPayloads(report) {
  const findings = [];
  expect(report.schema_version === '0.1', findings, 'schema_version', 'Payload report schema_version must be 0.1.');
  expect(report.status === 'innovation_github_fixture_payloads_ready', findings, 'payloads_ready', 'Payload report must be ready.');
  expect(report.policy?.generated_payloads_only === true, findings, 'generated_payloads_only', 'Report must be generated-payloads-only.');
  expect(report.policy?.synthetic_fixture_only === true, findings, 'synthetic_only', 'Report must be synthetic-fixture-only.');
  expect(report.policy?.github_repositories_are_source_refs_only === true, findings, 'github_refs_only', 'GitHub repositories must be references only.');
  expect(report.policy?.copies_github_code === false, findings, 'no_github_code_copy', 'Report must not copy GitHub code.');
  expect(report.policy?.copies_readme_text === false, findings, 'no_readme_copy', 'Report must not copy README text.');
  expect(report.policy?.clones_repositories_now === false, findings, 'no_clone', 'Report must not clone repositories.');
  expect(report.policy?.installs_dependencies_now === false, findings, 'no_install', 'Report must not install dependencies.');
  expect(report.policy?.downloads_models_now === false, findings, 'no_download', 'Report must not download models.');
  expect(report.policy?.runs_discovered_code_now === false, findings, 'no_discovered_code_run', 'Report must not run discovered code.');
  expect(report.policy?.reads_private_content === false, findings, 'no_private_reads', 'Report must not read private content.');
  expect(report.policy?.public_ready_after_payloads === 0, findings, 'public_ready_zero', 'Report must keep public-ready at 0.');
  expect((report.written_payloads || []).length >= 10, findings, 'payload_count', 'Report must include at least two payloads per GitHub fixture contract.');

  for (const file of report.written_payloads || []) {
    expect(file.startsWith('examples/kosmo-innovation-fixtures/'), findings, `payload_root:${file}`, `${file} must stay under examples/kosmo-innovation-fixtures.`);
    expect(file.endsWith('.fixture.json'), findings, `payload_extension:${file}`, `${file} must use .fixture.json extension.`);
    expect(await exists(resolve(root, file)), findings, `payload_exists:${file}`, `${file} must exist.`);
    const payload = JSON.parse(await readFile(resolve(root, file), 'utf8'));
    expect(payload.status === 'generated_github_signal_fixture_payload', findings, `payload_status:${file}`, `${file} must be generated GitHub-signal payload.`);
    expect(payload.source_repo_is_reference_only === true, findings, `payload_repo_ref:${file}`, `${file} must mark the source repo as reference only.`);
    expect(payload.policy?.private_content === false, findings, `payload_no_private:${file}`, `${file} must declare no private content.`);
    expect(payload.policy?.generated_or_public_safe === true, findings, `payload_generated_safe:${file}`, `${file} must be generated/public-safe.`);
    expect(payload.policy?.copied_github_code === false, findings, `payload_no_code_copy:${file}`, `${file} must not copy GitHub code.`);
    expect(payload.policy?.copied_readme_text === false, findings, `payload_no_readme_copy:${file}`, `${file} must not copy README text.`);
    expect(payload.policy?.tool_output === false, findings, `payload_not_tool_output:${file}`, `${file} must not claim to be tool output.`);
    expect(payload.policy?.public_ready === false, findings, `payload_public_ready_false:${file}`, `${file} must keep public_ready false.`);
    expect(payload.policy?.public_ready_after_payload === 0, findings, `payload_public_ready_zero:${file}`, `${file} must keep public-ready after payload at 0.`);
    expect(payload.expected_review?.repository_review_required_before_adapter_work === true, findings, `payload_repo_review:${file}`, `${file} must require repository review before adapter work.`);
    expect(payload.expected_review?.human_review_required_before_training === true, findings, `payload_human_review:${file}`, `${file} must require human review before training.`);
    expect(payload.promotion?.source_free_promotable === true, findings, `payload_promotable:${file}`, `${file} must carry source-free promotion metadata.`);
    expect(Boolean(payload.promotion?.promotion_decision), findings, `payload_promotion_decision:${file}`, `${file} must carry a promotion decision.`);
    expect(Boolean(payload.promotion?.training_eval_lane), findings, `payload_training_lane:${file}`, `${file} must carry a training eval lane.`);
    expect((payload.promotion?.ontology_bindings?.entities || []).length > 0, findings, `payload_ontology_entities:${file}`, `${file} must carry ontology entity bindings.`);
    expect((payload.promotion?.ontology_bindings?.relations || []).length > 0, findings, `payload_ontology_relations:${file}`, `${file} must carry ontology relation bindings.`);
    expect(payload.expected_review?.training_eval_lane === payload.promotion?.training_eval_lane, findings, `payload_review_training_lane:${file}`, `${file} expected review must match the promotion training lane.`);
    expect(payload.expected_review?.ontology_bindings_present === true, findings, `payload_review_ontology:${file}`, `${file} expected review must confirm ontology bindings.`);
  }
  return findings;
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Fixture Payloads Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Payloads status: ${report.summary.payloads_status}`);
  lines.push(`- Payloads checked: ${report.summary.payloads_checked}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`));
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
