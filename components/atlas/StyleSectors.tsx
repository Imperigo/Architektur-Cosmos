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
  pre_modern_architecture: 'FRUEHMODERNE',
  modern_architecture: 'MODERNE',
  postwar_modern_architecture: 'NACHKRIEG',
  sustainable_architecture: 'REUSE',
  vernacular_architecture: 'VERNAKULAER'
};

function StyleSectorsComponent({ state, isMoving = false, activeStyleLens = null, onSelectStyleLens }: { state: WormholeState; isMoving?: boolean; activeStyleLens?: StyleSector['id'] | null; onSelectStyleLens?: (styleId: StyleSector['id']) => void }) {
  const innerLabelOpacity = 0.58 + smoothstep(0.18, 0.54, state.timePosition) * 0.28;
  const frontDepth = tunnelFrontDepth(state);
  const labelDepth = frontDepth + 0.1;
  const sectorCenter = tunnelCenter(labelDepth, state.phase);
  const outerRadius = Math.max(wormholeTunnel.minRadius + 116, tunnelRadius(frontDepth + 0.05) - 20);
  const labelRadius = wormholeTunnel.minRadius + 72;

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
                fontSize={7.1}
                fontWeight={610}
                opacity={(innerLabelOpacity + 0.08) * (activeStyleLens && activeStyleLens !== sector.id ? 0.52 : 1)}
                letterAngleStep={4.05}
                strokeWidth={1.15}
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
