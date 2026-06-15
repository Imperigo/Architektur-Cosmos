#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const venvPython = args.python || '/mnt/data/ArchitekturKosmos/tools/kosmo-python-tools/.venv/bin/python';
const outputRoot = resolve(root, args.outDir || 'examples/kosmo-prepare/phase1-adapter-fixture');

const sourceHtml = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>KosmoPrepare Synthetic Fixture</title></head>
<body>
  <h1>KosmoPrepare Synthetic Fixture</h1>
  <p>Project type: small public pavilion.</p>
  <p>Material system: timber frame with mineral plinth.</p>
  <p>Structure: four primary columns, ring beam, lightweight roof plane.</p>
</body>
</html>
`;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const sourceHtmlPath = join(outputRoot, 'source.synthetic.html');
  const convertedMarkdownPath = join(outputRoot, 'converted.markitdown.md');
  const ifcManifestPath = join(outputRoot, 'ifcopenshell-entity-manifest.json');
  const reportJsonPath = join(outputRoot, 'prepare-phase1-adapter-report.json');
  const reportMdPath = join(outputRoot, 'prepare-phase1-adapter-report.md');

  await writeFile(sourceHtmlPath, sourceHtml);

  const markitdown = runPython(`
from markitdown import MarkItDown
result = MarkItDown().convert(${JSON.stringify(sourceHtmlPath)})
print(result.text_content)
`);
  if (markitdown.status !== 0) throw new Error(`MarkItDown conversion failed: ${markitdown.stderr}`);
  await writeFile(convertedMarkdownPath, markitdown.stdout.trim() + '\n');

  const ifc = runPython(`
import json
import ifcopenshell
f = ifcopenshell.file()
project = f.create_entity('IfcProject', GlobalId=ifcopenshell.guid.new(), Name='KosmoPrepare Synthetic Fixture')
site = f.create_entity('IfcSite', GlobalId=ifcopenshell.guid.new(), Name='Synthetic Site')
building = f.create_entity('IfcBuilding', GlobalId=ifcopenshell.guid.new(), Name='Synthetic Pavilion')
storey = f.create_entity('IfcBuildingStorey', GlobalId=ifcopenshell.guid.new(), Name='Ground Level')
material = f.create_entity('IfcMaterial', Name='Timber')
print(json.dumps({
  'schema': f.schema,
  'entities': [
    {'type': project.is_a(), 'name': project.Name},
    {'type': site.is_a(), 'name': site.Name},
    {'type': building.is_a(), 'name': building.Name},
    {'type': storey.is_a(), 'name': storey.Name},
    {'type': material.is_a(), 'name': material.Name}
  ],
  'entity_count': 5
}, indent=2))
`);
  if (ifc.status !== 0) throw new Error(`IfcOpenShell manifest failed: ${ifc.stderr}`);
  await writeFile(ifcManifestPath, ifc.stdout.trim() + '\n');

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'prepare_phase1_adapter_fixture_ready',
    policy: {
      synthetic_fixture_only: true,
      reads_private_content: false,
      downloads_models_now: false,
      public_ready_after_fixture: 0
    },
    outputs: {
      source_html: relative(root, sourceHtmlPath),
      converted_markdown: relative(root, convertedMarkdownPath),
      ifc_entity_manifest: relative(root, ifcManifestPath),
      report_json: relative(root, reportJsonPath),
      report_markdown: relative(root, reportMdPath)
    },
    adapter_contract: {
      prepare_input_type: 'synthetic_html_plus_synthetic_ifc_entities',
      markitdown_output_slot: 'brief/converted-source.md',
      ifcopenshell_output_slot: 'design/ifc-semantic-proof.generated.json',
      downstream_modules: ['KosmoPrepare', 'KosmoData', 'KosmoDesign', 'KosmoAsset'],
      human_review_required_before_private_use: true
    },
    checks: [
      check('markitdown_contains_heading', markitdown.stdout.includes('# KosmoPrepare Synthetic Fixture')),
      check('markitdown_contains_material', markitdown.stdout.includes('Material system: timber frame')),
      check('ifcopenshell_has_project', ifc.stdout.includes('IfcProject')),
      check('ifcopenshell_has_material', ifc.stdout.includes('IfcMaterial'))
    ]
  };

  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(reportMdPath, renderMarkdown(report));

  const failures = report.checks.filter((item) => item.status !== 'passed');
  console.log('KosmoPrepare phase 1 adapter fixture');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.checks.length - failures.length}/${report.checks.length}`);
  console.log(`Output: ${relative(root, outputRoot)}`);
  if (failures.length > 0) process.exitCode = 1;
}

function runPython(code) {
  return spawnSync(venvPython, ['-c', code], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
    shell: false
  });
}

function check(id, condition) {
  return { id, status: condition ? 'passed' : 'failed' };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoPrepare Phase 1 Adapter Fixture');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Outputs');
  lines.push('');
  Object.entries(report.outputs).forEach(([key, value]) => lines.push(`- ${key}: \`${value}\``));
  lines.push('');
  lines.push('## Adapter Contract');
  lines.push('');
  lines.push(`- Prepare input type: ${report.adapter_contract.prepare_input_type}`);
  lines.push(`- MarkItDown output slot: \`${report.adapter_contract.markitdown_output_slot}\``);
  lines.push(`- IfcOpenShell output slot: \`${report.adapter_contract.ifcopenshell_output_slot}\``);
  lines.push(`- Human review required before private use: ${report.adapter_contract.human_review_required_before_private_use}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((item) => lines.push(`- ${item.status}: \`${item.id}\``));
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
