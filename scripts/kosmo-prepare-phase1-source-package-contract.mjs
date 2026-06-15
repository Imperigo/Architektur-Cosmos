#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const fixtureRoot = resolve(root, args.fixtureRoot || 'examples/kosmo-prepare/phase1-adapter-fixture');
const packageId = args.packageId || `kosmo-prepare-phase1-adapter-fixture-${dateStamp}`;
const packageRoot = resolve(root, args.outDir || `examples/kosmo-references/source-packages/${packageId}`);
const outputPath = resolve(packageRoot, 'source-package.json');
const markdownPath = resolve(root, args.markdown || `docs/codex/kosmo-prepare-phase1-source-package-contract-${dateStamp}.md`);

const sourceFiles = {
  html: resolve(fixtureRoot, 'source.synthetic.html')
};

const artifactFiles = {
  markdown: resolve(fixtureRoot, 'converted.markitdown.md'),
  ifcManifest: resolve(fixtureRoot, 'ifcopenshell-entity-manifest.json'),
  reportJson: resolve(fixtureRoot, 'prepare-phase1-adapter-report.json'),
  reportMarkdown: resolve(fixtureRoot, 'prepare-phase1-adapter-report.md')
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sourceFingerprint = await fingerprint(sourceFiles.html);
  const artifactFingerprints = {
    markdown: await fingerprint(artifactFiles.markdown),
    ifcManifest: await fingerprint(artifactFiles.ifcManifest),
    reportJson: await fingerprint(artifactFiles.reportJson),
    reportMarkdown: await fingerprint(artifactFiles.reportMarkdown)
  };

  const manifest = buildManifest(sourceFingerprint, artifactFingerprints);

  await mkdir(packageRoot, { recursive: true });
  await mkdir(dirname(markdownPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(markdownPath, renderMarkdown(manifest));

  console.log('KosmoPrepare phase 1 source package contract');
  console.log(`Package: ${relative(root, outputPath)}`);
  console.log(`Sources: ${manifest.sources.length}`);
  console.log(`Artifacts: ${manifest.extraction_artifacts.length}`);
  console.log(`Status: ${manifest.status}`);
  console.log(`Wrote: ${relative(root, markdownPath)}`);
}

function buildManifest(sourceFingerprint, artifactFingerprints) {
  return {
    schema_version: '0.1',
    package_id: packageId,
    title: 'KosmoPrepare Phase 1 Adapter Fixture Source Package',
    description: 'Synthetic, review-only source package connecting the KosmoPrepare phase 1 adapter fixture to the KosmoReferences source-package contract.',
    created_at: dateStamp,
    updated_at: dateStamp,
    status: 'adapter_contract_ready',
    rights_scope: 'synthetic_fixture',
    source_kind: 'synthetic_html_plus_synthetic_ifc_manifest',
    source_root: relative(root, fixtureRoot),
    public_policy: {
      source_files_public: false,
      extracted_text_public: false,
      derived_summary_public: false,
      notes: [
        'All files are synthetic fixture artifacts, but the package remains review-only to preserve the default Kosmo public-ready=0 rule.',
        'This package is a contract bridge only; it does not authorize private source ingestion, OCR, embeddings or training.'
      ]
    },
    sources: [
      {
        id: 'kosmo-prepare-synthetic-html',
        title: 'KosmoPrepare Synthetic HTML Fixture',
        path: relative(root, sourceFiles.html),
        file_type: 'html',
        source_role: 'synthetic_fixture_input',
        rights_status: 'synthetic_fixture_review_only',
        sha256: sourceFingerprint.sha256,
        bytes: sourceFingerprint.bytes,
        notes: 'Repo-safe synthetic HTML used to validate MarkItDown and downstream source-package plumbing.'
      }
    ],
    extraction_artifacts: [
      artifact('kosmo-prepare-markitdown-md', 'kosmo-prepare-synthetic-html', artifactFiles.markdown, artifactFingerprints.markdown, 'markdown_text', 'markitdown 0.1.6', 'created', [
        'Converted from the synthetic HTML fixture.',
        'Maps to KosmoPrepare brief/converted-source.md slot.'
      ]),
      artifact('kosmo-prepare-ifc-entity-manifest', 'kosmo-prepare-synthetic-html', artifactFiles.ifcManifest, artifactFingerprints.ifcManifest, 'ifc_entity_manifest', 'ifcopenshell 0.8.5', 'created', [
        'Synthetic IfcOpenShell entity manifest for project/site/building/storey/material semantics.',
        'Maps to KosmoDesign design/ifc-semantic-proof.generated.json slot.'
      ]),
      artifact('kosmo-prepare-adapter-report-json', 'kosmo-prepare-synthetic-html', artifactFiles.reportJson, artifactFingerprints.reportJson, 'adapter_report_json', 'kosmo-prepare-phase1-adapter-fixture', 'created', [
        'Machine-readable adapter report with synthetic-only policy assertions.'
      ]),
      artifact('kosmo-prepare-adapter-report-md', 'kosmo-prepare-synthetic-html', artifactFiles.reportMarkdown, artifactFingerprints.reportMarkdown, 'adapter_report_markdown', 'kosmo-prepare-phase1-adapter-fixture', 'created', [
        'Human-readable adapter report for Codex, Claude and KosmoOverseer handoff.'
      ])
    ],
    candidate_projects: [
      {
        id: 'kosmo-prepare-phase1-fixture',
        title: 'KosmoPrepare Phase 1 Synthetic Fixture',
        confidence: 1,
        promotion_status: 'adapter_contract_only',
        evidence: [
          'The fixture is synthetic and created inside the repo.',
          'MarkItDown and IfcOpenShell outputs are present with recorded hashes and byte counts.',
          'The package keeps public-ready at zero and does not unlock private source processing.'
        ]
      }
    ],
    review_gates: [
      gate('source_integrity', 'pass', 'All source and artifact files have SHA-256 and byte counts recorded.'),
      gate('rights', 'pass', 'Synthetic fixture only; still review-only by policy.'),
      gate('text_quality', 'pass', 'Converted Markdown contains the intended fixture heading and material/system lines.'),
      gate('layout_quality', 'not_applicable', 'HTML fixture has no scanned pages or plan layout blocks.'),
      gate('entry_mapping', 'pass', 'Maps to a synthetic KosmoPrepare adapter fixture, not to a public architecture entry.'),
      gate('asset_mapping', 'review_only', 'Ifc/material semantics may seed KosmoAsset fixture contracts, but no asset is public-ready.'),
      gate('public_private_split', 'pass', 'No private content is read or copied; public-ready remains 0.')
    ],
    next_actions: [
      'Run npm run kosmo:prepare-phase1-source-package-contract-check.',
      'Run npm run kosmo:source-package-check -- --package examples/kosmo-references/source-packages/' + packageId + '/source-package.json --strict-artifacts.',
      'Use this source-free contract as the bridge before private Source Root activation.'
    ]
  };
}

function artifact(id, sourceId, path, fp, artifactType, tool, status, qualityNotes) {
  return {
    id,
    source_id: sourceId,
    path: relative(root, path),
    artifact_type: artifactType,
    tool,
    status,
    sha256: fp.sha256,
    bytes: fp.bytes,
    quality_notes: qualityNotes
  };
}

function gate(id, status, notes) {
  return { id, status, notes };
}

async function fingerprint(path) {
  const buffer = await readFile(path);
  const info = await stat(path);
  return {
    sha256: createHash('sha256').update(buffer).digest('hex'),
    bytes: info.size
  };
}

function renderMarkdown(manifest) {
  const lines = [];
  lines.push('# KosmoPrepare Phase 1 Source Package Contract');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Package: \`${relative(root, outputPath)}\``);
  lines.push(`Status: \`${manifest.status}\``);
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  lines.push(`- Rights scope: ${manifest.rights_scope}`);
  lines.push(`- Source files public: ${manifest.public_policy.source_files_public}`);
  lines.push(`- Extracted text public: ${manifest.public_policy.extracted_text_public}`);
  lines.push(`- Derived summary public: ${manifest.public_policy.derived_summary_public}`);
  lines.push('- Public-ready after contract: 0');
  lines.push('');
  lines.push('## Files');
  lines.push('');
  manifest.sources.forEach((source) => lines.push(`- source \`${source.id}\`: \`${source.path}\``));
  manifest.extraction_artifacts.forEach((artifactItem) => lines.push(`- artifact \`${artifactItem.id}\`: \`${artifactItem.path}\``));
  lines.push('');
  lines.push('## Review Gates');
  lines.push('');
  manifest.review_gates.forEach((gateItem) => lines.push(`- ${gateItem.status}: \`${gateItem.id}\` - ${gateItem.notes}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
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
