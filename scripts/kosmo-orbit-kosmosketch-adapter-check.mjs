#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/runtime/kosmosketch-tool-adapter.contract.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitKosmoSketchAdapterContract.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-kosmosketch-adapter.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-kosmosketch-adapter.generated.md');

const requiredKeywords = ['skizze', 'handskizze', 'entwurf aendern', 'raum hinzufuegen', 'wand verschieben', 'tuer setzen', 'sketchintent'];
const requiredBlocked = ['post_jobs_call', 'router_plan_call', 'approval_mutation', 'artifact_upload', 'blender_process_launch', 'kosmosketch_job_execute', 'bim_commit', 'bridge_write', 'ifc_export', 'two_d_regeneration'];
const requiredArtifacts = ['diff', 'blender_export', 'markdown_package'];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`KosmoSketch adapter contract not found: ${contractPath}`);
  if (!existsSync(componentPath)) throw new Error(`KosmoSketch adapter component not found: ${componentPath}`);
  const contract = readJson(contractPath);
  const componentSource = readFileSync(componentPath, 'utf8');
  const routeSource = existsSync(routePath) ? readFileSync(routePath, 'utf8') : '';
  const sectionIndexSource = existsSync(sectionIndexPath) ? readFileSync(sectionIndexPath, 'utf8') : '';
  const report = buildReport({ contract, componentSource, routeSource, sectionIndexSource });
  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');
  console.log('KosmoOrbit KosmoSketch adapter check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (report.status !== 'kosmosketch_adapter_contract_passed') process.exit(1);
}

