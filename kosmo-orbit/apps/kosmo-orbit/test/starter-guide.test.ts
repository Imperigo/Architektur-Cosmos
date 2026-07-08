import { beforeEach, describe, expect, it } from 'vitest';
import {
  ERSTER_SCHRITT_INDEX,
  fortschrittProzent,
  istLetzterSchritt,
  istSchrittErfuellt,
  istStarterGuideAbgeschlossen,
  letzterSchrittIndex,
  naechsterAutomatischerIndex,
  STARTER_GUIDE_SCHRITTE,
  STARTER_GUIDE_STORAGE_KEY,
  starterGuideAlsAbgeschlossenMarkieren,
  starterGuideErneutStarten,
  wandWurdeGezeichnet,
  type GuideZustand,
} from '../src/shell/starter-guide-schritte';

/**
 * V1.6 Block E — reine Schritt-Logik des Starter-Guides, DOM-frei (Muster
 * wie `oberflaeche-adaption.test.ts`). Prüft Reihenfolge, die dynamischen
 * Erfüllt-Prädikate mit Mock-Zustand, Fortschritt sowie das
 * Abgeschlossen-Flag inkl. «erneut»-Verhalten.
 */

function zustand(partial: Partial<GuideZustand> = {}): GuideZustand {
  return { screen: 'home', kosmoOffen: false, waendeGezeichnet: false, ...partial };
}

beforeEach(() => {
  localStorage.clear();
});

describe('STARTER_GUIDE_SCHRITTE — Reihenfolge', () => {
  it('führt in der vom Owner-Auftrag verlangten Reihenfolge: Willkommen → Zentrale → KosmoDesign öffnen → Wand zeichnen → Kosmo-Panel → fertig', () => {
    expect(STARTER_GUIDE_SCHRITTE.map((s) => s.id)).toEqual([
      'willkommen',
      'zentrale',
      'design-oeffnen',
      'wand-zeichnen',
      'kosmo-panel',
      'fertig',
    ]);
  });

  it('jeder Schritt trägt einen nicht-leeren Titel und Text (keine Platzhalter)', () => {
    for (const s of STARTER_GUIDE_SCHRITTE) {
      expect(s.titel.length).toBeGreaterThan(3);
      expect(s.text.length).toBeGreaterThan(10);
    }
  });

  it('der letzte Schritt ist "fertig" — istLetzterSchritt/letzterSchrittIndex stimmen überein', () => {
    expect(STARTER_GUIDE_SCHRITTE[letzterSchrittIndex()]?.id).toBe('fertig');
    expect(istLetzterSchritt(letzterSchrittIndex())).toBe(true);
    expect(istLetzterSchritt(0)).toBe(false);
  });
});

describe('Erfüllt-Prädikate mit Mock-Zustand (dynamische Erkennung)', () => {
  it('«design-oeffnen» ist erst erfüllt, wenn screen==="design" — nicht auf "home" oder anderen Screens', () => {
    const idx = STARTER_GUIDE_SCHRITTE.findIndex((s) => s.id === 'design-oeffnen');
    expect(istSchrittErfuellt(idx, zustand({ screen: 'home' }))).toBe(false);
    expect(istSchrittErfuellt(idx, zustand({ screen: 'vis' }))).toBe(false);
    expect(istSchrittErfuellt(idx, zustand({ screen: 'design' }))).toBe(true);
  });

  it('«wand-zeichnen» folgt exakt dem waendeGezeichnet-Flag im Zustand', () => {
    const idx = STARTER_GUIDE_SCHRITTE.findIndex((s) => s.id === 'wand-zeichnen');
    expect(istSchrittErfuellt(idx, zustand({ waendeGezeichnet: false }))).toBe(false);
    expect(istSchrittErfuellt(idx, zustand({ waendeGezeichnet: true }))).toBe(true);
  });

  it('«kosmo-panel» ist erfüllt, sobald kosmoOffen true ist', () => {
    const idx = STARTER_GUIDE_SCHRITTE.findIndex((s) => s.id === 'kosmo-panel');
    expect(istSchrittErfuellt(idx, zustand({ kosmoOffen: false }))).toBe(false);
    expect(istSchrittErfuellt(idx, zustand({ kosmoOffen: true }))).toBe(true);
  });

  it('erklärende Schritte (willkommen/zentrale/fertig) sind NIE automatisch erfüllt, egal welcher Zustand', () => {
    const voll = zustand({ screen: 'design', kosmoOffen: true, waendeGezeichnet: true });
    for (const id of ['willkommen', 'zentrale', 'fertig']) {
      const idx = STARTER_GUIDE_SCHRITTE.findIndex((s) => s.id === id);
      expect(istSchrittErfuellt(idx, voll)).toBe(false);
    }
  });
});

