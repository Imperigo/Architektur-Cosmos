'use client';

import { memo, useEffect, useRef } from 'react';
import { atlasSize } from '@/lib/atlas-layout';
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

const energyColors = ['#00e7ff', '#9cfff7', '#8f5cff', '#ff4fd8', '#ffd16d', '#ff4d1f'];

function WormholeCanvasComponent({ state, isMoving, quality }: WormholeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const stateRef = useRef({ state, isMoving, quality });

  useEffect(() => {
    stateRef.current = { state, isMoving, quality };
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

  return <canvas ref={canvasRef} className="wormhole-canvas" aria-hidden="true" />;
}

export const WormholeCanvas = memo(WormholeCanvasComponent);

function drawWormholeCanvas(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  props: { state: WormholeState; isMoving: boolean; quality: 'reduced' | 'balanced' | 'full' }
) {
  const dpr = Number(canvas.dataset.dpr || 1);
  const cssWidth = canvas.width / dpr;
  const cssHeight = canvas.height / dpr;
  const viewport = viewportToAtlas(cssWidth, cssHeight);
  const { state, isMoving, quality } = props;
  const isReduced = quality === 'reduced';
  const isFull = quality === 'full';

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);
  context.fillStyle = '#050505';
  context.fillRect(0, 0, cssWidth, cssHeight);
  context.save();
  context.translate(viewport.x, viewport.y);
  context.scale(viewport.scale, viewport.scale);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  drawVignette(context, state);
  drawGrid(context, state, { quality, isMoving });
  if (!isReduced && !isMoving) drawIdleMotion(context, state);
  if (!isReduced && (!isMoving || isFull)) drawEnergyBands(context, state, { quality, isMoving });
  drawRings(context, state, { isMoving });

  context.restore();
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

  gradient.addColorStop(0, 'rgba(5,5,5,0.06)');
  gradient.addColorStop(0.18, 'rgba(5,5,5,0.28)');
  gradient.addColorStop(0.31, 'rgba(0,231,255,0.22)');
  gradient.addColorStop(0.48, 'rgba(143,92,255,0.2)');
  gradient.addColorStop(0.66, 'rgba(255,209,109,0.14)');
  gradient.addColorStop(0.82, 'rgba(255,77,31,0.1)');
  gradient.addColorStop(1, 'rgba(5,5,5,0)');

  context.globalAlpha = Math.max(0.48, 0.84 - state.timePosition * 0.22);
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

    context.strokeStyle = spoke % 4 === 0 ? 'rgba(255,243,209,0.5)' : withAlpha(energyColor(spoke), 0.42);
    context.lineWidth = spoke % 6 === 0 ? 1.05 : 0.58;
    context.globalAlpha = isMoving ? (spoke % 6 === 0 ? 0.18 : 0.08) : (spoke % 6 === 0 ? 0.38 : 0.22);
    context.setLineDash([1, spoke % 6 === 0 ? 12 : 18]);
    context.stroke();
  }

  context.setLineDash([]);
  context.globalAlpha = 1;
}

function drawRings(context: CanvasRenderingContext2D, state: WormholeState, options: { isMoving: boolean }) {
  const rings = wormholeRings(state);

  rings.forEach((ring, index) => {
    const depth = ring.depth ?? radiusToTunnelDepth(ring.radius);
    const center = tunnelCenter(depth, state.phase);
    const opacity = tunnelOpacity(depth) * ringEdgeDissolve(depth, state.timePosition);
    const movingScale = options.isMoving ? 0.72 : 1;
    const ringOpacity = movingScale * (ring.mode === 'local' ? 0.94 : Math.max(0.24, 0.72 - Math.max(0, depth) * 0.22)) * opacity;

    if (ringOpacity <= 0.01) return;

    context.beginPath();
    context.arc(center.x, center.y, ring.radius, 0, Math.PI * 2);
    context.strokeStyle = ring.mode === 'local' ? '#fff8d6' : ring.weight === 'major' ? '#ffd16d' : '#f7f7f4';
    context.lineWidth = ring.mode === 'local' ? 1.58 : ring.weight === 'major' ? 1.08 : 0.72;
    context.globalAlpha = ringOpacity;
    context.setLineDash(ring.mode === 'local' ? [2, 9] : ring.weight === 'major' ? [1, 8] : [1, 12]);
    context.lineDashOffset = -index * 0.9 - state.timePosition * 20;
    context.stroke();
  });

  context.setLineDash([]);
  context.globalAlpha = 1;
}

function drawEnergyBands(context: CanvasRenderingContext2D, state: WormholeState, options: { quality: 'reduced' | 'balanced' | 'full'; isMoving: boolean }) {
  const rings = wormholeRings(state);
  const bandScale = options.quality === 'reduced' ? 0.25 : options.isMoving ? 0.34 : options.quality === 'full' ? 1 : 0.62;

  rings.forEach((ring, index) => {
    const depth = ring.depth ?? radiusToTunnelDepth(ring.radius);
    if (depth < 0.035 || depth > 0.92) return;

    const center = tunnelCenter(depth, state.phase);
    const opacity = tunnelOpacity(depth) * ringEdgeDissolve(depth, state.timePosition);
    const bandOpacity = (ring.mode === 'local' ? 0.18 : ring.weight === 'major' ? 0.12 : 0.065) * opacity * bandScale;

    context.beginPath();
    context.arc(center.x, center.y, ring.radius, 0, Math.PI * 2);
    context.strokeStyle = energyColor(index + (ring.weight === 'major' ? 2 : 0));
    context.lineWidth = ring.mode === 'local' ? 9 : ring.weight === 'major' ? 6 : 3.6;
    context.globalAlpha = bandOpacity;
    context.stroke();
  });

  context.globalAlpha = 1;
}

function drawIdleMotion(context: CanvasRenderingContext2D, state: WormholeState) {
  const frontDepth = tunnelFrontDepth(state);

  [frontDepth + 0.12, frontDepth + 0.34, frontDepth + 0.58].filter((depth) => depth < 0.92).forEach((depth, index) => {
    const center = tunnelCenter(depth, state.phase);
    context.beginPath();
    context.arc(center.x, center.y, tunnelRadius(depth) + index * 4, 0, Math.PI * 2);
    context.strokeStyle = energyColor(index + 1);
    context.lineWidth = index === 1 ? 0.75 : 0.55;
    context.globalAlpha = 0.22 - index * 0.035;
    context.setLineDash(index === 1 ? [1, 18] : [1, 24]);
    context.lineDashOffset = -state.timePosition * 80 - index * 9;
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

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
