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

describe('Plankopf-Guard (v0.7.5 A2, v0.8.1/P6 auf den Vollplankopf nachgezogen) — Bauherr/Adresse/Parzelle nur bei gesetzten Daten', () => {
  // v0.8.1/P6 (GOLDEN-WECHSEL-081.md, Owner-Entscheid 4 der v0.8.0):
  // `planToSvg` rendert den 180×55-Vollplankopf (`derive/plankopf.ts`) statt
  // des alten ~18mm-Fussstreifens. Die kombinierte «Bauherr: X · Verfasser:
  // Y»-Zeile (`plankopfStammdatenZeile()`) entfällt zugunsten der Vollplankopf-
  // eigenen Felder: `PlankopfDaten.bauherr` erscheint ROH (kein «Bauherr:»-
  // Label) in der colM-«Bauherrschaft»-Zeile, `adresse`/`parzelleNr` fliessen
  // NEU in die «Standort»-Zeile (` · `-getrennt) — identisch zum bereits
  // ausgelieferten `sheetToSvg`-Verhalten. `Verfasser` hat in der
  // Vollplankopf-Vorlage KEIN eigenes Feld (Spez §1.5) und erscheint darum im
  // Design-Einzelexport nicht mehr separat — dieselbe Grenze wie bei
  // Publish-Blättern.
  function planMitEinerWand(): { doc: KosmoDoc; storeyId: string } {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    return { doc, storeyId: (eg.patches[0] as { id: string }).id };
  }

  it('ohne `projekt` bleiben Bauherrschaft-/Standort-Zeile leer', () => {
    const { doc, storeyId } = planMitEinerWand();
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: doc.settings.projectName,
      planTitle: 'Grundriss EG',
      date: '12.07.2026',
    });
    expect(svg).not.toContain('Bauherr');
    expect(svg).not.toContain('Verfasser');
  });

  it('mit `projekt.bauherr` erscheint der rohe Wert in der Bauherrschaft-Zeile (kein «Bauherr:»-Label mehr)', () => {
    const { doc, storeyId } = planMitEinerWand();
    execute(doc, 'design.projektInfoSetzen', { bauherr: 'Baugenossenschaft Ahorn' });
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: doc.settings.projectName,
      planTitle: 'Grundriss EG',
      date: '12.07.2026',
    });
    expect(svg).toContain('>Baugenossenschaft Ahorn<');
    expect(svg).not.toContain('Bauherr:');
  });

  it('mit `projekt.bauherr` UND `.verfasser` erscheint NUR Bauherr — Verfasser hat kein Vollplankopf-Feld', () => {
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
    expect(svg).toContain('>Baugenossenschaft Ahorn<');
    expect(svg).not.toContain('Baubüro Andrin');
    expect(svg).not.toContain('Verfasser');
  });

  it('mit `projekt.adresse`/`.parzelleNr` erscheinen beide, " · "-getrennt, in der Standort-Zeile', () => {
    // v0.8.1/P6: anders als beim alten Fussstreifen fliessen adresse/
    // parzelleNr jetzt in den Vollplankopf (colM «Standort»), identisch zu
    // `sheetToSvg`.
    const { doc, storeyId } = planMitEinerWand();
    execute(doc, 'design.projektInfoSetzen', { adresse: 'Ahornweg 12, 6000 Luzern', parzelleNr: '1847' });
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: doc.settings.projectName,
      planTitle: 'Grundriss EG',
      date: '12.07.2026',
    });
    expect(svg).toContain('Ahornweg 12, 6000 Luzern · 1847');
    expect(svg).not.toContain('Bauherr:');
    expect(svg).not.toContain('Verfasser');
  });
});

describe('Golden: plankopf-stammdaten (v0.7.5 A2, v0.8.1/P6 auf den Vollplankopf umgestellt)', () => {
  it('Grundriss mit gesetzten Stammdaten (Bauherr + Verfasser) zeigt Bauherr in der Vollplankopf-Bauherrschaft-Zeile', () => {
    const { doc, storeyId } = testhausStammdaten();
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: doc.settings.projectName,
      planTitle: 'Grundriss EG',
      date: '12.07.2026',
    });
    // v0.8.1/P6: der Vollplankopf zeigt Bauherr roh (kein «Bauherr:»-Label,
    // kein kombinierter Verfasser-Zusatz — s. Beschreibung oben).
    expect(svg).toContain('>Baugenossenschaft Ahorn<');
    expect(svg).not.toContain('Baubüro Andrin');
    pruefeGolden(svg, new URL('./golden/plankopf-stammdaten.svg', import.meta.url));
  });
});
