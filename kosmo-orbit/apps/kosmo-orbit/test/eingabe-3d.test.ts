import { describe, expect, it } from 'vitest';
import {
  mausBelegung,
  touchBelegung,
  kameraDarfSehen,
  werkzeugCursorFuer,
  gestenDetektor,
  flingSchritt,
  flingTracker,
  FLING_STOPP_GESCHWINDIGKEIT,
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

    // v0.6.6 / Welle 2 Stream C: Swipe-Erkennung (§5) — 40px Mindeststrecke
    // (strikt darüber) UND 0.5 px/ms Mindestgeschwindigkeit.
    it('schnelles, gerades Ziehen über 40px/0.5px/ms = Swipe (Richtung + Geschwindigkeit)', () => {
      const g = gestenDetektor();
      g.ereignis(s('down', 0, 100, 100));
      g.ereignis(s('move', 40, 180, 100));
      expect(g.ereignis(s('up', 80, 180, 100))).toEqual({
        swipe: { richtung: 'rechts', geschwindigkeit: 1 }, // 80px / 80ms
      });
    });
    it('erkennt alle vier Richtungen', () => {
      const swipe = (dx: number, dy: number) => {
        const g = gestenDetektor();
        g.ereignis(s('down', 0, 500, 500));
        g.ereignis(s('move', 40, 500 + dx / 2, 500 + dy / 2));
        return g.ereignis(s('up', 80, 500 + dx, 500 + dy)).swipe?.richtung;
      };
      expect(swipe(80, 0)).toBe('rechts');
      expect(swipe(-80, 0)).toBe('links');
      expect(swipe(0, 80)).toBe('runter');
      expect(swipe(0, -80)).toBe('hoch');
    });
    it('genau 40px Distanz (an der Schwelle) ist NOCH kein Swipe — bewegter Klick bleibt {} (bestehender Vertrag)', () => {
      // Exakt der bestehende Fall «bewegter Pointer meldet keinen Tap» —
      // 40px/60ms (0.667 px/ms, über der Geschwindigkeit, aber AN der 40px-
      // Distanzschwelle): bleibt {} wie zuvor, kein Verhaltensbruch.
      const g = gestenDetektor();
      g.ereignis(s('down', 0, 100, 100));
      g.ereignis(s('move', 30, 140, 100));
      expect(g.ereignis(s('up', 60, 140, 100))).toEqual({});
    });
    it('weite, aber langsame Bewegung (unter 0.5 px/ms) ist kein Swipe', () => {
      const g = gestenDetektor();
      g.ereignis(s('down', 0, 100, 100));
      g.ereignis(s('move', 100, 260, 100));
      // 160px über 500ms = 0.32 px/ms < 0.5 px/ms
      expect(g.ereignis(s('up', 500, 260, 100))).toEqual({});
    });
    it('Maus (pointerType mouse) nutzt denselben Detektor für Doppelklick/Long-Press (§5 "ein Kern")', () => {
      const maus = (typ: PointerSample['typ'], t: number, x: number, y: number): PointerSample => ({
        typ, t, x, y, pointerId: 1, pointerType: 'mouse',
      });
      const g = gestenDetektor();
      g.ereignis(maus('down', 0, 50, 50));
      expect(g.ereignis(maus('up', 40, 50, 50))).toEqual({ tap: { x: 50, y: 50 } });
      g.ereignis(maus('down', 100, 52, 51));
      expect(g.ereignis(maus('up', 140, 52, 51))).toEqual({ doppelTap: { x: 52, y: 51 } });

      const g2 = gestenDetektor();
      g2.ereignis(maus('down', 0, 20, 20));
      expect(g2.pruefeLongPress(600)).toEqual({ longPress: { x: 20, y: 20 } });
    });
  });

  describe('flingSchritt (Fling/Momentum, MOTION-KONZEPT-066 §5)', () => {
    it('dämpft die Geschwindigkeit über einen ~16.67ms-Frame um Faktor 0.95', () => {
      const v = flingSchritt({ vx: 1, vy: 0 }, 1000 / 60);
      expect(v).not.toBeNull();
      expect(v!.vx).toBeCloseTo(0.95, 5);
      expect(v!.vy).toBeCloseTo(0, 5);
    });
    it('skaliert die Dämpfung mit dt (doppeltes dt = Faktor zum Quadrat)', () => {
      const v = flingSchritt({ vx: 1, vy: 0 }, (1000 / 60) * 2);
      expect(v!.vx).toBeCloseTo(0.95 * 0.95, 5);
    });
    it('stoppt (liefert null), sobald die Geschwindigkeit unter die Schwelle fällt', () => {
      // sehr kleine Restgeschwindigkeit, ein Frame Dämpfung reicht zum Stopp
      const v = flingSchritt({ vx: FLING_STOPP_GESCHWINDIGKEIT * 1.01, vy: 0 }, 1000 / 60);
      expect(v).toBeNull();
    });
    it('bereits am Stillstand (0,0) liefert sofort null', () => {
      expect(flingSchritt({ vx: 0, vy: 0 }, 1000 / 60)).toBeNull();
    });
    it('dt<=0 gibt die Geschwindigkeit unverändert zurück (kein Rückwärtslauf)', () => {
      expect(flingSchritt({ vx: 0.3, vy: 0.1 }, 0)).toEqual({ vx: 0.3, vy: 0.1 });
    });
    it('mehrfaches Anwenden nähert sich dem Stillstand (konvergiert, wird nicht negativ/oszillierend)', () => {
      let v: { vx: number; vy: number } | null = { vx: 2, vy: 0 };
      let schritte = 0;
      while (v && schritte < 2000) {
        v = flingSchritt(v, 1000 / 60);
        schritte++;
      }
      expect(v).toBeNull();
      expect(schritte).toBeGreaterThan(0);
      expect(schritte).toBeLessThan(2000);
    });
  });

  describe('flingTracker (Loslass-Geschwindigkeit aus den letzten ~80ms)', () => {
    it('liefert null ohne genug Samples', () => {
      const t = flingTracker();
      expect(t.loslassGeschwindigkeit()).toBeNull();
      t.sample(0, 10, 10);
      expect(t.loslassGeschwindigkeit()).toBeNull();
    });
    it('berechnet die Geschwindigkeit aus ältester vs. neuester Probe im 80ms-Fenster', () => {
      const t = flingTracker();
      t.sample(0, 0, 0);
      t.sample(40, 40, 0);
      t.sample(80, 80, 0);
      // 80px über 80ms = 1 px/ms
      expect(t.loslassGeschwindigkeit()).toEqual({ vx: 1, vy: 0 });
    });
    it('verwirft Proben ausserhalb des 80ms-Fensters (nur die jüngste Bewegung zählt)', () => {
      const t = flingTracker();
      t.sample(0, 0, 0); // > 80ms alt zum Schluss, fällt raus
      t.sample(500, 500, 0); // Start des relevanten Fensters
      t.sample(560, 560, 0); // 60ms später, 60px — im 80ms-Fenster
      const v = t.loslassGeschwindigkeit()!;
      expect(v.vx).toBeCloseTo(1, 5); // (560-500)px / (560-500)ms
    });
    it('reset() leert den Puffer', () => {
      const t = flingTracker();
      t.sample(0, 0, 0);
      t.sample(20, 20, 0);
      t.reset();
      expect(t.loslassGeschwindigkeit()).toBeNull();
    });
  });
});
