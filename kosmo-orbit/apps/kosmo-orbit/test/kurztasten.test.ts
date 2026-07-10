import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cursor2dFuer,
  istEingabefeld,
  KURZTASTEN,
  kurztasteFuer,
  werkzeugFuerTaste,
} from '../src/modules/design/kurztasten';

/**
 * Kurztasten (v0.6.4, F5+F9 — Owner-Befunde 0.6.3): Werkzeug-Tasten der
 * Zeichenwerkzeugleiste (inkl. Auswahl «A», neu ggü. der alten
 * `zeichen-shortcuts.ts`) + der 2D-Kontextcursor — reine Registry/Funktionen,
 * damit Belegung und Fokus-Guard unabhängig vom DOM/keydown geprüft werden
 * können.
 */

describe('werkzeugFuerTaste', () => {
  it('löst die dokumentierte Belegung auf (inkl. A für Auswahl)', () => {
    expect(werkzeugFuerTaste('a')).toBe('auswahl');
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
    expect(werkzeugFuerTaste('A')).toBe('auswahl');
    expect(werkzeugFuerTaste('W')).toBe('wand');
    expect(werkzeugFuerTaste('Z')).toBe('zone');
  });

  it('liefert null für unbekannte Tasten', () => {
    expect(werkzeugFuerTaste('q')).toBeNull();
    expect(werkzeugFuerTaste('1')).toBeNull();
    expect(werkzeugFuerTaste('Escape')).toBeNull(); // Escape wird separat behandelt (zurück zur Auswahl)
  });

  it('jede Taste kommt genau einmal vor (keine Doppelbelegung)', () => {
    const tasten = KURZTASTEN.map((k) => k.taste);
    expect(new Set(tasten).size).toBe(tasten.length);
  });

  it('jedes Werkzeug der Toolbar hat eine Taste UND einen Anzeigetext', () => {
    for (const k of KURZTASTEN) {
      expect(k.taste).toMatch(/^[a-z]$/);
      expect(k.beschrieb.length).toBeGreaterThan(0);
    }
  });
});

