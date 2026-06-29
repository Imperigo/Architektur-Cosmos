#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const policyPath = resolve(root, args.policy || 'data/kosmo-vacation-autonomy-policy-2026-07.json');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const policy = JSON.parse(await readFile(policyPath, 'utf8'));
  const findings = [
    ...checkMode(policy),
    ...checkWorkerModel(policy),
    ...checkGitPolicy(policy),
    ...checkPublicPrivateBoundary(policy),
    ...checkDailyLoop(policy),
    ...checkRoadmap(policy),
    ...checkTestsAndStops(policy)
  ];
  const failures = findings.filter((finding) => finding.severity === 'failure');

  console.log('Kosmo vacation autonomy policy check');
  console.log(`Policy: ${relative(root, policyPath)}`);
  console.log(`Status: ${failures.length === 0 ? 'vacation_autonomy_policy_guard_passed' : 'vacation_autonomy_policy_guard_failed'}`);
  console.log(`Findings: ${findings.length}`);
  console.log(`Failures: ${failures.length}`);

  for (const finding of findings) {
    console.log(`- ${finding.severity}: ${finding.id} - ${finding.message}`);
  }

  if (failures.length > 0) process.exitCode = 1;
}

function checkMode(policy) {
  const findings = [];
  expect(policy.schema_version === '0.1', findings, 'schema_version', 'Policy schema_version must be 0.1.');
  expect(policy.status === 'vacation_autonomy_policy_active', findings, 'status_active', 'Policy must be active.');
  expect(policy.mode?.start_date === '2026-07-01', findings, 'start_date', 'Vacation mode must start on 2026-07-01.');
  expect(policy.mode?.duration_weeks === 5, findings, 'duration_five_weeks', 'Policy must cover five weeks.');
  expect(policy.mode?.timezone === 'Europe/Zurich', findings, 'timezone', 'Policy timezone must be Europe/Zurich.');
  expect(policy.mode?.daily_window?.start === '08:00', findings, 'daily_start', 'Daily loop must start at 08:00.');
  expect(policy.mode?.daily_window?.end === '18:00', findings, 'daily_end', 'Daily loop must end at 18:00.');
  expect(policy.mode?.daily_window?.night_jobs_allowed === false, findings, 'no_night_jobs', 'Night jobs must stay disabled.');
  expect(policy.mode?.autonomy_level === 'aggressive_privacy_safe', findings, 'autonomy_level', 'Autonomy level must be aggressive_privacy_safe.');
  expect(policy.mode?.owner_review_cadence_days === 3, findings, 'review_cadence', 'Owner review cadence must be every 3 days.');
  return findings;
}

function checkWorkerModel(policy) {
  const findings = [];
  expect(policy.worker_model?.pattern === '2_plus_1', findings, 'worker_pattern', 'Worker pattern must be 2_plus_1.');
  expect(policy.worker_model?.dispatch_worker?.max_default_parallel_workers === 1, findings, 'dispatch_worker_limit', 'Default dispatch worker limit must be 1.');
  expect(policy.worker_model?.dispatch_worker?.requires_disjoint_write_scope === true, findings, 'dispatch_disjoint_scope', 'Dispatch work must require disjoint write scope.');
  expect(policy.worker_model?.local_llm?.may_write_public_or_git_directly === false, findings, 'local_llm_no_direct_write', 'Local LLM must not write public or git directly.');
  expect(policy.worker_model?.local_llm?.output_status === 'review_only', findings, 'local_llm_review_only', 'Local LLM output must be review_only.');
  return findings;
}

function checkGitPolicy(policy) {
  const findings = [];
  expect(policy.git_policy?.daily_private_push === true, findings, 'daily_private_push', 'Daily private push must be enabled.');
  expect(policy.git_policy?.public_deploy_without_owner_review === false, findings, 'no_public_deploy_without_review', 'Public deploy without owner review must be disabled.');
  expect(policy.git_policy?.exact_staging_only === true, findings, 'exact_staging_only', 'Exact staging must be required.');
  expect((policy.git_policy?.forbidden_commands || []).includes('git add .'), findings, 'forbid_git_add_dot', 'Policy must forbid git add dot.');
  expect(policy.git_policy?.dirty_worktree_policy === 'do_not_clean_or_revert_unrelated_worker_changes', findings, 'dirty_worktree_policy', 'Policy must protect unrelated dirty worktree changes.');
  return findings;
}

function checkPublicPrivateBoundary(policy) {
  const findings = [];
  const forbidden = policy.public_private_boundary?.forbidden_public_material || [];
  expect(policy.public_private_boundary?.new_public_content_default === 'review_only', findings, 'new_public_review_only', 'New public content default must be review_only.');
  expect(policy.public_private_boundary?.public_display_allowed_default === false, findings, 'display_default_false', 'public_display_allowed must default false.');
  ['private PDFs', 'OCR text from protected sources', 'local source-root paths', 'archive or OneDrive paths', 'worker logs', '.claude', '.codex', '_overseer', 'unreviewed KosmoDraw outputs'].forEach((item) => {
    expect(forbidden.includes(item), findings, `forbidden:${item}`, `Forbidden public material must include ${item}.`);
  });
  return findings;
}

function checkDailyLoop(policy) {
  const findings = [];
  const loop = policy.daily_loop || [];
  expect(loop.length === 5, findings, 'daily_loop_length', 'Daily loop must contain five time blocks.');
  ['morning_intake', 'main_batch_1', 'midday_check', 'main_batch_2', 'closeout'].forEach((id, index) => {
    expect(loop[index]?.id === id, findings, `daily_loop:${id}`, `Daily loop item ${index + 1} must be ${id}.`);
  });
  return findings;
}

function checkRoadmap(policy) {
  const findings = [];
  const roadmap = policy.five_week_roadmap || [];
  expect(roadmap.length === 5, findings, 'roadmap_five_weeks', 'Roadmap must contain five weeks.');
  roadmap.forEach((week, index) => {
    expect(week.week === index + 1, findings, `roadmap_week:${index + 1}`, `Roadmap week ${index + 1} must be numbered correctly.`);
    expect((week.deliverables || []).length >= 4, findings, `roadmap_deliverables:${index + 1}`, `Roadmap week ${index + 1} must include at least four deliverables.`);
  });
  return findings;
}

function checkTestsAndStops(policy) {
  const findings = [];
  const architectureChecks = policy.test_policy?.architecture_cosmos_daily || [];
  const orbitChecks = policy.test_policy?.kosmoorbit_when_changed || [];
  expect(architectureChecks.includes('npm run lint'), findings, 'test_lint', 'Daily ArchitectureCosmos checks must include lint.');
  expect(architectureChecks.includes('npm run public:kosmodraw-gate'), findings, 'test_kosmodraw_gate', 'Daily ArchitectureCosmos checks must include public:kosmodraw-gate.');
  expect(architectureChecks.includes('npm run build'), findings, 'test_build', 'Daily ArchitectureCosmos checks must include build.');
  expect(orbitChecks.includes('npm test -- --run'), findings, 'orbit_test', 'KosmoOrbit changed checks must include tests.');
  expect(orbitChecks.includes('npm run build'), findings, 'orbit_build', 'KosmoOrbit changed checks must include build.');
  expect((policy.stop_criteria || []).length >= 6, findings, 'stop_criteria_count', 'Policy must define at least six stop criteria.');
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({
    id,
    severity: condition ? 'passed' : 'failure',
    message
  });
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
