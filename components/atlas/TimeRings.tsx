import { atlasSize, timeRings } from '@/lib/atlas-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';

export function TimeRings() {
  return (
    <g aria-label="Zeitringe">
      {timeRings.map((ring, index) => {
        const label = polarToCartesian(atlasSize.cx, atlasSize.cy, ring.radius, 104);

        return (
          <g key={ring.year}>
            <circle
              cx={atlasSize.cx}
              cy={atlasSize.cy}
              r={ring.radius}
              fill="none"
              stroke={ring.weight === 'major' ? '#242424' : '#9a9a9a'}
              strokeDasharray={ring.weight === 'major' ? undefined : '2 8'}
              strokeWidth={ring.weight === 'major' ? 0.9 : 0.55}
              opacity={ring.weight === 'major' ? 0.72 : 0.44}
            />
            <text
              x={label.x + 8}
              y={label.y + index * 7}
              fill="#3f3f3f"
              fontSize="11"
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
