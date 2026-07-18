// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IslandShell } from '../src/modules/design/island/IslandShell';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * PB2 «Werkzeug-Chrome» (v0.8.4, `docs/V084-SPEZ.md` §7 Sanktion 3,
 * Bauauftrag Punkte 1/2/4) — eigene, NEUE Testdatei (additiv zu
 * `island-shell.test.tsx`/`island-shell-pd2.test.tsx`, keine bestehende
 * Testdatei inhaltlich verändert, ausser der mechanisch nötigen
 * 900→1000ms-Zeitkorrektur in `island-shell.test.tsx`, s. Bauagenten-
 * Bericht):
 *
 *  1. Icon-Verdrahtung: Pille zeigt NUR ein SVG (kein Zweibuchstaben-Text
 *     mehr), Werkzeugknopf zeigt SVG + weiterhin den Namen als Textzeile.
 *  2. D15: das Popup enthält weder den alten `isl-popup-hinweis`-Absatz noch
 *     die Zeile «NOCHMALS KLICKEN → ALLE EINSTELLUNGEN».
 *  2. Lang-Hover-Tooltip: erscheint erst nach ~600ms Hover, verschwindet
 *     sofort bei Weg-Hover, schliesst auf Escape.
 *  4. `useOverlaySchliessen`-Adoption: Escape schliesst ein offenes Popup
 *     zurück auf die Leiste; ein Aussenklick schliesst es ebenfalls — AUSSER
 *     bei den drei Canvas-Klickketten-Werkzeugen (Öffnung/Messen/Kommentare,
 *     `AUSSENKLICK_AUSNAHME`), wo ein Aussenklick das Popup gezielt NICHT
 *     schliesst (s. `e2e/masskette-kommentar.spec.ts`, das genau diese
 *     Ausnahme voraussetzt). Der `icX`-Schliessen-Knopf bleibt in jedem Fall.
 *
 * Rendert über `createRoot`/`act`/`dispatchEvent` — dasselbe Muster wie
 * `island-shell.test.tsx` (kein `@testing-library/react` in diesem
 * Workspace).
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

function klick(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/** Löst React's `onPointerEnter`/`onPointerLeave` aus (Tooltip-Hover) —
 *  React berechnet Enter/Leave intern aus den BUBBELNDEN `pointerover`/
 *  `pointerout`-Events + `relatedTarget` (exakt dasselbe Muster wie
 *  `hoverEnter`/`hoverLeave` oben für `onMouseEnter`/`onMouseLeave` mit
 *  `mouseover`/`mouseout`) — ein rohes, nicht-bubbelndes `pointerenter`/
 *  `pointerleave` erreicht Reacts Root-Listener nie. */
function pointerEnter(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, relatedTarget: document.body }));
  });
}
function pointerLeave(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: document.body }));
  });
}

function mousedownAussen(): void {
  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  });
}

function escape(): void {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
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

describe('PB2 — Icon-Verdrahtung: Pille NUR Icon, Werkzeug Icon + Name', () => {
  it('die Pille rendert ein SVG statt des Zweibuchstaben-Textes', () => {
    render(<IslandShell island="zeichnen" />);
    const pill = q('island-zeichnen-pill')!;
    expect(pill.querySelector('svg')).not.toBeNull();
    expect(pill.textContent).toBe('');
  });

  it('jede der vier Pillen rendert ein eigenes SVG', () => {
    for (const island of ['zeichnen', 'ansicht', 'projekt', 'austausch'] as const) {
      render(<IslandShell island={island} />);
      expect(q(`island-${island}-pill`)!.querySelector('svg')).not.toBeNull();
      act(() => root!.unmount());
      container!.remove();
      container = null;
      root = null;
    }
  });

  it('ein Werkzeug MIT Icon (Wand) zeigt ein SVG UND behält den Namen als Textzeile', () => {
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    const knopf = q('island-werkzeug-wand')!;
    expect(knopf.querySelector('svg')).not.toBeNull();
    expect(q(`island-werkzeug-wand`)?.textContent).toContain('Wand');
  });

  it('«Skizze» bleibt der Text-Fallback (kein SVG, Kürzel + Name weiterhin sichtbar)', () => {
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    const knopf = q('island-werkzeug-skizze')!;
    expect(knopf.querySelector('svg')).toBeNull();
    expect(knopf.textContent).toContain('SK');
    expect(knopf.textContent).toContain('Skizze');
  });
});

describe('PB2 — D15: Popup ohne Hinweistext', () => {
  it('das Popup enthält weder isl-popup-hinweis noch «NOCHMALS KLICKEN»', () => {
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    const popup = q('island-wand-popup')!;
    expect(popup).not.toBeNull();
    expect(popup.querySelector('.isl-popup-hinweis')).toBeNull();
    expect(popup.textContent).not.toContain('NOCHMALS KLICKEN');
    expect(popup.textContent).not.toContain('ALLE EINSTELLUNGEN');
  });
});

describe('PB2 — Lang-Hover-Tooltip (~600ms, Weg-Hover/Esc schliesst)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
  });

  it('erscheint NICHT sofort, sondern erst nach ~600ms Hover', () => {
    pointerEnter(q('island-werkzeug-wand')!);
    expect(q('island-werkzeug-wand-tooltip')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(599);
    });
    expect(q('island-werkzeug-wand-tooltip')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(q('island-werkzeug-wand-tooltip')).not.toBeNull();
    expect(q('island-werkzeug-wand-tooltip')!.textContent).toContain('Wand');
  });

  it('Weg-Hover VOR Ablauf storniert den Tooltip (erscheint nie)', () => {
    pointerEnter(q('island-werkzeug-wand')!);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    pointerLeave(q('island-werkzeug-wand')!);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(q('island-werkzeug-wand-tooltip')).toBeNull();
  });

  it('Weg-Hover NACH dem Erscheinen schliesst den Tooltip sofort', () => {
    pointerEnter(q('island-werkzeug-wand')!);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(q('island-werkzeug-wand-tooltip')).not.toBeNull();
    pointerLeave(q('island-werkzeug-wand')!);
    expect(q('island-werkzeug-wand-tooltip')).toBeNull();
  });

  it('Escape schliesst einen gezeigten Tooltip', () => {
    pointerEnter(q('island-werkzeug-wand')!);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(q('island-werkzeug-wand-tooltip')).not.toBeNull();
    escape();
    expect(q('island-werkzeug-wand-tooltip')).toBeNull();
  });
});