function buildReport({ contract, componentSource, routeSource, sectionIndexSource }) {
  const artifactTypes = asArray(contract.artifact_contract).map((artifact) => artifact.type);
  const checks = [
    check('contract_file_exists', 'KosmoSketch adapter contract exists.', existsSync(contractPath)),
    check('status_ready', 'KosmoSketch adapter contract status is ready.', contract.status === 'kosmosketch_tool_adapter_contract_ready'),
    check('mode_static_review_only', 'KosmoSketch adapter contract is static review-only.', contract.mode === 'static_review_only'),
    check('target_tool_selected', 'Target tool is selected as kosmo-draw.kosmosketch.', contract.target_tool === 'kosmo-draw.kosmosketch'),
    check('department_entwurf', 'Department is Entwurf.', contract.department?.id === 'entwurf'),
    check('routing_keywords_present', 'Routing keywords cover sketch and core edit intents.', requiredKeywords.every((keyword) => asArray(contract.department?.keywords).includes(keyword))),
    check('aliases_present', 'Aliases cover KosmoSketch and KosmoDraw naming variants.', ['kosmosketch', 'kosmo-sketch', 'kosmodraw-sketch'].every((alias) => asArray(contract.aliases).includes(alias))),
    check('job_contract_present', 'JobCreate, execute_after_approval, router and panic contracts are present.', String(contract.job_contract?.job_create_shape || '').includes('JobCreate') && contract.job_contract?.default_mode === 'execute_after_approval' && String(contract.job_contract?.routing || '').includes('/router/plan') && String(contract.job_contract?.panic_endpoint || '').includes('/panic/stop-all')),
    check('approval_contract_present', 'Approval contract requires review before model writes.', contract.approval_contract?.required_for_model_changes === true && contract.approval_contract?.job_status_before_commit === 'waiting_for_approval' && String(contract.approval_contract?.approval_endpoint || '').includes('/approvals') && String(contract.approval_contract?.commit_rule || '').includes('No BIM')),
    check('artifact_contract_present', 'Artifact contract includes diff, blender_export and markdown_package.', requiredArtifacts.every((type) => artifactTypes.includes(type))),
    check('blocked_actions_present', 'Executable backend, Blender, BIM, Bridge, IFC and 2D actions are blocked today.', requiredBlocked.every((item) => asArray(contract.blocked_today).includes(item))),
    check('allowed_today_review_only', 'Allowed today items are static review and readiness only.', asArray(contract.allowed_today).every((item) => ['static_adapter_contract_render', 'human_review_prompt', 'route_keyword_mapping', 'artifact_name_review', 'readiness_report_generation'].includes(item))),
    check('review_roles_present', 'Review roles include owner, IT/KI, project lead, design architect and privacy review.', ['Chef / Admin', 'IT/KI Spezialist', 'Projektleitung', 'Entwurfsarchitekt', 'Datenschutz Review'].every((role) => asArray(contract.review_roles).includes(role))),
    check('promotion_requirements_present', 'Promotion requirements include owner, Zentrale, KosmoDraw, review gate, panic and no customer data.', asArray(contract.promotion_requirements).length >= 6 && contract.promotion_requirements.join(' ').includes('Owner') && contract.promotion_requirements.join(' ').includes('KosmoZentrale') && contract.promotion_requirements.join(' ').includes('Panic')),
    check('component_imports_contract', 'Component imports the KosmoSketch adapter contract.', componentSource.includes('kosmosketch-tool-adapter.contract.json')),
    check('component_renders_adapter_copy', 'Component renders KosmoSketch target-tool copy.', componentSource.includes('KosmoSketch ToolAdapter') && componentSource.includes('Target-Tool Vertrag fuer Skizze zu BIM')),
    check('component_renders_safety_boundary', 'Component keeps jobs, router, approvals, artifacts, Blender, BIM, IFC and 2D regeneration blocked.', componentSource.includes('kein POST /jobs') && componentSource.includes('kein /router/plan') && componentSource.includes('keine Approval-Mutation') && componentSource.includes('kein Artifact-Upload') && componentSource.includes('kein Blender-Start') && componentSource.includes('kein BIM-Commit') && componentSource.includes('kein IFC-Export') && componentSource.includes('keine 2D-Regeneration')),
    check('route_imports_adapter', 'Orbit route imports the KosmoSketch adapter component.', routeSource.includes('OrbitKosmoSketchAdapterContract')),
    check('route_anchors_adapter', 'Orbit route renders a kosmosketch-adapter anchor.', routeSource.includes('id="kosmosketch-adapter"')),
    check('section_index_links_adapter', 'Section index links to KosmoSketch adapter.', sectionIndexSource.includes('#kosmosketch-adapter'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-kosmosketch-adapter-check',
    status: failed.length ? 'kosmosketch_adapter_contract_blocked' : 'kosmosketch_adapter_contract_passed',
    contract_file: relative(root, contractPath),
    component_file: relative(root, componentPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      keyword_count: asArray(contract.department?.keywords).length,
      alias_count: asArray(contract.aliases).length,
      artifact_contract_count: asArray(contract.artifact_contract).length,
      blocked_today_count: asArray(contract.blocked_today).length,
      promotion_requirement_count: asArray(contract.promotion_requirements).length
    },
    target_tool: contract.target_tool,
    department: contract.department,
    artifact_contract: contract.artifact_contract,
    checks,
    next_actions: failed.length ? failed.map((item) => `Fix failed KosmoSketch adapter check: ${item.id}`) : contract.next_actions
  };
}

function check(id, label, passed) {
  return { id, label, status: passed ? 'passed' : 'failed' };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit KosmoSketch Adapter Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    `Target Tool: \`${report.target_tool}\``,
    '',
    'Static review-only check for the KosmoSketch target_tool contract. It does not call /jobs, /router/plan, approvals, artifact upload, Blender, KosmoSketch jobs, BIM writes, Bridge writes, IFC export, 2D regeneration, iPad upload, external accounts or cost jobs.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- keywords: ${report.summary.keyword_count}`,
    `- aliases: ${report.summary.alias_count}`,
    `- artifact contracts: ${report.summary.artifact_contract_count}`,
    `- blocked today: ${report.summary.blocked_today_count}`,
    `- promotion requirements: ${report.summary.promotion_requirement_count}`,
    '',
    '## Artifact Contract',
    '',
    '| Type | Name | Purpose |',
    '| --- | --- | --- |'
  ];
  report.artifact_contract.forEach((artifact) => lines.push(`| \`${artifact.type}\` | \`${artifact.name}\` | ${escapePipe(artifact.purpose)} |`));
  lines.push('', '## Checks', '', '| Check | Status | Meaning |', '| --- | --- | --- |');
  report.checks.forEach((item) => lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`));
  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
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
