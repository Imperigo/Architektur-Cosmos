// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IslandShell } from '../src/modules/design/island/IslandShell';
import { WERKZEUG_KATALOG, werkzeugeFuerIsland } from '../src/modules/design/island/island-katalog';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * PD1 Fundament (`docs/ISLAND-UI-SPEZ.md` §4.1/§4.2/§7-PD1-Zeile) —
 * `IslandShell`s Zustandsmaschine (pill↔leiste↔popup↔fenster), der
 * 900ms-Rückklapp-Timer, die Toast-Regel für Werkzeuge ohne Popup, der
 * Katalog (29/29, 11/6/6/6) und beide Farbwelten (PAPIER/`orbit`).
 *
 * Rendert über einen echten `createRoot` (Muster `schwarm-orbs.test.tsx`/
 * `varianten-panel.test.tsx`) — jsdom kennt `mouseenter`/`mouseleave` nicht
 * nativ als React-Ereignisse (React hängt intern an `mouseover`/`mouseout`
 * mit berechneter Enter/Leave-Semantik über `relatedTarget`); die Hover-
 * Helfer unten feuern deshalb `mouseover`/`mouseout` mit einem
 * `relatedTarget` AUSSERHALB des Wurzelelements — geprüft, dass das
 * `onMouseEnter`/`onMouseLeave` tatsächlich auslöst (kein PointerEvent nötig,
 * jsdom kennt `PointerEvent` ohnehin nicht, s. `node-canvas-pan.test.tsx`).
 *
 * `@testing-library/react` ist in diesem Workspace NICHT installiert (kein
 * Eintrag in keinem `package.json`, `npm ls @testing-library/react` liefert
 * `(empty)`) — dieser Test folgt darum bewusst dem BESTEHENDEN Repo-Muster
 * (`createRoot`/`act`/`dispatchEvent`, s.o.) statt eine neue Test-Abhängigkeit
 * einzuführen, die kein anderer Test dieses Workspaces nutzt.
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

const urspruenglichesTheme = document.documentElement.dataset.theme;

afterEach(() => {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  if (urspruenglichesTheme === undefined) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = urspruenglichesTheme;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Island-Katalog (§3, 29/29)', () => {
  it('zählt 11 ZEICHNEN / 6 ANSICHT / 6 PROJEKT / 6 AUSTAUSCH — Gesamt 29', () => {
    expect(werkzeugeFuerIsland('zeichnen')).toHaveLength(11);
    expect(werkzeugeFuerIsland('ansicht')).toHaveLength(6);
    expect(werkzeugeFuerIsland('projekt')).toHaveLength(6);
    expect(werkzeugeFuerIsland('austausch')).toHaveLength(6);
    expect(WERKZEUG_KATALOG).toHaveLength(29);
  });

  it('jede Id ist eindeutig (keine doppelten Werkzeuge über die vier Islands hinweg)', () => {
    const ids = WERKZEUG_KATALOG.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('IslandShell — Zustandsmaschine (§4.1: pill→leiste→popup→fenster→zu)', () => {
  beforeEach(() => {
    render(<IslandShell island="zeichnen" />);
  });

  it('startet als Pill, kein Leiste/Popup/Fenster', () => {
    expect(q('island-zeichnen-pill')).not.toBeNull();
    expect(q('island-zeichnen-leiste')).toBeNull();
  });

  it('Hover öffnet die Leiste (Stufe 1) mit allen 11 ZEICHNEN-Werkzeugen', () => {
    hoverEnter(q('island-zeichnen-root')!);
    expect(q('island-zeichnen-pill')).toBeNull();
    expect(q('island-zeichnen-leiste')).not.toBeNull();
    expect(q('island-werkzeug-wand')).not.toBeNull();
    expect(q('island-werkzeug-auswahl')).not.toBeNull();
    expect(q('island-werkzeug-messen')).not.toBeNull();
  });

  it('Klick auf ein Werkzeug MIT Popup (Wand) öffnet das Mini-Popup (Stufe 2)', () => {
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    expect(q('island-wand-popup')).not.toBeNull();
    expect(q('island-wand-fenster')).toBeNull();
  });

  it('2. Klick auf dasselbe Werkzeug eskaliert Popup → Einstellungsfenster (Stufe 3)', () => {
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    klick(q('island-werkzeug-wand')!);
    expect(q('island-wand-popup')).toBeNull();
    expect(q('island-wand-fenster')).not.toBeNull();
  });

  it('2. Klick auf die Popup-Fläche selbst eskaliert ebenfalls zum Fenster', () => {
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    klick(q('island-wand-popup')!);
    expect(q('island-wand-fenster')).not.toBeNull();
  });

  it('Schliessen-Knopf am Fenster geht zurück auf die Leiste («zu»), nicht bis zur Pill', () => {
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    klick(q('island-werkzeug-wand')!);
    klick(q('island-wand-fenster-schliessen')!);
    expect(q('island-wand-fenster')).toBeNull();
    expect(q('island-wand-popup')).toBeNull();
    expect(q('island-zeichnen-leiste')).not.toBeNull();
    expect(q('island-zeichnen-pill')).toBeNull();
  });
});

describe('IslandShell — 900ms-Rückklapp-Timer (§4.2, Fake-Timer)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(<IslandShell island="projekt" />);
  });

  it('klappt 900ms nach Pointer-Verlassen zur Pill zurück', () => {
    hoverEnter(q('island-projekt-root')!);
    expect(q('island-projekt-leiste')).not.toBeNull();

    hoverLeave(q('island-projekt-root')!);
    act(() => {
      vi.advanceTimersByTime(899);
    });
    expect(q('island-projekt-leiste')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(q('island-projekt-leiste')).toBeNull();
    expect(q('island-projekt-pill')).not.toBeNull();
  });

  it('erneutes Betreten VOR Ablauf storniert den Rückklapp-Timer', () => {
    hoverEnter(q('island-projekt-root')!);
    hoverLeave(q('island-projekt-root')!);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    hoverEnter(q('island-projekt-root')!);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    // 500+600=1100ms seit dem ersten Verlassen, aber der Timer wurde bei 500ms
    // storniert — die Leiste darf NICHT zugeklappt sein.
    expect(q('island-projekt-leiste')).not.toBeNull();
  });

  it('ein offenes Popup hält die Insel offen — kein Rückklapp trotz > 900ms', () => {
    hoverEnter(q('island-projekt-root')!);
    klick(q('island-werkzeug-kennzahlen')!);
    expect(q('island-kennzahlen-popup')).not.toBeNull();

    hoverLeave(q('island-projekt-root')!);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(q('island-kennzahlen-popup')).not.toBeNull();
    expect(q('island-projekt-pill')).toBeNull();
  });
});

describe('IslandShell — Toast für Werkzeuge ohne Popup (§4.2, «‹NAME› AKTIV», 1.7s)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('Klick auf Achsen (hatPopup=false) zeigt Toast «ACHSEN AKTIV» statt eines Popups', () => {
    render(<IslandShell island="ansicht" />);
    hoverEnter(q('island-ansicht-root')!);
    klick(q('island-werkzeug-achsen')!);

    expect(q('island-achsen-popup')).toBeNull();
    const toast = q('island-toast');
    expect(toast).not.toBeNull();
    expect(toast!.textContent).toBe('ACHSEN AKTIV');

    // Leiste bleibt offen (nur der Toast quittiert, kein Stufenwechsel).
    expect(q('island-ansicht-leiste')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1699);
    });
    expect(q('island-toast')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(q('island-toast')).toBeNull();
  });

  it('Klick auf Manuell (hatPopup=false, AUSTAUSCH) zeigt Toast «MANUELL AKTIV»', () => {
    render(<IslandShell island="austausch" />);
    hoverEnter(q('island-austausch-root')!);
    klick(q('island-werkzeug-manuell')!);
    expect(q('island-toast')?.textContent).toBe('MANUELL AKTIV');
  });
});