describe('PB2 — useOverlaySchliessen-Adoption: Popup/Fenster (Esc + Aussenklick, X-Knopf bleibt)', () => {
  it('Escape schliesst ein offenes Popup zurück auf die Leiste (Wand, kein Ausnahme-Werkzeug)', () => {
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    expect(q('island-wand-popup')).not.toBeNull();
    escape();
    expect(q('island-wand-popup')).toBeNull();
    expect(q('island-zeichnen-leiste')).not.toBeNull();
  });

  it('Escape schliesst auch ein offenes Fenster (Stufe 3) zurück auf die Leiste', () => {
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    klick(q('island-werkzeug-wand')!); // Eskalation zum Fenster
    expect(q('island-wand-fenster')).not.toBeNull();
    escape();
    expect(q('island-wand-fenster')).toBeNull();
    expect(q('island-zeichnen-leiste')).not.toBeNull();
  });

  it('ein Aussenklick (mousedown ausserhalb der Insel) schliesst das Popup eines NICHT-ausgenommenen Werkzeugs (Wand)', () => {
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    expect(q('island-wand-popup')).not.toBeNull();
    mousedownAussen();
    expect(q('island-wand-popup')).toBeNull();
  });

  it('ein Klick INNERHALB des Popups schliesst es NICHT (kein falscher Aussenklick-Treffer)', () => {
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    act(() => {
      q('island-wand-popup')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(q('island-wand-popup')).not.toBeNull();
  });

  it('der icX-Schliessen-Knopf schliesst weiterhin (unverändert)', () => {
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    klick(q('island-wand-popup-schliessen')!);
    expect(q('island-wand-popup')).toBeNull();
    expect(q('island-zeichnen-leiste')).not.toBeNull();
  });

  it.each(['oeffnung', 'messen'])(
    'ein Aussenklick schliesst das Popup des Canvas-Klickketten-Werkzeugs "%s" NICHT (Ausnahme)',
    (werkzeugId) => {
      render(<IslandShell island="zeichnen" />);
      hoverEnter(q('island-zeichnen-root')!);
      klick(q(`island-werkzeug-${werkzeugId}`)!);
      expect(q(`island-${werkzeugId}-popup`)).not.toBeNull();
      mousedownAussen();
      expect(q(`island-${werkzeugId}-popup`)).not.toBeNull();
    },
  );

  it('ein Aussenklick schliesst das Popup von "kommentare" NICHT (Ausnahme, PROJEKT-Insel)', () => {
    render(<IslandShell island="projekt" />);
    hoverEnter(q('island-projekt-root')!);
    klick(q('island-werkzeug-kommentare')!);
    expect(q('island-kommentare-popup')).not.toBeNull();
    mousedownAussen();
    expect(q('island-kommentare-popup')).not.toBeNull();
  });

  it('Escape schliesst das Popup eines Ausnahme-Werkzeugs trotzdem (nur Aussenklick ist ausgenommen)', () => {
    render(<IslandShell island="projekt" />);
    hoverEnter(q('island-projekt-root')!);
    klick(q('island-werkzeug-kommentare')!);
    expect(q('island-kommentare-popup')).not.toBeNull();
    escape();
    expect(q('island-kommentare-popup')).toBeNull();
  });

  it('ohne offenes Popup/Fenster hat ein Aussenklick keine Wirkung (kein Crash, Leiste bleibt)', () => {
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    expect(() => mousedownAussen()).not.toThrow();
    expect(q('island-zeichnen-leiste')).not.toBeNull();
  });
});
