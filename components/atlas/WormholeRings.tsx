import { atlasSize } from '@/lib/atlas-layout';
import { formatYear, radiusToTunnelDepth, tunnelCenter, tunnelOpacity, wormholeGridLines, wormholeRings, wormholeTunnel, type WormholeState } from '@/lib/wormhole-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';

type WormholeRingsProps = {
  state: WormholeState;
};

export function WormholeRings({ state }: WormholeRingsProps) {
  const rings = wormholeRings(state);
  const gridLines = wormholeGridLines(state);
  const streamLines = wormholeStreamLines(state);

  return (
    <g aria-label="Zeit-Wurmloch">
      <defs>
        <radialGradient id="wormhole-vignette" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#050505" stopOpacity="0" />
          <stop offset="8%" stopColor="#050505" stopOpacity="0" />
          <stop offset="24%" stopColor="#f7f7f4" stopOpacity="0.18" />
          <stop offset="58%" stopColor="#f7f7f4" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#050505" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="wormhole-breath" cx={atlasSize.cx} cy={atlasSize.cy + 8} r="660" fill="url(#wormhole-vignette)" />
      {streamLines.map((line, index) => (
        <path
          key={`stream-${index}`}
          className="wormhole-stream"
          d={line}
          fill="none"
          stroke={index % 3 === 0 ? '#c9fff4' : index % 3 === 1 ? '#d7c7ff' : '#ffd7a8'}
          strokeWidth="0.65"
          opacity="0.07"
          style={{ animationDelay: `${index * -0.22}s` }}
        />
      ))}
      <circle
        className="wormhole-outer-rim"
        cx={atlasSize.cx}
        cy={atlasSize.cy}
        r={wormholeTunnel.maxRadius}
        fill="none"
        stroke="#f7f7f4"
        strokeWidth="1.15"
        strokeDasharray="6 18 1 18"
        opacity="0.3"
      />
      {gridLines.map((line, index) => (
        <path
          key={index}
          className="wormhole-spoke"
          d={line}
          fill="none"
          stroke="#f7f7f4"
          strokeWidth={index % 3 === 0 ? 0.85 : 0.5}
          opacity={index % 3 === 0 ? 0.22 : 0.12}
          style={{ animationDelay: `${index * -0.08}s` }}
        />
      ))}
      {rings.map((ring, index) => {
        const depth = radiusToTunnelDepth(ring.radius);
        const ringCenter = tunnelCenter(depth, state.phase);
        const labelAngle = yearLabelAngle(ring.year, index, ring.mode === 'local');
        const labelPoint = polarToCartesian(ringCenter.x, ringCenter.y, ring.radius, labelAngle);
        const labelScale = Math.max(0.55, 1.25 - depth);
        const ringOpacity = tunnelOpacity(depth);
        const labelOpacity = (ring.mode === 'local' ? 0.92 : Math.max(0.2, 1 - depth * 0.92)) * ringOpacity;
        const showLabel = labelOpacity > 0.18 && (ring.mode === 'local' || ring.weight === 'major');
        const label = ring.mode === 'local' ? formatYear(state.currentYear) : ring.label;

        return (
          <g key={`${ring.year}-${index}`}>
            <circle
              className={ring.mode === 'local' ? 'wormhole-current-ring' : 'wormhole-ring'}
              cx={ringCenter.x}
              cy={ringCenter.y}
              r={ring.radius}
              fill="none"
              stroke="#f7f7f4"
              strokeDasharray={ring.mode === 'local' ? undefined : ring.weight === 'major' ? '1 10' : '1 15'}
              strokeWidth={ring.mode === 'local' ? 1.25 : ring.weight === 'major' ? 0.85 : 0.45}
              opacity={(ring.mode === 'local' ? 0.84 : Math.max(0.13, 0.5 - depth * 0.36)) * ringOpacity}
              style={{ animationDelay: `${index * -0.16}s` }}
            />
            {showLabel ? (
              <g className="wormhole-year-label" opacity={labelOpacity}>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 3}
                  textAnchor="middle"
                  fill="#f7f7f4"
                  fontSize={Math.round(9.2 * labelScale)}
                  fontFamily="var(--font-sans), system-ui, sans-serif"
                  letterSpacing="0.07em"
                  stroke="#050505"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
      <circle cx={atlasSize.cx} cy={atlasSize.cy} r={wormholeTunnel.minRadius - 12} fill="#050505" opacity="0.94" />
      <g className="wormhole-whirl" style={{ transformOrigin: `${atlasSize.cx}px ${atlasSize.cy}px` }}>
        <path d={whirlPath(18, 52, 0)} fill="none" stroke="#f7f7f4" strokeWidth="0.55" opacity="0.16" />
        <path d={whirlPath(12, 42, 120)} fill="none" stroke="#c9fff4" strokeWidth="0.5" opacity="0.12" />
        <path d={whirlPath(8, 34, 240)} fill="none" stroke="#d7c7ff" strokeWidth="0.5" opacity="0.1" />
      </g>
      <circle className="wormhole-throat" cx={atlasSize.cx} cy={atlasSize.cy} r={wormholeTunnel.minRadius} fill="none" stroke="#f7f7f4" strokeWidth="0.55" strokeDasharray="1 16" opacity="0.13" />
    </g>
  );
}

function wormholeStreamLines(state: WormholeState) {
  return Array.from({ length: 14 }, (_, index) => {
    const angle = index * 25.7 + state.phase * 18;
    const start = polarToCartesian(atlasSize.cx, atlasSize.cy, 92, angle - 5);
    const mid = polarToCartesian(atlasSize.cx, atlasSize.cy + 24, 360 + (index % 4) * 36, angle + 10);
    const end = polarToCartesian(atlasSize.cx, atlasSize.cy, 720, angle + 22);

    return `M ${start.x} ${start.y} Q ${mid.x} ${mid.y} ${end.x} ${end.y}`;
  });
}

function whirlPath(innerRadius: number, outerRadius: number, offset: number) {
  const points = Array.from({ length: 18 }, (_, index) => {
    const progress = index / 17;
    const radius = innerRadius + (outerRadius - innerRadius) * progress;
    const angle = offset + progress * 255;
    return polarToCartesian(atlasSize.cx, atlasSize.cy, radius, angle);
  });

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function yearLabelAngle(year: number, index: number, isLocal: boolean) {
  if (isLocal) return 92;

  const sequence = [58, 126, 238, 304, 24, 166];
  const offset = Math.abs(year) % sequence.length;
  return sequence[(index + offset) % sequence.length];
}