describe('IslandShell — beide Farbwelten (PAPIER/`orbit`, bestehender Theme-Mechanismus)', () => {
  it('rendert unverändert unter [data-theme="paper"] (PAPIER, Default)', () => {
    document.documentElement.dataset.theme = 'paper';
    render(<IslandShell island="zeichnen" />);
    expect(q('island-zeichnen-pill')).not.toBeNull();
    expect(container!.querySelector('.isl-root')).not.toBeNull();
  });

  it('rendert unverändert unter [data-theme="orbit"] (KOSMOS) — kein zweiter Mechanismus, derselbe Automat', () => {
    document.documentElement.dataset.theme = 'orbit';
    render(<IslandShell island="zeichnen" />);
    expect(q('island-zeichnen-pill')).not.toBeNull();
    hoverEnter(q('island-zeichnen-root')!);
    expect(q('island-zeichnen-leiste')).not.toBeNull();
  });
});

describe('IslandShell — prefers-reduced-motion (§4.2: Endzustände ohne Feder-Animation)', () => {
  function stubReduziert(reduziert: boolean): void {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduziert : false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
  }

  it('data-reduziert="false" + Motion-Klasse gesetzt, wenn prefers-reduced-motion NICHT gilt', () => {
    stubReduziert(false);
    render(<IslandShell island="zeichnen" />);
    expect(q('island-zeichnen-root')?.getAttribute('data-reduziert')).toBe('false');
    hoverEnter(q('island-zeichnen-root')!);
    expect(q('island-zeichnen-leiste')?.className).toContain('isl-anim-islIn');
  });

  it('data-reduziert="true" + KEINE Motion-Klasse, wenn prefers-reduced-motion gilt (Endzustand sofort)', () => {
    stubReduziert(true);
    render(<IslandShell island="zeichnen" />);
    expect(q('island-zeichnen-root')?.getAttribute('data-reduziert')).toBe('true');
    hoverEnter(q('island-zeichnen-root')!);
    expect(q('island-zeichnen-leiste')).not.toBeNull();
    expect(q('island-zeichnen-leiste')?.className).not.toContain('isl-anim-islIn');
  });
});
