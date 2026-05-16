import { atlasSize, sectorBoundaryPoint, sectorMidAngle, styleSectors } from '@/lib/atlas-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';

export function StyleSectors() {
  return (
    <g aria-label="Stilsektoren">
      {styleSectors.map((sector) => {
        const start = sectorBoundaryPoint(sector.startAngle);
        const labelAngle = sectorMidAngle(sector);
        const label = polarToCartesian(atlasSize.cx, atlasSize.cy, atlasSize.labelRadius, labelAngle);
        const rotate = labelAngle > 90 && labelAngle < 270 ? labelAngle + 90 : labelAngle - 90;

        return (
          <g key={sector.id}>
            <line
              x1={atlasSize.cx}
              y1={atlasSize.cy}
              x2={start.x}
              y2={start.y}
              stroke="#252525"
              strokeWidth="0.8"
              opacity="0.55"
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#181818"
              fontSize="12"
              fontWeight="600"
              fontFamily="var(--font-sans), system-ui, sans-serif"
              letterSpacing="0.09em"
              transform={`rotate(${rotate} ${label.x} ${label.y})`}
            >
              {sector.label.toUpperCase()}
            </text>
          </g>
        );
      })}
    </g>
  );
}
