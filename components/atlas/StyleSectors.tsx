import { memo } from 'react';
import { sectorMidAngle, styleSectorColors, styleSectors, type StyleSector } from '@/lib/atlas-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';
import { tubeTwist, tunnelCenter, tunnelFrontDepth, tunnelRadius, wormholeTunnel, type WormholeState } from '@/lib/wormhole-layout';
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
  const labelTwist = tubeTwist(state.timePosition + labelDepth);
  const sectorCenter = tunnelCenter(labelDepth, state.phase);
  const outerRadius = Math.max(wormholeTunnel.minRadius + 154, tunnelRadius(frontDepth + 0.035) + 2);
  const labelRadius = Math.max(wormholeTunnel.minRadius + 150, outerRadius - 4);
  const depthBandOffsets = isMoving ? [0.08, 0.34, 0.68] : [0.08, 0.24, 0.43, 0.66, 0.92];

  return (
    <g aria-label="Stilsektoren">
      {styleSectors.map((sector) => {
        const labelAngle = sectorMidAngle(sector) + labelTwist;
        const startAngle = sector.startAngle + labelTwist;
        const startInner = polarToCartesian(sectorCenter.x, sectorCenter.y, wormholeTunnel.minRadius + 54, startAngle);
        const startOuter = polarToCartesian(sectorCenter.x, sectorCenter.y, outerRadius, startAngle);
        const labelText = sectorLabel[sector.id];
        const accent = styleSectorColors[sector.id];
        const accentBoost = sector.id === 'pre_modern_architecture' ? 1.45 : 1;
        const lensBoost = activeStyleLens === sector.id ? 1.8 : activeStyleLens ? 0.36 : 1;
        const depthBands = depthBandOffsets
          .map((offset, depthIndex) => {
            const depth = frontDepth + offset;
            if (depth <= 0 || depth >= wormholeTunnel.visibleDepth) return null;

            const depthCenter = tunnelCenter(depth, state.phase);
            const depthRadius = tunnelRadius(depth);
            const twist = tubeTwist(state.timePosition + depth);
            const depthStartAngle = sector.startAngle + twist;
            const depthEndAngle = sector.endAngle + twist;
            const thickness = Math.max(14, depthRadius * (0.035 + depthIndex * 0.004));

            return {
              path: sectorRibbonPath(depthStartAngle, depthEndAngle, Math.max(wormholeTunnel.minRadius + 12, depthRadius - thickness), depthRadius + thickness, depthCenter.x, depthCenter.y),
              opacity: (isMoving ? 0.012 : 0.04) * accentBoost * lensBoost * (1 - depthIndex * 0.1)
            };
          })
          .filter((band): band is { path: string; opacity: number } => Boolean(band));

        return (
          <g key={sector.id} className="style-sector" pointerEvents="auto">
            {depthBands.map((band, depthIndex) => (
              <path
                key={`${sector.id}-depth-${depthIndex}`}
                className="style-sector-ribbon style-sector-depth-band"
                d={band.path}
                fill={accent}
                opacity={band.opacity}
                pointerEvents="none"
              />
            ))}
            <path
              className="style-sector-tick"
              d={`M ${startInner.x} ${startInner.y} L ${startOuter.x} ${startOuter.y}`}
              stroke={accent}
              strokeWidth="0.72"
              strokeDasharray="1 14"
              opacity={(isMoving ? 0.16 : 0.25) * lensBoost}
              pointerEvents="none"
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
                fontSize={14.2}
                fontWeight={500}
                fontStyle="italic"
                opacity={outerLabelOpacity * (activeStyleLens && activeStyleLens !== sector.id ? 0.52 : 1)}
                letterAngleStep={3.08}
                strokeWidth={0.1}
                inward
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
