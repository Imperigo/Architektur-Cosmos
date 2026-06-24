import { memo } from 'react';
import { atlasSize } from '@/lib/atlas-layout';
import { radiusToTunnelDepth, tubeTwist, tunnelCenter, tunnelFrontDepth, tunnelOpacity, tunnelPoint, tunnelRadius, wormholeGridLines, wormholeRings, wormholeTunnel, type WormholeState } from '@/lib/wormhole-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';
import type { TimeRing } from '@/lib/atlas-layout';

type WormholeRingsProps = {
  state: WormholeState;
  isMoving?: boolean;
  quality?: 'reduced' | 'balanced' | 'full';
};

function WormholeRingsComponent({ state, isMoving = false, quality = 'balanced' }: WormholeRingsProps) {
  const isReduced = quality === 'reduced';
  const isFull = quality === 'full';
  const rings = stableRingSlots(wormholeRings(state));
  const gridLines = wormholeGridLines(state, {
    spokeStride: isReduced ? 10 : isMoving ? 8 : isFull ? 4 : 5,
    sampleCount: isReduced ? 8 : isMoving ? 10 : isFull ? 24 : 17
  });
  const streamLines = wormholeStreamLines(state, { count: isReduced ? 0 : isMoving ? 1 : isFull ? 6 : 3, sampleCount: isReduced ? 2 : isMoving ? 2 : 4 });
  const speedLines = radialSpeedLines(state, { count: isReduced ? 0 : isMoving ? 1 : isFull ? 7 : 3, sampleCount: isMoving ? 2 : 3 });
  const edgeCompression = Math.min(1, Math.abs(state.edgeTension) / 0.065);
  const frontDissolve = Math.max(0, 1 - state.timePosition / 0.22);

  return (
    <g aria-label="Zeit-Atlas">
      <defs>
        <radialGradient id="wormhole-vignette" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#050505" stopOpacity="0.02" />
          <stop offset="11%" stopColor="#050505" stopOpacity="0.2" />
          <stop offset="26%" stopColor="#00f5ff" stopOpacity="0.43" />
          <stop offset="42%" stopColor="#a56bff" stopOpacity="0.36" />
          <stop offset="58%" stopColor="#ff38f5" stopOpacity="0.26" />
          <stop offset="73%" stopColor="#ffd43d" stopOpacity="0.25" />
          <stop offset="88%" stopColor="#ff4b20" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#050505" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="wormhole-breath" cx={atlasSize.cx} cy={atlasSize.cy + 8} r={wormholeTunnel.maxRadius + 18 - edgeCompression * 24} fill="url(#wormhole-vignette)" opacity={0.98 - state.timePosition * 0.18} />
      {!isReduced && !isMoving ? <IdleOrbits state={state} /> : null}
      {!isReduced && !isMoving ? <IdleWhirlLines state={state} /> : null}
      {!isMoving || isFull ? <EnergyBands rings={rings} state={state} isMoving={isMoving} quality={quality} /> : null}
      {streamLines.map((line, index) => (
        <path
          key={`stream-${index}`}
          className="wormhole-stream"
          d={line}
          fill="none"
          stroke={energyColor(index)}
          strokeWidth={index % 4 === 0 ? 1.18 : 0.82}
          opacity={isMoving ? (index % 4 === 0 ? 0.23 : 0.15) : index % 4 === 0 ? 0.32 : 0.21}
          style={{ animationDelay: `${index * -0.41}s` }}
        />
      ))}
      {speedLines.map((line, index) => (
        <path
          key={`speed-${index}`}
          className="wormhole-speed-line"
          d={line}
          fill="none"
          stroke={energyColor(index + 2)}
          strokeWidth={index % 6 === 0 ? 0.78 : 0.48}
          opacity={isMoving ? (index % 6 === 0 ? 0.28 : 0.16) : index % 6 === 0 ? 0.38 : 0.22}
          style={{ animationDelay: `${index * -0.19}s` }}
        />
      ))}
      {!isReduced || !isMoving ? <OuterCurvature state={state} opacityScale={frontDissolve} quality={quality} isMoving={isMoving} /> : null}
      {gridLines.map((line, index) => (
        <path
          key={index}
          className="wormhole-spoke"
          d={line}
          fill="none"
          stroke={index % 4 === 0 ? '#fff3d1' : energyColor(index)}
          strokeWidth={index % 6 === 0 ? 1.18 : 0.68}
          opacity={isMoving ? (index % 6 === 0 ? 0.24 : 0.12) : index % 6 === 0 ? 0.5 : 0.3}
          style={{ animationDelay: `${index * -0.08}s` }}
        />
      ))}
      {rings.map((slot, index) => {
        const ring = slot.ring;
        const depth = ring ? ring.depth ?? radiusToTunnelDepth(ring.radius) : 1;
        const ringCenter = tunnelCenter(depth, state.phase);
        const ringOpacity = ring ? tunnelOpacity(depth) * ringEdgeDissolve(depth, state.timePosition) : 0;
        const ringDash = ring?.mode === 'local' ? '2 9' : ring?.weight === 'major' ? '1 8' : '1 12';
        const ringStroke = ring?.mode === 'local' ? 1.58 : ring?.weight === 'major' ? 1.08 : 0.72;
        const ringColor = ring?.mode === 'local' ? '#fff8d6' : ring?.weight === 'major' ? '#ffd43d' : '#f7f7f4';

        return (
          <g key={`ring-slot-${slot.slotIndex}`}>
            <circle
              className={ring?.mode === 'local' ? 'wormhole-current-ring' : 'wormhole-ring'}
              cx={ringCenter.x}
              cy={ringCenter.y}
              r={ring?.radius ?? 0}
              fill="none"
              stroke={ringColor}
              strokeDasharray={ringDash}
              strokeWidth={ringStroke * 1.08}
              opacity={(isMoving ? 0.78 : 1) * (ring?.mode === 'local' ? 1 : Math.max(0.32, 0.82 - Math.max(0, depth) * 0.18)) * ringOpacity}
              style={{ animationDelay: `${index * -0.16}s` }}
            />
          </g>
        );
      })}
    </g>
  );
}

