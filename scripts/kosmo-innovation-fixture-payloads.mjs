#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const skeletonsPath = resolve(root, args.skeletons || `data/kosmo-innovation-fixture-skeletons-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-fixture-payloads-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-fixture-payloads-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const skeletons = JSON.parse(await readFile(skeletonsPath, 'utf8'));
  const writtenPayloads = [];
  const failures = [];
  if (skeletons.status !== 'innovation_fixture_skeletons_ready') {
    failures.push(`Skeletons not ready: ${skeletons.status}`);
  }

  const manifestPaths = (skeletons.written_files || []).filter((file) => file.endsWith('/fixture-manifest.json'));
  for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(await readFile(resolve(root, manifestPath), 'utf8'));
    const contractRoot = dirname(resolve(root, manifestPath));
    for (const fixture of manifest.fixtures || []) {
      const payloadPath = resolve(contractRoot, fixture.expected_payload_path);
      const payload = buildPayload({ manifest, fixture });
      await mkdir(dirname(payloadPath), { recursive: true });
      await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`);
      writtenPayloads.push(relative(root, payloadPath));
    }
  }

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_fixture_payloads_ready' : 'innovation_fixture_payloads_needs_review',
    policy: {
      generated_payloads_only: true,
      installs_tools_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      runs_private_ocr: false,
      runs_embeddings_on_private_content: false,
      runs_training: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_payloads: 0,
      note: 'Payloads are synthetic JSON fixtures only. They are not converted tool outputs and contain no private content.'
    },
    source_refs: [relative(root, skeletonsPath)],
    summary: {
      manifests: manifestPaths.length,
      payloads_written: writtenPayloads.length,
      executable_now: 0,
      failures: failures.length,
      public_ready_after_payloads: 0
    },
    written_payloads: writtenPayloads,
    next_actions: [
      'Add tool-specific smoke readers for the generated payload JSON files.',
      'Start with Docling/MarkItDown conversion shape checks and IfcOpenShell entity-shape checks.',
      'Keep dependency installation separate from fixture generation.'
    ],
    failures
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation fixture payloads');
  console.log(`Status: ${report.status}`);
  console.log(`Manifests: ${report.summary.manifests}`);
  console.log(`Payloads written: ${report.summary.payloads_written}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildPayload({ manifest, fixture }) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'generated_public_safe_fixture_payload',
    contract_id: manifest.contract_id,
    candidate_id: manifest.candidate_id,
    fixture_id: fixture.id,
    policy: {
      private_content: false,
      generated_or_public_safe: true,
      tool_output: false,
      public_ready: false,
      public_ready_after_payload: 0
    },
    description: fixture.description,
    content: contentFor(manifest.contract_id, fixture.id),
    expected_review: {
      provenance_state: 'generated_fixture',
      rights_state: 'public_safe_synthetic',
      human_review_required_before_training: true,
      allowed_for_private_gate_testing: false
    }
  };
}

function contentFor(contractId, _fixtureId) {
  if (contractId.includes('ifcopenshell')) {
    return {
      type: 'ifc_shape_manifest',
      entities: ['IfcProject', 'IfcSite', 'IfcBuildingStorey', 'IfcWall', 'IfcSlab', 'IfcOpeningElement', 'IfcMaterial'],
      expected_counts: { IfcProject: 1, IfcWall: 2, IfcSlab: 1, IfcOpeningElement: 1 },
      units: 'metre'
    };
  }
  if (contractId.includes('qwen3_retrieval')) {
    return {
      type: 'retrieval_fixture',
      chunks: [
        { id: 'villa-savoye-generated', topic: 'typology', text: 'Generated fixture: a pilotis-supported house reference with roof garden and promenade fields.' },
        { id: 'sogn-benedetg-generated', topic: 'material_structure', text: 'Generated fixture: timber chapel reference with structural rhythm and light analysis fields.' }
      ],
      queries: [
        { id: 'q-material-structure', text: 'Which fixture discusses timber structure and light?' }
      ]
    };
  }
  if (contractId.includes('docling') || contractId.includes('markitdown')) {
    return {
      type: 'document_conversion_fixture',
      title: 'Generated Architecture Reference Fixture',
      sections: [
        { heading: 'Project Metadata', rows: [['project', 'generated-pilot'], ['rights_state', 'synthetic']] },
        { heading: 'Material Notes', paragraphs: ['Generated fixture paragraph for conversion shape checks.'] }
      ]
    };
  }
  if (contractId.includes('ocr')) {
    return {
      type: 'ocr_fixture',
      expected_words: ['ROOM', 'SECTION', 'SCALE', 'NORTH'],
      uncertainty_required: true
    };
  }
  if (contractId.includes('vl_visual')) {
    return {
      type: 'visual_retrieval_fixture',
      image_manifest: [
        { id: 'facade-generated-01', tags: ['facade', 'rhythm', 'synthetic'] },
        { id: 'material-generated-01', tags: ['material', 'texture', 'synthetic'] }
      ]
    };
  }
  if (contractId.includes('topologicpy')) {
    return {
      type: 'spatial_graph_fixture',
      nodes: ['entry', 'hall', 'room', 'terrace'],
      edges: [['entry', 'hall'], ['hall', 'room'], ['room', 'terrace']],
      expected_metrics: ['degree', 'adjacency', 'circulation_depth']
    };
  }
  if (contractId.includes('paper2poster')) {
    return {
      type: 'publish_layout_fixture',
      zones: ['title', 'context', 'analysis', 'image_placeholder', 'rights_note'],
      scoring: ['hierarchy', 'source_visibility', 'review_only_status']
    };
  }
  return {
    type: 'connector_boundary_fixture',
    objects: [{ id: 'synthetic-aec-object', kind: 'asset_metadata', cloud_write_allowed: false }]
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Fixture Payloads');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Manifests: ${report.summary.manifests}`);
  lines.push(`- Payloads written: ${report.summary.payloads_written}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Public-ready after payloads: ${report.summary.public_ready_after_payloads}`);
  lines.push('');
  lines.push('## Written Payloads');
  lines.push('');
  report.written_payloads.forEach((file) => lines.push(`- \`${file}\``));
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
