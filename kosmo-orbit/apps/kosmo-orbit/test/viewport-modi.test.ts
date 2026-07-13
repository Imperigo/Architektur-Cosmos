import { describe, expect, it } from 'vitest';
import {
  aspektLabel,
  brennweiteAusFov,
  kompassLabel,
  sonnenLabel,
  VIEWPORT_MODUS_REIHENFOLGE,
  VIEWPORT_MODUS_TEXT,
  VIEWPORT_ROLLEN,
  VIEWPORT_WERKZEUGE,
  zoomProzent,
} from '../src/modules/design/viewport-modi';

/**
 * v0.7.6 Welle 1 Stream A: 3D-Viewport-Chrome — reine Ableitungen aus
 * `viewport-modi.ts` (kein React, keine three.js-Abhängigkeit). Deckt die
 * Kamera→HUD-Umrechnungen ab, die `ViewportChrome.tsx` für echte (nicht
 * erfundene) Anzeigewerte nutzt.
 */

describe('VIEWPORT_MODUS_REIHENFOLGE/-TEXT/-ROLLEN/-WERKZEUGE', () => {
  it('kennt genau die drei Bearbeitungsmodi aus dem Soll-Bild', () => {
    expect(VIEWPORT_MODUS_REIHENFOLGE).toEqual(['modellieren', 'kamera', 'review']);
  });

  it('liefert für jeden Modus Text + Rolle + genau 6 Werkzeuge (README §6.1)', () => {
    for (const m of VIEWPORT_MODUS_REIHENFOLGE) {
      expect(VIEWPORT_MODUS_TEXT[m].badge.length).toBeGreaterThan(0);
      expect(VIEWPORT_ROLLEN[m].farbe).toMatch(/^var\(--k-/);
      expect(VIEWPORT_WERKZEUGE[m]).toHaveLength(6);
    }
  });

  it('mappt die Rollen wörtlich nach README §3 (manuell/generator/signal)', () => {
    expect(VIEWPORT_ROLLEN.modellieren.farbe).toBe('var(--k-rolle-manuell)');
    expect(VIEWPORT_ROLLEN.kamera.farbe).toBe('var(--k-rolle-generator)');
    expect(VIEWPORT_ROLLEN.review.farbe).toBe('var(--k-signal)');
  });
});

describe('kompassLabel', () => {
  it('azimut 0 (Süd, wie die Sonnenberechnung in Viewport3D) → SÜD', () => {
    expect(kompassLabel(0)).toBe('SÜD');
  });

  it('eine volle Umdrehung landet wieder auf SÜD', () => {
    expect(kompassLabel(2 * Math.PI)).toBe('SÜD');
  });

  it('eine Viertel-Drehung (±90°) weicht von SÜD ab und bleibt ein gültiger Kompasspunkt', () => {
    const label = kompassLabel(Math.PI / 2);
    expect(label).not.toBe('SÜD');
    expect(['SÜD', 'SW', 'WEST', 'NW', 'NORD', 'NO', 'OST', 'SO']).toContain(label);
  });
});

describe('brennweiteAusFov', () => {
  it('45° vertikales FOV ergibt eine plausible 35mm-äquivalente Brennweite', () => {
    const mm = brennweiteAusFov(45);
    expect(mm).toBeGreaterThan(25);
    expect(mm).toBeLessThan(35);
  });

  it('ein kleineres FOV (Tele) ergibt eine grössere Brennweite', () => {
    expect(brennweiteAusFov(20)).toBeGreaterThan(brennweiteAusFov(60));
  });
});

describe('aspektLabel', () => {
  it('erkennt 16:9', () => {
    expect(aspektLabel(1920, 1080)).toBe('16:9');
  });

  it('erkennt 4:3', () => {
    expect(aspektLabel(800, 600)).toBe('4:3');
  });

  it('fällt für unbekannte Verhältnisse auf x.xx:1 zurück', () => {
    expect(aspektLabel(1000, 300)).toBe('3.33:1');
  });

  it('Höhe 0 → ehrlicher Platzhalter statt Division durch 0', () => {
    expect(aspektLabel(100, 0)).toBe('—');
  });
});

describe('zoomProzent', () => {
  it('unveränderte Distanz → 100 %', () => {
    expect(zoomProzent(10, 10)).toBe(100);
  });

  it('halbe Distanz (näher dran) → 200 %', () => {
    expect(zoomProzent(5, 10)).toBe(200);
  });

  it('doppelte Distanz (weiter weg) → 50 %', () => {
    expect(zoomProzent(20, 10)).toBe(50);
  });

  it('ungültige Distanzen fallen ehrlich auf 100 % zurück statt NaN/Infinity', () => {
    expect(zoomProzent(0, 10)).toBe(100);
    expect(zoomProzent(10, 0)).toBe(100);
  });
});

describe('sonnenLabel', () => {
  it('ohne Datum: ehrlicher «Studio»-Fallback (Q12-Verhalten)', () => {
    expect(sonnenLabel(null)).toBe('Studio (kein Datum)');
  });

  it('mit Datum: Tag.Monat · Stunde:Minute', () => {
    const d = new Date(2026, 5, 21, 14, 5); // 21.06., 14:05
    expect(sonnenLabel(d)).toBe('21.06 · 14:05');
  });
});
