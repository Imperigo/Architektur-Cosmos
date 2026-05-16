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
        const labelText = sectorLabel[sector.id];
        const labelWidth = Math.min(166, Math.max(92, labelText.length * 6.4 + 48));

        return (
          <g key={sector.id} className="style-sector">
            <path
              d={sectorArc(sector, 438)}
              fill="none"
              stroke="#f7f7f4"
              strokeWidth="1.35"
              strokeDasharray={sectorDash[sector.id]}
              opacity="0.42"
            />
            <path
              d={sectorArc(sector, 705)}
              fill="none"
              stroke="#f7f7f4"
              strokeWidth="0.7"
              strokeDasharray={sectorDash[sector.id]}
              opacity="0.18"
            />
            <line
              x1={startInner.x}
              y1={startInner.y}
              x2={startOuter.x}
              y2={startOuter.y}
              stroke="#f7f7f4"
              strokeWidth="0.8"
              opacity="0.22"
            />
            <g className="style-sector-label">
              <rect
                x={label.x - labelWidth / 2}
                y={label.y - 15}
                width={labelWidth}
                height="30"
                fill="#050505"
                stroke="#f7f7f4"
                strokeWidth="0.65"
                opacity="0.84"
              />
              <text x={label.x - labelWidth / 2 + 12} y={label.y + 4} fill="#f7f7f4" fontSize="9" fontWeight="700" fontFamily="var(--font-sans), system-ui, sans-serif">
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
