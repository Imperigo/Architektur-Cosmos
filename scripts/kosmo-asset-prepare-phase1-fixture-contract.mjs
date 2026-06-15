#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const fixtureRoot = resolve(root, args.fixtureRoot || 'examples/kosmo-prepare/phase1-adapter-fixture');
const sourcePackagePath = resolve(root, args.sourcePackage || `examples/kosmo-references/source-packages/kosmo-prepare-phase1-adapter-fixture-${dateStamp}/source-package.json`);
const libraryRoot = resolve(root, args.outDir || 'examples/kosmo-assets/kosmo-prepare-phase1-fixture');
const libraryPath = join(libraryRoot, 'library.json');
const reportJson = resolve(root, args.report || `data/kosmo-asset-prepare-phase1-fixture-contract-${dateStamp}.json`);
const reportMd = resolve(root, args.markdown || `docs/codex/kosmo-asset-prepare-phase1-fixture-contract-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sourcePackage = JSON.parse(await readFile(sourcePackagePath, 'utf8'));
  const markdown = await readFile(join(fixtureRoot, 'converted.markitdown.md'), 'utf8');
  const ifcManifest = JSON.parse(await readFile(join(fixtureRoot, 'ifcopenshell-entity-manifest.json'), 'utf8'));

  const materialProfilePath = join(libraryRoot, 'assets/materials/timber-frame.material.json');
  const componentProfilePath = join(libraryRoot, 'assets/components/synthetic-primary-column.component.json');
  const materialProfile = buildMaterialProfile(markdown, sourcePackage);
  const componentProfile = buildComponentProfile(ifcManifest, sourcePackage);
  const library = buildLibrary({ sourcePackage, materialProfilePath, componentProfilePath });
  const report = buildReport({ sourcePackage, library });

  await Promise.all([
    mkdir(dirname(materialProfilePath), { recursive: true }),
    mkdir(dirname(componentProfilePath), { recursive: true }),
    mkdir(dirname(reportJson), { recursive: true }),
    mkdir(dirname(reportMd), { recursive: true })
  ]);

  await writeFile(materialProfilePath, `${JSON.stringify(materialProfile, null, 2)}\n`);
  await writeFile(componentProfilePath, `${JSON.stringify(componentProfile, null, 2)}\n`);
  await writeFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`);
  await writeFile(reportJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(reportMd, renderMarkdown(report));

  console.log('KosmoAsset Prepare phase 1 fixture contract');
  console.log(`Status: ${report.status}`);
  console.log(`Assets: ${library.assets.length}`);
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Public-ready after contract: ${report.summary.public_ready_after_contract}`);
  console.log(`Wrote: ${relative(root, reportMd)}`);
}

function buildMaterialProfile(markdown, sourcePackage) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-prepare-phase1-fixture-contract',
    status: 'local_review_material_profile_generated',
    source_package_ref: relative(root, sourcePackagePath),
    source_package_id: sourcePackage.package_id,
    synthetic_fixture_only: true,
    material_system: extractLine(markdown, 'Material system:') || 'timber frame with mineral plinth',
    layers: [
      {
        id: 'timber-frame',
        role: 'primary_structure',
        material_family: 'timber',
        review_status: 'synthetic_fixture'
      },
      {
        id: 'mineral-plinth',
        role: 'base_contact',
        material_family: 'mineral',
        review_status: 'synthetic_fixture'
      }
    ],
    export_slots: ['blender', 'archicad', 'kosmoasset'],
    public_use_allowed: false
  };
}

function buildComponentProfile(ifcManifest, sourcePackage) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-prepare-phase1-fixture-contract',
    status: 'local_review_component_profile_generated',
    source_package_ref: relative(root, sourcePackagePath),
    source_package_id: sourcePackage.package_id,
    synthetic_fixture_only: true,
    ifc_schema: ifcManifest.schema,
    semantic_entities: ifcManifest.entities,
    component_logic: [
      {
        id: 'primary-column-set',
        role: 'load_path',
        derived_from_entity_type: 'IfcBuildingStorey',
        review_status: 'synthetic_fixture'
      },
      {
        id: 'timber-material-assignment',
        role: 'material_context',
        derived_from_entity_type: 'IfcMaterial',
        review_status: 'synthetic_fixture'
      }
    ],
    export_slots: ['json', 'ifc_semantic_review', 'kosmoasset'],
    public_use_allowed: false
  };
}

function buildLibrary({ sourcePackage, materialProfilePath, componentProfilePath }) {
  return {
    schema_version: '0.1',
    library_id: 'kosmo-prepare-phase1-fixture',
    name: 'KosmoPrepare Phase 1 Fixture Asset Library',
    description: 'Synthetic local review-only KosmoAsset bridge derived from the KosmoPrepare phase 1 adapter fixture.',
    status: 'draft',
    rights_scope: 'local_review_only',
    created_at: dateStamp,
    updated_at: dateStamp,
    storage_policy: {
      uploads_allowed: false,
      public_assets_allowed: false,
      local_assets_allowed: true,
      max_local_size_mb: 10,
      notes: [
        'Synthetic fixture only.',
        'No private source files, scans, textures, model downloads or public releases.',
        'This library tests KosmoPrepare to KosmoAsset metadata flow only.'
      ]
    },
    assets: [
      {
        id: 'synthetic-timber-frame-material-001',
        title: 'Synthetic Timber Frame Material Profile',
        description: 'Review-only material profile produced from the synthetic KosmoPrepare fixture.',
        asset_type: 'material',
        category: 'material',
        source_kind: 'generated',
        source_basis: [
          `Derived from synthetic source package ${sourcePackage.package_id}.`,
          'No sampled texture, protected image or product data was used.'
        ],
        rights_status: 'generated_needs_review',
        license: 'review_only',
        credit: 'Architecture Cosmos synthetic fixture',
        public_use_allowed: false,
        local_only: true,
        review_status: 'draft',
        confidence: 0.74,
        formats: [
          {
            format: 'material_json',
            path: relative(libraryRoot, materialProfilePath),
            software: ['blender', 'archicad', 'kosmo'],
            status: 'exists'
          }
        ],
        preview: {
          kind: 'material_swatch',
          label: 'Timber',
          primary: '#b98b5d',
          secondary: '#6f7f68',
          swatches: ['#d7b98e', '#b98b5d', '#6f4f33']
        },
        export_targets: ['blender', 'archicad', 'web'],
        tags: ['synthetic-fixture', 'timber', 'material-profile', 'kosmoprepare', 'kosmoasset'],
        material_tags: ['timber', 'mineral-plinth'],
        kosmodata_refs: [
          {
            kind: 'material_context',
            entry_id: 'kosmo-prepare-phase1-fixture',
            relation: 'material_context',
            usage_policy: 'derived_asset_review_required',
            review_status: 'needs_human_review',
            notes: 'Synthetic fixture context only; not a public architecture reference entry.'
          }
        ]
      },
      {
        id: 'synthetic-primary-column-component-001',
        title: 'Synthetic Primary Column Component Logic',
        description: 'Review-only structural component metadata from the synthetic IfcOpenShell entity manifest.',
        asset_type: 'component',
        category: 'structure',
        source_kind: 'generated',
        source_basis: [
          `Derived from synthetic source package ${sourcePackage.package_id}.`,
          'Uses synthetic IFC entity names only; no measured geometry or private project model.'
        ],
        rights_status: 'generated_needs_review',
        license: 'review_only',
        credit: 'Architecture Cosmos synthetic fixture',
        public_use_allowed: false,
        local_only: true,
        review_status: 'draft',
        confidence: 0.7,
        formats: [
          {
            format: 'json',
            path: relative(libraryRoot, componentProfilePath),
            software: ['kosmo', 'ifcopenshell'],
            status: 'exists'
          }
        ],
        preview: {
          kind: 'wireframe_component',
          label: 'Column logic',
          primary: '#00e7ff',
          secondary: '#f5b342'
        },
        export_targets: ['blender', 'archicad', 'web', 'ifc'],
        tags: ['synthetic-fixture', 'structure', 'column', 'ifcopenshell', 'kosmoasset'],
        material_tags: ['timber'],
        kosmodata_refs: [
          {
            kind: 'typology_context',
            entry_id: 'kosmo-prepare-phase1-fixture',
            relation: 'typology_context',
            usage_policy: 'derived_asset_review_required',
            review_status: 'needs_human_review',
            notes: 'Synthetic fixture context only; used to test structure-to-asset mapping.'
          }
        ]
      }
    ]
  };
}

function buildReport({ sourcePackage, library }) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'kosmoasset_prepare_phase1_fixture_contract_ready',
    policy: {
      synthetic_fixture_only: true,
      reads_private_content: false,
      copies_private_content: false,
      ingests_assets: false,
      uploads_allowed: false,
      public_assets_allowed: false,
      public_ready_after_contract: 0
    },
    source_refs: [
      relative(root, sourcePackagePath),
      relative(root, join(fixtureRoot, 'converted.markitdown.md')),
      relative(root, join(fixtureRoot, 'ifcopenshell-entity-manifest.json'))
    ],
    outputs: {
      library: relative(root, libraryPath),
      material_profile: relative(root, join(libraryRoot, 'assets/materials/timber-frame.material.json')),
      component_profile: relative(root, join(libraryRoot, 'assets/components/synthetic-primary-column.component.json'))
    },
    summary: {
      source_package_id: sourcePackage.package_id,
      assets: library.assets.length,
      public_use_allowed_assets: library.assets.filter((asset) => asset.public_use_allowed === true).length,
      uploads_allowed: library.storage_policy.uploads_allowed,
      public_ready_after_contract: 0
    },
    next_actions: [
      'Run npm run kosmo:asset-prepare-phase1-fixture-contract-check.',
      'Use this only as a source-free KosmoAsset bridge fixture.',
      'Do not promote synthetic fixture assets to public catalog entries.'
    ]
  };
}

function extractLine(markdown, prefix) {
  const line = markdown.split('\n').find((item) => item.trim().startsWith(prefix));
  return line ? line.replace(prefix, '').trim().replace(/\.$/, '') : null;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoAsset Prepare Phase 1 Fixture Contract');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Source package: ${report.summary.source_package_id}`);
  lines.push(`- Assets: ${report.summary.assets}`);
  lines.push(`- Public-use assets: ${report.summary.public_use_allowed_assets}`);
  lines.push(`- Uploads allowed: ${report.summary.uploads_allowed}`);
  lines.push(`- Public-ready after contract: ${report.summary.public_ready_after_contract}`);
  lines.push('');
  lines.push('## Outputs');
  lines.push('');
  Object.entries(report.outputs).forEach(([key, value]) => lines.push(`- ${key}: \`${value}\``));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- Synthetic fixture only.');
  lines.push('- No private content read or copied.');
  lines.push('- No asset ingestion, upload or public publication.');
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
