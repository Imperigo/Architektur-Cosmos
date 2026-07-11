import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kurzform, useKosmoStatus } from '../src/state/kosmo-status';

/**
 * K11 — Laufzeit-Status fürs Kosmo-Symbol (`shell/KosmoSymbol.tsx`) und den
 * Orb (`shell/KosmoOrb.tsx`). Reiner Zustand (Laufzeit ≠ Modell, siehe
 * CLAUDE.md): läuft NIE durch Yjs/Undo.
 *
 * v0.7.2 §6 (Paket 06): additiv um die `zustand`-State-Machine erweitert.
 * `beschaeftigt` bleibt ein abgeleitetes Feld — die Tests unten prüfen sowohl
 * das NEUE (`zustand`, `setzeZustand`, Decay) als auch die Rückwärts-
 * kompatibilität des bestehenden Kompakt-Pfads (`setzeBeschaeftigt`).
 */

beforeEach(() => {
  useKosmoStatus.setState({ beschaeftigt: false, zustand: 'idle', letzteAktivitaet: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useKosmoStatus — Default und Setter (Bestand, K11)', () => {
  it('startet unbeschäftigt, im Zustand idle, ohne bekannte letzte Aktivität', () => {
    const s = useKosmoStatus.getState();
    expect(s.beschaeftigt).toBe(false);
    expect(s.zustand).toBe('idle');
    expect(s.letzteAktivitaet).toBeNull();
  });

  it('setzeBeschaeftigt schaltet den Status um (Sende-Lebenszyklus) — Rückwärtskompatibilität', () => {
    useKosmoStatus.getState().setzeBeschaeftigt(true);
    expect(useKosmoStatus.getState().beschaeftigt).toBe(true);
    useKosmoStatus.getState().setzeBeschaeftigt(false);
    expect(useKosmoStatus.getState().beschaeftigt).toBe(false);
  });

  it('setzeLetzteAktivitaet merkt sich den zuletzt gesetzten Text (letzter gewinnt)', () => {
    useKosmoStatus.getState().setzeLetzteAktivitaet('Wand 6,00 m');
    expect(useKosmoStatus.getState().letzteAktivitaet).toBe('Wand 6,00 m');
    useKosmoStatus.getState().setzeLetzteAktivitaet('Vorschlag: Fenster gesetzt');
    expect(useKosmoStatus.getState().letzteAktivitaet).toBe('Vorschlag: Fenster gesetzt');
  });
});

describe('setzeZustand — v0.7.2 §6 State-Machine', () => {
  it('deckt alle 9 Zustände ab und leitet beschaeftigt korrekt ab (!idle/done/error)', () => {
    const beschaeftigtErwartet: Record<string, boolean> = {
      idle: false,
      thinking: true,
      listening: true,
      speaking: true,
      writing: true,
      dispatching: true,
      done: false,
      error: false,
      takeover: true,
    };
    for (const [zustand, erwartet] of Object.entries(beschaeftigtErwartet)) {
      useKosmoStatus.getState().setzeZustand(zustand as never);
      expect(useKosmoStatus.getState().zustand).toBe(zustand);
      expect(useKosmoStatus.getState().beschaeftigt).toBe(erwartet);
    }
  });

  it('done→idle Auto-Decay nach 2s', () => {
    vi.useFakeTimers();
    useKosmoStatus.getState().setzeZustand('done');
    expect(useKosmoStatus.getState().zustand).toBe('done');
    vi.advanceTimersByTime(1999);
    expect(useKosmoStatus.getState().zustand).toBe('done');
    vi.advanceTimersByTime(1);
    expect(useKosmoStatus.getState().zustand).toBe('idle');
  });

  it('error→idle Auto-Decay nach 4s', () => {
    vi.useFakeTimers();
    useKosmoStatus.getState().setzeZustand('error');
    expect(useKosmoStatus.getState().zustand).toBe('error');
    vi.advanceTimersByTime(3999);
    expect(useKosmoStatus.getState().zustand).toBe('error');
    vi.advanceTimersByTime(1);
    expect(useKosmoStatus.getState().zustand).toBe('idle');
  });

  it('ein neuer Zustand VOR Ablauf des Decay bricht den alten Timer ab (kein späterer Sprung nach idle)', () => {
    vi.useFakeTimers();
    useKosmoStatus.getState().setzeZustand('done');
    vi.advanceTimersByTime(500);
    useKosmoStatus.getState().setzeZustand('thinking'); // z.B. neue Frage kommt rein
    vi.advanceTimersByTime(2000); // der ALTE done-Timer wäre hier fällig gewesen
    expect(useKosmoStatus.getState().zustand).toBe('thinking');
  });

  it('setzeZustand wechselt sofort (kein Zwischenschritt nötig, Store selbst ist synchron)', () => {
    useKosmoStatus.getState().setzeZustand('listening');
    expect(useKosmoStatus.getState().zustand).toBe('listening');
    useKosmoStatus.getState().setzeZustand('speaking');
    expect(useKosmoStatus.getState().zustand).toBe('speaking');
  });
});

describe('setzeBeschaeftigt — Rückwärtskompatibler Kompakt-Pfad über der State-Machine', () => {
  it('true → thinking, false → idle (der einfache Bestandsfall)', () => {
    useKosmoStatus.getState().setzeBeschaeftigt(true);
    expect(useKosmoStatus.getState().zustand).toBe('thinking');
    useKosmoStatus.getState().setzeBeschaeftigt(false);
    expect(useKosmoStatus.getState().zustand).toBe('idle');
  });

  it('setzeBeschaeftigt(false) überschreibt NICHT ein frisch gesetztes error (ChatSession ruft onBusy(false) nach onError)', () => {
    useKosmoStatus.getState().setzeZustand('thinking');
    useKosmoStatus.getState().setzeZustand('error'); // z.B. onError(msg)
    useKosmoStatus.getState().setzeBeschaeftigt(false); // z.B. onBusy(false) direkt danach
    expect(useKosmoStatus.getState().zustand).toBe('error');
  });

  it('setzeBeschaeftigt(false) überschreibt NICHT ein frisch gesetztes done', () => {
    useKosmoStatus.getState().setzeZustand('done');
    useKosmoStatus.getState().setzeBeschaeftigt(false);
    expect(useKosmoStatus.getState().zustand).toBe('done');
  });

  it('setzeBeschaeftigt(false) überschreibt NICHT takeover (eigenständiger Fensterrahmen-Modus)', () => {
    useKosmoStatus.getState().setzeZustand('takeover');
    useKosmoStatus.getState().setzeBeschaeftigt(false);
    expect(useKosmoStatus.getState().zustand).toBe('takeover');
  });

  it('setzeBeschaeftigt(false) räumt writing/listening/speaking/dispatching aber ganz normal auf', () => {
    for (const z of ['writing', 'listening', 'speaking', 'dispatching'] as const) {
      useKosmoStatus.getState().setzeZustand(z);
      useKosmoStatus.getState().setzeBeschaeftigt(false);
      expect(useKosmoStatus.getState().zustand).toBe('idle');
    }
  });

  it('setzeBeschaeftigt(true) unterbricht auch ein laufendes done/error (neue Aktivität beginnt)', () => {
    vi.useFakeTimers();
    useKosmoStatus.getState().setzeZustand('error');
    useKosmoStatus.getState().setzeBeschaeftigt(true);
    expect(useKosmoStatus.getState().zustand).toBe('thinking');
    // Der alte error-Decay-Timer darf NICHT nachträglich noch zuschlagen.
    vi.advanceTimersByTime(5000);
    expect(useKosmoStatus.getState().zustand).toBe('thinking');
  });
});

describe('kurzform — Mini-Popup-Zusammenfassung', () => {
  it('lässt kurze Texte unverändert', () => {
    expect(kurzform('Wand 6,00 m')).toBe('Wand 6,00 m');
  });

  it('kürzt auf ~80 Zeichen mit Ellipse, wenn der Text länger ist', () => {
    const lang = 'A'.repeat(120);
    const kurz = kurzform(lang);
    expect(kurz.length).toBeLessThanOrEqual(81); // 80 Zeichen + Ellipse
    expect(kurz.endsWith('…')).toBe(true);
  });

  it('respektiert eine eigene Maximallänge', () => {
    expect(kurzform('123456789', 5)).toBe('12345…');
  });

  it('glättet Zeilenumbrüche/Mehrfach-Whitespace zu einer Zeile (Popup bricht nie mehrzeilig aus)', () => {
    expect(kurzform('Zeile eins\n\n  Zeile zwei   drei')).toBe('Zeile eins Zeile zwei drei');
  });
});
