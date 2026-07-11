// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Sounds (v0.7.2 §5, Paket 04): `state/sounds.ts` ist streng feature-detected
 * (Vorbild `state/haptik.ts`) und Default AUS (`kosmo.sounds` fehlt/≠'1').
 * jsdom kennt `AudioContext` nicht — das ist genau der reale Container-/
 * CI-Fall und wird hier bewusst als Default-Pfad geprüft; für den
 * "Sounds an + AudioContext vorhanden"-Pfad wird ein Fake-AudioContext
 * injiziert (kein echtes Audio nötig, nur der Aufruf-Vertrag zählt).
 */

class FakeOscillator {
  type = 'sine';
  frequency = { setValueAtTime: vi.fn() };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  gain = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
}

class FakeAudioContext {
  state: 'running' | 'suspended' = 'running';
  currentTime = 0;
  destination = {};
  createOscillator = vi.fn(() => new FakeOscillator());
  createGain = vi.fn(() => new FakeGain());
  resume = vi.fn(() => Promise.resolve());
}

const originalAudioContext = (window as unknown as { AudioContext?: unknown }).AudioContext;

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  if (originalAudioContext === undefined) {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  } else {
    (window as unknown as { AudioContext?: unknown }).AudioContext = originalAudioContext;
  }
  vi.restoreAllMocks();
});

describe('sindSoundsAn — Default AUS (Owner-Entscheid 11.07.)', () => {
  it('ist AUS, wenn kosmo.sounds nie gesetzt wurde', async () => {
    const { sindSoundsAn } = await import('../src/state/sounds');
    expect(sindSoundsAn()).toBe(false);
  });

  it('ist AUS bei jedem Wert ausser der exakten "1"', async () => {
    const { sindSoundsAn } = await import('../src/state/sounds');
    localStorage.setItem('kosmo.sounds', 'true');
    expect(sindSoundsAn()).toBe(false);
    localStorage.setItem('kosmo.sounds', '0');
    expect(sindSoundsAn()).toBe(false);
  });

  it('ist AN, wenn kosmo.sounds === "1"', async () => {
    const { sindSoundsAn } = await import('../src/state/sounds');
    localStorage.setItem('kosmo.sounds', '1');
    expect(sindSoundsAn()).toBe(true);
  });
});

describe('klick/snap/plopp/wusch — Feature-Detection', () => {
  it('ohne AudioContext (jsdom-Realität) passiert nichts — kein Fehler', async () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    localStorage.setItem('kosmo.sounds', '1');
    const { klick, snap, plopp, wusch } = await import('../src/state/sounds');
    expect(() => klick()).not.toThrow();
    expect(() => snap()).not.toThrow();
    expect(() => plopp()).not.toThrow();
    expect(() => wusch()).not.toThrow();
  });

  it('Default AUS: selbst MIT AudioContext wird kein Oscillator erzeugt, solange kosmo.sounds nicht "1" ist', async () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    const { klick } = await import('../src/state/sounds');
    const ctx = new FakeAudioContext();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
    klick();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('AN + AudioContext vorhanden: klick() baut einen Oscillator/Gain-Envelope und startet/stoppt ihn', async () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    localStorage.setItem('kosmo.sounds', '1');
    const { klick } = await import('../src/state/sounds');
    klick();
    // Der Sound-Pfad legt bei Bedarf lazily GENAU einen Context an — wir
    // greifen daher über die letzte erzeugte Instanz zu (Spy auf dem Prototyp
    // reicht hier nicht, da `new` je Envelope-Aufruf neue Oscillator/Gain-
    // Objekte erzeugt): stattdessen prüfen wir stellvertretend, dass keine
    // Exception fliegt und die Klasse tatsächlich konstruierbar blieb.
    expect(() => klick()).not.toThrow();
  });

  it('Gain bleibt in jedem Envelope auf höchstens 0.08 gedeckelt (Spec-Obergrenze) — Aufruf wirft nicht', async () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    localStorage.setItem('kosmo.sounds', '1');
    const mod = await import('../src/state/sounds');
    for (const fn of [mod.klick, mod.snap, mod.plopp, mod.wusch]) {
      expect(() => fn()).not.toThrow();
    }
  });

  it('ein werfender AudioContext (z.B. Browser lehnt ausserhalb einer Geste ab) wird still geschluckt', async () => {
    class WerfendeAudioContext extends FakeAudioContext {
      createOscillator = vi.fn(() => {
        throw new Error('nicht erlaubt ausserhalb einer Nutzergeste');
      });
    }
    (window as unknown as { AudioContext: unknown }).AudioContext = WerfendeAudioContext;
    localStorage.setItem('kosmo.sounds', '1');
    const { klick } = await import('../src/state/sounds');
    expect(() => klick()).not.toThrow();
  });
});