describe('naechsterAutomatischerIndex — dynamisches Weiterschalten', () => {
  it('bleibt auf einem erklärenden Schritt stehen, auch wenn der Zustand "alles erledigt" zeigt (nur Klick schaltet weiter)', () => {
    const idx = STARTER_GUIDE_SCHRITTE.findIndex((s) => s.id === 'zentrale');
    const voll = zustand({ screen: 'design', kosmoOffen: true, waendeGezeichnet: true });
    expect(naechsterAutomatischerIndex(idx, voll)).toBe(idx);
  });

  it('schaltet automatisch einen Schritt weiter, sobald das Prädikat erfüllt ist', () => {
    const idx = STARTER_GUIDE_SCHRITTE.findIndex((s) => s.id === 'design-oeffnen');
    expect(naechsterAutomatischerIndex(idx, zustand({ screen: 'design' }))).toBe(idx + 1);
  });

  it('bleibt stehen, solange die Mini-Aufgabe nicht erledigt ist', () => {
    const idx = STARTER_GUIDE_SCHRITTE.findIndex((s) => s.id === 'design-oeffnen');
    expect(naechsterAutomatischerIndex(idx, zustand({ screen: 'home' }))).toBe(idx);
  });

  it('schaltet am letzten Schritt nie über das Ende hinaus', () => {
    const letzter = letzterSchrittIndex();
    expect(naechsterAutomatischerIndex(letzter, zustand({ screen: 'design', kosmoOffen: true, waendeGezeichnet: true }))).toBe(
      letzter,
    );
  });
});

describe('fortschrittProzent', () => {
  it('liefert für den ersten Schritt bereits mehr als 0 %', () => {
    expect(fortschrittProzent(0)).toBeGreaterThan(0);
  });

  it('liefert für den letzten Schritt exakt 100 %', () => {
    expect(fortschrittProzent(letzterSchrittIndex())).toBe(100);
  });

  it('steigt streng monoton mit dem Index', () => {
    const werte = STARTER_GUIDE_SCHRITTE.map((_, i) => fortschrittProzent(i));
    for (let i = 1; i < werte.length; i++) {
      expect(werte[i]!).toBeGreaterThan(werte[i - 1]!);
    }
  });

  it('klemmt negative/zu grosse Indizes statt falscher Prozentwerte', () => {
    expect(fortschrittProzent(-5)).toBe(fortschrittProzent(0));
    expect(fortschrittProzent(999)).toBe(100);
  });
});

describe('wandWurdeGezeichnet — Mini-Aufgabe «Wand zeichnen» ohne False-Positive bei Demo-Projekten', () => {
  it('ist falsch, solange sich die Wand-Anzahl seit Schritt-Eintritt nicht erhöht hat', () => {
    expect(wandWurdeGezeichnet(3, 3)).toBe(false);
  });

  it('wird wahr, sobald eine zusätzliche Wand entstanden ist', () => {
    expect(wandWurdeGezeichnet(3, 4)).toBe(true);
  });

  it('ein Demo-Projekt mit bereits vorhandenen Wänden zählt beim Schritt-Eintritt selbst nicht als erledigt', () => {
    expect(wandWurdeGezeichnet(12, 12)).toBe(false);
  });
});

describe('Abgeschlossen-Flag (localStorage kosmo.starterGuide.done) — getrennt von kosmo.onboarded', () => {
  it('ist standardmässig nicht abgeschlossen (Auto-Start beim allerersten Programmstart)', () => {
    expect(localStorage.getItem(STARTER_GUIDE_STORAGE_KEY)).toBeNull();
    expect(istStarterGuideAbgeschlossen()).toBe(false);
  });

  it('starterGuideAlsAbgeschlossenMarkieren() setzt exakt kosmo.starterGuide.done, nicht kosmo.onboarded', () => {
    starterGuideAlsAbgeschlossenMarkieren();
    expect(istStarterGuideAbgeschlossen()).toBe(true);
    expect(localStorage.getItem('kosmo.onboarded')).toBeNull();
  });

  it('«erneut» (starterGuideErneutStarten) liefert immer den ersten Schritt-Index — auch nach «fertig»', () => {
    starterGuideAlsAbgeschlossenMarkieren();
    expect(starterGuideErneutStarten()).toBe(ERSTER_SCHRITT_INDEX);
    expect(starterGuideErneutStarten()).toBe(0);
  });
});
