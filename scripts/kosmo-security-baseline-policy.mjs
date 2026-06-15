#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-security-baseline-policy-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-security-baseline-policy-${dateStamp}.md`);

const categories = [
  category('must_redact', 'Identifiers or paths that would leak private owner, device, source-root or account information in public artifacts.', 'security-check must fail until redacted'),
  category('private_repo_allowed', 'Identifiers that are acceptable only because the repository is private and the artifact is operationally local.', 'security-check may suppress only with explicit baseline entry'),
  category('generated_review_allowed', 'Generated review examples that quote local roles or worker names and are not public export inputs.', 'security-check may suppress only for exact generated paths'),
  category('script_context_allowed', 'Scripts that contain local context strings needed for detection, but not secrets.', 'security-check may suppress only personal-pattern findings, never secrets'),
  category('secret_never_allowed', 'API keys, tokens, private keys and credentials.', 'security-check must always fail')
];

const initialRules = [
  rule('source_root_artifacts', ['data/kosmo-source-root-*', 'docs/codex/kosmo-source-root-*', 'examples/kosmo-references/provenance/source-root-*'], 'private_repo_allowed', 'Source-root discovery and decision artifacts are local operational records.'),
  rule('onedrive_sync_artifacts', ['data/kosmo-onedrive-sync-error-summary-*', 'docs/codex/kosmo-onedrive-sync-error-summary-*'], 'private_repo_allowed', 'OneDrive sync diagnostics can include local account/path hints.'),
  rule('owner_review_artifacts', ['data/kosmo-owner-*', 'docs/codex/kosmo-owner-*'], 'private_repo_allowed', 'Owner review packets are private governance artifacts.'),
  rule('private_library_diagnostics', ['data/kosmoreferences-private-library-*', 'docs/codex/kosmoreferences-private-library-*'], 'private_repo_allowed', 'Private library diagnostics are not public export inputs.'),
  rule('generated_orbit_reviews', ['examples/kosmo-orbit/review/*'], 'generated_review_allowed', 'Generated Orbit review fixtures need separate public-export filtering.'),
  rule('local_context_scripts', ['scripts/kosmo-source-root-locator.mjs', 'scripts/kosmo-storage-mount-snapshot.mjs', 'scripts/kosmo-private-library-diagnostic.mjs', 'scripts/kosmo-onedrive-sync-error-summary.mjs'], 'script_context_allowed', 'These scripts intentionally detect local operational paths and names.')
];

const report = {
  schema_version: '0.1',
  generated_at: new Date().toISOString(),
  status: 'security_baseline_policy_ready',
  policy: {
    policy_only: true,
    modifies_security_check_now: false,
    suppresses_findings_now: false,
    secrets_never_allowed: true,
    public_ready_after_policy: 0
  },
  categories,
  initial_rules: initialRules,
  implementation_contract: [
    'Baseline must be explicit data, not hard-coded broad regex weakening.',
    'Baseline can suppress only personal identifier findings, never secret patterns.',
    'Every suppressed finding must retain count and category in the report.',
    'Public export workflows must keep failing on must_redact and secret_never_allowed.',
    'New paths are not auto-allowed; they require a baseline rule update.'
  ],
  next_actions: [
    'Create config/kosmo-security-baseline.json from this policy.',
    'Patch scripts/security-check.mjs to load the baseline and report suppressed counts.',
    'Run npm run security:check and verify secrets still hard-fail.',
    'Only after that rerun npm run quality:check.'
  ]
};

await mkdir(dirname(outputJson), { recursive: true });
await mkdir(dirname(outputMd), { recursive: true });
await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(outputMd, renderMarkdown(report));

console.log('Kosmo security baseline policy');
console.log(`Status: ${report.status}`);
console.log(`Categories: ${report.categories.length}`);
console.log(`Initial rules: ${report.initial_rules.length}`);
console.log(`Wrote: ${relative(root, outputMd)}`);

function category(id, description, checkBehavior) {
  return { id, description, check_behavior: checkBehavior };
}

function rule(id, pathGlobs, categoryId, rationale) {
  return {
    id,
    path_globs: pathGlobs,
    category: categoryId,
    finding_types: ['personal_identifier'],
    rationale,
    suppress_now: false,
    owner_review_required_before_public_export: true
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Security Baseline Policy');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Categories: ${report.categories.length}`);
  lines.push(`- Initial rules: ${report.initial_rules.length}`);
  lines.push(`- Suppresses findings now: ${report.policy.suppresses_findings_now}`);
  lines.push(`- Secrets never allowed: ${report.policy.secrets_never_allowed}`);
  lines.push(`- Public-ready after policy: ${report.policy.public_ready_after_policy}`);
  lines.push('');
  lines.push('## Categories');
  lines.push('');
  report.categories.forEach((item) => lines.push(`- \`${item.id}\`: ${item.description}`));
  lines.push('');
  lines.push('## Initial Rules');
  lines.push('');
  lines.push('| Rule | Category | Globs |');
  lines.push('| --- | --- | --- |');
  for (const item of report.initial_rules) {
    lines.push(`| \`${item.id}\` | ${item.category} | ${item.path_globs.map((glob) => `\`${glob}\``).join('<br>')} |`);
  }
  lines.push('');
  lines.push('## Implementation Contract');
  lines.push('');
  report.implementation_contract.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((item) => lines.push(`- ${item}`));
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
