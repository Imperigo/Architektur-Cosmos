import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { KosmoDoc, invertPatches } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import '../src/commands/publish';
import { planToSvg, A3_QUER } from '../src/derive/plansvg';
import { testhausStammdaten } from './fixtures';

/**
 * Projekt-Stammdatenmodell (v0.7.5 Welle 2 A2, Owner-Punkt A2):
 * `DocSettings.projekt` (Bauherr/Adresse/Parzellennr/Verfasser/Fristen) +
 * `design.projektInfoSetzen`/`design.projektNameSetzen` + geguardete
 * Plankopf-Zeile in `plansvg.ts`/`sheet.ts`.
 *
 * EHRLICH (s. `docs/V075-STAMMDATEN.md`): `DocSettings` läuft wie jede
 * Doc-Änderung über Yjs/Undo/`.kosmo`-Export, ABER `SyncClient` synct heute
 * nur `entities` live — Stammdaten sind persistent, aber (noch) nicht
 * live-kollaborativ zwischen offenen Sitzungen (vertagt an `@kosmo/sync`).
 */

describe('design.projektInfoSetzen', () => {
  it('setzt additiv (Merge, nicht Überschreiben) + Undo', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.projekt).toBeUndefined();

    const r1 = execute(doc, 'design.projektInfoSetzen', { bauherr: 'Baugenossenschaft Ahorn' });
    expect(doc.settings.projekt).toEqual({ bauherr: 'Baugenossenschaft Ahorn' });

    // Zweiter Aufruf ergänzt nur `verfasser` — `bauherr` bleibt stehen.
    const r2 = execute(doc, 'design.projektInfoSetzen', { verfasser: 'Baubüro Andrin' });
    expect(doc.settings.projekt).toEqual({
      bauherr: 'Baugenossenschaft Ahorn',
      verfasser: 'Baubüro Andrin',
    });

    // Dritter Aufruf überschreibt `bauherr` gezielt, lässt `verfasser` stehen.
    const r3 = execute(doc, 'design.projektInfoSetzen', {
      bauherr: 'Baugenossenschaft Ahorn-Neu',
      adresse: 'Ahornweg 12, 6000 Luzern',
      parzelleNr: '1847',
    });
    expect(doc.settings.projekt).toEqual({
      bauherr: 'Baugenossenschaft Ahorn-Neu',
      verfasser: 'Baubüro Andrin',
      adresse: 'Ahornweg 12, 6000 Luzern',
      parzelleNr: '1847',
    });

    doc.apply(invertPatches(r3.patches));
    expect(doc.settings.projekt).toEqual({
      bauherr: 'Baugenossenschaft Ahorn',
      verfasser: 'Baubüro Andrin',
    });

    doc.apply(invertPatches(r2.patches));
    expect(doc.settings.projekt).toEqual({ bauherr: 'Baugenossenschaft Ahorn' });

    // Voll rückgängig: `projekt` landet wieder bei `{}` (Absenz-Sentinel,
    // wie `materialPrioritaeten` — nicht `undefined`, s. Kommentar im
    // Command). `doc.settings.projekt?.bauherr` liest sich in beiden Fällen
    // gleich als «nicht gesetzt», der Plankopf-Guard unterscheidet nicht.
    doc.apply(invertPatches(r1.patches));
    expect(doc.settings.projekt).toEqual({});
  });

  it('setzt Fristen additiv mit (kein UI-Feld in dieser Runde, aber ein regulärer Command-Parameter)', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.projektInfoSetzen', {
      fristen: [{ label: 'Baueingabe', datum: '2026-09-01' }],
    });
    expect(doc.settings.projekt?.fristen).toEqual([{ label: 'Baueingabe', datum: '2026-09-01' }]);
  });
});

describe('design.projektNameSetzen', () => {
  it('benennt das Projekt um (schliesst die bisherige Rename-Lücke) + Undo', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.projectName).toBe('Unbenannt');

    const r = execute(doc, 'design.projektNameSetzen', { name: 'Wohnhaus Ahornweg' });
    expect(doc.settings.projectName).toBe('Wohnhaus Ahornweg');

    doc.apply(invertPatches(r.patches));
    expect(doc.settings.projectName).toBe('Unbenannt');
  });
});

