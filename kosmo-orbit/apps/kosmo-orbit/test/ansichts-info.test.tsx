// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnsichtsInfo } from '../src/modules/design/island/AnsichtsInfo';
import type { ViewMode } from '../src/state/ui-zustand';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * PD2 (`docs/ISLAND-UI-SPEZ.md` §1-Tabelle) — Ansichts-Info: Mono-Label,
 * Popover mit Ansichts-Chips, Auto-Schliessen 700ms. Rendert über
 * `createRoot`/`act`/`dispatchEvent` (Muster `island-shell.test.tsx`, kein
 * `@testing-library/react` in diesem Workspace).
 *
 * **PB3-Vertragsänderung (`docs/V084-SPEZ.md` §8 C-24):** der Geschoss-Teil
 * (Chips + `storeys`/`activeStoreyId`/`setActiveStorey`-Props) ist nach
 * `GeschossPille.tsx` ausgelagert (eigener `pb3-geschoss-pille.test.tsx`) —
 * dieser Test behält NUR noch die Ansichts-Assertions, die drei zuvor
 * Geschoss-bezogenen Fälle (Mono-Label mit «· EG»-Suffix, Geschoss-Chips im
 * Popover, Klick auf einen Geschoss-Chip, `aria-pressed` am Geschoss-Chip)
 * sind entfernt bzw. auf reine Ansichts-Assertions gekürzt — begründet im
 * PB3-Bericht.
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
 * Wurzel-Element, `packages/kosmo-ui/src/overlay-schliessen.ts`) statt des
 * vorherigen lokalen `onMouseEnter`/`onMouseLeave`-Handbaus — `hoverEnter`
 * feuert darum ZUSÄTZLICH ein `mouseover` (öffnet weiterhin über die
 * Komponenten-eigene `onMouseEnter`-Prop) UND ein `pointerenter` (storniert
 * einen ggf. laufenden Rückklapp-Timer, exakt wie ein echter Maus-
 * Wiedereintritt beides gleichzeitig auslöst); `hoverLeave` feuert
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

describe('AnsichtsInfo — Label + Popover', () => {
  it('zeigt das Mono-Label als reines Ansichts-Kürzel (PB3: kein «· GESCHOSS»-Suffix mehr)', () => {
    const setViewMode = vi.fn();
    render(<AnsichtsInfo viewMode="2d" setViewMode={setViewMode} />);
    expect(q('ansichts-info-label')!.textContent).toBe('GRUNDRISS');
  });

  it('Klick auf das Label öffnet das Popover mit vier Ansichts-Chips (Geschoss-Chips PB3 nach GeschossPille ausgelagert)', () => {
    render(<AnsichtsInfo viewMode="3d" setViewMode={vi.fn()} />);
    expect(q('ansichts-info-popover')).toBeNull();
    klick(q('ansichts-info-label')!);
    expect(q('ansichts-info-popover')).not.toBeNull();
    expect(q('ansichts-info-ansicht-3d')).not.toBeNull();
    expect(q('ansichts-info-ansicht-split')).not.toBeNull();
    expect(q('ansichts-info-ansicht-quad')).not.toBeNull();
    expect(q('ansichts-info-ansicht-2d')).not.toBeNull();
    // PB3: Geschoss-Chips existieren HIER nicht mehr — s. `pb3-geschoss-
    // pille.test.tsx` für die (unverändert wörtliche) `ansichts-info-
    // geschoss-*`-testid-Fortsetzung.
    expect(q('ansichts-info-geschoss-EG')).toBeNull();
  });

  it('Klick auf einen Ansichts-Chip ruft setViewMode mit dem echten ViewMode-Wert auf', () => {
    const setViewMode = vi.fn<(v: ViewMode) => void>();
    render(<AnsichtsInfo viewMode="3d" setViewMode={setViewMode} />);
    klick(q('ansichts-info-label')!);
    klick(q('ansichts-info-ansicht-2d')!);
    expect(setViewMode).toHaveBeenCalledWith('2d');
  });

  it('markiert den aktiven Ansichts-Chip via aria-pressed', () => {
    render(<AnsichtsInfo viewMode="split" setViewMode={vi.fn()} />);
    klick(q('ansichts-info-label')!);
    expect(q('ansichts-info-ansicht-split')!.getAttribute('aria-pressed')).toBe('true');
    expect(q('ansichts-info-ansicht-2d')!.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('AnsichtsInfo — Auto-Schliessen 700ms', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('schliesst das Popover 700ms nach Pointer-Verlassen', () => {
    render(<AnsichtsInfo viewMode="3d" setViewMode={vi.fn()} />);
    hoverEnter(q('ansichts-info-root')!);
    expect(q('ansichts-info-popover')).not.toBeNull();
    hoverLeave(q('ansichts-info-root')!);
    act(() => {
      vi.advanceTimersByTime(699);
    });
    expect(q('ansichts-info-popover')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(q('ansichts-info-popover')).toBeNull();
  });

  it('ein erneuter Pointer-Eintritt VOR Ablauf storniert den Rückklapp-Timer restlos', () => {
    render(<AnsichtsInfo viewMode="3d" setViewMode={vi.fn()} />);
    hoverEnter(q('ansichts-info-root')!);
    hoverLeave(q('ansichts-info-root')!);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    hoverEnter(q('ansichts-info-root')!);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(q('ansichts-info-popover')).not.toBeNull();
  });
});

describe('AnsichtsInfo — Popup-Gesetz (PB4, §3 E3, useOverlaySchliessen-Rollout)', () => {
  it('Escape schliesst das offene Popover', () => {
    render(<AnsichtsInfo viewMode="3d" setViewMode={vi.fn()} />);
    klick(q('ansichts-info-label')!);
    expect(q('ansichts-info-popover')).not.toBeNull();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(q('ansichts-info-popover')).toBeNull();
  });

  it('ein Klick ausserhalb der Wurzel schliesst das offene Popover', () => {
    render(<AnsichtsInfo viewMode="3d" setViewMode={vi.fn()} />);
    klick(q('ansichts-info-label')!);
    expect(q('ansichts-info-popover')).not.toBeNull();
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(q('ansichts-info-popover')).toBeNull();
  });

  it('ein Klick auf einen Chip INNERHALB des Popovers schliesst es NICHT (Aussenklick-Guard)', () => {
    const setViewMode = vi.fn();
    render(<AnsichtsInfo viewMode="3d" setViewMode={setViewMode} />);
    klick(q('ansichts-info-label')!);
    act(() => {
      q('ansichts-info-ansicht-2d')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(q('ansichts-info-popover')).not.toBeNull();
  });
});
