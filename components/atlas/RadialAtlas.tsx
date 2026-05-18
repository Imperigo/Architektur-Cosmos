'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { ProjectDetailCard } from '@/components/atlas/ProjectDetailCard';
import { ProjectMediaGrid } from '@/components/atlas/ProjectMediaGrid';
import { RelationOverlay } from '@/components/atlas/RelationOverlay';
import { SemanticEntryNode } from '@/components/atlas/SemanticEntryNode';
import { StyleSectors } from '@/components/atlas/StyleSectors';
import { WormholeRings } from '@/components/atlas/WormholeRings';
import { atlasSize, styleSectors } from '@/lib/atlas-layout';
import type { Entry, EntryRelation, StyleSectorId } from '@/lib/types';
import { formatYear, layoutWormholeEntries, positionToYear, wormholeState, type WormholeEntryNode } from '@/lib/wormhole-layout';

type SvgPoint = {
  x: number;
  y: number;
};

type MotionSnapshot = {
  currentTravel: number;
  targetTravel: number;
  velocity: number;
  isMoving: boolean;
  isSettling: boolean;
};

const hoverRadius = 76;
type IntroState = 'intro' | 'launching' | 'idle';
type ObjectInteractionState = 'idle' | 'approach' | 'preview' | 'focus' | 'morphing' | 'dossier';
type HoverFocusLevel = 'none' | 'approach' | 'preview' | 'focus' | 'magnify';
type MorphPhase = 'opening' | 'closing' | null;
type SourceLens = 'afasia' | null;

