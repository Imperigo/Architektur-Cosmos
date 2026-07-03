import { describe, expect, it } from 'vitest';
import {
  KosmoDoc,
  execute,
  deriveAll,
  deriveSection,
  deriveAxo,
  derivePlan,
  deriveMengen,
  deriveBerechnungsliste,
  areaReport,
  pruefeGrundriss,
  generiereVolumenstudien,
  CommandError,
} from '../src';

/**
 * Härtetests — das System muss unter Missbrauch ehrlich bleiben:
 * klare CommandErrors statt stiller Korruption, nie NaN in der Ableitung,
 * nie Absturz auf leeren oder degenerierten Modellen.
 */

function basis() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const au = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Test',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
  });
  return { doc, storeyId, assemblyId: (au.patches[0] as { id: string }).id };
}

function keineNaN(doc: KosmoDoc): void {
  for (const a of deriveAll(doc)) {
    for (let i = 0; i < a.positions.length; i++) {
      if (!Number.isFinite(a.positions[i]!)) {
        throw new Error(`NaN/Infinity in positions[${i}] von ${a.entityId}`);
      }
    }
    for (let i = 0; i < a.edges.length; i++) {
      if (!Number.isFinite(a.edges[i]!)) {
        throw new Error(`NaN/Infinity in edges[${i}] von ${a.entityId}`);
      }
    }
  }
}

