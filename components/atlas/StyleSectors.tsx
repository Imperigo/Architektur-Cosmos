import { memo } from 'react';
import { sectorMidAngle, styleSectorColors, styleSectors, type StyleSector } from '@/lib/atlas-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';
import { tunnelCenter, tunnelFrontDepth, tunnelRadius, wormholeTunnel, type WormholeState } from '@/lib/wormhole-layout';
import { RadialLetterText } from '@/components/atlas/RadialText';

const sectorGlyph: Record<StyleSector['id'], string> = {
  classical_architecture: 'I',
  pre_modern_architecture: 'II',
  modern_architecture: 'III',
  postwar_modern_architecture: 'IV',
  sustainable_architecture: 'V',
  vernacular_architecture: 'VI'
};

const sectorLabel: Record<StyleSector['id'], string> = {
  classical_architecture: 'ANTIKE',
  pre_modern_architecture: 'FRÜHMODERNE',
  modern_architecture: 'MODERNE',
  postwar_modern_architecture: 'NACHKRIEG',
  sustainable_architecture: 'REUSE',
  vernacular_architecture: 'VERNAKULÄR'
};

function StyleSectorsComponent({ state, isMoving = false, activeStyleLens = null, onSelectStyleLens }: { state: WormholeState; isMoving?: boolean; activeStyleLens?: StyleSector['id'] | null; onSelectStyleLens?: (styleId: StyleSector['id']) => void }) {
  const outerLabelOpacity = 0.64 + smoothstep(0.08, 0.42, state.timePosition) * 0.2;
  const frontDepth = tunnelFrontDepth(state);
  const labelDepth = frontDepth + 0.045;
  const sectorCenter = tunnelCenter(labelDepth, state.phase);
  const outerRadius = Math.max(wormholeTunnel.minRadius + 136, tunnelRadius(frontDepth + 0.035) - 14);
  const labelRadius = Math.max(wormholeTunnel.minRadius + 128, outerRadius - 18);

  return (
    <g aria-label="Stilsektoren">
      {styleSectors.map((sector) => {
        const labelAngle = sectorMidAngle(sector);
        const startInner = polarToCartesian(sectorCenter.x, sectorCenter.y, wormholeTunnel.minRadius + 54, sector.startAngle);
        const startOuter = polarToCartesian(sectorCenter.x, sectorCenter.y, outerRadius, sector.startAngle);
        const labelText = sectorLabel[sector.id];
        const accent = styleSectorColors[sector.id];
        const ribbonPath = sectorRibbonPath(sector.startAngle, sector.endAngle, wormholeTunnel.minRadius + 58, outerRadius - 12, sectorCenter.x, sectorCenter.y);
        const accentBoost = sector.id === 'pre_modern_architecture' ? 1.45 : 1;
        const lensBoost = activeStyleLens === sector.id ? 1.8 : activeStyleLens ? 0.36 : 1;

        return (
          <g key={sector.id} className="style-sector" pointerEvents="none">
            <path
              className="style-sector-ribbon"
              d={ribbonPath}
              fill={accent}
              opacity={(isMoving ? 0.018 : 0.04) * accentBoost * lensBoost}
            />
            <path
              className="style-sector-tick"
              d={`M ${startInner.x} ${startInner.y} L ${startOuter.x} ${startOuter.y}`}
              stroke={accent}
              strokeWidth="0.72"
              strokeDasharray="1 14"
              opacity={(isMoving ? 0.16 : 0.25) * lensBoost}
            />
            <g pointerEvents="auto">
              <RadialLetterText
                className="style-sector-label style-sector-label-inner"
                text={`${sectorGlyph[sector.id]} ${labelText}`}
                cx={sectorCenter.x}
                cy={sectorCenter.y}
                radius={labelRadius}
                angle={labelAngle}
                fill={accent}
                fontSize={8.35}
                fontWeight={460}
                fontStyle="italic"
                opacity={outerLabelOpacity * (activeStyleLens && activeStyleLens !== sector.id ? 0.52 : 1)}
                letterAngleStep={4.85}
                strokeWidth={0.82}
                inward={false}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectStyleLens?.(sector.id);
                }}
              />
            </g>
          </g>
        );
      })}
    </g>
  );
}

export const StyleSectors = memo(StyleSectorsComponent);

function sectorRibbonPath(startAngle: number, endAngle: number, innerRadius: number, outerRadius: number, cx: number, cy: number) {
  const normalizedEnd = endAngle < startAngle ? endAngle + 360 : endAngle;
  const span = normalizedEnd - startAngle;
  const largeArc = span > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, normalizedEnd);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, normalizedEnd);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z'
  ].join(' ');
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}
