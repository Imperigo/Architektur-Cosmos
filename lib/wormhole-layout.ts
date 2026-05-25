import { polarToCartesian } from '@/lib/polar-coordinates';
import type { Entry } from '@/lib/types';
import { angleInSector, atlasSize, styleSectors, type AtlasNode, type SemanticLevel, type TimeRing } from '@/lib/atlas-layout';

export type WormholeState = {
  phase: number;
  timePosition: number;
  edgeTension: number;
  direction: 'into_past' | 'returning';
  currentYear: number;
};

export type WormholeEntryNode = AtlasNode & {
  worldPosition: number;
  depth: number;
  closeness: number;
  semanticLevel: SemanticLevel;
  opacity: number;
  size: number;
  driftX: number;
  driftY: number;
  driftDelay: number;
};

const wormholeAnchors = [
  { year: 2025, position: 0 },
  { year: 2000, position: 0.08 },
  { year: 1950, position: 0.19 },
  { year: 1900, position: 0.33 },
  { year: 1800, position: 0.5 },
  { year: 1600, position: 0.68 },
  { year: 1400, position: 0.83 },
  { year: 1000, position: 1.02 },
  { year: 0, position: 1.3 },
  { year: -500, position: 1.45 },
  { year: -3000, position: 1.85 },
  { year: -5000, position: 2.05 },
  { year: -7000, position: 2.23 },
  { year: -9000, position: 2.4 }
];
const wormholeYears = wormholeAnchors.map((anchor) => anchor.year);
export const wormholeTravelEnd = 2.4;
const oldestYear = -9000;
const presentYear = 2025;
const staticTimelineMarkers = [
  -9000, -8000, -7000, -6000, -5000, -4000, -3000, -2500, -2000, -1500,
  -1000, -750, -500, -250, 0, 250, 500, 750, 1000, 1200, 1400, 1500,
  1600, 1700, 1750, 1800, 1850, 1875, 1900, 1925, 1940, 1950, 1960, 1975,
  1990, 2000, 2010, 2020, 2025
];
const maxTunnelRadius = 438;
const minTunnelRadius = 36;
const visibleDepth = 1.38;
const frontFadeDepth = -0.16;

export const wormholeTunnel = {
  maxRadius: maxTunnelRadius,
  minRadius: minTunnelRadius,
  visibleDepth
};

export function wormholeState(travel: number): WormholeState {
  const timePosition = clampTravel(travel);
  const edgeTension = travel < 0 ? travel : travel > wormholeTravelEnd ? travel - wormholeTravelEnd : 0;

  return {
    phase: timePosition,
    timePosition,
    edgeTension,
    direction: 'into_past',
    currentYear: positionToYear(timePosition)
  };
}

export function wormholeRings(state: WormholeState): TimeRing[] {
  const years = [...new Set([...staticTimelineMarkers, ...rollingTimelineMarkers(state.timePosition)])]
    .filter((year) => year >= oldestYear && year <= presentYear)
    .sort((a, b) => yearToPosition(a) - yearToPosition(b));

  return years
    .map((year) => {
      const depth = ringDepth(year, state.timePosition);
      const isCurrent = Math.abs(yearToPosition(year) - state.timePosition) < 0.016;
      const isAnchor = wormholeYears.includes(year);

      return {
        year,
        label: formatYear(year),
        radius: tunnelRadius(depth),
        depth,
        weight: isCurrent || isAnchor ? 'major' as const : 'minor' as const,
        mode: isCurrent ? 'local' as const : isAnchor ? 'global' as const : 'medium' as const
      };
    })
    .filter((ring) => ring.depth >= frontFadeDepth && ring.depth <= visibleDepth);
}

