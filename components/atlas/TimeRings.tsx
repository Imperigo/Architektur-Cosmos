import { atlasSize, timeRings } from '@/lib/atlas-layout';

export function TimeRings() {
  return (
    <g aria-label="Zeitringe">
      {timeRings.map((ring, index) => (
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
            x={atlasSize.cx + ring.radius + 10}
            y={atlasSize.cy - 10 + index * 14}
            fill="#3f3f3f"
            fontSize="11"
            fontFamily="var(--font-sans), system-ui, sans-serif"
            letterSpacing="0.04em"
          >
            {ring.label}
          </text>
        </g>
      ))}
    </g>
  );
}