export function RadialAtlas({ entries, relations }: { entries: Entry[]; relations: EntryRelation[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showRelations, setShowRelations] = useState(false);
  const [activeStyleLens, setActiveStyleLens] = useState<StyleSectorId | null>(null);
  const [activeSourceLens, setActiveSourceLens] = useState<SourceLens>(null);
  const [motion, setMotion] = useState<MotionSnapshot>({
    currentTravel: 0,
    targetTravel: 0,
    velocity: 0,
    isMoving: false,
    isSettling: true
  });
  const [introState, setIntroState] = useState<IntroState>('intro');
  const [snappedEntryId, setSnappedEntryId] = useState<string | null>(null);
  const [hoverEntryId, setHoverEntryId] = useState<string | null>(null);
  const [hoverDurationMs, setHoverDurationMs] = useState(0);
  const [morphingEntryId, setMorphingEntryId] = useState<string | null>(null);
  const [morphPhase, setMorphPhase] = useState<MorphPhase>(null);
  const [morphAnchor, setMorphAnchor] = useState<SvgPoint | null>(null);
  const [pointerPoint, setPointerPoint] = useState<SvgPoint | null>(null);
  const [showDatabasePanel, setShowDatabasePanel] = useState(false);
  const [isDatabaseHovered, setIsDatabaseHovered] = useState(false);
  const [debugFps, setDebugFps] = useState<number | null>(null);
  const motionRef = useRef({
    currentTravel: 0,
    targetTravel: 0,
    velocity: 0,
    frame: null as number | null,
    timeout: null as number | null
  });
  const hoverDurationTimerRef = useRef<number | null>(null);
  const morphTimeoutRef = useRef<number | null>(null);
  const pendingPointerPointRef = useRef<SvgPoint | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const showMotionDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'motion';
  const state = useMemo(() => wormholeState(motion.currentTravel), [motion.currentTravel]);
  const activeSelectedEntryId = selectedEntry?.id;
  const activeSnappedEntryId = snappedEntryId;
  const activeHoverEntryId = hoverEntryId;
  const nodes = useMemo(() => layoutWormholeEntries(entries, state, activeSelectedEntryId), [activeSelectedEntryId, entries, state]);
  const displayNodes = useMemo(() => limitDisplayNodes(nodes), [nodes]);
  const snappedNode = useMemo(() => displayNodes.find((node) => node.entry.id === activeSnappedEntryId) ?? null, [activeSnappedEntryId, displayNodes]);
  const hoverNode = useMemo(() => displayNodes.find((node) => node.entry.id === activeHoverEntryId) ?? null, [activeHoverEntryId, displayNodes]);
  const morphNode = useMemo(() => displayNodes.find((node) => node.entry.id === morphingEntryId) ?? null, [displayNodes, morphingEntryId]);
  const approachNode = useMemo(() => {
    if (!pointerPoint || hoverNode || snappedNode || morphPhase || motion.isMoving || introState !== 'idle') return null;

    const nearest = nearestNode(pointerPoint, displayNodes);
    if (!nearest) return null;

    return nearest.distance <= hoverRadius * 1.45 + nearest.node.size * 0.35 ? nearest.node : null;
  }, [displayNodes, hoverNode, introState, morphPhase, motion.isMoving, pointerPoint, snappedNode]);
  const isTraveling = motion.isMoving;
  const isSettling = motion.isSettling;
  const isMorphing = morphPhase !== null;
  const isHoverPreviewActive = Boolean(hoverNode && !snappedNode && !isTraveling && !isMorphing);
  const isHoverFocusActive = isHoverPreviewActive && isSettling && hoverDurationMs >= 1050;
  const isHoverMagnifyActive = isHoverPreviewActive && isSettling && hoverDurationMs >= 4000;
  const hoverFocusLevel: HoverFocusLevel = isHoverMagnifyActive ? 'magnify' : isHoverFocusActive ? 'focus' : isHoverPreviewActive ? 'preview' : approachNode ? 'approach' : 'none';
  const interactionState: ObjectInteractionState = snappedNode ? 'dossier' : isMorphing ? 'morphing' : isHoverMagnifyActive || isHoverFocusActive ? 'focus' : isHoverPreviewActive ? 'preview' : approachNode ? 'approach' : 'idle';
  const focusNode = hoverNode ?? approachNode;
  const sourceLensCount = useMemo(() => entries.filter((entry) => isSourceLensEntry(entry, 'afasia')).length, [entries]);
  const cameraFocus = focusCameraOffset(focusNode, hoverFocusLevel);
  const cursorPoint = cursorAnchorPoint(pointerPoint, hoverNode, cameraFocus, isTraveling || isMorphing, introState, hoverFocusLevel, Boolean(snappedNode));
  const isIntroActive = introState !== 'idle';
  const backgroundStyle = {
    filter: isIntroActive ? 'blur(7px)' : 'blur(0px)',
    opacity: snappedNode ? 0.48 : isMorphing ? 0.62 : introState === 'intro' ? 0.3 : introState === 'launching' ? 0.82 : 1,
    transition: 'filter 520ms cubic-bezier(0.19, 1, 0.22, 1), opacity 520ms cubic-bezier(0.19, 1, 0.22, 1)'
  };

  useEffect(() => {
    if (introState !== 'launching') return;

    const timeout = window.setTimeout(() => {
      setIntroState('idle');
      const currentMotion = motionRef.current;
      if (currentMotion.frame !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(currentMotion.frame);
      }

      if (currentMotion.timeout !== null) {
        window.clearTimeout(currentMotion.timeout);
      }

      motionRef.current = {
        currentTravel: 0,
        targetTravel: 0,
        velocity: 0,
        frame: null,
        timeout: null
      };

      setMotion({
        currentTravel: 0,
        targetTravel: 0,
        velocity: 0,
        isMoving: false,
        isSettling: true
      });
    }, 1650);

    return () => window.clearTimeout(timeout);
  }, [introState]);

  useEffect(() => {
    clearHoverTimers();

    if (!hoverNode || snappedNode || isMorphing || isTraveling || !isSettling) {
      return;
    }

    const startedAt = window.performance.now();

    const updateHoverDuration = () => {
      setHoverDurationMs(Math.round(window.performance.now() - startedAt));
      hoverDurationTimerRef.current = window.setTimeout(updateHoverDuration, 140);
    };

    hoverDurationTimerRef.current = window.setTimeout(updateHoverDuration, 140);
    return clearHoverTimers;
  }, [hoverNode, isMorphing, isSettling, isTraveling, snappedNode]);

  useEffect(() => {
    if (!showMotionDebug) return;

    let frame: number | null = null;
    let lastTime = window.performance.now();
    let frames = 0;

    function tick(now: number) {
      frames += 1;

      if (now - lastTime >= 600) {
        setDebugFps(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }

      frame = window.requestAnimationFrame(tick);
    }

    frame = window.requestAnimationFrame(tick);
    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [showMotionDebug]);

  useEffect(() => {
    const preventBrowserWheel = (event: WheelEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    const preventBrowserTouch = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };

    window.addEventListener('wheel', preventBrowserWheel, { capture: true, passive: false });
    window.addEventListener('touchmove', preventBrowserTouch, { capture: true, passive: false });
    window.addEventListener('gesturestart', preventBrowserWheel as unknown as EventListener, { capture: true, passive: false });
    window.addEventListener('gesturechange', preventBrowserWheel as unknown as EventListener, { capture: true, passive: false });

    return () => {
      window.removeEventListener('wheel', preventBrowserWheel, { capture: true });
      window.removeEventListener('touchmove', preventBrowserTouch, { capture: true });
      window.removeEventListener('gesturestart', preventBrowserWheel as unknown as EventListener, { capture: true });
      window.removeEventListener('gesturechange', preventBrowserWheel as unknown as EventListener, { capture: true });

      const currentMotion = motionRef.current;
      if (currentMotion.frame !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(currentMotion.frame);
      }

      if (currentMotion.timeout !== null) {
        window.clearTimeout(currentMotion.timeout);
      }

      if (pointerFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerFrameRef.current);
      }

      clearHoverTimers();

      if (morphTimeoutRef.current !== null) {
        window.clearTimeout(morphTimeoutRef.current);
      }
    };
  }, []);

  function clearHoverTimers() {
    if (hoverDurationTimerRef.current !== null) {
      window.clearTimeout(hoverDurationTimerRef.current);
      hoverDurationTimerRef.current = null;
    }
  }

  function clearHoverState() {
    clearHoverTimers();
    setHoverEntryId(null);
    setHoverDurationMs(0);
  }

  function startIntro() {
    if (introState === 'idle') return;

    resetMotion(0);
    setIntroState('launching');
  }

  function travelBy(delta: number) {
    if (introState !== 'idle') {
      startIntro();
      return;
    }

    releaseSnap(true);
    nudgeTravel(delta);
  }

  function focusNodeInView(node: WormholeEntryNode) {
    openDossierFromNode(node);
  }

  function openDossierFromNode(node: WormholeEntryNode) {
    if (isMorphing) return;

    if (morphTimeoutRef.current !== null) {
      window.clearTimeout(morphTimeoutRef.current);
      morphTimeoutRef.current = null;
    }

    clearHoverTimers();
    setSelectedEntry(node.entry);
    setHoverEntryId(node.entry.id);
    setMorphingEntryId(node.entry.id);
    setMorphAnchor(applyCameraToPoint(node, cameraFocus));
    setMorphPhase('opening');

    morphTimeoutRef.current = window.setTimeout(() => {
      setSnappedEntryId(node.entry.id);
      setMorphPhase(null);
      setMorphingEntryId(null);
      morphTimeoutRef.current = null;
    }, 360);
  }

  function releaseSnap(immediate = false) {
    if (morphTimeoutRef.current !== null) {
      window.clearTimeout(morphTimeoutRef.current);
      morphTimeoutRef.current = null;
    }

    clearHoverState();

    if (!snappedNode || immediate) {
      setSnappedEntryId(null);
      setMorphPhase(null);
      setMorphingEntryId(null);
      setMorphAnchor(null);
      setSelectedEntry(null);
      return;
    }

    setMorphingEntryId(snappedNode.entry.id);
    setMorphAnchor(applyCameraToPoint(snappedNode, { x: 0, y: 0, scale: 1 }));
    setMorphPhase('closing');
    setSnappedEntryId(null);

    morphTimeoutRef.current = window.setTimeout(() => {
      setMorphPhase(null);
      setMorphingEntryId(null);
      setMorphAnchor(null);
      setSelectedEntry(null);
      morphTimeoutRef.current = null;
    }, 320);
  }

  function resetMotion(value: number) {
    cancelMotionStep();

    motionRef.current = {
      currentTravel: value,
      targetTravel: value,
      velocity: 0,
      frame: null,
      timeout: null
    };

    setMotion({
      currentTravel: value,
      targetTravel: value,
      velocity: 0,
      isMoving: false,
      isSettling: true
    });
  }

  function nudgeTravel(delta: number) {
    const ref = motionRef.current;
    const boundedDelta = Math.max(-0.052, Math.min(0.052, delta));
    ref.targetTravel = advanceTravel(ref.targetTravel, boundedDelta);
    ref.velocity += boundedDelta * 0.18;
    setMotion((current) => ({
      ...current,
      targetTravel: roundMotion(ref.targetTravel),
      velocity: roundMotion(ref.velocity),
      isMoving: true,
      isSettling: false
    }));

    scheduleMotionStep();
  }

  function stepMotion() {
    const ref = motionRef.current;
    cancelMotionStep();

    const delta = ref.targetTravel - ref.currentTravel;
    const nextVelocity = ref.velocity * 0.62 + delta * 0.18;
    const nextTravel = advanceTravel(ref.currentTravel, nextVelocity);
    const settled = Math.abs(ref.targetTravel - nextTravel) < 0.00035 && Math.abs(nextVelocity) < 0.00028;

    ref.currentTravel = settled ? ref.targetTravel : nextTravel;
    ref.velocity = settled ? 0 : nextVelocity;

    setMotion({
      currentTravel: roundMotion(ref.currentTravel),
      targetTravel: roundMotion(ref.targetTravel),
      velocity: roundMotion(ref.velocity),
      isMoving: !settled,
      isSettling: settled
    });

    if (!settled) {
      scheduleMotionStep();
    }
  }

  function scheduleMotionStep() {
    const ref = motionRef.current;
    if (ref.frame !== null || ref.timeout !== null) return;

    if (typeof window.requestAnimationFrame === 'function') {
      ref.frame = window.requestAnimationFrame(stepMotion);
      return;
    }

    ref.timeout = window.setTimeout(stepMotion, 34);
  }

  function cancelMotionStep() {
    const ref = motionRef.current;

    if (ref.frame !== null && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(ref.frame);
    }

    if (ref.timeout !== null) {
      window.clearTimeout(ref.timeout);
    }

    ref.frame = null;
    ref.timeout = null;
  }

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    if (introState !== 'idle') {
      startIntro();
      return;
    }

    const normalizedDelta = Math.max(-140, Math.min(140, event.deltaY));
    releaseSnap(true);
    nudgeTravel(normalizedDelta * 0.00036);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const point = pointerToSvgPoint(event);
    if (!point) return;

    schedulePointerMove(point);
  }

  function schedulePointerMove(point: SvgPoint) {
    pendingPointerPointRef.current = point;

    if (pointerFrameRef.current !== null) return;

    pointerFrameRef.current = window.requestAnimationFrame(() => {
      const nextPoint = pendingPointerPointRef.current;
      pendingPointerPointRef.current = null;
      pointerFrameRef.current = null;

      if (nextPoint) {
        commitPointerMove(nextPoint);
      }
    });
  }

  function commitPointerMove(point: SvgPoint) {
    setPointerPoint(point);

    if (snappedNode || isTraveling || isMorphing) {
      if (isTraveling) {
        clearHoverState();
      }
      return;
    }

    if (isHoverFocusActive && hoverNode) {
      const hoverDistance = cameraDistance(point, hoverNode, cameraFocus);
      if (hoverDistance <= hoverRadius * 2.65) return;

      clearHoverState();
      return;
    }

    if (hoverNode) {
      const hoverDistance = cameraDistance(point, hoverNode, cameraFocus);
      if (hoverDistance <= hoverRadius * 1.45 + hoverNode.size * 1.4) return;
    }

    const nearest = nearestCameraNode(point, displayNodes, cameraFocus);

    if (!nearest) {
      clearHoverState();
      return;
    }

    const nextHoverId = nearest.distance <= hoverRadius + nearest.node.size * 0.4 ? nearest.node.entry.id : null;
    if (nextHoverId === null) {
      clearHoverState();
    } else if (nextHoverId !== hoverEntryId) {
      clearHoverState();
      setHoverEntryId(nextHoverId);
    }
  }

  function handlePointerLeave() {
    pendingPointerPointRef.current = null;
    setPointerPoint(null);

    if (pointerFrameRef.current !== null) {
      window.cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }

    if (!snappedNode) {
      clearHoverState();
    }
  }

  function pointerToSvgPoint(event: PointerEvent<SVGSVGElement>): SvgPoint | null {
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    return {
      x: ((event.clientX - rect.left) / rect.width) * atlasSize.width,
      y: ((event.clientY - rect.top) / rect.height) * atlasSize.height
    };
  }

  return (
    <main className={`relative h-screen w-screen overflow-hidden bg-[#050505] text-[#f7f7f4] ${introState === 'launching' ? 'cosmos-launching' : ''} ${isTraveling ? 'cosmos-moving' : ''} ${introState === 'idle' && !isTraveling ? 'cosmos-idle' : ''} ${isHoverFocusActive || isHoverMagnifyActive ? 'cosmos-focusing' : ''} ${isHoverMagnifyActive ? 'cosmos-magnifying' : ''}`}>
      <div className="h-full w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${atlasSize.width} ${atlasSize.height}`}
          className="h-full w-full touch-none cursor-none"
          onWheel={handleWheel}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={() => {
            if (introState !== 'idle') startIntro();
          }}
        >
          <defs>
          </defs>
          <rect width={atlasSize.width} height={atlasSize.height} fill="#050505" />
          <g style={backgroundStyle} pointerEvents={snappedNode || isMorphing ? 'none' : 'auto'}>
            <g
              className="wormhole-camera"
              style={{
                transform: `translate(${cameraFocus.x}px, ${cameraFocus.y}px) scale(${cameraFocus.scale})`,
                transformOrigin: `${atlasSize.cx}px ${atlasSize.cy}px`
              }}
            >
              <WormholeRings state={state} isMoving={isTraveling} />
              <StyleSectors state={state} isMoving={isTraveling} activeStyleLens={activeStyleLens} />

              {showRelations ? <RelationOverlay nodes={displayNodes} relations={relations} selectedEntry={snappedNode?.entry ?? hoverNode?.entry ?? morphNode?.entry ?? null} isMoving={isTraveling} /> : null}

              {hoverNode && !snappedNode && !isTraveling && !isMorphing ? <HoverPreview pointer={invertCameraPoint(cursorPoint ?? pointerPoint ?? applyCameraToPoint(hoverNode, cameraFocus), cameraFocus)} node={hoverNode} focusLevel={hoverFocusLevel} /> : null}

              {displayNodes.map((node) => {
                const displayOffset = focusDisplayOffset(node, hoverNode, hoverFocusLevel);
                const isFocusNode = hoverNode?.entry.id === node.entry.id;

                return (
                <g
                  key={node.entry.id}
                  className={`node-focus-drift ${isFocusNode ? 'node-focus-active' : ''}`}
                  opacity={node.opacity * styleLensOpacity(node, activeStyleLens) * sourceLensOpacity(node, activeSourceLens) * (isHoverMagnifyActive && !isFocusNode ? 0.44 : 1)}
                  style={{ transform: `translate(${displayOffset.x}px, ${displayOffset.y}px)` }}
                >
                  <SemanticEntryNode
                    entry={node.entry}
                    x={node.x}
                    y={node.y}
                    labelX={node.labelX}
                    labelY={node.labelY}
                    labelAnchor={node.labelAnchor}
                    labelLeaderX={node.labelLeaderX}
                    labelLeaderY={node.labelLeaderY}
                    clusterSize={node.clusterSize}
                    semanticLevel="global"
                    scale={1}
                    isSelected={activeHoverEntryId === node.entry.id || activeSnappedEntryId === node.entry.id}
                    nodeRadius={node.size}
                    showLabel={false}
                    styleLensActive={activeStyleLens === node.entry.style_sector}
                    driftX={node.driftX}
                    driftY={node.driftY}
                    driftDelay={node.driftDelay}
                    onSelect={() => focusNodeInView(node)}
                  />
                </g>
                );
              })}
            </g>
          </g>
          {morphNode && morphPhase ? <MorphingEntryOverlay node={morphNode} anchor={morphAnchor ?? applyCameraToPoint(morphNode, cameraFocus)} phase={morphPhase} onDismiss={() => releaseSnap(true)} /> : null}
          {snappedNode ? <SnappedEntryOverlay node={snappedNode} onDismiss={() => releaseSnap()} /> : null}
          {introState === 'idle' ? (
            <RadialHud
              showRelations={showRelations}
              tunnelDepth={state.timePosition}
              activeStyleLens={activeStyleLens}
              activeSourceLens={activeSourceLens}
              sourceLensCount={sourceLensCount}
              onTravelForward={() => travelBy(0.035)}
              onTravelBackward={() => travelBy(-0.035)}
              onCycleStyleLens={() => setActiveStyleLens((current) => nextStyleLens(current))}
              onToggleSourceLens={() => setActiveSourceLens((current) => current === 'afasia' ? null : 'afasia')}
              onToggleRelations={() => setShowRelations((current) => !current)}
            />
          ) : null}
          {introState === 'idle' ? (
            <DatabaseAccess
              isOpen={showDatabasePanel}
              isHovered={isDatabaseHovered}
              onHoverChange={setIsDatabaseHovered}
              onToggle={() => setShowDatabasePanel((current) => !current)}
            />
          ) : null}
          {showDatabasePanel && introState === 'idle' ? <DatabasePlaceholderPanel onDismiss={() => setShowDatabasePanel(false)} /> : null}
          {introState === 'idle' ? <TimeReadout timePosition={state.timePosition} currentYear={state.currentYear} /> : null}
          {introState === 'idle' ? <BrandChrome /> : null}
          {showMotionDebug && introState === 'idle' ? (
            <MotionDebugHud
              motion={motion}
              fps={debugFps}
              nodeCount={displayNodes.length}
              hoverEntryId={hoverNode?.entry.id ?? null}
              interactionState={interactionState}
              focusLevel={hoverFocusLevel}
              hoverDurationMs={hoverDurationMs}
              focusNodeId={focusNode?.entry.id ?? morphNode?.entry.id ?? snappedNode?.entry.id ?? null}
              morphing={isMorphing}
              showRelations={showRelations}
            />
          ) : null}
          {cursorPoint ? <CosmosCursor pointer={cursorPoint} activeNode={hoverNode ?? snappedNode} focusLevel={hoverFocusLevel} /> : null}
        </svg>
      </div>

      {introState !== 'idle' ? <IntroGate state={introState} onStart={startIntro} /> : null}
    </main>
  );
}

function nearestNode(point: SvgPoint, nodes: WormholeEntryNode[]) {
  return nodes.reduce<{ node: WormholeEntryNode; distance: number } | null>((nearest, node) => {
    if (node.opacity < 0.08) return nearest;

    const nodeDistance = distance(point, node);
    if (!nearest || nodeDistance < nearest.distance) {
      return { node, distance: nodeDistance };
    }

    return nearest;
  }, null);
}

function nearestCameraNode(point: SvgPoint, nodes: WormholeEntryNode[], cameraFocus: { x: number; y: number; scale: number }) {
  return nodes.reduce<{ node: WormholeEntryNode; distance: number } | null>((nearest, node) => {
    if (node.opacity < 0.08) return nearest;

    const nodeDistance = cameraDistance(point, node, cameraFocus);
    if (!nearest || nodeDistance < nearest.distance) {
      return { node, distance: nodeDistance };
    }

    return nearest;
  }, null);
}

function cameraDistance(point: SvgPoint, node: WormholeEntryNode, cameraFocus: { x: number; y: number; scale: number }) {
  const cameraPoint = applyCameraToPoint(node, cameraFocus);
  return Math.hypot(point.x - cameraPoint.x, point.y - cameraPoint.y);
}

function isReadableNode(node: WormholeEntryNode) {
  const margin = 54;
  const insideFrame = node.x > margin && node.x < atlasSize.width - margin && node.y > margin && node.y < atlasSize.height - margin;
  return insideFrame && node.depth >= 0.018 && node.depth <= 0.9 && node.opacity >= 0.12;
}

function limitDisplayNodes(nodes: WormholeEntryNode[]) {
  return nodes
    .filter(isReadableNode)
    .sort((a, b) => nodeRenderPriority(b) - nodeRenderPriority(a))
    .slice(0, 72)
    .sort((a, b) => b.depth - a.depth);
}

function nodeRenderPriority(node: WormholeEntryNode) {
  return node.opacity * 1.3 + node.closeness * 0.7 + (node.clusterSize > 1 ? 0.12 : 0);
}

function styleLensOpacity(node: WormholeEntryNode, activeStyleLens: StyleSectorId | null) {
  if (!activeStyleLens) return 1;
  if (node.entry.style_sector === activeStyleLens) return 1;
  return 0.24 + node.closeness * 0.18;
}

function sourceLensOpacity(node: WormholeEntryNode, activeSourceLens: SourceLens) {
  if (!activeSourceLens) return 1;

  if (isSourceLensEntry(node.entry, activeSourceLens)) return 1;
  return 0.035 + node.closeness * 0.055;
}

function isSourceLensEntry(entry: Entry, activeSourceLens: SourceLens) {
  if (!activeSourceLens) return false;

  const sourceText = [
    entry.source_url,
    entry.source_quality,
    ...(entry.source_documents ?? []),
    ...entry.themes
  ].join(' ').toLowerCase();

  return activeSourceLens === 'afasia' && sourceText.includes('afasia');
}

function focusDisplayOffset(node: WormholeEntryNode, focusNode: WormholeEntryNode | null, focusLevel: HoverFocusLevel): SvgPoint {
  if (!focusNode || focusLevel === 'none' || focusLevel === 'approach' || focusLevel === 'preview') return { x: 0, y: 0 };

  const magnifyActive = focusLevel === 'magnify';
  const depthDelta = Math.abs(node.depth - focusNode.depth);
  const angularDelta = Math.abs(shortestAngleDelta(node.angle, focusNode.angle));
  const isClusterNeighbor = depthDelta < (magnifyActive ? 0.046 : 0.024) && angularDelta < (magnifyActive ? 35 : 22);

  if (!isClusterNeighbor) return { x: 0, y: 0 };

  const strength = node.entry.id === focusNode.entry.id ? (magnifyActive ? 0.095 : 0.026) : (magnifyActive ? 0.055 : 0.014);

  return {
    x: (atlasSize.cx - node.x) * strength,
    y: (atlasSize.cy - node.y) * strength
  };
}

function focusCameraOffset(focusNode: WormholeEntryNode | null, focusLevel: HoverFocusLevel) {
  if (!focusNode || focusLevel === 'none') {
    return { x: 0, y: 0, scale: 1 };
  }

  const strengthByLevel: Record<HoverFocusLevel, number> = {
    none: 0,
    approach: 0.006,
    preview: 0.018,
    focus: 0.058,
    magnify: 0.125
  };
  const scaleByLevel: Record<HoverFocusLevel, number> = {
    none: 1,
    approach: 1.0015,
    preview: 1.004,
    focus: 1.018,
    magnify: 1.052
  };
  const strength = strengthByLevel[focusLevel];

  return {
    x: (atlasSize.cx - focusNode.x) * strength,
    y: (atlasSize.cy - focusNode.y) * strength,
    scale: scaleByLevel[focusLevel]
  };
}

function applyCameraToPoint(point: SvgPoint, cameraFocus: { x: number; y: number; scale: number }): SvgPoint {
  return {
    x: atlasSize.cx + cameraFocus.x + (point.x - atlasSize.cx) * cameraFocus.scale,
    y: atlasSize.cy + cameraFocus.y + (point.y - atlasSize.cy) * cameraFocus.scale
  };
}

function invertCameraPoint(point: SvgPoint, cameraFocus: { x: number; y: number; scale: number }): SvgPoint {
  return {
    x: atlasSize.cx + (point.x - atlasSize.cx - cameraFocus.x) / cameraFocus.scale,
    y: atlasSize.cy + (point.y - atlasSize.cy - cameraFocus.y) / cameraFocus.scale
  };
}

function cursorAnchorPoint(
  pointerPoint: SvgPoint | null,
  hoverNode: WormholeEntryNode | null,
  cameraFocus: { x: number; y: number; scale: number },
  isTraveling: boolean,
  introState: IntroState,
  focusLevel: HoverFocusLevel,
  hasSnappedNode: boolean
): SvgPoint | null {
  if (introState !== 'idle' || isTraveling) return null;
  const freePointer = pointerPoint ?? { x: atlasSize.cx, y: atlasSize.cy };
  if (!hoverNode || hasSnappedNode) return freePointer;

  const anchor = applyCameraToPoint(hoverNode, cameraFocus);
  const strengthByLevel: Record<HoverFocusLevel, number> = {
    none: 0,
    approach: 0.025,
    preview: 0.055,
    focus: 0.09,
    magnify: 0.14
  };
  const strength = strengthByLevel[focusLevel];
  return {
    x: freePointer.x + (anchor.x - freePointer.x) * strength,
    y: freePointer.y + (anchor.y - freePointer.y) * strength
  };
}

function shortestAngleDelta(a: number, b: number) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

function roundMotion(value: number) {
  return Math.round(value * 100000) / 100000;
}

function RadialHud({
  showRelations,
  tunnelDepth,
  activeStyleLens,
  activeSourceLens,
  sourceLensCount,
  onTravelForward,
  onTravelBackward,
  onCycleStyleLens,
  onToggleSourceLens,
  onToggleRelations
}: {
  showRelations: boolean;
  tunnelDepth: number;
  activeStyleLens: StyleSectorId | null;
  activeSourceLens: SourceLens;
  sourceLensCount: number;
  onTravelForward: () => void;
  onTravelBackward: () => void;
  onCycleStyleLens: () => void;
  onToggleSourceLens: () => void;
  onToggleRelations: () => void;
}) {
  const controlsOpacity = Math.max(0.46, 1 - tunnelDepth / 0.76);
  const lensLabel = activeStyleLens ? styleSectors.find((sector) => sector.id === activeStyleLens)?.label ?? 'Stil' : 'Alle Stile';

  return (
    <g className="radial-hud navigation-dock" pointerEvents="auto" opacity={controlsOpacity}>
      <rect x={atlasSize.cx - 150} y="904" width="300" height="34" rx="17" fill="#050505" stroke="#f7f7f4" strokeWidth="0.5" opacity="0.68" />
      <g opacity={controlsOpacity}>
        <HudButton x={atlasSize.cx - 104} y={921} kind="backward" label="zurueck" onClick={onTravelBackward} />
        <HudButton x={atlasSize.cx - 52} y={921} kind="forward" label="vor" onClick={onTravelForward} />
        <HudButton x={atlasSize.cx} y={921} kind="lens" label={lensLabel} active={Boolean(activeStyleLens)} onClick={onCycleStyleLens} />
        <HudButton x={atlasSize.cx + 52} y={921} kind="source" label="afasia" active={activeSourceLens === 'afasia'} onClick={onToggleSourceLens} />
        <HudButton x={atlasSize.cx + 104} y={921} kind="relations" label="relations" active={showRelations} onClick={onToggleRelations} />
      </g>
      {activeSourceLens ? (
        <text x={atlasSize.cx} y="890" textAnchor="middle" fill="#65ff9a" fontSize="7.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.18em" opacity="0.9">
          AFASIA SOURCE LENS / {sourceLensCount} PROJECT
        </text>
      ) : null}
    </g>
  );
}

function HudButton({ x, y, kind, label, active = false, onClick }: { x: number; y: number; kind: 'backward' | 'forward' | 'lens' | 'source' | 'relations'; label: string; active?: boolean; onClick: () => void }) {
  function handleActivate(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    onClick();
  }

  return (
    <g className="hud-button" pointerEvents="auto" onPointerDown={(event) => event.stopPropagation()} onClick={handleActivate} aria-label={label}>
      <circle cx={x} cy={y} r="22" fill="#050505" opacity="0.001" />
      <circle cx={x} cy={y} r="14" fill={active ? '#f7f7f4' : '#050505'} stroke={active ? '#00e7ff' : '#f7f7f4'} strokeWidth="0.75" opacity="0.88" />
      <HudIcon x={x} y={y} kind={kind} active={active} />
    </g>
  );
}

function HudIcon({ x, y, kind, active }: { x: number; y: number; kind: 'backward' | 'forward' | 'lens' | 'source' | 'relations'; active: boolean }) {
  const stroke = active ? '#050505' : '#f7f7f4';

  if (kind === 'relations') {
    return (
      <g stroke={stroke} fill={active ? '#050505' : '#f7f7f4'} strokeWidth="0.9" opacity="0.9">
        <line x1={x - 4.2} y1={y + 3.2} x2={x} y2={y - 4.5} />
        <line x1={x} y1={y - 4.5} x2={x + 4.4} y2={y + 3.2} />
        <circle cx={x - 4.2} cy={y + 3.2} r="1.6" />
        <circle cx={x} cy={y - 4.5} r="1.6" />
        <circle cx={x + 4.4} cy={y + 3.2} r="1.6" />
      </g>
    );
  }

  if (kind === 'lens') {
    return (
      <g stroke={stroke} fill="none" strokeWidth="1" opacity="0.9">
        <circle cx={x} cy={y} r="5.1" />
        <path d={`M ${x - 7} ${y} H ${x + 7}`} />
        <path d={`M ${x} ${y - 7} V ${y + 7}`} opacity="0.55" />
      </g>
    );
  }

  if (kind === 'source') {
    return (
      <g stroke={stroke} fill="none" strokeWidth="0.95" opacity="0.92">
        <path d={`M ${x - 6.4} ${y + 4.8} H ${x + 6.4}`} />
        <path d={`M ${x - 5.5} ${y + 2.2} C ${x - 3.3} ${y - 5.8}, ${x + 3.3} ${y - 5.8}, ${x + 5.5} ${y + 2.2}`} />
        <circle cx={x} cy={y - 1.4} r="1.3" fill={stroke} />
      </g>
    );
  }

  return (
    <g stroke={stroke} strokeWidth="1.25" fill="none" opacity="0.9">
      <path d={kind === 'forward' ? `M ${x - 4} ${y - 6} L ${x + 4} ${y} L ${x - 4} ${y + 6}` : `M ${x + 4} ${y - 6} L ${x - 4} ${y} L ${x + 4} ${y + 6}`} />
      <line x1={kind === 'forward' ? x - 6 : x + 6} y1={y} x2={kind === 'forward' ? x + 5 : x - 5} y2={y} opacity="0.5" />
    </g>
  );
}

function MotionDebugHud({
  motion,
  fps,
  nodeCount,
  hoverEntryId,
  interactionState,
  focusLevel,
  hoverDurationMs,
  focusNodeId,
  morphing,
  showRelations
}: {
  motion: MotionSnapshot;
  fps: number | null;
  nodeCount: number;
  hoverEntryId: string | null;
  interactionState: ObjectInteractionState;
  focusLevel: HoverFocusLevel;
  hoverDurationMs: number;
  focusNodeId: string | null;
  morphing: boolean;
  showRelations: boolean;
}) {
  const x = atlasSize.width - 246;
  const y = 72;
  const rows = [
    `travel ${motion.currentTravel.toFixed(3)} -> ${motion.targetTravel.toFixed(3)}`,
    `velocity ${motion.velocity.toFixed(4)}`,
    `${motion.isMoving ? 'moving' : 'idle'} / ${motion.isSettling ? 'settled' : 'settling'}`,
    `fps ${fps ?? '--'}`,
    `nodes ${nodeCount} / relations ${showRelations ? 'on' : 'off'}`,
    `interaction ${interactionState} / ${focusLevel}`,
    `hover ${hoverEntryId ? 'active' : 'none'} / ${Math.round(hoverDurationMs / 100) / 10}s`,
    `focus ${focusNodeId ? focusNodeId.slice(0, 18) : 'none'}`,
    `morph ${morphing ? 'yes' : 'no'}`
  ];

  return (
    <g className="motion-debug-hud" pointerEvents="none">
      <rect x={x} y={y} width="212" height="124" rx="5" fill="#050505" stroke="#00e7ff" strokeWidth="0.55" opacity="0.82" />
      <text x={x + 12} y={y + 20} fill="#f7f7f4" fontSize="8.5" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.14em">
        MOTION DEBUG
      </text>
      {rows.map((row, index) => (
        <text key={row} x={x + 12} y={y + 38 + index * 10} fill="#b8b8b2" fontSize="7.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
          {row.toUpperCase()}
        </text>
      ))}
    </g>
  );
}

function DatabaseAccess({ isOpen, isHovered, onHoverChange, onToggle }: { isOpen: boolean; isHovered: boolean; onHoverChange: (isHovered: boolean) => void; onToggle: () => void }) {
  const x = atlasSize.width - 164;
  const y = atlasSize.height - 54;
  const isExpanded = isOpen || isHovered;
  function toggleOnce(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    onToggle();
  }

  return (
    <g
      className={`database-access ${isExpanded ? 'database-access-open' : ''}`}
      pointerEvents="auto"
      transform={`translate(${x} ${y})`}
      onPointerEnter={() => onHoverChange(true)}
      onPointerMove={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
      aria-label="Database archive"
    >
      <rect className="database-access-shell" x="0" y="-16" width="128" height="32" rx="16" fill="#050505" stroke="#00e7ff" strokeWidth="0.55" opacity="0.74" />
      <g className="database-access-core" stroke="#f7f7f4" fill="none" strokeWidth="0.72" opacity="0.9">
        <ellipse cx="16" cy="-4.4" rx="6.1" ry="2.4" />
        <path d="M 9.9 -4.4 V 5.8 Q 16 9.1 22.1 5.8 V -4.4" />
        <path d="M 9.9 0.8 Q 16 4 22.1 0.8" opacity="0.52" />
      </g>
      <text className="database-access-label" x="34" y="3" fill="#f7f7f4" fontSize="7.5" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.2em">
        DATABASE / ARCHIVE
      </text>
      <rect
        x="0"
        y="-16"
        width="128"
        height="32"
        rx="16"
        fill="#050505"
        opacity="0.001"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={() => onHoverChange(true)}
        onClick={toggleOnce}
      />
    </g>
  );
}

function nextStyleLens(current: StyleSectorId | null): StyleSectorId | null {
  if (!current) return styleSectors[0].id;
  const currentIndex = styleSectors.findIndex((sector) => sector.id === current);
  const next = styleSectors[currentIndex + 1];
  return next?.id ?? null;
}

function BrandChrome() {
  return (
    <g className="brand-chrome" pointerEvents="none">
      <text x="34" y="38" fill="#f7f7f4" fontSize="11" fontWeight="600" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.28em" opacity="0.72">
        ARCHITECTURE COSMOS
      </text>
      <text x={atlasSize.width - 34} y="38" textAnchor="end" fill="#c7c7c2" fontSize="9" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.22em" opacity="0.62">
        MADE BY ANDRIN BAUMANN
      </text>
    </g>
  );
}

function TimeReadout({ timePosition, currentYear }: { timePosition: number; currentYear: number }) {
  const focusEndYear = positionToYear(Math.min(1, timePosition + 0.22));
  const span = dominantSpanForYear(currentYear);

  return (
    <g className="time-readout" pointerEvents="none" opacity="0.88">
      <line x1="42" y1="880" x2="172" y2="880" stroke="#f7f7f4" strokeWidth="0.6" opacity="0.5" />
      <text x="42" y="842" fill="#f7f7f4" fontSize="27" fontWeight="650" fontFamily="var(--font-sans), system-ui, sans-serif">
        {formatYear(currentYear)}
      </text>
      <text x="42" y="862" fill="#c7c7c2" fontSize="9.5" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.18em">
        {span.label.toUpperCase()}
      </text>
      <text x="42" y="898" fill="#9c9c96" fontSize="8.5" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.12em">
        {formatYear(Math.min(currentYear, focusEndYear))} - {formatYear(Math.max(currentYear, focusEndYear))}
      </text>
    </g>
  );
}

function dominantSpanForYear(year: number) {
  if (year >= 1990) return { label: 'Gegenwart / Digitalisierung' };
  if (year >= 1950) return { label: 'Nachkriegsmoderne' };
  if (year >= 1900) return { label: 'Moderne' };
  if (year >= 1800) return { label: 'Industrialisierung' };
  if (year >= 1400) return { label: 'Fruehmoderne' };
  if (year >= 500) return { label: 'Mittelalter / Stadt' };
  if (year >= -500) return { label: 'Antike' };
  if (year >= -3000) return { label: 'Fruehe Hochkulturen' };
  return { label: 'Proto-Urban / Ursprung' };
}

function distance(point: SvgPoint, node: WormholeEntryNode) {
  return Math.hypot(point.x - node.x, point.y - node.y);
}

function IntroGate({ state, onStart }: { state: IntroState; onStart: () => void }) {
  return (
    <button
      type="button"
      className={`intro-gate absolute inset-0 z-30 flex cursor-none items-center justify-center bg-[#050505]/10 text-center ${state === 'launching' ? 'intro-gate-launching' : ''}`}
      onClick={onStart}
      onWheel={(event) => {
        event.preventDefault();
        onStart();
      }}
      aria-label="Start Architecture Cosmos"
    >
      <span className="block">
        <span className="block text-[clamp(2.4rem,7vw,6.8rem)] font-semibold uppercase tracking-[0.18em] text-[#f7f7f4]">
          architecture cosmos
        </span>
        <span className="mt-4 block text-[clamp(0.7rem,1.5vw,1rem)] uppercase tracking-[0.42em] text-neutral-300">
          made by andrin
        </span>
      </span>
    </button>
  );
}

function HoverPreview({ pointer, node, focusLevel }: { pointer: SvgPoint; node: WormholeEntryNode; focusLevel: HoverFocusLevel }) {
  const isMagnified = focusLevel === 'magnify';
  const isFocused = focusLevel === 'focus' || isMagnified;
  const previewScale = node.closeness > 0.68 ? 0.78 : 0.66;
  const baseWidth = previewCardWidth(node.entry);
  const cardWidth = baseWidth * previewScale;
  const cardHeight = 82 * previewScale;
  const side = node.x > atlasSize.cx ? -1 : 1;
  const x = Math.max(34, Math.min(atlasSize.width - cardWidth - 34, pointer.x + side * 28));
  const y = Math.max(34, Math.min(atlasSize.height - cardHeight - 86, pointer.y - cardHeight / 2));

  return (
    <g className={`hover-preview ${isFocused ? 'hover-preview-focused' : ''} ${isMagnified ? 'hover-preview-magnified' : ''}`} pointerEvents="none">
      <line x1={pointer.x} y1={pointer.y} x2={node.x} y2={node.y} stroke="#fff8d6" strokeWidth="0.55" strokeDasharray="1 9" opacity="0.32" />
      <circle cx={node.x} cy={node.y} r={node.size + (isMagnified ? 16 : isFocused ? 12 : 8)} fill="none" stroke="#fff8d6" strokeWidth="0.62" opacity={isFocused ? 0.58 : 0.44} />
      <circle cx={node.x} cy={node.y} r={node.size + (isMagnified ? 27 : isFocused ? 20 : 14)} fill="none" stroke="#00e7ff" strokeWidth="0.45" strokeDasharray="1 8" opacity={isMagnified ? 0.44 : 0.28} />
      <g transform={`translate(${x} ${y}) scale(${previewScale})`}>
        <HoverImageCard entry={node.entry} width={baseWidth} />
      </g>
    </g>
  );
}

function HoverImageCard({ entry, width }: { entry: Entry; width: number }) {
  const mediaWidth = 74;
  const title = entry.title.length > 30 ? `${entry.title.slice(0, 27).trim()}...` : entry.title;

  return (
    <g className="hover-image-card">
      <rect x="0" y="0" width={width} height="82" rx="2" fill="#050505" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.9" />
      <ProjectMediaGrid media={entry.media} x={8} y={8} slotWidth={58} slotHeight={46} gap={0} types={['exterior']} />
      <text x={mediaWidth + 10} y="27" fill="#f7f7f4" fontSize="10.5" fontWeight="650" fontFamily="var(--font-sans), system-ui, sans-serif">
        {title}
      </text>
      <text x={mediaWidth + 10} y="48" fill="#b8b8b2" fontSize="7.4" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.16em">
        {formatYear(entry.year_start)}
      </text>
    </g>
  );
}

function DatabasePlaceholderPanel({ onDismiss }: { onDismiss: () => void }) {
  const x = atlasSize.width - 310;
  const y = atlasSize.height - 234;
  const modules = ['Entries', 'Media', 'Sources', 'Relations', 'Tags'];

  return (
    <g className="database-placeholder" pointerEvents="auto">
      <rect x={x} y={y} width="270" height="166" rx="4" fill="#050505" stroke="#00e7ff" strokeWidth="0.75" opacity="0.92" />
      <text x={x + 18} y={y + 30} fill="#f7f7f4" fontSize="12" fontWeight="650" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.1em">
        ARCHITECTURE COSMOS DATABASE
      </text>
      <text x={x + 18} y={y + 52} fill="#b8b8b2" fontSize="8.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
        PLATZHALTER FUER DAS SPAETERE ARCHIVSYSTEM
      </text>
      {modules.map((module, index) => (
        <g key={module} transform={`translate(${x + 18 + (index % 2) * 116} ${y + 76 + Math.floor(index / 2) * 26})`}>
          <rect width="98" height="15" rx="7.5" fill="#07181a" stroke={index % 2 === 0 ? '#00e7ff' : '#ffb000'} strokeWidth="0.45" opacity="0.9" />
          <text x="49" y="10.8" textAnchor="middle" fill="#f7f7f4" fontSize="7.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.12em">
            {module.toUpperCase()}
          </text>
        </g>
      ))}
      <g className="dossier-close" pointerEvents="auto" transform={`translate(${x + 224} ${y + 12})`} onClick={(event) => { event.stopPropagation(); onDismiss(); }}>
        <rect width="28" height="16" rx="8" fill="#f7f7f4" opacity="0.88" />
        <text x="14" y="11.2" textAnchor="middle" fill="#050505" fontSize="7.2" fontFamily="var(--font-sans), system-ui, sans-serif">
          X
        </text>
      </g>
    </g>
  );
}

function MorphingEntryOverlay({ node, anchor, phase, onDismiss }: { node: WormholeEntryNode; anchor: SvgPoint; phase: Exclude<MorphPhase, null>; onDismiss: () => void }) {
  const cardScale = 1.42;
  const cardWidth = 352 * cardScale;
  const cardHeight = 292 * cardScale;
  const cardX = atlasSize.cx - cardWidth / 2;
  const cardY = atlasSize.cy - cardHeight / 2;
  const morphStyle = {
    '--morph-x': `${anchor.x - cardX}px`,
    '--morph-y': `${anchor.y - cardY}px`
  } as CSSProperties;

  return (
    <g className={`dossier-morph-overlay dossier-morph-overlay-${phase}`} pointerEvents={phase === 'opening' ? 'none' : 'auto'}>
      <rect className="dossier-morph-dim" width={atlasSize.width} height={atlasSize.height} fill="#050505" opacity={phase === 'opening' ? 0.18 : 0.26} onClick={onDismiss} />
      <line x1={anchor.x} y1={anchor.y} x2={atlasSize.cx} y2={atlasSize.cy} stroke="#00e7ff" strokeWidth="0.65" strokeDasharray="2 10" opacity="0.28" />
      <circle cx={anchor.x} cy={anchor.y} r={node.size + 18} fill="none" stroke="#fff8d6" strokeWidth="0.55" opacity="0.36" />
      <g transform={`translate(${cardX} ${cardY})`}>
        <g className={`dossier-morph-card dossier-morph-card-${phase}`} style={morphStyle}>
          <rect x="-12" y="-12" width={cardWidth + 24} height={cardHeight + 24} fill="#050505" stroke="#00e7ff" strokeWidth="0.75" opacity="0.84" />
          <g pointerEvents="none" transform={`scale(${cardScale})`}>
            <ProjectDetailCard entry={node.entry} x={0} y={0} />
          </g>
        </g>
      </g>
    </g>
  );
}

function SnappedEntryOverlay({ node, onDismiss }: { node: WormholeEntryNode; onDismiss: () => void }) {
  const cardScale = 1.42;
  const cardWidth = 352 * cardScale;
  const cardHeight = 292 * cardScale;
  const cardX = atlasSize.cx - cardWidth / 2;
  const cardY = atlasSize.cy - cardHeight / 2;

  return (
    <g className="dossier-overlay" pointerEvents="auto" opacity="1">
      <rect width={atlasSize.width} height={atlasSize.height} fill="#050505" opacity="0.34" onClick={onDismiss} />
      <line x1={node.x} y1={node.y} x2={atlasSize.cx} y2={atlasSize.cy} stroke="#f7f7f4" strokeWidth="0.7" strokeDasharray="3 9" opacity="0.28" />
      <circle cx={atlasSize.cx} cy={atlasSize.cy} r="252" fill="none" stroke="#f7f7f4" strokeWidth="0.8" strokeDasharray="1 13" opacity="0.22" />
      <g transform={`translate(${cardX - 12} ${cardY - 12})`}>
        <rect width={cardWidth + 24} height={cardHeight + 24} fill="#050505" stroke="#f7f7f4" strokeWidth="0.85" opacity="0.88" />
      </g>
      <g pointerEvents="none" transform={`translate(${cardX} ${cardY}) scale(${cardScale})`}>
        <ProjectDetailCard entry={node.entry} x={0} y={0} />
      </g>
      <g className="dossier-close" pointerEvents="auto" transform={`translate(${cardX + cardWidth - 46} ${cardY - 34})`} onClick={onDismiss}>
        <rect width="46" height="22" fill="#f7f7f4" opacity="0.94" />
        <text x="23" y="15" textAnchor="middle" fill="#050505" fontSize="9" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.14em">
          CLOSE
        </text>
      </g>
    </g>
  );
}

function CosmosCursor({ pointer, activeNode, focusLevel }: { pointer: SvgPoint; activeNode: WormholeEntryNode | null; focusLevel: HoverFocusLevel }) {
  const isMagnified = focusLevel === 'magnify';
  const isFocused = focusLevel === 'focus' || isMagnified;
  const outerRadius = activeNode ? (isMagnified ? 18 : isFocused ? 16 : 14) : 12;
  const innerRadius = activeNode ? Math.max(8, outerRadius - 2) : 10;

  return (
    <g className="cosmos-cursor" pointerEvents="none" transform={`translate(${pointer.x} ${pointer.y})`} opacity={isMagnified ? 0.92 : 1}>
      <circle r={outerRadius} fill="none" stroke="#050505" strokeWidth="3.4" opacity="0.88" />
      <circle r={innerRadius} fill="none" stroke="#f7f7f4" strokeWidth="0.8" opacity={activeNode ? 0.82 : 0.52} />
      {activeNode ? <circle r={isMagnified ? 11.4 : isFocused ? 9.4 : 7.4} fill="none" stroke="#00e7ff" strokeWidth="0.55" opacity="0.58" /> : null}
      <circle r="2.1" fill="#f7f7f4" opacity="0.86" />
      <line x1="-18" y1="0" x2="-11" y2="0" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
      <line x1="11" y1="0" x2="18" y2="0" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
      <line x1="0" y1="-18" x2="0" y2="-11" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
      <line x1="0" y1="11" x2="0" y2="18" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
    </g>
  );
}

function previewCardWidth(entry: Entry) {
  return Math.max(190, Math.min(262, entry.title.length * 5.7 + 108));
}

function advanceTravel(current: number, delta: number) {
  const maxOverscroll = 0.065;

  if (current <= 0 && delta < 0) {
    return Math.max(-maxOverscroll, current + delta * 0.16);
  }

  if (current < 0 && delta > 0) {
    return Math.min(0, current + delta * 0.78);
  }

  if (current >= 1 && delta > 0) {
    return Math.min(1 + maxOverscroll, current + delta * 0.16);
  }

  if (current > 1 && delta < 0) {
    return Math.max(1, current + delta * 0.78);
  }

  const next = current + delta;
  if (next < 0) return next * 0.22;
  if (next > 1) return 1 + (next - 1) * 0.22;
  return next;
}
