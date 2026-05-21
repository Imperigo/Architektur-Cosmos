'use client';

import { memo, useEffect, useRef } from 'react';
import { atlasSize, sectorMidAngle, styleSectorColors, styleSectors } from '@/lib/atlas-layout';
import {
  radiusToTunnelDepth,
  tubeTwist,
  tunnelCenter,
  tunnelFrontDepth,
  tunnelOpacity,
  tunnelPoint,
  tunnelRadius,
  wormholeRings,
  wormholeTunnel,
  type WormholeState
} from '@/lib/wormhole-layout';

type WormholeCanvasProps = {
  state: WormholeState;
  isMoving: boolean;
  quality: 'reduced' | 'balanced' | 'full';
};

const energyColors = ['#00f5ff', '#55fff0', '#a56bff', '#ff38f5', '#ffd43d', '#ff4b20', '#65ff73'];
const starField = Array.from({ length: 132 }, (_, index) => {
  const xSeed = seededUnit(index, 17.13);
  const ySeed = seededUnit(index, 83.71);
  return {
    x: xSeed,
    y: ySeed,
    size: 0.45 + seededUnit(index, 41.9) * 1.25,
    depth: seededUnit(index, 11.37),
    hue: seededUnit(index, 63.2),
    phase: seededUnit(index, 7.7) * Math.PI * 2
  };
});

function WormholeCanvasComponent({ state, isMoving, quality }: WormholeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const stateRef = useRef({ state, isMoving, quality, idlePhase: 0 });

  useEffect(() => {
    stateRef.current = { ...stateRef.current, state, isMoving, quality };
  }, [state, isMoving, quality]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const targetCanvas = canvas;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;
    const targetContext = context;

    function resizeCanvas() {
      const rect = targetCanvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, stateRef.current.quality === 'full' ? 2 : 1.5);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));

      if (targetCanvas.width !== width || targetCanvas.height !== height) {
        targetCanvas.width = width;
        targetCanvas.height = height;
      }

      targetCanvas.dataset.dpr = String(dpr);
      scheduleDraw();
    }

    function scheduleDraw() {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        drawWormholeCanvas(targetContext, targetCanvas, stateRef.current);
      });
    }

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(targetCanvas);
    resizeCanvas();

    return () => {
      resizeObserver.disconnect();
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !context) return;

    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      drawWormholeCanvas(context, canvas, stateRef.current);
    });
  }, [state.timePosition, state.phase, state.edgeTension, isMoving, quality]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !context || quality === 'reduced') return;

    const targetCanvas = canvas;
    const targetContext = context;
    let animationFrame: number | null = null;
    let lastDraw = 0;

    function tick(time: number) {
      const current = stateRef.current;
      if (!current.isMoving) {
        current.idlePhase = time * 0.00012;
        if (time - lastDraw > 48) {
          lastDraw = time;
          drawWormholeCanvas(targetContext, targetCanvas, current);
        }
      }
      animationFrame = window.requestAnimationFrame(tick);
    }

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [quality]);

  return <canvas ref={canvasRef} className="wormhole-canvas" aria-hidden="true" />;
}

export const WormholeCanvas = memo(WormholeCanvasComponent);

function drawWormholeCanvas(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  props: { state: WormholeState; isMoving: boolean; quality: 'reduced' | 'balanced' | 'full'; idlePhase?: number }
) {
  const dpr = Number(canvas.dataset.dpr || 1);
  const cssWidth = canvas.width / dpr;
  const cssHeight = canvas.height / dpr;
  const viewport = viewportToAtlas(cssWidth, cssHeight);
  const { state, isMoving, quality, idlePhase = 0 } = props;
  const isReduced = quality === 'reduced';
  const isFull = quality === 'full';

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);
  context.fillStyle = '#050505';
  context.fillRect(0, 0, cssWidth, cssHeight);
  drawSpaceBackground(context, cssWidth, cssHeight, state, { quality, isMoving, idlePhase });
  context.save();
  context.translate(viewport.x, viewport.y);
  context.scale(viewport.scale, viewport.scale);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  drawVignette(context, state);
  if (!isReduced) drawStyleDepthFields(context, state, { isMoving, quality, idlePhase });
  drawGrid(context, state, { quality, isMoving });
  if (!isReduced && !isMoving) drawIdleMotion(context, state, idlePhase);
  if (!isReduced && (!isMoving || isFull)) drawEnergyBands(context, state, { quality, isMoving, idlePhase });
  drawRings(context, state, { isMoving, idlePhase });

  context.restore();
}

function drawSpaceBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: WormholeState,
  options: { quality: 'reduced' | 'balanced' | 'full'; isMoving: boolean; idlePhase: number }
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const diagonal = Math.hypot(width, height);
  const motion = state.timePosition * 0.038 + (options.isMoving ? state.phase * 0.06 : options.idlePhase * 0.012);
  const starCount = options.quality === 'reduced' ? 54 : options.quality === 'balanced' ? 88 : starField.length;

  const nebula = context.createRadialGradient(centerX, centerY, diagonal * 0.08, centerX, centerY, diagonal * 0.72);
  nebula.addColorStop(0, 'rgba(5,5,5,0)');
  nebula.addColorStop(0.36, 'rgba(0,245,255,0.028)');
  nebula.addColorStop(0.58, 'rgba(165,107,255,0.035)');
  nebula.addColorStop(0.78, 'rgba(255,56,245,0.026)');
  nebula.addColorStop(1, 'rgba(5,5,5,0)');
  context.fillStyle = nebula;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(centerX, centerY);
  context.rotate(motion * 0.05);
  context.translate(-centerX, -centerY);

  for (let index = 0; index < starCount; index += 1) {
    const star = starField[index];
    if (!star) continue;

    const parallax = 1 + star.depth * 0.036 * state.timePosition;
    const x = centerX + (star.x * width - centerX) * parallax;
    const y = centerY + (star.y * height - centerY) * parallax;
    if (x < -8 || x > width + 8 || y < -8 || y > height + 8) continue;

    const distance = Math.hypot(x - centerX, y - centerY) / Math.max(1, diagonal * 0.5);
    const centerFade = Math.min(1, Math.max(0.14, (distance - 0.16) / 0.32));
    const edgeFade = Math.max(0, 1 - Math.max(0, distance - 0.74) / 0.32);
    const twinkle = options.isMoving ? 0.72 : 0.72 + Math.sin(options.idlePhase * (1.7 + star.depth) + star.phase) * 0.18;
    const alpha = (0.13 + star.depth * 0.5) * centerFade * edgeFade * twinkle;
    if (alpha <= 0.02) continue;

    context.beginPath();
    context.fillStyle = starColor(star.hue, alpha);
    context.arc(x, y, star.size * (0.8 + star.depth * 0.7), 0, Math.PI * 2);
    context.fill();
  }

  if (options.quality !== 'reduced') {
    drawCosmicDust(context, width, height, state, options);
  }

  context.restore();
}

function drawCosmicDust(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: WormholeState,
  options: { isMoving: boolean; idlePhase: number }
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const orbitCount = options.isMoving ? 5 : 8;
  const baseRadius = Math.min(width, height) * 0.42;

  for (let index = 0; index < orbitCount; index += 1) {
    const radius = baseRadius + index * Math.min(width, height) * 0.055;
    const start = state.phase * 0.0009 + options.idlePhase * 0.038 + index * 0.72;
    const sweep = 0.32 + seededUnit(index, 19.2) * 0.34;

    context.beginPath();
    context.ellipse(centerX, centerY + Math.sin(index) * 8, radius * 1.18, radius * (0.58 + index * 0.018), start, start + Math.PI * 0.12, start + Math.PI * (0.12 + sweep));
    context.strokeStyle = withAlpha(energyColor(index + 2), options.isMoving ? 0.035 : 0.058);
    context.lineWidth = 0.7;
    context.setLineDash([1, 18 + index * 3]);
    context.lineDashOffset = -state.timePosition * 18 - options.idlePhase * 44 - index * 11;
    context.stroke();
  }

  context.setLineDash([]);
}

function viewportToAtlas(width: number, height: number) {
  const scale = Math.min(width / atlasSize.width, height / atlasSize.height);
  const renderedWidth = atlasSize.width * scale;
  const renderedHeight = atlasSize.height * scale;

  return {
    scale,
    x: (width - renderedWidth) / 2,
    y: (height - renderedHeight) / 2
  };
}