export function wormholeGridLines(state: WormholeState, options?: { spokeStride?: number; sampleCount?: number }) {
  const lines: string[] = [];
  const spokeStride = Math.max(1, options?.spokeStride ?? 1);
  const sampleCount = Math.max(2, options?.sampleCount ?? 58);
  const frontDepth = tunnelFrontDepth(state);
  const samples = Array.from({ length: sampleCount }, (_, index) => frontDepth + (index / (sampleCount - 1)) * (visibleDepth - frontDepth));

  for (let spoke = 0; spoke < 72; spoke += spokeStride) {
    const baseAngle = spoke * 5;
    const points = samples.map((depth) => {
      const worldPosition = state.timePosition + depth;
      const staticAngle = baseAngle + tubeTwist(worldPosition);
      const radius = tunnelRadius(depth);
      return tunnelPoint(radius, staticAngle, depth, state.phase);
    });

    lines.push(points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' '));
  }

  return lines;
}

export function layoutWormholeEntries(entries: Entry[], state: WormholeState, selectedEntryId?: string): WormholeEntryNode[] {
  const baseNodes = entries
    .map((entry) => {
      const worldPosition = yearToPosition(entry.year_start);
      const depth = worldPosition - state.timePosition;
      if (depth < frontFadeDepth || depth > visibleDepth) return null;

      const visibleDepthValue = Math.max(0, depth);
      const closeness = 1 - visibleDepthValue / visibleDepth;
      const sector = styleSectors.find((item) => item.id === entry.style_sector) ?? styleSectors[0];
      const driftSeed = stableHash(entry.id);
      const radius = tunnelRadius(depth) + depthLaneOffset(driftSeed, closeness);
      const angle = angleInSector(entry, sector) + tubeTwist(worldPosition);
      const point = tunnelPoint(radius, angle, depth, state.phase);
      const labelAnchor = point.x > atlasSize.cx ? 'start' as const : 'end' as const;
      const labelX = point.x + (labelAnchor === 'start' ? 22 : -22);
      const labelY = point.y - 10;
      const semanticLevel = semanticLevelForDepth(depth, closeness, entry.id === selectedEntryId);
      const nearStrudelCompression = 1 - Math.max(0, closeness - 0.84) * 0.62;
      const size = Math.min(12.2, (2.25 + Math.pow(closeness, 1.35) * 10.8) * nearStrudelCompression);

      return {
        entry,
        worldPosition,
        x: point.x,
        y: point.y,
        radius,
        angle,
        sector,
        depth,
        closeness,
        semanticLevel,
        opacity: tunnelOpacity(depth),
        size,
        driftX: ((driftSeed % 9) - 4) * 0.42,
        driftY: (((driftSeed >> 4) % 9) - 4) * 0.38,
        driftDelay: -((driftSeed % 240) / 100),
        clusterIndex: 0,
        clusterSize: 1,
        labelX,
        labelY,
        labelAnchor,
        labelLeaderX: point.x + (labelAnchor === 'start' ? 8 : -8),
        labelLeaderY: point.y - 4
      };
    })
    .filter((node): node is WormholeEntryNode => Boolean(node));

  return spreadWormholeClusters(baseNodes, state.phase)
    .sort((a, b) => b.depth - a.depth);
}

export function tunnelRadius(depth: number) {
  const travelDepth = Math.max(0, Math.min(1.18, 1 - depth / visibleDepth));
  const eased = Math.pow(travelDepth, 2.45);
  return Math.round((minTunnelRadius + eased * (maxTunnelRadius - minTunnelRadius)) * 100) / 100;
}

export function radiusToTunnelDepth(radius: number) {
  const eased = Math.max(0, Math.min(1, (radius - minTunnelRadius) / (maxTunnelRadius - minTunnelRadius)));
  return visibleDepth * (1 - Math.pow(eased, 1 / 2.6));
}

