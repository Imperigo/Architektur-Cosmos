import { describe, expect, it } from 'vitest';
import {
  mausBelegung,
  touchBelegung,
  kameraDarfSehen,
  werkzeugCursorFuer,
  gestenDetektor,
  type NavModus,
  type PointerSample,
} from '../src/modules/design/eingabe-3d';

// Bequemer Sample-Bauer für die Detektor-Tests.
function s(typ: PointerSample['typ'], t: number, x: number, y: number, pointerId = 1): PointerSample {
  return { typ, t, x, y, pointerId, pointerType: 'touch' };
}

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

  describe('werkzeugCursorFuer (J2)', () => {
    it('Pan-Modus zeigt die Greifhand, unabhängig vom Werkzeug', () => {
      expect(werkzeugCursorFuer('auswahl', 'pan')).toBe('grab');
      expect(werkzeugCursorFuer('wand', 'pan')).toBe('grab');
    });
    it('Auswahl-Werkzeug zeigt den Zeiger, Zeichnen/Skizzieren das Fadenkreuz', () => {
      expect(werkzeugCursorFuer('auswahl', 'orbit')).toBe('default');
      expect(werkzeugCursorFuer('skizze', 'orbit')).toBe('crosshair');
      expect(werkzeugCursorFuer('wand', 'orbit')).toBe('crosshair');
      expect(werkzeugCursorFuer('zone', 'zoom')).toBe('crosshair');
    });
  });

  describe('gestenDetektor (J1b)', () => {
    it('einzelner Tap wird als tap gemeldet', () => {
      const g = gestenDetektor();
      expect(g.ereignis(s('down', 0, 100, 100))).toEqual({});
      expect(g.ereignis(s('up', 50, 101, 101))).toEqual({ tap: { x: 101, y: 101 } });
    });
    it('zwei schnelle Taps nahe beieinander = Doppel-Tap', () => {
      const g = gestenDetektor();
      g.ereignis(s('down', 0, 100, 100));
      expect(g.ereignis(s('up', 40, 100, 100))).toEqual({ tap: { x: 100, y: 100 } });
      g.ereignis(s('down', 120, 105, 103));
      expect(g.ereignis(s('up', 160, 105, 103))).toEqual({ doppelTap: { x: 105, y: 103 } });
    });
    it('zwei langsame Taps = zwei einzelne Taps (kein Doppel-Tap)', () => {
      const g = gestenDetektor();
      g.ereignis(s('down', 0, 100, 100));
      g.ereignis(s('up', 40, 100, 100));
      g.ereignis(s('down', 900, 100, 100)); // > DOPPELTAP_MS später
      expect(g.ereignis(s('up', 940, 100, 100))).toEqual({ tap: { x: 100, y: 100 } });
    });
    it('Halten ohne Bewegung ≥ 500 ms = Long-Press (genau einmal)', () => {
      const g = gestenDetektor();
      g.ereignis(s('down', 0, 200, 150));
      expect(g.pruefeLongPress(300)).toEqual({}); // noch zu früh
      expect(g.pruefeLongPress(600)).toEqual({ longPress: { x: 200, y: 150 } });
      expect(g.pruefeLongPress(900)).toEqual({}); // feuert nicht erneut
    });
    it('Halten MIT Bewegung löst keinen Long-Press aus', () => {
      const g = gestenDetektor();
      g.ereignis(s('down', 0, 200, 150));
      g.ereignis(s('move', 100, 240, 150)); // > LONGPRESS_RADIUS bewegt
      expect(g.pruefeLongPress(700)).toEqual({});
    });
    it('bewegter Pointer meldet keinen Tap beim Loslassen', () => {
      const g = gestenDetektor();
      g.ereignis(s('down', 0, 100, 100));
      g.ereignis(s('move', 30, 140, 100));
      expect(g.ereignis(s('up', 60, 140, 100))).toEqual({});
    });
    it('zweiter Finger (Pinch) bricht Tap- und Long-Press-Erkennung ab', () => {
      const g = gestenDetektor();
      g.ereignis(s('down', 0, 100, 100, 1));
      g.ereignis(s('down', 10, 300, 300, 2)); // zweiter Pointer
      expect(g.pruefeLongPress(700)).toEqual({});
      expect(g.ereignis(s('up', 60, 100, 100, 1))).toEqual({});
    });
  });
});
