#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const ifcPreviewPath = join(projectRoot, args.ifc || 'design/ifc-geometry-preview.generated.json');
const sourceMappingPath = join(projectRoot, args.mapping || 'design/context-source-mapping.json');
const outputJsonPath = join(projectRoot, args.output || 'design/ifc-dxf-alignment-preview.generated.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/ifc-dxf-alignment-preview.generated.md');
const outputSvgPath = join(projectRoot, args.svg || 'viz/previews/ifc-dxf-alignment-preview.svg');
const maxDxfPolylines = Number(args['max-dxf-polylines'] || 15000);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const sourceRegistry = existsSync(join(projectRoot, 'data/sources.json')) ? readJson(join(projectRoot, 'data/sources.json')) : null;
  const sourceMapping = existsSync(sourceMappingPath) ? readJson(sourceMappingPath) : null;
  const ifcPreview = existsSync(ifcPreviewPath) ? readJson(ifcPreviewPath) : null;
  const sourcePaths = resolveSourcePaths(sourceRegistry);
  const acceptedLayers = acceptedDxfLayers(sourceMapping);
  const dxfAnalysis = analyzeDxf(sourcePaths.dxf, acceptedLayers);
  const origin = readOriginMetadata(sourceRegistry);
  const preview = buildPreview({ ifcPreview, dxfAnalysis, acceptedLayers, sourcePaths, origin });

  await mkdir(dirname(outputJsonPath), { recursive: true });
  await mkdir(dirname(outputMdPath), { recursive: true });
  await mkdir(dirname(outputSvgPath), { recursive: true });
  await writeFile(outputJsonPath, `${JSON.stringify(preview, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(preview), 'utf8');
  await writeFile(outputSvgPath, renderSvg(preview, ifcPreview, dxfAnalysis.polylines), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo IFC/DXF alignment preview generated');
  console.log(`Project: ${preview.project_id}`);
  console.log(`Status: ${preview.status}`);
  console.log(`Accepted DXF layers: ${preview.summary.accepted_dxf_layer_count}`);
  console.log(`DXF polylines: ${preview.summary.dxf_accepted_polyline_count}`);
  console.log(`IFC bboxes: ${preview.summary.ifc_geometry_bbox_count}`);
  console.log(`Overlap ratio: ${preview.summary.overlap_ratio_of_smaller_bbox}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  console.log(`SVG: ${relative(root, outputSvgPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildPreview({ ifcPreview, dxfAnalysis, acceptedLayers, sourcePaths, origin }) {
  const ifcBounds = to2dBounds(ifcPreview?.global_bounds || null);
  const dxfBounds = dxfAnalysis.bounds;
  const combinedBounds = combine2dBounds([ifcBounds, dxfBounds]);
  const metrics = compareBounds(ifcBounds, dxfBounds);
  const status = alignmentStatus({ ifcPreview, dxfAnalysis, acceptedLayers });

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-ifc-dxf-alignment-preview',
    project_id: readProjectId(),
    status,
    rights_status: 'internal_only',
    source_files: {
      ifc_geometry_preview: sourceFileStatus(ifcPreviewPath),
      dxf: sourceFileStatus(sourcePaths.dxf),
      source_mapping: sourceFileStatus(sourceMappingPath),
      origin_metadata: origin?.source_file || null
    },
    preview_svg_path: relative(projectRoot, outputSvgPath),
    engine: {
      name: 'kosmo_ifc_dxf_alignment_preview',
      note: 'Read-only SVG overlay of accepted DXF context polylines and IFC geometry bounding boxes. This is a visual alignment review, not a CAD/BIM import.'
    },
    policy: {
      preview_does_not_approve_design_generation: true,
      preview_does_not_modify_context_selection: true,
      dxf_context_is_reference_only: true,
      ifc_geometry_is_bbox_review_only: true,
      human_alignment_review_required_before_design_seed: true
    },
    origin,
    summary: {
      accepted_dxf_layer_count: acceptedLayers.length,
      dxf_exists: dxfAnalysis.exists,
      dxf_total_polyline_count: dxfAnalysis.total_polyline_count,
      dxf_accepted_polyline_count: dxfAnalysis.accepted_polyline_count,
      dxf_accepted_vertex_count: dxfAnalysis.accepted_vertex_count,
      dxf_rendered_polyline_count: dxfAnalysis.rendered_polyline_count,
      ifc_geometry_preview_exists: Boolean(ifcPreview),
      ifc_geometry_preview_ready: isIfcGeometryPreviewReady(ifcPreview),
      ifc_geometry_bbox_count: numberOrDefault(ifcPreview?.summary?.elements_with_geometry_bbox, 0),
      ifc_faces_resolved: numberOrDefault(ifcPreview?.summary?.faces_resolved, 0),
      combined_bounds_ready: Boolean(combinedBounds),
      center_offset_m_estimate: metrics.center_offset_m_estimate,
      overlap_ratio_of_smaller_bbox: metrics.overlap_ratio_of_smaller_bbox,
      ifc_width_m_estimate: metrics.ifc_width_m_estimate,
      ifc_depth_m_estimate: metrics.ifc_depth_m_estimate,
      dxf_width_m_estimate: metrics.dxf_width_m_estimate,
      dxf_depth_m_estimate: metrics.dxf_depth_m_estimate,
      width_ratio_ifc_to_dxf: metrics.width_ratio_ifc_to_dxf,
      depth_ratio_ifc_to_dxf: metrics.depth_ratio_ifc_to_dxf,
      alignment_hint: alignmentHint(metrics, status),
      design_seed_approved: false,
      recommended_next_step: status === 'ifc_dxf_alignment_preview_ready_for_human_review'
        ? 'human_review_ifc_dxf_overlay_before_design_seed'
        : 'complete_missing_ifc_or_dxf_alignment_inputs'
    },
    accepted_dxf_layers: acceptedLayers,
    bounds: {
      ifc: ifcBounds,
      dxf: dxfBounds,
      combined: combinedBounds
    },
    dxf_layer_stats: dxfAnalysis.layer_stats,
    dxf_polyline_sample: dxfAnalysis.polylines.slice(0, 24),
    ifc_element_sample: Array.isArray(ifcPreview?.element_sample) ? ifcPreview.element_sample.slice(0, 24) : [],
    next_actions: nextActions(status, metrics)
  };
}

function analyzeDxf(pathname, acceptedLayers) {
  const accepted = new Set(acceptedLayers);
  if (!existsSync(pathname)) {
    return emptyDxfAnalysis(false);
  }

  const lines = readFileSync(pathname, 'utf8').split(/\r?\n/);
  const layerStats = {};
  const polylines = [];
  let current = null;
  let activePolyline = null;
  let totalPolylineCount = 0;

  const flushCurrent = () => {
    if (!current?.type) return;
    if (current.type === 'POLYLINE') {
      activePolyline = {
        layer: current.layer || '0',
        points: []
      };
      totalPolylineCount += 1;
      notePolylineLayer(activePolyline.layer, layerStats);
      return;
    }
    if (current.type === 'VERTEX') {
      if (activePolyline && current.points.length) {
        activePolyline.points.push(...current.points);
      }
      return;
    }
    if (current.type === 'SEQEND') {
      flushActivePolyline();
      return;
    }
    if (current.type === 'LWPOLYLINE') {
      totalPolylineCount += 1;
      notePolylineLayer(current.layer || '0', layerStats);
      pushAcceptedPolyline(current.layer || '0', current.points);
    }
  };

  const flushActivePolyline = () => {
    if (!activePolyline) return;
    pushAcceptedPolyline(activePolyline.layer, activePolyline.points);
    activePolyline = null;
  };

  const pushAcceptedPolyline = (layer, points) => {
    if (!accepted.has(layer) || points.length < 2) return;
    const cleaned = points.filter((point) => point.every(Number.isFinite));
    if (cleaned.length < 2) return;
    polylines.push({
      layer,
      point_count: cleaned.length,
      bounds: boundsFrom2dPoints(cleaned),
      points: cleaned.map((point) => point.map(round))
    });
  };

  for (let index = 0; index < lines.length - 1; index += 2) {
    const code = lines[index].trim();
    const value = lines[index + 1].trim();
    if (code === '0') {
      flushCurrent();
      current = {
        type: value,
        layer: activePolyline?.layer || null,
        points: [],
        pending_x: null
      };
      continue;
    }
    if (!current) continue;
    if (code === '8') {
      current.layer = value;
    } else if (code === '10') {
      current.pending_x = Number(value);
    } else if (code === '20' && current.pending_x !== null) {
      current.points.push([current.pending_x, Number(value)]);
      current.pending_x = null;
    }
  }
  flushCurrent();
  flushActivePolyline();

  const bounds = combine2dBounds(polylines.map((polyline) => polyline.bounds));
  const acceptedVertexCount = polylines.reduce((sum, polyline) => sum + polyline.point_count, 0);
  const renderPolylines = selectForRender(polylines, maxDxfPolylines);

  return {
    exists: true,
    total_polyline_count: totalPolylineCount,
    accepted_polyline_count: polylines.length,
    accepted_vertex_count: acceptedVertexCount,
    rendered_polyline_count: renderPolylines.length,
    bounds,
    layer_stats: Object.entries(layerStats)
      .sort((a, b) => b[1].polyline_count - a[1].polyline_count || a[0].localeCompare(b[0]))
      .map(([layer, stats]) => ({
        layer,
        polyline_count: stats.polyline_count,
        accepted_for_alignment: accepted.has(layer)
      })),
    polylines: renderPolylines
  };
}

function notePolylineLayer(layer, layerStats) {
  layerStats[layer] ||= { polyline_count: 0 };
  layerStats[layer].polyline_count += 1;
}

function renderMarkdown(preview) {
  const lines = [
    '# IFC/DXF Alignment Preview',
    '',
    `Project ID: \`${preview.project_id}\``,
    `Generated: ${preview.generated_at}`,
    `Status: \`${preview.status}\``,
    '',
    'Read-only overlay for human origin, scale and extent review. This does not approve design generation.',
    '',
    '## Summary',
    '',
    `- IFC geometry preview: \`${preview.source_files.ifc_geometry_preview.path}\``,
    `- DXF source: \`${preview.source_files.dxf.path}\``,
    `- SVG preview: \`${preview.preview_svg_path}\``,
    `- accepted DXF layers: ${preview.summary.accepted_dxf_layer_count}`,
    `- DXF accepted polylines: ${preview.summary.dxf_accepted_polyline_count}`,
    `- DXF accepted vertices: ${preview.summary.dxf_accepted_vertex_count}`,
    `- IFC bboxes: ${preview.summary.ifc_geometry_bbox_count}`,
    `- IFC faces resolved: ${preview.summary.ifc_faces_resolved}`,
    `- center offset estimate: ${preview.summary.center_offset_m_estimate} m`,
    `- bbox overlap ratio of smaller bbox: ${preview.summary.overlap_ratio_of_smaller_bbox}`,
    `- IFC extents: ${preview.summary.ifc_width_m_estimate} x ${preview.summary.ifc_depth_m_estimate} m`,
    `- DXF extents: ${preview.summary.dxf_width_m_estimate} x ${preview.summary.dxf_depth_m_estimate} m`,
    `- alignment hint: \`${preview.summary.alignment_hint}\``,
    `- design seed approved: ${preview.summary.design_seed_approved ? 'yes' : 'no'}`,
    '',
    '## Accepted DXF Layers',
    ''
  ];

  if (!preview.accepted_dxf_layers.length) lines.push('- none');
  else for (const layer of preview.accepted_dxf_layers) lines.push(`- \`${layer}\``);

  lines.push('', '## Bounds', '');
  appendBounds(lines, 'IFC', preview.bounds.ifc);
  appendBounds(lines, 'DXF', preview.bounds.dxf);
  appendBounds(lines, 'Combined', preview.bounds.combined);

  lines.push('', '## Layer Stats', '', '| Layer | Polylines | Alignment input |', '| --- | ---: | --- |');
  for (const row of preview.dxf_layer_stats.slice(0, 12)) {
    lines.push(`| ${escapePipe(row.layer)} | ${row.polyline_count} | ${row.accepted_for_alignment ? 'yes' : 'no'} |`);
  }

  lines.push('', '## Next Actions', '');
  for (const action of preview.next_actions) lines.push(`- ${action}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function appendBounds(lines, label, bounds) {
  if (!bounds) {
    lines.push(`- ${label}: none`);
    return;
  }
  lines.push(`- ${label}: min [${bounds.min.join(', ')}], max [${bounds.max.join(', ')}]`);
}

function renderSvg(preview, ifcPreview, dxfPolylines) {
  const width = 1600;
  const height = 1100;
  const margin = 92;
  const bounds = preview.bounds.combined;
  if (!bounds) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="IFC DXF alignment preview unavailable">
  <rect width="${width}" height="${height}" fill="#101820"/>
  <text x="${margin}" y="${margin}" fill="#dce8ef" font-family="Arial, sans-serif" font-size="28">IFC/DXF Alignment Preview</text>
  <text x="${margin}" y="${margin + 44}" fill="#8fb3c6" font-family="Arial, sans-serif" font-size="18">No combined IFC/DXF bounds available.</text>
</svg>
`;
  }

  const spanX = Math.max(1, bounds.max[0] - bounds.min[0]);
  const spanY = Math.max(1, bounds.max[1] - bounds.min[1]);
  const scale = Math.min((width - margin * 2) / spanX, (height - margin * 2) / spanY);
  const mapX = (x) => margin + (x - bounds.min[0]) * scale;
  const mapY = (y) => height - margin - (y - bounds.min[1]) * scale;
  const grid = renderGrid({ bounds, mapX, mapY, width, height, margin });
  const dxf = dxfPolylines.map((polyline) => {
    const points = polyline.points.map(([x, y]) => `${round(mapX(x))},${round(mapY(y))}`).join(' ');
    return `  <polyline points="${points}" fill="none" stroke="#56d9ff" stroke-opacity="0.42" stroke-width="0.8"/>`;
  });
  const ifcElements = (Array.isArray(ifcPreview?.elements) ? ifcPreview.elements : [])
    .filter((element) => element.geometry_bbox)
    .sort((a, b) => (b.footprint_area_m2_estimate || 0) - (a.footprint_area_m2_estimate || 0));
  const ifc = ifcElements.map((element) => {
    const bbox = to2dBounds(element.geometry_bbox);
    const x = mapX(bbox.min[0]);
    const y = mapY(bbox.max[1]);
    const w = Math.max(1, (bbox.max[0] - bbox.min[0]) * scale);
    const h = Math.max(1, (bbox.max[1] - bbox.min[1]) * scale);
    return `  <rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="#ff4fd8" fill-opacity="0.2" stroke="#ff8af0" stroke-width="1"/>`;
  });
  const dxfBounds = boundsRect(preview.bounds.dxf, mapX, mapY, '#56d9ff', '0.9');
  const ifcBounds = boundsRect(preview.bounds.ifc, mapX, mapY, '#ff8af0', '0.95');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="IFC DXF alignment top projection preview">
  <rect width="${width}" height="${height}" fill="#101820"/>
  <rect x="${margin}" y="${margin}" width="${round(spanX * scale)}" height="${round(spanY * scale)}" fill="#0d151b" stroke="#314b5a" stroke-width="1"/>
${grid}
${dxf.join('\n')}
${ifc.join('\n')}
${dxfBounds}
${ifcBounds}
  <rect x="${width - 430}" y="28" width="344" height="98" rx="6" fill="#101820" fill-opacity="0.82" stroke="#314b5a"/>
  <line x1="${width - 402}" y1="60" x2="${width - 330}" y2="60" stroke="#56d9ff" stroke-width="3" stroke-opacity="0.8"/>
  <text x="${width - 314}" y="66" fill="#dce8ef" font-family="Arial, sans-serif" font-size="16">accepted DXF context</text>
  <rect x="${width - 402}" y="82" width="72" height="22" fill="#ff4fd8" fill-opacity="0.24" stroke="#ff8af0"/>
  <text x="${width - 314}" y="100" fill="#dce8ef" font-family="Arial, sans-serif" font-size="16">IFC bbox preview</text>
  <text x="${margin}" y="38" fill="#dce8ef" font-family="Arial, sans-serif" font-size="26">IFC/DXF Alignment Preview - Top Projection</text>
  <text x="${margin}" y="66" fill="#8fb3c6" font-family="Arial, sans-serif" font-size="15">${preview.summary.dxf_accepted_polyline_count} DXF polylines, ${preview.summary.ifc_geometry_bbox_count} IFC bboxes, overlap ${preview.summary.overlap_ratio_of_smaller_bbox}</text>
  <text x="${margin}" y="${height - 30}" fill="#8fb3c6" font-family="Arial, sans-serif" font-size="15">Read-only review overlay. Not a CAD import. Not approved as design seed.</text>
</svg>
`;
}

function renderGrid({ bounds, mapX, mapY, width, height, margin }) {
  const lines = [];
  const step = niceGridStep(Math.max(bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1]) / 8);
  const startX = Math.ceil(bounds.min[0] / step) * step;
  const startY = Math.ceil(bounds.min[1] / step) * step;
  for (let x = startX; x <= bounds.max[0]; x += step) {
    const sx = round(mapX(x));
    lines.push(`  <line x1="${sx}" y1="${margin}" x2="${sx}" y2="${height - margin}" stroke="#233844" stroke-width="1" stroke-opacity="0.45"/>`);
  }
  for (let y = startY; y <= bounds.max[1]; y += step) {
    const sy = round(mapY(y));
    lines.push(`  <line x1="${margin}" y1="${sy}" x2="${width - margin}" y2="${sy}" stroke="#233844" stroke-width="1" stroke-opacity="0.45"/>`);
  }
  return lines.join('\n');
}

function boundsRect(bounds, mapX, mapY, color, opacity) {
  if (!bounds) return '';
  const x = mapX(bounds.min[0]);
  const y = mapY(bounds.max[1]);
  const w = Math.max(1, mapX(bounds.max[0]) - mapX(bounds.min[0]));
  const h = Math.max(1, mapY(bounds.min[1]) - mapY(bounds.max[1]));
  return `  <rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="2.5" stroke-dasharray="9 7"/>`;
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = ensureItem(manifest.outputs, 'design/ifc-dxf-alignment-preview.generated.json', {
      path: 'design/ifc-dxf-alignment-preview.generated.json',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Read-only IFC/DXF overlay preview before design-seed review.'
    });
    didChange = ensureItem(manifest.outputs, 'design/ifc-dxf-alignment-preview.generated.md', {
      path: 'design/ifc-dxf-alignment-preview.generated.md',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Human-readable IFC/DXF alignment preview before design-seed review.'
    }) || didChange;
    didChange = ensureItem(manifest.outputs, 'viz/previews/ifc-dxf-alignment-preview.svg', {
      path: 'viz/previews/ifc-dxf-alignment-preview.svg',
      type: 'viz_preview',
      module: 'viz',
      rights_status: 'generated_needs_review',
      description: 'SVG overlay of accepted DXF context polylines and IFC geometry bboxes.'
    }) || didChange;
    if (didChange) {
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      changed.push(manifestPath);
    }
  }

  const exportManifestPath = join(projectRoot, 'publish/export-manifest.json');
  if (existsSync(exportManifestPath)) {
    const exportManifest = readJson(exportManifestPath);
    if (!Array.isArray(exportManifest.exports)) exportManifest.exports = [];
    let didChange = ensureItem(exportManifest.exports, 'design/ifc-dxf-alignment-preview.generated.json', {
      path: 'design/ifc-dxf-alignment-preview.generated.json',
      module: 'Kosmo Design',
      format: 'json',
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    });
    didChange = ensureItem(exportManifest.exports, 'design/ifc-dxf-alignment-preview.generated.md', {
      path: 'design/ifc-dxf-alignment-preview.generated.md',
      module: 'Kosmo Design',
      format: 'markdown',
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    }) || didChange;
    didChange = ensureItem(exportManifest.exports, 'viz/previews/ifc-dxf-alignment-preview.svg', {
      path: 'viz/previews/ifc-dxf-alignment-preview.svg',
      module: 'Kosmo Viz',
      format: 'svg',
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    }) || didChange;
    if (didChange) {
      await writeFile(exportManifestPath, `${JSON.stringify(exportManifest, null, 2)}\n`, 'utf8');
      changed.push(exportManifestPath);
    }
  }

  return changed;
}

function resolveSourcePaths(sourceRegistry) {
  const sources = sourceRegistry?.sources || [];
  const byType = (type, fallback) => {
    const source = sources.find((item) => item.type === type && item.path);
    return join(projectRoot, source?.path || fallback);
  };
  return {
    dxf: byType('dxf', 'data/source-files/Plangrundlage.dxf')
  };
}

function acceptedDxfLayers(sourceMapping) {
  const rows = Array.isArray(sourceMapping?.rows) ? sourceMapping.rows : [];
  return [...new Set(rows
    .filter((row) => row.source_kind === 'dxf_layer' && row.decision === 'accepted_as_context' && row.source_name)
    .map((row) => row.source_name))];
}

function alignmentStatus({ ifcPreview, dxfAnalysis, acceptedLayers }) {
  if (!isIfcGeometryPreviewReady(ifcPreview) && !dxfAnalysis.exists) return 'missing_ifc_geometry_preview_and_dxf_source';
  if (!isIfcGeometryPreviewReady(ifcPreview)) return 'missing_ifc_geometry_preview';
  if (!dxfAnalysis.exists) return 'missing_dxf_source';
  if (!acceptedLayers.length) return 'no_accepted_dxf_context_layers';
  if (!dxfAnalysis.accepted_polyline_count) return 'no_dxf_geometry_on_accepted_layers';
  return 'ifc_dxf_alignment_preview_ready_for_human_review';
}

function alignmentHint(metrics, status) {
  if (status !== 'ifc_dxf_alignment_preview_ready_for_human_review') return status;
  if (metrics.overlap_ratio_of_smaller_bbox >= 0.55 && metrics.center_offset_m_estimate <= Math.max(metrics.dxf_width_m_estimate, metrics.dxf_depth_m_estimate) * 0.25) {
    return 'likely_same_project_origin_review_visually';
  }
  if (metrics.overlap_ratio_of_smaller_bbox >= 0.15) return 'partial_overlap_review_origin_and_extent';
  return 'low_bbox_overlap_review_coordinate_shift_or_extent_mismatch';
}

function nextActions(status, metrics) {
  if (status === 'missing_ifc_geometry_preview') return ['Run npm run kosmo:ifc-geometry-preview before alignment review.'];
  if (status === 'missing_dxf_source') return ['Register a local DXF source before alignment review.'];
  if (status === 'no_accepted_dxf_context_layers') return ['Accept at least one reviewed DXF context layer in design/context-source-mapping.json before overlay review.'];
  if (status === 'no_dxf_geometry_on_accepted_layers') return ['Check whether accepted DXF layers contain POLYLINE or LWPOLYLINE geometry.'];
  if (status === 'missing_ifc_geometry_preview_and_dxf_source') return ['Generate IFC geometry preview and register a DXF source before alignment review.'];
  const actions = [
    'Open the SVG overlay and compare IFC bboxes against the accepted DXF building context.',
    'Review origin, units and outlier extents before changing the IFC candidate decision.',
    'Keep approved_for_design_generation=false until source alignment and semantic IFC import are human-reviewed.'
  ];
  if (metrics.overlap_ratio_of_smaller_bbox < 0.15) {
    actions.unshift('Low bbox overlap: inspect whether IFC and DXF use different shifted origins or extents.');
  }
  return actions;
}

function readOriginMetadata(sourceRegistry) {
  const sources = sourceRegistry?.sources || [];
  const source = sources.find((item) => item.type === 'origin_metadata' && item.path);
  if (!source) return null;
  const pathname = join(projectRoot, source.path);
  if (!existsSync(pathname)) return null;
  const origin = readJson(pathname);
  return {
    source_file: sourceFileStatus(pathname),
    lv95_origin: origin.lv95_origin || null,
    wgs84_origin: origin.wgs84_origin || null,
    convention: origin.convention || null
  };
}

function compareBounds(ifcBounds, dxfBounds) {
  const empty = {
    center_offset_m_estimate: 0,
    overlap_ratio_of_smaller_bbox: 0,
    ifc_width_m_estimate: boundsWidth(ifcBounds),
    ifc_depth_m_estimate: boundsDepth(ifcBounds),
    dxf_width_m_estimate: boundsWidth(dxfBounds),
    dxf_depth_m_estimate: boundsDepth(dxfBounds),
    width_ratio_ifc_to_dxf: 0,
    depth_ratio_ifc_to_dxf: 0
  };
  if (!ifcBounds || !dxfBounds) return empty;
  const ifcCenter = boundsCenter(ifcBounds);
  const dxfCenter = boundsCenter(dxfBounds);
  const ifcArea = boundsArea(ifcBounds);
  const dxfArea = boundsArea(dxfBounds);
  const intersection = intersectionArea(ifcBounds, dxfBounds);
  return {
    center_offset_m_estimate: round(Math.hypot(ifcCenter[0] - dxfCenter[0], ifcCenter[1] - dxfCenter[1])),
    overlap_ratio_of_smaller_bbox: round(intersection / Math.max(1, Math.min(ifcArea, dxfArea))),
    ifc_width_m_estimate: boundsWidth(ifcBounds),
    ifc_depth_m_estimate: boundsDepth(ifcBounds),
    dxf_width_m_estimate: boundsWidth(dxfBounds),
    dxf_depth_m_estimate: boundsDepth(dxfBounds),
    width_ratio_ifc_to_dxf: round(boundsWidth(ifcBounds) / Math.max(1, boundsWidth(dxfBounds))),
    depth_ratio_ifc_to_dxf: round(boundsDepth(ifcBounds) / Math.max(1, boundsDepth(dxfBounds)))
  };
}

function to2dBounds(bounds) {
  if (!bounds?.min || !bounds?.max) return null;
  return {
    min: [round(bounds.min[0]), round(bounds.min[1])],
    max: [round(bounds.max[0]), round(bounds.max[1])]
  };
}

function boundsFrom2dPoints(points) {
  let bounds = null;
  for (const point of points) {
    bounds ||= { min: [...point], max: [...point] };
    bounds.min[0] = Math.min(bounds.min[0], point[0]);
    bounds.min[1] = Math.min(bounds.min[1], point[1]);
    bounds.max[0] = Math.max(bounds.max[0], point[0]);
    bounds.max[1] = Math.max(bounds.max[1], point[1]);
  }
  return bounds ? { min: bounds.min.map(round), max: bounds.max.map(round) } : null;
}

function combine2dBounds(boundsList) {
  let combined = null;
  for (const bounds of boundsList) {
    if (!bounds) continue;
    combined ||= { min: [...bounds.min], max: [...bounds.max] };
    combined.min[0] = Math.min(combined.min[0], bounds.min[0]);
    combined.min[1] = Math.min(combined.min[1], bounds.min[1]);
    combined.max[0] = Math.max(combined.max[0], bounds.max[0]);
    combined.max[1] = Math.max(combined.max[1], bounds.max[1]);
  }
  return combined ? { min: combined.min.map(round), max: combined.max.map(round) } : null;
}

function intersectionArea(a, b) {
  const minX = Math.max(a.min[0], b.min[0]);
  const minY = Math.max(a.min[1], b.min[1]);
  const maxX = Math.min(a.max[0], b.max[0]);
  const maxY = Math.min(a.max[1], b.max[1]);
  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function boundsArea(bounds) {
  return bounds ? Math.max(0, bounds.max[0] - bounds.min[0]) * Math.max(0, bounds.max[1] - bounds.min[1]) : 0;
}

function boundsWidth(bounds) {
  return bounds ? round(bounds.max[0] - bounds.min[0]) : 0;
}

function boundsDepth(bounds) {
  return bounds ? round(bounds.max[1] - bounds.min[1]) : 0;
}

function boundsCenter(bounds) {
  return [(bounds.min[0] + bounds.max[0]) / 2, (bounds.min[1] + bounds.max[1]) / 2];
}

function selectForRender(items, limit) {
  if (!Number.isFinite(limit) || limit <= 0 || items.length <= limit) return items;
  const selected = [];
  const step = items.length / limit;
  for (let index = 0; index < limit; index += 1) {
    selected.push(items[Math.floor(index * step)]);
  }
  return selected;
}

function isIfcGeometryPreviewReady(preview) {
  return Boolean(
    preview
      && preview.status === 'ifc_geometry_preview_ready_for_human_review'
      && preview.summary?.elements_with_geometry_bbox > 0
  );
}

function emptyDxfAnalysis(exists) {
  return {
    exists,
    total_polyline_count: 0,
    accepted_polyline_count: 0,
    accepted_vertex_count: 0,
    rendered_polyline_count: 0,
    bounds: null,
    layer_stats: [],
    polylines: []
  };
}

function sourceFileStatus(pathname) {
  return {
    path: relative(projectRoot, pathname),
    name: basename(pathname),
    exists: existsSync(pathname),
    size_bytes: existsSync(pathname) ? statSync(pathname).size : 0
  };
}

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
}

function readProjectId() {
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (!existsSync(manifestPath)) return basename(projectRoot);
  return readJson(manifestPath).project_id || basename(projectRoot);
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function numberOrDefault(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function niceGridStep(raw) {
  const power = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const factor = raw / power;
  if (factor <= 2) return 2 * power;
  if (factor <= 5) return 5 * power;
  return 10 * power;
}

function escapePipe(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
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
