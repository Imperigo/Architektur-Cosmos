#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const bundlePath = resolve(root, args.bundle || `data/kosmo-owner-unlock-patch-review-bundle-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-patch-review-bundle-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-patch-review-bundle-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const bundle = JSON.parse(await readFile(bundlePath, 'utf8'));
  const checks = buildChecks(bundle);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_patch_review_bundle_guard_passed'
      : 'owner_unlock_patch_review_bundle_guard_failed',
    policy: {
      review_only: true,
      validates_bundle_only: true,
      writes_intake_file: false,
      records_decisions: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, bundlePath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      warnings: 0,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner unlock patch review bundle check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(bundle) {
  const hardStops = (bundle.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', bundle.status === 'owner_unlock_patch_review_bundle_ready', bundle.status),
    check('policy_review_only', bundle.policy?.review_only === true, bundle.policy?.review_only),
    check('policy_bundle_only', bundle.policy?.bundle_only === true, bundle.policy?.bundle_only),
    check('does_not_apply_patch_now', bundle.policy?.applies_patch_now === false && bundle.summary?.applies_patch_now === false, `${bundle.policy?.applies_patch_now}/${bundle.summary?.applies_patch_now}`),
    check('policy_no_intake_write', bundle.policy?.writes_intake_file === false, bundle.policy?.writes_intake_file),
    check('policy_no_decision_recording', bundle.policy?.records_decisions === false, bundle.policy?.records_decisions),
    check('policy_no_session_mutation', bundle.policy?.mutates_session_files === false, bundle.policy?.mutates_session_files),
    check('policy_no_source_root_guards', bundle.policy?.runs_source_root_guards === false, bundle.policy?.runs_source_root_guards),
    check('policy_no_private_reads', bundle.policy?.reads_private_content === false, bundle.policy?.reads_private_content),
    check('policy_no_private_inventory', bundle.policy?.runs_private_inventory_now === false, bundle.policy?.runs_private_inventory_now),
    check('public_ready_zero', bundle.summary?.public_ready_after_bundle === 0, bundle.summary?.public_ready_after_bundle),
    check('six_patch_operations', bundle.summary?.patch_operations === 6, bundle.summary?.patch_operations),
    check('one_source_root_patch', bundle.summary?.source_root_patches === 1, bundle.summary?.source_root_patches),
    check('five_owner_card_patches', bundle.summary?.owner_card_patches === 5, bundle.summary?.owner_card_patches),
    check('all_owner_card_patches_allowed', bundle.summary?.allowed_owner_card_patches === bundle.summary?.owner_card_patches, `${bundle.summary?.allowed_owner_card_patches}/${bundle.summary?.owner_card_patches}`),
    check('no_reference_decision_patches', bundle.summary?.reference_decision_patches === 0, bundle.summary?.reference_decision_patches),
    check('hard_stop_no_apply', hardStops.includes('do not apply this bundle automatically'), hardStops),
    check('hard_stop_no_intake_write', hardStops.includes('do not write the intake template'), hardStops),
    check('hard_stop_no_session_mutation', hardStops.includes('do not mutate session files'), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('do not read private content'), hardStops),
    check('hard_stop_public_ready_zero', hardStops.includes('public-ready') && hardStops.includes('0'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Patch Review Bundle Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((checkItem) => {
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${String(checkItem.evidence ?? '-')}`);
  });
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