describe('Default-Doc & fromJSON — additiver Block bricht den Altbestand nicht', () => {
  it('Default-Doc hat kein `projekt` gesetzt', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.projekt).toBeUndefined();
  });

  it('fromJSON eines Alt-JSON ohne `projekt`-Schlüssel lädt sauber', () => {
    const alt = new KosmoDoc();
    execute(alt, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const json = alt.toJSON();
    // Simuliert echten Alt-Bestand: der Schlüssel existiert schlicht nicht.
    expect('projekt' in json.settings).toBe(false);

    const geladen = KosmoDoc.fromJSON(json);
    expect(geladen.settings.projekt).toBeUndefined();
    expect(geladen.settings.projectName).toBe('Unbenannt');
  });

  it('fromJSON eines Doc MIT `projekt` rundet verlustfrei', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.projektInfoSetzen', { bauherr: 'Baugenossenschaft Ahorn', verfasser: 'Baubüro Andrin' });
    const geladen = KosmoDoc.fromJSON(doc.toJSON());
    expect(geladen.settings.projekt).toEqual({ bauherr: 'Baugenossenschaft Ahorn', verfasser: 'Baubüro Andrin' });
  });
});

describe('Plankopf-Guard (v0.7.5 A2) — Bauherr-/Verfasser-Zeile nur bei gesetzten Daten', () => {
  function planMitEinerWand(): { doc: KosmoDoc; storeyId: string } {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    return { doc, storeyId: (eg.patches[0] as { id: string }).id };
  }

  it('ohne `projekt` bleibt die Plankopf-Ausgabe wie vor A2 (keine Bauherr-/Verfasser-Zeile)', () => {
    const { doc, storeyId } = planMitEinerWand();
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: doc.settings.projectName,
      planTitle: 'Grundriss EG',
      date: '12.07.2026',
    });
    expect(svg).not.toContain('Bauherr:');
    expect(svg).not.toContain('Verfasser:');
  });

  it('mit `projekt.bauherr` erscheint die Bauherr-Zeile im Plankopf', () => {
    const { doc, storeyId } = planMitEinerWand();
    execute(doc, 'design.projektInfoSetzen', { bauherr: 'Baugenossenschaft Ahorn' });
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: doc.settings.projectName,
      planTitle: 'Grundriss EG',
      date: '12.07.2026',
    });
    expect(svg).toContain('Bauherr: Baugenossenschaft Ahorn');
  });

  it('mit `projekt.bauherr` UND `.verfasser` erscheinen beide, durch " · " getrennt', () => {
    const { doc, storeyId } = planMitEinerWand();
    execute(doc, 'design.projektInfoSetzen', {
      bauherr: 'Baugenossenschaft Ahorn',
      verfasser: 'Baubüro Andrin',
    });
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: doc.settings.projectName,
      planTitle: 'Grundriss EG',
      date: '12.07.2026',
    });
    expect(svg).toContain('Bauherr: Baugenossenschaft Ahorn · Verfasser: Baubüro Andrin');
  });

  it('mit `projekt.adresse`/`.parzelleNr` allein (ohne Bauherr/Verfasser) bleibt der Plankopf unverändert', () => {
    // adresse/parzelleNr fliessen (noch) nicht in den Plankopf — nur Bauherr/
    // Verfasser sind Plankopf-Felder (s. `plankopfStammdatenZeile`).
    const { doc, storeyId } = planMitEinerWand();
    execute(doc, 'design.projektInfoSetzen', { adresse: 'Ahornweg 12, 6000 Luzern', parzelleNr: '1847' });
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: doc.settings.projectName,
      planTitle: 'Grundriss EG',
      date: '12.07.2026',
    });
    expect(svg).not.toContain('Bauherr:');
    expect(svg).not.toContain('Verfasser:');
  });
});

describe('Golden: plankopf-stammdaten (neues Golden, v0.7.5 A2)', () => {
  it('Grundriss mit gesetzten Stammdaten (Bauherr + Verfasser) zeigt die neue Plankopf-Zeile', () => {
    const { doc, storeyId } = testhausStammdaten();
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: doc.settings.projectName,
      planTitle: 'Grundriss EG',
      date: '12.07.2026',
    });
    expect(svg).toContain('Bauherr: Baugenossenschaft Ahorn · Verfasser: Baubüro Andrin');
    pruefeGolden(svg, new URL('./golden/plankopf-stammdaten.svg', import.meta.url));
  });
});
