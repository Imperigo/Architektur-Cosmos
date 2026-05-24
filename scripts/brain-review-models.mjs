#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const outputRoot = resolve(rootDir, 'out/brain-model-review', today);
const args = parseArgs(process.argv.slice(2));

const defaultPilotSlugs = [
  'villa-savoye',
  'alterszentrum-kloster-ingenbohl',
  'habitat-67',
  'narkomfin-housing',
  'euralille-metropole'
];

const layerKeywords = {
  site: ['site', 'context', 'ground', 'landscape', 'park', 'river', 'monastery hill', 'urban field'],
  infrastructure: ['infrastructure', 'rail', 'station', 'tgv', 'deck', 'platform'],
  mass: ['mass', 'volume', 'slab', 'block', 'module', 'housing module', 'care volume'],
  structure: ['structure', 'frame', 'column', 'pilotis', 'core', 'slab', 'pier', 'load transfer'],
  facade: ['facade', 'envelope', 'window', 'screen', 'rhythm'],
  interior: ['interior', 'chapel', 'void', 'cell', 'maisonette', 'duplex', 'dining'],
  circulation: ['circulation', 'ramp', 'gallery', 'bridge', 'deck', 'connector', 'entry'],
  roof_terrace: ['roof', 'terrace', 'garden'],
  terraces: ['terrace', 'garden roof'],
  public_space: ['plaza', 'public', 'court', 'void'],
  towers: ['tower', 'marker'],
  materials: ['material', 'concrete', 'timber', 'glass', 'lime', 'vegetation']
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const entries = JSON.parse(await readFile(resolve(rootDir, 'data/mock-entries.json'), 'utf8'));
  const selected = selectEntries(entries);
  const results = [];

  for (const entry of selected) {
    results.push(await reviewEntry(entry));
  }

  const summary = {
    reviewed: results.length,
    ready_for_promote_review: results.filter((item) => item.recommendation === 'ready_for_promote_review').length,
    needs_layer_work: results.filter((item) => item.recommendation === 'needs_layer_work').length,
    missing_glb: results.filter((item) => item.recommendation === 'missing_glb').length,
    average_score: results.length ? Math.round(results.reduce((sum, item) => sum + item.score, 0) / results.length) : 0
  };

  const report = {
    generated_at: new Date().toISOString(),
    writes_public_files: false,
    writes_public_manifest: false,
    uploads_assets: false,
    writes_d1_or_r2: false,
    summary,
    results,
    safety: [
      'This review reads local GLBs and automation profiles only.',
      'It does not copy models into public/archive-models and does not update the public manifest.',
      'A high score means ready for owner review, not automatically public-safe or measured-accurate.',
      'All models remain diagrammatic Architecture Cosmos study models until manually reviewed.'
    ]
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await writeFile(resolve(outputRoot, `brain-model-review-${timestamp}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'latest.md'), renderMarkdown(report), 'utf8');

  console.log('Architecture Cosmos Brain Model Review');
  console.log(`Reviewed: ${summary.reviewed}`);
  console.log(`Ready for promote review: ${summary.ready_for_promote_review}`);
  console.log(`Needs layer work: ${summary.needs_layer_work}`);
  console.log(`Missing GLB: ${summary.missing_glb}`);
  console.log(`Average score: ${summary.average_score}`);
  console.log('Report: out/brain-model-review/' + today + '/latest.md');
}

function selectEntries(entries) {
  const wanted = args.entry
    ? String(args.entry).split(',').map((item) => item.trim()).filter(Boolean)
    : defaultPilotSlugs;
  return wanted
    .map((slug) => entries.find((entry) => entry.slug === slug || entry.id === slug))
    .filter(Boolean);
}

async function reviewEntry(entry) {
  const glbPath = resolve(rootDir, 'archive-intake', entry.slug, 'models/low.glb');
  const toolRunPath = resolve(rootDir, 'archive-intake', entry.slug, 'automation/model-tool-run.json');
  const geometryProfilePath = resolve(rootDir, 'archive-intake', entry.slug, 'analysis/generated-geometry-profile.json');
  const blenderProfilePath = resolve(rootDir, 'archive-intake', entry.slug, 'automation/blender-import-profile.json');

  if (!existsSync(glbPath)) {
    return {
      slug: entry.slug,
      title: entry.title,
      score: 0,
      recommendation: 'missing_glb',
      checks: [{ id: 'local_glb', status: 'failed', message: 'Missing archive-intake low.glb.' }],
      next_action: 'Run npm run cosmos:model-generate -- --entry ' + entry.slug
    };
  }

  const glb = await readGlb(glbPath);
  const toolRun = existsSync(toolRunPath) ? JSON.parse(await readFile(toolRunPath, 'utf8')) : null;
  const geometryProfile = existsSync(geometryProfilePath) ? JSON.parse(await readFile(geometryProfilePath, 'utf8')) : null;
  const expectedLayers = toolRun?.template?.layer_contract ?? inferExpectedLayers(entry);
  const layerCoverage = expectedLayers.map((layer) => layerCoverageFor(layer, glb.nodeNames, glb.materialNames));
  const missingLayers = layerCoverage.filter((item) => !item.present).map((item) => item.layer);
  const warnings = [];

  if (glb.nodeNames.length < 8) warnings.push('Very low object count; review whether the model reads as architecture.');
  if (glb.materialNames.length < 4) warnings.push('Few material layers; material filter use may be weak.');
  if (!geometryProfile) warnings.push('Missing generated geometry profile.');
  if (!toolRun) warnings.push('Missing model tool run profile.');
  if (!existsSync(blenderProfilePath)) warnings.push('Missing Blender import profile.');

  const score = scoreReview({
    glb,
    toolRun,
    geometryProfile,
    blenderProfileExists: existsSync(blenderProfilePath),
    missingLayers,
    warnings
  });
  const recommendation = missingLayers.length > 2 || score < 70
    ? 'needs_layer_work'
    : 'ready_for_promote_review';

  return {
    slug: entry.slug,
    title: entry.title,
    score,
    recommendation,
    glb: {
      path: `archive-intake/${entry.slug}/models/low.glb`,
      size_bytes: glb.sizeBytes,
      scene_name: glb.sceneName,
      node_count: glb.nodeNames.length,
      mesh_count: glb.meshCount,
      material_count: glb.materialNames.length,
      triangle_count: glb.triangleCount,
      materials: glb.materialNames,
      sample_nodes: glb.nodeNames.slice(0, 12)
    },
    template_id: toolRun?.template?.id ?? 'unknown',
    expected_layers: expectedLayers,
    layer_coverage: layerCoverage,
    missing_layers: missingLayers,
    warnings,
    checks: [
      { id: 'local_glb', status: 'passed', message: 'Local review GLB exists and parses.' },
      { id: 'geometry_profile', status: geometryProfile ? 'passed' : 'warning', message: geometryProfile ? 'Geometry profile exists.' : 'Missing geometry profile.' },
      { id: 'tool_run', status: toolRun ? 'passed' : 'warning', message: toolRun ? `Tool run exists (${toolRun.status}).` : 'Missing tool run.' },
      { id: 'blender_profile', status: existsSync(blenderProfilePath) ? 'passed' : 'warning', message: existsSync(blenderProfilePath) ? 'Blender import profile exists.' : 'Missing Blender profile.' }
    ],
    next_action: recommendation === 'ready_for_promote_review'
      ? `Run npm run brain:promote-model -- --entry ${entry.slug} for a dry-run, then owner review.`
      : `Improve ${missingLayers.join(', ') || 'layer naming'} before public promotion review.`
  };
}

async function readGlb(filePath) {
  const buffer = await readFile(filePath);
  const magic = buffer.subarray(0, 4).toString('utf8');
  if (magic !== 'glTF') throw new Error(`${filePath} is not a GLB file.`);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) throw new Error(`${filePath} has no JSON chunk.`);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim());
  const nodeNames = (json.nodes ?? []).map((node) => node.name ?? 'unnamed');
  const materialNames = (json.materials ?? []).map((material) => material.name ?? 'unnamed');
  const triangleCount = (json.meshes ?? []).reduce((sum, mesh) => {
    return sum + (mesh.primitives ?? []).reduce((primitiveSum, primitive) => {
      const accessor = typeof primitive.indices === 'number' ? json.accessors?.[primitive.indices] : null;
      return primitiveSum + (accessor?.count ? Math.round(accessor.count / 3) : 0);
    }, 0);
  }, 0);
  return {
    sizeBytes: buffer.length,
    sceneName: json.scenes?.[json.scene ?? 0]?.name ?? 'unnamed scene',
    nodeNames,
    meshCount: json.meshes?.length ?? 0,
    materialNames,
    triangleCount
  };
}

function layerCoverageFor(layer, nodeNames, materialNames) {
  const keywords = layerKeywords[layer] ?? [layer.replace(/_/g, ' '), layer];
  const haystack = [...nodeNames, ...materialNames].map((value) => value.toLowerCase());
  const matches = keywords.filter((keyword) => haystack.some((value) => value.includes(keyword.toLowerCase())));
  return {
    layer,
    present: matches.length > 0,
    matched_keywords: [...new Set(matches)]
  };
}

function scoreReview({ glb, toolRun, geometryProfile, blenderProfileExists, missingLayers, warnings }) {
  let score = 40;
  if (glb.nodeNames.length >= 12) score += 12;
  if (glb.nodeNames.length >= 30) score += 8;
  if (glb.materialNames.length >= 5) score += 12;
  if (glb.triangleCount >= 120) score += 8;
  if (toolRun?.status === 'model_plan_and_glb_generated') score += 8;
  if (geometryProfile) score += 6;
  if (blenderProfileExists) score += 6;
  score -= missingLayers.length * 7;
  score -= warnings.length * 2;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function inferExpectedLayers(entry) {
  if (entry.entry_type === 'infrastructure' || entry.entry_type === 'urban_plan') {
    return ['site', 'infrastructure', 'mass', 'circulation', 'public_space', 'materials'];
  }
  return ['site', 'mass', 'structure', 'facade', 'interior', 'circulation', 'materials'];
}

function renderMarkdown(report) {
  const lines = [
    '# Brain Model Review',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Summary',
    '',
    `- Reviewed: ${report.summary.reviewed}`,
    `- Ready for promote review: ${report.summary.ready_for_promote_review}`,
    `- Needs layer work: ${report.summary.needs_layer_work}`,
    `- Missing GLB: ${report.summary.missing_glb}`,
    `- Average score: ${report.summary.average_score}`,
    '',
    '## Entries',
    ''
  ];

  for (const item of report.results) {
    lines.push(`### ${item.title} (\`${item.slug}\`)`);
    lines.push('');
    lines.push(`- Score: ${item.score}`);
    lines.push(`- Recommendation: \`${item.recommendation}\``);
    if (item.glb) {
      lines.push(`- Nodes/materials/triangles: ${item.glb.node_count}/${item.glb.material_count}/${item.glb.triangle_count}`);
      lines.push(`- Template: \`${item.template_id}\``);
    }
    if (item.missing_layers?.length) lines.push(`- Missing layers: ${item.missing_layers.map((layer) => `\`${layer}\``).join(', ')}`);
    if (item.warnings?.length) lines.push(`- Warnings: ${item.warnings.join(' ')}`);
    lines.push(`- Next: ${item.next_action}`);
    lines.push('');
  }

  lines.push('## Safety', '');
  for (const item of report.safety) lines.push(`- ${item}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : true;
    if (next && !next.startsWith('--')) index += 1;
  }
  return parsed;
}
