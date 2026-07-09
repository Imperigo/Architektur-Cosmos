import { beforeEach, describe, expect, it } from 'vitest';
import {
  effektiveLeistungsStufe,
  erhebeSystemMessung,
  formatiereLeistungsBericht,
  holeLetztesErgebnis,
  holeOverride,
  istRenderBeiBedarfAn,
  istZustimmungErteilt,
  leistungRevisionAktuell,
  leistungsStufeAus,
  pixelRatioFuerStufe,
  pruefeLeistungMitFreigabe,
  schattenAnFuerStufe,
  setOverride,
  setRenderBeiBedarf,
  setZustimmung,
  type LeistungsMerkmale,
} from '../src/state/leistung';

/**
 * v0.6.3 / Batch A9 (Owner-Befund K19): Leistungs-Autotuning. Deckt die drei
 * geforderten Bereiche ab — Stufen-Ableitung (reine Schwellen-Logik),
 * pixelRatio-Mapping (die reale Viewport-Schraube) und das Zustimmungs-Gate
 * (ohne Zustimmung keine Messung, kein Seiteneffekt).
 */

const STORAGE_KEY = 'kosmo.leistung.v1';

beforeEach(() => {
  localStorage.clear();
});

describe('leistungsStufeAus — reine Ableitung aus Messwerten', () => {
  it('hohe Kerne + hoher Speicher + schneller Benchmark → hoch', () => {
    const m: LeistungsMerkmale = { kerne: 16, speicherGb: 16, benchmarkPunkte: 60 };
    expect(leistungsStufeAus(m)).toBe('hoch');
  });

  it('niedrige Kerne + wenig Speicher + langsamer Benchmark → niedrig', () => {
    const m: LeistungsMerkmale = { kerne: 2, speicherGb: 2, benchmarkPunkte: 5 };
    expect(leistungsStufeAus(m)).toBe('niedrig');
  });

  it('mittlere Werte → mittel', () => {
    const m: LeistungsMerkmale = { kerne: 4, speicherGb: 6, benchmarkPunkte: 20 };
    expect(leistungsStufeAus(m)).toBe('mittel');
  });

  it('nichts messbar (alle null) → mittel als ehrliche Neutralannahme', () => {
    expect(leistungsStufeAus({ kerne: null, speicherGb: null, benchmarkPunkte: null })).toBe('mittel');
  });

  it('fehlender Speicherwert zählt nicht mit — Ableitung läuft nur über die vorhandenen Signale', () => {
    // Kerne=hoch, Benchmark=hoch, Speicher fehlt (z.B. Firefox/Safari) → trotzdem hoch
    expect(leistungsStufeAus({ kerne: 16, speicherGb: null, benchmarkPunkte: 60 })).toBe('hoch');
  });

  it('rundet bei Gleichstand konservativ nach unten (hoch+niedrig → mittel, nicht hoch)', () => {
    expect(leistungsStufeAus({ kerne: 16, speicherGb: 2, benchmarkPunkte: null })).toBe('mittel');
  });

  it('grosszügige Schwellen: ein Alltags-Laptop (4 Kerne, 8GB) fällt nicht auf niedrig', () => {
    expect(leistungsStufeAus({ kerne: 4, speicherGb: 8, benchmarkPunkte: null })).not.toBe('niedrig');
  });
});

describe('pixelRatioFuerStufe — die reale Viewport-Schraube', () => {
  it('niedrig kappt hart auf 1, auch bei hohem Geräte-Pixelverhältnis', () => {
    expect(pixelRatioFuerStufe('niedrig', 3)).toBe(1);
    expect(pixelRatioFuerStufe('niedrig', 1)).toBe(1);
  });

  it('mittel kappt auf 1.5', () => {
    expect(pixelRatioFuerStufe('mittel', 3)).toBe(1.5);
    expect(pixelRatioFuerStufe('mittel', 1)).toBe(1);
  });

  it('hoch erlaubt bis 2 (bisheriges Fixverhalten)', () => {
    expect(pixelRatioFuerStufe('hoch', 3)).toBe(2);
    expect(pixelRatioFuerStufe('hoch', 1.5)).toBe(1.5);
  });

  it('nimmt nie mehr als das tatsächliche Geräte-Pixelverhältnis', () => {
    expect(pixelRatioFuerStufe('hoch', 1)).toBe(1);
  });
});

describe('schattenAnFuerStufe — die zweite reale Schraube', () => {
  it('nur bei niedrig aus, sonst an', () => {
    expect(schattenAnFuerStufe('niedrig')).toBe(false);
    expect(schattenAnFuerStufe('mittel')).toBe(true);
    expect(schattenAnFuerStufe('hoch')).toBe(true);
  });
});

