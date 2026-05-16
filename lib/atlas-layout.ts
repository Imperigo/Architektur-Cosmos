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
};

export type StyleSector = {
  id: StyleSectorId;
  label: string;
  startAngle: number;
  endAngle: number;
};

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
  radius: yearToRadius(anchor.year)
}));

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

export function sectorBoundaryPoint(angle: number, radius = atlasSize.outerRadius + 18) {
  return polarToCartesian(atlasSize.cx, atlasSize.cy, radius, angle);
}

function stableHash(value: string) {
  return value.split('').reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}