export const WormholeRings = memo(WormholeRingsComponent);

function EnergyBands({ rings, state, isMoving, quality }: { rings: RingSlot[]; state: WormholeState; isMoving: boolean; quality: 'reduced' | 'balanced' | 'full' }) {
  const bandScale = quality === 'reduced' ? 0.28 : isMoving ? 0.48 : quality === 'full' ? 1.22 : 0.86;

  return (
    <g aria-hidden="true" pointerEvents="none">
      {rings.map((slot, index) => {
        const ring = slot.ring;
        const depth = ring ? ring.depth ?? radiusToTunnelDepth(ring.radius) : 1;
        const isVisible = Boolean(ring && depth >= 0.035 && depth <= 0.92);

        const center = tunnelCenter(depth, state.phase);
        const opacity = isVisible ? tunnelOpacity(depth) * ringEdgeDissolve(depth, state.timePosition) : 0;
        const bandOpacity = ((ring?.mode === 'local' ? 0.28 : ring?.weight === 'major' ? 0.2 : 0.105) * opacity * bandScale);

        return (
          <circle
            key={`energy-band-slot-${slot.slotIndex}`}
            className="wormhole-energy-band"
            cx={center.x}
            cy={center.y}
            r={ring?.radius ?? 0}
            fill="none"
            stroke={energyColor(index + (ring?.weight === 'major' ? 2 : 0))}
            strokeWidth={ring?.mode === 'local' ? 12 : ring?.weight === 'major' ? 7.4 : 4.4}
            opacity={isMoving ? bandOpacity * 1.05 : bandOpacity}
          />
        );
      })}
    </g>
  );
}

function IdleOrbits({ state }: { state: WormholeState }) {
  const frontDepth = tunnelFrontDepth(state);
  const depths = [frontDepth + 0.12, frontDepth + 0.34, frontDepth + 0.58].filter((depth) => depth < 0.92);

  return (
    <g aria-hidden="true" pointerEvents="none">
      {depths.map((depth, index) => {
        const center = tunnelCenter(depth, state.phase);
        const radius = tunnelRadius(depth) + index * 4;

        return (
          <circle
            key={`idle-orbit-${index}`}
            className="wormhole-idle-orbit"
            cx={center.x}
            cy={center.y}
            r={radius}
            fill="none"
            stroke={energyColor(index + 1)}
            strokeWidth={index === 1 ? 0.75 : 0.55}
            strokeDasharray={index === 1 ? '1 18' : '1 24'}
            opacity={0.22 - index * 0.035}
            style={{ animationDelay: `${index * -2.7}s` }}
          />
        );
      })}
    </g>
  );
}

