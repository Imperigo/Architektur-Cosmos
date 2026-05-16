import { atlasSize, sectorMidAngle, styleSectors, type StyleSector } from '@/lib/atlas-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';
import { wormholeTunnel } from '@/lib/wormhole-layout';

const sectorGlyph: Record<StyleSector['id'], string> = {
  classical_architecture: 'I',
  pre_modern_architecture: 'II',
  modern_architecture: 'III',
  postwar_modern_architecture: 'IV',
  sustainable_architecture: 'V',
  vernacular_architecture: 'VI'
};

const sectorDash: Record<StyleSector['id'], string> = {
  classical_architecture: '1 7',
  pre_modern_architecture: '8 6',
  modern_architecture: '2 4',
  postwar_modern_architecture: '12 5 2 5',
  sustainable_architecture: '1 4 7 4',
  vernacular_architecture: '4 8'
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

export function StyleSectors() {
  return (
    <g aria-label="Stilsektoren">
      {styleSectors.map((sector) => {
        const startInner = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.minRadius + 18, sector.startAngle);
        const startOuter = polarToCartesian(atlasSize.cx, atlasSize.cy, 720, sector.startAngle);
        const labelAngle = sectorMidAngle(sector);
        const label = readableLabelPoint(labelAngle);
        const labelLeader = polarToCartesian(atlasSize.cx, atlasSize.cy, 452, labelAngle);
        const labelText = sectorLabel[sector.id];
        const accent = sectorColor[sector.id];

        return (
          <g key={sector.id} className="style-sector">
            <path
              d={sectorArc(sector, 438)}
              fill="none"
              stroke={accent}
              strokeWidth="1.35"
              strokeDasharray={sectorDash[sector.id]}
              opacity="0.5"
            />
            <path
              d={sectorArc(sector, 705)}
              fill="none"
              stroke={accent}
              strokeWidth="0.7"
              strokeDasharray={sectorDash[sector.id]}
              opacity="0.22"
            />
            <line
              x1={startInner.x}
              y1={startInner.y}
              x2={startOuter.x}
              y2={startOuter.y}
              stroke={accent}
              strokeWidth="0.8"
              opacity="0.22"
            />
            <g className="style-sector-label">
              <line
                x1={labelLeader.x}
                y1={labelLeader.y}
                x2={label.x}
                y2={label.y}
                stroke={accent}
                strokeWidth="0.65"
                strokeDasharray="1 7"
                opacity="0.38"
              />
              <circle cx={labelLeader.x} cy={labelLeader.y} r="3.6" fill={accent} opacity="0.72" />
              <circle cx={label.x - 58} cy={label.y} r="7" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.72" />
              <text x={label.x - 58} y={label.y + 3.2} textAnchor="middle" fill={accent} fontSize="7.2" fontWeight="700" fontFamily="var(--font-sans), system-ui, sans-serif">
                {sectorGlyph[sector.id]}
              </text>
              <text
                x={label.x + 8}
                y={label.y + 4}
                textAnchor="middle"
                fill="#f7f7f4"
                fontSize="9.5"
                fontWeight="600"
                fontFamily="var(--font-sans), system-ui, sans-serif"
                letterSpacing="0.08em"
                stroke="#050505"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {labelText}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}

function readableLabelPoint(angle: number) {
  const point = polarToCartesian(atlasSize.cx, atlasSize.cy, atlasSize.labelRadius + 10, angle);

  return {
    x: Math.max(104, Math.min(atlasSize.width - 104, point.x)),
    y: Math.max(36, Math.min(atlasSize.height - 64, point.y))
  };
}

function sectorArc(sector: StyleSector, radius: number) {
  const start = polarToCartesian(atlasSize.cx, atlasSize.cy, radius, sector.startAngle);
  const end = polarToCartesian(atlasSize.cx, atlasSize.cy, radius, sector.endAngle);
  const span = sector.startAngle > sector.endAngle
    ? sector.endAngle + 360 - sector.startAngle
    : sector.endAngle - sector.startAngle;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${span > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
}
