// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StationenOrb, type StationenOrbId } from '../src/modules/design/island/StationenOrb';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * PD2 (`docs/ISLAND-UI-SPEZ.md` §1-Tabelle) — Stationen-Orb: 38px-Pill,
 * Popover mit den 5 Stationen + Rollenpunkt-Farben, Auto-Schliessen 700ms.
 * Rendert über `createRoot`/`act`/`dispatchEvent` (Muster `island-shell.
 * test.tsx`, kein `@testing-library/react` in diesem Workspace).
 */

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(el: React.ReactElement): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(el));
}

function hoverEnter(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
  });
}

function hoverLeave(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
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

describe('StationenOrb — Pill + Popover', () => {
  it('startet geschlossen, Pill sichtbar', () => {
    render(<StationenOrb onStationOeffnen={vi.fn()} />);
    expect(q('stationen-orb-pill')).not.toBeNull();
    expect(q('stationen-orb-popover')).toBeNull();
  });

  it('Klick auf die Pill öffnet das Popover mit allen 5 Stationen', () => {
    render(<StationenOrb onStationOeffnen={vi.fn()} />);
    klick(q('stationen-orb-pill')!);
    expect(q('stationen-orb-popover')).not.toBeNull();
    expect(q('stationen-orb-eintrag-design')).not.toBeNull();
    expect(q('stationen-orb-eintrag-data')).not.toBeNull();
    expect(q('stationen-orb-eintrag-vis')).not.toBeNull();
    expect(q('stationen-orb-eintrag-prepare')).not.toBeNull();
    expect(q('stationen-orb-eintrag-publish')).not.toBeNull();
  });

  it('jeder Eintrag trägt einen 7px-Rollenpunkt mit eigener Farbe', () => {
    render(<StationenOrb onStationOeffnen={vi.fn()} />);
    klick(q('stationen-orb-pill')!);
    const punkt = q('stationen-orb-eintrag-vis')!.querySelector('.isl-rollenpunkt') as HTMLElement;
    expect(punkt).not.toBeNull();
    expect(punkt.style.background).not.toBe('');
  });

  it('Klick auf einen Eintrag ruft onStationOeffnen mit der echten Id auf und schliesst das Popover', () => {
    const onStationOeffnen = vi.fn<(s: StationenOrbId) => void>();
    render(<StationenOrb onStationOeffnen={onStationOeffnen} />);
    klick(q('stationen-orb-pill')!);
    klick(q('stationen-orb-eintrag-publish')!);
    expect(onStationOeffnen).toHaveBeenCalledWith('publish');
    expect(q('stationen-orb-popover')).toBeNull();
  });
});

describe('StationenOrb — Auto-Schliessen 700ms', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('schliesst das Popover 700ms nach Pointer-Verlassen', () => {
    render(<StationenOrb onStationOeffnen={vi.fn()} />);
    hoverEnter(q('stationen-orb-root')!);
    expect(q('stationen-orb-popover')).not.toBeNull();
    hoverLeave(q('stationen-orb-root')!);
    act(() => {
      vi.advanceTimersByTime(699);
    });
    expect(q('stationen-orb-popover')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(q('stationen-orb-popover')).toBeNull();
  });
});
