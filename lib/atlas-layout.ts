import type { Entry, StyleSectorId } from '@/lib/types';
import { polarToCartesian } from '@/lib/polar-coordinates';

export const atlasSize = {
  width: 1280,
  height: 960,
  cx: 640,
  cy: 480,
  innerRadius: 78,
  outerRadius: 410,
  labelRadius: 458
};

export type TimeRing = {
  year: number;
  label: string;
  radius: number;
  weight: 'major' | 'minor';
  mode?: 'global' | 'medium' | 'local';
};

export type StyleSector = {
  id: StyleSectorId;
  label: string;
  startAngle: number;
  endAngle: number;
};

export type AtlasNode = ReturnType<typeof entryPosition> & {
  entry: Entry;
  clusterIndex: number;
  clusterSize: number;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'end';
  labelLeaderX: number;
  labelLeaderY: number;
};

export type SemanticLevel = 'global' | 'image' | 'preview' | 'detail';

const timeAnchors = [
  { year: -9000, label: '9000 v. Chr.', weight: 'major' as const },
  { year: -3000, label: '3000 v. Chr.', weight: 'minor' as const },
  { year: -500, label: '500 v. Chr.', weight: 'major' as const },
  { year: 0, label: '0', weight: 'minor' as const },
  { year: 1000, label: '1000', weight: 'major' as const },
  { year: 1400, label: '1400', weight: 'minor' as const },
  { year: 1600, label: '1600', weight: 'major' as const },
  { year: 1800, label: '1800', weight: 'major' as const },
  { year: 1900, label: '1900', weight: 'major' as const },
  { year: 1950, label: '1950', weight: 'major' as const },
  { year: 2000, label: '2000', weight: 'minor' as const },
  { year: 2025, label: 'heute', weight: 'major' as const }
];

export const styleSectors: StyleSector[] = [
  { id: 'classical_architecture', label: 'Klassik / Antike', startAngle: 300, endAngle: 360 },
  { id: 'pre_modern_architecture', label: 'Vor- und Frühmoderne', startAngle: 0, endAngle: 62 },
  { id: 'modern_architecture', label: 'Moderne', startAngle: 62, endAngle: 126 },
  { id: 'postwar_modern_architecture', label: 'Nachkriegsmoderne', startAngle: 126, endAngle: 188 },
  { id: 'sustainable_architecture', label: 'Nachhaltigkeit / Reuse', startAngle: 188, endAngle: 246 },
  { id: 'vernacular_architecture', label: 'Vernakulär', startAngle: 246, endAngle: 300 }
];

const yearMin = timeAnchors[0].year;
const yearMax = timeAnchors[timeAnchors.length - 1].year;

export const timeRings: TimeRing[] = timeAnchors.map((anchor) => ({
  ...anchor,
  radius: yearToRadius(anchor.year),
  mode: 'medium' as const
}));

export function zoomTimeRings(scale: number, focusYear?: number): TimeRing[] {
  if (scale < 1.15) {
    return [-9000, -500, 1000, 1800, 1950, 2025].map((year) => ringForYear(year, 'global'));
  }

  if (scale < 2.4 || focusYear === undefined) {
    return timeRings;
  }

  const localStep = Math.abs(focusYear) > 2000 ? 500 : focusYear < 1800 ? 100 : 25;
  const localYears = [-2, -1, 0, 1, 2].map((step) => focusYear + step * localStep);
  const allYears = [...new Set([...timeAnchors.map((anchor) => anchor.year), ...localYears])];

  return allYears
    .filter((year) => year >= yearMin && year <= yearMax)
    .sort((a, b) => a - b)
    .map((year) => {
      const isFocus = year === focusYear;
      const isAnchor = timeAnchors.some((anchor) => anchor.year === year);
      return {
        year,
        label: formatYear(year),
        radius: yearToRadius(year),
        weight: isFocus || isAnchor ? 'major' as const : 'minor' as const,
        mode: isAnchor ? 'medium' as const : 'local' as const
      };
    });
}

export function yearToRadius(year: number) {
  const clampedYear = Math.min(Math.max(year, yearMin), yearMax);
  const step = (atlasSize.outerRadius - atlasSize.innerRadius) / (timeAnchors.length - 1);
  const nextIndex = timeAnchors.findIndex((anchor) => anchor.year >= clampedYear);

  if (nextIndex <= 0) return atlasSize.innerRadius;

  const previous = timeAnchors[nextIndex - 1];
  const next = timeAnchors[nextIndex];
  const localProgress = (clampedYear - previous.year) / (next.year - previous.year);

  return atlasSize.innerRadius + (nextIndex - 1 + localProgress) * step;
}

export function sectorMidAngle(sector: StyleSector) {
  if (sector.startAngle > sector.endAngle) {
    return ((sector.startAngle + sector.endAngle + 360) / 2) % 360;
  }

  return (sector.startAngle + sector.endAngle) / 2;
}

