import { atlasSize, sectorMidAngle, styleSectors, type StyleSector } from '@/lib/atlas-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';
import { tunnelFrontDepth, tunnelRadius, wormholeTunnel, type WormholeState } from '@/lib/wormhole-layout';
import { RadialLetterText } from '@/components/atlas/RadialText';

const sectorGlyph: Record<StyleSector['id'], string> = {
  classical_architecture: 'I',
  pre_modern_architecture: 'II',
  modern_architecture: 'III',
  postwar_modern_architecture: 'IV',
  sustainable_architecture: 'V',
  vernacular_architecture: 'VI'
};

const sectorColor: Record<StyleSector['id'], string> = {
  classical_architecture: '#9b6dff',
  pre_modern_architecture: '#ffb000',
  modern_architecture: '#00e7ff',
  postwar_modern_architecture: '#ff4d1f',
  sustainable_architecture: '#65ff9a',
  vernacular_architecture: '#ff007a'
};

const sectorLabel: Record<StyleSector['id'], string> = {
  classical_architecture: 'ANTIKE',
  pre_modern_architecture: 'FRUEHMODERNE',
  modern_architecture: 'MODERNE',
  postwar_modern_architecture: 'NACHKRIEG',
  sustainable_architecture: 'REUSE',
  vernacular_architecture: 'VERNAKULAER'
};

export function StyleSectors({ state, isMoving = false }: { state: WormholeState; isMoving?: boolean }) {
  const innerLabelOpacity = 0.58 + smoothstep(0.18, 0.54, state.timePosition) * 0.28;
  const boundaryOpacity = 0.38 + innerLabelOpacity * 0.24;
  const frontDepth = tunnelFrontDepth(state);
  const outerRadius = Math.max(wormholeTunnel.minRadius + 116, tunnelRadius(frontDepth + 0.05) - 20);

  return (
    <g aria-label="Stilsektoren">
      {styleSectors.map((sector) => {
        const labelAngle = sectorMidAngle(sector);
        const startInner = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.minRadius + 54, sector.startAngle);
        const startOuter = polarToCartesian(atlasSize.cx, atlasSize.cy, outerRadius, sector.startAngle);
        const midInner = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.minRadius + 86, labelAngle);
        const midOuter = polarToCartesian(atlasSize.cx, atlasSize.cy, outerRadius - 18, labelAngle);
        const labelText = sectorLabel[sector.id];
        const accent = sectorColor[sector.id];
        const ribbonPath = sectorRibbonPath(sector.startAngle, sector.endAngle, wormholeTunnel.minRadius + 58, outerRadius - 12);
        const accentBoost = sector.id === 'pre_modern_architecture' ? 1.45 : 1;

        return (
          <g key={sector.id} className="style-sector">
            <path
              className="style-sector-ribbon"
              d={ribbonPath}
              fill={accent}
              opacity={(isMoving ? 0.026 : 0.052) * accentBoost}
            />
            <line
              className="style-sector-spine"
              x1={midInner.x}
              y1={midInner.y}
              x2={midOuter.x}
              y2={midOuter.y}
              stroke={accent}
              strokeWidth={sector.id === 'pre_modern_architecture' ? 1.35 : 1}
              opacity={(isMoving ? 0.22 : 0.34) * accentBoost}
            />
            <line
              x1={startInner.x}
              y1={startInner.y}
              x2={startOuter.x}
              y2={startOuter.y}
              stroke={accent}
              strokeWidth="1.55"
              opacity={isMoving ? boundaryOpacity * 0.76 : boundaryOpacity}
              filter={isMoving ? undefined : 'url(#wormhole-energy-glow)'}
            />
            <RadialLetterText
              className="style-sector-label style-sector-label-inner"
              text={`${sectorGlyph[sector.id]} ${labelText}`}
              cx={atlasSize.cx}
              cy={atlasSize.cy}
              radius={wormholeTunnel.minRadius + 58}
              angle={labelAngle}
              fill={accent}
              fontSize={7.6}
              fontWeight={700}
              opacity={innerLabelOpacity}
              letterAngleStep={2.72}
              strokeWidth={2.6}
            />
          </g>
        );
      })}
    </g>
  );
}

function sectorRibbonPath(startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) {
  const normalizedEnd = endAngle < startAngle ? endAngle + 360 : endAngle;
  const span = normalizedEnd - startAngle;
  const largeArc = span > 180 ? 1 : 0;
  const outerStart = polarToCartesian(atlasSize.cx, atlasSize.cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(atlasSize.cx, atlasSize.cy, outerRadius, normalizedEnd);
  const innerEnd = polarToCartesian(atlasSize.cx, atlasSize.cy, innerRadius, normalizedEnd);
  const innerStart = polarToCartesian(atlasSize.cx, atlasSize.cy, innerRadius, startAngle);

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