describe('Zustimmungs-Gate — ohne Zustimmung keine Messung', () => {
  it('Default: keine Zustimmung', () => {
    expect(istZustimmungErteilt()).toBe(false);
  });

  it('pruefeLeistungMitFreigabe() liefert null ohne Zustimmung — kein Ergebnis wird gespeichert', () => {
    const ergebnis = pruefeLeistungMitFreigabe();
    expect(ergebnis).toBeNull();
    expect(holeLetztesErgebnis()).toBeUndefined();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('nach setZustimmung(true) liefert die Prüfung ein Ergebnis mit Stufe und persistiert es', () => {
    setZustimmung(true);
    expect(istZustimmungErteilt()).toBe(true);
    const ergebnis = pruefeLeistungMitFreigabe();
    expect(ergebnis).not.toBeNull();
    expect(['hoch', 'mittel', 'niedrig']).toContain(ergebnis!.stufe);
    expect(holeLetztesErgebnis()?.stufe).toBe(ergebnis!.stufe);
  });

  it('Zustimmung entziehen sperrt erneute Prüfungen wieder, lässt aber das letzte Ergebnis stehen', () => {
    setZustimmung(true);
    const erstesErgebnis = pruefeLeistungMitFreigabe();
    expect(erstesErgebnis).not.toBeNull();
    setZustimmung(false);
    expect(pruefeLeistungMitFreigabe()).toBeNull();
    expect(holeLetztesErgebnis()).toEqual(erstesErgebnis);
  });

  it('bumpt die Revision bei Zustimmungswechsel und bei einer neuen Messung', () => {
    const r0 = leistungRevisionAktuell();
    setZustimmung(true);
    const r1 = leistungRevisionAktuell();
    expect(r1).toBeGreaterThan(r0);
    pruefeLeistungMitFreigabe();
    const r2 = leistungRevisionAktuell();
    expect(r2).toBeGreaterThan(r1);
  });
});

describe('Override — manueller Vorrang vor der Auto-Stufe', () => {
  it('Default ist "auto"', () => {
    expect(holeOverride()).toBe('auto');
  });

  it('"auto" ohne jede Messung → hoch (unverändertes Altverhalten, keine unangekündigte Drosselung ohne Zustimmung)', () => {
    expect(effektiveLeistungsStufe()).toBe('hoch');
  });

  it('ein gesetzter Override gewinnt immer, auch nach einer Messung', () => {
    setZustimmung(true);
    pruefeLeistungMitFreigabe();
    setOverride('niedrig');
    expect(effektiveLeistungsStufe()).toBe('niedrig');
  });

  it('Override persistiert über einen erneuten Ladevorgang (Grundlage des E2E-Reload-Tests)', () => {
    setOverride('hoch');
    expect(holeOverride()).toBe('hoch');
    // Simuliert "Reload": derselbe localStorage, neuer Lesevorgang.
    expect(effektiveLeistungsStufe()).toBe('hoch');
  });
});

describe('formatiereLeistungsBericht — benennt offen, was nicht messbar war', () => {
  it('zeigt "nicht verfügbar" für fehlende Signale statt eines erfundenen Werts', () => {
    setZustimmung(true);
    const ergebnis = pruefeLeistungMitFreigabe()!;
    const bericht = formatiereLeistungsBericht(ergebnis);
    expect(bericht.stufe).toBe(ergebnis.stufe);
    // In der Vitest/jsdom-Umgebung ist WEBGL_debug_renderer_info nicht vorhanden —
    // der Renderer-String muss das ehrlich sagen, nicht schweigen oder faken.
    expect(bericht.renderer).toMatch(/nicht verfügbar/);
  });
});

describe('renderBeiBedarf (V-M1 Commit 2) — on-demand-Renderloop-Schalter', () => {
  it('Default AN — ein frischer Speicher (kein Feld) zählt als true, keine stille Rückstufung', () => {
    expect(istRenderBeiBedarfAn()).toBe(true);
  });

  it('setRenderBeiBedarf(false) persistiert und bumpt die Revision (Viewport3D-Poll)', () => {
    const r0 = leistungRevisionAktuell();
    setRenderBeiBedarf(false);
    expect(istRenderBeiBedarfAn()).toBe(false);
    expect(leistungRevisionAktuell()).toBeGreaterThan(r0);
  });

  it('bleibt über einen erneuten Ladevorgang persistent (Grundlage der E2E-storageState-Saat)', () => {
    setRenderBeiBedarf(false);
    // Simuliert "Reload": derselbe localStorage, neuer Lesevorgang.
    expect(istRenderBeiBedarfAn()).toBe(false);
    setRenderBeiBedarf(true);
    expect(istRenderBeiBedarfAn()).toBe(true);
  });

  it('ein von Hand geschriebener Speicher OHNE das Feld (Alt-Stand vor Commit 2) bleibt gültig und liefert true', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, zustimmungErteilt: false, override: 'auto' }));
    expect(istRenderBeiBedarfAn()).toBe(true);
  });

  it('ein kaputter Wert (falscher Typ) fällt auf den Basiszustand zurück statt zu crashen', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, zustimmungErteilt: false, override: 'auto', renderBeiBedarf: 'ja' }),
    );
    expect(istRenderBeiBedarfAn()).toBe(true); // Basiszustand-Default, kein Absturz
  });
});

describe('erhebeSystemMessung — sammelt nur ehrlich Verfügbares', () => {
  it('liefert nie einen erfundenen Renderer-String; ohne WebGL-Debug-Info ist er "nicht verfügbar"', () => {
    const messung = erhebeSystemMessung();
    expect(typeof messung.rendererString).toBe('string');
    expect(messung.rendererQuelle === 'webgl-debug-info' || messung.rendererQuelle === 'nicht-verfuegbar').toBe(true);
  });
});
