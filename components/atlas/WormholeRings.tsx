import { atlasSize } from '@/lib/atlas-layout';
import { radiusToTunnelDepth, tubeTwist, tunnelCenter, tunnelOpacity, tunnelPoint, tunnelRadius, wormholeGridLines, wormholeRings, wormholeTunnel, type WormholeState } from '@/lib/wormhole-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';
import { RadialLetterText } from '@/components/atlas/RadialText';

type WormholeRingsProps = {
  state: WormholeState;
};

export function WormholeRings({ state }: WormholeRingsProps) {
  const rings = wormholeRings(state);
  const gridLines = wormholeGridLines(state);
  const streamLines = wormholeStreamLines(state);
  const speedLines = radialSpeedLines(state);
  const edgeCompression = Math.min(1, Math.abs(state.edgeTension) / 0.065);

  return (
    <g aria-label="Zeit-Wurmloch">
      <defs>
        <radialGradient id="wormhole-vignette" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#050505" stopOpacity="0.02" />
          <stop offset="13%" stopColor="#050505" stopOpacity="0.18" />
          <stop offset="27%" stopColor="#00e7ff" stopOpacity="0.34" />
          <stop offset="44%" stopColor="#8f5cff" stopOpacity="0.28" />
          <stop offset="62%" stopColor="#ffb000" stopOpacity="0.22" />
          <stop offset="79%" stopColor="#ff3d1f" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#050505" stopOpacity="0" />
        </radialGradient>
        <filter id="wormhole-energy-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.3" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle className="wormhole-breath" cx={atlasSize.cx} cy={atlasSize.cy + 8} r={wormholeTunnel.maxRadius + 18 - edgeCompression * 24} fill="url(#wormhole-vignette)" />
      {streamLines.map((line, index) => (
        <path
          key={`stream-${index}`}
          className="wormhole-stream"
          d={line}
          fill="none"
          stroke={energyColor(index)}
          strokeWidth={index % 5 === 0 ? 1.1 : 0.7}
          opacity={index % 5 === 0 ? 0.22 : 0.13}
          filter="url(#wormhole-energy-glow)"
          style={{ animationDelay: `${index * -0.22}s` }}
        />
      ))}
      {speedLines.map((line, index) => (
        <path
          key={`speed-${index}`}
          className="wormhole-speed-line"
          d={line}
          fill="none"
          stroke={energyColor(index + 2)}
          strokeWidth={index % 6 === 0 ? 0.68 : 0.38}
          opacity={index % 6 === 0 ? 0.4 : 0.24}
          style={{ animationDelay: `${index * -0.045}s` }}
        />
      ))}
      <OuterCurvature state={state} />
      {gridLines.map((line, index) => (
        <path
          key={index}
          className="wormhole-spoke"
          d={line}
          fill="none"
          stroke={index % 4 === 0 ? '#fff3d1' : energyColor(index)}
          strokeWidth={index % 3 === 0 ? 0.88 : 0.48}
          opacity={index % 3 === 0 ? 0.34 : 0.2}
          style={{ animationDelay: `${index * -0.08}s` }}
        />
      ))}
      {rings.map((ring, index) => {
        const depth = ring.depth ?? radiusToTunnelDepth(ring.radius);
        const ringCenter = tunnelCenter(depth, state.phase);
        const labelAngle = yearLabelAngle(ring.year, index, ring.mode === 'local');
        const labelScale = Math.max(0.55, 1.25 - depth);
        const ringOpacity = tunnelOpacity(depth);
        const labelOpacity = (ring.mode === 'local' ? 1 : Math.max(0.34, 1 - Math.max(0, depth) * 0.72)) * ringOpacity;
        const showLabel = labelOpacity > 0.13;
        const label = ring.label;
        const ringDash = ring.mode === 'local' ? '2 11' : ring.weight === 'major' ? '1 10' : '1 15';
        const ringStroke = ring.mode === 'local' ? 1.08 : ring.weight === 'major' ? 0.78 : 0.48;
        const ringColor = ring.mode === 'local' ? '#fff6c8' : ring.weight === 'major' ? '#ffcf70' : '#f7f7f4';

        return (
          <g key={`${ring.year}-${index}`}>
            <circle
              className={ring.mode === 'local' ? 'wormhole-current-ring' : 'wormhole-ring'}
              cx={ringCenter.x}
              cy={ringCenter.y}
              r={ring.radius}
              fill="none"
              stroke={ringColor}
              strokeDasharray={ringDash}
              strokeWidth={ringStroke}
              opacity={(ring.mode === 'local' ? 0.76 : Math.max(0.14, 0.52 - Math.max(0, depth) * 0.26)) * ringOpacity}
              filter={ring.mode === 'local' ? 'url(#wormhole-energy-glow)' : undefined}
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
                fill={ring.mode === 'local' ? '#fff6c8' : '#f7f7f4'}
                fontSize={Math.round((ring.weight === 'major' ? 12.6 : 9.7) * labelScale)}
                fontWeight={ring.weight === 'major' ? 650 : 520}
                opacity={labelOpacity}
                letterAngleStep={ring.mode === 'local' ? 2.9 : ring.weight === 'major' ? 2.1 : 1.62}
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function OuterCurvature({ state }: { state: WormholeState }) {
  const startResistance = state.edgeTension < 0 ? Math.abs(state.edgeTension) * 260 : 0;
  const radiusLift = Math.min(112, state.timePosition * 320) - startResistance;
  const rimOpacity = Math.max(0, 1 - state.timePosition / 0.32);
  const segments = Array.from({ length: 20 }, (_, index) => {
    const angle = index * 18;
    const inner = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.maxRadius + radiusLift - 18, angle - 5);
    const mid = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.maxRadius + radiusLift + (index % 2 === 0 ? 18 : 9), angle + 4);
    const outer = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.maxRadius + radiusLift - 2, angle + 13);
    const color = energyColor(index + 3);

    return (
      <path
        key={index}
        className="wormhole-outer-rim"
        d={`M ${inner.x} ${inner.y} Q ${mid.x} ${mid.y} ${outer.x} ${outer.y}`}
        fill="none"
        stroke={color}
        strokeWidth={index % 4 === 0 ? 2.2 : 1.15}
        opacity={(index % 4 === 0 ? 0.72 : 0.38) * rimOpacity}
        filter="url(#wormhole-energy-glow)"
        style={{ animationDelay: `${index * -0.11}s` }}
      />
    );
  });

  return <g aria-label="Wurmloch-Aussenkruemmung">{segments}</g>;
}

function wormholeStreamLines(state: WormholeState) {
  return Array.from({ length: 30 }, (_, index) => {
    const baseAngle = index * 12 + (index % 5) * 3.2;
    const samples = Array.from({ length: 7 }, (_, sampleIndex) => 0.035 + sampleIndex * 0.096 + (index % 4) * 0.007);
    const points = samples.map((depth) => {
      const worldPosition = state.timePosition + depth + index * 0.002;
      const angle = baseAngle + tubeTwist(worldPosition) + 10;
      const radius = tunnelRadius(depth) + ((index % 5) - 2) * 1.8;

      return tunnelPoint(radius, angle, depth, state.phase);
    });

    return points.map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  });
}

function radialSpeedLines(state: WormholeState) {
  return Array.from({ length: 72 }, (_, index) => {
    const baseAngle = index * 5 + (index % 3) * 1.2;
    const samples = Array.from({ length: 10 }, (_, sampleIndex) => 0.025 + sampleIndex * 0.105);
    const points = samples.map((depth) => {
      const worldPosition = state.timePosition + depth;
      const angle = baseAngle + tubeTwist(worldPosition) * 0.42;
      const radius = tunnelRadius(depth) + ((index % 7) - 3) * 0.9;

      return tunnelPoint(radius, angle, depth, state.phase);
    });

    return points.map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  });
}

function energyColor(index: number) {
  const colors = ['#ffb000', '#ff4d1f', '#ff007a', '#8f5cff', '#00e7ff', '#b7ffef'];
  return colors[index % colors.length];
}

function yearLabelAngle(year: number, index: number, isLocal: boolean) {
  if (isLocal) return 92;

  const sequence = [58, 126, 238, 304, 24, 166];
  const offset = Math.abs(year) % sequence.length;
  return sequence[(index + offset) % sequence.length];
}