export function tunnelCenter(depth: number, phase: number) {
  const worldPosition = phase + depth;
  const clampedDepth = Math.max(0, Math.min(1, depth / visibleDepth));
  const clampedWorldPosition = Math.max(0, Math.min(1, worldPosition / wormholeTravelEnd));
  const bend = Math.sin(clampedDepth * Math.PI);
  const worldBend = Math.sin(clampedWorldPosition * Math.PI);
  const pathSway = Math.sin((clampedWorldPosition * 1.72 + 0.08) * Math.PI * 2) * 38 * worldBend * (0.55 + clampedDepth * 0.45);
  const pathLift = Math.cos((clampedWorldPosition * 1.36 + 0.18) * Math.PI) * 30 * bend;

  return {
    x: roundSvg(atlasSize.cx + pathSway),
    y: roundSvg(atlasSize.cy + bend * 36 + pathLift)
  };
}

export function tunnelPoint(radius: number, angle: number, depth: number, phase: number) {
  const center = tunnelCenter(depth, phase);
  const point = polarToCartesian(center.x, center.y, radius, angle);
  return {
    x: roundSvg(point.x),
    y: roundSvg(point.y)
  };
}

export function yearToPosition(year: number) {
  const clampedYear = Math.max(oldestYear, Math.min(presentYear, year));
  const chronological = [...wormholeAnchors].sort((a, b) => a.year - b.year);
  const nextIndex = chronological.findIndex((anchor) => anchor.year >= clampedYear);

  if (nextIndex <= 0) return wormholeTravelEnd;

  const previous = chronological[nextIndex - 1];
  const next = chronological[nextIndex];
  const localProgress = (clampedYear - previous.year) / (next.year - previous.year);

  return previous.position + (next.position - previous.position) * localProgress;
}

export function positionToYear(position: number) {
  const clampedPosition = clampTravel(position);
  const chronological = [...wormholeAnchors].sort((a, b) => a.position - b.position);
  const nextIndex = chronological.findIndex((anchor) => anchor.position >= clampedPosition);

  if (nextIndex <= 0) return presentYear;

  const previous = chronological[nextIndex - 1];
  const next = chronological[nextIndex];
  const localProgress = (clampedPosition - previous.position) / (next.position - previous.position);

  return Math.round(previous.year + (next.year - previous.year) * localProgress);
}

export function formatYear(year: number) {
  if (year >= 2025) return 'heute';
  if (year < 0) return `${Math.abs(year)} v. Chr.`;
  return `${year}`;
}

function ringDepth(year: number, timePosition: number) {
  return yearToPosition(year) - timePosition;
}

function rollingTimelineMarkers(timePosition: number) {
  const step = 0.025;
  const start = Math.max(0, timePosition + frontFadeDepth + step * 0.5);
  const end = Math.min(wormholeTravelEnd, timePosition + visibleDepth - step * 0.5);
  const first = Math.floor(start / step) * step;
  const years: number[] = [];

  for (let position = first; position <= end + 0.0001; position += step) {
    years.push(roundTimelineYear(positionToYear(position)));
  }

  return years;
}

function roundTimelineYear(year: number) {
  const absYear = Math.abs(year);

  if (year >= 1990) return Math.round(year / 5) * 5;
  if (year >= 1800) return Math.round(year / 25) * 25;
  if (year >= 1000) return Math.round(year / 50) * 50;
  if (year >= 0) return Math.round(year / 100) * 100;
  if (absYear <= 1000) return Math.round(year / 250) * 250;
  if (absYear <= 5000) return Math.round(year / 500) * 500;
  return Math.round(year / 750) * 750;
}

export function tubeTwist(worldPosition: number) {
  return worldPosition * 44 + Math.sin(worldPosition * Math.PI * 3.8) * 11;
}

export function tunnelFrontDepth(state: WormholeState) {
  return state.timePosition > 0.02 ? 0.018 : 0;
}

function semanticLevelForDepth(depth: number, closeness: number, isSelected: boolean): SemanticLevel {
  if (isSelected && depth < 0.09) return 'detail';
  if (closeness > 0.74 && depth > 0.05) return 'image';
  return 'global';
}

