// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Storey } from '@kosmo/kernel';
import { GeschossPille } from '../src/modules/design/island/GeschossPille';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * PB3 (`docs/V084-SPEZ.md` §8 C-24, Owner wörtlich «Geschosseinstellung raus
 * aus der Tab-Leiste, als kleine vertikale Pille unter dem KosmoOrbit-
 * Logo») — Geschoss-Pille: kompaktes Label mit dem aktiven Geschoss,
 * Popover mit den (aus `AnsichtsInfo.tsx` herausgelösten) Geschoss-Chips,
 * Auto-Schliessen 700ms. Rendert über `createRoot`/`act`/`dispatchEvent`
 * (Muster `stationen-orb.test.tsx`/`ansichts-info.test.tsx`, kein
 * `@testing-library/react` in diesem Workspace).
 */

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(el: React.ReactElement): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(el));
}

/**
 * PB4 (`docs/V084-SPEZ.md` §3 E3-Rollout): der Auto-Schliessen-Timer läuft
 * seither über `useOverlaySchliessen` (`pointerenter`/`pointerleave` auf dem
 * Wurzel-Element) statt des vorherigen lokalen `onMouseEnter`/`onMouseLeave`-
 * Handbaus — `hoverEnter` feuert darum ZUSÄTZLICH ein `pointerenter`
 * (storniert einen ggf. laufenden Rückklapp-Timer), `hoverLeave` feuert
 * `pointerleave` (startet den Hook-Timer).
 */
function hoverEnter(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
    el.dispatchEvent(new Event('pointerenter', { bubbles: false }));
  });
}

function hoverLeave(el: Element): void {
  act(() => {
    el.dispatchEvent(new Event('pointerleave', { bubbles: false }));
  });
}

function klick(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function q(testid: string): HTMLElement | null {
  return container!.querySelector(`[data-testid="${testid}"]`);
}

const STOREYS: Storey[] = [
  { kind: 'storey', id: 'eg', name: 'EG', elevation: 0, height: 3000, cutHeight: 1100, index: 0 },
  { kind: 'storey', id: 'og1', name: 'OG1', elevation: 3000, height: 3000, cutHeight: 1100, index: 1 },
];

afterEach(() => {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  vi.useRealTimers();
});

describe('GeschossPille — Label + Popover', () => {
  it('zeigt das aktive Geschoss kompakt im Label', () => {
    render(<GeschossPille storeys={STOREYS} activeStoreyId="og1" setActiveStorey={vi.fn()} />);
    expect(q('geschoss-pille-label')!.textContent).toBe('OG1');
  });

  it('fällt auf das erste Geschoss zurück, wenn activeStoreyId (noch) nicht gesetzt ist', () => {
    render(<GeschossPille storeys={STOREYS} activeStoreyId={null} setActiveStorey={vi.fn()} />);
    expect(q('geschoss-pille-label')!.textContent).toBe('EG');
  });

  it('rendert NICHT, wenn es (noch) keine Geschosse gibt (Ehrlichkeits-Guard, kein erfundener Zustand)', () => {
    render(<GeschossPille storeys={[]} activeStoreyId={null} setActiveStorey={vi.fn()} />);
    expect(q('geschoss-pille-root')).toBeNull();
  });

  it('Klick auf das Label öffnet das Popover mit den Geschoss-Chips (ansichts-info-geschoss-*-testids, PB3-Umzug aus AnsichtsInfo.tsx)', () => {
    render(<GeschossPille storeys={STOREYS} activeStoreyId="eg" setActiveStorey={vi.fn()} />);
    expect(q('geschoss-pille-popover')).toBeNull();
    klick(q('geschoss-pille-label')!);
    expect(q('geschoss-pille-popover')).not.toBeNull();
    expect(q('ansichts-info-geschoss-EG')).not.toBeNull();
    expect(q('ansichts-info-geschoss-OG1')).not.toBeNull();
  });

  it('Klick auf einen Geschoss-Chip ruft setActiveStorey mit der echten Storey-Id auf und markiert via aria-pressed', () => {
    const setActiveStorey = vi.fn();
    render(<GeschossPille storeys={STOREYS} activeStoreyId="eg" setActiveStorey={setActiveStorey} />);
    klick(q('geschoss-pille-label')!);
    expect(q('ansichts-info-geschoss-EG')!.getAttribute('aria-pressed')).toBe('true');
    expect(q('ansichts-info-geschoss-OG1')!.getAttribute('aria-pressed')).toBe('false');
    klick(q('ansichts-info-geschoss-OG1')!);
    expect(setActiveStorey).toHaveBeenCalledWith('og1');
  });
});

describe('GeschossPille — Auto-Schliessen 700ms', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('schliesst das Popover 700ms nach Pointer-Verlassen', () => {
    render(<GeschossPille storeys={STOREYS} activeStoreyId="eg" setActiveStorey={vi.fn()} />);
    hoverEnter(q('geschoss-pille-root')!);
    expect(q('geschoss-pille-popover')).not.toBeNull();
    hoverLeave(q('geschoss-pille-root')!);
    act(() => {
      vi.advanceTimersByTime(699);
    });
    expect(q('geschoss-pille-popover')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(q('geschoss-pille-popover')).toBeNull();
  });
});

describe('GeschossPille — Popup-Gesetz (PB4, §3 E3, useOverlaySchliessen-Rollout)', () => {
  it('Escape schliesst das offene Popover', () => {
    render(<GeschossPille storeys={STOREYS} activeStoreyId="eg" setActiveStorey={vi.fn()} />);
    klick(q('geschoss-pille-label')!);
    expect(q('geschoss-pille-popover')).not.toBeNull();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(q('geschoss-pille-popover')).toBeNull();
  });

  it('ein Klick ausserhalb der Wurzel schliesst das offene Popover', () => {
    render(<GeschossPille storeys={STOREYS} activeStoreyId="eg" setActiveStorey={vi.fn()} />);
    klick(q('geschoss-pille-label')!);
    expect(q('geschoss-pille-popover')).not.toBeNull();
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(q('geschoss-pille-popover')).toBeNull();
  });
});