function drawVignette(context: CanvasRenderingContext2D, state: WormholeState) {
  const edgeCompression = Math.min(1, Math.abs(state.edgeTension) / 0.065);
  const radius = wormholeTunnel.maxRadius + 28 - edgeCompression * 24;
  const gradient = context.createRadialGradient(atlasSize.cx, atlasSize.cy + 8, 12, atlasSize.cx, atlasSize.cy + 8, radius);

  gradient.addColorStop(0, 'rgba(5,5,5,0.04)');
  gradient.addColorStop(0.14, 'rgba(5,5,5,0.2)');
  gradient.addColorStop(0.27, 'rgba(0,245,255,0.34)');
  gradient.addColorStop(0.42, 'rgba(165,107,255,0.31)');
  gradient.addColorStop(0.57, 'rgba(255,56,245,0.23)');
  gradient.addColorStop(0.72, 'rgba(255,212,61,0.22)');
  gradient.addColorStop(0.88, 'rgba(255,75,32,0.16)');
  gradient.addColorStop(1, 'rgba(5,5,5,0)');

  context.globalAlpha = Math.max(0.62, 0.96 - state.timePosition * 0.18);
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(atlasSize.cx, atlasSize.cy + 8, radius, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
}

function drawGrid(context: CanvasRenderingContext2D, state: WormholeState, options: { quality: 'reduced' | 'balanced' | 'full'; isMoving: boolean }) {
  const { quality, isMoving } = options;
  const isReduced = quality === 'reduced';
  const spokeStride = isReduced ? 10 : isMoving ? 8 : quality === 'full' ? 4 : 5;
  const sampleCount = isReduced ? 8 : isMoving ? 10 : quality === 'full' ? 24 : 17;
  const frontDepth = tunnelFrontDepth(state);

  for (let spoke = 0; spoke < 72; spoke += spokeStride) {
    context.beginPath();
    for (let index = 0; index < sampleCount; index += 1) {
      const depth = frontDepth + (index / Math.max(1, sampleCount - 1)) * (wormholeTunnel.visibleDepth - frontDepth);
      const worldPosition = state.timePosition + depth;
      const angle = spoke * 5 + tubeTwist(worldPosition);
      const point = tunnelPoint(tunnelRadius(depth), angle, depth, state.phase);

      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }

    context.strokeStyle = spoke % 4 === 0 ? 'rgba(255,248,214,0.64)' : withAlpha(energyColor(spoke), 0.58);
    context.lineWidth = spoke % 6 === 0 ? 1.2 : 0.68;
    context.globalAlpha = isMoving ? (spoke % 6 === 0 ? 0.24 : 0.11) : (spoke % 6 === 0 ? 0.5 : 0.3);
    context.setLineDash([1, spoke % 6 === 0 ? 12 : 18]);
    context.stroke();
  }

  context.setLineDash([]);
  context.globalAlpha = 1;
}

function drawStyleDepthFields(
  context: CanvasRenderingContext2D,
  state: WormholeState,
  options: { isMoving: boolean; quality: 'reduced' | 'balanced' | 'full'; idlePhase: number }
) {
  const frontDepth = tunnelFrontDepth(state);
  const depthSamples = options.quality === 'full' ? [0.07, 0.24, 0.43, 0.66, 0.9] : [0.08, 0.32, 0.6, 0.86];
  const motionPhase = options.idlePhase * 10.5 + state.timePosition * 18;
  const baseOpacity = options.isMoving ? 0.026 : options.quality === 'full' ? 0.072 : 0.058;

  context.save();
  context.globalCompositeOperation = 'screen';

  depthSamples.forEach((relativeDepth, depthIndex) => {
    const depth = frontDepth + relativeDepth;
    if (depth <= 0 || depth >= wormholeTunnel.visibleDepth) return;

    const center = tunnelCenter(depth, state.phase);
    const radius = tunnelRadius(depth);
    const thickness = Math.max(18, radius * (0.08 + depthIndex * 0.012));
    const depthOpacity = tunnelOpacity(depth) * ringEdgeDissolve(depth, state.timePosition) * baseOpacity * (1.15 - depthIndex * 0.08);

    styleSectors.forEach((sector, sectorIndex) => {
      const accent = styleSectorColors[sector.id];
      const centerAngle = sectorMidAngle(sector) + Math.sin(motionPhase * 0.12 + sectorIndex * 0.9 + depthIndex) * 1.8;
      const span = sectorSpan(sector.startAngle, sector.endAngle);
      const start = toRadians(centerAngle - span * 0.36);
      const end = toRadians(centerAngle + span * 0.36);
      const pulse = options.isMoving ? 1 : 0.86 + Math.sin(motionPhase * 0.22 + sectorIndex * 1.7 + depthIndex * 0.8) * 0.14;

      context.beginPath();
      context.arc(center.x, center.y, radius, start, end);
      context.strokeStyle = withAlpha(accent, depthOpacity * pulse);
      context.lineWidth = thickness;
      context.setLineDash(depthIndex % 2 === 0 ? [36, 28] : [24, 36]);
      context.lineDashOffset = -motionPhase * (2.8 + depthIndex * 0.4) - sectorIndex * 18;
      context.stroke();
    });
  });

  context.setLineDash([]);
  context.globalCompositeOperation = 'source-over';
  context.restore();
}

function drawRings(context: CanvasRenderingContext2D, state: WormholeState, options: { isMoving: boolean; idlePhase: number }) {
  const rings = wormholeRings(state);

  rings.forEach((ring, index) => {
    const depth = ring.depth ?? radiusToTunnelDepth(ring.radius);
    const center = tunnelCenter(depth, state.phase);
    const opacity = tunnelOpacity(depth) * ringEdgeDissolve(depth, state.timePosition);
    const movingScale = options.isMoving ? 0.72 : 1;
    const ringOpacity = movingScale * (ring.mode === 'local' ? 1 : Math.max(0.32, 0.84 - Math.max(0, depth) * 0.18)) * opacity;

    if (ringOpacity <= 0.01) return;

    context.beginPath();
    context.arc(center.x, center.y, ring.radius, 0, Math.PI * 2);
    context.strokeStyle = ring.mode === 'local' ? '#fff8d6' : ring.weight === 'major' ? '#ffd43d' : 'rgba(247,247,244,0.9)';
    context.lineWidth = ring.mode === 'local' ? 1.74 : ring.weight === 'major' ? 1.18 : 0.78;
    context.globalAlpha = ringOpacity;
    context.setLineDash(ring.mode === 'local' ? [2, 9] : ring.weight === 'major' ? [1, 8] : [1, 12]);
    context.lineDashOffset = -index * 0.9 - state.timePosition * 20 - (options.isMoving ? 0 : options.idlePhase * 16);
    context.stroke();
  });

  context.setLineDash([]);
  context.globalAlpha = 1;
}

function drawEnergyBands(context: CanvasRenderingContext2D, state: WormholeState, options: { quality: 'reduced' | 'balanced' | 'full'; isMoving: boolean; idlePhase: number }) {
  const rings = wormholeRings(state);
  const bandScale = options.quality === 'reduced' ? 0.28 : options.isMoving ? 0.48 : options.quality === 'full' ? 1.24 : 0.86;

  rings.forEach((ring, index) => {
    const depth = ring.depth ?? radiusToTunnelDepth(ring.radius);
    if (depth < 0.035 || depth > 0.92) return;

    const center = tunnelCenter(depth, state.phase);
    const opacity = tunnelOpacity(depth) * ringEdgeDissolve(depth, state.timePosition);
    const idlePulse = options.isMoving ? 1 : 0.84 + Math.sin(options.idlePhase * 4.2 + index * 0.7) * 0.16;
    const bandOpacity = (ring.mode === 'local' ? 0.28 : ring.weight === 'major' ? 0.2 : 0.105) * opacity * bandScale * idlePulse;

    context.beginPath();
    context.arc(center.x, center.y, ring.radius, 0, Math.PI * 2);
    context.strokeStyle = energyColor(index + (ring.weight === 'major' ? 2 : 0));
    context.lineWidth = ring.mode === 'local' ? 12 : ring.weight === 'major' ? 7.4 : 4.4;
    context.globalAlpha = bandOpacity;
    context.stroke();
  });

  context.globalAlpha = 1;
}

function drawIdleMotion(context: CanvasRenderingContext2D, state: WormholeState, idlePhase: number) {
  const frontDepth = tunnelFrontDepth(state);

  [frontDepth + 0.12, frontDepth + 0.34, frontDepth + 0.58].filter((depth) => depth < 0.92).forEach((depth, index) => {
    const center = tunnelCenter(depth, state.phase);
    context.beginPath();
    const breathingRadius = tunnelRadius(depth) + index * 4 + Math.sin(idlePhase * 3.4 + index) * 1.6;
    context.arc(center.x, center.y, breathingRadius, 0, Math.PI * 2);
    context.strokeStyle = energyColor(index + 1);
    context.lineWidth = index === 1 ? 1.05 : 0.76;
    context.globalAlpha = 0.4 - index * 0.055;
    context.setLineDash(index === 1 ? [1, 18] : [1, 24]);
    context.lineDashOffset = -state.timePosition * 80 - index * 9 - idlePhase * 140;
    context.stroke();
  });

  context.setLineDash([]);
  context.globalAlpha = 1;
}

function ringEdgeDissolve(depth: number, timePosition: number) {
  const front = Math.min(1, Math.max(0, (depth + 0.04) / 0.18));
  const back = Math.min(1, Math.max(0, (wormholeTunnel.visibleDepth - depth) / 0.22));
  const startDissolve = timePosition < 0.04 && depth < 0.08 ? timePosition / 0.04 : 1;
  return front * back * startDissolve;
}

function energyColor(index: number) {
  return energyColors[index % energyColors.length] ?? '#00e7ff';
}

function sectorSpan(startAngle: number, endAngle: number) {
  return endAngle < startAngle ? endAngle + 360 - startAngle : endAngle - startAngle;
}

function toRadians(angle: number) {
  return (angle * Math.PI) / 180;
}

function starColor(hueSeed: number, alpha: number) {
  if (hueSeed < 0.18) return `rgba(255,248,214,${alpha})`;
  if (hueSeed < 0.42) return `rgba(156,255,247,${alpha})`;
  if (hueSeed < 0.68) return `rgba(210,184,255,${alpha})`;
  return `rgba(255,205,244,${alpha})`;
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function seededUnit(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}
