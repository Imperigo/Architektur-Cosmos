import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute, invertPatches, CommandError, type Opening, type Wall } from '../src';
import { richtungsModule } from '../src/derive/fassadenmodule';

/**
 * H-35 (SIM-BEFUNDE.md, Journey kosmo-mfh Zug 5, 10.07.2026): design.
 * fassadenModulZuweisen setzte einen Volumenkörper voraus — auf dem rein
 * wand-basierten Baupfad (design.waendeAusZonen ohne je einen MassBody
 * gezeichnet zu haben) ging der Command leer aus, «Süd» und «Nord» waren
 * unerreichbar. Additive Erweiterung: storeyId+richtung leitet die
 * Fassadenkante aus den zusammenhängenden Aussenwänden dieser Himmelsrichtung
 * ab. Der bestehende MassBody-Weg (massId+kante) ist unverändert — siehe
 * kernel.test.ts «Fassaden-Modul-Kanten (V2-V7 Nachtrag)», 267 Tests
 * unangetastet grün vor UND nach dieser Erweiterung.
 */

function rechteckMitAw(doc: KosmoDoc, storeyId: string) {
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 30', target: 'wall',
    layers: [{ material: 'beton', thickness: 300, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
  wand({ x: 0, y: 0 }, { x: 9000, y: 0 }); // Süd
  wand({ x: 9000, y: 0 }, { x: 9000, y: 6000 }); // Ost
  wand({ x: 9000, y: 6000 }, { x: 0, y: 6000 }); // Nord
  wand({ x: 0, y: 6000 }, { x: 0, y: 0 }); // West
}

function setupWandGeschoss() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  rechteckMitAw(doc, storeyId);
  return { doc, storeyId };
}

describe('design.fassadenModulZuweisen — wand-basierter Weg ohne Volumenkörper (H-35)', () => {
  it('ohne massId+kante UND ohne storeyId+richtung: ehrlicher CommandError statt stillem Nichtstun', () => {
    const { doc } = setupWandGeschoss();
    expect(() => execute(doc, 'design.fassadenModulZuweisen', { modul: null })).toThrow(CommandError);
  });

  it('massId ohne kante (oder umgekehrt): CommandError statt halbgültigem Zustand', () => {
    const { doc } = setupWandGeschoss();
    expect(() => execute(doc, 'design.fassadenModulZuweisen', { massId: 'irgendwas', modul: null })).toThrow(
      CommandError,
    );
  });

  it('kein Aussenwand-Aufbau auf dem Geschoss: CommandError verweist auf design.waendeAusZonen', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    expect(() => execute(doc, 'design.fassadenModulZuweisen', { storeyId, richtung: 'sued', modul: null })).toThrow(
      /Aussenwand/,
    );
  });

  it('storeyId+richtung setzt die Zuweisung additiv in doc.settings.wandFassadenModule — ein Undo-Schritt', () => {
    const { doc, storeyId } = setupWandGeschoss();
    execute(doc, 'design.modulSpeichern', {
      name: 'Fensterband Süd', breite: 2500, hoehe: 3000,
      elemente: [{ x: 200, y: 900, b: 2100, h: 1600, typ: 'fenster' }],
    });
    const r = execute(doc, 'design.fassadenModulZuweisen', { storeyId, richtung: 'sued', modul: 'Fensterband Süd' });
    expect(r.summary).toBe('Fassade sued → «Fensterband Süd»');
    expect(doc.settings.wandFassadenModule).toEqual([{ storeyId, richtung: 'sued', modul: 'Fensterband Süd' }]);
    expect(richtungsModule(doc, storeyId).get('sued')).toBe('Fensterband Süd');
    // Undo entfernt die Zuweisung wieder
    doc.apply(invertPatches(r.patches));
    expect(doc.settings.wandFassadenModule ?? []).toHaveLength(0);
  });

  it('modul:null entfernt eine bestehende Zuweisung derselben Richtung, andere Richtungen bleiben', () => {
    const { doc, storeyId } = setupWandGeschoss();
    execute(doc, 'design.modulSpeichern', { name: 'A', breite: 2500, hoehe: 3000, elemente: [{ x: 0, y: 0, b: 500, h: 500, typ: 'fenster' }] });
    execute(doc, 'design.fassadenModulZuweisen', { storeyId, richtung: 'sued', modul: 'A' });
    execute(doc, 'design.fassadenModulZuweisen', { storeyId, richtung: 'nord', modul: 'A' });
    execute(doc, 'design.fassadenModulZuweisen', { storeyId, richtung: 'sued', modul: null });
    expect(doc.settings.wandFassadenModule).toEqual([{ storeyId, richtung: 'nord', modul: 'A' }]);
  });

  it('unbekanntes Modul: CommandError wie beim MassBody-Weg', () => {
    const { doc, storeyId } = setupWandGeschoss();
    expect(() =>
      execute(doc, 'design.fassadenModulZuweisen', { storeyId, richtung: 'sued', modul: 'gibtsnicht' }),
    ).toThrow(CommandError);
  });

  it('End-zu-End über design.fensterAusModulen: Süd-Wand stanzt das Süd-Modul, OHNE je einen Volumenkörper zu zeichnen', () => {
    const { doc, storeyId } = setupWandGeschoss();
    execute(doc, 'design.modulSpeichern', {
      name: 'Standard', breite: 2500, hoehe: 3000,
      elemente: [{ x: 400, y: 900, b: 1500, h: 1600, typ: 'fenster' }],
    });
    execute(doc, 'design.modulSpeichern', {
      name: 'Fensterband Süd', breite: 2500, hoehe: 3000,
      elemente: [{ x: 200, y: 900, b: 2100, h: 1600, typ: 'fenster' }],
    });
    // Kein design.volumenErstellen — reiner wand-basierter Baupfad
    execute(doc, 'design.fassadenModulZuweisen', { storeyId, richtung: 'sued', modul: 'Fensterband Süd' });
    execute(doc, 'design.fensterAusModulen', { storeyId, modul: 'Standard' });
    const waende = doc.byKind<Wall>('wall');
    const suedWand = waende.find((w) => w.a.y === 0 && w.b.y === 0)!;
    const nordWand = waende.find((w) => w.a.y === 6000 && w.b.y === 6000)!;
    const fensterVon = (wallId: string) =>
      doc.openingsOf(wallId).filter((o) => (o as Opening).openingType === 'fenster') as Opening[];
    const suedFenster = fensterVon(suedWand.id);
    const nordFenster = fensterVon(nordWand.id);
    expect(suedFenster.length).toBeGreaterThan(0);
    expect(nordFenster.length).toBeGreaterThan(0);
    // Süd bekommt das zugewiesene Modul (Breite 2100), Nord bleibt bei der Vorgabe (1500)
    expect(suedFenster.every((f) => f.width === 2100)).toBe(true);
    expect(nordFenster.every((f) => f.width === 1500)).toBe(true);
  });
});
