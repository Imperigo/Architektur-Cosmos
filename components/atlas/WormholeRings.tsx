import { atlasSize } from '@/lib/atlas-layout';
import { formatYear, radiusToTunnelDepth, tunnelCenter, tunnelOpacity, wormholeGridLines, wormholeRings, wormholeTunnel, type WormholeState } from '@/lib/wormhole-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';

type WormholeRingsProps = {
  state: WormholeState;
};

export function WormholeRings({ state }: WormholeRingsProps) {
  const rings = wormholeRings(state);
  const gridLines = wormholeGridLines(state);

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
        const labelWidth = Math.max(46, label.length * 6.2 + 16);

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
                <rect
                  x={labelPoint.x - labelWidth / 2}
                  y={labelPoint.y - 9}
                  width={labelWidth}
                  height="18"
                  fill="#050505"
                  stroke="#f7f7f4"
                  strokeWidth="0.55"
                  opacity={ring.mode === 'local' ? 0.9 : 0.7}
                />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 3.5}
                  textAnchor="middle"
                  fill="#f7f7f4"
                  fontSize={Math.round(9.2 * labelScale)}
                  fontFamily="var(--font-sans), system-ui, sans-serif"
                  letterSpacing="0.07em"
                >
                  {label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
      <circle cx={atlasSize.cx} cy={atlasSize.cy} r={wormholeTunnel.minRadius - 12} fill="#050505" opacity="0.94" />
      <circle className="wormhole-throat" cx={atlasSize.cx} cy={atlasSize.cy} r={wormholeTunnel.minRadius} fill="none" stroke="#f7f7f4" strokeWidth="0.7" strokeDasharray="1 12" opacity="0.35" />
    </g>
  );
}

function yearLabelAngle(year: number, index: number, isLocal: boolean) {
  if (isLocal) return 92;

  const sequence = [58, 126, 238, 304, 24, 166];
  const offset = Math.abs(year) % sequence.length;
  return sequence[(index + offset) % sequence.length];
}
