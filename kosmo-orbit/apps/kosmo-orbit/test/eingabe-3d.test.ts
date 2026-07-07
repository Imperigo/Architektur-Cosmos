import { describe, expect, it } from 'vitest';
import {
  mausBelegung,
  touchBelegung,
  kameraDarfSehen,
  type NavModus,
} from '../src/modules/design/eingabe-3d';

describe('Serie J / J1a: einheitliches Eingabemodell', () => {
  describe('mausBelegung', () => {
    it('linker Klick folgt dem NavModus', () => {
      expect(mausBelegung('orbit', false).left).toBe('rotate');
      expect(mausBelegung('pan', false).left).toBe('truck');
      expect(mausBelegung('zoom', false).left).toBe('dolly');
    });
    it('Mitteltaste = Orbit, mit Shift = Pan', () => {
      expect(mausBelegung('orbit', false).middle).toBe('rotate');
      expect(mausBelegung('orbit', true).middle).toBe('truck');
    });
    it('rechte Taste ist immer Pan, unabhängig von Modus/Shift', () => {
      for (const m of ['orbit', 'pan', 'zoom'] as NavModus[]) {
        expect(mausBelegung(m, false).right).toBe('truck');
        expect(mausBelegung(m, true).right).toBe('truck');
      }
    });
    it('Modus-Wechsel ändert NUR den linken Klick, nicht Mitte/Rechts', () => {
      const orbit = mausBelegung('orbit', false);
      const pan = mausBelegung('pan', false);
      expect(pan.left).not.toBe(orbit.left);
      expect(pan.middle).toBe(orbit.middle);
      expect(pan.right).toBe(orbit.right);
    });
  });

  describe('touchBelegung', () => {
    it('1 Finger Orbit, 2 Finger Pan+Pinch, 3 Finger Pan', () => {
      expect(touchBelegung()).toEqual({ one: 'rotate', two: 'dollyTruck', three: 'truck' });
    });
  });

  describe('kameraDarfSehen (Pencil-Trennung, Wahrheitstafel)', () => {
    it('Pencil zeichnet immer, navigiert nie (auch ausserhalb Skizzenmodus)', () => {
      expect(kameraDarfSehen('pen', 0, false)).toBe(false);
      expect(kameraDarfSehen('pen', 0, true)).toBe(false);
      expect(kameraDarfSehen('pen', 2, true)).toBe(false);
    });
    it('Finger navigiert immer — auch im Skizzenmodus', () => {
      expect(kameraDarfSehen('touch', 0, false)).toBe(true);
      expect(kameraDarfSehen('touch', 0, true)).toBe(true);
    });
    it('Maus ausserhalb Skizzenmodus: alle Tasten navigieren', () => {
      expect(kameraDarfSehen('mouse', 0, false)).toBe(true);
      expect(kameraDarfSehen('mouse', 1, false)).toBe(true);
      expect(kameraDarfSehen('mouse', 2, false)).toBe(true);
    });
    it('Maus im Skizzenmodus: linke Taste zeichnet, Mitte/Rechts navigieren', () => {
      expect(kameraDarfSehen('mouse', 0, true)).toBe(false); // links zeichnet
      expect(kameraDarfSehen('mouse', 1, true)).toBe(true); // Mitte navigiert
      expect(kameraDarfSehen('mouse', 2, true)).toBe(true); // rechts navigiert
    });
  });
});