export function tunnelOpacity(depth: number) {
  if (depth < 0) {
    return Math.max(0, Math.min(1, (depth - frontFadeDepth) / Math.abs(frontFadeDepth)));
  }

  const fadeInFromBack = smoothstep(0, 0.24, visibleDepth - depth);
  const fadeOutAtFront = smoothstep(0, 0.18, depth);
  const depthHaze = Math.max(0.16, 1 - (depth / visibleDepth) * 0.72);
  return Math.max(0, Math.min(1, fadeInFromBack, fadeOutAtFront) * depthHaze);
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function depthLaneOffset(seed: number, closeness: number) {
  return (((seed >> 7) % 9) - 4) * (1.6 + closeness * 2.8);
}

function spreadWormholeClusters(nodes: WormholeEntryNode[], phase: number) {
  const buckets = new Map<string, WormholeEntryNode[]>();

  nodes.forEach((node) => {
    const key = [
      node.sector.id,
      Math.round(node.worldPosition / 0.042)
    ].join(':');
    const bucket = buckets.get(key) ?? [];
    bucket.push(node);
    buckets.set(key, bucket);
  });

  return [...buckets.values()].flatMap((bucket) => {
    if (bucket.length === 1) return bucket;

    const sortedBucket = [...bucket].sort((a, b) => {
      if (a.entry.year_start !== b.entry.year_start) return a.entry.year_start - b.entry.year_start;
      return a.entry.id.localeCompare(b.entry.id);
    });

    return sortedBucket.map((node, index) => {
      const lane = index - (sortedBucket.length - 1) / 2;
      const radial = radialUnit(node.x, node.y);
      const tangent = { x: -radial.y, y: radial.x };
      const spread = Math.min(42, 7 + sortedBucket.length * 2.7) * (0.36 + node.closeness * 0.72);
      const radialSpread = Math.min(24, 5 + sortedBucket.length * 1.15) * (0.32 + node.closeness * 0.55);
      const radialLane = ((index % 3) - 1) * radialSpread;
      const constrained = constrainToTunnelSkin(
        node.x + tangent.x * lane * spread + radial.x * radialLane,
        node.y + tangent.y * lane * spread + radial.y * radialLane,
        node.depth,
        phase
      );
      const x = clamp(roundSvg(constrained.x), 38, atlasSize.width - 38);
      const y = clamp(roundSvg(constrained.y), 38, atlasSize.height - 38);
      const labelAnchor = x > atlasSize.cx ? 'start' as const : 'end' as const;

      return {
        ...node,
        x,
        y,
        clusterIndex: index,
        clusterSize: sortedBucket.length,
        labelX: x + (labelAnchor === 'start' ? 22 : -22),
        labelY: y - 10 + lane * 2,
        labelAnchor,
        labelLeaderX: x + (labelAnchor === 'start' ? 8 : -8),
        labelLeaderY: y - 4
      };
    });
  });
}

function radialUnit(x: number, y: number) {
  const dx = x - atlasSize.cx;
  const dy = y - atlasSize.cy;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function constrainToTunnelSkin(x: number, y: number, depth: number, phase: number) {
  const center = tunnelCenter(depth, phase);
  const dx = x - center.x;
  const dy = y - center.y;
  const length = Math.hypot(dx, dy) || 1;
  const maxRadius = maxTunnelRadius - 10 + Math.max(0, -depth) * 12;

  if (length <= maxRadius) {
    return { x, y };
  }

  return {
    x: center.x + (dx / length) * maxRadius,
    y: center.y + (dy / length) * maxRadius
  };
}

function stableHash(value: string) {
  return value.split('').reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function clampTravel(value: number) {
  return Math.max(0, Math.min(wormholeTravelEnd, value));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundSvg(value: number) {
  return Math.round(value * 100) / 100;
}
