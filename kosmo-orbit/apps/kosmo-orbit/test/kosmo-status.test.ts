import { beforeEach, describe, expect, it } from 'vitest';
import { kurzform, useKosmoStatus } from '../src/state/kosmo-status';

/**
 * K11 — Laufzeit-Status fürs Kosmo-Symbol (`shell/KosmoSymbol.tsx`).
 * Reiner Zustand (Laufzeit ≠ Modell, siehe CLAUDE.md): läuft NIE durch
 * Yjs/Undo — nur `beschaeftigt` (treibt die Puls-Animation) und
 * `letzteAktivitaet` (Mini-Popup-Text) leben hier.
 */

beforeEach(() => {
  useKosmoStatus.setState({ beschaeftigt: false, letzteAktivitaet: null });
});

describe('useKosmoStatus — Default und Setter', () => {
  it('startet unbeschäftigt, ohne bekannte letzte Aktivität', () => {
    const s = useKosmoStatus.getState();
    expect(s.beschaeftigt).toBe(false);
    expect(s.letzteAktivitaet).toBeNull();
  });

  it('setzeBeschaeftigt schaltet den Status um (Sende-Lebenszyklus)', () => {
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
