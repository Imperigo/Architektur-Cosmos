import { describe, expect, it } from 'vitest';
import {
  CommandError,
  History,
  KosmoDoc,
  execute,
  generiereVolumenstudien,
  type MassBody,
  type Zone,
} from '../src';

/**
 * Batch D4 (Wettbewerb-Konzept, Entscheid D-E9): `grundlagen.volumenstudie`
 * ist der erste Kosmo-Tool-Aufruf, der D1–D3 (Zonenregel → StudienOptionen,
 * generiereVolumenstudien, Programm-Erfüllung) wirklich auslöst UND das
 * Ergebnis als echte MassBody-Entities ins Modell schreibt — registriert
 * wie jeder andere Command, also automatisch als Kosmo-Tool exponiert
 * (`commandTools()` in `@kosmo/ai`).
 */

function setupDoc() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  return { doc, storeyId };
}

/** Zeichnet die Parzelle als Zone (60 × 60 m, Owner-Konvention: letzte Zone des Geschosses gilt als Baufeld). */
function zeichneParzelle(doc: KosmoDoc, storeyId: string) {
  execute(doc, 'design.zoneErstellen', {
    storeyId,
    outline: [
      { x: 0, y: 0 },
      { x: 60000, y: 0 },
      { x: 60000, y: 60000 },
      { x: 0, y: 60000 },
    ],
    name: 'Parzelle',
    sia: 'HNF',
  });
}

function setzeZonenregel(doc: KosmoDoc, overrides: Partial<{ az: number; maxHoehe: number; grenzabstandKlein: number; parzellenFlaeche: number }> = {}) {
  execute(doc, 'design.zonenRegelSetzen', {
    name: 'Test-Zone',
    az: overrides.az ?? 0.5,
    maxHoehe: overrides.maxHoehe ?? 20000,
    maxVollgeschosse: null,
    grenzabstandKlein: overrides.grenzabstandKlein ?? 4000,
    grenzabstandGross: null,
    parzellenFlaeche: overrides.parzellenFlaeche ?? 3600, // 60m × 60m
  });
}

