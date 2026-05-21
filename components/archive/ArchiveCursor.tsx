'use client';

import { useEffect, useRef } from 'react';

export function ArchiveCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pointRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const moveCursor = () => {
      frameRef.current = null;
      const cursor = cursorRef.current;
      const point = pointRef.current;
      if (!cursor) return;

      cursor.style.opacity = point.active ? '1' : '0';
      cursor.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
    };

    const schedule = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(moveCursor);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointRef.current = { x: event.clientX, y: event.clientY, active: true };
      schedule();
    };

    const handlePointerLeave = () => {
      pointRef.current.active = false;
      schedule();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div ref={cursorRef} className="archive-cosmos-cursor" aria-hidden="true">
      <span />
    </div>
  );
}
