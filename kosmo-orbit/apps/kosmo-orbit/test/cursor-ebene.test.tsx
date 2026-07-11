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

  it('rendert den Wrapper, wenn Eigencursor aktiv ist und navigator.webdriver nicht gesetzt ist', async () => {
    setzeMatchMedia(true);
    const { CursorEbene } = await import('../src/shell/CursorEbene');
    const html = renderToStaticMarkup(<CursorEbene />);
    expect(html).toContain('data-testid="cursor-ebene"');
  });

  it('rendert nichts ohne gespeicherten Wert bei pointer:coarse (Touch-only-Default)', async () => {
    setzeMatchMedia(false);
    const { CursorEbene } = await import('../src/shell/CursorEbene');
    expect(renderToStaticMarkup(<CursorEbene />)).toBe('');
  });
});
