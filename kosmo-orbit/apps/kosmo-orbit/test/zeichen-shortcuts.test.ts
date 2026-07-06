import { describe, expect, it } from 'vitest';
import { werkzeugFuerTaste, ZEICHEN_KURZBEFEHLE } from '../src/modules/design/zeichen-shortcuts';

/**
 * Zeichen-Kurzbefehle (T3): Werkzeug-Tasten der Zeichenwerkzeugleiste — reine
 * Registry, damit die Belegung (W/Z/V/D/T/C/S/F) unabhängig vom DOM/keydown
 * geprüft werden kann.
 */

describe('werkzeugFuerTaste', () => {
  it('löst die dokumentierte Belegung auf', () => {
    expect(werkzeugFuerTaste('w')).toBe('wand');
    expect(werkzeugFuerTaste('z')).toBe('zone');
    expect(werkzeugFuerTaste('v')).toBe('volumen');
    expect(werkzeugFuerTaste('d')).toBe('dach');
    expect(werkzeugFuerTaste('t')).toBe('treppe');
    expect(werkzeugFuerTaste('c')).toBe('stuetze');
    expect(werkzeugFuerTaste('s')).toBe('schnitt');
    expect(werkzeugFuerTaste('f')).toBe('skizze');
  });

  it('ist case-insensitiv (Grossbuchstaben bei aktivem Caps Lock/Shift)', () => {
    expect(werkzeugFuerTaste('W')).toBe('wand');
    expect(werkzeugFuerTaste('Z')).toBe('zone');
  });

  it('liefert null für unbekannte Tasten', () => {
    expect(werkzeugFuerTaste('q')).toBeNull();
    expect(werkzeugFuerTaste('1')).toBeNull();
    expect(werkzeugFuerTaste('Escape')).toBeNull(); // Escape wird separat behandelt (zurück zur Auswahl)
  });

  it('jede Taste kommt genau einmal vor (keine Doppelbelegung)', () => {
    const tasten = ZEICHEN_KURZBEFEHLE.map((k) => k.taste);
    expect(new Set(tasten).size).toBe(tasten.length);
  });

  it('jedes Werkzeug der Toolbar hat eine Taste UND einen Anzeigetext', () => {
    for (const k of ZEICHEN_KURZBEFEHLE) {
      expect(k.taste).toMatch(/^[a-z]$/);
      expect(k.beschrieb.length).toBeGreaterThan(0);
    }
  });
});
