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
    ...checkCrossWorkerIntelligence(policy),
    ...checkNotionObsidianMemoryPolicy(policy),
    ...checkRemoteAccessEnergyPolicy(policy),
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

function checkCrossWorkerIntelligence(policy) {
  const findings = [];
  const intel = policy.cross_worker_intelligence || {};
  const trackedWorkers = intel.tracked_workers || [];
  const trackedSources = intel.tracked_sources || [];
  const dailyOutputs = intel.daily_outputs || [];
  const adoptionRules = intel.adoption_rules || [];
  expect(intel.daily_required === true, findings, 'cross_worker_daily_required', 'Cross-worker intelligence must run daily.');
  expect(intel.scan_window === '08:00-08:30', findings, 'cross_worker_scan_window', 'Cross-worker scan must run during morning intake.');
  ['Claude Code KosmoDesign', 'Claude Code KosmoDraw', 'Claude Code KosmoOverseer', 'local LLM workers via Odysseus/Kosmo'].forEach((worker) => {
    expect(trackedWorkers.includes(worker), findings, `tracked_worker:${worker}`, `Tracked workers must include ${worker}.`);
  });
  ['KosmoOrbit _overseer/intake/inbox handoffs', 'available Claude/KosmoDesign design concept files', 'Notion AI tab notes and Obsidian memory', 'KosmoDraw bundle or model-output handoffs'].forEach((source) => {
    expect(trackedSources.includes(source), findings, `tracked_source:${source}`, `Tracked sources must include ${source}.`);
  });
  ['cross-worker delta summary', 'new capability intake list', 'Codex adoption plan for useful tool capabilities'].forEach((output) => {
    expect(dailyOutputs.includes(output), findings, `daily_output:${output}`, `Daily outputs must include ${output}.`);
  });
  expect(adoptionRules.some((rule) => rule.includes('Do not modify Claude-owned')), findings, 'claude_owned_guard', 'Adoption rules must protect Claude-owned code.');
  expect(adoptionRules.some((rule) => rule.includes('review-only adapter')), findings, 'review_only_adapter_rule', 'Adoption rules must prefer review-only adapters for risky capabilities.');
  return findings;
}

function checkNotionObsidianMemoryPolicy(policy) {
  const findings = [];
  const memory = policy.notion_obsidian_memory_policy || {};
  const notionSources = memory.notion_sources || [];
  const dailyActions = memory.daily_actions || [];
  expect(memory.daily_required === true, findings, 'notion_obsidian_daily_required', 'Notion/Obsidian memory policy must run daily.');
  expect(notionSources.some((source) => source.name === 'AI (2)' && source.url === 'https://app.notion.com/p/366c5f77d5f78023843eec81d63ea890'), findings, 'notion_ai2_source', 'Notion sources must include AI (2).');
  expect(notionSources.some((source) => source.name === 'Prepare-Scan pages'), findings, 'notion_prepare_scan_source', 'Notion sources must include Prepare-Scan pages.');
  expect(notionSources.some((source) => source.name === 'AI-Scan pages'), findings, 'notion_ai_scan_source', 'Notion sources must include AI-Scan pages.');
  expect(memory.obsidian_vault?.path === '/mnt/data/ArchitekturKosmos', findings, 'obsidian_vault_path', 'Obsidian vault path must be /mnt/data/ArchitekturKosmos.');
  expect(memory.obsidian_vault?.memory_folder === '09 Codex Memory', findings, 'obsidian_memory_folder', 'Obsidian memory folder must be 09 Codex Memory.');
  expect(memory.obsidian_vault?.private_by_default === true, findings, 'obsidian_private_default', 'Obsidian must be private by default.');
  ['search and read relevant Notion AI tab notes before selecting major work packages', 'read new Obsidian memory and decision notes', 'write major Codex summaries, decisions and review packets into Obsidian'].forEach((action) => {
    expect(dailyActions.includes(action), findings, `notion_obsidian_action:${action}`, `Notion/Obsidian daily actions must include: ${action}.`);
  });
  expect(typeof memory.first_synced_note === 'string' && memory.first_synced_note.includes('Notion AI Tab'), findings, 'obsidian_first_synced_note', 'Policy must reference the first synced Obsidian note.');
  return findings;
}

function checkRemoteAccessEnergyPolicy(policy) {
  const findings = [];
  const energy = policy.remote_access_energy_policy || {};
  const mustNeverStop = energy.must_never_stop || [];
  const forbidden = energy.forbidden_power_actions_without_owner || [];
  const allowed = energy.allowed_after_work_reductions || [];
  const outputs = energy.daily_outputs || [];
  expect(energy.daily_required === true, findings, 'energy_daily_required', 'Remote access energy policy must run daily.');
  expect(energy.coordination_partner === 'Claude Code KosmoDesign', findings, 'energy_kosmo_design_partner', 'Energy closeout must coordinate with KosmoDesign.');
  expect(energy.coordination_time === 'after_daily_closeout', findings, 'energy_coordination_time', 'Energy coordination must happen after daily closeout.');
  ['Sunshine', 'VPN', 'network interfaces', 'active desktop/login session'].forEach((service) => {
    expect(mustNeverStop.includes(service), findings, `energy_must_never_stop:${service}`, `Energy policy must never stop ${service}.`);
  });
  ['shutdown', 'logout', 'sleep', 'suspend', 'hibernate', 'stop Sunshine', 'stop VPN', 'disable network'].forEach((action) => {
    expect(forbidden.includes(action), findings, `energy_forbidden:${action}`, `Energy policy must forbid ${action} without owner approval.`);
  });
  ['stop unused dev servers', 'pause or stop local LLM jobs', 'reduce GPU-heavy workloads after 18:00'].forEach((action) => {
    expect(allowed.includes(action), findings, `energy_allowed:${action}`, `Energy policy should allow ${action}.`);
  });
  ['energy handoff with running heavy processes', 'Sunshine/VPN reachability status', 'KosmoDesign coordination note'].forEach((output) => {
    expect(outputs.includes(output), findings, `energy_output:${output}`, `Energy daily outputs must include ${output}.`);
  });
  expect(energy.safe_default === 'remote_ready_idle', findings, 'energy_safe_default', 'Energy safe default must be remote_ready_idle.');
  expect(energy.admin_changes_require_owner === true, findings, 'energy_admin_requires_owner', 'Admin power changes must require owner approval.');
  return findings;
}

function checkDailyLoop(policy) {
  const findings = [];
  const loop = policy.daily_loop || [];
  expect(loop.length === 5, findings, 'daily_loop_length', 'Daily loop must contain five time blocks.');
  ['morning_intake', 'main_batch_1', 'midday_check', 'main_batch_2', 'closeout'].forEach((id, index) => {
    expect(loop[index]?.id === id, findings, `daily_loop:${id}`, `Daily loop item ${index + 1} must be ${id}.`);
  });
  expect((loop[0]?.required_actions || []).some((action) => action.includes('KosmoDesign')), findings, 'morning_cross_worker_action', 'Morning intake must include KosmoDesign/KosmoDraw/KosmoOverseer progress scan.');
  expect((loop[0]?.required_actions || []).some((action) => action.includes('Notion AI tab')), findings, 'morning_notion_obsidian_action', 'Morning intake must include Notion AI tab and Obsidian memory scan.');
  expect((loop[4]?.required_actions || []).some((action) => action.includes('energy')), findings, 'closeout_energy_action', 'Closeout must include remote-ready energy state.');
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
