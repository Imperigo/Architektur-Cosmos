#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const vaultRoot = resolve(rootDir, 'out/obsidian-vault/Architecture Cosmos');
const reportDir = resolve(rootDir, 'out/brain-review', today);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const review = await readJson(resolve(reportDir, 'brain-review.json'));
  const cloudPlan = await readJson(resolve(reportDir, 'brain-cloud-plan.json'), false);

  await Promise.all([
    mkdir(resolve(vaultRoot, '00 Inbox'), { recursive: true }),
    mkdir(resolve(vaultRoot, '01 Projects'), { recursive: true }),
    mkdir(resolve(vaultRoot, '02 Sources'), { recursive: true }),
    mkdir(resolve(vaultRoot, '03 Research Packs'), { recursive: true }),
    mkdir(resolve(vaultRoot, '04 Brain Reports'), { recursive: true }),
    mkdir(resolve(vaultRoot, '05 Decisions'), { recursive: true }),
    mkdir(resolve(vaultRoot, '06 Taxonomies'), { recursive: true }),
    mkdir(resolve(vaultRoot, '07 Blender + 3D'), { recursive: true }),
    mkdir(resolve(vaultRoot, '08 Private Rights Review'), { recursive: true })
  ]);

  await writeFile(resolve(vaultRoot, 'README.md'), renderVaultReadme(), 'utf8');
  await writeFile(resolve(vaultRoot, '04 Brain Reports', `${today} Brain Review.md`), renderBrainReport(review), 'utf8');
  await writeFile(resolve(vaultRoot, '05 Decisions', 'Cloud Brain V2.md'), renderCloudDecision(cloudPlan), 'utf8');
  await writeFile(resolve(vaultRoot, '06 Taxonomies', 'Architecture Cosmos Tags.md'), renderTaxonomySeed(review), 'utf8');
  await writeFile(resolve(vaultRoot, '08 Private Rights Review', 'Rights Gate.md'), renderRightsGate(), 'utf8');

  console.log('Architecture Cosmos Obsidian export preview');
  console.log(`Vault: ${relativeToRoot(vaultRoot)}`);
  console.log('Writes database: false');
  console.log('Publishes: false');
}

async function readJson(path, required = true) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    if (!required) return null;
    throw new Error(`Missing ${relativeToRoot(path)}. Run npm run brain:review first.`);
  }
}

function renderVaultReadme() {
  return `---\ntype: cosmos_vault_index\nstatus: local_preview\ncreated: ${today}\n---\n\n# Architecture Cosmos Vault\n\nThis is a local Obsidian preview export for Architecture Cosmos.\n\nIt is a thinking and review surface, not the public database and not an asset store.\n\n## Sections\n\n- [[04 Brain Reports/${today} Brain Review|Latest Brain Review]]\n- [[05 Decisions/Cloud Brain V2|Cloud Brain V2 Decision]]\n- [[06 Taxonomies/Architecture Cosmos Tags|Architecture Cosmos Tags]]\n- [[08 Private Rights Review/Rights Gate|Rights Gate]]\n\n## Rules\n\n- No secrets or tokens.\n- No automatic public publishing.\n- Copyright-unclear assets remain private or link-only.\n- Approved decisions go back through Git and tests.\n`;
}

function renderBrainReport(review) {
  const tasks = (review.tasks ?? []).slice(0, 20);
  return `---\ntype: brain_report\ndate: ${today}\nmode: ${review.mode}\napproval_required: true\n---\n\n# ${today} Brain Review\n\n## Summary\n\n- Entries: ${review.summary.entries}\n- Relations: ${review.summary.relations}\n- Broken relations: ${review.summary.broken_relations}\n- Database profiles: ${review.summary.database_profiles}\n- Model ready/planned: ${review.summary.model_ready_or_planned}\n- Analysis ready/planned: ${review.summary.analysis_ready_or_planned}\n\n## Coverage\n\n- Database profile: ${review.coverage.database_profile_percent}%\n- Model: ${review.coverage.model_percent}%\n- Analysis: ${review.coverage.analysis_percent}%\n- Sources: ${review.coverage.source_candidate_percent}%\n\n## Top Tasks\n\n${tasks.map((task) => `- [ ] **${task.priority}** ${task.title}\\n  - ${task.body}`).join('\\n')}\n\n## Next\n\nReview one task batch manually before any execution.\n`;
}

function renderCloudDecision(cloudPlan) {
  const status = cloudPlan?.status ?? 'not_generated';
  const checks = cloudPlan?.summary ? `${cloudPlan.summary.passed}/${cloudPlan.summary.total}` : 'n/a';
  return `---\ntype: decision\nstatus: proposed\ndate: ${today}\n---\n\n# Cloud Brain V2\n\n## Decision Draft\n\nArchitecture Cosmos should use a Cloudflare Scheduled Worker plus a dedicated D1 database named \`architecture-cosmos-brain\` for operational Brain state.\n\n## Current Readiness\n\n- Status: ${status}\n- Checks: ${checks}\n- Writes database: false\n- Publishes: false\n\n## Approval Boundary\n\nThe Brain may observe, diagnose and propose. It may not commit, push, publish, write production D1, upload R2 assets or send email without approval.\n\n## Next Candidate Step\n\nBuild and review read-only status endpoints first. Enable Cron only after D1 state and approval review are complete.\n`;
}

function renderTaxonomySeed(review) {
  return `---\ntype: taxonomy_index\nstatus: draft\n---\n\n# Architecture Cosmos Tags\n\n## Quality Watchlists\n\n- Rights blocked: ${review.watchlists.rights_blocked.length}\n- Missing models: ${review.watchlists.missing_models.length}\n- Missing analysis: ${review.watchlists.missing_analysis.length}\n- Weak relations: ${review.watchlists.weak_relations.length}\n- Public candidates: ${review.watchlists.public_candidates.length}\n\n## Future Dataview Ideas\n\n- entries missing structure analysis;\n- entries with private-only media;\n- entries ready for Blender model planning;\n- entries with fewer than three source candidates;\n- Swiss timber buildings by century and roof form.\n`;
}

function renderRightsGate() {
  return `---\ntype: rights_gate\nstatus: active_rule\n---\n\n# Rights Gate\n\nPublic display is allowed only for:\n\n- own_work\n- licensed\n- public_domain\n- cc_by\n- cc_by_sa\n\nPrivate or blocked until reviewed:\n\n- unknown\n- needs_permission\n- private_research\n- personal_only\n- all_rights_reserved\n\nUnclear images, plans, sections and plan-derived models stay private or link-only.\n`;
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
