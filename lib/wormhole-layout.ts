import { polarToCartesian } from '@/lib/polar-coordinates';
import type { Entry } from '@/lib/types';
import { atlasSize, sectorMidAngle, styleSectors, type AtlasNode, type SemanticLevel, type TimeRing } from '@/lib/atlas-layout';

export type WormholeState = {
  phase: number;
  timePosition: number;
  direction: 'into_past' | 'returning';
  currentYear: number;
};

export type WormholeEntryNode = AtlasNode & {
  depth: number;
  closeness: number;
  semanticLevel: SemanticLevel;
  opacity: number;
  size: number;
  driftX: number;
  driftY: number;
  driftDelay: number;
};

const wormholeYears = [-9500, -3000, -500, 0, 1000, 1400, 1600, 1800, 1900, 1950, 2000, 2025];
const oldestYear = wormholeYears[0];
const presentYear = wormholeYears[wormholeYears.length - 1];
const maxTunnelRadius = 730;
const minTunnelRadius = 68;
const visibleDepth = 0.86;

export const wormholeTunnel = {
  maxRadius: maxTunnelRadius,
  minRadius: minTunnelRadius,
  visibleDepth
};

export function wormholeState(travel: number): WormholeState {
  const phase = positiveModulo(travel, 2);
  const timePosition = phase <= 1 ? phase : 2 - phase;

  return {
    phase,
    timePosition,
    direction: phase <= 1 ? 'into_past' : 'returning',
    currentYear: positionToYear(timePosition)
  };
}

export function wormholeRings(state: WormholeState): TimeRing[] {
  const localStep = Math.abs(state.currentYear) > 2500 ? 500 : state.currentYear < 1800 ? 100 : 25;
  const localYears = [-2, -1, 0, 1, 2].map((offset) => Math.round(state.currentYear + offset * localStep));
  const years = [...new Set([...wormholeYears, ...localYears])]
    .filter((year) => year >= oldestYear && year <= presentYear)
    .sort((a, b) => yearToPosition(a) - yearToPosition(b));

  return years.map((year) => {
    const depth = ringDepth(year, state.timePosition);
    const isCurrent = Math.abs(yearToPosition(year) - state.timePosition) < 0.018;
    const isAnchor = wormholeYears.includes(year);

    return {
      year,
      label: formatYear(year),
      radius: tunnelRadius(depth),
      weight: isCurrent || isAnchor ? 'major' as const : 'minor' as const,
      mode: isCurrent ? 'local' as const : isAnchor ? 'global' as const : 'medium' as const
    };
  });
}

export function wormholeGridLines(state: WormholeState) {
  const lines: string[] = [];
  const samples = Array.from({ length: 44 }, (_, index) => index / 43);

  for (let spoke = 0; spoke < 36; spoke += 1) {
    const baseAngle = spoke * 10;
    const points = samples.map((depth) => {
      const radius = tunnelRadius(depth);
      return tunnelPoint(radius, baseAngle, depth, state.phase);
    });

    lines.push(points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' '));
  }

  return lines;
}

export function layoutWormholeEntries(entries: Entry[], state: WormholeState, selectedEntryId?: string): WormholeEntryNode[] {
  return entries
    .map((entry) => {
      const depth = ringDepth(entry.year_start, state.timePosition);
      if (depth > visibleDepth) return null;

      const closeness = 1 - depth / visibleDepth;
      const sector = styleSectors.find((item) => item.id === entry.style_sector) ?? styleSectors[0];
      const radius = tunnelRadius(depth);
      const angle = sectorMidAngle(sector) + entryAngleOffset(entry.id);
      const point = tunnelPoint(radius, angle, depth, state.phase);
      const labelAnchor = point.x > atlasSize.cx ? 'start' as const : 'end' as const;
      const labelX = point.x + (labelAnchor === 'start' ? 22 : -22);
      const labelY = point.y - 10;
      const semanticLevel = semanticLevelForDepth(depth, closeness, entry.id === selectedEntryId);
      const size = 4 + closeness * 18;
      const driftSeed = stableHash(entry.id);

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
        driftX: ((driftSeed % 9) - 4) * 0.32,
        driftY: (((driftSeed >> 4) % 9) - 4) * 0.28,
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
  const eased = Math.pow(Math.max(0, 1 - depth), 2.28);
  return Math.round((minTunnelRadius + eased * (maxTunnelRadius - minTunnelRadius)) * 100) / 100;
}

export function radiusToTunnelDepth(radius: number) {
  const eased = Math.max(0, Math.min(1, (radius - minTunnelRadius) / (maxTunnelRadius - minTunnelRadius)));
  return 1 - Math.pow(eased, 1 / 2.28);
}

export function tunnelCenter(depth: number, phase: number) {
  const bend = Math.sin(Math.max(0, Math.min(1, depth)) * Math.PI);
  const breathing = Math.sin(phase * Math.PI * 2) * 6;

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
  const chronological = [...wormholeYears].sort((a, b) => a - b);
  const nextIndex = chronological.findIndex((anchor) => anchor >= clampedYear);

  if (nextIndex <= 0) return 1;

  const previous = chronological[nextIndex - 1];
  const next = chronological[nextIndex];
  const localProgress = (clampedYear - previous) / (next - previous);
  const ancientToPresent = (nextIndex - 1 + localProgress) / (chronological.length - 1);

  return 1 - ancientToPresent;
}

export function positionToYear(position: number) {
  const target = 1 - position;
  const chronological = [...wormholeYears].sort((a, b) => a - b);
  const scaled = target * (chronological.length - 1);
  const index = Math.min(chronological.length - 2, Math.max(0, Math.floor(scaled)));
  const local = scaled - index;

  return Math.round(chronological[index] + (chronological[index + 1] - chronological[index]) * local);
}

export function formatYear(year: number) {
  if (year >= 2025) return 'heute';
  if (year < 0) return `${Math.abs(year)} v. Chr.`;
  return `${year}`;
}

function ringDepth(year: number, timePosition: number) {
  const delta = yearToPosition(year) - timePosition;
  return delta < 0 ? delta + 1 : delta;
}

function semanticLevelForDepth(depth: number, closeness: number, isSelected: boolean): SemanticLevel {
  if (isSelected && depth < 0.09) return 'detail';
  if (closeness > 0.74 && depth > 0.05) return 'image';
  return 'global';
}

export function tunnelOpacity(depth: number) {
  const fadeInFromBack = Math.min(1, Math.max(0, (visibleDepth - depth) / 0.12));
  const fadeOutAtFront = Math.min(1, Math.max(0, depth / 0.055));
  return Math.max(0, Math.min(1, fadeInFromBack, fadeOutAtFront));
}

function entryAngleOffset(id: string) {
  return ((stableHash(id) % 100) / 100 - 0.5) * 22;
}

function stableHash(value: string) {
  return value.split('').reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
