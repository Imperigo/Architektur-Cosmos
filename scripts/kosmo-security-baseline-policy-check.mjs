#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const policyPath = resolve(root, args.policy || `data/kosmo-security-baseline-policy-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-security-baseline-policy-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-security-baseline-policy-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const policy = JSON.parse(await readFile(policyPath, 'utf8'));
  const findings = checkPolicy(policy);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'security_baseline_policy_guard_passed' : 'security_baseline_policy_guard_failed',
    policy: {
      validates_policy_only: true,
      suppresses_findings_now: false,
      secrets_never_allowed: true,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, policyPath)],
    summary: {
      policy_status: policy.status,
      categories: policy.categories?.length ?? null,
      rules: policy.initial_rules?.length ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo security baseline policy check');
  console.log(`Status: ${report.status}`);
  console.log(`Rules: ${report.summary.rules}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPolicy(policy) {
  const findings = [];
  const categories = new Set((policy.categories || []).map((item) => item.id));
  expect(policy.schema_version === '0.1', findings, 'schema_version', 'Policy schema_version must be 0.1.');
  expect(policy.status === 'security_baseline_policy_ready', findings, 'policy_ready', 'Policy must be ready.');
  expect(policy.policy?.policy_only === true, findings, 'policy_only', 'Policy must be policy-only.');
  expect(policy.policy?.modifies_security_check_now === false, findings, 'no_security_check_patch', 'Policy must not patch security check now.');
  expect(policy.policy?.suppresses_findings_now === false, findings, 'no_suppression_now', 'Policy must not suppress findings now.');
  expect(policy.policy?.secrets_never_allowed === true, findings, 'secrets_never_allowed', 'Policy must keep secrets never allowed.');
  expect(policy.policy?.public_ready_after_policy === 0, findings, 'public_ready_zero', 'Policy must keep public-ready at 0.');
  ['must_redact', 'private_repo_allowed', 'generated_review_allowed', 'script_context_allowed', 'secret_never_allowed'].forEach((id) => {
    expect(categories.has(id), findings, `category:${id}`, `Policy must include category ${id}.`);
  });
  expect((policy.initial_rules || []).length >= 5, findings, 'rules_present', 'Policy must include initial baseline rules.');
  for (const rule of policy.initial_rules || []) {
    expect(categories.has(rule.category), findings, `rule_category:${rule.id}`, `${rule.id} must use a known category.`);
    expect((rule.finding_types || []).includes('personal_identifier'), findings, `rule_personal_only:${rule.id}`, `${rule.id} must be scoped to personal identifiers.`);
    expect(!(rule.finding_types || []).includes('secret'), findings, `rule_no_secret:${rule.id}`, `${rule.id} must not suppress secrets.`);
    expect(rule.suppress_now === false, findings, `rule_no_suppress_now:${rule.id}`, `${rule.id} must not suppress now.`);
    expect(rule.owner_review_required_before_public_export === true, findings, `rule_owner_review:${rule.id}`, `${rule.id} must require owner review before public export.`);
  }
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Security Baseline Policy Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Policy status: ${report.summary.policy_status}`);
  lines.push(`- Categories: ${report.summary.categories}`);
  lines.push(`- Rules: ${report.summary.rules}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`));
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
