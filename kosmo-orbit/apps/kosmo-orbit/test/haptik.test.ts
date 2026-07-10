import { afterEach, describe, expect, it, vi } from 'vitest';
import { bestaetigt, tick } from '../src/state/haptik';

/**
 * Haptik (v0.6.6 / Welle 2 Stream C, MOTION-KONZEPT-066 §6): `tick()`/
 * `bestaetigt()` sind streng feature-detected — ohne `navigator.vibrate`
 * (Desktop/Tauri, die meisten Test-Umgebungen) passiert NICHTS, kein Fehler.
 * Mit einem Mock rufen sie exakt das dokumentierte Muster auf.
 */

const originalVibrate = (navigator as { vibrate?: (p: number | number[]) => boolean }).vibrate;

afterEach(() => {
  if (originalVibrate === undefined) {
    delete (navigator as { vibrate?: unknown }).vibrate;
  } else {
    (navigator as { vibrate?: unknown }).vibrate = originalVibrate;
  }
  vi.restoreAllMocks();
});

describe('haptik', () => {
  it('tick() ruft navigator.vibrate(10) auf, wenn verfügbar', () => {
    const vibrate = vi.fn().mockReturnValue(true);
    (navigator as unknown as { vibrate: typeof vibrate }).vibrate = vibrate;
    tick();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it('bestaetigt() ruft navigator.vibrate([12, 30, 12]) auf', () => {
    const vibrate = vi.fn().mockReturnValue(true);
    (navigator as unknown as { vibrate: typeof vibrate }).vibrate = vibrate;
    bestaetigt();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith([12, 30, 12]);
  });

  it('ohne navigator.vibrate (Desktop/Tauri) passiert nichts — kein Fehler, kein Fake', () => {
    delete (navigator as { vibrate?: unknown }).vibrate;
    expect(() => tick()).not.toThrow();
    expect(() => bestaetigt()).not.toThrow();
  });

  it('wirft navigator.vibrate → wird still geschluckt (kein kritischer Pfad)', () => {
    const vibrate = vi.fn(() => {
      throw new Error('nicht erlaubt ausserhalb einer Nutzergeste');
    });
    (navigator as unknown as { vibrate: typeof vibrate }).vibrate = vibrate;
    expect(() => tick()).not.toThrow();
    expect(() => bestaetigt()).not.toThrow();
  });

  it('navigator.vibrate als Nicht-Funktion (z.B. undefined) wird als "nicht unterstützt" behandelt', () => {
    (navigator as { vibrate?: unknown }).vibrate = undefined;
    expect(() => tick()).not.toThrow();
  });
});