function IdleWhirlLines({ state }: { state: WormholeState }) {
  const frontDepth = tunnelFrontDepth(state);

  return (
    <g aria-hidden="true" pointerEvents="none">
      {Array.from({ length: 2 }, (_, index) => {
        const depth = frontDepth + 0.045 + index * 0.085;
        const baseAngle = index * 128 + tubeTwist(state.timePosition + depth) * 0.18;
        const samples = Array.from({ length: 4 }, (_, sampleIndex) => depth + sampleIndex * 0.026);
        const points = samples.map((sampleDepth, sampleIndex) => {
          const radius = tunnelRadius(sampleDepth) + Math.sin(sampleIndex * 0.8 + index) * 3;
          const angle = baseAngle + sampleIndex * 10 + tubeTwist(state.timePosition + sampleDepth) * 0.34;
          return tunnelPoint(radius, angle, sampleDepth, state.phase);
        });
        const path = points.map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

        return (
          <path
            key={index}
            className="wormhole-idle-whirl"
            d={path}
            fill="none"
            stroke={energyColor(index + 3)}
            strokeWidth={index % 2 === 0 ? 0.58 : 0.48}
            strokeDasharray="6 28"
            opacity="0.16"
            style={{ animationDelay: `${index * -4.8}s` }}
          />
        );
      })}
    </g>
  );
}

function OuterCurvature({ state, opacityScale, quality, isMoving }: { state: WormholeState; opacityScale: number; quality: 'reduced' | 'balanced' | 'full'; isMoving: boolean }) {
  const startResistance = state.edgeTension < 0 ? Math.abs(state.edgeTension) * 260 : 0;
  const radiusLift = Math.min(112, state.timePosition * 320) - startResistance;
  const rimOpacity = Math.max(0, 1 - state.timePosition / 0.24) * opacityScale;
  const segmentCount = quality === 'full' ? 20 : isMoving ? 8 : 12;
  const segments = Array.from({ length: segmentCount }, (_, index) => {
    const angle = index * (360 / segmentCount);
    const inner = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.maxRadius + radiusLift - 18, angle - 5);
    const mid = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.maxRadius + radiusLift + (index % 2 === 0 ? 18 : 9), angle + 4);
    const outer = polarToCartesian(atlasSize.cx, atlasSize.cy, wormholeTunnel.maxRadius + radiusLift - 2, angle + 13);

    return (
      <path
        key={index}
        className="wormhole-outer-rim"
        d={`M ${inner.x} ${inner.y} Q ${mid.x} ${mid.y} ${outer.x} ${outer.y}`}
        fill="none"
        stroke="#f7f7f4"
        strokeWidth={index % 4 === 0 ? 1.2 : 0.7}
        opacity={(index % 4 === 0 ? 0.28 : 0.14) * rimOpacity}
        style={{ animationDelay: `${index * -0.11}s` }}
      />
    );
  });

  return <g aria-label="Atlas-Aussenkruemmung">{segments}</g>;
}

function wormholeStreamLines(state: WormholeState, options?: { count?: number; sampleCount?: number }) {
  const count = options?.count ?? 30;
  const sampleCount = options?.sampleCount ?? 7;
  const frontDepth = tunnelFrontDepth(state);

  return Array.from({ length: count }, (_, index) => {
    const baseAngle = index * (360 / count) + (index % 5) * 3.2;
    const samples = Array.from({ length: sampleCount }, (_, sampleIndex) => frontDepth + 0.035 + sampleIndex * 0.052 + (index % 4) * 0.006);
    const points = samples.map((depth) => {
      const worldPosition = state.timePosition + depth + index * 0.002;
      const angle = baseAngle + tubeTwist(worldPosition) + 10;
      const radius = tunnelRadius(depth) + ((index % 5) - 2) * 1.8;

      return tunnelPoint(radius, angle, depth, state.phase);
    });

    return points.map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  });
}

function radialSpeedLines(state: WormholeState, options?: { count?: number; sampleCount?: number }) {
  const count = options?.count ?? 72;
  const sampleCount = options?.sampleCount ?? 10;
  const frontDepth = tunnelFrontDepth(state);

  return Array.from({ length: count }, (_, index) => {
    const baseAngle = index * (360 / count) + (index % 3) * 1.2;
    const samples = Array.from({ length: sampleCount }, (_, sampleIndex) => frontDepth + 0.035 + sampleIndex * 0.04);
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

type RingSlot = {
  slotIndex: number;
  ring: TimeRing | null;
};

const ringSlotCount = 34;

function stableRingSlots(rings: TimeRing[]): RingSlot[] {
  return Array.from({ length: ringSlotCount }, (_, slotIndex) => ({
    slotIndex,
    ring: rings[slotIndex] ?? null
  }));
}

function ringEdgeDissolve(depth: number, timePosition: number) {
  if (timePosition < 0.025) return 1;
  if (depth > 0.18) return 1;

  return Math.max(0.08, depth / 0.18);
}
