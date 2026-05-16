import { atlasSize, sectorBoundaryPoint, sectorMidAngle, styleSectors } from '@/lib/atlas-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';
import { wormholeTunnel } from '@/lib/wormhole-layout';

export function StyleSectors() {
  return (
    <g aria-label="Stilsektoren">
      {styleSectors.map((sector) => {
        const startInner = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.minRadius, sector.startAngle);
        const start = sectorBoundaryPoint(sector.startAngle);
        const labelAngle = sectorMidAngle(sector);
        const label = polarToCartesian(atlasSize.cx, atlasSize.cy, atlasSize.labelRadius, labelAngle);
        const rotate = labelAngle > 90 && labelAngle < 270 ? labelAngle + 90 : labelAngle - 90;

        return (
          <g key={sector.id}>
            <line
              x1={startInner.x}
              y1={startInner.y}
              x2={start.x}
              y2={start.y}
              stroke="#f7f7f4"
              strokeWidth="0.8"
              opacity="0.22"
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#f7f7f4"
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
