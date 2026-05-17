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
  classical_architecture: '#d9c7ff',
  pre_modern_architecture: '#ffd4a8',
  modern_architecture: '#aee7ff',
  postwar_modern_architecture: '#f0f0f0',
  sustainable_architecture: '#b9f8cf',
  vernacular_architecture: '#ffc1d6'
};

const sectorLabel: Record<StyleSector['id'], string> = {
  classical_architecture: 'ANTIKE',
  pre_modern_architecture: 'FRUEHMODERNE',
  modern_architecture: 'MODERNE',
  postwar_modern_architecture: 'NACHKRIEG',
  sustainable_architecture: 'REUSE',
  vernacular_architecture: 'VERNAKULAER'
};

export function StyleSectors({ state }: { state: WormholeState }) {
  const outerLabelOpacity = Math.max(0, 1 - state.timePosition / 0.18);
  const innerLabelOpacity = smoothstep(0.1, 0.34, state.timePosition);
  const boundaryOpacity = 0.1 + innerLabelOpacity * 0.14;

  return (
    <g aria-label="Stilsektoren">
      {styleSectors.map((sector) => {
        const startInner = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.minRadius + 34, sector.startAngle);
        const startOuter = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.maxRadius - 14 + state.timePosition * 82, sector.startAngle);
        const labelAngle = sectorMidAngle(sector);
        const labelText = sectorLabel[sector.id];
        const accent = sectorColor[sector.id];

        return (
          <g key={sector.id} className="style-sector">
            <line
              x1={startInner.x}
              y1={startInner.y}
              x2={startOuter.x}
              y2={startOuter.y}
              stroke={accent}
              strokeWidth="0.65"
              strokeDasharray="1 12"
              opacity={boundaryOpacity}
            />
            <RadialLetterText
              className="style-sector-label style-sector-label-outer"
              text={labelText}
              cx={atlasSize.cx}
              cy={atlasSize.cy}
              radius={wormholeTunnel.maxRadius + 22 + state.timePosition * 120}
              angle={labelAngle}
              fill={accent}
              fontSize={7.8}
              fontWeight={700}
              opacity={outerLabelOpacity}
              letterAngleStep={1.55}
            />
            <RadialLetterText
              className="style-sector-label style-sector-label-inner"
              text={`${sectorGlyph[sector.id]} ${labelText}`}
              cx={atlasSize.cx}
              cy={atlasSize.cy}
              radius={wormholeTunnel.minRadius + 34}
              angle={labelAngle}
              fill={accent}
              fontSize={5.8}
              fontWeight={700}
              opacity={innerLabelOpacity}
              letterAngleStep={2.95}
            />
          </g>
        );
      })}
    </g>
  );
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}