describe('istEingabefeld', () => {
  it('erkennt input/textarea/select', () => {
    expect(istEingabefeld({ tagName: 'INPUT' })).toBe(true);
    expect(istEingabefeld({ tagName: 'TEXTAREA' })).toBe(true);
    expect(istEingabefeld({ tagName: 'SELECT' })).toBe(true);
  });

  it('erkennt contenteditable-Elemente unabhängig vom Tag', () => {
    expect(istEingabefeld({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });

  it('liefert false für normale Elemente und null', () => {
    expect(istEingabefeld({ tagName: 'BUTTON' })).toBe(false);
    expect(istEingabefeld({ tagName: 'svg' })).toBe(false);
    expect(istEingabefeld(null)).toBe(false);
  });
});

const taste = (key: string, extra: Partial<KeyboardEvent> = {}) => ({
  key,
  repeat: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...extra,
});

describe('kurztasteFuer', () => {
  it('löst eine bekannte Taste auf, wenn der Fokus nicht in einem Eingabefeld liegt', () => {
    expect(kurztasteFuer(taste('w'), false)).toBe('wand');
    expect(kurztasteFuer(taste('a'), false)).toBe('auswahl');
  });

  it('feuert NIE, wenn der Fokus in einem Eingabefeld liegt (Kosmo-Chat!)', () => {
    expect(kurztasteFuer(taste('w'), true)).toBeNull();
    expect(kurztasteFuer(taste('a'), true)).toBeNull();
  });

  it('ignoriert Tastenwiederholung (gehaltene Taste)', () => {
    expect(kurztasteFuer(taste('w', { repeat: true }), false)).toBeNull();
  });

  it('ignoriert Tasten mit Cmd/Ctrl/Alt (Systemkürzel haben Vorrang)', () => {
    expect(kurztasteFuer(taste('w', { metaKey: true }), false)).toBeNull();
    expect(kurztasteFuer(taste('w', { ctrlKey: true }), false)).toBeNull();
    expect(kurztasteFuer(taste('w', { altKey: true }), false)).toBeNull();
  });

  it('liefert null für unbekannte Tasten', () => {
    expect(kurztasteFuer(taste('q'), false)).toBeNull();
  });

  // v0.6.6 / Welle 2 Stream C (§6): jeder erfolgreiche Werkzeugwechsel löst
  // EINEN Haptik-Tick aus — reiner Seiteneffekt, der Rückgabewert bleibt
  // unverändert (siehe die Tests oben, alle unangetastet grün).
  describe('Haptik-Tick beim Werkzeugwechsel (§6)', () => {
    afterEach(() => {
      delete (navigator as { vibrate?: unknown }).vibrate;
      vi.restoreAllMocks();
    });

    it('löst navigator.vibrate(10) aus, wenn eine gültige Taste auflöst', () => {
      const vibrate = vi.fn().mockReturnValue(true);
      (navigator as unknown as { vibrate: typeof vibrate }).vibrate = vibrate;
      expect(kurztasteFuer(taste('w'), false)).toBe('wand');
      expect(vibrate).toHaveBeenCalledTimes(1);
      expect(vibrate).toHaveBeenCalledWith(10);
    });

    it('löst KEINEN Tick aus, wenn die Taste nicht auflöst (unbekannt/Guard)', () => {
      const vibrate = vi.fn().mockReturnValue(true);
      (navigator as unknown as { vibrate: typeof vibrate }).vibrate = vibrate;
      expect(kurztasteFuer(taste('q'), false)).toBeNull();
      expect(kurztasteFuer(taste('w'), true)).toBeNull(); // Eingabefeld
      expect(kurztasteFuer(taste('w', { repeat: true }), false)).toBeNull();
      expect(vibrate).not.toHaveBeenCalled();
    });

    it('ohne navigator.vibrate bleibt der Rückgabewert unverändert (kein Fehler)', () => {
      delete (navigator as { vibrate?: unknown }).vibrate;
      expect(() => kurztasteFuer(taste('a'), false)).not.toThrow();
      expect(kurztasteFuer(taste('a'), false)).toBe('auswahl');
    });
  });
});

describe('cursor2dFuer (F9 — kontextabhängige Maus im 2D-Plan)', () => {
  const basis = {
    istAuswahlWerkzeug: true,
    spaceOderPanModus: false,
    ziehtGerade: false,
    hoverTrifftElement: false,
    hoverIstAusgewaehlt: false,
  };

  it('Pan (Space/Nav-Leiste), noch nicht ziehend → grab', () => {
    expect(cursor2dFuer({ ...basis, spaceOderPanModus: true })).toBe('grab');
  });

  it('Pan aktiv am Ziehen → grabbing', () => {
    expect(cursor2dFuer({ ...basis, spaceOderPanModus: true, ziehtGerade: true })).toBe('grabbing');
  });

  it('Pan hat Vorrang vor Hover/Werkzeug (auch mitten im Zeichnen)', () => {
    expect(
      cursor2dFuer({ ...basis, istAuswahlWerkzeug: false, spaceOderPanModus: true, ziehtGerade: true }),
    ).toBe('grabbing');
  });

  it('Zeichenwerkzeug (kein Auswahl-Werkzeug) → crosshair', () => {
    expect(cursor2dFuer({ ...basis, istAuswahlWerkzeug: false })).toBe('crosshair');
  });

  it('Auswahl-Werkzeug über einem Treffer, NICHT ausgewählt → pointer', () => {
    expect(cursor2dFuer({ ...basis, hoverTrifftElement: true })).toBe('pointer');
  });

  it('Auswahl-Werkzeug über einem bereits gewählten Element → move', () => {
    expect(cursor2dFuer({ ...basis, hoverTrifftElement: true, hoverIstAusgewaehlt: true })).toBe('move');
  });

  it('Auswahl-Werkzeug über freier Fläche → default', () => {
    expect(cursor2dFuer(basis)).toBe('default');
  });
});