describe('grundlagen.volumenstudie', () => {
  it('erzeugt MassBody-Entities für die per zielGf-Nähe gewählte Variante (Default ohne varianteIndex)', () => {
    const { doc, storeyId } = setupDoc();
    zeichneParzelle(doc, storeyId);
    setzeZonenregel(doc); // az 0.5 × 3600 m² = 1800 m² Ziel, maxHoehe 20 m, Grenzabstand 4 m

    const parzelle = doc.byKind<Zone>('zone')[0]!;
    const erwarteteVarianten = generiereVolumenstudien(parzelle.outline, {
      zielGf: 1800,
      maxHoehe: 20000,
      grenzabstand: 4000,
    });
    expect(erwarteteVarianten.length).toBeGreaterThan(0);
    let besterIndex = 0;
    let besteDiff = Math.abs(erwarteteVarianten[0]!.gf - 1800);
    for (let i = 1; i < erwarteteVarianten.length; i++) {
      const diff = Math.abs(erwarteteVarianten[i]!.gf - 1800);
      if (diff < besteDiff) {
        besteDiff = diff;
        besterIndex = i;
      }
    }
    const erwarteteVariante = erwarteteVarianten[besterIndex]!;

    const res = execute(doc, 'grundlagen.volumenstudie', { storeyId });

    const massen = doc.byKind<MassBody>('mass');
    expect(massen).toHaveLength(erwarteteVariante.koerper.length);
    for (const m of massen) {
      expect(m.storeyId).toBe(storeyId);
      expect(m.program).toBe('studie');
      expect(m.baseOffset).toBe(0);
    }
    // Höhen der erzeugten Körper stimmen mit der gewählten Typologie überein.
    expect(massen.map((m) => m.height).sort()).toEqual(
      erwarteteVariante.koerper.map((k) => k.height).sort(),
    );
    expect(res.summary).toContain(erwarteteVariante.name);
    expect(res.summary).toContain(String(erwarteteVariante.gf));
  });

  it('varianteIndex wählt eine bestimmte Typologie statt der zielGf-Näherung', () => {
    const { doc, storeyId } = setupDoc();
    zeichneParzelle(doc, storeyId);
    setzeZonenregel(doc);

    const parzelle = doc.byKind<Zone>('zone')[0]!;
    const varianten = generiereVolumenstudien(parzelle.outline, { zielGf: 1800, maxHoehe: 20000, grenzabstand: 4000 });
    expect(varianten.length).toBeGreaterThan(1);

    const res = execute(doc, 'grundlagen.volumenstudie', { storeyId, varianteIndex: 0 });
    expect(res.summary).toContain(varianten[0]!.name);
    expect(doc.byKind<MassBody>('mass')).toHaveLength(varianten[0]!.koerper.length);
  });

  it('EIN Aufruf = EINE atomare Undo-Gruppe: Undo nimmt alle Körper der Variante zurück', () => {
    const { doc, storeyId } = setupDoc();
    zeichneParzelle(doc, storeyId);
    setzeZonenregel(doc);
    const history = new History();

    const vorher = doc.byKind('mass').length;
    const res = execute(doc, 'grundlagen.volumenstudie', { storeyId });
    history.record(res.patches);
    expect(doc.byKind('mass').length).toBeGreaterThan(vorher);
    expect(history.depth).toBe(1); // ein Undo-Schritt für den ganzen Aufruf, egal wie viele Körper

    history.undo(doc);
    expect(doc.byKind('mass').length).toBe(vorher);

    history.redo(doc);
    expect(doc.byKind('mass').length).toBeGreaterThan(vorher);
  });

  it('varianteIndex ausserhalb der verfügbaren Typologien → CommandError, kein Doc-Write', () => {
    const { doc, storeyId } = setupDoc();
    zeichneParzelle(doc, storeyId);
    setzeZonenregel(doc);

    expect(() => execute(doc, 'grundlagen.volumenstudie', { storeyId, varianteIndex: 99 })).toThrow(CommandError);
    expect(() => execute(doc, 'grundlagen.volumenstudie', { storeyId, varianteIndex: 99 })).toThrow(/ausserhalb/);
    expect(doc.byKind('mass')).toHaveLength(0);
  });

  it('ohne Zonenregel UND ohne zielGf-Override → CommandError mit ehrlichem Text, kein Raten', () => {
    const { doc, storeyId } = setupDoc();
    zeichneParzelle(doc, storeyId); // Parzelle da, aber keine Zonenregel gesetzt

    expect(() => execute(doc, 'grundlagen.volumenstudie', { storeyId })).toThrow(CommandError);
    expect(() => execute(doc, 'grundlagen.volumenstudie', { storeyId })).toThrow(/GF-Ziel/);
    expect(doc.byKind('mass')).toHaveLength(0);
  });

  it('mit zielGf-Override und OHNE Zonenregel läuft der Command trotzdem', () => {
    const { doc, storeyId } = setupDoc();
    zeichneParzelle(doc, storeyId);
    // bewusst KEINE design.zonenRegelSetzen-Ausführung

    const res = execute(doc, 'grundlagen.volumenstudie', { storeyId, zielGf: 1200, maxHoehe: 18000 });
    expect(doc.byKind<MassBody>('mass').length).toBeGreaterThan(0);
    expect(res.summary).toContain('Extremvarianten-Studie');
  });

  it('ohne Parzelle (keine Zone im Geschoss) → CommandError, auch mit Override', () => {
    const { doc, storeyId } = setupDoc(); // keine Zone gezeichnet

    expect(() => execute(doc, 'grundlagen.volumenstudie', { storeyId, zielGf: 1000 })).toThrow(CommandError);
    expect(() => execute(doc, 'grundlagen.volumenstudie', { storeyId, zielGf: 1000 })).toThrow(/Baufeld/);
  });

  it('unbekanntes Geschoss → CommandError', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'grundlagen.volumenstudie', { storeyId: 'geschoss:nope', zielGf: 1000 })).toThrow(
      CommandError,
    );
  });

  it('summarize enthält die GF-Zahl der gewählten Variante', () => {
    const { doc, storeyId } = setupDoc();
    zeichneParzelle(doc, storeyId);
    setzeZonenregel(doc);

    const res = execute(doc, 'grundlagen.volumenstudie', { storeyId });
    expect(res.summary).toMatch(/GF \d+(\.\d+)? m²/);
  });

  it('summarize zeigt Ziel/Erfüllung aus dem Raumprogramm, wenn eines hinterlegt ist', () => {
    const { doc, storeyId } = setupDoc();
    zeichneParzelle(doc, storeyId);
    setzeZonenregel(doc);
    execute(doc, 'design.raumprogrammSetzen', {
      posten: [{ typ: 'marktgerecht', hnfSoll: 1000 }],
    });

    const res = execute(doc, 'grundlagen.volumenstudie', { storeyId });
    expect(res.summary).toContain('Ziel');
    expect(res.summary).toContain('Erfüllung');
    expect(res.summary).toMatch(/Erfüllung -?\d+(\.\d+)? %/);
  });

  it('summarize bleibt ehrlich ohne Ziel/Erfüllung, wenn kein Raumprogramm hinterlegt ist', () => {
    const { doc, storeyId } = setupDoc();
    zeichneParzelle(doc, storeyId);
    setzeZonenregel(doc);

    const res = execute(doc, 'grundlagen.volumenstudie', { storeyId });
    expect(res.summary).not.toContain('Erfüllung');
    expect(res.summary).not.toContain('Ziel');
  });

  it('Auf einer Parzelle, auf der keine Typologie passt (nach Grenzabstand nichts übrig) → CommandError statt leerer Übernahme', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    // Winzige Parzelle: nach 4 m Grenzabstand bleibt praktisch nichts übrig.
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 5000, y: 0 },
        { x: 5000, y: 5000 },
        { x: 0, y: 5000 },
      ],
      name: 'Mini-Parzelle',
      sia: 'HNF',
    });

    expect(() => execute(doc, 'grundlagen.volumenstudie', { storeyId, zielGf: 500 })).toThrow(CommandError);
  });
});
