// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * v0.7.2 §8 (Paket 08) — Struktur-Smoke-Test für `shell/CursorEbene.tsx`:
 * die eigentliche interaktive Prüfung (Pointer-Bewegung, Zonen, reduced-
 * motion, webdriver-Gate) lebt in `e2e/cursor-ebene.spec.ts` (braucht einen
 * echten Browser/Pointer). Hier nur die render-Zeit-Logik, die schon VOR
 * jedem Effect entscheidet, ob überhaupt etwas gerendert wird
 * (`eigencursorAktiv() && (!navigator.webdriver || erzwungenAn)`).
 */

function setzeMatchMedia(fineErgebnis: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('pointer: fine') ? fineErgebnis : false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CursorEbene — Render-Zeit-Gating (vor jedem Effect)', () => {
  it('rendert nichts, wenn kosmo.eigencursor="0" gespeichert ist (Opt-out gewinnt immer)', async () => {
    setzeMatchMedia(true);
    localStorage.setItem('kosmo.eigencursor', '0');
    const { CursorEbene } = await import('../src/shell/CursorEbene');
    expect(renderToStaticMarkup(<CursorEbene />)).toBe('');
  });

  it('rendert den Wrapper (als body-Portal), wenn Eigencursor aktiv ist und navigator.webdriver nicht gesetzt ist', async () => {
    // v0.9.2 Owner-Feedback («verschwindet hinter einstellungsfenster»):
    // die Ebene rendert seither per createPortal direkt an document.body —
    // renderToStaticMarkup kann Portale prinzipiell nicht ausgeben, darum
    // prüft der Positiv-Fall hier über einen echten jsdom-Render, dass der
    // Wrapper im BODY landet (genau das ist der Stacking-Fix).
    setzeMatchMedia(true);
    const { CursorEbene } = await import('../src/shell/CursorEbene');
    const { createRoot } = await import('react-dom/client');
    const { act } = await import('react');
    const halter = document.createElement('div');
    document.body.appendChild(halter);
    const root = createRoot(halter);
    await act(async () => {
      root.render(<CursorEbene />);
    });
    const wrapper = document.querySelector('[data-testid="cursor-ebene"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper!.parentElement).toBe(document.body);
    await act(async () => {
      root.unmount();
    });
    halter.remove();
  });

  it('rendert nichts ohne gespeicherten Wert bei pointer:coarse (Touch-only-Default)', async () => {
    setzeMatchMedia(false);
    const { CursorEbene } = await import('../src/shell/CursorEbene');
    expect(renderToStaticMarkup(<CursorEbene />)).toBe('');
  });
});