export function angleInSector(entry: Entry, sector: StyleSector) {
  const span = sector.startAngle > sector.endAngle
    ? sector.endAngle + 360 - sector.startAngle
    : sector.endAngle - sector.startAngle;
  const hash = stableHash(entry.id);
  const offset = ((hash % 100) / 100 - 0.5) * Math.min(span * 0.52, 30);
  const angle = sectorMidAngle(sector) + offset;
  return (angle + 360) % 360;
}

export function entryPosition(entry: Entry) {
  const sector = styleSectors.find((item) => item.id === entry.style_sector) ?? styleSectors[0];
  const radius = yearToRadius(entry.year_start);
  const angle = angleInSector(entry, sector);
  return {
    ...polarToCartesian(atlasSize.cx, atlasSize.cy, radius, angle),
    radius,
    angle,
    sector
  };
}

export function layoutEntries(entries: Entry[]): AtlasNode[] {
  const baseNodes = entries.map((entry) => ({ entry, ...entryPosition(entry) }));
  const buckets = new Map<string, typeof baseNodes>();

  baseNodes.forEach((node) => {
    const key = [
      node.sector.id,
      Math.round(node.radius / 26),
      Math.round(node.angle / 12)
    ].join(':');
    const bucket = buckets.get(key) ?? [];
    bucket.push(node);
    buckets.set(key, bucket);
  });

  const nodes: AtlasNode[] = [];

  buckets.forEach((bucket) => {
    const sortedBucket = [...bucket].sort((a, b) => {
      if (a.entry.year_start !== b.entry.year_start) return a.entry.year_start - b.entry.year_start;
      return a.entry.id.localeCompare(b.entry.id);
    });

    sortedBucket.forEach((node, index) => {
      const clusterSize = sortedBucket.length;
      const lane = index - (clusterSize - 1) / 2;
      const radial = radialUnit(node.x, node.y);
      const tangent = { x: -radial.y, y: radial.x };
      const spread = clusterSize > 1 ? Math.min(18, 10 + clusterSize * 1.4) : 0;
      const radialOffset = clusterSize > 1 ? (index % 2 === 0 ? -5 : 5) : 0;
      const x = roundLayout(node.x + tangent.x * lane * spread + radial.x * radialOffset);
      const y = roundLayout(node.y + tangent.y * lane * spread + radial.y * radialOffset);
      const label = labelPosition(x, y, node.angle, index, clusterSize);

      nodes.push({
        ...node,
        x,
        y,
        clusterIndex: index,
        clusterSize,
        ...label
      });
    });
  });

  return resolveLabelCollisions(nodes);
}

export function sectorBoundaryPoint(angle: number, radius = atlasSize.outerRadius + 18) {
  return polarToCartesian(atlasSize.cx, atlasSize.cy, radius, angle);
}

function stableHash(value: string) {
  return value.split('').reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function radialUnit(x: number, y: number) {
  const dx = x - atlasSize.cx;
  const dy = y - atlasSize.cy;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function labelPosition(x: number, y: number, angle: number, index: number, clusterSize: number) {
  const isLeft = angle > 180 && angle < 360;
  const labelAnchor = isLeft ? 'end' as const : 'start' as const;
  const labelX = roundLayout(x + (isLeft ? -30 : 30));
  const labelY = roundLayout(y - 12 + (index - (clusterSize - 1) / 2) * 15);
  const labelLeaderX = roundLayout(x + (isLeft ? -8 : 8));
  const labelLeaderY = roundLayout(y - 5);

  return { labelX, labelY, labelAnchor, labelLeaderX, labelLeaderY };
}

function resolveLabelCollisions(nodes: AtlasNode[]) {
  const minGap = 14;
  const lanes = new Map<string, AtlasNode[]>();

  nodes.forEach((node) => {
    const laneKey = `${node.labelAnchor}:${node.sector.id}`;
    const lane = lanes.get(laneKey) ?? [];
    lane.push(node);
    lanes.set(laneKey, lane);
  });

  lanes.forEach((lane) => {
    lane.sort((a, b) => a.labelY - b.labelY);

    for (let index = 1; index < lane.length; index += 1) {
      const previous = lane[index - 1];
      const current = lane[index];
      if (current.labelY - previous.labelY < minGap) {
        current.labelY = roundLayout(previous.labelY + minGap);
      }
    }
  });

  return nodes;
}

function roundLayout(value: number) {
  return Math.round(value * 100) / 100;
}

function ringForYear(year: number, mode: TimeRing['mode']): TimeRing {
  const anchor = timeAnchors.find((item) => item.year === year);
  return {
    year,
    label: anchor?.label ?? formatYear(year),
    radius: yearToRadius(year),
    weight: 'major',
    mode
  };
}

function formatYear(year: number) {
  if (year === 2025) return 'heute';
  if (year < 0) return `${Math.abs(year)} v. Chr.`;
  return `${year}`;
}
