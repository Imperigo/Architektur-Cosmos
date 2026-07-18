// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * v0.8.3 / P8 (E10 §10.2, `docs/V083-SPEZ.md`) — `state/touch-undo.ts`, der
 * reine localStorage-Spiegel hinter der Zwei-Finger-Doppeltipp-Undo-Geste.
 * Muster wie `test/cursor-zustand.test.ts`/`test/sounds.ts` (Default AUS
 * geprüft, anders als `abspielenEingestellt` — Default AN — s. §10.2-
 * Kopfkommentar in `touch-undo.ts`).
 */

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('touchUndoGesteAktiv — Default AUS (§8-1 bleibt Owner-offen)', () => {
  it('ohne gespeicherten Wert: AUS', async () => {
    const { touchUndoGesteAktiv } = await import('../src/state/touch-undo');
    expect(touchUndoGesteAktiv()).toBe(false);
  });

  it('setTouchUndoGesteEingestellt(true) schaltet AN, "1" ist der einzige Wahr-Wert', async () => {
    const { touchUndoGesteAktiv, setTouchUndoGesteEingestellt } = await import('../src/state/touch-undo');
    setTouchUndoGesteEingestellt(true);
    expect(localStorage.getItem('kosmo.touch-undo-geste')).toBe('1');
    expect(touchUndoGesteAktiv()).toBe(true);
  });

  it('setTouchUndoGesteEingestellt(false) schreibt "0" und bleibt AUS', async () => {
    const { touchUndoGesteAktiv, setTouchUndoGesteEingestellt } = await import('../src/state/touch-undo');
    setTouchUndoGesteEingestellt(true);
    setTouchUndoGesteEingestellt(false);
    expect(localStorage.getItem('kosmo.touch-undo-geste')).toBe('0');
    expect(touchUndoGesteAktiv()).toBe(false);
  });

  it('jeder andere gespeicherte Wert als "1" gilt als AUS', async () => {
    const { touchUndoGesteAktiv } = await import('../src/state/touch-undo');
    localStorage.setItem('kosmo.touch-undo-geste', 'true');
    expect(touchUndoGesteAktiv()).toBe(false);
  });

  it('wirft nie, selbst ohne localStorage', async () => {
    const echtesLocalStorage = globalThis.localStorage;
    // @ts-expect-error — defensiver Testfall, s. `sounds.ts`/`cursor-zustand.ts`-Muster
    delete globalThis.localStorage;
    try {
      const { touchUndoGesteAktiv, setTouchUndoGesteEingestellt } = await import('../src/state/touch-undo');
      expect(() => touchUndoGesteAktiv()).not.toThrow();
      expect(touchUndoGesteAktiv()).toBe(false);
      expect(() => setTouchUndoGesteEingestellt(true)).not.toThrow();
    } finally {
      globalThis.localStorage = echtesLocalStorage;
    }
  });
});
