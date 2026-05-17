import { atlasSize } from '@/lib/atlas-layout';
import { formatYear, radiusToTunnelDepth, tunnelCenter, tunnelOpacity, wormholeGridLines, wormholeRings, wormholeTunnel, type WormholeState } from '@/lib/wormhole-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';
import { RadialLetterText } from '@/components/atlas/RadialText';

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
          <stop offset="12%" stopColor="#050505" stopOpacity="0" />
          <stop offset="32%" stopColor="#c9fff4" stopOpacity="0.2" />
          <stop offset="58%" stopColor="#d7c7ff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#050505" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="wormhole-breath" cx={atlasSize.cx} cy={atlasSize.cy + 8} r={wormholeTunnel.maxRadius + 18} fill="url(#wormhole-vignette)" />
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
      <OuterCurvature state={state} />
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
        const depth = ring.depth ?? radiusToTunnelDepth(ring.radius);
        const ringCenter = tunnelCenter(depth, state.phase);
        const labelAngle = yearLabelAngle(ring.year, index, ring.mode === 'local');
        const labelScale = Math.max(0.55, 1.25 - depth);
        const ringOpacity = tunnelOpacity(depth);
        const labelOpacity = (ring.mode === 'local' ? 0.95 : Math.max(0.18, 1 - Math.max(0, depth) * 0.92)) * ringOpacity;
        const showLabel = labelOpacity > 0.18 && (ring.mode === 'local' || ring.weight === 'major');
        const label = ring.mode === 'local' ? formatYear(state.currentYear) : ring.label;
        const ringDash = ring.mode === 'local' ? '2 14' : ring.weight === 'major' ? '1 12' : '1 18';
        const ringStroke = ring.mode === 'local' ? 0.8 : ring.weight === 'major' ? 0.62 : 0.38;

        return (
          <g key={`${ring.year}-${index}`}>
            <circle
              className={ring.mode === 'local' ? 'wormhole-current-ring' : 'wormhole-ring'}
              cx={ringCenter.x}
              cy={ringCenter.y}
              r={ring.radius}
              fill="none"
              stroke="#f7f7f4"
              strokeDasharray={ringDash}
              strokeWidth={ringStroke}
              opacity={(ring.mode === 'local' ? 0.42 : Math.max(0.08, 0.4 - Math.max(0, depth) * 0.3)) * ringOpacity}
              style={{ animationDelay: `${index * -0.16}s` }}
            />
            {showLabel ? (
              <RadialLetterText
                className="wormhole-year-label"
                text={label}
                cx={ringCenter.x}
                cy={ringCenter.y}
                radius={ring.radius}
                angle={labelAngle}
                fill="#f7f7f4"
                fontSize={Math.round(11.4 * labelScale)}
                fontWeight={500}
                opacity={labelOpacity}
                letterAngleStep={ring.mode === 'local' ? 2.9 : 2.15}
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function OuterCurvature({ state }: { state: WormholeState }) {
  const radiusLift = Math.min(112, state.timePosition * 320);
  const rimOpacity = Math.max(0, 1 - state.timePosition / 0.32);
  const segments = Array.from({ length: 20 }, (_, index) => {
    const angle = index * 18;
    const inner = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.maxRadius + radiusLift - 18, angle - 5);
    const mid = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.maxRadius + radiusLift + (index % 2 === 0 ? 18 : 9), angle + 4);
    const outer = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.maxRadius + radiusLift - 2, angle + 13);
    const color = index % 3 === 0 ? '#c9fff4' : index % 3 === 1 ? '#d7c7ff' : '#ffd7a8';

    return (
      <path
        key={index}
        className="wormhole-outer-rim"
        d={`M ${inner.x} ${inner.y} Q ${mid.x} ${mid.y} ${outer.x} ${outer.y}`}
        fill="none"
        stroke={color}
        strokeWidth={index % 4 === 0 ? 1.4 : 0.8}
        opacity={(index % 4 === 0 ? 0.38 : 0.2) * rimOpacity}
        style={{ animationDelay: `${index * -0.11}s` }}
      />
    );
  });

  return <g aria-label="Wurmloch-Aussenkruemmung">{segments}</g>;
}

function wormholeStreamLines(state: WormholeState) {
  return Array.from({ length: 24 }, (_, index) => {
    const angle = index * 25.7 + state.phase * 18;
    const start = polarToCartesian(atlasSize.cx, atlasSize.cy, 58, angle - 5);
    const mid = polarToCartesian(atlasSize.cx, atlasSize.cy + 20, 235 + (index % 4) * 28, angle + 9);
    const end = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.maxRadius + 20, angle + 18);

    return `M ${start.x} ${start.y} Q ${mid.x} ${mid.y} ${end.x} ${end.y}`;
  });
}

function yearLabelAngle(year: number, index: number, isLocal: boolean) {
  if (isLocal) return 92;

  const sequence = [58, 126, 238, 304, 24, 166];
  const offset = Math.abs(year) % sequence.length;
  return sequence[(index + offset) % sequence.length];
}
