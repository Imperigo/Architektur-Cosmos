#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const outputJsonPath = join(projectRoot, args.output || 'design/ifcopenshell-semantic-review.generated.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/ifcopenshell-semantic-review.generated.md');
const pythonScript = resolve(root, 'scripts/kosmo_ifcopenshell_semantic_review.py');
const pythonBin = resolvePythonBin();

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const ifcPath = resolveIfcPath();
  const projectId = readProjectId();

  if (!existsSync(pythonBin)) throw new Error(`IfcOpenShell Python not found: ${pythonBin}`);
  if (!existsSync(pythonScript)) throw new Error(`IfcOpenShell review script not found: ${pythonScript}`);
  if (!existsSync(ifcPath)) throw new Error(`IFC source not found: ${ifcPath}`);

  await mkdir(dirname(outputJsonPath), { recursive: true });
  const result = spawnSync(pythonBin, [
    pythonScript,
    '--ifc',
    ifcPath,
    '--project-id',
    projectId,
    '--output-json',
    outputJsonPath,
    '--display-ifc-path',
    relative(projectRoot, ifcPath)
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);

  const review = readJson(outputJsonPath);
  await writeFile(outputMdPath, renderMarkdown(review), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo IfcOpenShell semantic review generated');
  console.log(`Project: ${review.project_id}`);
  console.log(`Status: ${review.status}`);
  console.log(`IfcOpenShell: ${review.summary.ifcopenshell_version}`);
  console.log(`Machine checks: ${review.summary.machine_checks_passed}/${review.summary.machine_check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function resolvePythonBin() {
  const candidates = [
    args.python,
    process.env.KOSMO_IFC_PYTHON,
    resolve(root, '.venv-kosmo-ifc/bin/python'),
    'python3'
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate === 'python3') {
      const found = spawnSync('zsh', ['-lc', 'command -v python3'], { encoding: 'utf8' });
      if (found.stdout.trim()) return found.stdout.trim();
      continue;
    }
    const pathname = resolve(candidate);
    if (existsSync(pathname)) return pathname;
  }
  return candidates[0];
}

function resolveIfcPath() {
  if (args.ifc) return resolve(args.ifc);
  const sourcesPath = join(projectRoot, 'data/sources.json');
  if (existsSync(sourcesPath)) {
    const registry = readJson(sourcesPath);
    const source = (registry.sources || []).find((item) => item.type === 'ifc' && item.path);
    if (source) return join(projectRoot, source.path);
  }
  return join(projectRoot, 'data/source-files/Bestand_Kontext.ifc');
}

function readProjectId() {
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (!existsSync(manifestPath)) return basename(projectRoot);
  return readJson(manifestPath).project_id || basename(projectRoot);
}

function renderMarkdown(review) {
  const lines = [
    '# IfcOpenShell Semantic Review',
    '',
    `Project ID: \`${review.project_id}\``,
    `Status: \`${review.status}\``,
    `IFC schema: \`${review.ifc_schema}\``,
    '',
    'Semantic IFC review via IfcOpenShell. This does not approve design generation.',
    '',
    '## Summary',
    '',
    `- IfcOpenShell available: ${review.summary.ifcopenshell_available ? 'yes' : 'no'}`,
    `- IfcOpenShell version: ${review.summary.ifcopenshell_version}`,
    `- unit scale: ${review.summary.unit_scale}`,
    `- projects/sites/buildings/storeys: ${review.summary.project_count}/${review.summary.site_count}/${review.summary.building_count}/${review.summary.storey_count}`,
    `- IfcElement: ${review.summary.ifcelement_count}`,
    `- IfcBuildingElementProxy: ${review.summary.ifcbuildingelementproxy_count}`,
    `- proxies with placement: ${review.summary.proxies_with_object_placement}`,
    `- proxies with Body/Brep: ${review.summary.proxies_with_body_brep}`,
    `- proxies contained: ${review.summary.proxies_contained_in_spatial_structure}`,
    `- proxies with property sets: ${review.summary.proxies_with_property_sets}`,
    `- MapConversion / ProjectedCRS: ${review.summary.map_conversion_count}/${review.summary.projected_crs_count}`,
    `- machine checks: ${review.summary.machine_checks_passed}/${review.summary.machine_check_count}`,
    `- recommended decision: \`${review.summary.recommended_decision}\``,
    '',
    '## Machine Checks',
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |'
  ];
  for (const check of review.machine_checks) {
    lines.push(`| ${escapePipe(check.id)} | ${escapePipe(check.status)} | ${escapePipe(check.detail)} |`);
  }
  lines.push('', '## Distributions', '');
  lines.push(`- object types: ${formatTop(review.distributions.kosmo_object_type)}`);
  lines.push(`- storeys: ${formatTop(review.distributions.storey_container)}`);
  lines.push(`- representations: ${formatTop(review.distributions.representation)}`);
  lines.push(`- property sets: ${formatTop(review.distributions.property_sets)}`);
  lines.push('', '## Element Sample', '', '| STEP | Name | Class | OBJEKTART | Container | Representation |', '| ---: | --- | --- | --- | --- | --- |');
  for (const row of review.element_sample.slice(0, 16)) {
    lines.push(`| #${row.step_id} | ${escapePipe(row.name)} | ${escapePipe(row.class)} | ${escapePipe(row.kosmo_object_type || '-')} | ${escapePipe(row.container_label || '-')} | ${escapePipe(row.representation_signature || '-')} |`);
  }
  lines.push('', '## Next Actions', '');
  for (const action of review.next_actions) lines.push(`- ${action}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = false;
    for (const item of packageOutputItems()) {
      didChange = ensureItem(manifest.outputs, item.path, item.manifest) || didChange;
    }
    if (didChange) {
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      changed.push(manifestPath);
    }
  }
  const exportManifestPath = join(projectRoot, 'publish/export-manifest.json');
  if (existsSync(exportManifestPath)) {
    const exportManifest = readJson(exportManifestPath);
    if (!Array.isArray(exportManifest.exports)) exportManifest.exports = [];
    let didChange = false;
    for (const item of packageOutputItems()) {
      didChange = ensureItem(exportManifest.exports, item.path, item.exportManifest) || didChange;
    }
    if (didChange) {
      await writeFile(exportManifestPath, `${JSON.stringify(exportManifest, null, 2)}\n`, 'utf8');
      changed.push(exportManifestPath);
    }
  }
  return changed;
}

function packageOutputItems() {
  return [
    outputItem('design/ifcopenshell-semantic-review.generated.json', 'other', 'design', 'Kosmo Design', 'json', 'IfcOpenShell semantic IFC review report.'),
    outputItem('design/ifcopenshell-semantic-review.generated.md', 'other', 'design', 'Kosmo Design', 'markdown', 'Human-readable IfcOpenShell semantic IFC review report.')
  ];
}

function outputItem(path, type, module, exportModule, format, description) {
  return {
    path,
    manifest: { path, type, module, rights_status: 'generated_needs_review', description },
    exportManifest: { path, module: exportModule, format, status: 'generated_needs_review', rights_status: 'generated_needs_review' }
  };
}

function formatTop(items) {
  if (!Array.isArray(items) || !items.length) return 'none';
  return items.slice(0, 5).map((item) => `${item.value}: ${item.count}`).join(', ');
}

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