describe('Härte: leere und degenerierte Modelle', () => {
  it('leeres Dokument: alle Ableitungen antworten ruhig', () => {
    const doc = new KosmoDoc();
    expect(deriveAll(doc)).toEqual([]);
    expect(deriveSection(doc, { a: { x: 0, y: 0 }, b: { x: 1000, y: 0 }, depth: 5000, lookLeft: true }).bounds).toBeNull();
    expect(deriveAxo(doc).bounds).toBeNull();
    expect(deriveMengen(doc).positionen).toEqual([]);
    expect(deriveBerechnungsliste(doc).totalGf).toBe(0);
    expect(areaReport(doc).totalNgf).toBe(0);
  });

  it('Nullänge-Wand wird abgelehnt oder überlebt die Ableitung ohne NaN', () => {
    const { doc, storeyId, assemblyId } = basis();
    try {
      execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 500, y: 500 }, b: { x: 500, y: 500 } });
      keineNaN(doc); // wenn erlaubt, dann sauber
    } catch (e) {
      expect(e).toBeInstanceOf(CommandError); // wenn verboten, dann klar
    }
  });

  it('kollineare Zone (Fläche 0) bricht Kennzahlen und Checks nicht', () => {
    const { doc, storeyId } = basis();
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Strich', sia: 'HNF',
      outline: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 10000, y: 0 }],
    });
    expect(Number.isFinite(areaReport(doc).totalNgf)).toBe(true);
    expect(() => pruefeGrundriss(doc, storeyId)).not.toThrow();
    expect(() => derivePlan(doc, storeyId)).not.toThrow();
  });

  it('extrem spitzer Wandwinkel (2°): Gehrung explodiert nicht', () => {
    const { doc, storeyId, assemblyId } = basis();
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 10000, y: 0 } });
    execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId,
      a: { x: 10000, y: 0 },
      b: { x: 0, y: Math.round(10000 * Math.tan((2 * Math.PI) / 180)) },
    });
    keineNaN(doc);
  });

  it('Kilometer-Wand und 1-mm-Wand: Ableitung bleibt endlich', () => {
    const { doc, storeyId, assemblyId } = basis();
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 1_000_000, y: 0 } });
    try {
      execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 5000 }, b: { x: 1, y: 5000 } });
    } catch (e) {
      expect(e).toBeInstanceOf(CommandError);
    }
    keineNaN(doc);
    const m = deriveMengen(doc);
    for (const p of m.positionen) {
      expect(Number.isFinite(p.flaeche ?? 0)).toBe(true);
      expect(Number.isFinite(p.volumen ?? 0)).toBe(true);
    }
  });

  it('Öffnung breiter als die Wand: klare Ablehnung oder saubere Geometrie', () => {
    const { doc, storeyId, assemblyId } = basis();
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 2000, y: 0 } });
    try {
      execute(doc, 'design.oeffnungSetzen', {
        wallId: (w.patches[0] as { id: string }).id,
        openingType: 'fenster', center: 1000, width: 5000, height: 1500, sill: 900,
      });
      keineNaN(doc);
    } catch (e) {
      expect(e).toBeInstanceOf(CommandError);
    }
  });

  it('Volumenstudien: winzige und selbstüberschneidende Parzellen liefern leer statt Müll', () => {
    expect(generiereVolumenstudien([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], { zielGf: 1000 })).toEqual([]);
    const schleife = [
      { x: 0, y: 0 }, { x: 20000, y: 20000 }, { x: 20000, y: 0 }, { x: 0, y: 20000 },
    ];
    const v = generiereVolumenstudien(schleife, { zielGf: 1000 });
    for (const s of v) {
      expect(Number.isFinite(s.gf)).toBe(true);
      expect(s.geschosse).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('Härte: Serialisierung trägt alle neuen Bürger', () => {
  it('.kosmo-Roundtrip: Baugrenze, Blatt-Texte, Dossier, Raumprogramm bleiben erhalten', () => {
    const { doc, storeyId } = basis();
    execute(doc, 'design.baugrenzeSetzen', {
      storeyId, maxHoehe: 12000,
      outline: [{ x: 0, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 9000 }, { x: 0, y: 9000 }],
    });
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Plakat', format: 'A0', orientation: 'hoch' });
    execute(doc, 'publish.textSetzen', {
      sheetId: (blatt.patches[0] as { id: string }).id,
      text: 'TITEL', x: 60, y: 90, size: 34, titel: true,
    });
    execute(doc, 'design.dossierSetzen', { eintraege: [{ typ: 'dont', text: 'Nordwohnungen' }] });
    execute(doc, 'design.raumprogrammSetzen', { posten: [{ typ: 'marktgerecht', hnfSoll: 100 }], maxAgf: 200 });
    execute(doc, 'publish.bildPlatzieren', {
      sheetId: (blatt.patches[0] as { id: string }).id,
      x: 90, y: 160, w: 380,
      dataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    });

    const wieder = KosmoDoc.fromJSON(JSON.parse(JSON.stringify(doc.toJSON())));
    expect(wieder.byKind('boundary')).toHaveLength(1);
    const sheet = wieder.byKind('sheet')[0] as import('../src').Sheet;
    expect(sheet.texte).toHaveLength(1);
    expect(sheet.bilder).toHaveLength(1);
    const asset = wieder.byKind('imageasset')[0] as import('../src').ImageAsset;
    expect(asset.data.length).toBeGreaterThan(0);
    expect(sheet.bilder![0]!.assetId).toBe(asset.id);
    expect(wieder.settings.dossier).toEqual([{ typ: 'dont', text: 'Nordwohnungen' }]);
    expect(wieder.settings.raumprogramm).toEqual([{ typ: 'marktgerecht', hnfSoll: 100 }]);
    expect(wieder.settings.maxAgf).toBe(200);
  });

  it('fromJSON mit altem Stand (fehlende neue Settings) fällt auf Defaults zurück', () => {
    const alt = {
      schema: 'kosmo.model/v1' as const,
      settings: { projectName: 'Altprojekt', agfFactor: 1.28, facadeFactor: 1.1 },
      entities: [],
    };
    const doc = KosmoDoc.fromJSON(alt as never);
    expect(doc.settings.dossier).toEqual([]);
    expect(doc.settings.raumprogramm).toEqual([]);
    expect(doc.settings.programmFaktor).toBe(1.22);
    expect(doc.settings.maxAgf).toBeNull();
  });
});
