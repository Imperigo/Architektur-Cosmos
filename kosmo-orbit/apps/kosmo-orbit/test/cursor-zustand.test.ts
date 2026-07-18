// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * v0.7.2 §8 (Paket 08): `state/cursor-zustand.ts` — der Cursor-Store selbst
 * (default/loading/kosmo/tool) + `eigencursorAktiv()`, die massgebliche
 * Absicherung der Spec-Regel «Default AN nur bei `pointer:fine`» (die
 * zugehörige E2E-Suite, `e2e/cursor-ebene.spec.ts`, dokumentiert, warum
 * Playwright/Chromium `pointer:coarse` in dieser Umgebung nicht zuverlässig
 * emuliert — DIESE Suite hier ist die harte Prüfung, per gemocktem
 * `matchMedia`).
 */

function setzeMatchMedia(fineErgebnis: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('pointer: fine') ? fineErgebnis : !fineErgebnis,
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
  vi.restoreAllMocks();
});

describe('eigencursorAktiv — Default AN nur bei pointer:fine (Spec §8, wörtlich)', () => {
  it('ohne gespeicherten Wert: AN bei pointer:fine', async () => {
    setzeMatchMedia(true);
    const { eigencursorAktiv } = await import('../src/state/cursor-zustand');
    expect(eigencursorAktiv()).toBe(true);
  });

  it('ohne gespeicherten Wert: AUS bei pointer:coarse (Touch-only)', async () => {
    setzeMatchMedia(false);
    const { eigencursorAktiv } = await import('../src/state/cursor-zustand');
    expect(eigencursorAktiv()).toBe(false);
  });

  it('kosmo.eigencursor="1" gewinnt IMMER, auch bei pointer:coarse', async () => {
    setzeMatchMedia(false);
    localStorage.setItem('kosmo.eigencursor', '1');
    const { eigencursorAktiv } = await import('../src/state/cursor-zustand');
    expect(eigencursorAktiv()).toBe(true);
  });

  it('kosmo.eigencursor="0" gewinnt IMMER, auch bei pointer:fine', async () => {
    setzeMatchMedia(true);
    localStorage.setItem('kosmo.eigencursor', '0');
    const { eigencursorAktiv } = await import('../src/state/cursor-zustand');
    expect(eigencursorAktiv()).toBe(false);
  });

  it('jeder andere Wert als "1"/"0" fällt auf die pointer:fine-Regel zurück', async () => {
    setzeMatchMedia(true);
    localStorage.setItem('kosmo.eigencursor', 'true');
    const { eigencursorAktiv } = await import('../src/state/cursor-zustand');
    expect(eigencursorAktiv()).toBe(true);
    setzeMatchMedia(false);
    expect(eigencursorAktiv()).toBe(false);
  });

  it('wirft nie, selbst wenn matchMedia fehlt (defensiv wie state/sounds.ts)', async () => {
    vi.stubGlobal('matchMedia', undefined);
    const { eigencursorAktiv } = await import('../src/state/cursor-zustand');
    expect(() => eigencursorAktiv()).not.toThrow();
    expect(eigencursorAktiv()).toBe(false);
  });
});

describe('bevorzugtReduzierteBewegung', () => {
  it('spiegelt matchMedia("(prefers-reduced-motion: reduce)") wider', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
    const { bevorzugtReduzierteBewegung } = await import('../src/state/cursor-zustand');
    expect(bevorzugtReduzierteBewegung()).toBe(true);
  });
});

describe('formVonComputedCursor — reine Zonen-Form-Abbildung (v0.8.4 PA1, D1-Fix)', () => {
  it('mappt die sechs vertraglichen Werte auf ihre Form', async () => {
    const { formVonComputedCursor } = await import('../src/state/cursor-zustand');
    expect(formVonComputedCursor('crosshair')).toBe('fadenkreuz');
    expect(formVonComputedCursor('grab')).toBe('greifen');
    expect(formVonComputedCursor('grabbing')).toBe('greift');
    expect(formVonComputedCursor('col-resize')).toBe('spalte');
    expect(formVonComputedCursor('row-resize')).toBe('zeile');
    expect(formVonComputedCursor('not-allowed')).toBe('gesperrt');
  });

  it('bleibt neutral (null) für auto/default/pointer/leer', async () => {
    const { formVonComputedCursor } = await import('../src/state/cursor-zustand');
    expect(formVonComputedCursor('auto')).toBeNull();
    expect(formVonComputedCursor('default')).toBeNull();
    expect(formVonComputedCursor('pointer')).toBeNull();
    expect(formVonComputedCursor('')).toBeNull();
  });

  it('bleibt neutral (null) für "none" — das reine Vererbungs-Artefakt von :root{cursor:none}, KEIN Zonen-Signal (D1-Fundursache)', async () => {
    const { formVonComputedCursor } = await import('../src/state/cursor-zustand');
    expect(formVonComputedCursor('none')).toBeNull();
  });

  it('bleibt neutral (null) für unbekannte/exotische Cursor-Keywords (z.B. text/help/zoom-in)', async () => {
    const { formVonComputedCursor } = await import('../src/state/cursor-zustand');
    expect(formVonComputedCursor('text')).toBeNull();
    expect(formVonComputedCursor('help')).toBeNull();
    expect(formVonComputedCursor('zoom-in')).toBeNull();
  });
});

describe('useCursorZustand — Store (default/loading/kosmo/tool)', () => {
  it('startet im Zustand "default", ohne Tool-Info', async () => {
    const { useCursorZustand } = await import('../src/state/cursor-zustand');
    expect(useCursorZustand.getState().zustand).toBe('default');
    expect(useCursorZustand.getState().tool).toBeNull();
  });

  it('setzeToolCursor setzt Zustand "tool" + Tool-Info atomar', async () => {
    const { useCursorZustand } = await import('../src/state/cursor-zustand');
    useCursorZustand.getState().setzeToolCursor({ art: 'draw', rolle: '--k-rolle-manuell' });
    expect(useCursorZustand.getState().zustand).toBe('tool');
    expect(useCursorZustand.getState().tool).toEqual({ art: 'draw', rolle: '--k-rolle-manuell' });
  });

  it('zurueckAufDefault löscht Zustand UND Tool-Info', async () => {
    const { useCursorZustand } = await import('../src/state/cursor-zustand');
    useCursorZustand.getState().setzeToolCursor({ art: 'viz' });
    useCursorZustand.getState().zurueckAufDefault();
    expect(useCursorZustand.getState().zustand).toBe('default');
    expect(useCursorZustand.getState().tool).toBeNull();
  });

  it('setzeZustand("loading"/"kosmo") ändert nur den Zustand, Tool-Info bleibt unangetastet', async () => {
    const { useCursorZustand } = await import('../src/state/cursor-zustand');
    useCursorZustand.getState().setzeZustand('loading');
    expect(useCursorZustand.getState().zustand).toBe('loading');
    useCursorZustand.getState().setzeZustand('kosmo');
    expect(useCursorZustand.getState().zustand).toBe('kosmo');
  });
});
