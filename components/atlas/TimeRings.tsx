import { atlasSize, zoomTimeRings } from '@/lib/atlas-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';

export function TimeRings({ scale, focusYear }: { scale: number; focusYear?: number }) {
  const rings = zoomTimeRings(scale, focusYear);

  return (
    <g aria-label="Zeitringe">
      {rings.map((ring, index) => {
        const label = polarToCartesian(atlasSize.cx, atlasSize.cy, ring.radius, 104);

        return (
          <g key={ring.year}>
            <circle
              cx={atlasSize.cx}
              cy={atlasSize.cy}
              r={ring.radius}
              fill="none"
              stroke={ring.weight === 'major' ? '#242424' : '#9a9a9a'}
              strokeDasharray={ring.weight === 'major' ? undefined : ring.mode === 'local' ? '1 5' : '2 8'}
              strokeWidth={ring.weight === 'major' ? 0.9 : 0.5}
              opacity={ring.mode === 'local' ? 0.34 : ring.weight === 'major' ? 0.72 : 0.42}
            />
            <text
              x={label.x + 8}
              y={label.y + index * (scale < 1.15 ? 13 : 7)}
              fill="#3f3f3f"
              fontSize={ring.mode === 'local' ? 9 : 11}
              fontFamily="var(--font-sans), system-ui, sans-serif"
              letterSpacing="0.04em"
            >
              {ring.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
