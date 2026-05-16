import { atlasSize } from '@/lib/atlas-layout';
import { formatYear, radiusToTunnelDepth, tunnelOpacity, wormholeGridLines, wormholeRings, wormholeTunnel, type WormholeState } from '@/lib/wormhole-layout';
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
          <stop offset="14%" stopColor="#050505" stopOpacity="0" />
          <stop offset="28%" stopColor="#f7f7f4" stopOpacity="0.09" />
          <stop offset="56%" stopColor="#f7f7f4" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#050505" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={atlasSize.cx} cy={atlasSize.cy} r="640" fill="url(#wormhole-vignette)" />
      {gridLines.map((line, index) => (
        <path key={index} d={line} fill="none" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.12" />
      ))}
      {rings.map((ring, index) => {
        const depth = radiusToTunnelDepth(ring.radius);
        const labelPoint = polarToCartesian(atlasSize.cx, atlasSize.cy, ring.radius, 102);
        const labelScale = Math.max(0.55, 1.25 - depth);
        const ringOpacity = tunnelOpacity(depth);
        const labelOpacity = (ring.mode === 'local' ? 0.92 : Math.max(0.2, 1 - depth * 0.92)) * ringOpacity;

        return (
          <g key={`${ring.year}-${index}`}>
            <circle
              cx={atlasSize.cx}
              cy={atlasSize.cy}
              r={ring.radius}
              fill="none"
              stroke="#f7f7f4"
              strokeDasharray={ring.mode === 'local' ? undefined : ring.weight === 'major' ? '1 10' : '1 15'}
              strokeWidth={ring.mode === 'local' ? 1.25 : ring.weight === 'major' ? 0.85 : 0.45}
              opacity={(ring.mode === 'local' ? 0.84 : Math.max(0.13, 0.5 - depth * 0.36)) * ringOpacity}
            />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#f7f7f4"
              fontSize={Math.round(10 * labelScale)}
              fontFamily="var(--font-sans), system-ui, sans-serif"
              letterSpacing="0.08em"
              opacity={labelOpacity}
            >
              {ring.mode === 'local' ? formatYear(state.currentYear) : ring.label}
            </text>
          </g>
        );
      })}
      <circle cx={atlasSize.cx} cy={atlasSize.cy} r={wormholeTunnel.minRadius - 8} fill="#050505" opacity="0.94" />
      <circle cx={atlasSize.cx} cy={atlasSize.cy} r={wormholeTunnel.minRadius} fill="none" stroke="#f7f7f4" strokeWidth="0.65" strokeDasharray="1 12" opacity="0.2" />
    </g>
  );
}
