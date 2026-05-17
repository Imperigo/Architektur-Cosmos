import { polarToCartesian } from '@/lib/polar-coordinates';
import type { Entry } from '@/lib/types';
import { atlasSize, sectorMidAngle, styleSectors, type AtlasNode, type SemanticLevel, type TimeRing } from '@/lib/atlas-layout';

export type WormholeState = {
  phase: number;
  timePosition: number;
  edgeTension: number;
  direction: 'into_past' | 'returning';
  currentYear: number;
};

export type WormholeEntryNode = AtlasNode & {
  depth: number;
  closeness: number;
  semanticLevel: SemanticLevel;
  opacity: number;
  size: number;
  stretchX: number;
  stretchY: number;
  driftX: number;
  driftY: number;
  driftDelay: number;
};

const wormholeAnchors = [
  { year: 2025, position: 0 },
  { year: 2000, position: 0.055 },
  { year: 1950, position: 0.13 },
  { year: 1900, position: 0.215 },
  { year: 1800, position: 0.31 },
  { year: 1600, position: 0.405 },
  { year: 1400, position: 0.49 },
  { year: 1000, position: 0.59 },
  { year: 0, position: 0.705 },
  { year: -500, position: 0.765 },
  { year: -3000, position: 0.875 },
  { year: -9500, position: 1 }
];
const wormholeYears = wormholeAnchors.map((anchor) => anchor.year);
const oldestYear = -9500;
const presentYear = 2025;
const staticTimelineMarkers = [
  -9500, -7000, -5000, -3000, -2000, -1000, -500, 0, 500, 750, 1000, 1200,
  1400, 1500, 1600, 1700, 1750, 1800, 1850, 1875, 1900, 1925, 1940, 1950,
  1960, 1975, 1990, 2000, 2010, 2020, 2025
];
const maxTunnelRadius = 430;
const minTunnelRadius = 42;
const visibleDepth = 1;
const frontFadeDepth = -0.09;

export const wormholeTunnel = {
  maxRadius: maxTunnelRadius,
  minRadius: minTunnelRadius,
  visibleDepth
};

export function wormholeState(travel: number): WormholeState {
  const timePosition = clamp01(travel);
  const edgeTension = travel < 0 ? travel : travel > 1 ? travel - 1 : 0;

  return {
    phase: timePosition,
    timePosition,
    edgeTension,
    direction: 'into_past',
    currentYear: positionToYear(timePosition)
  };
}

export function wormholeRings(state: WormholeState): TimeRing[] {
  const years = [...new Set(staticTimelineMarkers)]
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

export function wormholeGridLines(state: WormholeState) {
  const lines: string[] = [];
  const samples = Array.from({ length: 48 }, (_, index) => index / 47 * visibleDepth);

  for (let spoke = 0; spoke < 48; spoke += 1) {
    const baseAngle = spoke * 7.5;
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
  return entries
    .map((entry) => {
      const depth = ringDepth(entry.year_start, state.timePosition);
      if (depth < frontFadeDepth || depth > visibleDepth) return null;

      const visibleDepthValue = Math.max(0, depth);
      const closeness = 1 - visibleDepthValue / visibleDepth;
      const sector = styleSectors.find((item) => item.id === entry.style_sector) ?? styleSectors[0];
      const driftSeed = stableHash(entry.id);
      const radius = tunnelRadius(depth) + depthLaneOffset(driftSeed, closeness);
      const angle = sectorMidAngle(sector) + entryAngleOffset(entry.id) + tubeTwist(yearToPosition(entry.year_start));
      const point = tunnelPoint(radius, angle, depth, state.phase);
      const labelAnchor = point.x > atlasSize.cx ? 'start' as const : 'end' as const;
      const labelX = point.x + (labelAnchor === 'start' ? 22 : -22);
      const labelY = point.y - 10;
      const semanticLevel = semanticLevelForDepth(depth, closeness, entry.id === selectedEntryId);
      const frontExpansion = 1 + Math.max(0, -depth) * 2.6;
      const size = (2.2 + Math.pow(closeness, 1.45) * 12.8) * frontExpansion;

      return {
        entry,
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
        stretchX: 0.66 + Math.pow(closeness, 1.15) * 1.08 + Math.max(0, -depth) * 1.4,
        stretchY: 1.2 - Math.pow(closeness, 1.08) * 0.45,
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
    .filter((node): node is WormholeEntryNode => Boolean(node))
    .sort((a, b) => b.depth - a.depth);
}

export function tunnelRadius(depth: number) {
  const travelDepth = Math.max(0, Math.min(1.16, 1 - depth));
  const eased = Math.pow(travelDepth, 2.45);
  return Math.round((minTunnelRadius + eased * (maxTunnelRadius - minTunnelRadius)) * 100) / 100;
}

export function radiusToTunnelDepth(radius: number) {
  const eased = Math.max(0, Math.min(1, (radius - minTunnelRadius) / (maxTunnelRadius - minTunnelRadius)));
  return 1 - Math.pow(eased, 1 / 2.6);
}

export function tunnelCenter(depth: number, phase: number) {
  const clampedDepth = Math.max(0, Math.min(1, depth));
  const bend = Math.sin(clampedDepth * Math.PI);
  const breathing = Math.sin(phase * Math.PI) * 8;

  return {
    x: atlasSize.cx + bend * breathing * 0.35,
    y: atlasSize.cy + bend * (26 + breathing)
  };
}

export function tunnelPoint(radius: number, angle: number, depth: number, phase: number) {
  const center = tunnelCenter(depth, phase);
  return polarToCartesian(center.x, center.y, radius, angle);
}

export function yearToPosition(year: number) {
  const clampedYear = Math.max(oldestYear, Math.min(presentYear, year));
  const chronological = [...wormholeAnchors].sort((a, b) => a.year - b.year);
  const nextIndex = chronological.findIndex((anchor) => anchor.year >= clampedYear);

  if (nextIndex <= 0) return 1;

  const previous = chronological[nextIndex - 1];
  const next = chronological[nextIndex];
  const localProgress = (clampedYear - previous.year) / (next.year - previous.year);

  return previous.position + (next.position - previous.position) * localProgress;
}

export function positionToYear(position: number) {
  const clampedPosition = clamp01(position);
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

export function tubeTwist(worldPosition: number) {
  return worldPosition * 34 + Math.sin(worldPosition * Math.PI * 3.2) * 8;
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

  const fadeInFromBack = Math.min(1, Math.max(0, (visibleDepth - depth) / 0.12));
  const fadeOutAtFront = Math.min(1, Math.max(0, depth / 0.075));
  const depthHaze = Math.max(0.22, 1 - depth * 0.62);
  return Math.max(0, Math.min(1, fadeInFromBack, fadeOutAtFront) * depthHaze);
}

function entryAngleOffset(id: string) {
  return ((stableHash(id) % 100) / 100 - 0.5) * 50;
}

function depthLaneOffset(seed: number, closeness: number) {
  return (((seed >> 7) % 9) - 4) * (1.6 + closeness * 2.8);
}

function stableHash(value: string) {
  return value.split('').reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
