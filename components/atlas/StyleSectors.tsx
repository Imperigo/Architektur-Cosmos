import { atlasSize, sectorMidAngle, styleSectors, type StyleSector } from '@/lib/atlas-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';
import { wormholeTunnel, type WormholeState } from '@/lib/wormhole-layout';
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

  return (
    <g aria-label="Stilsektoren">
      {styleSectors.map((sector) => {
        const startInner = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.minRadius + 42, sector.startAngle);
        const startOuter = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.maxRadius - 36 + state.timePosition * 62, sector.startAngle);
        const labelAngle = sectorMidAngle(sector);
        const labelText = sectorLabel[sector.id];
        const accent = sectorColor[sector.id];
        const ribbonPath = sectorRibbonPath(sector.startAngle, sector.endAngle, wormholeTunnel.minRadius + 46, wormholeTunnel.maxRadius - 56 + state.timePosition * 46);

        return (
          <g key={sector.id} className="style-sector">
            <path
              className="style-sector-ribbon"
              d={ribbonPath}
              fill={accent}
              opacity={isMoving ? 0.035 : 0.06}
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
